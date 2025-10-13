import { InventoryItem, Enemy } from '../types';
import { consumableDatabase } from './consumableDatabase';

interface LootTable {
  misc: Array<{
    name: string;
    description: string;
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    value: number;
    tags: string[];
  }>;
  consumables: Array<{
    name: string;
    description: string;
    effect: string;
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    value: number;
    tags: string[];
  }>;
  weapons: Array<{
    name: string;
    description: string;
    damage: string;
    damageType: string;
    attackBonus: number;
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    value: number;
    tags: string[];
  }>;
  armor: Array<{
    name: string;
    description: string;
    armorClass: number;
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    value: number;
    tags: string[];
  }>;
}

class EnhancedLootService {
  private static instance: EnhancedLootService;
  private lootTable: LootTable;

  public static getInstance(): EnhancedLootService {
    if (!EnhancedLootService.instance) {
      EnhancedLootService.instance = new EnhancedLootService();
    }
    return EnhancedLootService.instance;
  }

  constructor() {
    this.lootTable = this.initializeLootTable();
  }

  /**
   * Generate loot for defeated enemy
   */
  public generateLootForEnemy(enemy: Enemy): InventoryItem[] {
    const loot: InventoryItem[] = [];
    
    // Always drop misc or consumable (100% chance)
    const guaranteedLoot = this.generateGuaranteedLoot(enemy);
    loot.push(...guaranteedLoot);
    
    // Good chance for weapon/armor (15-35% based on enemy level)
    const equipmentLoot = this.generateEquipmentLoot(enemy);
    loot.push(...equipmentLoot);
    
    return loot;
  }

  /**
   * Generate guaranteed loot (misc or consumable)
   */
  private generateGuaranteedLoot(enemy: Enemy): InventoryItem[] {
    const loot: InventoryItem[] = [];
    
    // 70% chance for misc, 30% chance for consumable
    const lootType = Math.random() < 0.7 ? 'misc' : 'consumable';
    
    if (lootType === 'misc') {
      const miscItem = this.selectRandomMiscItem(enemy);
      if (miscItem) {
        loot.push(this.createInventoryItem(miscItem, 'misc'));
      }
    } else {
      const consumableItem = this.selectRandomConsumableItem(enemy);
      if (consumableItem) {
        loot.push(this.createInventoryItem(consumableItem, 'consumable'));
      }
    }
    
    return loot;
  }

  /**
   * Generate equipment loot (weapon/armor) with small chance
   */
  private generateEquipmentLoot(enemy: Enemy): InventoryItem[] {
    const loot: InventoryItem[] = [];
    
    // Calculate drop chance based on enemy level (15-35%)
    const enemyLevel = enemy.level || 1;
    const baseChance = 0.15; // Increased from 5% to 15%
    const levelBonus = Math.min(enemyLevel * 0.02, 0.20); // Increased from 1% to 2% per level, max 20%
    const dropChance = baseChance + levelBonus;
    
    if (Math.random() < dropChance) {
      // 60% chance for weapon, 40% chance for armor
      const equipmentType = Math.random() < 0.6 ? 'weapon' : 'armor';
      
      if (equipmentType === 'weapon') {
        const weaponItem = this.selectRandomWeaponItem(enemy);
        if (weaponItem) {
          loot.push(this.createInventoryItem(weaponItem, 'weapon'));
        }
      } else {
        const armorItem = this.selectRandomArmorItem(enemy);
        if (armorItem) {
          loot.push(this.createInventoryItem(armorItem, 'armor'));
        }
      }
    }
    
    return loot;
  }

  /**
   * Select random misc item based on enemy
   */
  private selectRandomMiscItem(enemy: Enemy): any {
    const enemyLevel = enemy.level || 1;
    
    // Filter items by level
    const availableItems = this.lootTable.misc.filter(item => {
      const levelMatch = this.getItemLevel(item.rarity) <= enemyLevel + 2;
      return levelMatch;
    });
    
    if (availableItems.length === 0) {
      // Fallback to general items
      return this.lootTable.misc.find(item => item.tags.includes('general'));
    }
    
    return availableItems[Math.floor(Math.random() * availableItems.length)];
  }

