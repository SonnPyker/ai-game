import { InventoryItem } from '../types';

export interface ConsumableEffect {
  type: 'heal' | 'damage_buff' | 'ac_buff' | 'stat_buff' | 'debuff' | 'cure';
  value: number;
  duration?: number; // số turn, undefined = instant
  statType?: 'strength' | 'agility' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma';
  target?: 'self' | 'enemy';
}

export interface ConsumableTemplate {
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  effect: string; // Format: "heal_2d4_plus_2", "damage_buff_1d6_3turns", etc.
  effects: ConsumableEffect[];
  level: number;
  tags: string[];
}

class ConsumableDatabase {
  private static instance: ConsumableDatabase;
  private consumables: ConsumableTemplate[] = [];

  private constructor() {
    this.initializeConsumables();
  }

  public static getInstance(): ConsumableDatabase {
    if (!ConsumableDatabase.instance) {
      ConsumableDatabase.instance = new ConsumableDatabase();
    }
    return ConsumableDatabase.instance;
  }

  /**
   * Initialize all consumable templates
   */
  private initializeConsumables(): void {
    this.consumables = [
      // HEALING POTIONS
      {
        name: 'Thuốc hồi máu nhỏ',
        description: 'Thuốc hồi máu cơ bản, hồi phục một chút sức khỏe.',
        icon: '🧪',
        rarity: 'common',
        effect: 'heal:1d4:+1:instant',
        effects: [{ type: 'heal', value: 3 }], // Average of 1d4+1
        level: 1,
        tags: ['healing', 'potion', 'common']
      },
      {
        name: 'Thuốc hồi máu',
        description: 'Thuốc hồi máu hiệu quả, hồi phục sức khỏe đáng kể.',
        icon: '🧪',
        rarity: 'uncommon',
        effect: 'heal:2d4:+2:instant',
        effects: [{ type: 'heal', value: 7 }], // Average of 2d4+2
        level: 3,
        tags: ['healing', 'potion', 'uncommon']
      },
      {
        name: 'Thuốc hồi máu lớn',
        description: 'Thuốc hồi máu mạnh mẽ, hồi phục nhiều sức khỏe.',
        icon: '🧪',
        rarity: 'rare',
        effect: 'heal:4d4:+4:instant',
        effects: [{ type: 'heal', value: 14 }], // Average of 4d4+4
        level: 6,
        tags: ['healing', 'potion', 'rare']
      },
      {
        name: 'Thuốc hồi máu tối thượng',
        description: 'Thuốc hồi máu cực mạnh, hồi phục toàn bộ sức khỏe.',
        icon: '🧪',
        rarity: 'epic',
        effect: 'heal:8d4:+8:instant',
        effects: [{ type: 'heal', value: 28 }], // Average of 8d4+8
        level: 10,
        tags: ['healing', 'potion', 'epic']
      },

      // DAMAGE BUFFS
      {
        name: 'Thuốc sức mạnh',
        description: 'Tăng sức mạnh tấn công trong thời gian ngắn.',
        icon: '💪',
        rarity: 'common',
        effect: 'damage_buff:+1d4:3turns',
        effects: [{ type: 'damage_buff', value: 2, duration: 3 }], // Average of 1d4
        level: 2,
        tags: ['buff', 'damage', 'strength']
      },
      {
        name: 'Thuốc berserker',
        description: 'Kích thích cơn thịnh nộ, tăng sát thương đáng kể.',
        icon: '😡',
        rarity: 'uncommon',
        effect: 'damage_buff:+1d6:5turns',
        effects: [{ type: 'damage_buff', value: 3, duration: 5 }], // Average of 1d6
        level: 4,
        tags: ['buff', 'damage', 'berserker']
      },
      {
        name: 'Thuốc chiến binh',
        description: 'Thuốc của chiến binh, tăng sát thương mạnh mẽ.',
        icon: '⚔️',
        rarity: 'rare',
        effect: 'damage_buff:+2d6:4turns',
        effects: [{ type: 'damage_buff', value: 7, duration: 4 }], // Average of 2d6
        level: 7,
        tags: ['buff', 'damage', 'warrior']
      },

      // AC BUFFS
      {
        name: 'Thuốc khiên',
        description: 'Tăng khả năng phòng thủ trong thời gian ngắn.',
        icon: '🛡️',
        rarity: 'common',
        effect: 'stat_buff:ac:+2:3turns',
        effects: [{ type: 'ac_buff', value: 2, duration: 3 }],
        level: 2,
        tags: ['buff', 'defense', 'shield']
      },
      {
        name: 'Thuốc da đá',
        description: 'Làm da cứng như đá, tăng phòng thủ đáng kể.',
        icon: '🪨',
        rarity: 'uncommon',
        effect: 'stat_buff:ac:+3:5turns',
        effects: [{ type: 'ac_buff', value: 3, duration: 5 }],
        level: 4,
        tags: ['buff', 'defense', 'stone']
      },
      {
        name: 'Thuốc bảo vệ thánh',
        description: 'Bảo vệ thánh thần, tăng phòng thủ mạnh mẽ.',
        icon: '✨',
        rarity: 'rare',
        effect: 'stat_buff:ac:+4:6turns',
        effects: [{ type: 'ac_buff', value: 4, duration: 6 }],
        level: 8,
        tags: ['buff', 'defense', 'holy']
      },

      // STAT BUFFS
      {
        name: 'Thuốc nhanh nhẹn',
        description: 'Tăng tốc độ và phản xạ.',
        icon: '💨',
        rarity: 'common',
        effect: 'stat_buff:agility:+2:5turns',
        effects: [{ type: 'stat_buff', value: 2, duration: 60, statType: 'agility' }], // 1 hour = 60 turns
        level: 3,
        tags: ['buff', 'stat', 'agility']
      },
      {
        name: 'Thuốc trí tuệ',
        description: 'Tăng trí tuệ và khả năng tư duy.',
        icon: '🧠',
        rarity: 'uncommon',
        effect: 'stat_buff:intelligence:+3:5turns',
        effects: [{ type: 'stat_buff', value: 3, duration: 60, statType: 'intelligence' }],
        level: 5,
        tags: ['buff', 'stat', 'intelligence']
      },
      {
        name: 'Thuốc sức mạnh tối thượng',
        description: 'Tăng sức mạnh cơ bắp đáng kể.',
        icon: '💪',
        rarity: 'rare',
        effect: 'stat_buff:strength:+4:5turns',
        effects: [{ type: 'stat_buff', value: 4, duration: 60, statType: 'strength' }],
        level: 8,
        tags: ['buff', 'stat', 'strength']
      },

      // DEBUFF ITEMS (for enemies)
      {
        name: 'Bom độc',
        description: 'Bom chứa độc tố, gây sát thương và làm yếu kẻ thù.',
        icon: '💣',
        rarity: 'common',
        effect: 'debuff:poison:1d4:3turns',
        effects: [{ type: 'debuff', value: 2, duration: 3, target: 'enemy' }], // Average of 1d4
        level: 2,
        tags: ['debuff', 'poison', 'bomb']
      },
      {
        name: 'Thuốc độc yếu',
        description: 'Làm yếu kẻ thù, giảm sát thương của chúng.',
        icon: '☠️',
        rarity: 'uncommon',
        effect: 'debuff:weakness:1:2turns',
        effects: [{ type: 'debuff', value: 2, duration: 2, target: 'enemy' }],
        level: 4,
        tags: ['debuff', 'weakness', 'poison']
      },
      {
        name: 'Bom băng',
        description: 'Bom băng làm chậm kẻ thù.',
        icon: '❄️',
        rarity: 'rare',
        effect: 'debuff:slow:1:4turns',
        effects: [{ type: 'debuff', value: 1, duration: 4, target: 'enemy' }],
        level: 6,
        tags: ['debuff', 'ice', 'slow']
      },

      // CURE ITEMS
      {
        name: 'Thuốc giải độc',
        description: 'Loại bỏ tất cả hiệu ứng độc tố.',
        icon: '🌿',
        rarity: 'common',
        effect: 'cure:poison:instant',
        effects: [{ type: 'cure', value: 0 }],
        level: 1,
        tags: ['cure', 'poison', 'healing']
      },
      {
        name: 'Thuốc thánh',
        description: 'Loại bỏ tất cả hiệu ứng tiêu cực.',
        icon: '✨',
        rarity: 'rare',
        effect: 'cure:all:instant',
        effects: [{ type: 'cure', value: 0 }],
        level: 8,
        tags: ['cure', 'holy', 'purification']
      }
    ];
  }

