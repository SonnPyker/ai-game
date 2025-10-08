import { Enemy, CombatStats } from '../types';
import { enemyDatabaseService } from './enemyDatabaseService';
import { geminiService } from './geminiService';

interface CombatInitiation {
  enemies: Enemy[];
  context: string;
  location?: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
}

class EnemyGenerationService {
  private static instance: EnemyGenerationService;
  private combatKeywords = [
    'chiến đấu', 'đánh nhau', 'tấn công', 'bị tấn công', 'kẻ thù', 'enemy',
    'monster', 'quái vật', 'hung dữ', 'thù địch', 'xung đột', 'conflict',
    'battle', 'combat', 'fight', 'attack', 'hostile', 'aggressive',
    'dangerous', 'nguy hiểm', 'threat', 'mối đe dọa', 'assault', 'tấn công'
  ];

  private constructor() {}

  public static getInstance(): EnemyGenerationService {
    if (!EnemyGenerationService.instance) {
      EnemyGenerationService.instance = new EnemyGenerationService();
    }
    return EnemyGenerationService.instance;
  }

  // Detect combat from AI response
  public async detectCombat(aiResponse: string, context?: any): Promise<CombatInitiation | null> {
    try {
      // Check for combat keywords
      const hasCombatKeywords = this.combatKeywords.some(keyword => 
        aiResponse.toLowerCase().includes(keyword.toLowerCase())
      );

      if (!hasCombatKeywords) return null;

      // Build enhanced context
      const enhancedContext = this.buildEnhancedContext(context);

      // Use AI to analyze and generate combat data
      const combatData = await this.generateCombatFromAI(aiResponse, enhancedContext);
      
      if (!combatData) return null;

      return combatData;
    } catch (error) {
      console.error('Error detecting combat:', error);
      return null;
    }
  }

  // Build enhanced context for better enemy generation
  private buildEnhancedContext(context?: any): any {
    if (!context) return {};

    const enhancedContext = { ...context };

    // Extract world time information
    if (context.worldTime) {
      const worldTime = context.worldTime;
      enhancedContext.timeOfDay = this.getTimeOfDay(worldTime);
      enhancedContext.season = this.getSeason(worldTime);
    }

    // Extract location information
    if (context.location) {
      enhancedContext.locationType = this.getLocationType(context.location);
      enhancedContext.weather = this.getWeatherForLocation(context.location);
    }

    // Extract character information
    if (context.character) {
      enhancedContext.characterClass = context.character.class || 'unknown';
      enhancedContext.characterBackground = context.character.background || 'unknown';
      enhancedContext.characterFaction = context.character.faction || 'unknown';
    }

    // Extract recent events
    if (context.chatHistory) {
      enhancedContext.recentEvents = this.extractRecentEvents(context.chatHistory);
    }

    // Extract NPC relationships
    if (context.npcRelationships) {
      enhancedContext.npcRelationships = context.npcRelationships;
    }

    // Extract quest context
    if (context.quests) {
      enhancedContext.questContext = this.extractQuestContext(context.quests);
    }

    return enhancedContext;
  }

  // Helper methods for context enhancement
  private getTimeOfDay(worldTime: any): string {
    if (!worldTime || !worldTime.hour) return 'unknown';
    
    const hour = worldTime.hour;
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
  }

  private getSeason(worldTime: any): string {
    if (!worldTime || !worldTime.month) return 'unknown';
    
    const month = worldTime.month;
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'autumn';
    return 'winter';
  }

  private getLocationType(location: string): string {
    const locationLower = location.toLowerCase();
    
    if (locationLower.includes('rừng') || locationLower.includes('forest')) return 'forest';
    if (locationLower.includes('thành phố') || locationLower.includes('city')) return 'city';
    if (locationLower.includes('dungeon') || locationLower.includes('hang động')) return 'dungeon';
    if (locationLower.includes('núi') || locationLower.includes('mountain')) return 'mountain';
    if (locationLower.includes('biển') || locationLower.includes('sea')) return 'sea';
    if (locationLower.includes('sa mạc') || locationLower.includes('desert')) return 'desert';
    if (locationLower.includes('làng') || locationLower.includes('village')) return 'village';
    if (locationLower.includes('lâu đài') || locationLower.includes('castle')) return 'castle';
    
    return 'unknown';
  }

