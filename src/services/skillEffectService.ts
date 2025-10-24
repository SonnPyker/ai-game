import { Combatant, StatusEffect } from './combatService';
import { CharacterSkill } from '../types';
import { DiceRoller } from '../utils/diceRoller';
import { combatService } from './combatService';

interface ParsedSkillEffect {
  type: 'instant_damage' | 'instant_heal' | 'defend' | 'stat_buff' | 'stat_debuff';
  value?: string; // dice notation hoặc số
  target: 'self' | 'enemy' | 'all_enemies';
  statType?: string;
  duration?: number;
}

interface SkillEffectResult {
  logType: 'damage' | 'heal' | 'status' | 'info' | 'buff' | 'debuff';
  description: string;
  details?: any;
}

class SkillEffectService {
  private static instance: SkillEffectService;

  public static getInstance(): SkillEffectService {
    if (!SkillEffectService.instance) {
      SkillEffectService.instance = new SkillEffectService();
    }
    return SkillEffectService.instance;
  }

  /**
   * Parse skill effect string into structured data
   */
  public parseSkillEffect(effectString: string): ParsedSkillEffect | null {
    if (!effectString || typeof effectString !== 'string') {
      return null;
    }

    const parts = effectString.split(':');
    if (parts.length < 2) {
      return null;
    }

    const [type, value, target, duration] = parts;
    
    // Handle heal effects with dice notation
    if (type === 'heal' && value.includes('d')) {
      return {
        type: 'instant_heal',
        value: value,
        target: (target as 'self' | 'enemy' | 'all_enemies') || 'self',
        duration: 0
      };
    }
    
    // Handle damage buff effects
    if (type === 'damage_buff') {
      return {
        type: 'stat_buff',
        value: value,
        statType: 'damage',
        target: (target as 'self' | 'enemy' | 'all_enemies') || 'self',
        duration: parseInt(duration) || 3
      };
    }
    
    // Determine default target based on effect type
    let defaultTarget: 'self' | 'enemy' | 'all_enemies' = 'self';
    if (type === 'instant_damage') {
      defaultTarget = 'enemy';
    } else if (type === 'instant_heal' || type === 'defend' || type.includes('stat_')) {
      defaultTarget = 'self';
    }
    
    // Validate target type
    const validTargets: ('self' | 'enemy' | 'all_enemies')[] = ['self', 'enemy', 'all_enemies'];
    const parsedTarget = target as ParsedSkillEffect['target'];
    const finalTarget = target && validTargets.includes(parsedTarget) ? parsedTarget : defaultTarget;
    
    return {
      type: type as ParsedSkillEffect['type'],
      value: value || undefined,
      target: finalTarget,
      statType: type.includes('stat_') ? value?.split('+')[0] : undefined,
      duration: duration ? parseInt(duration.replace('turns', '')) : undefined
    };
  }

  /**
   * Apply skill effects to combatants
   */
  public applySkillEffects(
    caster: Combatant,
    skill: CharacterSkill,
    targetIds: string[],
    allCombatants: Combatant[]
  ): SkillEffectResult[] {
    const results: SkillEffectResult[] = [];
    
    // Debug logging
    
    // Parse all effects
    const parsedEffects = skill.effects.map(effect => {
      const parsed = this.parseSkillEffect(effect);
      return parsed;
    }).filter(Boolean) as ParsedSkillEffect[];
    
    if (parsedEffects.length === 0) {
      return results;
    }

    // Apply each effect
    for (const effect of parsedEffects) {
      const effectResults = this.applySingleEffect(effect, caster, targetIds, allCombatants);
      results.push(...effectResults);
    }

    return results;
  }

  /**
   * Apply a single skill effect
   */
  private applySingleEffect(
    effect: ParsedSkillEffect,
    caster: Combatant,
    targetIds: string[],
    allCombatants: Combatant[]
  ): SkillEffectResult[] {
    const results: SkillEffectResult[] = [];

    switch (effect.type) {
      case 'instant_damage':
        results.push(...this.applyInstantDamage(effect, caster, targetIds, allCombatants));
        break;
      case 'instant_heal':
        results.push(...this.applyInstantHeal(effect, caster, targetIds, allCombatants));
        break;
      case 'defend':
        results.push(...this.applyDefend(effect, caster));
        break;
      case 'stat_buff':
      case 'stat_debuff':
        results.push(...this.applyStatEffect(effect, caster, targetIds, allCombatants));
        break;
    }

    return results;
  }

