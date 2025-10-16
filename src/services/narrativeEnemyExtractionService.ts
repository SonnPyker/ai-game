import { geminiService } from './geminiService';

interface ExtractedEnemy {
  name: string;
  confidence: number;
  context: string;
  type?: string;
}

class NarrativeEnemyExtractionService {
  private static instance: NarrativeEnemyExtractionService;

  public static getInstance(): NarrativeEnemyExtractionService {
    if (!NarrativeEnemyExtractionService.instance) {
      NarrativeEnemyExtractionService.instance = new NarrativeEnemyExtractionService();
    }
    return NarrativeEnemyExtractionService.instance;
  }

  /**
   * Extract enemy names from narrative text using AI
   */
  async extractEnemiesFromNarrative(narrative: string, sceneState: any): Promise<ExtractedEnemy[]> {
    try {
      console.log('🔍 Extracting enemies from narrative...');
      
      // First try to extract from sceneState.dangers.monsters if available
      const sceneEnemies = this.extractEnemiesFromSceneState(sceneState);
      if (sceneEnemies.length > 0) {
        console.log('✅ Found enemies in sceneState.dangers.monsters:', sceneEnemies);
        return sceneEnemies;
      }

      // If no enemies in sceneState, use AI to extract from narrative
      const aiExtractedEnemies = await this.extractEnemiesWithAI(narrative, sceneState);
      if (aiExtractedEnemies.length > 0) {
        console.log('✅ AI extracted enemies from narrative:', aiExtractedEnemies);
        return aiExtractedEnemies;
      }

      console.log('❌ No enemies found in narrative or sceneState');
      return [];
    } catch (error) {
      console.error('Error extracting enemies from narrative:', error);
      return [];
    }
  }

  /**
   * Extract enemies from sceneState.dangers.monsters
   */
  private extractEnemiesFromSceneState(sceneState: any): ExtractedEnemy[] {
    if (!sceneState?.dangers?.monsters || !Array.isArray(sceneState.dangers.monsters)) {
      return [];
    }

    return sceneState.dangers.monsters.map((monster: any) => ({
      name: monster.name || 'Unknown Enemy',
      confidence: 1.0, // High confidence since it's from structured data
      context: `Found in sceneState.dangers.monsters at ${monster.location || 'unknown location'}`,
      type: this.inferEnemyType(monster.name, monster.threat_level)
    }));
  }

  /**
   * Use AI to extract enemy names from narrative text
   */
  private async extractEnemiesWithAI(narrative: string, sceneState: any): Promise<ExtractedEnemy[]> {
    try {
      const location = sceneState?.location?.name || 'Unknown Location';
      const locationType = sceneState?.location?.type || 'unknown';
      
      const prompt = `Bạn là AI phân tích văn bản để tìm tên quái vật/enemy trong narrative.

NARRATIVE TEXT:
"${narrative}"

THÔNG TIN CONTEXT:
- Địa điểm: ${location}
- Loại địa điểm: ${locationType}

YÊU CẦU:
1. Tìm tất cả tên quái vật/enemy được đề cập trong narrative
2. Chỉ trả về những tên có tính cụ thể (không phải "con quái vật", "kẻ thù", "sinh vật")
3. Ưu tiên những tên có chữ hoa đầu hoặc tên riêng
4. Đánh giá độ tin cậy dựa trên context

ĐỊNH DẠNG JSON:
{
  "enemies": [
    {
      "name": "Tên enemy cụ thể",
      "confidence": 0.8,
      "context": "Đoạn văn chứa tên enemy",
      "type": "beast|humanoid|undead|elemental|construct|other"
    }
  ]
}

VÍ DỤ:
- "Độc Bích Hổ" → confidence: 0.9, type: "beast"
- "Ma Lang Bóng Đêm" → confidence: 0.9, type: "beast"
- "Skeleton Warrior" → confidence: 0.8, type: "undead"
- "con sói" → confidence: 0.3 (quá generic)
- "kẻ thù" → confidence: 0.1 (quá generic)

Chỉ trả về JSON, không có text khác.`;

      const response = await geminiService.generateContent(prompt);
      if (!response) {
        throw new Error('AI did not respond');
      }

      // Parse JSON response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('No JSON found in AI response for enemy extraction');
        return [];
      }

      const data = JSON.parse(jsonMatch[0]);
      
      if (!data.enemies || !Array.isArray(data.enemies)) {
        console.warn('Invalid enemy extraction response structure');
        return [];
      }

      // Filter out low confidence enemies
      return data.enemies.filter((enemy: any) => 
        enemy.name && 
        enemy.confidence > 0.5 && 
        enemy.name.length > 2
      );

    } catch (error) {
      console.error('Error extracting enemies with AI:', error);
      return [];
    }
  }

  /**
   * Infer enemy type from name and threat level
   */
  private inferEnemyType(name: string, _threatLevel?: string): string {
    const lowerName = name.toLowerCase();
    
    // Beast patterns
    if (lowerName.includes('hổ') || lowerName.includes('sói') || lowerName.includes('gấu') || 
        lowerName.includes('tiger') || lowerName.includes('wolf') || lowerName.includes('bear') ||
        lowerName.includes('lang') || lowerName.includes('thú')) {
      return 'beast';
    }
    
    // Undead patterns
    if (lowerName.includes('ma') || lowerName.includes('skeleton') || lowerName.includes('zombie') ||
        lowerName.includes('wraith') || lowerName.includes('ghost') || lowerName.includes('undead')) {
      return 'undead';
    }
    
    // Humanoid patterns
    if (lowerName.includes('warrior') || lowerName.includes('guard') || lowerName.includes('bandit') ||
        lowerName.includes('thief') || lowerName.includes('chiến binh') || lowerName.includes('cướp')) {
      return 'humanoid';
    }
    
    // Elemental patterns
    if (lowerName.includes('fire') || lowerName.includes('water') || lowerName.includes('earth') ||
        lowerName.includes('air') || lowerName.includes('lửa') || lowerName.includes('nước') ||
        lowerName.includes('đất') || lowerName.includes('gió')) {
      return 'elemental';
    }
    
    // Construct patterns
    if (lowerName.includes('golem') || lowerName.includes('construct') || lowerName.includes('automaton') ||
        lowerName.includes('robot') || lowerName.includes('máy')) {
      return 'construct';
    }
    
    return 'other';
  }

  /**
   * Get the best enemy for random encounter based on confidence and context
   */
  getBestEnemyForEncounter(extractedEnemies: ExtractedEnemy[]): ExtractedEnemy | null {
    if (extractedEnemies.length === 0) {
      return null;
    }

    // Sort by confidence (highest first)
    const sortedEnemies = extractedEnemies.sort((a, b) => b.confidence - a.confidence);
    
    // Return the highest confidence enemy
    return sortedEnemies[0];
  }

  /**
   * Check if narrative contains enemy encounter context
   */
  hasEnemyEncounterContext(narrative: string): boolean {
    const encounterKeywords = [
      'xuất hiện', 'tấn công', 'gầm gừ', 'đe dọa', 'vây hãm',
      'appears', 'attacks', 'growls', 'threatens', 'surrounds',
      'đối đầu', 'chiến đấu', 'combat', 'battle', 'fight',
      'quái vật', 'monster', 'enemy', 'kẻ thù', 'sinh vật nguy hiểm'
    ];

    const lowerNarrative = narrative.toLowerCase();
    return encounterKeywords.some(keyword => lowerNarrative.includes(keyword));
  }
}

export const narrativeEnemyExtractionService = NarrativeEnemyExtractionService.getInstance();