  private getWeatherForLocation(location: string): string {
    const locationType = this.getLocationType(location);
    
    switch (locationType) {
      case 'forest': return 'shady';
      case 'mountain': return 'cold';
      case 'desert': return 'hot';
      case 'sea': return 'windy';
      case 'city': return 'normal';
      default: return 'normal';
    }
  }

  private extractRecentEvents(chatHistory: any[]): string[] {
    if (!Array.isArray(chatHistory)) return [];
    
    const events = [];
    const recentMessages = chatHistory.slice(-5); // Last 5 messages
    
    for (const message of recentMessages) {
      if (message.role === 'assistant' && message.content) {
        const content = message.content.toLowerCase();
        
        if (content.includes('war') || content.includes('chiến tranh')) events.push('war');
        if (content.includes('plague') || content.includes('dịch bệnh')) events.push('plague');
        if (content.includes('magic') || content.includes('phép thuật')) events.push('magic_disturbance');
        if (content.includes('political') || content.includes('chính trị')) events.push('political_conflict');
        if (content.includes('monster') || content.includes('quái vật')) events.push('monster_attack');
      }
    }
    
    return [...new Set(events)]; // Remove duplicates
  }

  private extractQuestContext(quests: any[]): string {
    if (!Array.isArray(quests) || quests.length === 0) return '';
    
    const activeQuests = quests.filter(quest => quest.status === 'active');
    if (activeQuests.length === 0) return '';
    
    const mainQuest = activeQuests.find(quest => quest.type === 'main') || activeQuests[0];
    return mainQuest.description || mainQuest.title || '';
  }

  // Generate combat data using AI
  private async generateCombatFromAI(aiResponse: string, context?: any): Promise<CombatInitiation | null> {
    try {
      const prompt = this.buildCombatAnalysisPrompt(aiResponse, context);
      const response = await geminiService.generateContent(prompt);
      
      if (!response) return null;

      // Parse AI response to extract combat data
      const combatData = this.parseCombatResponse(response);
      
      if (!combatData || combatData.enemies.length === 0) return null;

      return combatData;
    } catch (error) {
      console.error('Error generating combat from AI:', error);
      return null;
    }
  }

