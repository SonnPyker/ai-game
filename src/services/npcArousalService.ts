import { NPCRelationship, ArousalEvent, ArousalPersonality, ArousalPreferences, ContentFlags } from '../types';

class NPCArousalService {
  private static instance: NPCArousalService;
  private arousalCache: Map<string, any> = new Map();
  // private readonly CACHE_SIZE_LIMIT = 30;

  private constructor() {}

  static getInstance(): NPCArousalService {
    if (!NPCArousalService.instance) {
      NPCArousalService.instance = new NPCArousalService();
    }
    return NPCArousalService.instance;
  }

  // Initialize arousal system for NPC
  initializeArousalForNPC(npc: NPCRelationship): NPCRelationship {
    if (npc.arousal) {
      return npc; // Already initialized
    }

    const arousalPersonality = this.generateArousalPersonality(npc);
    const arousalPreferences = this.generateArousalPreferences(npc);

    npc.arousal = {
      level: 0,
      lastArousalChange: new Date(),
      arousalHistory: [],
      personality: arousalPersonality,
      preferences: arousalPreferences
    };

    return npc;
  }

  // Generate arousal personality based on NPC characteristics
  private generateArousalPersonality(npc: NPCRelationship): ArousalPersonality {
    // Use NPC name as seed for consistent personality
    const seed = npc.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const random = (seed * 9301 + 49297) % 233280 / 233280;

    // Base personality traits
    let responsiveness = Math.floor(20 + (random * 60)); // 20-80
    let inhibition = Math.floor(30 + (random * 50)); // 30-80
    let curiosity = Math.floor(25 + (random * 55)); // 25-80
    let experience = Math.floor(15 + (random * 70)); // 15-85
    let dominance = Math.floor(20 + (random * 60)); // 20-80
    let romanticism = Math.floor(30 + (random * 50)); // 30-80

    // Adjust based on relationship level
    if (npc.relationshipLevel > 50) {
      responsiveness = Math.min(100, responsiveness + 10);
      inhibition = Math.max(0, inhibition - 5);
      romanticism = Math.min(100, romanticism + 15);
    } else if (npc.relationshipLevel < -30) {
      responsiveness = Math.max(0, responsiveness - 15);
      inhibition = Math.min(100, inhibition + 10);
      romanticism = Math.max(0, romanticism - 10);
    }

    // Adjust based on reputation
    if (npc.reputation > 30) {
      inhibition = Math.min(100, inhibition + 5);
      romanticism = Math.min(100, romanticism + 5);
    } else if (npc.reputation < -20) {
      inhibition = Math.max(0, inhibition - 5);
      experience = Math.min(100, experience + 10);
    }

    // Adjust based on tags
    if (npc.tags?.includes('noble') || npc.tags?.includes('royal')) {
      inhibition = Math.min(100, inhibition + 10);
      romanticism = Math.min(100, romanticism + 10);
    }
    if (npc.tags?.includes('merchant') || npc.tags?.includes('trader')) {
      experience = Math.min(100, experience + 10);
      curiosity = Math.min(100, curiosity + 5);
    }
    if (npc.tags?.includes('warrior') || npc.tags?.includes('soldier')) {
      dominance = Math.min(100, dominance + 10);
      inhibition = Math.max(0, inhibition - 5);
    }

    return {
      responsiveness: Math.max(0, Math.min(100, responsiveness)),
      inhibition: Math.max(0, Math.min(100, inhibition)),
      curiosity: Math.max(0, Math.min(100, curiosity)),
      experience: Math.max(0, Math.min(100, experience)),
      dominance: Math.max(0, Math.min(100, dominance)),
      romanticism: Math.max(0, Math.min(100, romanticism))
    };
  }

  // Generate arousal preferences based on NPC characteristics
  private generateArousalPreferences(npc: NPCRelationship): ArousalPreferences {
    const seed = npc.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const random = (seed * 9301 + 49297) % 233280 / 233280;

    const personalityTypes = [
      'confident', 'mysterious', 'caring', 'intelligent', 'humorous',
      'adventurous', 'gentle', 'passionate', 'loyal', 'independent'
    ];

    const turnOns = [
      'intelligence', 'humor', 'kindness', 'confidence', 'mystery',
      'adventure', 'romance', 'loyalty', 'passion', 'gentleness'
    ];

    const turnOffs = [
      'rudeness', 'aggression', 'dishonesty', 'arrogance', 'cruelty',
      'cowardice', 'selfishness', 'ignorance', 'violence', 'betrayal'
    ];

    const kinks = [
      'romance', 'adventure', 'intimacy', 'mystery', 'passion',
      'loyalty', 'gentleness', 'confidence', 'humor', 'intelligence'
    ];

    const boundaries = [
      'no violence', 'no public', 'no drugs', 'no coercion', 'no minors',
      'respect boundaries', 'consent required', 'no humiliation'
    ];

    // Select preferences based on random seed
    const selectedPersonalityTypes = this.selectRandomItems(personalityTypes, 3, random);
    const selectedTurnOns = this.selectRandomItems(turnOns, 4, random + 0.1);
    const selectedTurnOffs = this.selectRandomItems(turnOffs, 3, random + 0.2);
    const selectedKinks = this.selectRandomItems(kinks, 4, random + 0.3);
    const selectedBoundaries = this.selectRandomItems(boundaries, 5, random + 0.4);

    return {
      genderPreference: this.selectGenderPreference(random),
      agePreference: this.selectAgePreference(random + 0.5),
      personalityTypes: selectedPersonalityTypes,
      turnOns: selectedTurnOns,
      turnOffs: selectedTurnOffs,
      kinks: selectedKinks,
      boundaries: selectedBoundaries
    };
  }

  private selectRandomItems<T>(items: T[], count: number, seed: number): T[] {
    const shuffled = [...items].sort(() => 0.5 - seed);
    return shuffled.slice(0, count);
  }

