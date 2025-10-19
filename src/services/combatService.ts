import { Character, Enemy, CombatStats, Attack, InventoryItem, CharacterSkill } from '../types';
import { DiceRoller } from '../utils/diceRoller';
import { TurnLog, CombatAction, CombatResultData, CombatTurnState, CombatAnimationType } from '../types/combat';
import { MigrationService } from './saveStorage/migrationService';
import { enemyAIService } from './enemyAIService';
import { combatNarrationService } from './combatNarrationService';
import { enhancedLootService } from './enhancedLootService';
import { combatAnimationService } from './combatAnimationService';
import { effectProcessingService } from './effectProcessingService';
import { skillEffectService } from './skillEffectService';
import { skillTreeService } from './skillTreeService';
import { combatLevelService } from './combatLevelService';
import { enemyDatabaseService } from './enemyDatabaseService';
import { allyManagementService } from './allyManagementService';
import { npcRelationshipService } from './npcRelationshipService';
import { combatPreparationService } from './combatPreparationService';
import { elementalDamageService } from './elementalDamageService';

export interface Combatant {
  id: string;
  name: string;
  type: 'player' | 'enemy' | 'npc' | 'ally';
  level?: number; // Legacy level field (for backward compatibility)
  combatLevel?: number; // Combat Level (chỉ cho chiến đấu)
  characterLevel?: number; // Character Level (tổng thể)
  stats: CombatStats['stats'];
  health: { current: number; max: number };
  armorClass: number;
  attacks: Attack[];
  abilities?: any[];
  skills?: CharacterSkill[]; // Character skills for combat
  initiative: number;
  isAlive: boolean;
  statusEffects: StatusEffect[];
  isDefending: boolean; // New: Defend status
  equippedArmor?: InventoryItem; // Chest armor đang mặc
  inventory?: InventoryItem[]; // Inventory cho enemy/NPC
  // For enemies/NPCs
  enemyData?: Enemy;
  // For player
  characterData?: Character;
  // For allies
  allyNPCId?: string; // ID của NPC gốc nếu type === 'ally'
}

export interface StatusEffect {
  id: string;
  name: string;
  description: string;
  duration: number; // turns remaining
  icon: string; // Icon để hiển thị
  color?: string; // Color for UI
  effects: {
    healthModifier?: number;
    armorClassModifier?: number;
    attackModifier?: number;
    damageModifier?: string;
    statModifiers?: { [key: string]: number };
    skipTurn?: boolean;
    skipTurnChance?: number;
    damagePerTurn?: number;
    damageType?: string;
  };
}

export interface TemporaryPlayerStats {
  // Core stats (base + equipment + status effects)
  coreStats: {
    strength: number;
    agility: number;
    intelligence: number;
    constitution: number;
    wisdom: number;
    charisma: number;
    modifiers: {
      strength: number;
      agility: number;
      intelligence: number;
      constitution: number;
      wisdom: number;
      charisma: number;
    };
  };
  // Combat stats
  armorClass: number; // AC with equipment + status effects
  attackBonus: number; // From stats + equipment + status effects
  damageBonus: string; // Extra damage dice from buffs (e.g., "+2d4")
  // Equipment bonuses
  equipmentBonuses: {
    ac: number;
    attack: number;
    damage: string;
    stats: { [key: string]: number };
  };
  // Status effect modifiers
  statusEffectModifiers: {
    ac: number;
    attack: number;
    damage: string;
    stats: { [key: string]: number };
  };
}

export interface CombatLogEntry {
  id: string;
  turn: number;
  type: 'initiative' | 'attack' | 'damage' | 'heal' | 'status' | 'death' | 'victory' | 'defeat' | 'info';
  message: string;
  details?: any;
}

export interface CombatState {
  combatants: Combatant[];
  currentTurn: number;
  currentCombatantIndex: number;
  turnOrder: string[]; // combatant IDs in initiative order
  turnLogs: TurnLog[]; // Grouped logs by turn
  isActive: boolean;
  isPlayerTurn: boolean;
  winner?: 'player' | 'enemies' | 'fled';
  rewards?: {
    experience: number;
    items: InventoryItem[];
    currency?: number;
  };
  worldDifficulty?: string; // For AI difficulty mapping
  lastAttackKey?: string; // Prevent duplicate attacks
  turnState?: CombatTurnState; // Current turn state for manual turn control
  playerInventory?: InventoryItem[]; // Player's current inventory for combat UI
  temporaryPlayerStats?: TemporaryPlayerStats; // Player's temporary stats with buffs/debuffs
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
  public async initiateCombat(player: Character, enemies: Enemy[], worldDifficulty?: string): Promise<CombatState> {
    const combatants: Combatant[] = [];

    // Migrate character skills if needed
    const migrationService = new MigrationService();
    const migratedPlayer = migrationService.migrateCharacterSkills(player);

    // Add player
    const playerCombatant: Combatant = {
      id: 'player',
      name: migratedPlayer.name,
      type: 'player',
      level: migratedPlayer.level || 1, // Legacy level
      combatLevel: migratedPlayer.combatLevel || migratedPlayer.level || 1, // Combat Level
      characterLevel: migratedPlayer.level || 1, // Character Level
      stats: migratedPlayer.coreStats || {
        strength: 10,
        agility: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10,
        modifiers: { strength: 0, agility: 0, constitution: 0, intelligence: 0, wisdom: 0, charisma: 0 }
      },
      health: migratedPlayer.health || { current: 20, max: 20 },
      armorClass: this.calculatePlayerAC(migratedPlayer),
      attacks: this.getPlayerAttacks(migratedPlayer),
      skills: migratedPlayer.skills ? migratedPlayer.skills.map(skill => ({ ...skill, currentCooldown: 0 })) : [], // Copy skills and reset cooldown
      initiative: 0,
      isAlive: true,
      statusEffects: [],
      isDefending: false,
      characterData: migratedPlayer
    };

    combatants.push(playerCombatant);

    // Add allies - đảm bảo không có duplicate
    const activeAllies = allyManagementService.getActiveAllies();
    const addedAllyIds = new Set<string>(); // Track added ally IDs to prevent duplicates
    
    for (const allyNPC of activeAllies) {
      // Skip if already added (duplicate prevention)
      if (addedAllyIds.has(allyNPC.id)) {
        console.warn(`Skipping duplicate ally: ${allyNPC.name} (${allyNPC.id})`);
        continue;
      }
      
      // Prepare NPC for combat nếu chưa có stats
      if (!allyNPC.combatStats || !allyNPC.canBeCombatant) {
        try {
          const { npc: preparedNPC } = await combatPreparationService.prepareNPCForCombat(allyNPC.id);
          Object.assign(allyNPC, preparedNPC);
        } catch (error) {
          console.warn('Không thể prepare combat stats cho ally:', error);
          continue; // Skip this ally if preparation fails
        }
      }
      
      // Ensure combat stats exist before creating combatant
      if (allyNPC.combatStats) {
        const allyCombatant: Combatant = {
          id: `ally_${allyNPC.id}`,
          name: allyNPC.name,
          type: 'ally',
          allyNPCId: allyNPC.id,
          level: allyNPC.combatStats.characterLevel,
          combatLevel: allyNPC.combatStats.combatLevel,
          characterLevel: allyNPC.combatStats.characterLevel,
          stats: allyNPC.combatStats.stats,
          health: { ...allyNPC.combatStats.health },
          armorClass: allyNPC.combatStats.armorClass,
          attacks: allyNPC.combatStats.attacks,
          abilities: allyNPC.combatStats.abilities,
          initiative: 0,
          isAlive: true,
          statusEffects: [],
          isDefending: false
        };
        
        combatants.push(allyCombatant);
        addedAllyIds.add(allyNPC.id); // Mark as added
      }
    }

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
        equippedArmor: (enemy as any).equippedArmor, // Include equipped armor
        inventory: (enemy as any).inventory || effectProcessingService.generateEnemyConsumables(
          enemy.combatLevel || enemy.level || 1,
          worldDifficulty === 'easy' ? 'easy' : worldDifficulty === 'hard' ? 'hard' : 'medium'
        ), // Generate consumables for enemy
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
      turnLogs: [],
      isActive: true,
      isPlayerTurn: turnOrder[0] === 'player',
      winner: undefined,
      rewards: undefined,
      worldDifficulty,
      playerInventory: migratedPlayer.inventory || [], // Initialize player inventory
      turnState: {
        hasPerformedAction: false,
        canEndTurn: false,
        mainActionUsed: false,
        extraActionUsed: false,
        skillActionUsed: false,
      }
    };