  /**
   * Select random consumable item based on enemy
   */
  private selectRandomConsumableItem(enemy: Enemy): any {
    const enemyLevel = enemy.level || 1;
    
    // Use consumable database instead of loot table
    const template = consumableDatabase.getRandomConsumable(enemyLevel);
    if (template) {
      return {
        name: template.name,
        description: template.description,
        effect: template.effect,
        rarity: template.rarity,
        value: this.getItemLevel(template.rarity) * 10,
        tags: template.tags
      };
    }
    
    // Fallback to loot table if database fails
    const availableItems = this.lootTable.consumables.filter(item => {
      const levelMatch = this.getItemLevel(item.rarity) <= enemyLevel + 2;
      return levelMatch;
    });
    
    if (availableItems.length === 0) {
      return this.lootTable.consumables[0];
    }
    
    return availableItems[Math.floor(Math.random() * availableItems.length)];
  }

  /**
   * Select random weapon item based on enemy
   */
  private selectRandomWeaponItem(enemy: Enemy): any {
    const enemyType = enemy.type || 'humanoid';
    const enemyLevel = enemy.level || 1;
    
    const availableItems = this.lootTable.weapons.filter(item => {
      const levelMatch = this.getItemLevel(item.rarity) <= enemyLevel + 1;
      const typeMatch = item.tags.some(tag => 
        this.getEnemyTypeTags(enemyType).includes(tag)
      );
      return levelMatch && (typeMatch || item.tags.includes('general'));
    });
    
    if (availableItems.length === 0) {
      return this.lootTable.weapons.find(item => item.tags.includes('general'));
    }
    
    return availableItems[Math.floor(Math.random() * availableItems.length)];
  }

  /**
   * Select random armor item based on enemy
   */
  private selectRandomArmorItem(enemy: Enemy): any {
    const enemyType = enemy.type || 'humanoid';
    const enemyLevel = enemy.level || 1;
    
    const availableItems = this.lootTable.armor.filter(item => {
      const levelMatch = this.getItemLevel(item.rarity) <= enemyLevel + 1;
      const typeMatch = item.tags.some(tag => 
        this.getEnemyTypeTags(enemyType).includes(tag)
      );
      return levelMatch && (typeMatch || item.tags.includes('general'));
    });
    
    if (availableItems.length === 0) {
      return this.lootTable.armor.find(item => item.tags.includes('general'));
    }
    
    return availableItems[Math.floor(Math.random() * availableItems.length)];
  }