  private selectGenderPreference(seed: number): 'male' | 'female' | 'any' | 'none' {
    const rand = (seed * 100) % 100;
    if (rand < 25) return 'male';
    if (rand < 50) return 'female';
    if (rand < 80) return 'any';
    return 'none';
  }

  private selectAgePreference(seed: number): 'younger' | 'same' | 'older' | 'any' {
    const rand = (seed * 100) % 100;
    if (rand < 30) return 'younger';
    if (rand < 60) return 'same';
    if (rand < 85) return 'older';
    return 'any';
  }

  // Analyze arousal from narrative and context
  async analyzeArousalFromNarrative(
    narrative: string,
    npc: NPCRelationship,
    additionalContext?: {
      chatHistory?: Array<{ role: string; content: string }>;
      sceneState?: any;
      sccSummary?: any;
      playerAction?: string;
      contentFlags?: ContentFlags;
    }
  ): Promise<{
    arousalChange: number;
    reason: string;
    context: string;
    intensity: 'low' | 'medium' | 'high';
  }> {
    // Only process if adult content is enabled and direct mode
    if (!additionalContext?.contentFlags?.adult_enabled || 
        additionalContext.contentFlags.adult_intensity === 'fade' || 
        additionalContext.contentFlags.adult_intensity === 'light') {
      return {
        arousalChange: 0,
        reason: 'Adult content disabled or not in direct mode',
        context: 'System restriction',
        intensity: 'low'
      };
    }

    // Initialize arousal if not exists
    if (!npc.arousal) {
      this.initializeArousalForNPC(npc);
    }

    try {
      const { geminiService } = await import('../services/geminiService');
      
      if (!geminiService.isConfigured()) {
        return this.fallbackArousalAnalysis(narrative, npc, additionalContext);
      }

      const prompt = this.buildArousalAnalysisPrompt(narrative, npc, additionalContext);
      const responseText = await geminiService.generateContent(prompt);
      const result = this.parseArousalResponse(responseText);

      // Apply realistic bounds and adjustments
      let arousalChange = result.arousalChange || 0;
      
      // Apply realistic bounds based on personality
      if (npc.arousal) {
        const arousal = npc.arousal;
        
        // Adjust based on inhibition (higher inhibition = less extreme changes)
        const inhibitionFactor = (100 - arousal.personality.inhibition) / 100;
        arousalChange = Math.floor(arousalChange * inhibitionFactor);
        
        // Adjust based on experience (more experience = more controlled response)
        const experienceFactor = (100 - arousal.personality.experience) / 100;
        arousalChange = Math.floor(arousalChange * (0.5 + experienceFactor * 0.5));
        
        // Adjust based on current arousal level (diminishing returns)
        const currentLevel = arousal.level;
        if (currentLevel > 80) {
          if (arousalChange > 0) {
            arousalChange = Math.floor(arousalChange * 0.6);
          }
        } else if (currentLevel < 20) {
          if (arousalChange > 0) {
            arousalChange = Math.floor(arousalChange * 0.8);
          }
        }
        
        // Adjust based on relationship level
        if (npc.relationshipLevel > 50) {
          arousalChange = Math.floor(arousalChange * 1.2);
        } else if (npc.relationshipLevel < -30) {
          if (arousalChange > 0) {
            arousalChange = Math.floor(arousalChange * 0.4);
          } else {
            arousalChange = Math.floor(arousalChange * 1.1);
          }
        }
      }
      
      // Apply realistic bounds
      arousalChange = Math.max(-40, Math.min(40, arousalChange));

      return {
        arousalChange,
        reason: result.reason || 'Unknown reason',
        context: result.context || 'General interaction',
        intensity: result.intensity || 'low'
      };

    } catch (error) {
      console.warn('⚠️ AI arousal analysis failed, using fallback:', error);
      return this.fallbackArousalAnalysis(narrative, npc, additionalContext);
    }
  }

  // Detect consciousness level from narrative (same as in NPCRelationshipService)
  private detectConsciousnessLevel(narrative: string): number {
    const lowerNarrative = narrative.toLowerCase();
    
    // Hoàn toàn mất ý thức
    if (lowerNarrative.includes('bất tỉnh') || lowerNarrative.includes('unconscious') || 
        lowerNarrative.includes('ngất') || lowerNarrative.includes('fainted') ||
        lowerNarrative.includes('ngủ sâu') || lowerNarrative.includes('deep sleep') ||
        lowerNarrative.includes('chuốc thuốc') || lowerNarrative.includes('drugged') ||
        lowerNarrative.includes('thuốc ngủ') || lowerNarrative.includes('sleeping potion') ||
        lowerNarrative.includes('vô thức') || lowerNarrative.includes('không hay biết') ||
        lowerNarrative.includes('chìm trong giấc ngủ') || lowerNarrative.includes('ngủ say') ||
        lowerNarrative.includes('không tỉnh') || lowerNarrative.includes('bất động')) {
      return 0;
    }
    
    // Mất ý thức một phần (ngủ)
    if (lowerNarrative.includes('ngủ') || lowerNarrative.includes('sleeping') ||
        lowerNarrative.includes('asleep') || lowerNarrative.includes('đang ngủ') ||
        lowerNarrative.includes('giấc ngủ') || lowerNarrative.includes('ngủ say')) {
      return 0.3;
    }
    
    // Mơ màng
    if (lowerNarrative.includes('mơ màng') || lowerNarrative.includes('drowsy') ||
        lowerNarrative.includes('semi-conscious') || lowerNarrative.includes('nửa tỉnh nửa mê') ||
        lowerNarrative.includes('say') || lowerNarrative.includes('drunk') ||
        lowerNarrative.includes('intoxicated') || lowerNarrative.includes('lơ mơ')) {
      return 0.5;
    }
    
    // Ý thức bình thường
    return 1.0;
  }

