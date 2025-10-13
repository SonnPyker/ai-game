import { StatusEffect, Combatant } from './combatService';
import { InventoryItem } from '../types';
import { consumableDatabase } from './consumableDatabase';
import { DiceRoller } from '../utils/diceRoller';

interface ParsedEffect {
  type: string; // stat_buff, damage_buff, heal, debuff
  target: string; // strength, ac, poison, etc
  value: string; // +2, 2d4, etc
  duration: string; // 5turns, instant, etc
}

class EffectProcessingService {
  private static instance: EffectProcessingService;

  private constructor() {}

  public static getInstance(): EffectProcessingService {
    if (!EffectProcessingService.instance) {
      EffectProcessingService.instance = new EffectProcessingService();
    }
    return EffectProcessingService.instance;
  }

  /**
   * Parse effect string using standardized format
   * Format: effectType:target:value:duration
   * Examples:
   * - "stat_buff:strength:+2:5turns"
   * - "stat_buff:ac:+3:5turns"
   * - "damage_buff:+2d4:5turns"
   * - "heal:2d4:+3:instant"
   * - "debuff:poison:2:3turns"
   */
  private parseEffectString(effectString: string): ParsedEffect | null {
    const parts = effectString.split(':');
    if (parts.length < 3) return null;
    
    const type = parts[0];
    
    // Handle different formats based on effect type
    switch (type) {
      case 'damage_buff':
        // Format: damage_buff:value:duration
        return {
          type: parts[0],
          target: '', // No target for damage_buff
          value: parts[1], // +1d4
          duration: parts[2] || 'instant' // 3turns
        };
      case 'heal':
        // Format: heal:value:bonus:duration
        return {
          type: parts[0],
          target: '', // No target for heal
          value: parts[1], // 1d4
          duration: parts[3] || 'instant' // instant
        };
      case 'stat_buff':
      case 'debuff':
        // Format: type:target:value:duration
        return {
          type: parts[0],
          target: parts[1], // strength, ac, poison, etc
          value: parts[2], // +2, 2, etc
          duration: parts[3] || 'instant'
        };
      default:
        // Fallback to 4-part format
        return {
          type: parts[0],
          target: parts[1],
          value: parts[2],
          duration: parts[3] || 'instant'
        };
    }
  }

  /**
   * Apply consumable effect to combatant
   */
  public applyConsumableEffect(combatant: Combatant, item: InventoryItem, targetId?: string, allCombatants?: Combatant[]): StatusEffect[] {
    console.log('applyConsumableEffect called:', { combatant: combatant.name, item: item.name, effect: item.stats?.effect });
    const effects: StatusEffect[] = [];
    
    if (!item.stats?.effect) {
      console.log('No effect found on item');
      return effects;
    }

    const effectString = item.stats.effect;
    console.log('Effect string:', effectString);
    
    // Try new format first
    const parsedEffect = this.parseEffectString(effectString);
    if (parsedEffect) {
      console.log('Using new format, parsed effect:', parsedEffect);
      return this.applyParsedEffect(parsedEffect, combatant, targetId, allCombatants);
    }
    
    // Fallback to old format for backward compatibility
    console.log('Using legacy format');
    return this.applyLegacyEffect(effectString, combatant, targetId, allCombatants);
  }

  /**
   * Apply parsed effect using new format
   */
  private applyParsedEffect(parsedEffect: ParsedEffect, combatant: Combatant, targetId?: string, allCombatants?: Combatant[]): StatusEffect[] {
    const effects: StatusEffect[] = [];
    
    // Determine target: if targetId provided and it's a debuff, apply to target; otherwise apply to user
    const isDebuff = parsedEffect.type === 'debuff';
    const shouldTargetEnemy = isDebuff && targetId && allCombatants;
    
    const targetCombatant = shouldTargetEnemy 
      ? allCombatants.find(c => c.id === targetId) || combatant
      : combatant;
    
    switch (parsedEffect.type) {
      case 'heal':
        const healEffect = this.createHealEffect(parsedEffect);
        if (healEffect) {
          this.applyHealing(targetCombatant, healEffect);
          // Add to effects array for tracking (even though it's instant)
          effects.push(healEffect);
        }
        break;
        
      case 'stat_buff':
        const statEffect = this.createStatBuffEffect(parsedEffect);
        if (statEffect) {
          targetCombatant.statusEffects.push(statEffect);
          effects.push(statEffect);
        }
        break;
        
      case 'damage_buff':
        const damageEffect = this.createDamageBuffEffect(parsedEffect);
        if (damageEffect) {
          targetCombatant.statusEffects.push(damageEffect);
          effects.push(damageEffect);
        }
        break;
        
      case 'debuff':
        const debuffEffect = this.createDebuffEffect(parsedEffect);
        if (debuffEffect) {
          targetCombatant.statusEffects.push(debuffEffect);
          effects.push(debuffEffect);
        }
        break;
        
      case 'cure':
        const cureEffect = this.createCureEffect(parsedEffect);
        if (cureEffect) {
          this.applyCureEffect(targetCombatant, cureEffect);
          effects.push(cureEffect);
        }
        break;
    }
    
    return effects;
  }

