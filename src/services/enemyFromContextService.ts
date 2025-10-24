import { NPCRelationship, CombatStats, SCCState } from '../types';
// import { npcRelationshipService } from './npcRelationshipService';
import { geminiService } from './geminiService';

interface EnemyCreationResult {
  enemy: NPCRelationship | null;
  shouldSaveToRelationships: boolean;
}

class EnemyFromContextService {
  private static instance: EnemyFromContextService;

  public static getInstance(): EnemyFromContextService {
    if (!EnemyFromContextService.instance) {
      EnemyFromContextService.instance = new EnemyFromContextService();
    }
    return EnemyFromContextService.instance;
  }

  /**
   * Tạo enemy từ scene context
   */
  async createEnemyFromContext(
    enemyName: string,
    sceneState: SCCState,
    playerLevel: number
  ): Promise<EnemyCreationResult> {
    try {
      
      // Tìm enemy trong scene.npcs[] trước
      const sceneNPC = this.findEnemyInScene(enemyName, sceneState);
      
      // Quyết định có nên lưu vào relationships không
      const shouldSave = this.shouldSaveEnemy(enemyName, sceneNPC);
      
      // Generate combat stats
      const combatStats = await this.generateEnemyCombatStatsWithAI(
        enemyName,
        sceneNPC,
        playerLevel,
        sceneState
      );
      
      if (!combatStats) {
        console.error('Failed to generate combat stats for enemy');
        return { enemy: null, shouldSaveToRelationships: false };
      }
      
      // Tạo NPCRelationship object
      const enemy: NPCRelationship = {
        id: `enemy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: enemyName,
        description: sceneNPC?.description || `Một ${enemyName} xuất hiện trong scene.`,
        level: combatStats.characterLevel || combatStats.combatLevel || 1,
        relationshipLevel: -50, // Hostile by default
        reputation: -30, // Negative reputation
        status: 'hostile',
        lastInteraction: new Date(),
        totalInteractions: 0,
        notes: [`Enemy được tạo từ context: ${sceneState.location?.name || 'Unknown location'}`],
        tags: ['enemy', 'combat'],
        location: sceneState.location?.name,
        canBeCombatant: true,
        combatStats: combatStats
      };
      
      return { enemy, shouldSaveToRelationships: shouldSave };
      
    } catch (error) {
      console.error('Error creating enemy from context:', error);
      return { enemy: null, shouldSaveToRelationships: false };
    }
  }

  /**
   * Kiểm tra xem có nên lưu enemy vào relationships không
   */
  private shouldSaveEnemy(enemyName: string, sceneNPC?: any): boolean {
    // Không lưu nếu tên quá ngắn
    if (enemyName.length < 3) return false;
    
    // Không lưu nếu tên generic
    const genericPatterns = [
      /^con\s+/i, // "con sói", "con gấu"
      /^tên\s+/i, // "tên cướp", "tên trộm"
      /^kẻ\s+/i, // "kẻ thù", "kẻ xấu"
      /^những\s+/i, // "những người"
      /^các\s+/i, // "các tên"
      /^đám\s+/i, // "đám cướp"
      /^bọn\s+/i, // "bọn trộm"
      /^lũ\s+/i, // "lũ quái vật"
      /^bầy\s+/i, // "bầy sói"
      /^đoàn\s+/i, // "đoàn quân"
      /^tập\s+/i, // "tập thể"
      /^nhóm\s+/i, // "nhóm người"
    ];
    
    for (const pattern of genericPatterns) {
      if (pattern.test(enemyName)) {
        return false;
      }
    }
    
    // Lưu nếu tên cụ thể (có chữ hoa đầu hoặc tên riêng)
    const isSpecificName = /^[A-Z]/.test(enemyName) || 
                          enemyName.includes(' ') || 
                          enemyName.length > 6;
    
    // Nếu có sceneNPC với description chi tiết, ưu tiên lưu
    if (sceneNPC?.description && sceneNPC.description.length > 20) {
      return true;
    }
    
    return isSpecificName;
  }

  /**
   * Tìm NPC info từ sceneState.npcs[]
   */
  private findEnemyInScene(enemyName: string, sceneState: SCCState): any {
    if (!sceneState.npcs || !Array.isArray(sceneState.npcs)) {
      return null;
    }
    
    // Tìm exact match trước
    let sceneNPC = sceneState.npcs.find(npc => 
      npc.name && npc.name.toLowerCase() === enemyName.toLowerCase()
    );
    
    if (sceneNPC) {
      return sceneNPC;
    }
    
    // Tìm partial match
    sceneNPC = sceneState.npcs.find(npc => 
      npc.name && (
        npc.name.toLowerCase().includes(enemyName.toLowerCase()) ||
        enemyName.toLowerCase().includes(npc.name.toLowerCase())
      )
    );
    
    if (sceneNPC) {
      return sceneNPC;
    }
    
    return null;
  }

  /**
   * Generate combat stats sử dụng AI
   */
  private async generateEnemyCombatStatsWithAI(
    enemyName: string,
    sceneNPC: any,
    playerLevel: number,
    sceneState: SCCState
  ): Promise<CombatStats | null> {
    try {
      // Nếu có sceneNPC với đủ thông tin, dùng thông tin đó
      if (sceneNPC && sceneNPC.description && sceneNPC.role) {
        return this.generateStatsFromSceneNPC(sceneNPC, playerLevel);
      }
      
      // Nếu không có sceneNPC, dùng AI với context
      const prompt = this.buildEnemyStatsPrompt(enemyName, sceneState, playerLevel);
      
      const gemini = geminiService;
      const response = await gemini.generateContent(prompt);
      
      if (!response) {
        throw new Error('AI did not respond');
      }
      
      const combatStats = this.parseEnemyStatsResponse(response);
      if (!combatStats) {
        throw new Error('Failed to parse AI response');
      }
      
      return combatStats;
      
    } catch (error) {
      console.error('Error generating enemy combat stats with AI:', error);
      
      // Fallback: tạo stats cơ bản
      return this.generateBasicEnemyStats(enemyName, playerLevel);
    }
  }

  /**
   * Generate stats từ scene NPC info
   */
  private generateStatsFromSceneNPC(sceneNPC: any, playerLevel: number): CombatStats {
    const baseLevel = Math.max(1, Math.min(10, playerLevel + Math.floor(Math.random() * 3) - 1));
    
    // Dựa trên role để xác định stats
    const role = sceneNPC.role?.toLowerCase() || '';
    const mood = sceneNPC.mood?.toLowerCase() || '';
    
    let strength = 10, agility = 10, constitution = 10;
    let intelligence = 10, wisdom = 10, charisma = 10;
    
    // Adjust stats based on role
    if (role.includes('guard') || role.includes('soldier') || role.includes('warrior')) {
      strength = 14 + Math.floor(Math.random() * 4);
      constitution = 13 + Math.floor(Math.random() * 3);
    } else if (role.includes('thief') || role.includes('rogue') || role.includes('assassin')) {
      agility = 14 + Math.floor(Math.random() * 4);
      intelligence = 13 + Math.floor(Math.random() * 3);
    } else if (role.includes('mage') || role.includes('wizard') || role.includes('sorcerer')) {
      intelligence = 15 + Math.floor(Math.random() * 3);
      wisdom = 13 + Math.floor(Math.random() * 3);
    } else if (role.includes('priest') || role.includes('cleric') || role.includes('healer')) {
      wisdom = 14 + Math.floor(Math.random() * 4);
      charisma = 13 + Math.floor(Math.random() * 3);
    } else {
      // Default stats with some variation
      strength = 10 + Math.floor(Math.random() * 6);
      agility = 10 + Math.floor(Math.random() * 6);
      constitution = 10 + Math.floor(Math.random() * 6);
      intelligence = 10 + Math.floor(Math.random() * 6);
      wisdom = 10 + Math.floor(Math.random() * 6);
      charisma = 10 + Math.floor(Math.random() * 6);
    }
    
    // Adjust based on mood
    if (mood.includes('angry') || mood.includes('hostile')) {
      strength += 2;
      constitution += 1;
    } else if (mood.includes('cunning') || mood.includes('sneaky')) {
      agility += 2;
      intelligence += 1;
    }
    
    // Clamp stats
    strength = Math.max(8, Math.min(20, strength));
    agility = Math.max(8, Math.min(20, agility));
    constitution = Math.max(8, Math.min(20, constitution));
    intelligence = Math.max(8, Math.min(20, intelligence));
    wisdom = Math.max(8, Math.min(20, wisdom));
    charisma = Math.max(8, Math.min(20, charisma));
    
    const modifiers = {
      strength: Math.floor((strength - 10) / 2),
      agility: Math.floor((agility - 10) / 2),
      constitution: Math.floor((constitution - 10) / 2),
      intelligence: Math.floor((intelligence - 10) / 2),
      wisdom: Math.floor((wisdom - 10) / 2),
      charisma: Math.floor((charisma - 10) / 2)
    };
    
    const maxHP = Math.max(8, baseLevel * 4 + modifiers.constitution);
    const armorClass = 10 + modifiers.agility + Math.floor(Math.random() * 3);
    
    return {
      combatLevel: baseLevel,
      characterLevel: baseLevel,
      stats: {
        strength,
        agility,
        constitution,
        intelligence,
        wisdom,
        charisma,
        modifiers
      },
      health: {
        current: maxHP,
        max: maxHP
      },
      armorClass,
      attacks: [{
        name: this.generateAttackName(role, mood),
        attackBonus: 2 + Math.max(modifiers.strength, modifiers.agility) + Math.floor(baseLevel / 2),
        damage: `${Math.floor(baseLevel / 2) + 1}d4+${Math.max(modifiers.strength, modifiers.agility)}`,
        damageType: 'bludgeoning' as const
      }],
      abilities: []
    };
  }

  /**
   * Generate basic enemy stats (fallback)
   */
  private generateBasicEnemyStats(_enemyName: string, playerLevel: number): CombatStats {
    const baseLevel = Math.max(1, Math.min(10, playerLevel + Math.floor(Math.random() * 3) - 1));
    
    // Basic stats
    const strength = 10 + Math.floor(Math.random() * 6);
    const agility = 10 + Math.floor(Math.random() * 6);
    const constitution = 10 + Math.floor(Math.random() * 6);
    const intelligence = 8 + Math.floor(Math.random() * 4);
    const wisdom = 8 + Math.floor(Math.random() * 4);
    const charisma = 8 + Math.floor(Math.random() * 4);
    
    const modifiers = {
      strength: Math.floor((strength - 10) / 2),
      agility: Math.floor((agility - 10) / 2),
      constitution: Math.floor((constitution - 10) / 2),
      intelligence: Math.floor((intelligence - 10) / 2),
      wisdom: Math.floor((wisdom - 10) / 2),
      charisma: Math.floor((charisma - 10) / 2)
    };
    
    const maxHP = Math.max(8, baseLevel * 4 + modifiers.constitution);
    const armorClass = 10 + modifiers.agility;
    
    return {
      combatLevel: baseLevel,
      characterLevel: baseLevel,
      stats: {
        strength,
        agility,
        constitution,
        intelligence,
        wisdom,
        charisma,
        modifiers
      },
      health: {
        current: maxHP,
        max: maxHP
      },
      armorClass,
      attacks: [{
        name: "Tấn công cơ bản",
        attackBonus: 2 + Math.max(modifiers.strength, modifiers.agility) + Math.floor(baseLevel / 2),
        damage: `${Math.floor(baseLevel / 2) + 1}d4+${Math.max(modifiers.strength, modifiers.agility)}`,
        damageType: 'bludgeoning' as const
      }],
      abilities: []
    };
  }

  /**
   * Build AI prompt for enemy stats generation
   */
  private buildEnemyStatsPrompt(enemyName: string, sceneState: SCCState, playerLevel: number): string {
    const location = sceneState.location?.name || 'Unknown';
    const locationType = sceneState.location?.type || 'unknown';
    const atmosphere = sceneState.location?.atmosphere || 'normal';
    const environment = sceneState.environment;
    
    return `Tạo combat stats cho enemy trong game RPG dựa trên thông tin sau:

THÔNG TIN ENEMY:
- Tên: "${enemyName}"

THÔNG TIN SCENE:
- Địa điểm: ${location}
- Loại địa điểm: ${locationType}
- Không khí: ${atmosphere}
- Ánh sáng: ${environment?.lighting || 'normal'}
- Thời tiết: ${environment?.temperature || 'normal'}

THÔNG TIN PLAYER:
- Level: ${playerLevel}

QUY TẮC TẠO COMBAT STATS:
1. **Combat Level**: 1-10, dựa trên player level ±1-2
2. **Stats**: 8-20, phù hợp với loại enemy
3. **Health**: dựa trên level và constitution
4. **Armor Class**: 10-20, dựa trên agility và equipment
5. **Attacks**: 1 attack cơ bản phù hợp với enemy type

Dựa trên tên "${enemyName}" và context "${location}", hãy tạo JSON:

{
  "combatLevel": ${Math.max(1, Math.min(10, playerLevel + Math.floor(Math.random() * 3) - 1))},
  "characterLevel": ${Math.max(1, Math.min(10, playerLevel + Math.floor(Math.random() * 3) - 1))},
  "stats": {
    "strength": 10-18,
    "agility": 10-18,
    "constitution": 10-18,
    "intelligence": 8-16,
    "wisdom": 8-16,
    "charisma": 8-16,
    "modifiers": {
      "strength": "Math.floor((strength - 10) / 2)",
      "agility": "Math.floor((agility - 10) / 2)",
      "constitution": "Math.floor((constitution - 10) / 2)",
      "intelligence": "Math.floor((intelligence - 10) / 2)",
      "wisdom": "Math.floor((wisdom - 10) / 2)",
      "charisma": "Math.floor((charisma - 10) / 2)"
    }
  },
  "health": {
    "current": "maxHP",
    "max": "maxHP"
  },
  "armorClass": 10-18,
  "attacks": [{
    "name": "Tên attack phù hợp",
    "attackBonus": "2 + max(strength_mod, agility_mod) + level/2",
    "damage": "level/2+1d4 + max(strength_mod, agility_mod)",
    "damageType": "physical"
  }],
  "abilities": [],
  "description": "Mô tả ngắn về enemy"
}

Chỉ trả về JSON, không có text khác.`;
  }

  /**
   * Parse AI response thành CombatStats
   */
  private parseEnemyStatsResponse(response: string): CombatStats | null {
    try {
      // Clean response
      let cleanResponse = response.trim();
      
      // Remove any text before/after JSON
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('No JSON found in AI response');
        return null;
      }
      
      let jsonString = jsonMatch[0];
      
      // Clean up common JSON issues
      jsonString = jsonString
        .replace(/undefined/g, 'null')
        .replace(/,(\s*[}\]])/g, '$1')
        .replace(/([{,]\s*)(\w+):/g, '$1"$2":');
      
      const data = JSON.parse(jsonString);
      
      // Validate required fields
      if (!data.stats || !data.health || !data.armorClass || !data.attacks) {
        console.warn('Invalid combat stats structure from AI');
        return null;
      }
      
      // Ensure modifiers are calculated
      if (!data.stats.modifiers) {
        data.stats.modifiers = {
          strength: Math.floor((data.stats.strength - 10) / 2),
          agility: Math.floor((data.stats.agility - 10) / 2),
          constitution: Math.floor((data.stats.constitution - 10) / 2),
          intelligence: Math.floor((data.stats.intelligence - 10) / 2),
          wisdom: Math.floor((data.stats.wisdom - 10) / 2),
          charisma: Math.floor((data.stats.charisma - 10) / 2)
        };
      }
      
      return data as CombatStats;
      
    } catch (error) {
      console.error('Error parsing enemy stats response:', error);
      return null;
    }
  }

  /**
   * Generate attack name based on role and mood
   */
  private generateAttackName(role: string, mood: string): string {
    const attacks = [
      'Tấn công cơ bản', 'Cú đấm', 'Cú đá', 'Tấn công tay không',
      'Vũ khí cầm tay', 'Tấn công tự vệ', 'Đòn tay không'
    ];
    
    if (role.includes('guard') || role.includes('soldier')) {
      return 'Tấn công vũ trang';
    } else if (role.includes('thief') || role.includes('rogue')) {
      return 'Tấn công lén lút';
    } else if (role.includes('mage') || role.includes('wizard')) {
      return 'Tấn công ma thuật';
    } else if (mood.includes('angry') || mood.includes('hostile')) {
      return 'Tấn công tức giận';
    }
    
    return attacks[Math.floor(Math.random() * attacks.length)];
  }
}

export const enemyFromContextService = EnemyFromContextService.getInstance();