  // Build prompt for AI combat analysis
  private buildCombatAnalysisPrompt(aiResponse: string, context?: any): string {
    const characterLevel = context?.character?.level || 1;
    const location = context?.location || 'unknown location';
    const characterName = context?.character?.name || 'Người chơi';
    const characterClass = context?.character?.class || 'unknown';
    const worldTime = context?.worldTime || 'unknown time';
    const weather = context?.weather || 'normal';
    const season = context?.season || 'unknown';
    const faction = context?.faction || 'unknown';
    const recentEvents = context?.recentEvents || [];
    const npcRelationships = context?.npcRelationships || [];
    const questContext = context?.questContext || '';
    
    return `Phân tích đoạn văn sau và xác định xem có tình huống chiến đấu không. Nếu có, hãy tạo dữ liệu enemy phù hợp với bối cảnh chi tiết.

Đoạn văn: "${aiResponse}"

CONTEXT CHI TIẾT:
- Nhân vật: ${characterName} (Level ${characterLevel}, Class: ${characterClass})
- Vị trí: ${location}
- Thời gian: ${worldTime}
- Thời tiết: ${weather}
- Mùa: ${season}
- Phe phái: ${faction}
- Sự kiện gần đây: ${recentEvents.length > 0 ? recentEvents.join(', ') : 'Không có'}
- Quan hệ NPC: ${npcRelationships.length > 0 ? npcRelationships.map((npc: any) => `${npc.name} (${npc.status})`).join(', ') : 'Không có'}
- Bối cảnh nhiệm vụ: ${questContext}

QUY TẮC TẠO ENEMY PHÙ HỢP BỐI CẢNH:

1. **Phù hợp với địa điểm:**
   - Rừng: thú hoang, bandit, druid, ranger
   - Thành phố: guard, thief, assassin, noble
   - Dungeon: skeleton, goblin, trap, construct
   - Núi: orc, troll, dragon, elemental
   - Biển: pirate, sea monster, siren
   - Sa mạc: bandit, scorpion, djinn, nomad

2. **Phù hợp với thời gian:**
   - Ban ngày: humanoid, beast thường
   - Ban đêm: undead, demon, shadow creature
   - Hoàng hôn: transition creatures, hybrid

3. **Phù hợp với thời tiết:**
   - Mưa: water elemental, mud creature
   - Tuyết: ice elemental, winter beast
   - Nắng: fire creature, desert enemy
   - Sương mù: shadow, ghost, illusion

4. **Phù hợp với mùa:**
   - Xuân: nature creature, druid, beast
   - Hè: fire elemental, desert enemy
   - Thu: undead, harvest spirit
   - Đông: ice creature, winter beast

5. **Phù hợp với phe phái:**
   - Lawful: guard, knight, paladin
   - Chaotic: bandit, demon, anarchist
   - Neutral: mercenary, beast, elemental
   - Evil: undead, demon, cultist
   - Good: fallen angel, corrupted hero

6. **Phù hợp với sự kiện gần đây:**
   - Nếu có war: soldier, veteran, war machine
   - Nếu có plague: undead, plague bearer
   - Nếu có magic disturbance: elemental, aberration
   - Nếu có political conflict: assassin, spy, noble

7. **Phù hợp với quan hệ NPC:**
   - Nếu có enemy NPC: họ có thể xuất hiện
   - Nếu có ally NPC: có thể bị mind control
   - Nếu có neutral NPC: có thể bị thao túng

8. **Phù hợp với nhiệm vụ:**
   - Main quest: boss enemy, important foe
   - Side quest: random encounter, minor threat
   - Exploration: environmental hazard, wild beast

9. **Cân bằng độ khó:**
   - Level 1-3: weak beast, bandit, goblin
   - Level 4-6: orc, skeleton, elemental
   - Level 7-10: troll, demon, dragon
   - Level 11+: ancient creature, boss

10. **Số lượng enemy:**
    - Solo: boss, powerful creature
    - 2-3: balanced encounter
    - 4+: swarm, pack, army

Hãy trả lời theo format JSON sau nếu có combat:
{
  "hasCombat": true,
  "difficulty": "easy|medium|hard|extreme",
  "enemies": [
    {
      "name": "Tên enemy",
      "description": "Mô tả ngắn gọn",
      "type": "humanoid|beast|undead|demon|elemental|construct|other",
      "level": ${characterLevel},
      "stats": {
        "strength": 12,
        "agility": 14,
        "constitution": 10,
        "intelligence": 8,
        "wisdom": 10,
        "charisma": 8
      },
      "health": {
        "current": 15,
        "max": 15
      },
      "armorClass": 13,
      "attacks": [
        {
          "name": "Tên tấn công",
          "attackBonus": 4,
          "damage": "1d8+2",
          "damageType": "physical|magical|fire|cold|lightning|poison|psychic"
        }
      ],
      "abilities": [
        {
          "id": "ability_id",
          "name": "Tên khả năng",
          "description": "Mô tả khả năng",
          "type": "passive|active|reaction",
          "cooldown": 3,
          "effect": "Mô tả hiệu ứng"
        }
      ],
      "loot": [
        {
          "name": "Tên vật phẩm",
          "description": "Mô tả vật phẩm",
          "type": "weapon|armor|consumable|misc",
          "rarity": "common|uncommon|rare|epic|legendary|unique",
          "quantity": 1,
          "icon": "emoji",
          "damage": "1d6",
          "damageType": "physical"
        }
      ],
      "experienceReward": 50
    }
  ],
  "context": "Mô tả ngắn về tình huống combat"
}

Nếu không có combat, trả lời: {"hasCombat": false}

Lưu ý:
- Tạo 1-3 enemies tùy theo độ khó và bối cảnh
- Level enemy nên phù hợp với character level (±2 levels)
- Sử dụng damage notation DnD (1d8, 2d6+3, etc.)
- Tạo loot phù hợp với enemy type, level và bối cảnh
- Sử dụng tiếng Việt cho tên và mô tả
- Enemy phải có lý do xuất hiện trong bối cảnh này
- Tên enemy phải phù hợp với văn hóa/địa phương
- Mô tả enemy phải chi tiết và hấp dẫn
- Stats phải cân bằng và thực tế
- Abilities phải phù hợp với enemy type và level
- Loot phải có ý nghĩa trong câu chuyện

VÍ DỤ ENEMY PHÙ HỢP BỐI CẢNH:

**Rừng ban đêm mùa đông:**
- "Sói Băng Mùa Đông" (Ice Wolf) - beast, ice damage
- "Thần Rừng Tuyết" (Snow Forest Spirit) - elemental, nature magic
- "Bandit Áo Lông" (Fur-clad Bandit) - humanoid, cold resistance

**Thành phố ban ngày:**
- "Guard Thành Phố" (City Guard) - humanoid, lawful
- "Kẻ Trộm Phố Chợ" (Market Thief) - humanoid, agile
- "Noble Tham Nhũng" (Corrupt Noble) - humanoid, political

**Dungegeon cổ đại:**
- "Xác Ướp Pharaoh" (Pharaoh Mummy) - undead, ancient
- "Golem Đá Cổ" (Ancient Stone Golem) - construct, powerful
- "Linh Hồn Bị Nguyền" (Cursed Spirit) - undead, magical

Hãy tạo enemy dựa trên những quy tắc này!`;
  }