  /**
   * Apply legacy effect format for backward compatibility
   */
  private applyLegacyEffect(effectString: string, combatant: Combatant, targetId?: string, allCombatants?: Combatant[]): StatusEffect[] {
    const effects: StatusEffect[] = [];
    
    // Determine target: if targetId provided and it's a debuff, apply to target; otherwise apply to user
    const isDebuff = effectString.startsWith('poison_') || effectString.startsWith('weakness_') || effectString.startsWith('slow_');
    const isDamage = false; // item.damage removed for new format
    const shouldTargetEnemy = (isDebuff || isDamage) && targetId && allCombatants;
    
    const targetCombatant = shouldTargetEnemy 
      ? allCombatants.find(c => c.id === targetId) || combatant
      : combatant;
    
    // Parse and apply different effect types
    if (effectString.startsWith('heal_')) {
      const healEffect = this.parseHealEffect(effectString);
      if (healEffect) {
        this.applyHealing(targetCombatant, healEffect);
        // Don't add healing effects to statusEffects - they are instant
        // effects.push(healEffect);
      }
    } else if (effectString.startsWith('damage_buff_')) {
      const buffEffect = this.parseDamageBuffEffect(effectString);
      if (buffEffect) {
        targetCombatant.statusEffects.push(buffEffect);
        effects.push(buffEffect);
      }
    } else if (effectString.startsWith('ac_buff_')) {
      const buffEffect = this.parseACBuffEffect(effectString);
      if (buffEffect) {
        targetCombatant.statusEffects.push(buffEffect);
        effects.push(buffEffect);
      }
    } else if (effectString.includes('_plus_') && effectString.includes('_1hour')) {
      const statEffect = this.parseStatBuffEffect(effectString);
      if (statEffect) {
        targetCombatant.statusEffects.push(statEffect);
        effects.push(statEffect);
      }
    } else if (effectString.startsWith('poison_') || effectString.startsWith('weakness_') || effectString.startsWith('slow_')) {
      const debuffEffect = this.parseDebuffEffect(effectString);
      if (debuffEffect) {
        targetCombatant.statusEffects.push(debuffEffect);
        effects.push(debuffEffect);
      }
    } else if (effectString.startsWith('cure_')) {
      const cureEffect = this.parseCureEffect(effectString);
      if (cureEffect) {
        this.applyCureEffect(targetCombatant, cureEffect);
        effects.push(cureEffect);
      }
    }

    return effects;
  }

  /**
   * Create heal effect from parsed effect
   */
  private createHealEffect(parsedEffect: ParsedEffect): StatusEffect | null {
    if (parsedEffect.type !== 'heal') return null;
    
    // Parse dice notation (e.g., "2d4+3")
    const diceMatch = parsedEffect.value.match(/(\d+)d(\d+)(?:\+(\d+))?/);
    if (!diceMatch) return null;
    
    const diceCount = parseInt(diceMatch[1]);
    const diceSize = parseInt(diceMatch[2]);
    const bonus = parseInt(diceMatch[3]) || 0;
    
    const healAmount = DiceRoller.roll(`${diceCount}d${diceSize}+${bonus}`, 'Healing potion').total;
    console.log(`createHealEffect: ${diceCount}d${diceSize}+${bonus} = ${healAmount} HP`);

    return {
      id: this.generateEffectId(),
      name: 'Hồi máu',
      description: `Hồi phục ${healAmount} HP`,
      duration: 0, // Instant
      icon: '💚',
      effects: {
        healthModifier: healAmount
      }
    };
  }

