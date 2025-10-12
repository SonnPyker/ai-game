import { Enemy, CombatStats, Attack } from '../types';

class EnemyDatabaseService {
  private static instance: EnemyDatabaseService;
  private enemies: Map<string, Enemy> = new Map();
  private predefinedEnemies: Enemy[] = [];

  private constructor() {
    this.initializePredefinedEnemies();
    this.loadFromStorage();
  }

  public static getInstance(): EnemyDatabaseService {
    if (!EnemyDatabaseService.instance) {
      EnemyDatabaseService.instance = new EnemyDatabaseService();
    }
    return EnemyDatabaseService.instance;
  }

  // Initialize predefined enemies for testing
  private initializePredefinedEnemies(): void {
    this.predefinedEnemies = [
      {
        id: 'goblin_warrior',
        name: 'Goblin Chiến Binh',
        description: 'Một goblin hung dữ với vũ khí thô sơ nhưng nguy hiểm.',
        type: 'humanoid',
        level: 1,
        combatLevel: 1,
        stats: {
          strength: 12,
          agility: 14,
          constitution: 10,
          intelligence: 8,
          wisdom: 10,
          charisma: 8,
          modifiers: {
            strength: 1,
            agility: 2,
            constitution: 0,
            intelligence: -1,
            wisdom: 0,
            charisma: -1
          }
        },
        health: { current: 7, max: 7 },
        armorClass: 12,
        attacks: [
          {
            name: 'Scimitar',
            attackBonus: 4,
            damage: '1d6+1',
            damageType: 'physical'
          }
        ],
        loot: [
          {
            id: 'goblin_scimitar',
            name: 'Kiếm Goblin',
            description: 'Một thanh kiếm cong thô sơ nhưng sắc bén.',
            type: 'weapon',
            rarity: 'common',
            quantity: 1,
            icon: '⚔️',
            damage: '1d6',
            damageType: 'physical',
            attackBonus: 0
          }
        ],
        experienceReward: 25
      },
      {
        id: 'orc_warrior',
        name: 'Orc Chiến Binh',
        description: 'Một orc to lớn và mạnh mẽ, kẻ thù đáng gờm.',
        type: 'humanoid',
        level: 2,
        combatLevel: 2,
        stats: {
          strength: 16,
          agility: 12,
          constitution: 14,
          intelligence: 8,
          wisdom: 10,
          charisma: 8,
          modifiers: {
            strength: 3,
            agility: 1,
            constitution: 2,
            intelligence: -1,
            wisdom: 0,
            charisma: -1
          }
        },
        health: { current: 15, max: 15 },
        armorClass: 13,
        attacks: [
          {
            name: 'Greataxe',
            attackBonus: 5,
            damage: '1d12+3',
            damageType: 'physical'
          }
        ],
        loot: [
          {
            id: 'orc_greataxe',
            name: 'Rìu Lớn Orc',
            description: 'Một chiếc rìu lớn nặng nề nhưng sát thương cao.',
            type: 'weapon',
            rarity: 'uncommon',
            quantity: 1,
            icon: '🪓',
            damage: '1d12',
            damageType: 'physical',
            attackBonus: 0,
            weaponProperties: {
              twoHanded: true,
              heavy: true
            }
          }
        ],
        experienceReward: 50
      },
      {
        id: 'skeleton_warrior',
        name: 'Bộ Xương Chiến Binh',
        description: 'Xương cốt của một chiến binh cổ đại, được hồi sinh bởi phép thuật tối.',
        type: 'undead',
        level: 1,
        combatLevel: 1,
        stats: {
          strength: 10,
          agility: 14,
          constitution: 12,
          intelligence: 6,
          wisdom: 8,
          charisma: 5,
          modifiers: {
            strength: 0,
            agility: 2,
            constitution: 1,
            intelligence: -2,
            wisdom: -1,
            charisma: -3
          }
        },
        health: { current: 13, max: 13 },
        armorClass: 13,
        attacks: [
          {
            name: 'Shortsword',
            attackBonus: 4,
            damage: '1d6+2',
            damageType: 'physical'
          }
        ],
        abilities: [
          {
            id: 'undead_resistance',
            name: 'Kháng Cảm Xúc',
            description: 'Miễn nhiễm với hiệu ứng tâm lý như sợ hãi.',
            type: 'passive',
            effect: 'Không bị ảnh hưởng bởi Fear, Charm, hoặc các hiệu ứng tâm lý khác.'
          }
        ],
        loot: [
          {
            id: 'skeleton_sword',
            name: 'Kiếm Xương',
            description: 'Một thanh kiếm cổ đại với sức mạnh ma thuật.',
            type: 'weapon',
            rarity: 'uncommon',
            quantity: 1,
            icon: '⚔️',
            damage: '1d6+1',
            damageType: 'magical',
            attackBonus: 1
          }
        ],
        experienceReward: 30
      },
      {
        id: 'fire_elemental',
        name: 'Nguyên Tố Lửa',
        description: 'Một sinh vật được tạo thành từ lửa thuần túy, cực kỳ nguy hiểm.',
        type: 'elemental',
        level: 3,
        combatLevel: 3,
        stats: {
          strength: 14,
          agility: 16,
          constitution: 16,
          intelligence: 10,
          wisdom: 12,
          charisma: 8,
          modifiers: {
            strength: 2,
            agility: 3,
            constitution: 3,
            intelligence: 0,
            wisdom: 1,
            charisma: -1
          }
        },
        health: { current: 25, max: 25 },
        armorClass: 14,
        attacks: [
          {
            name: 'Fire Touch',
            attackBonus: 6,
            damage: '2d6+2',
            damageType: 'fire',
            range: 5
          }
        ],
        abilities: [
          {
            id: 'fire_immunity',
            name: 'Miễn Nhiễm Lửa',
            description: 'Hoàn toàn miễn nhiễm với sát thương lửa.',
            type: 'passive',
            effect: 'Không nhận sát thương từ lửa và có thể đi qua lửa.'
          },
          {
            id: 'burning_aura',
            name: 'Hào Quang Cháy',
            description: 'Gây sát thương lửa cho kẻ thù ở gần.',
            type: 'passive',
            effect: 'Kẻ thù trong bán kính 5 feet nhận 1d4 sát thương lửa mỗi turn.'
          }
        ],
        loot: [
          {
            id: 'fire_essence',
            name: 'Tinh Chất Lửa',
            description: 'Một viên đá chứa năng lượng lửa thuần túy.',
            type: 'misc',
            rarity: 'rare',
            quantity: 1,
            icon: '🔥',
            damage: '1d4',
            damageType: 'fire'
          }
        ],
        experienceReward: 100
      },
      {
        id: 'dragon_wyrmling',
        name: 'Rồng Con',
        description: 'Một con rồng non nhưng vẫn rất nguy hiểm với sức mạnh và phép thuật.',
        type: 'beast',
        level: 4,
        combatLevel: 4,
        stats: {
          strength: 18,
          agility: 12,
          constitution: 16,
          intelligence: 14,
          wisdom: 14,
          charisma: 16,
          modifiers: {
            strength: 4,
            agility: 1,
            constitution: 3,
            intelligence: 2,
            wisdom: 2,
            charisma: 3
          }
        },
        health: { current: 32, max: 32 },
        armorClass: 16,
        attacks: [
          {
            name: 'Bite',
            attackBonus: 6,
            damage: '1d10+4',
            damageType: 'physical'
          },
          {
            name: 'Fire Breath',
            attackBonus: 0,
            damage: '2d6',
            damageType: 'fire',
            range: 15
          }
        ],
        abilities: [
          {
            id: 'fire_breath',
            name: 'Hơi Thở Lửa',
            description: 'Thở ra một luồng lửa mạnh mẽ.',
            type: 'active',
            cooldown: 3,
            effect: 'Gây 2d6 sát thương lửa cho tất cả kẻ thù trong hình nón 15 feet.'
          },
          {
            id: 'flight',
            name: 'Bay',
            description: 'Có thể bay với tốc độ 60 feet.',
            type: 'passive',
            effect: 'Có thể di chuyển trong không trung và tránh các cuộc tấn công cận chiến.'
          }
        ],
        loot: [
          {
            id: 'dragon_scale',
            name: 'Vảy Rồng',
            description: 'Một vảy rồng cứng cáp, có thể dùng để chế tạo giáp.',
            type: 'misc',
            rarity: 'rare',
            quantity: 1,
            icon: '🐉',
            stats: {
              constitution: 2
            }
          },
          {
            id: 'dragon_teeth',
            name: 'Răng Rồng',
            description: 'Răng của rồng, có thể dùng làm vũ khí hoặc phép thuật.',
            type: 'misc',
            rarity: 'uncommon',
            quantity: 2,
            icon: '🦷',
            damage: '1d4',
            damageType: 'physical'
          }
        ],
        experienceReward: 200
      }
    ];
  }