  // Parse AI response to extract combat data
  private parseCombatResponse(response: string): CombatInitiation | null {
    try {
      // Try to find JSON in response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;

      const data = JSON.parse(jsonMatch[0]);
      
      if (!data.hasCombat || !data.enemies || !Array.isArray(data.enemies)) {
        return null;
      }

      // Convert AI data to Enemy objects
      const enemies: Enemy[] = data.enemies.map((enemyData: any) => {
        const enemy: Enemy = {
          id: this.generateEnemyId(enemyData.name),
          name: enemyData.name,
          description: enemyData.description,
          type: enemyData.type || 'other',
          level: enemyData.level || 1,
          combatLevel: enemyData.combatLevel || enemyData.level || 1,
          characterLevel: enemyData.characterLevel,
          stats: this.processStats(enemyData.stats),
          health: enemyData.health || { current: 10, max: 10 },
          armorClass: enemyData.armorClass || 10,
          attacks: enemyData.attacks || [],
          abilities: enemyData.abilities || [],
          loot: enemyData.loot || [],
          experienceReward: enemyData.experienceReward || 25
        };

        return enemy;
      });

      return {
        enemies,
        context: data.context || 'Combat được phát hiện',
        difficulty: data.difficulty || 'medium'
      };
    } catch (error) {
      console.error('Error parsing combat response:', error);
      return null;
    }
  }

  // Process and validate stats
  private processStats(stats: any): CombatStats['stats'] {
    if (!stats || typeof stats !== 'object') {
      // Generate default stats
      return {
        strength: 10,
        agility: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10,
        modifiers: {
          strength: 0,
          agility: 0,
          constitution: 0,
          intelligence: 0,
          wisdom: 0,
          charisma: 0
        }
      };
    }

    const processedStats = {
      strength: Math.max(1, Math.min(30, stats.strength || 10)),
      agility: Math.max(1, Math.min(30, stats.agility || 10)),
      constitution: Math.max(1, Math.min(30, stats.constitution || 10)),
      intelligence: Math.max(1, Math.min(30, stats.intelligence || 10)),
      wisdom: Math.max(1, Math.min(30, stats.wisdom || 10)),
      charisma: Math.max(1, Math.min(30, stats.charisma || 10))
    };

    // Calculate modifiers
    const modifiers = {
      strength: Math.floor((processedStats.strength - 10) / 2),
      agility: Math.floor((processedStats.agility - 10) / 2),
      constitution: Math.floor((processedStats.constitution - 10) / 2),
      intelligence: Math.floor((processedStats.intelligence - 10) / 2),
      wisdom: Math.floor((processedStats.wisdom - 10) / 2),
      charisma: Math.floor((processedStats.charisma - 10) / 2)
    };

    return { ...processedStats, modifiers };
  }

