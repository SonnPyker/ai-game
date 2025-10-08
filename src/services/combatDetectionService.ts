import { enemyGenerationService } from './enemyGenerationService';
import { Enemy } from '../types';

export interface CombatInitiation {
  enemies: Enemy[];
  context: string;
  location?: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
}

class CombatDetectionService {
  private static instance: CombatDetectionService;
  private combatKeywords = [
    // Vietnamese keywords
    'chiến đấu', 'đánh nhau', 'tấn công', 'bị tấn công', 'kẻ thù', 'enemy',
    'monster', 'quái vật', 'hung dữ', 'thù địch', 'xung đột', 'conflict',
    'battle', 'combat', 'fight', 'attack', 'hostile', 'aggressive',
    'dangerous', 'nguy hiểm', 'threat', 'mối đe dọa', 'assault', 'tấn công',
    'goblin', 'orc', 'skeleton', 'zombie', 'dragon', 'demon', 'beast',
    'sword', 'kiếm', 'weapon', 'vũ khí', 'blood', 'máu', 'kill', 'giết',
    'defeat', 'đánh bại', 'victory', 'chiến thắng', 'death', 'chết',
    'wound', 'thương tích', 'injury', 'bị thương', 'damage', 'sát thương',
    'magic', 'phép thuật', 'spell', 'bùa chú', 'cast', 'niệm chú',
    'shield', 'khiên', 'armor', 'giáp', 'defend', 'phòng thủ',
    'retreat', 'rút lui', 'escape', 'chạy trốn', 'flee', 'bỏ chạy',
    'ambush', 'phục kích', 'surprise', 'bất ngờ', 'stealth', 'ẩn nấp',
    'berserker', 'cuồng nộ', 'rage', 'giận dữ', 'fury', 'cơn thịnh nộ',
    'cursed', 'bị nguyền rủa', 'undead', 'bất tử', 'undead', 'xác sống',
    'elemental', 'nguyên tố', 'spirit', 'linh hồn', 'ghost', 'ma',
    'troll', 'ogre', 'giant', 'khổng lồ', 'giant', 'khổng lồ',
    'bandit', 'cướp', 'thief', 'trộm', 'assassin', 'sát thủ',
    'knight', 'hiệp sĩ', 'warrior', 'chiến binh', 'soldier', 'lính',
    'mage', 'pháp sư', 'wizard', 'phù thủy', 'sorcerer', 'pháp sư',
    'priest', 'thầy tu', 'cleric', 'tu sĩ', 'paladin', 'hiệp sĩ thánh',
    'ranger', 'thợ săn', 'archer', 'cung thủ', 'scout', 'trinh sát',
    'rogue', 'kẻ cắp', 'thief', 'trộm', 'assassin', 'sát thủ',
    'barbarian', 'man rợ', 'savage', 'hoang dã', 'wild', 'hoang dã',
    'druid', 'druid', 'shaman', 'thầy phù thủy', 'warlock', 'phù thủy',
    'necromancer', 'pháp sư bóng tối', 'dark', 'bóng tối', 'evil', 'ác',
    'chaos', 'hỗn loạn', 'order', 'trật tự', 'law', 'luật',
    'good', 'thiện', 'neutral', 'trung lập', 'evil', 'ác',
    'chaotic', 'hỗn loạn', 'lawful', 'có luật', 'neutral', 'trung lập',
    'good', 'thiện', 'evil', 'ác', 'neutral', 'trung lập'
  ];

  private constructor() {}

  public static getInstance(): CombatDetectionService {
    if (!CombatDetectionService.instance) {
      CombatDetectionService.instance = new CombatDetectionService();
    }
    return CombatDetectionService.instance;
  }

  // Detect combat from AI response
  public async detectCombat(aiResponse: string, context?: any): Promise<CombatInitiation | null> {
    try {
      // Check for combat keywords
      const hasCombatKeywords = this.combatKeywords.some(keyword => 
        aiResponse.toLowerCase().includes(keyword.toLowerCase())
      );

      if (!hasCombatKeywords) return null;

      // Use enemy generation service to create combat
      const combatData = await enemyGenerationService.detectCombat(aiResponse, context);
      
      if (!combatData) return null;

      return combatData;
    } catch (error) {
      console.error('Error detecting combat:', error);
      return null;
    }
  }

  // Check if text contains combat keywords
  public hasCombatKeywords(text: string): boolean {
    const lowerText = text.toLowerCase();
    return this.combatKeywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
  }

