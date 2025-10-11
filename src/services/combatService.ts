import { Character, Enemy, CombatStats, Attack, InventoryItem } from '../types';
import { DiceRoller } from '../utils/diceRoller';
import { TurnLog, CombatAction, CombatResultData } from '../types/combat';
import { enemyAIService } from './enemyAIService';
import { combatNarrationService } from './combatNarrationService';
import { enhancedLootService } from './enhancedLootService';

export interface Combatant {
  id: string;
  name: string;
  type: 'player' | 'enemy' | 'npc';
  level?: number; // Legacy level field (for backward compatibility)
  combatLevel?: number; // Combat Level (chỉ cho chiến đấu)
  characterLevel?: number; // Character Level (tổng thể)
  stats: CombatStats['stats'];
  health: { current: number; max: number };
  armorClass: number;
  attacks: Attack[];
  abilities?: any[];
  initiative: number;
  isAlive: boolean;
  statusEffects: StatusEffect[];
  isDefending: boolean; // New: Defend status
  // For enemies/NPCs
  enemyData?: Enemy;
  // For player
  characterData?: Character;
}

export interface StatusEffect {
  id: string;
  name: string;
  description: string;
  duration: number; // turns remaining
  effects: {
    healthModifier?: number;
    armorClassModifier?: number;
    attackModifier?: number;
    damageModifier?: number;
    statModifiers?: { [key: string]: number };
  };
}

export interface CombatLogEntry {
  id: string;
  turn: number;
  type: 'initiative' | 'attack' | 'damage' | 'heal' | 'status' | 'death' | 'victory' | 'defeat' | 'info';
  message: string;
  details?: any;
  timestamp: Date;
}

export interface CombatState {
  combatants: Combatant[];
  currentTurn: number;
  currentCombatantIndex: number;
  turnOrder: string[]; // combatant IDs in initiative order
  combatLog: CombatLogEntry[];
  turnLogs: TurnLog[]; // Grouped logs by turn
  isActive: boolean;
  isPlayerTurn: boolean;
  winner?: 'player' | 'enemies';
  rewards?: {
    experience: number;
    items: InventoryItem[];
    currency?: number;
  };
  worldDifficulty?: string; // For AI difficulty mapping
  lastAttackKey?: string; // Prevent duplicate attacks
}

class CombatService {
  private static instance: CombatService;
  private currentCombat: CombatState | null = null;
  private currentTurnActions: CombatLogEntry[] = []; // Actions for current turn
  private currentTurnCombatant: string | null = null; // Current turn combatant

  private constructor() {}

  public static getInstance(): CombatService {
    if (!CombatService.instance) {
      CombatService.instance = new CombatService();
    }
    return CombatService.instance;
  }

