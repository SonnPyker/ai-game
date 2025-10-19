import { Character, InventoryItem } from '../types';

interface ParsedAccessoryEffect {
  type: 'stat_buff';
  statType: 'strength' | 'agility' | 'intelligence' | 'constitution' | 'wisdom' | 'charisma';
  value: number;
  duration: 'permanent';
}

class AccessoryEffectService {
  private static instance: AccessoryEffectService;

  private constructor() {}

  public static getInstance(): AccessoryEffectService {
    if (!AccessoryEffectService.instance) {
      AccessoryEffectService.instance = new AccessoryEffectService();
    }
    return AccessoryEffectService.instance;
  }

  /**
   * Parse accessory effect string
   * Format: "stat_buff:strength:+2:permanent"
   */
  public parseAccessoryEffect(effectString: string): ParsedAccessoryEffect | null {
    if (!effectString || typeof effectString !== 'string') {
      return null;
    }

    const parts = effectString.split(':');
    if (parts.length !== 4) {
      console.warn('Invalid accessory effect format:', effectString);
      return null;
    }

    const [type, statType, valueStr, duration] = parts;

    if (type !== 'stat_buff') {
      console.warn('Accessory effects only support stat_buff type:', effectString);
      return null;
    }

    if (duration !== 'permanent') {
      console.warn('Accessory effects must be permanent:', effectString);
      return null;
    }

    const validStats = ['strength', 'agility', 'intelligence', 'constitution', 'wisdom', 'charisma'];
    if (!validStats.includes(statType)) {
      console.warn(`Invalid stat type for accessory effect: ${statType}. Only D&D core stats allowed: ${validStats.join(', ')}`);
      return null;
    }

    // Parse value (remove + sign if present)
    const cleanValueStr = valueStr.replace('+', '');
    const value = parseInt(cleanValueStr, 10);
    
    if (isNaN(value) || value <= 0) {
      console.warn('Invalid value for accessory effect:', valueStr);
      return null;
    }

    return {
      type: 'stat_buff',
      statType: statType as any,
      value,
      duration: 'permanent'
    };
  }

  /**
   * Apply accessory effects to character
   */
  public applyAccessoryEffectsToCharacter(character: Character, item: InventoryItem): boolean {
    if (!character.coreStats || !item.effects || item.effects.length === 0) {
      return false;
    }

    let applied = false;
    const parsedEffects = item.effects.map(effect => this.parseAccessoryEffect(effect)).filter(Boolean) as ParsedAccessoryEffect[];

    for (const effect of parsedEffects) {
      if (this.applySingleEffect(character, effect)) {
        applied = true;
      }
    }

    if (applied) {
      // Recalculate modifiers after stat changes
      this.recalculateModifiers(character);
      
      // Recalculate HP if constitution changed
      if (parsedEffects.some(e => e.statType === 'constitution') && character.health) {
        this.recalculateHPFromConstitution(character);
      }
    }

    return applied;
  }

  /**
   * Remove accessory effects from character
   */
  public removeAccessoryEffectsFromCharacter(character: Character, item: InventoryItem): boolean {
    if (!character.coreStats || !item.effects || item.effects.length === 0) {
      return false;
    }

    let removed = false;
    const parsedEffects = item.effects.map(effect => this.parseAccessoryEffect(effect)).filter(Boolean) as ParsedAccessoryEffect[];

    for (const effect of parsedEffects) {
      if (this.removeSingleEffect(character, effect)) {
        removed = true;
      }
    }

    if (removed) {
      // Recalculate modifiers after stat changes
      this.recalculateModifiers(character);
      
      // Recalculate HP if constitution changed
      if (parsedEffects.some(e => e.statType === 'constitution') && character.health) {
        this.recalculateHPFromConstitution(character);
      }
    }

    return removed;
  }

  /**
   * Apply a single accessory effect
   */
  private applySingleEffect(character: Character, effect: ParsedAccessoryEffect): boolean {
    if (!character.coreStats) return false;

    const currentValue = character.coreStats[effect.statType] || 0;
    character.coreStats[effect.statType] = currentValue + effect.value;
    
    console.log(`✅ Applied accessory effect: +${effect.value} ${effect.statType}`);
    return true;
  }

  /**
   * Remove a single accessory effect
   */
  private removeSingleEffect(character: Character, effect: ParsedAccessoryEffect): boolean {
    if (!character.coreStats) return false;

    const currentValue = character.coreStats[effect.statType] || 0;
    character.coreStats[effect.statType] = Math.max(0, currentValue - effect.value);
    
    console.log(`❌ Removed accessory effect: -${effect.value} ${effect.statType}`);
    return true;
  }

  /**
   * Recalculate modifiers based on new stats
   */
  private recalculateModifiers(character: Character): void {
    if (!character.coreStats) return;

    const baseStats = character.coreStats;
    character.coreStats.modifiers = {
      strength: Math.floor((baseStats.strength - 10) / 2),
      agility: Math.floor((baseStats.agility - 10) / 2),
      intelligence: Math.floor((baseStats.intelligence - 10) / 2),
      constitution: Math.floor((baseStats.constitution - 10) / 2),
      wisdom: Math.floor((baseStats.wisdom - 10) / 2),
      charisma: Math.floor((baseStats.charisma - 10) / 2)
    };
  }

  /**
   * Recalculate HP based on new constitution
   */
  private recalculateHPFromConstitution(character: Character): void {
    if (!character.health || !character.coreStats) return;

    // Lưu HP cũ để tính tỷ lệ
    const oldMaxHp = character.health.max;
    const oldCurrentHp = character.health.current;
    const hpRatio = oldCurrentHp / oldMaxHp;

    // Tính HP mới dựa trên constitution modifier
    const constitutionModifier = character.coreStats.modifiers?.constitution || 0;
    const newMaxHp = Math.max(1, 10 + constitutionModifier); // Base HP + constitution modifier
    
    character.health.max = newMaxHp;
    character.health.current = Math.floor(newMaxHp * hpRatio);
    
    console.log(`🔄 Recalculated HP: ${oldMaxHp} -> ${newMaxHp} (constitution modifier: ${constitutionModifier})`);
  }

  /**
   * Get formatted effects description for UI
   */
  public getFormattedEffects(item: InventoryItem): string[] {
    if (!item.effects || item.effects.length === 0) {
      return [];
    }

    return item.effects.map(effect => {
      const parsed = this.parseAccessoryEffect(effect);
      if (!parsed) return effect;

      const statName = this.getStatDisplayName(parsed.statType);
      return `+${parsed.value} ${statName}`;
    });
  }

  /**
   * Get display name for stat
   */
  private getStatDisplayName(statType: string): string {
    const statNames: { [key: string]: string } = {
      strength: 'Sức Mạnh',
      agility: 'Nhanh Nhẹn',
      intelligence: 'Trí Tuệ',
      constitution: 'Thể Lực',
      wisdom: 'Khôn Ngoan',
      charisma: 'Sức Hút'
    };
    return statNames[statType] || statType;
  }

  /**
   * Validate accessory effects
   */
  public validateAccessoryEffects(item: InventoryItem): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!item.effects || item.effects.length === 0) {
      errors.push('Accessory must have effects array');
      return { isValid: false, errors };
    }

    for (const effect of item.effects) {
      const parsed = this.parseAccessoryEffect(effect);
      if (!parsed) {
        errors.push(`Invalid effect format: ${effect}`);
      }
    }

    return { isValid: errors.length === 0, errors };
  }
}

// Export singleton instance
export const accessoryEffectService = AccessoryEffectService.getInstance();