  /**
   * Create stat buff effect from parsed effect
   */
  private createStatBuffEffect(parsedEffect: ParsedEffect): StatusEffect | null {
    if (parsedEffect.type !== 'stat_buff') return null;
    
    const statType = parsedEffect.target;
    const valueMatch = parsedEffect.value.match(/^\+?(\d+)$/);
    if (!valueMatch) return null;
    
    const bonus = parseInt(valueMatch[1]);
    const duration = this.parseDuration(parsedEffect.duration);

    const statNames: { [key: string]: string } = {
      'strength': 'Sức mạnh',
      'agility': 'Nhanh nhẹn',
      'constitution': 'Thể chất',
      'intelligence': 'Trí tuệ',
      'wisdom': 'Khôn ngoan',
      'charisma': 'Sức hút',
      'ac': 'Phòng thủ'
    };

    const effect: StatusEffect = {
      id: this.generateEffectId(),
      name: `Tăng ${statNames[statType] || statType}`,
      description: `+${bonus} ${statNames[statType] || statType} trong ${duration} lượt`,
      duration,
      icon: this.getStatIcon(statType),
      effects: {}
    };

    if (statType === 'ac') {
      effect.effects.armorClassModifier = bonus;
    } else {
      effect.effects.statModifiers = { [statType]: bonus };
    }

    return effect;
  }

  /**
   * Create damage buff effect from parsed effect
   */
  private createDamageBuffEffect(parsedEffect: ParsedEffect): StatusEffect | null {
    if (parsedEffect.type !== 'damage_buff') return null;
    
    let damageValue = parsedEffect.value;
    // Remove leading + if present, as it will be added when combining damage
    if (damageValue.startsWith('+')) {
      damageValue = damageValue.substring(1);
    }
    
    const duration = this.parseDuration(parsedEffect.duration);

    return {
      id: this.generateEffectId(),
      name: 'Tăng sát thương',
      description: `+${damageValue} sát thương trong ${duration} lượt`,
      duration,
      icon: '⚔️',
      effects: {
        damageModifier: damageValue // Store without + (e.g., "1d4")
      }
    };
  }

  /**
   * Create debuff effect from parsed effect
   */
  private createDebuffEffect(parsedEffect: ParsedEffect): StatusEffect | null {
    if (parsedEffect.type !== 'debuff') return null;
    
    const debuffType = parsedEffect.target;
    const value = parseInt(parsedEffect.value);
    const duration = this.parseDuration(parsedEffect.duration);

    const debuffNames: { [key: string]: string } = {
      'poison': 'Độc',
      'weakness': 'Yếu đuối',
      'slow': 'Chậm chạp'
    };

    return {
      id: this.generateEffectId(),
      name: debuffNames[debuffType] || debuffType,
      description: `${debuffType} gây ${value} damage/turn trong ${duration} lượt`,
      duration,
      icon: this.getDebuffIcon(debuffType),
      effects: {
        healthModifier: -value
      }
    };
  }

  /**
   * Create cure effect from parsed effect
   */
  private createCureEffect(parsedEffect: ParsedEffect): StatusEffect | null {
    if (parsedEffect.type !== 'cure') return null;
    
    const cureType = parsedEffect.target;

    const cureNames: { [key: string]: string } = {
      'poison': 'Giải độc',
      'all': 'Thanh tẩy toàn bộ'
    };

    return {
      id: this.generateEffectId(),
      name: cureNames[cureType] || 'Chữa trị',
      description: `Loại bỏ hiệu ứng ${cureType === 'all' ? 'tiêu cực' : cureType}`,
      duration: 0, // Instant
      icon: '✨',
      effects: {}
    };
  }