  // Initialize combat with player and enemies
  public initiateCombat(player: Character, enemies: Enemy[], worldDifficulty?: string): CombatState {
    const combatants: Combatant[] = [];

    // Add player
    const playerCombatant: Combatant = {
      id: 'player',
      name: player.name,
      type: 'player',
      level: player.level || 1, // Legacy level
      combatLevel: player.combatLevel || player.level || 1, // Combat Level
      characterLevel: player.level || 1, // Character Level
      stats: player.coreStats || {
        strength: 10,
        agility: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10,
        modifiers: { strength: 0, agility: 0, constitution: 0, intelligence: 0, wisdom: 0, charisma: 0 }
      },
      health: player.health || { current: 20, max: 20 },
      armorClass: this.calculatePlayerAC(player),
      attacks: this.getPlayerAttacks(player),
      initiative: 0,
      isAlive: true,
      statusEffects: [],
      isDefending: false,
      characterData: player
    };

    combatants.push(playerCombatant);

    // Add enemies
    enemies.forEach((enemy, index) => {
      const enemyCombatant: Combatant = {
        id: `enemy_${index}`,
        name: enemy.name,
        type: 'enemy',
        level: enemy.combatLevel || enemy.level, // Legacy level
        combatLevel: enemy.combatLevel || enemy.level, // Combat Level
        characterLevel: enemy.characterLevel, // Character Level
        stats: {
          ...enemy.stats,
          modifiers: enemy.stats?.modifiers || {
            strength: Math.floor((enemy.stats?.strength || 10 - 10) / 2),
            agility: Math.floor((enemy.stats?.agility || 10 - 10) / 2),
            intelligence: Math.floor((enemy.stats?.intelligence || 10 - 10) / 2),
            constitution: Math.floor((enemy.stats?.constitution || 10 - 10) / 2),
            wisdom: Math.floor((enemy.stats?.wisdom || 10 - 10) / 2),
            charisma: Math.floor((enemy.stats?.charisma || 10 - 10) / 2)
          }
        },
        health: { ...enemy.health },
        armorClass: enemy.armorClass,
        attacks: enemy.attacks,
        abilities: enemy.abilities,
        initiative: 0,
        isAlive: true,
        statusEffects: [],
        isDefending: false,
        enemyData: enemy
      };

      combatants.push(enemyCombatant);
    });

    // Roll initiative for all combatants
    this.rollInitiative(combatants);

    // Sort by initiative (highest first)
    combatants.sort((a, b) => b.initiative - a.initiative);

    const turnOrder = combatants.map(c => c.id);

    this.currentCombat = {
      combatants,
      currentTurn: 1,
      currentCombatantIndex: 0,
      turnOrder,
      combatLog: [],
      turnLogs: [],
      isActive: true,
      isPlayerTurn: turnOrder[0] === 'player',
      winner: undefined,
      rewards: undefined,
      worldDifficulty
    };

    // Initialize turn tracking
    this.currentTurnActions = [];
    this.currentTurnCombatant = turnOrder[0];

    // Log combat start
    this.addCombatLog('initiative', `Combat bắt đầu! Thứ tự lượt đi: ${combatants.map(c => c.name).join(', ')}`);

    return this.currentCombat;
  }

  // Roll initiative for all combatants
  private rollInitiative(combatants: Combatant[]): void {
    combatants.forEach(combatant => {
      const initiativeRoll = DiceRoller.roll('d20', 'Initiative');
      const initiativeModifier = combatant.stats.modifiers.agility;
      combatant.initiative = initiativeRoll.total + initiativeModifier;
      
      this.addCombatLog('initiative', 
        `${combatant.name} roll initiative: ${initiativeRoll.total} + ${initiativeModifier} = ${combatant.initiative}`
      );
    });
  }

  // Calculate player AC
  private calculatePlayerAC(player: Character): number {
    // Use AC from coreStats if available
    if (player.coreStats?.armorClass !== undefined) {
      return player.coreStats.armorClass;
    }
    
    // Fallback calculation for backward compatibility
    let ac = 10; // Base AC
    
    // Add agility modifier
    const agilityModifier = player.coreStats?.modifiers?.agility || 0;
    ac += agilityModifier;
    
    // Check for chest armor equipment
    if (player.equipment?.chest && player.equipment.chest.armorClass) {
      // Use armor's AC + agility modifier
      ac = player.equipment.chest.armorClass + agilityModifier;
    }
    
    return ac;
  }

  // Get player attacks from equipped weapons
  private getPlayerAttacks(player: Character): Attack[] {
    const attacks: Attack[] = [];
    
    if (player.equipment?.weapon_main) {
      const weapon = player.equipment.weapon_main;
      if (weapon.damage) {
        const attackBonus = this.calculateAttackBonus(player, weapon);
        attacks.push({
          name: weapon.name,
          attackBonus,
          damage: weapon.damage,
          damageType: (weapon.damageType as 'physical' | 'magical' | 'fire' | 'cold' | 'lightning' | 'poison' | 'psychic') || 'physical'
        });
      }
    }
    
    if (player.equipment?.weapon_off) {
      const weapon = player.equipment.weapon_off;
      if (weapon.damage) {
        const attackBonus = this.calculateAttackBonus(player, weapon);
        attacks.push({
          name: weapon.name,
          attackBonus,
          damage: weapon.damage,
          damageType: (weapon.damageType as 'physical' | 'magical' | 'fire' | 'cold' | 'lightning' | 'poison' | 'psychic') || 'physical'
        });
      }
    }
    
    // Default unarmed attack if no weapons
    if (attacks.length === 0) {
      const attackBonus = this.calculateAttackBonus(player);
      attacks.push({
        name: 'Unarmed Strike',
        attackBonus,
        damage: '1d4',
        damageType: 'physical'
      });
    }
    
    return attacks;
  }