  private buildArousalAnalysisPrompt(
    narrative: string,
    npc: NPCRelationship,
    additionalContext?: {
      chatHistory?: Array<{ role: string; content: string }>;
      sceneState?: any;
      sccSummary?: any;
      playerAction?: string;
      contentFlags?: ContentFlags;
    }
  ): string {
    const arousal = npc.arousal!;
    
    // Build scene state context
    const sceneStateContext = this.buildSceneStateContext(additionalContext?.sceneState);
    
    // Build chat history context
    const chatHistoryContext = this.buildChatHistoryContext(additionalContext?.chatHistory);
    
    // Build player action context
    const playerActionContext = additionalContext?.playerAction ? 
      `\nHÀNH ĐỘNG NGƯỜI CHƠI: "${additionalContext.playerAction}"` : '';
    
    // Detect consciousness level for special handling
    const consciousnessLevel = this.detectConsciousnessLevel(narrative);
    const isUnconscious = consciousnessLevel <= 0.3;
    const isSemiConscious = consciousnessLevel <= 0.5;
    
    return `Bạn là AI phân tích mức độ hứng tình của NPC trong bối cảnh 18+.

NGỮ CẢNH:
- Narrative: "${narrative}"
- NPC: "${npc.name}"
- Mức hứng tình hiện tại: ${arousal.level}/100
- Mức độ quan hệ: ${Math.round(npc.relationshipLevel)}/100
- Danh tiếng: ${Math.round(npc.reputation)}/100
- Trạng thái ý thức: ${isUnconscious ? 'MẤT Ý THỨC' : isSemiConscious ? 'MƠ MÀNG' : 'TỈNH TÁO'}

TÍNH CÁCH NPC:
- Responsiveness (dễ bị kích thích): ${arousal.personality.responsiveness}/100
- Inhibition (ức chế): ${arousal.personality.inhibition}/100
- Curiosity (tò mò): ${arousal.personality.curiosity}/100
- Experience (kinh nghiệm): ${arousal.personality.experience}/100
- Dominance (thống trị): ${arousal.personality.dominance}/100
- Romanticism (lãng mạn): ${arousal.personality.romanticism}/100

SỞ THÍCH:
- Turn-ons: ${arousal.preferences.turnOns.join(', ')}
- Turn-offs: ${arousal.preferences.turnOffs.join(', ')}
- Kinks: ${arousal.preferences.kinks.join(', ')}
- Boundaries: ${arousal.preferences.boundaries.join(', ')}

${sceneStateContext}

${chatHistoryContext}${playerActionContext}

NGUYÊN TẮC PHÂN TÍCH ĐẶC BIỆT:
${isUnconscious ? `
⚠️ TRẠNG THÁI MẤT Ý THỨC:
- NPC đang mất ý thức hoàn toàn (ngủ sâu, bất tỉnh, chuốc thuốc)
- Hành động kích thích vẫn có tác động lên cơ thể và phản ứng sinh lý
- Arousal vẫn tăng nhưng NHẸ HƠN (40% so với bình thường)
- Phản ứng có thể là vô thức, co thắt cơ, thay đổi nhịp thở
- Không có sự đồng ý có ý thức nhưng cơ thể vẫn phản ứng

PHẢN ỨNG SINH LÝ VÔ THỨC (TĂNG NHẸ):
- Co thắt cơ bắp, run rẩy nhẹ
- Thay đổi nhịp thở (nhanh hơn, sâu hơn)
- Tiết dịch tự nhiên (dù không có ý thức)
- Thay đổi nhiệt độ cơ thể
- Phản ứng cơ thể tự động với kích thích
- Các phản xạ sinh lý không kiểm soát được
- LƯU Ý: Phản ứng vô thức chỉ tăng arousal nhẹ, không mạnh như có ý thức
` : isSemiConscious ? `
⚠️ TRẠNG THÁI MƠ MÀNG:
- NPC đang trong trạng thái mơ màng, nửa tỉnh nửa mê
- Phản ứng có thể chậm chạp hoặc không rõ ràng
- Arousal tăng NHẸ HƠN (60% so với bình thường)
- Có thể có phản ứng vô thức hoặc mơ màng

PHẢN ỨNG SINH LÝ MƠ MÀNG (TĂNG NHẸ):
- Phản ứng chậm chạp nhưng vẫn có
- Có thể có tiếng thở dài, rên rỉ nhẹ
- Cơ thể phản ứng một cách mơ hồ
- Có thể có co thắt nhẹ hoặc run rẩy
- LƯU Ý: Phản ứng mơ màng chỉ tăng arousal nhẹ hơn so với tỉnh táo
` : `
✅ TRẠNG THÁI TỈNH TÁO:
- NPC hoàn toàn tỉnh táo và có ý thức
- Phản ứng bình thường dựa trên tính cách và sở thích
- Arousal tăng 100% theo logic thông thường

PHẢN ỨNG SINH LÝ CÓ Ý THỨC:
- Phản ứng rõ ràng và có kiểm soát
- Có thể có sự đồng ý hoặc từ chối
- Phản ứng dựa trên tính cách và sở thích
`}

NGUYÊN TẮC PHÂN TÍCH CHUNG:
1. Phân tích dựa trên tính cách và sở thích của NPC
2. Xem xét mức độ quan hệ hiện tại
3. Đánh giá ngữ cảnh và tình huống
4. Giữ tính chân thực và nhất quán
5. Tôn trọng ranh giới và sở thích của NPC
6. Xem xét trạng thái ý thức của NPC
7. QUAN TRỌNG: Phản ứng sinh lý vô thức VẪN ĐƯỢC TÍNH VÀO AROUSAL NHƯNG TĂNG NHẸ
8. Cơ thể phản ứng độc lập với ý thức và ý muốn
9. Co thắt cơ, thay đổi nhịp thở, tiết dịch = tăng arousal nhẹ
10. Phản xạ sinh lý tự nhiên không thể kiểm soát được
11. Phản ứng vô thức chỉ tăng arousal nhẹ, không mạnh như có ý thức

SCORING GUIDELINES:
AROUSAL CHANGE (-50 to +50):
- Hành động rất kích thích, phù hợp sở thích: +20 to +50
- Hành động kích thích vừa phải: +5 to +20
- Hành động trung tính: -5 to +5
- Hành động không phù hợp: -10 to -30
- Hành động vi phạm ranh giới: -30 to -50

QUAN TRỌNG VỀ PHẢN ỨNG SINH LÝ:
- Phản ứng sinh lý vô thức VẪN ĐƯỢC TÍNH VÀO AROUSAL NHƯNG TĂNG NHẸ
- Ngay cả khi hành động trái với ý muốn, cơ thể vẫn phản ứng
- Co thắt cơ, thay đổi nhịp thở, tiết dịch = tăng arousal nhẹ
- Phản xạ sinh lý tự nhiên không thể kiểm soát được
- Cơ thể phản ứng độc lập với ý thức và ý muốn
- LƯU Ý: Phản ứng vô thức chỉ tăng arousal nhẹ, không mạnh như có ý thức

${isUnconscious ? `
ĐIỀU CHỈNH CHO TRẠNG THÁI MẤT Ý THỨC (TĂNG NHẸ):
- Hành động kích thích mạnh: +6 to +16 (40% của +15 to +40)
- Hành động kích thích vừa: +1 to +6 (40% của +3 to +15)
- Hành động nhẹ: +0 to +2 (40% của +1 to +5)
- Phản ứng cơ thể vô thức vẫn có thể xảy ra
- BONUS cho phản ứng sinh lý rõ rệt: +2 to +4 (40% của +5 to +10)
- Co thắt cơ mạnh, thay đổi nhịp thở rõ rệt: +3 to +6 (40% của +8 to +15)
- Tiết dịch tự nhiên: +4 to +8 (40% của +10 to +20)
` : isSemiConscious ? `
ĐIỀU CHỈNH CHO TRẠNG THÁI MƠ MÀNG (TĂNG NHẸ):
- Hành động kích thích mạnh: +10 to +27 (60% của +16 to +45)
- Hành động kích thích vừa: +2 to +11 (60% của +4 to +18)
- Hành động nhẹ: +1 to +4 (60% của +2 to +7)
- Phản ứng mơ màng vẫn có thể xảy ra
- BONUS cho phản ứng sinh lý: +2 to +5 (60% của +3 to +8)
` : `
ĐIỀU CHỈNH CHO TRẠNG THÁI TỈNH TÁO:
- Hành động kích thích mạnh: +20 to +50 (bình thường)
- Hành động kích thích vừa: +5 to +20 (bình thường)
- Hành động nhẹ: +2 to +8 (bình thường)
- Phản ứng có ý thức và kiểm soát được
- BONUS cho phản ứng tích cực: +5 to +15
`}

INTENSITY:
- low: Thay đổi nhỏ, tương tác bình thường
- medium: Thay đổi rõ rệt, có dấu hiệu quan tâm
- high: Thay đổi lớn, phản ứng mạnh mẽ

OUTPUT JSON:
{
  "arousalChange": number,
  "reason": "string - lý do thay đổi hứng tình",
  "context": "string - ngữ cảnh cụ thể",
  "intensity": "low|medium|high",
  "reasoning": "string - giải thích chi tiết về phản ứng của NPC"
}`;
  }