  /**
   * Parse duration string to number of turns
   */
  private parseDuration(duration: string): number {
    if (duration === 'instant') return 0;
    
    const match = duration.match(/(\d+)turns?/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * Get icon for stat type
   */
  private getStatIcon(statType: string): string {
    const icons: { [key: string]: string } = {
      'strength': '💪',
      'agility': '🏃',
      'constitution': '❤️',
      'intelligence': '🧠',
      'wisdom': '👁️',
      'charisma': '✨',
      'ac': '🛡️'
    };
    return icons[statType] || '📈';
  }

  /**
   * Get icon for debuff type
   */
  private getDebuffIcon(debuffType: string): string {
    const icons: { [key: string]: string } = {
      'poison': '☠️',
      'weakness': '😵',
      'slow': '🐌'
    };
    return icons[debuffType] || '⚠️';
  }

  /**
   * Parse heal effect from string
   */
  private parseHealEffect(effectString: string): StatusEffect | null {
    const healMatch = effectString.match(/heal_(\d+)d(\d+)_plus_(\d+)/);
    if (!healMatch) return null;

    const diceCount = parseInt(healMatch[1]);
    const diceSize = parseInt(healMatch[2]);
    const bonus = parseInt(healMatch[3]);
    
    const healAmount = DiceRoller.roll(`${diceCount}d${diceSize}+${bonus}`, 'Healing potion').total;

    return {
      id: this.generateEffectId(),
      name: 'Hồi máu',
      description: `Hồi phục ${healAmount} HP`,
      duration: 0, // Instant
      icon: '💚',
      effects: {
        healthModifier: healAmount
      }
    };
  }

  /**
   * Parse damage buff effect from string
   */
  private parseDamageBuffEffect(effectString: string): StatusEffect | null {
    const buffMatch = effectString.match(/damage_buff_(\d+)d(\d+)_(\d+)turns/);
    if (!buffMatch) return null;

    const diceCount = parseInt(buffMatch[1]);
    const diceSize = parseInt(buffMatch[2]);
    const duration = parseInt(buffMatch[3]);
    
    const buffAmount = DiceRoller.roll(`${diceCount}d${diceSize}`, 'Damage buff').total;

    return {
      id: this.generateEffectId(),
      name: 'Tăng sát thương',
      description: `+${buffAmount} sát thương trong ${duration} turn`,
      duration,
      icon: '⚔️',
      effects: {
        damageModifier: buffAmount.toString()
      }
    };
  }

  /**
   * Parse AC buff effect from string
   */
  private parseACBuffEffect(effectString: string): StatusEffect | null {
    const buffMatch = effectString.match(/ac_buff_(\d+)_(\d+)turns/);
    if (!buffMatch) return null;

    const acBonus = parseInt(buffMatch[1]);
    const duration = parseInt(buffMatch[2]);

    return {
      id: this.generateEffectId(),
      name: 'Tăng phòng thủ',
      description: `+${acBonus} AC trong ${duration} turn`,
      duration,
      icon: '🛡️',
      effects: {
        armorClassModifier: acBonus
      }
    };
  }

  /**
   * Parse stat buff effect from string
   */
  private parseStatBuffEffect(effectString: string): StatusEffect | null {
    const statMatch = effectString.match(/(\w+)_plus_(\d+)_1hour/);
    if (!statMatch) return null;

    const statType = statMatch[1];
    const bonus = parseInt(statMatch[2]);
    const duration = 5; // 5 turns for combat (much shorter than 1 hour)

    const statNames: { [key: string]: string } = {
      'strength': 'Sức mạnh',
      'agility': 'Nhanh nhẹn',
      'constitution': 'Thể chất',
      'intelligence': 'Trí tuệ',
      'wisdom': 'Khôn ngoan',
      'charisma': 'Sức hút'
    };

    return {
      id: this.generateEffectId(),
      name: `Tăng ${statNames[statType] || statType}`,
      description: `+${bonus} ${statNames[statType] || statType} trong ${duration} lượt`,
      duration,
      icon: this.getStatIcon(statType),
      effects: {
        statModifiers: { [statType]: bonus }
      }
    };
  }

  /**
   * Parse debuff effect from string
   */
  private parseDebuffEffect(effectString: string): StatusEffect | null {
    if (effectString.startsWith('poison_damage_')) {
      const poisonMatch = effectString.match(/poison_damage_(\d+)d(\d+)_(\d+)turns/);
      if (!poisonMatch) return null;

      const diceCount = parseInt(poisonMatch[1]);
      const diceSize = parseInt(poisonMatch[2]);
      const duration = parseInt(poisonMatch[3]);
      
      const poisonDamage = DiceRoller.roll(`${diceCount}d${diceSize}`, 'Poison damage').total;

      return {
        id: this.generateEffectId(),
        name: 'Độc tố',
        description: `${poisonDamage} sát thương độc mỗi turn trong ${duration} turn`,
        duration,
        icon: '☠️',
        effects: {
          healthModifier: -poisonDamage
        }
      };
    } else if (effectString.startsWith('weakness_debuff_')) {
      const weaknessMatch = effectString.match(/weakness_debuff_(\d+)turns/);
      if (!weaknessMatch) return null;

      const duration = parseInt(weaknessMatch[1]);

      return {
        id: this.generateEffectId(),
        name: 'Yếu đuối',
        description: `Giảm sát thương trong ${duration} turn`,
        duration,
        icon: '😵',
          effects: {
            damageModifier: "-2"
          }
      };
    } else if (effectString.startsWith('slow_debuff_')) {
      const slowMatch = effectString.match(/slow_debuff_(\d+)turns/);
      if (!slowMatch) return null;

      const duration = parseInt(slowMatch[1]);

      return {
        id: this.generateEffectId(),
        name: 'Chậm chạp',
        description: `Giảm tốc độ trong ${duration} turn`,
        duration,
        icon: '🐌',
        effects: {
          statModifiers: { agility: -2 }
        }
      };
    }

    return null;
  }

  /**
   * Parse cure effect from string
   */
  private parseCureEffect(effectString: string): StatusEffect | null {
    if (effectString === 'cure_poison') {
      return {
        id: this.generateEffectId(),
        name: 'Giải độc',
        description: 'Loại bỏ tất cả hiệu ứng độc tố',
        duration: 0,
        icon: '🌿',
        effects: {}
      };
    } else if (effectString === 'cure_all') {
      return {
        id: this.generateEffectId(),
        name: 'Thanh tẩy',
        description: 'Loại bỏ tất cả hiệu ứng tiêu cực',
        duration: 0,
        icon: '✨',
        effects: {}
      };
    }

    return null;
  }

  /**
   * Apply healing to combatant
   */
  private applyHealing(combatant: Combatant, effect: StatusEffect): void {
    const healAmount = effect.effects.healthModifier || 0;
    const oldHP = combatant.health.current;
    combatant.health.current = Math.min(combatant.health.max, combatant.health.current + healAmount);
    console.log(`Healing applied: ${combatant.name} ${oldHP} -> ${combatant.health.current} (+${healAmount})`);
  }

  /**
   * Apply cure effect to combatant
   */
  private applyCureEffect(combatant: Combatant, effect: StatusEffect): void {
    if (effect.name === 'Giải độc') {
      // Remove poison effects
      combatant.statusEffects = combatant.statusEffects.filter(se => 
        !se.name.includes('Độc') && !se.name.includes('Yếu đuối')
      );
    } else if (effect.name === 'Thanh tẩy toàn bộ') {
      // Remove all negative effects
      combatant.statusEffects = combatant.statusEffects.filter(se => 
        !se.name.includes('Độc') && 
        !se.name.includes('Yếu đuối') && 
        !se.name.includes('Chậm chạp')
      );
    }
  }

  /**
   * Process all status effects for a combatant (called at end of turn)
   */
  public processStatusEffects(combatant: Combatant): void {
    combatant.statusEffects.forEach(effect => {
      // Apply ongoing effects
      if (effect.effects.healthModifier && effect.effects.healthModifier < 0) {
        // Damage over time
        combatant.health.current = Math.max(0, combatant.health.current + effect.effects.healthModifier);
      }
    });

    // Decrease duration and remove expired effects
    combatant.statusEffects = combatant.statusEffects
      .map(effect => ({ ...effect, duration: effect.duration - 1 }))
      .filter(effect => effect.duration > 0);
  }


  /**
   * Generate unique effect ID
   */
  private generateEffectId(): string {
    return `effect_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate random consumables for enemy inventory
   */
  public generateEnemyConsumables(level: number, difficulty: 'easy' | 'medium' | 'hard'): InventoryItem[] {
    const consumables: InventoryItem[] = [];
    
    // Determine number of consumables based on difficulty
    const count = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3;
    
    for (let i = 0; i < count; i++) {
      const template = consumableDatabase.getRandomConsumable(level);
      console.log('Generated template:', template);
      if (template) {
        const item = consumableDatabase.createInventoryItem(template, 1);
        console.log('Created item:', item);
        consumables.push(item);
      } else {
        console.log('No template found for level:', level);
      }
    }
    
    return consumables;
  }
}

export const effectProcessingService = EffectProcessingService.getInstance();