  // Calculate attack bonus for player
  private calculateAttackBonus(player: Character, weapon?: InventoryItem): number {
    let bonus = 0;
    
    // Base stat modifier (strength for melee, agility for ranged)
    if (player.coreStats?.modifiers) {
      if (weapon?.weaponProperties?.finesse) {
        // Finesse weapons can use agility
        bonus += Math.max(player.coreStats.modifiers.strength, player.coreStats.modifiers.agility);
      } else if (weapon?.damageType === 'magical') {
        // Magic weapons might use intelligence
        bonus += Math.max(player.coreStats.modifiers.strength, player.coreStats.modifiers.intelligence);
      } else {
        bonus += player.coreStats.modifiers.strength;
      }
    }
    
    // Weapon attack bonus
    if (weapon?.attackBonus) {
      bonus += weapon.attackBonus;
    }
    
    // Equipment no longer provides stat bonuses
    
    return bonus;
  }

  // Perform attack
  public performAttack(attackerId: string, defenderId: string, attackIndex: number = 0): boolean {
    if (!this.currentCombat) return false;
    
    const attacker = this.getCombatant(attackerId);
    const defender = this.getCombatant(defenderId);
    
    if (!attacker || !defender || !attacker.isAlive || !defender.isAlive) {
      return false;
    }
    
    if (attacker.attacks.length === 0 || attackIndex >= attacker.attacks.length) {
      return false;
    }
    
    // Check if this is a duplicate attack in the same turn
    const currentTurn = this.currentCombat.currentTurn;
    const lastAttackKey = `${attackerId}-${defenderId}-${attackIndex}-${currentTurn}`;
    
    
    // Only check for duplicates if we have a previous attack key AND it's the same turn
    if (this.currentCombat.lastAttackKey && 
        this.currentCombat.lastAttackKey === lastAttackKey &&
        this.currentCombat.currentTurn === currentTurn) {
      console.warn('Duplicate attack prevented:', lastAttackKey);
      return false;
    }
    
    // Set the attack key AFTER successful validation
    this.currentCombat.lastAttackKey = lastAttackKey;
    
    const attack = attacker.attacks[attackIndex];
    
    // Roll attack
    const attackRoll = DiceRoller.roll('d20', `${attacker.name} attacks with ${attack.name}`);
    const totalAttack = attackRoll.total + attack.attackBonus;
    
    this.addCombatLog('attack', 
      `${attacker.name} attacks ${defender.name} with ${attack.name}: ${attackRoll.total} + ${attack.attackBonus} = ${totalAttack}`
    );
    
    // Check if hit
    const hit = totalAttack >= defender.armorClass;
    
    if (hit) {
      // Roll damage
      const damageRoll = DiceRoller.roll(attack.damage, `${attack.name} damage`);
      let totalDamage = damageRoll.total;
      
      // Add strength modifier for melee weapons
      let strengthBonus = 0;
      if (attack.damageType === 'physical' && attacker.stats.modifiers.strength > 0) {
        strengthBonus = attacker.stats.modifiers.strength;
        totalDamage += strengthBonus;
      }
      
      // Create damage description
      let damageDescription = `${attacker.name} hits for ${damageRoll.total} damage (${attack.damage})`;
      if (strengthBonus > 0) {
        damageDescription += ` + ${strengthBonus} strength = ${totalDamage} total damage`;
      } else {
        damageDescription += ` = ${totalDamage} total damage`;
      }
      
      this.addCombatLog('damage', damageDescription);
      
      // Apply damage
      this.applyDamage(defenderId, totalDamage);
      
      return true;
    } else {
      this.addCombatLog('attack', `${attacker.name} misses ${defender.name} (AC ${defender.armorClass})`);
      return false;
    }
  }