  private parseArousalResponse(responseText: string): any {
    try {
      return JSON.parse(responseText);
    } catch {
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch {
        console.warn('⚠️ JSON parse failed for arousal response');
        return {
          arousalChange: 0,
          reason: 'Parse error',
          context: 'Unknown',
          intensity: 'low'
        };
      }
    }
    return {
      arousalChange: 0,
      reason: 'Parse error',
      context: 'Unknown',
      intensity: 'low'
    };
  }

  private fallbackArousalAnalysis(
    narrative: string,
    npc: NPCRelationship,
    _additionalContext?: any
  ): {
    arousalChange: number;
    reason: string;
    context: string;
    intensity: 'low' | 'medium' | 'high';
  } {
    // Enhanced keyword-based analysis as fallback
    const lowerNarrative = narrative.toLowerCase();
    if (!npc.arousal) {
      return {
        arousalChange: 0,
        reason: 'No arousal data',
        context: 'Unknown',
        intensity: 'low'
      };
    }
    const arousal = npc.arousal;

    // Detect consciousness level for special handling
    const consciousnessLevel = this.detectConsciousnessLevel(narrative);
    const isUnconscious = consciousnessLevel <= 0.3;
    const isSemiConscious = consciousnessLevel <= 0.5;

    let arousalChange = 0;
    let reason = 'Tương tác bình thường';
    let intensity: 'low' | 'medium' | 'high' = 'low';

    // Enhanced positive arousal keywords with different intensities
    const highIntensityKeywords = [
      'hôn', 'ôm chặt', 'vuốt ve', 'chạm', 'thân mật', 'gần gũi',
      'quyến rũ', 'hấp dẫn', 'kích thích', 'say mê', 'mê mẩn',
      'đút', 'thâm nhập', 'xâm phạm', 'cưỡng bức', 'bạo lực tình dục'
    ];

    const mediumIntensityKeywords = [
      'đẹp', 'xinh', 'thu hút', 'lãng mạn', 'tình cảm', 'yêu thương',
      'quan tâm', 'chăm sóc', 'ngọt ngào', 'dịu dàng', 'ấm áp',
      'co thắt', 'run rẩy', 'thở dài', 'rên rỉ'
    ];

    const lowIntensityKeywords = [
      'vui vẻ', 'thích thú', 'hài lòng', 'tốt bụng', 'tử tế',
      'thú vị', 'hấp dẫn', 'tò mò', 'quan tâm'
    ];

    // Keywords for physiological responses (always count as arousal)
    const physiologicalKeywords = [
      'co thắt', 'run rẩy', 'thở dài', 'rên rỉ', 'thay đổi nhịp thở',
      'tiết dịch', 'ẩm ướt', 'nóng bỏng', 'phản xạ', 'phản ứng cơ thể',
      'cơ thể phản ứng', 'phản ứng sinh lý', 'phản xạ sinh lý',
      'thay đổi nhiệt độ', 'co giật', 'run rẩy nhẹ'
    ];

    // Enhanced negative arousal keywords
    const highNegativeKeywords = [
      'ghét', 'không thích', 'từ chối', 'phản đối', 'tức giận',
      'thô lỗ', 'xúc phạm', 'làm tổn thương', 'bạo lực', 'tấn công'
    ];

    const mediumNegativeKeywords = [
      'khó chịu', 'bực mình', 'không hài lòng', 'thất vọng',
      'lạnh nhạt', 'thờ ơ', 'không quan tâm'
    ];

    // Count keywords by intensity
    let highPositiveCount = 0;
    let mediumPositiveCount = 0;
    let lowPositiveCount = 0;
    let highNegativeCount = 0;
    let mediumNegativeCount = 0;
    let physiologicalCount = 0;

    for (const keyword of highIntensityKeywords) {
      if (lowerNarrative.includes(keyword)) highPositiveCount++;
    }
    for (const keyword of mediumIntensityKeywords) {
      if (lowerNarrative.includes(keyword)) mediumPositiveCount++;
    }
    for (const keyword of lowIntensityKeywords) {
      if (lowerNarrative.includes(keyword)) lowPositiveCount++;
    }
    for (const keyword of highNegativeKeywords) {
      if (lowerNarrative.includes(keyword)) highNegativeCount++;
    }
    for (const keyword of mediumNegativeKeywords) {
      if (lowerNarrative.includes(keyword)) mediumNegativeCount++;
    }
    for (const keyword of physiologicalKeywords) {
      if (lowerNarrative.includes(keyword)) physiologicalCount++;
    }

    // Calculate base arousal change with more realistic scoring
    const totalPositive = highPositiveCount * 3 + mediumPositiveCount * 2 + lowPositiveCount * 1;
    const totalNegative = highNegativeCount * 3 + mediumNegativeCount * 2;
    
    // Physiological responses always count as arousal (even if unconscious) but lighter
    const physiologicalBonus = physiologicalCount * 2; // Lighter bonus for physiological responses
    
    if (totalPositive > totalNegative || physiologicalCount > 0) {
      // More realistic positive scoring
      arousalChange = Math.floor(totalPositive * 2 * (arousal.personality.responsiveness / 100));
      
      // Add physiological bonus (always counts regardless of consciousness)
      arousalChange += physiologicalBonus;
      
      // Adjust based on inhibition (higher inhibition = less arousal change)
      const inhibitionFactor = (100 - arousal.personality.inhibition) / 100;
      arousalChange = Math.floor(arousalChange * inhibitionFactor);
      
      // Adjust based on experience (more experience = more controlled response)
      const experienceFactor = (100 - arousal.personality.experience) / 100;
      arousalChange = Math.floor(arousalChange * (0.5 + experienceFactor * 0.5));
      
      // Apply consciousness level adjustment - lighter for unconscious responses
      if (isUnconscious) {
        arousalChange = Math.floor(arousalChange * 0.4); // 40% for unconscious (lighter)
        reason = 'Phản ứng sinh lý vô thức (nhẹ)';
      } else if (isSemiConscious) {
        arousalChange = Math.floor(arousalChange * 0.6); // 60% for semi-conscious (lighter)
        reason = 'Phản ứng mơ màng (nhẹ)';
      } else {
        reason = 'Tương tác tích cực';
      }
      
      intensity = (totalPositive + physiologicalCount) >= 6 ? 'high' : (totalPositive + physiologicalCount) >= 3 ? 'medium' : 'low';
      
    } else if (totalNegative > totalPositive) {
      // More realistic negative scoring
      arousalChange = -Math.floor(totalNegative * 1.5 * (arousal.personality.inhibition / 100));
      
      // Adjust based on responsiveness (higher responsiveness = more affected by negative)
      const responsivenessFactor = arousal.personality.responsiveness / 100;
      arousalChange = Math.floor(arousalChange * responsivenessFactor);
      
      reason = 'Tương tác tiêu cực';
      intensity = totalNegative >= 6 ? 'high' : totalNegative >= 3 ? 'medium' : 'low';
    }

    // More realistic relationship adjustments
    if (npc.relationshipLevel > 50) {
      // Very close relationship - more sensitive to changes
      arousalChange = Math.floor(arousalChange * 1.3);
    } else if (npc.relationshipLevel > 20) {
      // Good relationship - moderate sensitivity
      arousalChange = Math.floor(arousalChange * 1.1);
    } else if (npc.relationshipLevel < -30) {
      // Bad relationship - less sensitive to positive, more to negative
      if (arousalChange > 0) {
        arousalChange = Math.floor(arousalChange * 0.3);
      } else {
        arousalChange = Math.floor(arousalChange * 1.2);
      }
    } else if (npc.relationshipLevel < -10) {
      // Slightly negative relationship
      if (arousalChange > 0) {
        arousalChange = Math.floor(arousalChange * 0.6);
      } else {
        arousalChange = Math.floor(arousalChange * 1.1);
      }
    }

    // Adjust based on current arousal level (diminishing returns)
    const currentLevel = arousal.level;
    if (currentLevel > 80) {
      // Already very aroused - less likely to increase further
      if (arousalChange > 0) {
        arousalChange = Math.floor(arousalChange * 0.5);
      }
    } else if (currentLevel < 20) {
      // Very low arousal - harder to increase
      if (arousalChange > 0) {
        arousalChange = Math.floor(arousalChange * 0.7);
      }
    }

    // Adjust based on romanticism (affects how they respond to romantic vs physical cues)
    const romanticismFactor = arousal.personality.romanticism / 100;
    if (lowerNarrative.includes('lãng mạn') || lowerNarrative.includes('tình cảm')) {
      arousalChange = Math.floor(arousalChange * (0.5 + romanticismFactor * 0.5));
    }

    // Adjust based on curiosity (affects how they respond to new experiences)
    const curiosityFactor = arousal.personality.curiosity / 100;
    if (lowerNarrative.includes('mới') || lowerNarrative.includes('lạ') || lowerNarrative.includes('thử')) {
      arousalChange = Math.floor(arousalChange * (0.5 + curiosityFactor * 0.5));
    }

    // Ensure realistic bounds
    arousalChange = Math.max(-30, Math.min(30, arousalChange));

    return {
      arousalChange,
      reason,
      context: 'Enhanced fallback analysis',
      intensity
    };
  }

