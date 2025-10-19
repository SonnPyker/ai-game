import { Combatant, StatusEffect } from './combatService';
import { InventoryItem } from '../types';
import { DiceRoller } from '../utils/diceRoller';

export interface ElementalDebuffConfig {
  damagePerTurn: number;
  duration: number;
  additionalEffects: {
    armorClassModifier?: number;
    attackModifier?: number;
    damageModifier?: string;
    statModifiers?: { [key: string]: number };
    skipTurnChance?: number; // 0-1, chance to skip turn
  };
}

class ElementalDamageService {
  private static instance: ElementalDamageService;

  private constructor() {}

  public static getInstance(): ElementalDamageService {
    if (!ElementalDamageService.instance) {
      ElementalDamageService.instance = new ElementalDamageService();
    }
    return ElementalDamageService.instance;
  }

  /**
   * Calculate save DC based on weapon rarity
   */
  public calculateSaveDC(rarity: string): number {
    const dcMap: { [key: string]: number } = {
      'common': 11,
      'uncommon': 13,
      'rare': 15,
      'epic': 17,
      'legendary': 19
    };
    
    return dcMap[rarity] || 11; // Default to common DC
  }

  /**
   * Get the appropriate ability modifier for saving throw based on damage type
   */
  public getSavingThrowAbility(damageType: string): keyof Combatant['stats']['modifiers'] {
    switch (damageType) {
      case 'fire':
      case 'poison':
        return 'constitution';
      case 'psychic':
        return 'wisdom';
      case 'lightning':
      case 'cold':
        return 'agility';
      default:
        return 'constitution'; // Default fallback
    }
  }

  /**
   * Process saving throw for elemental damage
   */
  public processSavingThrow(
    _attacker: Combatant,
    defender: Combatant,
    weapon: InventoryItem | null,
    attack: any
  ): { success: boolean; roll: number; dc: number; ability: string } {
    // Determine DC
    let dc = 11; // Default DC
    if (weapon?.saveDC) {
      dc = weapon.saveDC;
    } else if (weapon?.rarity) {
      dc = this.calculateSaveDC(weapon.rarity);
    }

    // Get appropriate ability modifier
    const ability = this.getSavingThrowAbility(attack.damageType);
    const modifier = defender.stats.modifiers[ability];

    // Roll saving throw
    const roll = DiceRoller.savingThrow(modifier, `${defender.name} ${ability} saving throw`);
    
    const success = roll.total >= dc;

    return {
      success,
      roll: roll.total,
      dc,
      ability
    };
  }

  /**
   * Create elemental debuff based on damage type and rarity
   */
  public createElementalDebuff(
    damageType: string,
    rarity: string,
    _attackerName: string
  ): StatusEffect {
    const config = this.getDebuffConfig(damageType, rarity);
    
    const debuffInfo = this.getDebuffInfo(damageType);
    
    return {
      id: `elemental_${damageType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: debuffInfo.name,
      description: `${debuffInfo.description} (${config.damagePerTurn} damage/turn, ${config.duration} turns)`,
      duration: config.duration,
      icon: debuffInfo.icon,
      color: debuffInfo.color,
      effects: {
        damagePerTurn: config.damagePerTurn,
        damageType: damageType,
        ...config.additionalEffects
      }
    };
  }

  /**
   * Get debuff configuration based on damage type and rarity
   */
  private getDebuffConfig(damageType: string, rarity: string): ElementalDebuffConfig {
    const rarityConfig = {
      'common': { damage: 1, duration: 2 },
      'uncommon': { damage: 2, duration: 3 },
      'rare': { damage: 3, duration: 3 },
      'epic': { damage: 4, duration: 4 },
      'legendary': { damage: 5, duration: 4 }
    };

    const config = rarityConfig[rarity as keyof typeof rarityConfig] || rarityConfig['common'];

    switch (damageType) {
      case 'fire':
        return {
          damagePerTurn: config.damage,
          duration: config.duration,
          additionalEffects: {
            armorClassModifier: -1 // Burning reduces AC
          }
        };
      
      case 'cold':
        return {
          damagePerTurn: config.damage,
          duration: config.duration,
          additionalEffects: {
            statModifiers: { agility: -2 }, // Frozen reduces speed
            attackModifier: -1 // Slower attacks
          }
        };
      
      case 'lightning':
        return {
          damagePerTurn: config.damage,
          duration: config.duration,
          additionalEffects: {
            skipTurnChance: 0.2 // 20% chance to skip turn
          }
        };
      
      case 'poison':
        return {
          damagePerTurn: config.damage,
          duration: config.duration,
          additionalEffects: {
            damageModifier: "-1" // Poisoned reduces damage output
          }
        };
      
      case 'psychic':
        return {
          damagePerTurn: config.damage,
          duration: config.duration,
          additionalEffects: {
            statModifiers: { 
              intelligence: -2, 
              wisdom: -2 
            } // Confused reduces mental stats
          }
        };
      
      default:
        return {
          damagePerTurn: config.damage,
          duration: config.duration,
          additionalEffects: {}
        };
    }
  }

  /**
   * Get debuff display information
   */
  private getDebuffInfo(damageType: string): { name: string; description: string; icon: string; color: string } {
    const infoMap: { [key: string]: { name: string; description: string; icon: string; color: string } } = {
      'fire': {
        name: 'Burning',
        description: 'Bị bỏng, gây sát thương liên tục và giảm phòng thủ',
        icon: '🔥',
        color: 'red'
      },
      'cold': {
        name: 'Frozen',
        description: 'Bị đóng băng, gây sát thương liên tục và giảm tốc độ',
        icon: '❄️',
        color: 'blue'
      },
      'lightning': {
        name: 'Shocked',
        description: 'Bị sốc điện, gây sát thương liên tục và có thể bỏ lượt',
        icon: '⚡',
        color: 'yellow'
      },
      'poison': {
        name: 'Poisoned',
        description: 'Bị nhiễm độc, gây sát thương liên tục và giảm sát thương',
        icon: '☠️',
        color: 'green'
      },
      'psychic': {
        name: 'Confused',
        description: 'Bị rối loạn tâm trí, gây sát thương liên tục và giảm trí tuệ',
        icon: '🌀',
        color: 'purple'
      }
    };

    return infoMap[damageType] || {
      name: 'Elemental Effect',
      description: 'Hiệu ứng nguyên tố',
      icon: '✨',
      color: 'gray'
    };
  }

  /**
   * Check if a damage type is elemental
   */
  public isElementalDamageType(damageType: string): boolean {
    const elementalTypes = ['fire', 'cold', 'lightning', 'poison', 'psychic'];
    return elementalTypes.includes(damageType);
  }

  /**
   * Process skip turn chance for shocked effect
   */
  public processSkipTurnChance(combatant: Combatant): boolean {
    const shockedEffect = combatant.statusEffects.find(effect => 
      effect.effects.damageType === 'lightning' && effect.effects.skipTurnChance
    );

    if (!shockedEffect || !shockedEffect.effects.skipTurnChance) {
      return false;
    }

    const roll = Math.random();
    return roll < shockedEffect.effects.skipTurnChance;
  }
}

export const elementalDamageService = ElementalDamageService.getInstance();