  // Apply damage to combatant
  public applyDamage(combatantId: string, damage: number): void {
    if (!this.currentCombat) return;
    
    const combatant = this.getCombatant(combatantId);
    if (!combatant || !combatant.isAlive) return;
    
    // Apply defend reduction if defending
    let finalDamage = damage;
    if (combatant.isDefending) {
      finalDamage = Math.floor(damage * 0.5); // 50% damage reduction
      this.addCombatLog('status', `${combatant.name} giảm 50% sát thương nhờ phòng thủ (${damage} → ${finalDamage})`);
    }
    
    combatant.health.current = Math.max(0, combatant.health.current - finalDamage);
    
    this.addCombatLog('damage', 
      `${combatant.name} takes ${finalDamage} damage (${combatant.health.current}/${combatant.health.max} HP)`
    );
    
    // Check if combatant dies
    if (combatant.health.current <= 0) {
      combatant.isAlive = false;
      this.addCombatLog('death', `${combatant.name} is defeated!`);
      
      // Check if combat ends after death
      this.checkCombatEnd();
    }
  }

  // Defend action - reduces incoming damage by 50%
  public defend(combatantId: string): boolean {
    if (!this.currentCombat) return false;
    
    const combatant = this.getCombatant(combatantId);
    if (!combatant || !combatant.isAlive) return false;
    
    combatant.isDefending = true;
    this.addCombatLog('status', `${combatant.name} phòng thủ`);
    
    return true;
  }

  // Use item in combat
  public useItem(combatantId: string, item: InventoryItem, targetId?: string): boolean {
    if (!this.currentCombat) return false;
    
    const combatant = this.getCombatant(combatantId);
    if (!combatant || !combatant.isAlive) return false;
    
    // Only player can use items for now
    if (combatant.type !== 'player') return false;
    
    // Check if item can be used in combat
    if (item.type === 'consumable' && item.damage) {
      // Damaging consumable (bomb, poison, etc.)
      if (targetId) {
        const target = this.getCombatant(targetId);
        if (target && target.isAlive) {
          const damageRoll = DiceRoller.roll(item.damage, `${item.name} damage`);
          this.addCombatLog('damage', 
            `${combatant.name} uses ${item.name} on ${target.name} for ${damageRoll.total} damage`
          );
          this.applyDamage(targetId, damageRoll.total);
          return true;
        }
      }
    } else if (item.type === 'consumable' && !item.damage) {
      // Healing or utility consumable
      if (item.name.toLowerCase().includes('heal') || item.name.toLowerCase().includes('potion')) {
        const healAmount = Math.floor(Math.random() * 8) + 2; // 2-9 healing
        combatant.health.current = Math.min(combatant.health.max, combatant.health.current + healAmount);
        this.addCombatLog('heal', 
          `${combatant.name} uses ${item.name} and heals ${healAmount} HP (${combatant.health.current}/${combatant.health.max} HP)`
        );
        return true;
      }
    }
    
    return false;
  }

  // End current turn
  public endTurn(): void {
    if (!this.currentCombat) return;
    
    // Create turn log for current combatant BEFORE moving to next
    this.createTurnLog();
    
    // Move to next combatant
    this.currentCombat.currentCombatantIndex = 
      (this.currentCombat.currentCombatantIndex + 1) % this.currentCombat.turnOrder.length;
    
    // If we've completed a full round, increment turn counter
    if (this.currentCombat.currentCombatantIndex === 0) {
      this.currentCombat.currentTurn++;
    }
    
    // Update player turn status
    const currentCombatantId = this.currentCombat.turnOrder[this.currentCombat.currentCombatantIndex];
    this.currentCombat.isPlayerTurn = currentCombatantId === 'player';
    
    
    // Reset turn tracking for NEXT combatant
    this.currentTurnActions = [];
    this.currentTurnCombatant = currentCombatantId;
    
    // Reset defend status for new turn
    const nextCombatant = this.getCombatant(currentCombatantId);
    if (nextCombatant) {
      nextCombatant.isDefending = false;
    }
    
    // Reset attack key for new turn (only if it's a new turn)
    if (this.currentCombat.currentCombatantIndex === 0) {
      this.currentCombat.lastAttackKey = undefined;
    }
    
    // Skip dead combatants
    const currentCombatant = this.getCombatant(currentCombatantId);
    if (currentCombatant && !currentCombatant.isAlive) {
      this.endTurn(); // Recursively skip dead combatants
    }
  }