  /**
   * Apply instant damage effect
   */
  private applyInstantDamage(
    effect: ParsedSkillEffect,
    caster: Combatant,
    targetIds: string[],
    allCombatants: Combatant[]
  ): SkillEffectResult[] {
    const results: SkillEffectResult[] = [];
    
    if (!effect.value) return results;

    // Calculate damage with dice breakdown
    const damageResult = this.calculateDamageWithBreakdown(effect.value);
    const damage = damageResult.total;
    
    // Apply to targets
    const targets = this.getTargets(effect.target, targetIds, allCombatants, caster);
    
    for (const target of targets) {
      if (!target.isAlive) continue;
      
      // Use combatService.applyDamageWithEffects for floating text and proper damage handling
      combatService.applyDamageWithEffects(target.id, damage, caster.id);
      
      // Format damage like attack format
      let damageDescription = '';
      if (damageResult.diceDetails) {
        const diceFormula = damageResult.diceDetails.formula;
        damageDescription = `${caster.name} gây ${damage} sát thương cho ${target.name} (${diceFormula})`;
      } else {
        damageDescription = `${caster.name} gây ${damage} sát thương cho ${target.name} (${damageResult.breakdown})`;
      }
      
      if (target.health.current <= 0) {
        damageDescription += ` (${target.name} đã chết!)`;
      } else {
        damageDescription += ` (${target.health.current}/${target.health.max} HP)`;
      }
      
      results.push({
        logType: 'damage',
        description: damageDescription,
        details: damageResult.diceDetails
      });
    }

    return results;
  }

  /**
   * Apply instant heal effect
   */
  private applyInstantHeal(
    effect: ParsedSkillEffect,
    caster: Combatant,
    targetIds: string[],
    allCombatants: Combatant[]
  ): SkillEffectResult[] {
    const results: SkillEffectResult[] = [];
    
    if (!effect.value) return results;

    // Calculate heal amount with dice details
    const healResult = this.calculateHeal(effect.value);
    const healAmount = healResult.total;
    
    // Apply to targets
    const targets = this.getTargets(effect.target, targetIds, allCombatants, caster);
    
    for (const target of targets) {
      if (!target.isAlive) continue;
      
      const oldHealth = target.health.current;
      target.health.current = Math.min(target.health.max, target.health.current + healAmount);
      const actualHeal = target.health.current - oldHealth;
      
      // Trigger heal animation for floating text
      const position = combatService.getCombatantPosition(target.id);
      if (position) {
        combatService.triggerHealAnimation(target.id, actualHeal);
      }
      
      // Format healing like attack format
      let healDescription = '';
      if (healResult.diceDetails) {
        const diceFormula = healResult.diceDetails.formula;
        healDescription = `${caster.name} hồi phục ${actualHeal} HP cho ${target.name} (${diceFormula}) (${target.health.current}/${target.health.max} HP)`;
      } else {
        healDescription = `${caster.name} hồi phục ${actualHeal} HP cho ${target.name} (${target.health.current}/${target.health.max} HP)`;
      }
      
      results.push({
        logType: 'heal',
        description: healDescription,
        details: healResult.diceDetails
      });
    }

    return results;
  }

  /**
   * Apply defend effect
   */
  private applyDefend(
    _effect: ParsedSkillEffect,
    caster: Combatant
  ): SkillEffectResult[] {
    caster.isDefending = true;
    
    return [{
      logType: 'status',
      description: `${caster.name} tập trung phòng thủ (giảm 50% sát thương nhận vào)`
    }];
  }