  // Load enemies from localStorage
  private loadFromStorage(): void {
    try {
      const savedEnemies = localStorage.getItem('enemy_database');
      if (savedEnemies) {
        const enemies = JSON.parse(savedEnemies);
        this.enemies = new Map(enemies.map((enemy: Enemy) => [enemy.id, enemy]));
      }
    } catch (error) {
      console.warn('Failed to load enemy database from storage:', error);
    }
  }

  // Save enemies to localStorage
  private saveToStorage(): void {
    try {
      localStorage.setItem('enemy_database', JSON.stringify(Array.from(this.enemies.values())));
    } catch (error) {
      console.warn('Failed to save enemy database to storage:', error);
    }
  }

  // Get all predefined enemies
  public getPredefinedEnemies(): Enemy[] {
    return [...this.predefinedEnemies];
  }

  // Get enemy by ID
  public getEnemy(id: string): Enemy | undefined {
    return this.enemies.get(id) || this.predefinedEnemies.find(e => e.id === id);
  }

  // Add custom enemy
  public addEnemy(enemy: Enemy): void {
    this.enemies.set(enemy.id, enemy);
    this.saveToStorage();
  }

  // Remove custom enemy
  public removeEnemy(id: string): boolean {
    if (this.enemies.has(id)) {
      this.enemies.delete(id);
      this.saveToStorage();
      return true;
    }
    return false;
  }