  // Check if combat has ended
  private checkCombatEnd(): void {
    if (!this.currentCombat) return;
    
    const player = this.getCombatant('player');
    const enemies = this.currentCombat.combatants.filter(c => c.type === 'enemy' && c.isAlive);
    
    if (!player || !player.isAlive) {
      // Player defeated
      this.currentCombat.isActive = false;
      this.currentCombat.winner = 'enemies';
      this.calculateRewards(); // Calculate rewards even for defeat
      this.addCombatLog('defeat', 'Bạn đã bị đánh bại!');
    } else if (enemies.length === 0) {
      // All enemies defeated
      this.currentCombat.isActive = false;
      this.currentCombat.winner = 'player';
      this.calculateRewards();
      this.addCombatLog('victory', 'Bạn đã chiến thắng!');
    }
  }

  // Calculate combat rewards
  private calculateRewards(): void {
    if (!this.currentCombat) return;
    
    const defeatedEnemies = this.currentCombat.combatants.filter(c => c.type === 'enemy' && !c.isAlive);
    
    let totalExperience = 0;
    const items: InventoryItem[] = [];
    
    // Track defeated enemies for quest system
    const defeatedEnemiesInfo = defeatedEnemies.map(enemy => ({
      name: enemy.name,
      type: enemy.enemyData?.type || 'other',
      enemyId: enemy.enemyData?.npcId, // if enemy is NPC
      defeatedAt: new Date(),
      turn: this.currentCombat!.currentTurn
    }));

    // Save to combat history
    try {
      const combatHistory = JSON.parse(localStorage.getItem('combat_history') || '{"defeatedEnemies":[]}');
      
      // Ensure defeatedEnemies is an array
      if (!Array.isArray(combatHistory.defeatedEnemies)) {
        combatHistory.defeatedEnemies = [];
      }
      
      combatHistory.defeatedEnemies.push(...defeatedEnemiesInfo);
      localStorage.setItem('combat_history', JSON.stringify(combatHistory));
    } catch (error) {
      console.error('Error saving to combat history:', error);
      // Fallback: create new combat history
      localStorage.setItem('combat_history', JSON.stringify({
        defeatedEnemies: defeatedEnemiesInfo
      }));
    }
    
    defeatedEnemies.forEach(enemy => {
      if (enemy.enemyData) {
        totalExperience += enemy.enemyData.experienceReward;
        
        // Use enhanced loot system ONLY
        const enhancedLoot = enhancedLootService.generateLootForEnemy(enemy.enemyData);
        if (Array.isArray(enhancedLoot)) {
          items.push(...enhancedLoot);
        }
        
        // REMOVED: Original loot system to prevent invalid items
        // Only use enhancedLootService for consistent item format
      }
    });
    
    // Set rewards - even for defeat, we still track what happened
    this.currentCombat.rewards = {
      experience: totalExperience,
      items
    };
  }

