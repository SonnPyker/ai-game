import { Character, Enemy, CombatStats, Attack, InventoryItem } from '../types';
import { DiceRoller } from '../utils/diceRoller';

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
  type: 'initiative' | 'attack' | 'damage' | 'heal' | 'status' | 'death' | 'victory' | 'defeat';
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
  isActive: boolean;
  isPlayerTurn: boolean;
  winner?: 'player' | 'enemies';
  rewards?: {
    experience: number;
    items: InventoryItem[];
    currency?: number;
  };
}

class CombatService {
  private static instance: CombatService;
  private currentCombat: CombatState | null = null;

  private constructor() {}

  public static getInstance(): CombatService {
    if (!CombatService.instance) {
      CombatService.instance = new CombatService();
    }
    return CombatService.instance;
  }

  // Initialize combat with player and enemies
  public initiateCombat(player: Character, enemies: Enemy[]): CombatState {
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
        stats: enemy.stats,
        health: { ...enemy.health },
        armorClass: enemy.armorClass,
        attacks: enemy.attacks,
        abilities: enemy.abilities,
        initiative: 0,
        isAlive: true,
        statusEffects: [],
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
      isActive: true,
      isPlayerTurn: turnOrder[0] === 'player',
      winner: undefined,
      rewards: undefined
    };

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
    let ac = 10; // Base AC
    
    // Add agility modifier
    if (player.coreStats?.modifiers) {
      ac += player.coreStats.modifiers.agility;
    }
    
    // Add equipment bonuses (if any)
    if (player.equipped_stats_bonuses) {
      ac += Math.floor(player.equipped_stats_bonuses.agility / 2);
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
          damageType: weapon.damageType || 'physical'
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
          damageType: weapon.damageType || 'physical'
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
    
    // Equipment bonuses
    if (player.equipped_stats_bonuses) {
      bonus += Math.floor(player.equipped_stats_bonuses.strength / 2);
    }
    
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
      if (attack.damageType === 'physical' && attacker.stats.modifiers.strength > 0) {
        totalDamage += attacker.stats.modifiers.strength;
      }
      
      this.addCombatLog('damage', 
        `${attacker.name} hits for ${damageRoll.total} damage (${attack.damage}) = ${totalDamage} total damage`
      );
      
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
    
    combatant.health.current = Math.max(0, combatant.health.current - damage);
    
    this.addCombatLog('damage', 
      `${combatant.name} takes ${damage} damage (${combatant.health.current}/${combatant.health.max} HP)`
    );
    
    // Check if combatant dies
    if (combatant.health.current <= 0) {
      combatant.isAlive = false;
      this.addCombatLog('death', `${combatant.name} is defeated!`);
      
      // Check if combat ends
      this.checkCombatEnd();
    }
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
    
    defeatedEnemies.forEach(enemy => {
      if (enemy.enemyData) {
        totalExperience += enemy.enemyData.experienceReward;
        if (enemy.enemyData.loot) {
          items.push(...enemy.enemyData.loot);
        }
      }
    });
    
    this.currentCombat.rewards = {
      experience: totalExperience,
      items
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
    
    this.currentCombat.combatLog.push(entry);
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
}

// Export singleton instance
export const combatService = CombatService.getInstance();