  /**
   * Get all consumables by level range
   */
  public getConsumablesByLevel(minLevel: number, maxLevel: number): ConsumableTemplate[] {
    return this.consumables.filter(c => c.level >= minLevel && c.level <= maxLevel);
  }

  /**
   * Get consumables by rarity
   */
  public getConsumablesByRarity(rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'): ConsumableTemplate[] {
    return this.consumables.filter(c => c.rarity === rarity);
  }

  /**
   * Get consumables by tags
   */
  public getConsumablesByTags(tags: string[]): ConsumableTemplate[] {
    return this.consumables.filter(c => 
      tags.some(tag => c.tags.includes(tag))
    );
  }

  /**
   * Get random consumable by level and rarity
   */
  public getRandomConsumable(level: number, rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'): ConsumableTemplate | null {
    let availableConsumables = this.consumables.filter(c => c.level <= level);
    
    if (rarity) {
      availableConsumables = availableConsumables.filter(c => c.rarity === rarity);
    }
    
    if (availableConsumables.length === 0) {
      return null;
    }
    
    return availableConsumables[Math.floor(Math.random() * availableConsumables.length)];
  }

  /**
   * Create InventoryItem from consumable template
   */
  public createInventoryItem(template: ConsumableTemplate, quantity: number = 1): InventoryItem {
    return {
      id: this.generateItemId(),
      name: template.name,
      description: template.description,
      type: 'consumable',
      rarity: template.rarity,
      quantity,
      icon: template.icon,
      isEquipped: false,
      tags: template.tags,
      effect: template.effect,
      healing: this.parseHealingFromEffect(template.effect),
      stats: {}
    };
  }

  /**
   * Parse healing amount from effect string
   */
  private parseHealingFromEffect(effect: string): number {
    if (!effect) return 0;
    
    // Match patterns like "heal_1d4_plus_1" or "heal_2d4_plus_2"
    const healMatch = effect.match(/heal_(\d+)d(\d+)_plus_(\d+)/);
    if (healMatch) {
      const diceCount = parseInt(healMatch[1]);
      const diceSize = parseInt(healMatch[2]);
      const bonus = parseInt(healMatch[3]);
      return diceCount * (diceSize / 2) + bonus; // Average roll
    }
    
    return 0;
  }


  /**
   * Generate unique item ID
   */
  private generateItemId(): string {
    return `consumable_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get all consumable templates
   */
  public getAllConsumables(): ConsumableTemplate[] {
    return [...this.consumables];
  }
}

export const consumableDatabase = ConsumableDatabase.getInstance();