  // Generate combat result data for GamePage
  public generateCombatResultData(): CombatResultData | null {
    if (!this.currentCombat) return null;
    
    const player = this.getCombatant('player');
    const defeatedEnemies = this.currentCombat.combatants
      .filter(c => c.type === 'enemy' && !c.isAlive);
    
    // Calculate combat statistics
    const damageDealtLogs = this.currentCombat.combatLog
      .filter(log => log.type === 'damage' && log.message.includes(player?.name || ''));
    
    const totalDamageDealt = damageDealtLogs.reduce((sum, log) => {
      const match = log.message.match(/(\d+) total damage/);
      return sum + (match ? parseInt(match[1]) : 0);
    }, 0);
    
    const healthLost = player 
      ? (player.characterData?.health?.max || player.health.max) - player.health.current
      : 0;
    
    return {
      combatId: `combat_${Date.now()}`,
      timestamp: new Date(),
      duration: 0, // Will be calculated
      victory: this.currentCombat.winner === 'player',
    enemiesDefeated: defeatedEnemies.map(e => ({
      name: e.name,
      type: e.enemyData?.type || 'unknown',
      level: e.combatLevel || e.level || 1,
      npcId: e.enemyData?.npcId, // NPC ID if enemy is an NPC
      finalHealth: e.health.current // Final health when defeated
    })),
      characterUpdates: {
        healthBefore: player?.characterData?.health?.max || player?.health.max || 0,
        healthAfter: player?.health.current || 0,
        healthLost: healthLost,
        experienceGained: this.currentCombat.rewards?.experience || 0,
        combatLevelBefore: player?.combatLevel || 1,
        combatLevelAfter: player?.combatLevel || 1, // Will be updated by GamePage
        leveledUp: false, // Will be updated by GamePage
        totalDamageDealt: totalDamageDealt,
        totalDamageTaken: healthLost,
        turnsPlayed: this.currentCombat.currentTurn,
        attacksLanded: damageDealtLogs.length,
        attacksMissed: this.currentCombat.combatLog
          .filter(log => log.type === 'attack' && log.message.includes('misses')).length
      },
      rewards: this.currentCombat.rewards || {
        experience: 0,
        items: []
      },
      metadata: {}
    };
  }

  // Get combatant by ID
  public getCombatant(id: string): Combatant | undefined {
    if (!this.currentCombat) return undefined;
    return this.currentCombat.combatants.find(c => c.id === id);
  }

  // Get current combat state
  public getCurrentCombat(): CombatState | null {
    return this.currentCombat;
  }

  // Add entry to combat log
  private addCombatLog(type: CombatLogEntry['type'], message: string, details?: any): void {
    if (!this.currentCombat) return;
    
    const entry: CombatLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      turn: this.currentCombat.currentTurn,
      type,
      message,
      details,
      timestamp: new Date()
    };
    