  // Generate random enemy stats based on combat level
  public generateRandomEnemyStats(level: number): CombatStats {
    // Use level as seed for consistent stats
    const seed = level * 9301 + 49297;
    
    // Create different random seeds for each stat to ensure variation
    const strengthSeed = (seed * 1237 + 4567) % 233280 / 233280;
    const agilitySeed = (seed * 2341 + 5678) % 233280 / 233280;
    const constitutionSeed = (seed * 3457 + 6789) % 233280 / 233280;
    const intelligenceSeed = (seed * 4561 + 7890) % 233280 / 233280;
    const wisdomSeed = (seed * 5673 + 8901) % 233280 / 233280;
    const charismaSeed = (seed * 6785 + 9012) % 233280 / 233280;
    
    // Base stats scale with combat level
    const basePhysicalStats = 10 + Math.floor(level * 1.5); // Physical stats scale better
    const baseMentalStats = 8 + Math.floor(level * 0.8); // Mental stats scale slower
    
    const baseStats = {
      strength: Math.max(8, Math.min(20, basePhysicalStats + Math.floor(strengthSeed * 7) - 3)),
      agility: Math.max(8, Math.min(20, basePhysicalStats + Math.floor(agilitySeed * 7) - 3)),
      constitution: Math.max(8, Math.min(20, basePhysicalStats + Math.floor(constitutionSeed * 7) - 3)),
      intelligence: Math.max(8, Math.min(20, baseMentalStats + Math.floor(intelligenceSeed * 5) - 2)),
      wisdom: Math.max(8, Math.min(20, baseMentalStats + Math.floor(wisdomSeed * 5) - 2)),
      charisma: Math.max(8, Math.min(20, baseMentalStats + Math.floor(charismaSeed * 5) - 2))
    };

    // Calculate modifiers
    const modifiers = {
      strength: Math.floor((baseStats.strength - 10) / 2),
      agility: Math.floor((baseStats.agility - 10) / 2),
      constitution: Math.floor((baseStats.constitution - 10) / 2),
      intelligence: Math.floor((baseStats.intelligence - 10) / 2),
      wisdom: Math.floor((baseStats.wisdom - 10) / 2),
      charisma: Math.floor((baseStats.charisma - 10) / 2)
    };

    // Calculate HP based on constitution and level
    const baseHP = 8 + modifiers.constitution + (level - 1) * (4 + modifiers.constitution);
    const health = {
      current: baseHP,
      max: baseHP
    };

    // Calculate AC (10 + agility modifier + equipment bonus)
    const armorClass = 10 + modifiers.agility;

    // Generate basic attack
    const attacks: Attack[] = [
      {
        name: 'Basic Attack',
        attackBonus: 2 + modifiers.strength, // Base proficiency + stat modifier
        damage: `1d6+${modifiers.strength}`, // Fixed weapon damage + stat modifier
        damageType: 'physical'
      }
    ];

    return {
      level,
      combatLevel: level,
      stats: { ...baseStats, modifiers },
      health,
      armorClass,
      attacks
    };
  }

