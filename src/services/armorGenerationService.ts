import { InventoryItem } from '../types';

export interface ArmorGenerationOptions {
  level: number;
  enemyType?: 'humanoid' | 'beast' | 'undead' | 'demon' | 'elemental' | 'construct' | 'other';
  rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

class ArmorGenerationService {
  private static instance: ArmorGenerationService;

  private constructor() {}

  public static getInstance(): ArmorGenerationService {
    if (!ArmorGenerationService.instance) {
      ArmorGenerationService.instance = new ArmorGenerationService();
    }
    return ArmorGenerationService.instance;
  }

  /**
   * Generate chest armor for enemy/NPC based on level and type
   */
  public generateChestArmor(options: ArmorGenerationOptions): InventoryItem | null {
    const { level, enemyType = 'humanoid', rarity } = options;
    
    // Determine rarity if not specified
    const finalRarity = rarity || this.determineRarityByLevel(level);
    
    // Get armor data based on enemy type and rarity
    const armorData = this.getArmorDataByType(enemyType, finalRarity, level);
    
    if (!armorData) {
      return null;
    }

    // Generate armor item
    const armor: InventoryItem = {
      id: this.generateArmorId(),
      name: armorData.name,
      description: armorData.description,
      type: 'armor',
      rarity: finalRarity,
      quantity: 1,
      icon: armorData.icon,
      slot: 'armor',
      armorClass: armorData.armorClass,
      isEquipped: false,
      tags: ['armor', 'protection', enemyType],
      stats: {
        armorClass: armorData.armorClass
      }
    };

    return armor;
  }

  /**
   * Determine rarity based on level
   */
  private determineRarityByLevel(level: number): 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' {
    if (level <= 2) return 'common';
    if (level <= 5) return Math.random() < 0.3 ? 'uncommon' : 'common';
    if (level <= 8) return Math.random() < 0.4 ? 'rare' : Math.random() < 0.6 ? 'uncommon' : 'common';
    if (level <= 12) return Math.random() < 0.3 ? 'epic' : Math.random() < 0.5 ? 'rare' : 'uncommon';
    return Math.random() < 0.2 ? 'legendary' : Math.random() < 0.4 ? 'epic' : 'rare';
  }