    // Ensure combatLog is an array
    if (!Array.isArray(this.currentCombat.combatLog)) {
      this.currentCombat.combatLog = [];
    }
    this.currentCombat.combatLog.push(entry);
    this.currentTurnActions.push(entry);
  }

  // Get combat log
  public getCombatLog(): CombatLogEntry[] {
    if (!this.currentCombat) return [];
    return [...this.currentCombat.combatLog];
  }

  // End combat
  public endCombat(): void {
    this.currentCombat = null;
  }

  // Get alive enemies
  public getAliveEnemies(): Combatant[] {
    if (!this.currentCombat) return [];
    return this.currentCombat.combatants.filter(c => c.type === 'enemy' && c.isAlive);
  }

  // Get alive player
  public getAlivePlayer(): Combatant | undefined {
    if (!this.currentCombat) return undefined;
    const player = this.getCombatant('player');
    return player && player.isAlive ? player : undefined;
  }

  // Check if it's player's turn
  public isPlayerTurn(): boolean {
    if (!this.currentCombat) return false;
    return this.currentCombat.isPlayerTurn;
  }

  // Get current combatant
  public getCurrentCombatant(): Combatant | undefined {
    if (!this.currentCombat) return undefined;
    const currentId = this.currentCombat.turnOrder[this.currentCombat.currentCombatantIndex];
    return this.getCombatant(currentId);
  }

  // Create turn log for current combatant
  private createTurnLog(): void {
    if (!this.currentCombat || !this.currentTurnCombatant || this.currentTurnActions.length === 0) {
      return;
    }
    
    const combatant = this.getCombatant(this.currentTurnCombatant);
    if (!combatant) return;
    
    // Generate turn description using narration service
    const description = combatNarrationService.generateTurnDescription(
      combatant,
      this.currentTurnActions,
      combatant.type === 'player'
    );
    
    const turnLog: TurnLog = {
      turn: this.currentCombat.currentTurn,
      combatantId: combatant.id,
      combatantName: combatant.name,
      actions: [...this.currentTurnActions],
      description,
      timestamp: new Date(),
      isPlayerTurn: combatant.type === 'player'
    };
    
    // Ensure turnLogs is an array
    if (!Array.isArray(this.currentCombat.turnLogs)) {
      this.currentCombat.turnLogs = [];
    }
    this.currentCombat.turnLogs.push(turnLog);
  }

  // Get turn logs
  public getTurnLogs(): TurnLog[] {
    if (!this.currentCombat) return [];
    return [...this.currentCombat.turnLogs];
  }

  // Execute enemy AI turn
  public async executeEnemyTurn(): Promise<void> {
    if (!this.currentCombat || this.currentCombat.isPlayerTurn) return;
    
    const currentCombatant = this.getCurrentCombatant();
    if (!currentCombatant || currentCombatant.type !== 'enemy' || !currentCombatant.isAlive) return;
    
    try {
      // Get AI difficulty based on world difficulty or default to medium
      const difficulty = this.getAIDifficulty();
      
      // Decide action using AI service
      const action = await this.decideEnemyAction(currentCombatant, difficulty);
      
      // Execute the action
      await this.executeEnemyAction(currentCombatant, action);
      
      // End enemy turn after action
      this.endTurn();
      
    } catch (error) {
      console.error('Error executing enemy turn:', error);
      // Fallback to defend action
      this.addCombatLog('status', `${currentCombatant.name} phòng thủ do lỗi AI`);
      // End turn even on error
      this.endTurn();
    }
  }

  // Get AI difficulty based on world difficulty
  private getAIDifficulty(): 'easy' | 'medium' | 'hard' {
    if (!this.currentCombat?.worldDifficulty) return 'medium';
    
    const worldDiff = this.currentCombat.worldDifficulty.toLowerCase();
    if (worldDiff.includes('dễ') || worldDiff.includes('easy')) return 'easy';
    if (worldDiff.includes('khó') || worldDiff.includes('hard') || worldDiff.includes('cực khó')) return 'hard';
    return 'medium';
  }

  // Decide enemy action using AI service
  private async decideEnemyAction(
    enemy: Combatant,
    difficulty: 'easy' | 'medium' | 'hard'
  ): Promise<CombatAction> {
    const allCombatants = this.currentCombat?.combatants || [];
    
    // Check if should use AI service for complex decisions
    if (enemyAIService.shouldUseAIService(enemy, difficulty)) {
      try {
        return await enemyAIService.generateAICombatDecision(enemy, allCombatants, {
          turn: this.currentCombat?.currentTurn || 1,
          difficulty: this.currentCombat?.worldDifficulty
        });
      } catch (error) {
        console.error('Error using AI service, falling back to logic AI:', error);
      }
    }
    
    // Use logic-based AI
    return enemyAIService.decideAction(enemy, allCombatants, difficulty, this.currentCombat?.worldDifficulty);
  }

  // Execute enemy action
  private async executeEnemyAction(enemy: Combatant, action: CombatAction): Promise<void> {
    switch (action.type) {
      case 'attack':
        if (action.targetId && action.attackIndex !== undefined) {
          const target = this.getCombatant(action.targetId);
          if (target && target.isAlive) {
            this.addCombatLog('attack', action.description);
            this.performAttack(enemy.id, target.id, action.attackIndex);
          }
        }
        break;
        
      case 'defend':
        this.defend(enemy.id);
        break;
        
      case 'use_item':
        if (action.itemId) {
          this.addCombatLog('heal', action.description);
          // Implement item usage logic here
        }
        break;
        
      case 'ability':
        if (action.abilityId) {
          this.addCombatLog('status', action.description);
          // Implement ability usage logic here
        }
        break;
        
      default:
        this.addCombatLog('status', action.description);
    }
  }

  // Check if it's enemy turn and execute AI
  public async processEnemyTurn(): Promise<void> {
    if (!this.currentCombat || this.currentCombat.isPlayerTurn) return;
    
    // Add a small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await this.executeEnemyTurn();
    
    // Check if combat ended after enemy action
    if (this.currentCombat) {
      this.checkCombatEnd();
    }
  }
}

// Export singleton instance
export const combatService = CombatService.getInstance();