  // Create enemy from NPC
  public createEnemyFromNPC(npcId: string, npcName: string, combatStats: CombatStats): Enemy {
    const enemy: Enemy = {
      id: `npc_enemy_${npcId}`,
      name: npcName,
      description: `Một kẻ thù nguy hiểm từng là ${npcName}.`,
      type: 'humanoid',
      npcId,
      ...combatStats,
      experienceReward: (combatStats.combatLevel || combatStats.level || 1) * 25
    };

    return enemy;
  }

  // Validate enemy data structure
  public validateEnemy(enemy: any): boolean {
    if (!enemy || typeof enemy !== 'object') return false;
    
    const requiredFields = ['id', 'name', 'description', 'type', 'stats', 'health', 'armorClass', 'attacks', 'experienceReward'];
    
    for (const field of requiredFields) {
      if (!(field in enemy)) return false;
    }

    // Validate stats structure
    const stats = enemy.stats;
    if (!stats || typeof stats !== 'object') return false;
    
    const requiredStats = ['strength', 'agility', 'constitution', 'intelligence', 'wisdom', 'charisma', 'modifiers'];
    for (const stat of requiredStats) {
      if (!(stat in stats)) return false;
    }

    // Validate health structure
    const health = enemy.health;
    if (!health || typeof health !== 'object' || typeof health.current !== 'number' || typeof health.max !== 'number') {
      return false;
    }

    // Validate attacks array
    if (!Array.isArray(enemy.attacks) || enemy.attacks.length === 0) return false;

    return true;
  }

  // Get enemies by type
  public getEnemiesByType(type: Enemy['type']): Enemy[] {
    const allEnemies = [...this.predefinedEnemies, ...Array.from(this.enemies.values())];
    return allEnemies.filter(enemy => enemy.type === type);
  }

  // Get enemies by level range
  public getEnemiesByLevel(minLevel: number, maxLevel: number): Enemy[] {
    const allEnemies = [...this.predefinedEnemies, ...Array.from(this.enemies.values())];
    return allEnemies.filter(enemy => (enemy.combatLevel || enemy.level || 1) >= minLevel && (enemy.combatLevel || enemy.level || 1) <= maxLevel);
  }

  // Clear all custom enemies
  public clearCustomEnemies(): void {
    this.enemies.clear();
    this.saveToStorage();
  }

  // Get all enemies (predefined + custom)
  public getAllEnemies(): Enemy[] {
    return [...this.predefinedEnemies, ...Array.from(this.enemies.values())];
  }
}

// Export singleton instance
export const enemyDatabaseService = EnemyDatabaseService.getInstance();