  // Update NPC arousal level with realistic adjustments
  updateNPCArousal(
    npc: NPCRelationship,
    arousalChange: number,
    reason: string,
    context: string,
    intensity: 'low' | 'medium' | 'high',
    consciousnessLevel?: number
  ): void {
    if (!npc.arousal) {
      this.initializeArousalForNPC(npc);
    }

    if (!npc.arousal) return; // Double check after initialization

    // const oldLevel = npc.arousal.level;
    const arousal = npc.arousal;
    
    // Apply additional realistic adjustments
    let finalArousalChange = arousalChange;
    
    // Xử lý đặc biệt cho arousal khi NPC mất ý thức
    if (consciousnessLevel !== undefined && arousalChange > 0) {
      // Hành động kích thích vẫn có tác động lên arousal dù NPC mất ý thức
      if (consciousnessLevel <= 0) {
        // Hoàn toàn mất ý thức - arousal vẫn tăng nhưng chậm hơn (60-80%)
        finalArousalChange = Math.floor(arousalChange * 0.7);
      } else if (consciousnessLevel <= 0.3) {
        // Mất ý thức một phần (ngủ) - arousal tăng 80-90%
        finalArousalChange = Math.floor(arousalChange * 0.85);
      } else if (consciousnessLevel <= 0.5) {
        // Mơ màng - arousal tăng gần như bình thường (90-95%)
        finalArousalChange = Math.floor(arousalChange * 0.92);
      }
      // consciousnessLevel > 0.5: ý thức bình thường, arousal tăng bình thường
    }
    
    // Gradual decay over time (arousal naturally decreases)
    const lastChangeTime = arousal.lastArousalChange instanceof Date ? 
      arousal.lastArousalChange.getTime() : 
      new Date(arousal.lastArousalChange).getTime();
    const timeSinceLastChange = Date.now() - lastChangeTime;
    const hoursSinceLastChange = timeSinceLastChange / (1000 * 60 * 60);
    
    if (hoursSinceLastChange > 1 && arousal.level > 0) {
      // Natural decay: 1-3 points per hour depending on current level
      const decayRate = Math.min(3, Math.floor(arousal.level / 30));
      const naturalDecay = Math.floor(hoursSinceLastChange * decayRate);
      arousal.level = Math.max(0, arousal.level - naturalDecay);
    }
    
    // Apply personality-based adjustments to the change
    if (arousalChange > 0) {
      // Positive change adjustments
      
      // Responsiveness affects how much they respond to positive stimuli
      const responsivenessFactor = arousal.personality.responsiveness / 100;
      finalArousalChange = Math.floor(finalArousalChange * responsivenessFactor);
      
      // Inhibition reduces positive responses
      const inhibitionFactor = (100 - arousal.personality.inhibition) / 100;
      finalArousalChange = Math.floor(finalArousalChange * inhibitionFactor);
      
      // Experience makes responses more controlled
      const experienceFactor = (100 - arousal.personality.experience) / 100;
      finalArousalChange = Math.floor(finalArousalChange * (0.6 + experienceFactor * 0.4));
      
    } else if (arousalChange < 0) {
      // Negative change adjustments
      
      // Responsiveness affects how much they're hurt by negative stimuli
      const responsivenessFactor = arousal.personality.responsiveness / 100;
      finalArousalChange = Math.floor(finalArousalChange * responsivenessFactor);
      
      // Inhibition makes them more affected by negative stimuli
      const inhibitionFactor = arousal.personality.inhibition / 100;
      finalArousalChange = Math.floor(finalArousalChange * (0.5 + inhibitionFactor * 0.5));
      
      // Experience helps them handle negative situations better
      const experienceFactor = arousal.personality.experience / 100;
      finalArousalChange = Math.floor(finalArousalChange * (0.8 + experienceFactor * 0.2));
    }
    
    // Apply relationship-based adjustments
    if (npc.relationshipLevel > 70) {
      // Very close relationship - more sensitive to changes
      finalArousalChange = Math.floor(finalArousalChange * 1.2);
    } else if (npc.relationshipLevel > 30) {
      // Good relationship - moderate sensitivity
      finalArousalChange = Math.floor(finalArousalChange * 1.1);
    } else if (npc.relationshipLevel < -50) {
      // Very bad relationship - less sensitive to positive, more to negative
      if (finalArousalChange > 0) {
        finalArousalChange = Math.floor(finalArousalChange * 0.3);
      } else {
        finalArousalChange = Math.floor(finalArousalChange * 1.3);
      }
    } else if (npc.relationshipLevel < -20) {
      // Bad relationship
      if (finalArousalChange > 0) {
        finalArousalChange = Math.floor(finalArousalChange * 0.5);
      } else {
        finalArousalChange = Math.floor(finalArousalChange * 1.1);
      }
    }
    
    // Apply diminishing returns based on current level
    if (arousal.level > 85) {
      // Very high arousal - harder to increase further
      if (finalArousalChange > 0) {
        finalArousalChange = Math.floor(finalArousalChange * 0.4);
      }
    } else if (arousal.level > 70) {
      // High arousal - moderate difficulty to increase
      if (finalArousalChange > 0) {
        finalArousalChange = Math.floor(finalArousalChange * 0.7);
      }
    } else if (arousal.level < 15) {
      // Very low arousal - harder to increase
      if (finalArousalChange > 0) {
        finalArousalChange = Math.floor(finalArousalChange * 0.8);
      }
    }
    
    // Apply intensity-based multiplier
    const intensityMultiplier = intensity === 'high' ? 1.2 : intensity === 'medium' ? 1.0 : 0.8;
    finalArousalChange = Math.floor(finalArousalChange * intensityMultiplier);
    
    // Ensure realistic bounds
    finalArousalChange = Math.max(-25, Math.min(25, finalArousalChange));
    
    // Apply the final change
    arousal.level = Math.max(0, Math.min(100, arousal.level + finalArousalChange));
    arousal.lastArousalChange = new Date();

    // Add to history
    const arousalEvent: ArousalEvent = {
      id: this.generateId(),
      timestamp: new Date(),
      change: finalArousalChange,
      reason,
      context,
      intensity
    };

    arousal.arousalHistory.push(arousalEvent);

    // Keep only last 20 events
    if (arousal.arousalHistory.length > 20) {
      arousal.arousalHistory = arousal.arousalHistory.slice(-20);
    }

  }