  // Extract combat context from text
  public extractCombatContext(text: string): {
    hasCombat: boolean;
    combatType?: string;
    enemyCount?: number;
    difficulty?: 'easy' | 'medium' | 'hard' | 'extreme';
    location?: string;
  } {
    const lowerText = text.toLowerCase();
    
    // Check for combat
    const hasCombat = this.hasCombatKeywords(lowerText);
    if (!hasCombat) {
      return { hasCombat: false };
    }

    // Extract combat type
    let combatType = 'general';
    if (lowerText.includes('goblin') || lowerText.includes('orc')) {
      combatType = 'humanoid';
    } else if (lowerText.includes('dragon') || lowerText.includes('beast')) {
      combatType = 'beast';
    } else if (lowerText.includes('skeleton') || lowerText.includes('zombie') || lowerText.includes('undead')) {
      combatType = 'undead';
    } else if (lowerText.includes('demon') || lowerText.includes('devil')) {
      combatType = 'demon';
    } else if (lowerText.includes('elemental') || lowerText.includes('spirit')) {
      combatType = 'elemental';
    }

    // Extract enemy count
    let enemyCount = 1;
    if (lowerText.includes('nhiều') || lowerText.includes('multiple') || lowerText.includes('several')) {
      enemyCount = 3;
    } else if (lowerText.includes('một nhóm') || lowerText.includes('group') || lowerText.includes('band')) {
      enemyCount = 2;
    } else if (lowerText.includes('hàng chục') || lowerText.includes('dozens')) {
      enemyCount = 5;
    }

    // Extract difficulty
    let difficulty: 'easy' | 'medium' | 'hard' | 'extreme' = 'medium';
    if (lowerText.includes('dễ') || lowerText.includes('easy') || lowerText.includes('weak')) {
      difficulty = 'easy';
    } else if (lowerText.includes('khó') || lowerText.includes('hard') || lowerText.includes('strong')) {
      difficulty = 'hard';
    } else if (lowerText.includes('rất khó') || lowerText.includes('very hard') || lowerText.includes('powerful')) {
      difficulty = 'extreme';
    }

    // Extract location
    let location: string | undefined;
    const locationKeywords = ['trong', 'ở', 'tại', 'in', 'at', 'inside', 'outside'];
    for (const keyword of locationKeywords) {
      const index = lowerText.indexOf(keyword);
      if (index !== -1) {
        const afterKeyword = lowerText.substring(index + keyword.length).trim();
        const words = afterKeyword.split(' ');
        if (words.length > 0) {
          location = words[0];
          break;
        }
      }
    }

    return {
      hasCombat: true,
      combatType,
      enemyCount,
      difficulty,
      location
    };
  }

  // Get combat intensity from text
  public getCombatIntensity(text: string): 'low' | 'medium' | 'high' | 'extreme' {
    const lowerText = text.toLowerCase();
    
    // High intensity keywords
    const highIntensityKeywords = [
      'berserker', 'cuồng nộ', 'rage', 'giận dữ', 'fury', 'cơn thịnh nộ',
      'chaos', 'hỗn loạn', 'destruction', 'phá hủy', 'devastation', 'tàn phá',
      'massacre', 'thảm sát', 'slaughter', 'giết mổ', 'carnage', 'tàn sát',
      'apocalypse', 'tận thế', 'doomsday', 'ngày tận thế', 'catastrophe', 'thảm họa'
    ];
    
    // Medium intensity keywords
    const mediumIntensityKeywords = [
      'battle', 'trận chiến', 'war', 'chiến tranh', 'conflict', 'xung đột',
      'fight', 'đánh nhau', 'combat', 'chiến đấu', 'struggle', 'đấu tranh',
      'clash', 'va chạm', 'confrontation', 'đối đầu', 'encounter', 'gặp gỡ'
    ];
    
    // Low intensity keywords
    const lowIntensityKeywords = [
      'skirmish', 'giao tranh nhỏ', 'scuffle', 'ẩu đả', 'tussle', 'vật lộn',
      'quarrel', 'cãi nhau', 'dispute', 'tranh cãi', 'argument', 'tranh luận'
    ];

    if (highIntensityKeywords.some(keyword => lowerText.includes(keyword))) {
      return 'extreme';
    }
    
    if (mediumIntensityKeywords.some(keyword => lowerText.includes(keyword))) {
      return 'high';
    }
    
    if (lowIntensityKeywords.some(keyword => lowerText.includes(keyword))) {
      return 'low';
    }
    
    return 'medium';
  }

  // Validate combat initiation
  public validateCombatInitiation(initiation: CombatInitiation): boolean {
    if (!initiation || !initiation.enemies || !Array.isArray(initiation.enemies)) {
      return false;
    }

    if (initiation.enemies.length === 0) return false;

    // Validate each enemy
    for (const enemy of initiation.enemies) {
      if (!enemy.id || !enemy.name || !enemy.stats || !enemy.health) {
        return false;
      }
    }

    return true;
  }

  // Get combat suggestions based on context
  public getCombatSuggestions(context: any): string[] {
    const suggestions: string[] = [];
    
    if (context?.location) {
      suggestions.push(`Combat tại ${context.location}`);
    }
    
    if (context?.character?.level) {
      const level = context.character.level;
      if (level <= 3) {
        suggestions.push('Combat dễ - phù hợp cho người mới');
      } else if (level <= 6) {
        suggestions.push('Combat trung bình - thử thách vừa phải');
      } else if (level <= 10) {
        suggestions.push('Combat khó - cần chiến thuật');
      } else {
        suggestions.push('Combat cực khó - thử thách tối đa');
      }
    }
    
    return suggestions;
  }
}

// Export singleton instance
export const combatDetectionService = CombatDetectionService.getInstance();