    // Initialize turn tracking
    this.currentTurnActions = [];
    this.currentTurnCombatant = turnOrder[0];

    // Log combat start
    this.addTurnAction('initiative', `Combat bắt đầu! Thứ tự lượt đi: ${combatants.map(c => c.name).join(', ')}`);

    // Initialize temporary player stats
    this.updateTemporaryPlayerStats();

    return this.currentCombat!;
  }

  // Roll initiative for all combatants
  private rollInitiative(combatants: Combatant[]): void {
    combatants.forEach(combatant => {
      const initiativeRoll = DiceRoller.roll('d20', 'Initiative');
      const initiativeModifier = combatant.stats.modifiers.agility;
      combatant.initiative = initiativeRoll.total + initiativeModifier;
      
      this.addTurnAction('initiative', 
        `${combatant.name} roll initiative: ${initiativeRoll.total} + ${initiativeModifier} = ${combatant.initiative}`
      );
    });
  }

  // Calculate player AC
  private calculatePlayerAC(player: Character): number {
    // Use AC from coreStats if available
    if (player.coreStats?.armorClass !== undefined) {
      let ac = player.coreStats.armorClass;
      
      // Apply skill tree bonuses
      const skillBonuses = skillTreeService.getActiveBonuses(player);
      if (skillBonuses.armorClass) {
        ac += skillBonuses.armorClass;
      }
      
      return ac;
    }
    
    // Fallback calculation for backward compatibility
    let ac = 10; // Base AC
    
    // Add agility modifier
    const agilityModifier = player.coreStats?.modifiers?.agility || 0;
    ac += agilityModifier;
    
    // Check for armor equipment
    if (player.equipment?.armor && player.equipment.armor.armorClass) {
      // Use armor's AC + agility modifier
      ac = player.equipment.armor.armorClass + agilityModifier;
    }
    
    // Apply skill tree bonuses
    const skillBonuses = skillTreeService.getActiveBonuses(player);
    if (skillBonuses.armorClass) {
      ac += skillBonuses.armorClass;
    }
    
    return ac;
  }

  // Calculate AC with status effects
  public calculateACWithEffects(combatant: Combatant): number {
    let ac = combatant.armorClass;
    
    // Apply status effects that modify AC
    if (combatant.statusEffects) {
      combatant.statusEffects.forEach(effect => {
        if (effect.effects?.armorClassModifier) {
          ac += effect.effects.armorClassModifier;
        }
      });
    }
    
    return ac;
  }

  // Calculate temporary player stats with all modifiers
  public calculateTemporaryPlayerStats(): TemporaryPlayerStats | null {
    const player = this.getAlivePlayer();
    if (!player || !player.characterData) return null;
    
    const character = player.characterData;
    const baseStats = character.coreStats!;
    
    // 1. Start with base stats
    const tempStats: TemporaryPlayerStats = {
      coreStats: JSON.parse(JSON.stringify(baseStats)),
      armorClass: baseStats.armorClass,
      attackBonus: 0,
      damageBonus: '',
      equipmentBonuses: { ac: 0, attack: 0, damage: '', stats: {} },
      statusEffectModifiers: { ac: 0, attack: 0, damage: '', stats: {} }
    };
    
    // 2. Add equipment bonuses
    if (player.equippedArmor?.armorClass) {
      tempStats.equipmentBonuses.ac += player.equippedArmor.armorClass;
    }
    
    // Calculate weapon bonuses
    if (character.equipment?.weapon) {
      const weapon = character.equipment.weapon;
      if (weapon.attackBonus) {
        tempStats.equipmentBonuses.attack += weapon.attackBonus;
      }
      // REMOVED: weapon.damage không được thêm vào equipmentBonuses.damage
      // Weapon damage được xử lý riêng trong getPlayerAttacks()
    }
    
    // 3. Add status effect modifiers
    player.statusEffects.forEach(effect => {
      if (effect.effects.armorClassModifier) {
        tempStats.statusEffectModifiers.ac += effect.effects.armorClassModifier;
      }
      if (effect.effects.attackModifier) {
        tempStats.statusEffectModifiers.attack += effect.effects.attackModifier;
      }
      if (effect.effects.damageModifier) {
        // damageModifier is a string (e.g., "1d4", "+2", "-2")
        if (tempStats.statusEffectModifiers.damage) {
          tempStats.statusEffectModifiers.damage += ` + ${effect.effects.damageModifier}`;
        } else {
          tempStats.statusEffectModifiers.damage = effect.effects.damageModifier;
        }
      }
      if (effect.effects.statModifiers) {
        Object.entries(effect.effects.statModifiers).forEach(([stat, value]) => {
          tempStats.statusEffectModifiers.stats[stat] = 
            (tempStats.statusEffectModifiers.stats[stat] || 0) + value;
          if (stat in tempStats.coreStats) {
            (tempStats.coreStats as any)[stat] += value;
          }
        });
      }
    });
    
    // 4. Calculate final values
    // Get skill tree bonuses first
    const skillBonuses = skillTreeService.getActiveBonuses(character);
    
    tempStats.armorClass = baseStats.armorClass + 
      tempStats.equipmentBonuses.ac + 
      tempStats.statusEffectModifiers.ac +
      (skillBonuses.armorClass || 0);
    
    // Calculate attack bonus from strength modifier + equipment + status effects + skill tree
    tempStats.attackBonus = baseStats.modifiers.strength + 
      tempStats.equipmentBonuses.attack + 
      tempStats.statusEffectModifiers.attack +
      (skillBonuses.attackBonus || 0);
    
    // Combine damage bonuses (status effects + skill tree)
    const damageParts = [];
    
    // Add skill tree damage bonus (loại bỏ dấu +)
    if (skillBonuses.damageBonus) {
      const cleanSkillBonus = skillBonuses.damageBonus.replace(/^\+/, '');
      damageParts.push(cleanSkillBonus);
    }
    
    // Add status effect damage bonus
    if (tempStats.statusEffectModifiers.damage) {
      damageParts.push(tempStats.statusEffectModifiers.damage);
    }
    
    tempStats.damageBonus = damageParts.join(' + ');
    
    return tempStats;
  }

  // Update temporary player stats in combat state
  private updateTemporaryPlayerStats(): void {
    if (!this.currentCombat) return;
    const tempStats = this.calculateTemporaryPlayerStats();
    this.currentCombat.temporaryPlayerStats = tempStats || undefined;
    console.log('Updated temporaryPlayerStats:', tempStats);
  }

  // Get player attacks from equipped weapons
  private getPlayerAttacks(player: Character): Attack[] {
    const attacks: Attack[] = [];
    
    if (player.equipment?.weapon) {
      const weapon = player.equipment.weapon;
      if (weapon.damage) {
        const attackBonus = this.calculateAttackBonus(player, weapon);
        const finalDamage = weapon.damage || '1d4';
        attacks.push({
          name: weapon.name,
          attackBonus,
          damage: finalDamage,
          damageType: (weapon.damageType as 'physical' | 'magical' | 'fire' | 'cold' | 'lightning' | 'poison' | 'psychic') || 'physical'
        });
      }
    }
    
    // Default unarmed attack if no weapons
    if (attacks.length === 0) {
      const attackBonus = this.calculateAttackBonus(player);
      const finalDamage = '1d4';
      attacks.push({
        name: 'Unarmed Strike',
        attackBonus,
        damage: finalDamage,
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
    
    // Apply skill tree bonuses
    const skillBonuses = skillTreeService.getActiveBonuses(player);
    if (skillBonuses.attackBonus) {
      bonus += skillBonuses.attackBonus;
    }
    
    return bonus;
  }

  // Perform attack with visual feedback and delays
  public async performAttack(attackerId: string, defenderId: string, attackIndex: number = 0): Promise<boolean> {
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
    
    // Mark that player has performed main action
    if (attackerId === 'player' && this.currentCombat.turnState) {
      this.currentCombat.turnState.hasPerformedAction = true;
      this.currentCombat.turnState.mainActionUsed = true;
      this.currentCombat.turnState.mainActionType = 'attack';
      this.currentCombat.turnState.actionTarget = defenderId;
    }
    
    const attack = attacker.attacks[attackIndex];
    
    // Step 1: Attack Roll
    const attackRoll = DiceRoller.roll('d20', `${attacker.name} attacks with ${attack.name}`);
    const totalAttack = attackRoll.total + attack.attackBonus;
    
    this.addTurnAction('attack', 
      `${attacker.name} attacks ${defender.name} with ${attack.name}: ${attackRoll.total} + ${attack.attackBonus} = ${totalAttack} vs AC ${this.calculateACWithEffects(defender)}`
    );
    
    // Add delay only for player attacks (for visual feedback)
    if (attackerId === 'player') {
      await this.delay(300);
    }
    
    // Check if hit
    const hit = totalAttack >= this.calculateACWithEffects(defender);
    
    if (hit) {
      // Step 2: Damage Roll with delay
      let totalDamage = 0;
      let damageDescription = `${attacker.name} hits for`;
      let damageParts = [];
      
      // Always roll base weapon damage first
      const baseDamageRoll = DiceRoller.roll(attack.damage, `${attack.name} base damage`);
      totalDamage = baseDamageRoll.total;
      damageParts.push(`${baseDamageRoll.total} (${attack.damage})`);
      
      // For player, add damageBonus if available
      if (attackerId === 'player' && this.currentCombat.temporaryPlayerStats?.damageBonus) {
        const damageBonus = this.currentCombat.temporaryPlayerStats.damageBonus;
        // Split by " + " to get individual damage components
        const damageComponents = damageBonus.split(' + ');
        
        for (const component of damageComponents) {
          const trimmed = component.trim();
          if (trimmed) {
            const roll = DiceRoller.roll(trimmed, `${attack.name} bonus damage (${trimmed})`);
            totalDamage += roll.total;
            damageParts.push(`${roll.total} (${trimmed})`);
          }
        }
      }
      
      // Add appropriate stat modifier based on damage type and weapon properties
      let statBonus = 0;
      let statName = '';
      
      // Check if this is a finesse weapon (can use agility instead of strength)
      const isFinesseWeapon = attacker.characterData?.equipment?.weapon?.weaponProperties?.finesse;
      const isRangedWeapon = attack.range && attack.range > 5; // Range > 5 feet is considered ranged
      
      if (attack.damageType === 'physical' || 
          attack.damageType === 'slashing' || 
          attack.damageType === 'piercing' || 
          attack.damageType === 'bludgeoning') {
        
        if (isRangedWeapon) {
          // Ranged weapons use agility modifier
          statBonus = attacker.stats.modifiers.agility;
          statName = 'agility';
        } else if (isFinesseWeapon) {
          // Finesse weapons can use the better of strength or agility
          const strengthMod = attacker.stats.modifiers.strength;
          const agilityMod = attacker.stats.modifiers.agility;
          statBonus = Math.max(strengthMod, agilityMod);
          statName = strengthMod >= agilityMod ? 'strength' : 'agility';
        } else {
          // Regular melee weapons use strength modifier
          statBonus = attacker.stats.modifiers.strength;
          statName = 'strength';
        }
      } else if (attack.damageType === 'magical' || 
                 attack.damageType === 'fire' || 
                 attack.damageType === 'cold' || 
                 attack.damageType === 'lightning' || 
                 attack.damageType === 'poison' || 
                 attack.damageType === 'psychic' || 
                 attack.damageType === 'radiant') {
        // Magic weapons use intelligence modifier
        statBonus = attacker.stats.modifiers.intelligence;
        statName = 'intelligence';
      }
      
      // Only add positive modifiers to avoid negative damage
      if (statBonus > 0) {
        totalDamage += statBonus;
      }
      
      // Create damage description
      damageDescription += ` ${damageParts.join(' + ')}`;
      if (statBonus > 0) {
        damageDescription += ` + ${statBonus} ${statName} = ${totalDamage} total damage`;
      } else {
        damageDescription += ` = ${totalDamage} total damage`;
      }
      
      this.addTurnAction('damage', damageDescription);
      
      // Add delay only for player attacks (for visual feedback)
      if (attackerId === 'player') {
        await this.delay(200);
      }
      
      // Step 3: Apply damage with visual effects
      await this.applyDamageWithEffects(defenderId, totalDamage, attackerId);
      
      // Step 4: Process elemental saving throw if applicable
      await this.processElementalSavingThrow(attacker, defender, attack);
      
      return true;
    } else {
      // Miss animation
      this.addTurnAction('attack', `${attacker.name} misses ${defender.name} (AC ${this.calculateACWithEffects(defender)})`);
      
      // Trigger miss animation
      this.triggerMissAnimation(defenderId, attackerId);
      
      return false;
    }
  }

  // Apply damage to combatant with visual effects
  public async applyDamageWithEffects(combatantId: string, damage: number, attackerId?: string): Promise<void> {
    if (!this.currentCombat) return;
    
    const combatant = this.getCombatant(combatantId);
    if (!combatant || !combatant.isAlive) return;
    
    // Apply defend reduction if defending
    let finalDamage = damage;
    if (combatant.isDefending) {
      finalDamage = Math.floor(damage * 0.5); // 50% damage reduction
      this.addTurnAction('status', `${combatant.name} giảm 50% sát thương nhờ phòng thủ (${damage} → ${finalDamage})`);
    }
    
    // Trigger damage animation
    this.triggerDamageAnimation(combatantId, finalDamage, attackerId);
    
    // Apply damage after animation delay (only for player attacks)
    if (attackerId === 'player') {
      await this.delay(100);
    }
    combatant.health.current = Math.max(0, combatant.health.current - finalDamage);
    
    this.addTurnAction('damage', 
      `${combatant.name} takes ${finalDamage} damage (${combatant.health.current}/${combatant.health.max} HP)`
    );
    
    // Check if combatant dies
    if (combatant.health.current <= 0) {
      combatant.isAlive = false;
      this.addTurnAction('death', `${combatant.name} is defeated!`);
      
      // Trigger death animation
      this.triggerDeathAnimation(combatantId);
      
      // Check if combat ends after death
      this.checkCombatEnd();
    }
  }

  // Apply damage to combatant (legacy method for compatibility)
  public applyDamage(combatantId: string, damage: number): void {
    if (!this.currentCombat) return;
    
    const combatant = this.getCombatant(combatantId);
    if (!combatant || !combatant.isAlive) return;
    
    // Apply defend reduction if defending
    let finalDamage = damage;
    if (combatant.isDefending) {
      finalDamage = Math.floor(damage * 0.5); // 50% damage reduction
      this.addTurnAction('status', `${combatant.name} giảm 50% sát thương nhờ phòng thủ (${damage} → ${finalDamage})`);
    }
    
    combatant.health.current = Math.max(0, combatant.health.current - finalDamage);
    
    this.addTurnAction('damage', 
      `${combatant.name} takes ${finalDamage} damage (${combatant.health.current}/${combatant.health.max} HP)`
    );
    
    // Check if combatant dies
    if (combatant.health.current <= 0) {
      combatant.isAlive = false;
      this.addTurnAction('death', `${combatant.name} is defeated!`);
      
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
    
    // Add defend status effect
    const defendEffect: StatusEffect = {
      id: `defend_${combatantId}_${Date.now()}`,
      name: 'Phòng Thủ',
      description: 'Giảm 50% sát thương nhận vào',
      duration: 1, // Lasts for 1 turn
      icon: '🛡️',
      effects: {
        armorClassModifier: 0, // Visual only, actual damage reduction is handled in applyDamageWithEffects
        healthModifier: 0
      }
    };
    
    // Remove any existing defend effect first
    combatant.statusEffects = combatant.statusEffects.filter(effect => effect.name !== 'Phòng Thủ');
    combatant.statusEffects.push(defendEffect);
    
    this.addTurnAction('status', `${combatant.name} phòng thủ`);
    
    // Mark that player has performed main action
    if (combatantId === 'player' && this.currentCombat.turnState) {
      this.currentCombat.turnState.hasPerformedAction = true;
      this.currentCombat.turnState.mainActionUsed = true;
      this.currentCombat.turnState.mainActionType = 'defend';
    }
    
    // Trigger defend animation
    this.triggerDefendAnimation(combatantId);
    
    // Update temporary player stats if this is the player
    if (combatantId === 'player') {
      this.updateTemporaryPlayerStats();
    }
    
    return true;
  }

  // Use item in combat (extra action)
  public useItem(combatantId: string, item: InventoryItem, targetId?: string): boolean {
    console.log('combatService.useItem called:', { combatantId, item, targetId });
    if (!this.currentCombat) {
      console.log('No current combat');
      return false;
    }
    
    const combatant = this.getCombatant(combatantId);
    if (!combatant || !combatant.isAlive) {
      console.log('Combatant not found or not alive:', combatantId);
      return false;
    }
    
    // Check if combatant can use extra action
    if (combatantId === 'player' && this.currentCombat.turnState) {
      if (this.currentCombat.turnState.extraActionUsed) {
        return false;
      }
    }
    
    // Check if item can be used in combat
    if (item.type === 'consumable') {
      // Use effect processing service for all consumables
      const effects = effectProcessingService.applyConsumableEffect(combatant, item, targetId, this.currentCombat.combatants);
      
      // Mark extra action as used (regardless of effects length for instant effects like healing)
      if (combatantId === 'player' && this.currentCombat.turnState) {
        this.currentCombat.turnState.extraActionUsed = true;
        this.currentCombat.turnState.extraActionType = 'consumable';
      }
      
      // Log the item usage
      this.addTurnAction('heal', 
        `${combatant.name} sử dụng ${item.name}`
      );
      
      // Log each effect
      effects.forEach(effect => {
        if (effect.duration === 0) {
          // Instant effect
          this.addTurnAction('heal', effect.description);
        } else {
          // Duration effect
          this.addTurnAction('status', effect.description);
        }
      });
      
      // Update temporary player stats after using item
      this.updateTemporaryPlayerStats();
      
      return true;
    }
    
    return false;
  }

  // Use skill in combat (skill action)
  public useSkill(combatantId: string, skillId: string, targetIds?: string[]): boolean {
    if (!this.currentCombat) {
      return false;
    }
    
    const combatant = this.getCombatant(combatantId);
    if (!combatant || !combatant.isAlive) {
      return false;
    }
    
    // Check if combatant can use skill action
    if (combatantId === 'player' && this.currentCombat.turnState) {
      if (this.currentCombat.turnState.skillActionUsed) {
        return false;
      }
    }
    
    // Find the skill
    const skill = combatant.skills?.find(s => s.id === skillId);
    if (!skill) {
      return false;
    }
    
    // Check cooldown
    if (skill.currentCooldown > 0) {
      return false;
    }
    
    // Check if skill requires target
    if (skill.requiresTarget && (!targetIds || targetIds.length === 0)) {
      return false; // Need target selection
    }
    
    // Apply skill effects using new service
    const results = skillEffectService.applySkillEffects(
      combatant, 
      skill, 
      targetIds || [], 
      this.currentCombat.combatants
    );
    
    // Log the skill usage
    this.addTurnAction('info', 
      `${combatant.name} sử dụng kỹ năng ${skill.name}`
    );
    
    // Log results and trigger floating text for damage
    results.forEach(result => {
      this.addTurnAction(result.logType, result.description);
      
      // Trigger floating text for damage results
      if (result.logType === 'damage') {
        // Extract damage amount and target from description
        const damageMatch = result.description.match(/gây (\d+) sát thương cho (.+?)(?:\s|$)/);
        if (damageMatch) {
          const damage = parseInt(damageMatch[1]);
          const targetName = damageMatch[2];
          
          // Find target combatant
          const target = this.currentCombat?.combatants.find(c => c.name === targetName);
          if (target) {
            this.applyDamageWithEffects(target.id, damage, combatantId);
          }
        }
      }
    });
    
    // Set cooldown and mark action used
    skill.currentCooldown = skill.cooldown;
    if (combatantId === 'player' && this.currentCombat.turnState) {
      this.currentCombat.turnState.skillActionUsed = true;
      this.currentCombat.turnState.skillActionType = skill.skillType;
    }
    
    // Update temporary player stats after using skill
    this.updateTemporaryPlayerStats();
    
    return true;
  }

  // End current turn (now requires manual call)
  public endTurn(): void {
    if (!this.currentCombat) return;
    
    // Create turn log for current combatant BEFORE moving to next
    this.createTurnLog();
    
    // Move to next combatant
    this.currentCombat.currentCombatantIndex = 
      (this.currentCombat.currentCombatantIndex + 1) % this.currentCombat.turnOrder.length;
    
    // Update player turn status
    const currentCombatantId = this.currentCombat.turnOrder[this.currentCombat.currentCombatantIndex];
    const isPlayerTurn = currentCombatantId === 'player';
    this.currentCombat.isPlayerTurn = isPlayerTurn;
    
    // If we've completed a full round, increment turn counter
    if (this.currentCombat.currentCombatantIndex === 0) {
      this.currentCombat.currentTurn++;
    }
    
    // Process status effects for the current combatant at the start of their turn
    const currentCombatantForEffects = this.getCombatant(currentCombatantId);
    if (currentCombatantForEffects) {
      this.processCombatantStatusEffects(currentCombatantForEffects);
    }
    
    // CHỈ giảm cooldown khi đến lượt player
    if (isPlayerTurn && currentCombatantForEffects?.skills) {
      currentCombatantForEffects.skills.forEach(skill => {
        if (skill.currentCooldown > 0) {
          skill.currentCooldown--;
        }
      });
    }
    
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
    
    // Initialize turn state for new turn
    this.currentCombat.turnState = {
      hasPerformedAction: false,
      canEndTurn: false,
      mainActionUsed: false,
      extraActionUsed: false,
      skillActionUsed: false,
    };
    
    // Don't process status effects here - only at the end of complete turn cycle
    
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
    const allies = this.currentCombat.combatants.filter(c => c.type === 'ally' && c.isAlive);
    
    if (!player || !player.isAlive) {
      // Player defeated
      console.log('💀 Player defeated, ending combat');
      this.currentCombat.isActive = false;
      this.currentCombat.winner = 'enemies';
      this.calculateRewards(); // Calculate rewards even for defeat
      this.addTurnAction('defeat', 'Bạn đã bị đánh bại!');
    } else if (enemies.length === 0) {
      // All enemies defeated
      console.log('🏆 All enemies defeated, ending combat');
      this.currentCombat.isActive = false;
      this.currentCombat.winner = 'player';
      this.calculateRewards();
      this.addTurnAction('victory', 'Bạn đã chiến thắng!');
      
      // Handle ally injuries and healing
      this.handleAllyCombatEnd(allies);
    }
  }

  // Handle ally status after combat ends
  private handleAllyCombatEnd(_survivingAllies: Combatant[]): void {
    if (!this.currentCombat) return;

    const currentGameTurn = parseInt(localStorage.getItem('game_turn_counter') || '0');
    const allAllies = this.currentCombat.combatants.filter(c => c.type === 'ally');
    
    allAllies.forEach(ally => {
      if (ally.isAlive) {
        // Restore ally health to max
        if (ally.allyNPCId) {
          const npc = npcRelationshipService.getRelationship(ally.allyNPCId);
          if (npc && npc.combatStats) {
            npc.combatStats.health.current = npc.combatStats.health.max;
            npcRelationshipService.addOrUpdateRelationship(npc);
          }
        }
      } else {
        // Ally died - mark as injured
        if (ally.allyNPCId) {
          allyManagementService.injureAlly(ally.allyNPCId, currentGameTurn);
          this.addTurnAction('info', `${ally.name} bị thương nặng và cần thời gian hồi phục!`);
        }
      }
    });
  }

  // Calculate base currency reward based on enemy level and threat level
  private calculateBaseCurrency(enemyLevel: number, threatLevel: string): number {
    // Base currency per level - increased for better rewards
    const baseCurrencyPerLevel = 8;
    
    // Threat level multipliers - increased for better scaling
    const threatMultipliers = {
      'low': 0.7,      // 70% base currency (was 50%)
      'medium': 1.2,   // 120% base currency (was 100%)
      'high': 2.0,     // 200% base currency (was 180%)
      'extreme': 3.5   // 350% base currency (was 300%)
    };
    
    // Calculate base currency
    const baseCurrency = enemyLevel * baseCurrencyPerLevel;
    const multiplier = threatMultipliers[threatLevel as keyof typeof threatMultipliers] || 1.0;
    
    return Math.floor(baseCurrency * multiplier);
  }

  // Calculate combat rewards
  private calculateRewards(): void {
    if (!this.currentCombat) return;
    
    const defeatedEnemies = this.currentCombat.combatants.filter(c => c.type === 'enemy' && !c.isAlive);
    
    let totalExperience = 0;
    let totalCurrency = 0;
    const items: InventoryItem[] = [];
    
    // Track defeated enemies for quest system
    const gameTurn = parseInt(localStorage.getItem('game_turn_counter') || '0');
    const defeatedEnemiesInfo = defeatedEnemies.map(enemy => ({
      name: enemy.name,
      type: enemy.enemyData?.type || 'other',
      enemyId: enemy.enemyData?.npcId, // if enemy is NPC
      defeatedAt: new Date(),
      turn: gameTurn // Use game turn counter, not combat turn
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
        // Calculate enhanced experience based on difficulty
        const difficultyData = enemyDatabaseService.calculateEnemyDifficulty(enemy.enemyData);
        const baseExp = enemy.enemyData.experienceReward || (enemy.combatLevel || 1) * 25;
        
        // Apply difficulty multipliers
        const difficultyMultipliers = {
          'easy': 1.0,
          'medium': 1.5,
          'hard': 2.2,
          'extreme': 3.5
        };
        
        const enhancedExp = Math.floor(baseExp * difficultyMultipliers[difficultyData.rating]);
        totalExperience += enhancedExp;
        
        // Calculate currency reward based on threat level and enemy level
        const threatLevel = enemy.enemyData.threatLevel || 'medium';
        const enemyLevel = enemy.enemyData.combatLevel || enemy.enemyData.level || 1;
        
        // Base currency calculation
        const baseCurrency = this.calculateBaseCurrency(enemyLevel, threatLevel);
        const currencyReward = Math.floor(baseCurrency * difficultyMultipliers[difficultyData.rating]);
        totalCurrency += currencyReward;
        
        // Log difficulty-based XP bonus
        if (difficultyData.rating !== 'easy') {
          this.addTurnAction('info', 
            `🎯 ${difficultyData.rating.toUpperCase()} Enemy Bonus: +${enhancedExp - baseExp} XP (${difficultyData.score}/100 difficulty)`
          );
        }
        
        // Log currency reward
        this.addTurnAction('info', 
          `💰 ${enemy.name}: +${currencyReward} gold (Level ${enemyLevel}, ${threatLevel.toUpperCase()})`
        );
        
        // Use enhanced loot system with difficulty scaling
        const enhancedLoot = enhancedLootService.generateLootForEnemy(enemy.enemyData);
        if (Array.isArray(enhancedLoot)) {
          // Apply difficulty-based loot scaling
          const lootMultiplier = {
            'easy': 1.0,
            'medium': 1.3,
            'hard': 1.8,
            'extreme': 2.5
          };
          
          // Scale loot quantity and quality based on difficulty
          const scaledLoot = this.scaleLootByDifficulty(enhancedLoot, difficultyData.rating, lootMultiplier[difficultyData.rating]);
          items.push(...scaledLoot);
        }
      }
    });
    
    // Multi-Enemy Combat Bonus Loot
    const defeatedEnemyCount = defeatedEnemies.length;
    if (defeatedEnemyCount >= 3 && this.currentCombat.winner === 'player') {
      // Bonus loot for defeating 3+ enemies
      const bonusLootChance = defeatedEnemyCount >= 4 ? 0.5 : 0.3; // 50% for 4+, 30% for 3
      
      if (Math.random() < bonusLootChance) {
        // Generate bonus special item
        const bonusItem = enhancedLootService.generateLootForEnemy({
          id: 'bonus_loot',
          name: 'Multi-Enemy Bonus',
          type: 'humanoid',
          level: defeatedEnemies[0].enemyData?.level || 1,
          combatLevel: defeatedEnemies[0].enemyData?.combatLevel || 1,
          description: 'Bonus loot from defeating multiple enemies',
          stats: defeatedEnemies[0].enemyData?.stats || { 
            strength: 10, agility: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10,
            modifiers: { strength: 0, agility: 0, constitution: 0, intelligence: 0, wisdom: 0, charisma: 0 }
          },
          health: { current: 1, max: 1 },
          armorClass: 10,
          attacks: [],
          experienceReward: 0
        });
        
        if (Array.isArray(bonusItem) && bonusItem.length > 0) {
          items.push(...bonusItem);
          this.addTurnAction('info', `🎁 Nhận thêm phần thưởng đặc biệt từ chiến thắng ${defeatedEnemyCount} enemies!`);
        }
      }
      
      // Increase loot quantity for 3+ enemies (10% chance per extra enemy)
      const extraLootRolls = Math.floor(Math.random() * (defeatedEnemyCount - 2));
      for (let i = 0; i < extraLootRolls; i++) {
        const randomEnemy = defeatedEnemies[Math.floor(Math.random() * defeatedEnemies.length)];
        if (randomEnemy.enemyData) {
          const extraLoot = enhancedLootService.generateLootForEnemy(randomEnemy.enemyData);
          if (Array.isArray(extraLoot)) {
            items.push(...extraLoot);
          }
        }
      }
    }
    
    // Add combat XP if player won
    if (this.currentCombat.winner === 'player') {
      const player = this.getCombatant('player');
      if (player && player.characterData) {
        // Add 1 XP combat level for winning the combat
        const combatLevelResult = combatLevelService.addCombatExperience(player.characterData, 1);
        
        // Log combat level up if it happened
        if (combatLevelResult.leveledUp) {
          this.addTurnAction('info', 
            `Combat Level Up! Level ${combatLevelResult.previousCombatLevel} → ${combatLevelResult.newCombatLevel}`
          );
        }
      }
    }

    // Multi-Enemy XP Bonus: Multiply XP by number of defeated enemies
    const enemyCount = defeatedEnemies.length;
    const finalExperience = totalExperience * enemyCount;
    
    // Log XP bonus for multiple enemies
    if (enemyCount > 1 && this.currentCombat.winner === 'player') {
      this.addTurnAction('info', 
        `🎯 Multi-Enemy Bonus: ${totalExperience} XP × ${enemyCount} enemies = ${finalExperience} XP!`
      );
    }
    
    // Multi-Enemy Currency Bonus: Add bonus currency for defeating multiple enemies
    let finalCurrency = totalCurrency;
    
    if (enemyCount > 1 && this.currentCombat.winner === 'player') {
      // Bonus currency for multiple enemies (15% per additional enemy - increased from 10%)
      const multiEnemyBonus = Math.floor(totalCurrency * 0.15 * (enemyCount - 1));
      finalCurrency += multiEnemyBonus;
      
      this.addTurnAction('info', 
        `💰 Multi-Enemy Currency Bonus: +${multiEnemyBonus} gold (${enemyCount} enemies defeated)`
      );
    }
    
    // Set rewards - even for defeat, we still track what happened
    this.currentCombat.rewards = {
      experience: finalExperience,
      items,
      currency: finalCurrency
    };
  }

  // Generate combat result data for GamePage
  public generateCombatResultData(): CombatResultData | null {
    if (!this.currentCombat) return null;
    
    const player = this.getCombatant('player');
    const defeatedEnemies = this.currentCombat.combatants
      .filter(c => c.type === 'enemy' && !c.isAlive);
    
    // Calculate combat statistics from turnLogs
    const damageDealtLogs = this.currentCombat.turnLogs
      .flatMap(turnLog => turnLog.actions)
      .filter(log => log.type === 'damage' && log.message.includes(player?.name || ''));
    
    const totalDamageDealt = damageDealtLogs.reduce((sum, log) => {
      const match = log.message.match(/(\d+) total damage/);
      return sum + (match ? parseInt(match[1]) : 0);
    }, 0);
    
    const healthLost = player 
      ? (player.characterData?.health?.max || player.health.max) - player.health.current
      : 0;
    
    // Get all enemy names (both defeated and active enemies)
    const allEnemies = this.currentCombat.combatants.filter(c => c.type === 'enemy');
    const enemyNames = allEnemies.map(e => e.name);

    return {
      combatId: `combat_${Date.now()}`,
      duration: 0, // Will be calculated
      victory: this.currentCombat.winner === 'player',
      playerFled: this.currentCombat.winner === 'fled', // Check if player fled
      enemyNames: enemyNames, // Array of all enemy names for easy access
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
        attacksMissed: this.currentCombat.turnLogs
          .flatMap(turnLog => turnLog.actions)
          .filter(log => log.type === 'attack' && log.message.includes('misses')).length
      },
      rewards: this.currentCombat.rewards || {
        experience: 0,
        items: [],
        currency: 0
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

  // Add entry to current turn actions (replaces addTurnAction)
  public addTurnAction(type: CombatLogEntry['type'], message: string, details?: any): void {
    if (!this.currentCombat) return;
    
    const entry: CombatLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      turn: this.currentCombat.currentTurn,
      type,
      message,
      details,
    };
    
    this.currentTurnActions.push(entry);
  }


  // End combat
  public endCombat(): void {
    // Cleanup all combatant animations before ending combat
    if (this.currentCombat) {
      this.currentCombat.combatants.forEach(combatant => {
        combatAnimationService.cleanupCombatantTexts(combatant.id);
      });
    }
    
    // Clear combat state from localStorage
    localStorage.removeItem('current_combat_state');
    
    this.currentCombat = null;
  }

  // Set combat winner as fled (when player runs away)
  public setPlayerFled(): void {
    if (this.currentCombat) {
      this.currentCombat.winner = 'fled';
      this.currentCombat.isActive = false;
    }
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

  // Get all alive players
  public getAlivePlayers(): Combatant[] {
    if (!this.currentCombat) return [];
    return this.currentCombat.combatants.filter(c => c.type === 'player' && c.isAlive);
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

  // Get current turn actions (real-time)
  public getCurrentTurnActions(): CombatLogEntry[] {
    return [...this.currentTurnActions];
  }

  // Execute non-player turn (enemy or ally)
  public async executeNonPlayerTurn(): Promise<void> {
    if (!this.currentCombat || this.currentCombat.isPlayerTurn) return;
    
    const currentCombatant = this.getCurrentCombatant();
    if (!currentCombatant || (currentCombatant.type !== 'enemy' && currentCombatant.type !== 'ally') || !currentCombatant.isAlive) return;
    
    try {
      // Get AI difficulty based on world difficulty or default to medium
      const difficulty = this.getAIDifficulty();
      
      // Decide action using AI service
      const action = await this.decideNonPlayerAction(currentCombatant, difficulty);
      
      // Execute the action
      await this.executeNonPlayerAction(currentCombatant, action);
      
      // End turn after action
      this.endTurn();
      
    } catch (error) {
      console.error('Error executing non-player turn:', error);
      // Fallback to defend action
      this.addTurnAction('status', `${currentCombatant.name} phòng thủ do lỗi AI`);
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

  // Decide non-player action using AI service
  private async decideNonPlayerAction(
    combatant: Combatant,
    difficulty: 'easy' | 'medium' | 'hard'
  ): Promise<CombatAction> {
    const allCombatants = this.currentCombat?.combatants || [];
    
    // Handle ally AI differently
    if (combatant.type === 'ally') {
      return enemyAIService.decideAllyAction(combatant, allCombatants, 'hard', this.currentCombat?.worldDifficulty);
    }
    
    // Handle enemy AI
    // Check if should use AI service for complex decisions
    if (enemyAIService.shouldUseAIService(combatant, difficulty)) {
      try {
        return await enemyAIService.generateAICombatDecision(combatant, allCombatants, {
          turn: this.currentCombat?.currentTurn || 1,
          difficulty: this.currentCombat?.worldDifficulty
        });
      } catch (error) {
        console.error('Error using AI service, falling back to logic AI:', error);
      }
    }
    
    // Use logic-based AI
    return enemyAIService.decideAction(combatant, allCombatants, difficulty, this.currentCombat?.worldDifficulty);
  }

  // Execute non-player action
  private async executeNonPlayerAction(combatant: Combatant, action: CombatAction): Promise<void> {
    // Add delay before enemy action for better visibility
    await new Promise(resolve => setTimeout(resolve, 400));
    
    switch (action.type) {
      case 'attack':
        if (action.targetId && action.attackIndex !== undefined) {
          const target = this.getCombatant(action.targetId);
          if (target && target.isAlive) {
            this.addTurnAction('attack', action.description);
            await this.performAttack(combatant.id, target.id, action.attackIndex);
          }
        }
        break;
        
      case 'defend':
        this.addTurnAction('status', action.description);
        this.defend(combatant.id);
        break;
        
      case 'use_item':
        if (action.itemId && action.targetId) {
          const item = combatant.inventory?.find(i => i.id === action.itemId);
          if (item) {
            this.addTurnAction('heal', action.description);
            this.useItem(combatant.id, item, action.targetId);
          }
        }
        break;
        
      case 'ability':
        if (action.abilityId) {
          this.addTurnAction('status', action.description);
          // Implement ability usage logic here
        }
        break;
        
      default:
        this.addTurnAction('status', action.description);
    }
    
    // Add delay after enemy action for better visibility
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  // Check if it's enemy turn and execute AI
  public async processEnemyTurn(): Promise<void> {
    if (!this.currentCombat || this.currentCombat.isPlayerTurn) return;
    
    // Add delay for better UX - enemy turns should be visible
    await new Promise(resolve => setTimeout(resolve, 800));
    
    await this.executeNonPlayerTurn();
    
    // Add delay after enemy action for better visibility
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check if combat ended after enemy action
    if (this.currentCombat) {
      this.checkCombatEnd();
    }
    
    // If it's still an enemy turn after processing, continue processing
    if (this.currentCombat && !this.currentCombat.isPlayerTurn) {
      await this.processEnemyTurn();
    }
  }

  // Animation trigger methods
  public triggerDamageAnimation(combatantId: string, damage: number, _attackerId?: string): void {
    const combatant = this.getCombatant(combatantId);
    if (!combatant) return;

    // Get combatant position for floating text
    const position = this.getCombatantPosition(combatantId);
    
    // Trigger floating damage text (may return null if cooldown active)
    const textId = combatAnimationService.triggerDamageText(
      combatantId,
      damage,
      CombatAnimationType.DAMAGE,
      position
    );

    // Only trigger shake effect if damage text was successfully created
    if (textId) {
      combatAnimationService.triggerCombatantEffect(
        combatantId,
        CombatAnimationType.SHAKE,
        'medium'
      );
    }
  }

  private triggerMissAnimation(defenderId: string, _attackerId?: string): void {
    const defender = this.getCombatant(defenderId);
    if (!defender) return;

    // Get combatant position for floating text
    const position = this.getCombatantPosition(defenderId);
    
    // Trigger floating miss text (may return null if cooldown active)
    const textId = combatAnimationService.triggerDamageText(
      defenderId,
      0,
      CombatAnimationType.MISS,
      position
    );

    // Only trigger flash effect if miss text was successfully created
    if (textId) {
      combatAnimationService.triggerCombatantEffect(
        defenderId,
        CombatAnimationType.FLASH,
        'low'
      );
    }
  }

  public triggerHealAnimation(combatantId: string, healAmount: number): void {
    const combatant = this.getCombatant(combatantId);
    if (!combatant) return;

    // Get combatant position for floating text
    const position = this.getCombatantPosition(combatantId);
    
    // Trigger floating heal text
    combatAnimationService.triggerDamageText(
      combatantId,
      healAmount,
      CombatAnimationType.HEAL,
      position
    );
  }

  private triggerDefendAnimation(combatantId: string): void {
    combatAnimationService.triggerCombatantEffect(
      combatantId,
      CombatAnimationType.HIGHLIGHT,
      'medium'
    );
  }

  private triggerDeathAnimation(combatantId: string): void {
    combatAnimationService.triggerCombatantEffect(
      combatantId,
      CombatAnimationType.PULSE,
      'high'
    );
  }

  // Get combatant position for floating text with multi-combatant support
  public getCombatantPosition(combatantId: string): { x: number; y: number } {
    // Try to find the combatant card DOM element
    const combatantCard = document.querySelector(`[data-combatant-id="${combatantId}"]`);
    
    if (combatantCard) {
      const rect = combatantCard.getBoundingClientRect();
      const position = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
      
      // Adjust position to avoid overlap with other floating texts
      return this.adjustPositionForCollision(position, combatantId);
    }

    // Fallback: try to find by combatant name
    const combatant = this.getCombatant(combatantId);
    if (combatant) {
      const nameElement = Array.from(document.querySelectorAll('h3')).find(
        el => el.textContent?.includes(combatant.name)
      );
      
      if (nameElement) {
        const cardElement = nameElement.closest('[class*="bg-gray-800"]');
        if (cardElement) {
          const rect = cardElement.getBoundingClientRect();
          const position = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
          };
          return this.adjustPositionForCollision(position, combatantId);
        }
      }
    }

    // Final fallback: distribute positions for multiple combatants
    return this.getFallbackPosition(combatantId);
  }

  // Adjust position to avoid collision with other floating texts
  private adjustPositionForCollision(position: { x: number; y: number }, combatantId: string): { x: number; y: number } {
    const activeTexts = this.getActiveFloatingTexts();
    const minDistance = 60; // Minimum distance between floating texts
    
    let adjustedPosition = { ...position };
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      let hasCollision = false;
      
      for (const activeText of activeTexts) {
        if (activeText.combatantId === combatantId) continue;
        
        const distance = Math.sqrt(
          Math.pow(adjustedPosition.x - activeText.position.x, 2) + 
          Math.pow(adjustedPosition.y - activeText.position.y, 2)
        );
        
        if (distance < minDistance) {
          hasCollision = true;
          break;
        }
      }
      
      if (!hasCollision) break;
      
      // Adjust position slightly
      const angle = (attempts * 45) * (Math.PI / 180); // Rotate by 45 degrees each attempt
      const offset = minDistance * (attempts + 1) / maxAttempts;
      
      adjustedPosition = {
        x: position.x + Math.cos(angle) * offset,
        y: position.y + Math.sin(angle) * offset
      };
      
      attempts++;
    }
    
    return adjustedPosition;
  }

  // Get fallback position for multiple combatants
  private getFallbackPosition(combatantId: string): { x: number; y: number } {
    const combatant = this.getCombatant(combatantId);
    if (!combatant) {
      return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    }

    // Get all combatants to calculate grid positions
    const allCombatants = this.currentCombat?.combatants || [];
    const playerCombatants = allCombatants.filter(c => c.type === 'player');
    const enemyCombatants = allCombatants.filter(c => c.type === 'enemy');
    
    let combatantIndex = -1;
    let totalCombatants = 0;
    
    if (combatant.type === 'player') {
      combatantIndex = playerCombatants.findIndex(c => c.id === combatantId);
      totalCombatants = playerCombatants.length;
    } else {
      combatantIndex = enemyCombatants.findIndex(c => c.id === combatantId);
      totalCombatants = enemyCombatants.length;
    }
    
    if (combatantIndex === -1) {
      return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    }
    
    // Calculate grid position
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    if (combatant.type === 'player') {
      // Player cards at bottom
      const cardWidth = Math.min(300, screenWidth / Math.max(1, totalCombatants));
      const startX = (screenWidth - (totalCombatants * cardWidth)) / 2;
      return {
        x: startX + (combatantIndex * cardWidth) + cardWidth / 2,
        y: screenHeight - 150
      };
    } else {
      // Enemy cards at top
      const cardWidth = Math.min(300, screenWidth / Math.max(1, totalCombatants));
      const startX = (screenWidth - (totalCombatants * cardWidth)) / 2;
      return {
        x: startX + (combatantIndex * cardWidth) + cardWidth / 2,
        y: 150
      };
    }
  }

  // Get currently active floating texts for collision detection
  private getActiveFloatingTexts(): Array<{ combatantId: string; position: { x: number; y: number } }> {
    const floatingTexts: Array<{ combatantId: string; position: { x: number; y: number } }> = [];
    
    // Find all active floating damage texts
    const activeTextElements = document.querySelectorAll('.combat-damage-text, .combat-heal-text, .combat-miss-text, .combat-critical-text');
    
    activeTextElements.forEach(element => {
      const rect = element.getBoundingClientRect();
      const combatantId = element.getAttribute('data-combatant-id') || 'unknown';
      
      floatingTexts.push({
        combatantId,
        position: {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        }
      });
    });
    
    return floatingTexts;
  }

  // Utility delay method
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get current turn state
  public getTurnState(): CombatTurnState | undefined {
    return this.currentCombat?.turnState;
  }

  // Check if player can end turn (must have used main action)
  public canEndTurn(): boolean {
    if (!this.currentCombat?.turnState) return false;
    return this.currentCombat.turnState.mainActionUsed;
  }

  // Scale loot by difficulty rating
  private scaleLootByDifficulty(
    loot: InventoryItem[], 
    difficulty: 'easy' | 'medium' | 'hard' | 'extreme',
    multiplier: number
  ): InventoryItem[] {
    if (difficulty === 'easy' || multiplier <= 1.0) {
      return loot;
    }

    const scaledLoot: InventoryItem[] = [];
    
    // Add original loot
    scaledLoot.push(...loot);
    
    // Add bonus loot based on difficulty
    const bonusChance = Math.min((multiplier - 1) * 0.3, 0.6); // Max 60% chance for bonus loot
    
    loot.forEach(item => {
      if (Math.random() < bonusChance) {
        // Create enhanced version of the item
        const enhancedItem: InventoryItem = {
          ...item,
          id: `${item.id}_enhanced_${Date.now()}`,
          name: `Enhanced ${item.name}`,
          description: `${item.description} (Enhanced by ${difficulty.toUpperCase()} difficulty)`,
          // Scale item stats based on difficulty
          attackBonus: item.attackBonus ? Math.floor(item.attackBonus * (1 + (multiplier - 1) * 0.3)) : undefined,
          armorClass: item.armorClass ? Math.floor(item.armorClass * (1 + (multiplier - 1) * 0.2)) : undefined
        };
        scaledLoot.push(enhancedItem);
      }
    });
    
    return scaledLoot;
  }


  // Process status effects for a specific combatant
  private processCombatantStatusEffects(combatant: Combatant): void {
    if (!combatant.isAlive) return;
    
    // Process regular status effects
    effectProcessingService.processStatusEffects(combatant);
    
    // Check if combatant died from status effects
    if (combatant.health.current <= 0) {
      combatant.isAlive = false;
      this.addTurnAction('death', `${combatant.name} is defeated!`);
      
      // Trigger death animation
      this.triggerDeathAnimation(combatant.id);
      
      // Check if combat ends after death
      this.checkCombatEnd();
    }
    
    // Handle defend effect specifically - it only lasts 1 turn
    const defendEffect = combatant.statusEffects.find(effect => effect.name === 'Phòng Thủ');
    if (defendEffect && defendEffect.duration <= 0) {
      // Remove defend effect and reset defending state
      combatant.statusEffects = combatant.statusEffects.filter(effect => effect.name !== 'Phòng Thủ');
      combatant.isDefending = false;
    }
    
    // Update temporary player stats if this is the player
    if (combatant.id === 'player') {
      this.updateTemporaryPlayerStats();
    }
  }

  // Add enemy to current combat (for testing)
  public addEnemyToCombat(enemy: Enemy): void {
    if (!this.currentCombat) return;
    
    // Convert enemy to combatant
    const enemyCombatant: Combatant = {
      id: `enemy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: enemy.name,
      type: 'enemy',
      level: enemy.level,
      combatLevel: enemy.combatLevel,
      characterLevel: enemy.characterLevel,
      stats: enemy.stats,
      health: { current: enemy.health.current, max: enemy.health.max },
      armorClass: enemy.armorClass,
      attacks: enemy.attacks,
      abilities: enemy.abilities,
      initiative: Math.floor(Math.random() * 20) + 1, // Random initiative
      isAlive: true,
      statusEffects: [],
      isDefending: false,
      equippedArmor: enemy.equippedArmor,
      inventory: effectProcessingService.generateEnemyConsumables(
        enemy.combatLevel || enemy.level || 1,
        this.currentCombat.worldDifficulty === 'easy' ? 'easy' : this.currentCombat.worldDifficulty === 'hard' ? 'hard' : 'medium'
      ),
      enemyData: enemy
    };
    
    // Add to combatants array
    this.currentCombat.combatants.push(enemyCombatant);
    
    // Add to turn order (insert after player)
    const playerIndex = this.currentCombat.turnOrder.indexOf('player');
    if (playerIndex !== -1) {
      this.currentCombat.turnOrder.splice(playerIndex + 1, 0, enemyCombatant.id);
    } else {
      this.currentCombat.turnOrder.push(enemyCombatant.id);
    }
    
    console.log(`Added enemy ${enemy.name} to combat`);
  }

  // Save combat state to localStorage
  public saveCombatState(): void {
    if (!this.currentCombat) return;
    
    const combatData = {
      combatants: this.currentCombat.combatants,
      turnOrder: this.currentCombat.turnOrder,
      currentCombatantIndex: this.currentCombat.currentCombatantIndex,
      currentTurn: this.currentCombat.currentTurn,
      isPlayerTurn: this.currentCombat.isPlayerTurn,
      isActive: this.currentCombat.isActive,
      worldDifficulty: this.currentCombat.worldDifficulty,
      playerInventory: this.currentCombat.playerInventory,
      turnState: this.currentCombat.turnState,
      lastAttackKey: this.currentCombat.lastAttackKey,
      turnLogs: this.currentCombat.turnLogs,
      rewards: this.currentCombat.rewards,
      temporaryPlayerStats: this.currentCombat.temporaryPlayerStats,
    };
    
    localStorage.setItem('current_combat_state', JSON.stringify(combatData));
  }

  // Restore combat state from localStorage
  public restoreCombatState(combatData: any): void {
    this.currentCombat = {
      combatants: combatData.combatants || [],
      turnOrder: combatData.turnOrder || [],
      currentCombatantIndex: combatData.currentCombatantIndex || 0,
      currentTurn: combatData.currentTurn || 1,
      isPlayerTurn: combatData.isPlayerTurn || false,
      isActive: combatData.isActive || true,
      worldDifficulty: combatData.worldDifficulty || 'medium',
      playerInventory: combatData.playerInventory || [],
      turnState: combatData.turnState || {
        hasPerformedAction: false,
        canEndTurn: false,
        mainActionUsed: false,
        extraActionUsed: false,
      },
      lastAttackKey: combatData.lastAttackKey,
      turnLogs: combatData.turnLogs || [],
      rewards: combatData.rewards || null,
      temporaryPlayerStats: combatData.temporaryPlayerStats || null
    };
    
    // Update current turn tracking
    this.currentTurnActions = [];
    this.currentTurnCombatant = this.currentCombat?.turnOrder[this.currentCombat.currentCombatantIndex] || null;
  }

  /**
   * Process elemental saving throw for elemental damage attacks
   */
  private async processElementalSavingThrow(attacker: Combatant, defender: Combatant, attack: any): Promise<void> {
    // Check if this is an elemental damage type
    if (!elementalDamageService.isElementalDamageType(attack.damageType)) {
      return;
    }

    // Get weapon info for DC calculation
    let weapon: any = null;
    if (attacker.characterData?.equipment?.weapon) {
      weapon = attacker.characterData.equipment.weapon;
    } else if (attacker.inventory) {
      // For enemies/NPCs, find weapon in inventory
      weapon = attacker.inventory.find(item => item.type === 'weapon' && item.isEquipped);
    }

    // Process saving throw
    const saveResult = elementalDamageService.processSavingThrow(attacker, defender, weapon, attack);
    
    // Log saving throw result
    const saveText = `${defender.name} ${saveResult.ability} saving throw: ${saveResult.roll} vs DC ${saveResult.dc} → ${saveResult.success ? 'SUCCESS' : 'FAILURE'}`;
    this.addTurnAction('status', saveText);

    // If saving throw failed, apply elemental debuff
    if (!saveResult.success) {
      const rarity = weapon?.rarity || 'common';
      const debuff = elementalDamageService.createElementalDebuff(attack.damageType, rarity, attacker.name);
      
      // Apply debuff to defender
      defender.statusEffects.push(debuff);
      
      // Log debuff application
      this.addTurnAction('status', `${defender.name} bị ${debuff.name}! ${debuff.description}`);
      
      // Add delay for visual feedback
      if (attacker.id === 'player') {
        await this.delay(300);
      }
    }
  }

}

// Export singleton instance
export const combatService = CombatService.getInstance();