  // Get arousal description
  getArousalDescription(level: number): string {
    if (level >= 90) return 'Rất hứng tình';
    if (level >= 75) return 'Hứng tình cao';
    if (level >= 60) return 'Hứng tình vừa phải';
    if (level >= 45) return 'Có chút quan tâm';
    if (level >= 30) return 'Hơi tò mò';
    if (level >= 15) return 'Trung lập';
    if (level >= 5) return 'Hơi lạnh nhạt';
    return 'Không quan tâm';
  }

  // Get arousal color for UI
  getArousalColor(level: number): string {
    if (level >= 75) return 'text-red-400';
    if (level >= 50) return 'text-orange-400';
    if (level >= 25) return 'text-yellow-400';
    return 'text-gray-400';
  }

  // Get arousal bar color for UI
  getArousalBarColor(level: number): string {
    if (level >= 75) return 'bg-red-500';
    if (level >= 50) return 'bg-orange-500';
    if (level >= 25) return 'bg-yellow-500';
    return 'bg-gray-500';
  }

  // Check if NPC should show arousal bar (only when adult content is enabled and direct mode)
  shouldShowArousalBar(contentFlags?: ContentFlags): boolean {
    return !!(contentFlags?.adult_enabled && 
              contentFlags.adult_intensity === 'direct');
  }