  /**
   * Apply stat buff/debuff effect
   */
  private applyStatEffect(
    effect: ParsedSkillEffect,
    caster: Combatant,
    targetIds: string[],
    allCombatants: Combatant[]
  ): SkillEffectResult[] {
    const results: SkillEffectResult[] = [];
    
    if (!effect.statType || !effect.value || !effect.duration) return results;

    // Parse stat value - handle dice notation
    let statValue: number;
    if (effect.value.includes('d')) {
      // For dice notation like +1d4, use the dice count as base value
      const diceMatch = effect.value.match(/\+?(\d+)d\d+/);
      statValue = diceMatch ? parseInt(diceMatch[1]) : 1;
    } else {
      statValue = parseInt(effect.value.replace('+', ''));
    }
    if (isNaN(statValue)) return results;

    // Apply to targets
    const targets = this.getTargets(effect.target, targetIds, allCombatants, caster);
    
    
    for (const target of targets) {
      if (!target.isAlive) continue;
      
      const statusEffect: StatusEffect = {
        id: `skill_${effect.type}_${effect.statType}_${Date.now()}`,
        name: `${effect.type === 'stat_buff' ? 'Tăng' : 'Giảm'} ${effect.statType}`,
        description: `${effect.type === 'stat_buff' ? 'Tăng' : 'Giảm'} ${effect.statType} +${statValue}`,
        duration: effect.duration,
        icon: effect.type === 'stat_buff' ? '⬆️' : '⬇️',
        effects: {
          statModifiers: {
            [effect.statType]: statValue
          }
        }
      };
      
      target.statusEffects.push(statusEffect);
      
      results.push({
        logType: effect.type === 'stat_buff' ? 'buff' : 'debuff',
        description: `${caster.name} ${effect.type === 'stat_buff' ? 'tăng' : 'giảm'} ${effect.statType} +${statValue} cho ${target.name} (${effect.duration} lượt)`
      });
    }

    return results;
  }

  /**
   * Get targets based on effect target type
   */
  private getTargets(
    targetType: 'self' | 'enemy' | 'all_enemies',
    targetIds: string[],
    allCombatants: Combatant[],
    caster: Combatant
  ): Combatant[] {
    switch (targetType) {
      case 'self':
        return [caster];
      case 'enemy':
        return targetIds.map(id => allCombatants.find(c => c.id === id)).filter(Boolean) as Combatant[];
      case 'all_enemies':
        return allCombatants.filter(c => c.id !== caster.id && c.type !== 'player' && c.isAlive);
      default:
        // Log warning for invalid target type
        return [caster];
    }
  }

  /**
   * Calculate damage with dice breakdown for logging
   */
  private calculateDamageWithBreakdown(diceNotation: string): { total: number; breakdown: string; diceDetails?: any } {
    try {
      if (diceNotation.includes('d')) {
        const result = DiceRoller.roll(diceNotation);
        if (typeof result === 'number') {
          return { total: result, breakdown: diceNotation };
        } else {
          // Return dice details for logging
          return { 
            total: result.total, 
            breakdown: diceNotation,
            diceDetails: {
              formula: diceNotation,
              rolls: result.rolls,
              total: result.total,
              bonus: (result as any).bonus || 0
            }
          };
        }
      }
      const value = parseInt(diceNotation) || 0;
      return { total: value, breakdown: diceNotation };
    } catch (error) {
      console.error(`Invalid dice notation for damage: ${diceNotation}`, error);
      // Fallback to simple number if dice notation is invalid
      const numberMatch = diceNotation.match(/(\d+)/);
      const fallbackValue = numberMatch ? parseInt(numberMatch[1]) : 1;
      return { total: fallbackValue, breakdown: `${fallbackValue}` };
    }
  }

  /**
   * Calculate heal amount from dice notation
   */
  private calculateHeal(diceNotation: string): { total: number; diceDetails?: any } {
    try {
      if (diceNotation.includes('d')) {
        const result = DiceRoller.roll(diceNotation);
        if (typeof result === 'number') {
          return { total: result };
        } else {
          return { 
            total: result.total,
            diceDetails: {
              formula: diceNotation,
              rolls: result.rolls,
              total: result.total,
              bonus: (result as any).bonus || 0
            }
          };
        }
      }
      const value = parseInt(diceNotation) || 0;
      return { total: value };
    } catch (error) {
      console.error(`Invalid dice notation for healing: ${diceNotation}`, error);
      // Fallback to simple number if dice notation is invalid
      const numberMatch = diceNotation.match(/(\d+)/);
      const fallbackValue = numberMatch ? parseInt(numberMatch[1]) : 1;
      return { total: fallbackValue };
    }
  }
}

// Singleton instance
export const skillEffectService = SkillEffectService.getInstance();