  // Generate unique enemy ID
  private generateEnemyId(name: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    return `enemy_${cleanName}_${timestamp}_${random}`;
  }

  // Create enemy from NPC data
  public createEnemyFromNPC(npcId: string, npcName: string, npcLevel: number = 1): Enemy {
    const combatStats = enemyDatabaseService.generateRandomEnemyStats(npcLevel);
    return enemyDatabaseService.createEnemyFromNPC(npcId, npcName, combatStats);
  }

  // Generate random enemy for testing
  public generateRandomEnemy(level: number = 1, type?: Enemy['type']): Enemy {
    const combatStats = enemyDatabaseService.generateRandomEnemyStats(level);
    
    const enemyTypes = ['humanoid', 'beast', 'undead', 'demon', 'elemental', 'construct', 'other'];
    const selectedType = type || (enemyTypes[Math.floor(Math.random() * enemyTypes.length)] as Enemy['type']);
    
    const names: Record<Enemy['type'], string[]> = {
      humanoid: ['Bandit', 'Thief', 'Mercenary', 'Guard', 'Cultist'],
      beast: ['Wolf', 'Bear', 'Tiger', 'Lion', 'Eagle'],
      undead: ['Skeleton', 'Zombie', 'Wight', 'Wraith', 'Ghoul'],
      demon: ['Imp', 'Devil', 'Succubus', 'Balor', 'Pit Fiend'],
      elemental: ['Fire Spirit', 'Water Elemental', 'Earth Golem', 'Air Djinn'],
      construct: ['Golem', 'Automaton', 'Warforged', 'Clockwork'],
      other: ['Aberration', 'Outsider', 'Fey', 'Celestial']
    };

    const typeNames = names[selectedType];
    const randomName = typeNames[Math.floor(Math.random() * typeNames.length)];
    
    const enemy: Enemy = {
      id: this.generateEnemyId(randomName),
      name: randomName,
      description: `Một ${randomName.toLowerCase()} nguy hiểm.`,
      type: selectedType,
      ...combatStats,
      experienceReward: level * 25
    };

    return enemy;
  }

  // Get combat difficulty based on character level and enemy count
  public calculateCombatDifficulty(characterLevel: number, enemies: Enemy[]): 'easy' | 'medium' | 'hard' | 'extreme' {
    const totalEnemyLevel = enemies.reduce((sum, enemy) => sum + (enemy.combatLevel || enemy.level || 1), 0);
    const averageEnemyLevel = totalEnemyLevel / enemies.length;
    const levelDifference = averageEnemyLevel - characterLevel;
    const enemyCount = enemies.length;

    // Easy: enemies weaker or equal level, 1-2 enemies
    if (levelDifference <= 0 && enemyCount <= 2) return 'easy';
    
    // Medium: enemies slightly stronger or equal level, 1-3 enemies
    if (levelDifference <= 1 && enemyCount <= 3) return 'medium';
    
    // Hard: enemies significantly stronger or many enemies
    if (levelDifference <= 3 || enemyCount >= 4) return 'hard';
    
    // Extreme: very strong enemies or many strong enemies
    return 'extreme';
  }

  // Validate combat initiation
  public validateCombatInitiation(initiation: CombatInitiation): boolean {
    if (!initiation || !initiation.enemies || !Array.isArray(initiation.enemies)) {
      return false;
    }

    if (initiation.enemies.length === 0) return false;

    // Validate each enemy
    for (const enemy of initiation.enemies) {
      if (!enemyDatabaseService.validateEnemy(enemy)) {
        return false;
      }
    }

    return true;
  }
}

// Export singleton instance
export const enemyGenerationService = EnemyGenerationService.getInstance();