  // Get arousal response based on current level
  getArousalResponse(npc: NPCRelationship): string {
    if (!npc.arousal) return '';

    const level = npc.arousal.level;
    const personality = npc.arousal.personality;

    if (level >= 80) {
      return personality.romanticism > 60 
        ? 'Có vẻ rất quan tâm và muốn gần gũi hơn'
        : 'Có vẻ rất hứng thú và muốn tiến xa hơn';
    } else if (level >= 60) {
      return personality.romanticism > 60
        ? 'Tỏ ra quan tâm và muốn tìm hiểu thêm'
        : 'Tỏ ra hứng thú và muốn khám phá thêm';
    } else if (level >= 40) {
      return personality.romanticism > 60
        ? 'Có chút tò mò và muốn biết thêm'
        : 'Có chút quan tâm và muốn thử nghiệm';
    } else if (level >= 20) {
      return 'Tỏ ra trung lập nhưng vẫn lắng nghe';
    } else {
      return 'Tỏ ra không mấy quan tâm hoặc lạnh nhạt';
    }
  }

  // Generate arousal context for AI
  getArousalContext(npc: NPCRelationship): string {
    if (!npc.arousal) return '';

    const arousal = npc.arousal;
    const description = this.getArousalDescription(arousal.level);
    const response = this.getArousalResponse(npc);

    return `HỨNG TÌNH NPC:
- ${npc.name}: ${description} (${arousal.level}/100)
- Phản ứng: ${response}
- Responsiveness: ${arousal.personality.responsiveness}/100
- Inhibition: ${arousal.personality.inhibition}/100
- Turn-ons: ${arousal.preferences.turnOns.join(', ')}
- Turn-offs: ${arousal.preferences.turnOffs.join(', ')}`;
  }