  /**
   * Create InventoryItem from loot table item
   */
  private createInventoryItem(item: any, type: 'misc' | 'consumable' | 'weapon' | 'armor'): InventoryItem {
    const inventoryItem: InventoryItem = {
      id: this.generateItemId(),
      name: item.name,
      description: item.description,
      type: type,
      rarity: item.rarity,
      quantity: 1,
      icon: this.getDefaultIcon(type),
      stats: {}, // Equipment không cung cấp stat bonuses
      isEquipped: false,
      tags: item.tags,
      slot: item.slot // Preserve slot property if provided
    };

    // Add type-specific stats
    if (type === 'weapon') {
      inventoryItem.damage = item.damage;
      inventoryItem.damageType = item.damageType;
      inventoryItem.attackBonus = item.attackBonus;
      inventoryItem.stats = {
        attackBonus: item.attackBonus || 0
      };
    } else if (type === 'armor') {
      inventoryItem.armorClass = item.armorClass;
      inventoryItem.stats = {
        armorClass: item.armorClass || 0
      };
    } else if (type === 'consumable') {
      inventoryItem.stats = {
        effect: item.effect || '',
        healing: this.parseHealingFromEffect(item.effect) || 0,
        damage: this.parseDamageFromEffect(item.effect) || 0
      };
    }

    return inventoryItem;
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
   * Parse damage amount from effect string
   */
  private parseDamageFromEffect(effect: string): number {
    if (!effect) return 0;
    
    // Match patterns like "damage_1d4_plus_1" or "poison_1d6"
    const damageMatch = effect.match(/(?:damage|poison)_(\d+)d(\d+)(?:_plus_(\d+))?/);
    if (damageMatch) {
      const diceCount = parseInt(damageMatch[1]);
      const diceSize = parseInt(damageMatch[2]);
      const bonus = damageMatch[3] ? parseInt(damageMatch[3]) : 0;
      return diceCount * (diceSize / 2) + bonus; // Average roll
    }
    
    return 0;
  }

  /**
   * Get item level based on rarity
   */
  private getItemLevel(rarity: string): number {
    const rarityLevels = {
      'common': 1,
      'uncommon': 3,
      'rare': 6,
      'epic': 10,
      'legendary': 15
    };
    return rarityLevels[rarity as keyof typeof rarityLevels] || 1;
  }

  /**
   * Get enemy type tags
   */
  private getEnemyTypeTags(enemyType: string): string[] {
    const typeTags: Record<string, string[]> = {
      'humanoid': ['humanoid', 'civilized', 'general'],
      'beast': ['beast', 'animal', 'natural'],
      'undead': ['undead', 'dark', 'cursed'],
      'demon': ['demon', 'infernal', 'dark'],
      'elemental': ['elemental', 'magical', 'natural'],
      'construct': ['construct', 'mechanical', 'artificial'],
      'dragon': ['dragon', 'ancient', 'powerful'],
      'aberration': ['aberration', 'alien', 'strange']
    };
    return typeTags[enemyType] || ['general'];
  }

  /**
   * Get default icon for item type
   */
  private getDefaultIcon(type: string): string {
    const icons = {
      'misc': '📦',
      'consumable': '🧪',
      'weapon': '⚔️',
      'armor': '🛡️'
    };
    return icons[type as keyof typeof icons] || '📦';
  }

  /**
   * Generate unique item ID
   */
  private generateItemId(): string {
    return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initialize loot table with items
   */
  private initializeLootTable(): LootTable {
    return {
      misc: [
        {
          name: 'Đồng xu cổ',
          description: 'Một đồng xu cổ có thể có giá trị lịch sử.',
          rarity: 'common',
          value: 1,
          tags: ['general', 'currency', 'ancient']
        },
        {
          name: 'Vòng tay đơn giản',
          description: 'Một vòng tay được làm thủ công.',
          rarity: 'common',
          value: 5,
          tags: ['general', 'jewelry', 'handmade']
        },
        {
          name: 'Lông thú',
          description: 'Lông của một con thú hoang dã.',
          rarity: 'common',
          value: 2,
          tags: ['beast', 'natural', 'crafting']
        },
        {
          name: 'Xương cổ',
          description: 'Một mảnh xương cổ có thể chứa ma thuật.',
          rarity: 'uncommon',
          value: 10,
          tags: ['undead', 'ancient', 'magical']
        },
        {
          name: 'Tinh thể ma thuật',
          description: 'Một tinh thể chứa năng lượng ma thuật.',
          rarity: 'rare',
          value: 25,
          tags: ['magical', 'elemental', 'powerful']
        }
      ],
      consumables: [
        {
          name: 'Thuốc hồi máu nhỏ',
          description: 'Hồi phục 1d4+1 HP.',
          effect: 'heal_1d4_plus_1',
          rarity: 'common',
          value: 5,
          tags: ['healing', 'general']
        },
        {
          name: 'Thuốc hồi máu',
          description: 'Hồi phục 2d4+2 HP.',
          effect: 'heal_2d4_plus_2',
          rarity: 'uncommon',
          value: 15,
          tags: ['healing', 'general']
        },
        {
          name: 'Thuốc tăng sức mạnh',
          description: 'Tăng +2 sức mạnh trong 1 giờ.',
          effect: 'strength_plus_2_1hour',
          rarity: 'uncommon',
          value: 20,
          tags: ['buff', 'strength', 'temporary']
        },
        {
          name: 'Thuốc giải độc',
          description: 'Loại bỏ tất cả hiệu ứng độc.',
          effect: 'cure_poison',
          rarity: 'rare',
          value: 30,
          tags: ['cure', 'poison', 'status']
        },
        {
          name: 'Thuốc bất tử',
          description: 'Hồi phục toàn bộ HP và loại bỏ tất cả hiệu ứng tiêu cực.',
          effect: 'full_heal_and_cure_all',
          rarity: 'legendary',
          value: 100,
          tags: ['healing', 'cure', 'powerful']
        }
      ],
      weapons: [
        {
          name: 'Kiếm gỗ',
          description: 'Một thanh kiếm đơn giản làm bằng gỗ.',
          damage: '1d4',
          damageType: 'bludgeoning',
          attackBonus: 0,
          rarity: 'common',
          value: 5,
          tags: ['general', 'simple', 'wooden']
        },
        {
          name: 'Kiếm sắt',
          description: 'Một thanh kiếm sắt cơ bản.',
          damage: '1d6',
          damageType: 'slashing',
          attackBonus: 1,
          rarity: 'common',
          value: 15,
          tags: ['general', 'metal', 'balanced']
        },
        {
          name: 'Kiếm ma thuật',
          description: 'Một thanh kiếm được phù phép.',
          damage: '1d6+1',
          damageType: 'magical',
          attackBonus: 2,
          rarity: 'uncommon',
          value: 50,
          tags: ['magical', 'enchanted', 'powerful']
        },
        {
          name: 'Kiếm rồng',
          description: 'Một thanh kiếm được rèn từ vảy rồng.',
          damage: '1d8+2',
          damageType: 'fire',
          attackBonus: 3,
          rarity: 'rare',
          value: 150,
          tags: ['dragon', 'fire', 'legendary_material']
        },
        {
          name: 'Kiếm huyền thoại',
          description: 'Một thanh kiếm huyền thoại với sức mạnh khủng khiếp.',
          damage: '2d6+4',
          damageType: 'radiant',
          attackBonus: 5,
          rarity: 'legendary',
          value: 500,
          tags: ['legendary', 'divine', 'ultimate']
        }
      ],
      armor: [
        {
          name: 'Áo da đơn giản',
          description: 'Một chiếc áo da cơ bản.',
          armorClass: 11,
          rarity: 'common',
          value: 10,
          tags: ['general', 'leather', 'light']
        },
        {
          name: 'Áo giáp da',
          description: 'Áo giáp da được gia cố.',
          armorClass: 12,
          rarity: 'common',
          value: 20,
          tags: ['general', 'leather', 'reinforced']
        },
        {
          name: 'Áo giáp sắt',
          description: 'Áo giáp sắt nặng nhưng bảo vệ tốt.',
          armorClass: 14,
          rarity: 'uncommon',
          value: 75,
          tags: ['general', 'metal', 'heavy']
        },
        {
          name: 'Áo giáp ma thuật',
          description: 'Áo giáp được phù phép.',
          armorClass: 15,
          rarity: 'rare',
          value: 200,
          tags: ['magical', 'enchanted', 'powerful']
        },
        {
          name: 'Áo giáp rồng',
          description: 'Áo giáp được làm từ vảy rồng.',
          armorClass: 17,
          rarity: 'legendary',
          value: 1000,
          tags: ['dragon', 'legendary_material', 'ultimate']
        }
      ]
    };
  }
}

export const enhancedLootService = EnhancedLootService.getInstance();