  /**
   * Get armor data based on enemy type and rarity
   */
  private getArmorDataByType(
    enemyType: string, 
    rarity: string, 
    level: number
  ): { name: string; description: string; icon: string; armorClass: number } | null {
    
    const baseAC = this.getBaseACByRarity(rarity);
    const levelBonus = Math.floor(level / 3); // +1 AC every 3 levels
    const armorClass = Math.min(20, baseAC + levelBonus);

    const armorTemplates = {
      humanoid: {
        common: [
          { name: 'Áo da', description: 'Áo giáp da đơn giản nhưng hiệu quả', icon: '○' },
          { name: 'Áo vải bọc sắt', description: 'Áo vải có các mảnh sắt bảo vệ', icon: '○' },
          { name: 'Áo khoác da', description: 'Áo khoác da dày dặn', icon: '○' }
        ],
        uncommon: [
          { name: 'Áo giáp sắt', description: 'Áo giáp sắt được rèn kỹ', icon: '○' },
          { name: 'Áo giáp đồng', description: 'Áo giáp đồng sáng bóng', icon: '○' },
          { name: 'Áo giáp da cứng', description: 'Áo giáp da được xử lý đặc biệt', icon: '○' }
        ],
        rare: [
          { name: 'Áo giáp thép', description: 'Áo giáp thép chất lượng cao', icon: '○' },
          { name: 'Áo giáp mithril', description: 'Áo giáp mithril nhẹ và bền', icon: '•' },
          { name: 'Áo giáp ma thuật', description: 'Áo giáp được phù phép', icon: '○' }
        ],
        epic: [
          { name: 'Áo giáp adamantine', description: 'Áo giáp adamantine cực kỳ cứng', icon: '◇' },
          { name: 'Áo giáp dragon', description: 'Áo giáp làm từ vảy rồng', icon: '○' },
          { name: 'Áo giáp thánh', description: 'Áo giáp được ban phước', icon: '•' }
        ],
        legendary: [
          { name: 'Áo giáp huyền thoại', description: 'Áo giáp huyền thoại với sức mạnh khủng khiếp', icon: '◇' },
          { name: 'Áo giáp vô địch', description: 'Áo giáp của những chiến binh vĩ đại', icon: '★' }
        ]
      },
      beast: {
        common: [
          { name: 'Lớp da dày', description: 'Lớp da dày tự nhiên', icon: '○' },
          { name: 'Vảy cứng', description: 'Vảy cứng bảo vệ', icon: '○' }
        ],
        uncommon: [
          { name: 'Da thú ma thuật', description: 'Da thú được tăng cường ma thuật', icon: '○' },
          { name: 'Vảy rồng non', description: 'Vảy từ rồng non', icon: '○' }
        ],
        rare: [
          { name: 'Da rồng', description: 'Da rồng cực kỳ bền', icon: '○' },
          { name: 'Vảy phượng hoàng', description: 'Vảy phượng hoàng linh thiêng', icon: '•' }
        ],
        epic: [
          { name: 'Da cổ đại', description: 'Da từ sinh vật cổ đại', icon: '○' },
          { name: 'Vảy thần thú', description: 'Vảy từ thần thú', icon: '•' }
        ],
        legendary: [
          { name: 'Da nguyên thủy', description: 'Da từ sinh vật nguyên thủy', icon: '○' }
        ]
      },
      undead: {
        common: [
          { name: 'Áo giáp mục nát', description: 'Áo giáp cũ mục nát', icon: '○' },
          { name: 'Áo giáp xương', description: 'Áo giáp làm từ xương', icon: '○' }
        ],
        uncommon: [
          { name: 'Áo giáp bóng ma', description: 'Áo giáp bóng ma', icon: '○' },
          { name: 'Áo giáp lich', description: 'Áo giáp của lich', icon: '⚔‍♂️' }
        ],
        rare: [
          { name: 'Áo giáp tử thần', description: 'Áo giáp của tử thần', icon: '○' },
          { name: 'Áo giáp bóng tối', description: 'Áo giáp thấm đẫm bóng tối', icon: '○' }
        ],
        epic: [
          { name: 'Áo giáp linh hồn', description: 'Áo giáp làm từ linh hồn', icon: '○' },
          { name: 'Áo giáp địa ngục', description: 'Áo giáp từ địa ngục', icon: '•' }
        ],
        legendary: [
          { name: 'Áo giáp vong linh', description: 'Áo giáp của vong linh vĩ đại', icon: '◇' }
        ]
      },
      demon: {
        common: [
          { name: 'Áo giáp quỷ', description: 'Áo giáp của quỷ dữ', icon: '○' },
          { name: 'Áo giáp địa ngục', description: 'Áo giáp từ địa ngục', icon: '•' }
        ],
        uncommon: [
          { name: 'Áo giáp demon', description: 'Áo giáp demon mạnh mẽ', icon: '○' },
          { name: 'Áo giáp lửa', description: 'Áo giáp bốc lửa', icon: '•' }
        ],
        rare: [
          { name: 'Áo giáp balor', description: 'Áo giáp của balor', icon: '○' },
          { name: 'Áo giáp pit fiend', description: 'Áo giáp pit fiend', icon: '○' }
        ],
        epic: [
          { name: 'Áo giáp archdemon', description: 'Áo giáp của archdemon', icon: '◇' },
          { name: 'Áo giáp địa ngục sâu', description: 'Áo giáp từ tầng sâu địa ngục', icon: '○' }
        ],
        legendary: [
          { name: 'Áo giáp demon lord', description: 'Áo giáp của demon lord', icon: '◇' }
        ]
      },
      elemental: {
        common: [
          { name: 'Áo giáp đá', description: 'Áo giáp làm từ đá', icon: '○' },
          { name: 'Áo giáp nước', description: 'Áo giáp nước đóng băng', icon: '•' }
        ],
        uncommon: [
          { name: 'Áo giáp lửa', description: 'Áo giáp bốc lửa', icon: '•' },
          { name: 'Áo giáp gió', description: 'Áo giáp gió xoáy', icon: '○' }
        ],
        rare: [
          { name: 'Áo giáp nguyên tố', description: 'Áo giáp nguyên tố thuần túy', icon: '•' },
          { name: 'Áo giáp tinh thể', description: 'Áo giáp tinh thể ma thuật', icon: '◇' }
        ],
        epic: [
          { name: 'Áo giáp nguyên thủy', description: 'Áo giáp nguyên tố nguyên thủy', icon: '○' },
          { name: 'Áo giáp tinh thể cổ', description: 'Áo giáp tinh thể cổ đại', icon: '◇' }
        ],
        legendary: [
          { name: 'Áo giáp nguyên tố vĩnh cửu', description: 'Áo giáp nguyên tố vĩnh cửu', icon: '◇' }
        ]
      },
      construct: {
        common: [
          { name: 'Áo giáp gỗ', description: 'Áo giáp gỗ đơn giản', icon: '○' },
          { name: 'Áo giáp kim loại', description: 'Áo giáp kim loại cơ bản', icon: '⚙️' }
        ],
        uncommon: [
          { name: 'Áo giáp cơ khí', description: 'Áo giáp cơ khí', icon: '⚙️' },
          { name: 'Áo giáp tự động', description: 'Áo giáp tự động', icon: '○' }
        ],
        rare: [
          { name: 'Áo giáp ma thuật', description: 'Áo giáp ma thuật', icon: '○' },
          { name: 'Áo giáp tinh thể', description: 'Áo giáp tinh thể', icon: '◇' }
        ],
        epic: [
          { name: 'Áo giáp cổ đại', description: 'Áo giáp cổ đại', icon: '○' },
          { name: 'Áo giáp thần thánh', description: 'Áo giáp thần thánh', icon: '•' }
        ],
        legendary: [
          { name: 'Áo giáp vĩnh cửu', description: 'Áo giáp vĩnh cửu', icon: '◇' }
        ]
      },
      other: {
        common: [
          { name: 'Áo giáp kỳ lạ', description: 'Áo giáp kỳ lạ', icon: '○' },
          { name: 'Áo giáp ngoại lai', description: 'Áo giáp ngoại lai', icon: '○' }
        ],
        uncommon: [
          { name: 'Áo giáp không gian', description: 'Áo giáp không gian', icon: '○' },
          { name: 'Áo giáp thời gian', description: 'Áo giáp thời gian', icon: '⏰' }
        ],
        rare: [
          { name: 'Áo giáp đa chiều', description: 'Áo giáp đa chiều', icon: '○' },
          { name: 'Áo giáp vũ trụ', description: 'Áo giáp vũ trụ', icon: '○' }
        ],
        epic: [
          { name: 'Áo giáp thực tại', description: 'Áo giáp thực tại', icon: '○' },
          { name: 'Áo giáp vô cực', description: 'Áo giáp vô cực', icon: '♾️' }
        ],
        legendary: [
          { name: 'Áo giáp tuyệt đối', description: 'Áo giáp tuyệt đối', icon: '◇' }
        ]
      }
    };

    const typeTemplates = armorTemplates[enemyType as keyof typeof armorTemplates];
    if (!typeTemplates) return null;

    const rarityTemplates = typeTemplates[rarity as keyof typeof typeTemplates];
    if (!rarityTemplates || rarityTemplates.length === 0) return null;

    const randomTemplate = rarityTemplates[Math.floor(Math.random() * rarityTemplates.length)];
    
    return {
      name: randomTemplate.name,
      description: randomTemplate.description,
      icon: randomTemplate.icon,
      armorClass
    };
  }

  /**
   * Get base AC by rarity
   */
  private getBaseACByRarity(rarity: string): number {
    const rarityAC = {
      'common': 11,
      'uncommon': 12,
      'rare': 13,
      'epic': 14,
      'legendary': 15
    };
    return rarityAC[rarity as keyof typeof rarityAC] || 11;
  }

  /**
   * Generate unique armor ID
   */
  private generateArmorId(): string {
    return `armor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const armorGenerationService = ArmorGenerationService.getInstance();