  // Build scene state context for arousal analysis
  private buildSceneStateContext(sceneState?: any): string {
    if (!sceneState) return '';

    const contextParts: string[] = [];
    
    // Location context
    if (sceneState.location) {
      const location = typeof sceneState.location === 'string' 
        ? sceneState.location 
        : (sceneState.location.name || JSON.stringify(sceneState.location));
      contextParts.push(`- Vị trí: ${location}`);
    }
    
    // Time context
    if (sceneState.timeOfDay) {
      contextParts.push(`- Thời gian: ${sceneState.timeOfDay}`);
    }
    
    // Weather context
    if (sceneState.weather) {
      contextParts.push(`- Thời tiết: ${sceneState.weather}`);
    }
    
    // Mood/atmosphere context
    if (sceneState.mood || sceneState.atmosphere) {
      const mood = sceneState.mood || sceneState.atmosphere;
      contextParts.push(`- Không khí: ${mood}`);
    }
    
    // Privacy context
    if (sceneState.privacy) {
      contextParts.push(`- Mức độ riêng tư: ${sceneState.privacy}`);
    }
    
    // Danger level
    if (sceneState.danger) {
      contextParts.push(`- Mức độ nguy hiểm: ${sceneState.danger}`);
    }
    
    // NPCs in scene
    if (sceneState.npcs && Array.isArray(sceneState.npcs)) {
      const npcNames = sceneState.npcs
        .map((npc: any) => npc.name || 'Unknown')
        .join(', ');
      contextParts.push(`- NPCs có mặt: ${npcNames}`);
    }
    
    // Inventory/items context
    if (sceneState.inventory && Array.isArray(sceneState.inventory)) {
      const items = sceneState.inventory
        .map((item: any) => item.name || 'Unknown')
        .join(', ');
      contextParts.push(`- Vật phẩm có sẵn: ${items}`);
    }
    
    // Flags context
    if (sceneState.flags && typeof sceneState.flags === 'object') {
      const activeFlags = Object.entries(sceneState.flags)
        .filter(([_, value]) => value === true)
        .map(([key, _]) => key)
        .join(', ');
      if (activeFlags) {
        contextParts.push(`- Cờ hiệu: ${activeFlags}`);
      }
    }
    
    // Additional arousal-relevant context
    if (sceneState.temperature) {
      contextParts.push(`- Nhiệt độ: ${sceneState.temperature}`);
    }
    
    if (sceneState.lighting) {
      contextParts.push(`- Ánh sáng: ${sceneState.lighting}`);
    }
    
    if (sceneState.sounds) {
      contextParts.push(`- Âm thanh: ${sceneState.sounds}`);
    }
    
    if (sceneState.emotions) {
      contextParts.push(`- Cảm xúc: ${sceneState.emotions}`);
    }
    
    if (sceneState.intimacy) {
      contextParts.push(`- Mức độ thân mật: ${sceneState.intimacy}`);
    }
    
    if (sceneState.romance) {
      contextParts.push(`- Yếu tố lãng mạn: ${sceneState.romance}`);
    }
    
    return contextParts.length > 0 ? `TRẠNG THÁI SCENE:\n${contextParts.join('\n')}` : '';
  }

  // Build chat history context for arousal analysis
  private buildChatHistoryContext(chatHistory?: Array<{ role: string; content: string }>): string {
    if (!chatHistory || chatHistory.length === 0) return '';

    // Get recent messages (last 5)
    const recentMessages = chatHistory.slice(-5);
    
    const contextParts: string[] = [];
    
    // Analyze recent player messages for arousal-related content
    const playerMessages = recentMessages.filter(msg => msg.role === 'player');
    const arousalKeywords = [
      'thân mật', 'gần gũi', 'ôm', 'hôn', 'vuốt ve', 'chạm', 'tình cảm', 'lãng mạn',
      'hấp dẫn', 'quyến rũ', 'đẹp', 'xinh', 'thu hút', 'yêu', 'thích', 'quan tâm',
      'kích thích', 'hứng thú', 'tò mò', 'khám phá', 'thử nghiệm', 'trải nghiệm',
      'quyến rũ', 'hấp dẫn', 'gợi cảm', 'sexy', 'nóng bỏng', 'mê hoặc', 'cuốn hút',
      'tình yêu', 'yêu thương', 'chăm sóc', 'bảo vệ', 'quan tâm', 'lo lắng', 'nhớ',
      'khao khát', 'mong muốn', 'ước ao', 'ham muốn', 'thèm khát', 'say mê',
      'lãng mạn', 'ngọt ngào', 'dịu dàng', 'ấm áp', 'dễ chịu', 'thoải mái'
    ];
    
    let arousalMentionCount = 0;
    let recentArousalContext = '';
    
    for (const message of playerMessages) {
      const content = message.content.toLowerCase();
      const arousalMentions = arousalKeywords.filter(keyword => content.includes(keyword));
      if (arousalMentions.length > 0) {
        arousalMentionCount++;
        recentArousalContext += `"${message.content}" `;
      }
    }
    
    if (arousalMentionCount > 0) {
      contextParts.push(`- Người chơi đã đề cập đến nội dung thân mật ${arousalMentionCount} lần gần đây`);
      contextParts.push(`- Nội dung: ${recentArousalContext.trim()}`);
    }
    
    // Analyze recent AI responses for emotional context
    const aiMessages = recentMessages.filter(msg => msg.role === 'ai');
    const emotionalKeywords = [
      'vui mừng', 'hạnh phúc', 'phấn khích', 'thích thú', 'quan tâm', 'tò mò',
      'buồn', 'thất vọng', 'chán nản', 'tức giận', 'phẫn nộ', 'bực mình',
      'lo lắng', 'băn khoăn', 'bối rối', 'sợ hãi', 'hoảng sợ', 'kinh hãi',
      'xấu hổ', 'e thẹn', 'ngại ngùng', 'bối rối', 'lúng túng', 'khó xử',
      'thích thú', 'hứng thú', 'tò mò', 'quan tâm', 'chú ý', 'lắng nghe',
      'cảm động', 'xúc động', 'rung động', 'thổn thức', 'nghẹn ngào',
      'say mê', 'mê mẩn', 'quyến luyến', 'lưu luyến', 'khó quên', 'ấn tượng'
    ];
    
    let emotionalContext = '';
    for (const message of aiMessages) {
      const content = message.content.toLowerCase();
      const emotionalMentions = emotionalKeywords.filter(keyword => content.includes(keyword));
      if (emotionalMentions.length > 0) {
        emotionalContext += `"${message.content.substring(0, 100)}..." `;
      }
    }
    
    if (emotionalContext) {
      contextParts.push(`- Phản ứng cảm xúc gần đây: ${emotionalContext.trim()}`);
    }
    
    // General conversation context
    if (recentMessages.length > 0) {
      const lastMessage = recentMessages[recentMessages.length - 1];
      contextParts.push(`- Tin nhắn cuối: "${lastMessage.content.substring(0, 150)}${lastMessage.content.length > 150 ? '...' : ''}"`);
    }
    
    return contextParts.length > 0 ? `LỊCH SỬ CHAT:\n${contextParts.join('\n')}` : '';
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Clear cache
  clearCache(): void {
    this.arousalCache.clear();
  }
}

export const npcArousalService = NPCArousalService.getInstance();
