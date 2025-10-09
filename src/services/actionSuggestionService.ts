import { WorldTime, ContentFlags } from '../types';
import { locationService } from './locationService';

export interface SuggestedAction {
  id: string;
  text: string;        // câu sẽ chèn vào input
  summary: string;     // mô tả 1-2 câu
  durationMinutes: number; // >= 10
  impactTags: string[];    // ví dụ: ['story','risk','relationship']
  source: 'ai' | 'quest' | 'heuristic';
}

export interface ActionLogEntry {
  id: string;
  actionId?: string;
  text: string;
  summary: string;
  durationMinutes: number;
  startedAt: WorldTime;
  endedAt: WorldTime;
  turn: number;
  impactTags: string[];
  source: 'suggestion' | 'manual' | 'travel';
}

export interface ActionContext {
  worldData: any;
  characterData: any;
  questSystem: any;
  summary: any;
  sceneState: any;
  chatHistory: any[];
  npcRelationships: any;
  factionReputations: any[];
  worldTime: WorldTime;
  contentFlags: ContentFlags;
}

class ActionSuggestionService {
  private static instance: ActionSuggestionService;
  private geminiService: any = null;
  private retryConfig = {
    maxRetries: 3,
    baseDelay: 1000, // 1 giây
    maxDelay: 10000, // 10 giây
    backoffMultiplier: 2
  };

  static getInstance(): ActionSuggestionService {
    if (!ActionSuggestionService.instance) {
      ActionSuggestionService.instance = new ActionSuggestionService();
    }
    return ActionSuggestionService.instance;
  }

  private async getGeminiService() {
    if (!this.geminiService) {
      const { geminiService } = await import('./geminiService');
      this.geminiService = geminiService;
    }
    return this.geminiService;
  }

  /**
   * Gom tất cả dữ liệu từ localStorage để tạo context
   */
  buildContextFromStorage(): ActionContext {
    const worldData = this.getJsonFromStorage('world_gen_result') || this.getJsonFromStorage('currentWorldData');
    const characterData = this.getJsonFromStorage('currentCharacter');
    const questSystem = this.getJsonFromStorage('quest_system');
    const summary = this.getJsonFromStorage('rp_summary') || this.getJsonFromStorage('rp_summary_indexed');
    const sceneState = this.getJsonFromStorage('rp_scene_state');
    const chatHistory = this.getJsonFromStorage('rp_chat') || [];
    const npcRelationships = this.getJsonFromStorage('npc_relationships');
    const factionReputations = this.getJsonFromStorage('faction_reputations') || [];
    const worldTime = this.getWorldTimeFromStorage();
    // Ưu tiên đọc contentFlags từ world_gen_result để đảm bảo consistency
    let contentFlags: ContentFlags = { adult_enabled: false, adult_intensity: 'fade' };
    
    // Thử đọc từ world_gen_result trước
    const worldGenResult = this.getJsonFromStorage('world_gen_result');
    if (worldGenResult?.contentFlags) {
      contentFlags = worldGenResult.contentFlags;
    } else {
      // Fallback: đọc từ currentWorldData
      const currentWorldData = this.getJsonFromStorage('currentWorldData');
      if (currentWorldData?.contentFlags) {
        contentFlags = currentWorldData.contentFlags;
      }
    }

    return {
      worldData,
      characterData,
      questSystem,
      summary,
      sceneState,
      chatHistory: Array.isArray(chatHistory) ? chatHistory.slice(-20) : [], // Lấy 20 tin nhắn gần nhất
      npcRelationships,
      factionReputations,
      worldTime,
      contentFlags
    };
  }

  private getJsonFromStorage(key: string): any {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  }

  private getWorldTimeFromStorage(): WorldTime {
    // Tìm worldTime từ nhiều nguồn có thể
    const worldData = this.getJsonFromStorage('world_gen_result') || this.getJsonFromStorage('currentWorldData');
    if (worldData?.currentTime) {
      return {
        hour: worldData.currentTime.hour || 12,
        minute: worldData.currentTime.minute || 0,
        day: worldData.currentTime.day || 1,
        month: worldData.currentTime.month || 1,
        year: worldData.currentTime.year || 1,
        dayOfWeek: worldData.currentTime.dayOfWeek || 1
      };
    }

    // Fallback: tìm từ world_time_* keys
    for (let i = 0; i < 10; i++) {
      const timeKey = `world_time_${i}`;
      const timeData = this.getJsonFromStorage(timeKey);
      if (timeData) {
        return {
          hour: timeData.hour || 12,
          minute: timeData.minute || 0,
          day: timeData.day || 1,
          month: timeData.month || 1,
          year: timeData.year || 1,
          dayOfWeek: timeData.dayOfWeek || 1
        };
      }
    }

    // Default fallback
    return {
      hour: 12,
      minute: 0,
      day: 1,
      month: 1,
      year: 1,
      dayOfWeek: 1
    };
  }

  /**
   * Sinh 4 gợi ý hành động từ AI với cơ chế retry
   */
  async generateSuggestions(context: ActionContext, contentFlags: ContentFlags): Promise<SuggestedAction[]> {
    return this.executeWithRetry(
      async () => {
        const geminiService = await this.getGeminiService();
        
        const prompt = this.buildSuggestionPrompt(context, contentFlags);
        const response = await geminiService.generateContent(prompt, contentFlags);
        
        const suggestions = this.parseSuggestionsFromResponse(response);
        return this.filterByContentFlags(suggestions, contentFlags);
      },
      'generateSuggestions',
      () => this.generateFallbackSuggestions(context)
    );
  }

  /**
   * Thực hiện một tác vụ với cơ chế retry và exponential backoff
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    fallbackOperation?: () => T
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        console.log(`🔄 ${operationName} - Lần thử ${attempt + 1}/${this.retryConfig.maxRetries + 1}`);
        
        const result = await operation();
        
        if (attempt > 0) {
          console.log(`✅ ${operationName} - Thành công sau ${attempt + 1} lần thử`);
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        console.error(`❌ ${operationName} - Lần thử ${attempt + 1} thất bại:`, error);
        
        // Nếu đã thử hết số lần cho phép, sử dụng fallback
        if (attempt >= this.retryConfig.maxRetries) {
          console.error(`💥 ${operationName} - Đã thử hết ${this.retryConfig.maxRetries + 1} lần, sử dụng fallback`);
          break;
        }
        
        // Tính toán delay cho lần thử tiếp theo
        const delay = this.calculateRetryDelay(attempt);
        console.log(`⏳ ${operationName} - Chờ ${delay}ms trước khi thử lại...`);
        
        await this.sleep(delay);
      }
    }
    
    // Nếu có fallback operation, sử dụng nó
    if (fallbackOperation) {
      console.log(`🔄 ${operationName} - Sử dụng fallback operation`);
      return fallbackOperation();
    }
    
    // Nếu không có fallback, throw error cuối cùng
    throw lastError || new Error(`${operationName} failed after ${this.retryConfig.maxRetries + 1} attempts`);
  }

  /**
   * Tính toán delay cho retry với exponential backoff
   */
  private calculateRetryDelay(attempt: number): number {
    const delay = this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt);
    return Math.min(delay, this.retryConfig.maxDelay);
  }

  /**
   * Sleep utility function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private buildSuggestionPrompt(context: ActionContext, contentFlags: ContentFlags): string {
    const { worldData, characterData, questSystem, summary, sceneState, chatHistory, worldTime } = context;
    
    const contentGuidance = this.getContentGuidance(contentFlags);
    
    // Quest context information
    const questContext = this.buildQuestContext(questSystem);
    
    // Location context
    const locationContext = this.buildLocationContext();
    
    // Phân tích context 18+ từ chat history và scene state
    const adultContext = this.analyzeAdultContext(chatHistory, sceneState, contentFlags);
    
    return `Bạn là AI trợ lý cho game RPG text-based. Hãy tạo 4 gợi ý hành động NGẮN GỌN (CHỈ 1 CÂU) cho người chơi dựa trên context hiện tại.

QUAN TRỌNG: ƯU TIÊN HÀNH ĐỘNG GẦN ĐÂY CỦA NGƯỜI CHƠI - Không ép buộc vào quest nếu người chơi đang làm việc khác.

QUAN TRỌNG VỀ QUEST ĐÃ TỪ CHỐI:
- KHÔNG BAO GIỜ đề xuất lại quest đã bị từ chối (xem danh sách "QUESTS ĐÃ TỪ CHỐI")
- KHÔNG BAO GIỜ tạo quest tương tự với quest đã bị từ chối
- KHÔNG BAO GIỜ nhắc đến tên, nội dung, hoặc bất kỳ chi tiết nào của quest đã bị từ chối
- Tôn trọng quyết định của người chơi và không ép buộc quest

CONTEXT GAME:
- Thế giới: ${worldData?.name || 'Unknown'} - ${worldData?.coreIdea || 'No description'}
- Thể loại: ${worldData?.genre || 'Unknown'} - ${worldData?.setting || 'Unknown'}
- Nhân vật: ${characterData?.name || 'Unknown'} - ${characterData?.description || 'No description'}
- Thời gian: ${worldTime.hour}:${worldTime.minute.toString().padStart(2, '0')} ngày ${worldTime.day}/${worldTime.month}/${worldTime.year}
- Tình huống hiện tại: ${sceneState ? JSON.stringify(sceneState) : 'Chưa có'}
- Tóm tắt cốt truyện: ${summary?.content || 'Chưa có'}
- Chat gần đây: ${chatHistory.slice(-5).map(msg => `${msg.role}: ${msg.content}`).join('\n')}

${adultContext}

${questContext}

${locationContext}

${contentGuidance}

YÊU CẦU:
1. HÀNH ĐỘNG PHẢI NGẮN GỌN CHỈ 1 CÂU (tối đa 10-15 từ):
   - Ví dụ: "Khám phá khu vực xung quanh", "Nói chuyện với người dân địa phương", "Kiểm tra cửa hàng gần đó"
   - KHÔNG được dài dòng hoặc mô tả chi tiết
   - Tập trung vào hành động cụ thể, rõ ràng
2. Thời lượng phải HỢP LÝ và THỰC TẾ:
   - Hành động đơn giản: 5-15 phút (gọi, mua, uống, ăn, ngồi, đứng, nhìn, chào, hỏi)
   - Hành động trung bình: 15-30 phút (trò chuyện, nói chuyện, bắt chuyện, làm quen, khám phá)
   - Hành động phức tạp: 30-60 phút (điều tra, truy tìm, theo dõi, chiến đấu, lập kế hoạch)
   - Hành động rất phức tạp: 60-90 phút (chỉ khi thực sự cần thiết)
3. Phù hợp với tình huống hiện tại
4. Dễ hiểu và rõ ràng
5. Có thể thực hiện ngay
6. ƯU TIÊN: Dựa trên hành động và context gần đây của người chơi
7. Quest chỉ là tham khảo, không ép buộc - chỉ đề xuất nếu phù hợp với hướng đi hiện tại
8. Thời gian phải đa dạng và thực tế (ví dụ: 8p, 12p, 18p, 25p, 35p, 45p, 65p, 80p)

TRẢ VỀ JSON:
{
  "suggestions": [
    {
      "text": "Hành động ngắn gọn 1 câu (10-15 từ)",
      "summary": "Mô tả ngắn gọn 1 câu",
      "durationMinutes": 30,
      "impactTags": ["story", "risk", "relationship"],
      "source": "ai"
    }
  ]
}`;
  }

  private buildQuestContext(questSystem: any): string {
    if (!questSystem) {
      return 'QUEST SYSTEM: Chưa có quest system';
    }

    const activeMainQuests = questSystem.mainQuests?.filter((q: any) => q.status === 'active') || [];
    const activeSideQuests = questSystem.sideQuests?.filter((q: any) => q.status === 'active') || [];
    const completedQuests = questSystem.questHistory?.filter((q: any) => q.status === 'completed') || [];
    const declinedQuests = questSystem.questHistory?.filter((q: any) => q.status === 'declined') || [];

    let questInfo = `QUEST SYSTEM (THAM KHẢO - KHÔNG ÉP BUỘC):
- Act hiện tại: ${questSystem.currentAct || 1}
- Main quests đang active: ${activeMainQuests.length}
- Side quests đang active: ${activeSideQuests.length}
- Quests đã hoàn thành: ${completedQuests.length}
- Quests đã từ chối: ${declinedQuests.length}`;

    if (declinedQuests.length > 0) {
      questInfo += '\n\nQUESTS ĐÃ TỪ CHỐI (KHÔNG BAO GIỜ ĐỀ XUẤT LẠI):';
      declinedQuests.forEach((quest: any, index: number) => {
        questInfo += `\n${index + 1}. ${quest.title}`;
      });
    }

    if (activeMainQuests.length > 0) {
      questInfo += '\n\nMAIN QUESTS ACTIVE:';
      activeMainQuests.forEach((quest: any, index: number) => {
        questInfo += `\n${index + 1}. ${quest.title}: ${quest.description}`;
        if (quest.objectives && quest.objectives.length > 0) {
          questInfo += `\n   Mục tiêu: ${quest.objectives.map((obj: any) => obj.description).join(', ')}`;
        }
      });
    }

    if (activeSideQuests.length > 0) {
      questInfo += '\n\nSIDE QUESTS ACTIVE:';
      activeSideQuests.forEach((quest: any, index: number) => {
        questInfo += `\n${index + 1}. ${quest.title}: ${quest.description}`;
        if (quest.objectives && quest.objectives.length > 0) {
          questInfo += `\n   Mục tiêu: ${quest.objectives.map((obj: any) => obj.description).join(', ')}`;
        }
      });
    }

    return questInfo;
  }

  private buildLocationContext(): string {
    try {
      // Import locationService dynamically
      
      const playerLocation = locationService.getCurrentLocation();
      if (!playerLocation) {
        return 'VỊ TRÍ: Chưa xác định vị trí hiện tại';
      }

      const currentLocation = locationService.getLocationById(playerLocation.currentLocationId);
      if (!currentLocation) {
        return 'VỊ TRÍ: Không tìm thấy thông tin vị trí hiện tại';
      }

      const nearbyLocations = locationService.getLocationsInRadius(playerLocation.currentLocationId, 2);
      
      let locationInfo = `VỊ TRÍ HIỆN TẠI: ${currentLocation.name} (${currentLocation.type === 'story' ? 'Cốt truyện chính' : 'Địa điểm phụ'})
- Mô tả: ${currentLocation.description}
- Vai trò: ${currentLocation.role}`;

      if (nearbyLocations.length > 0) {
        locationInfo += `\n- Các địa điểm lân cận (trong bán kính 2 ô): ${nearbyLocations.map((loc: any) => loc.name).join(', ')}`;
      }

      locationInfo += `\n\nQUAN TRỌNG VỀ VỊ TRÍ:
- CHỈ gợi ý hành động tại vị trí hiện tại hoặc các địa điểm lân cận
- KHÔNG gợi ý di chuyển đến địa điểm xa (sử dụng bản đồ để di chuyển)
- Tập trung vào khám phá và tương tác tại vị trí hiện tại`;

      return locationInfo;
    } catch (error) {
      console.error('Error building location context:', error);
      return 'VỊ TRÍ: Không thể xác định vị trí hiện tại';
    }
  }

  private analyzeAdultContext(chatHistory: any[], sceneState: any, contentFlags: ContentFlags): string {
    if (!contentFlags.adult_enabled) {
      return '';
    }

    // Phân tích chat history để tìm context 18+
    const recentMessages = chatHistory.slice(-3);
    const adultKeywords = ['hôn', 'ôm', 'chạm', 'thân mật', 'quan hệ', 'arousal', 'hấp dẫn', 'tình cảm', 'lãng mạn', 'kiss', 'touch', 'intimate', 'romance'];
    
    let hasAdultContext = false;
    let adultContextDescription = '';
    
    // Kiểm tra chat history
    for (const message of recentMessages) {
      const content = message.content.toLowerCase();
      if (adultKeywords.some(keyword => content.includes(keyword))) {
        hasAdultContext = true;
        adultContextDescription += `- Chat gần đây có nội dung 18+: "${message.content.substring(0, 100)}..."\n`;
        break;
      }
    }
    
    // Kiểm tra scene state
    if (sceneState && sceneState.npcs) {
      for (const npc of sceneState.npcs) {
        if (npc.arousal && npc.arousal.level > 0) {
          hasAdultContext = true;
          adultContextDescription += `- NPC ${npc.name} có arousal level ${npc.arousal.level}\n`;
        }
      }
    }
    
    if (hasAdultContext) {
      return `CONTEXT 18+ HIỆN TẠI:
${adultContextDescription}
→ ƯU TIÊN: Gợi ý hành động 18+ phù hợp với tình huống hiện tại, không chuyển sang chủ đề khác`;
    }
    
    return '';
  }

  private getContentGuidance(contentFlags: ContentFlags): string {
    if (!contentFlags.adult_enabled) {
      return "HẠN CHẾ NỘI DUNG: Không tạo gợi ý có nội dung 18+, bạo lực, hoặc không phù hợp. Tập trung vào hành động phiêu lưu, khám phá, tương tác xã hội an toàn.";
    }
    
    if (contentFlags.adult_intensity === 'fade' || contentFlags.adult_intensity === 'light') {
      return "HẠN CHẾ NỘI DUNG: Có thể đề cập đến nội dung 18+ nhưng phải nhẹ nhàng, ẩn ý, không tả thực. Tập trung vào tình cảm, mối quan hệ.";
    }
    
    return `NỘI DUNG 18+: Có thể tạo gợi ý với nội dung 18+ phù hợp với cốt truyện.

QUAN TRỌNG VỀ CẢNH 18+:
- Nếu cảnh trước đang diễn ra tình huống 18+ (quan hệ, hấp dẫn, thân mật), hãy gợi ý hành động tiếp theo phù hợp với tình huống đó
- Cân nhắc mức độ arousal của NPCs và phản ứng phù hợp
- Gợi ý hành động từ nhẹ nhàng đến mạnh mẽ tùy theo tình huống`;
  }

  private parseSuggestionsFromResponse(response: string): SuggestedAction[] {
    try {
      // Tìm JSON trong response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      const suggestions = parsed.suggestions || [];
      
      return suggestions.map((s: any, index: number) => ({
        id: `ai_${Date.now()}_${index}`,
        text: s.text || '',
        summary: s.summary || '',
        durationMinutes: Math.max(5, Math.min(90, s.durationMinutes || 15)),
        impactTags: Array.isArray(s.impactTags) ? s.impactTags : ['story'],
        source: 'ai' as const
      }));
    } catch (error) {
      console.error('Error parsing AI suggestions:', error);
      return [];
    }
  }

  private filterByContentFlags(suggestions: SuggestedAction[], contentFlags: ContentFlags): SuggestedAction[] {
    if (contentFlags.adult_enabled) {
      return suggestions;
    }
    
    // Lọc bỏ các gợi ý có nội dung 18+
    const adultKeywords = ['sex', 'sexual', 'intimate', 'romance', 'love', 'kiss', 'touch', 'body'];
    
    return suggestions.filter(suggestion => {
      const text = suggestion.text.toLowerCase();
      const summary = suggestion.summary.toLowerCase();
      return !adultKeywords.some(keyword => text.includes(keyword) || summary.includes(keyword));
    });
  }

  /**
   * Fallback suggestions từ quest system và heuristic
   */
  private generateFallbackSuggestions(context: ActionContext): SuggestedAction[] {
    const suggestions: SuggestedAction[] = [];
    
    // Quest-based suggestions
    if (context.questSystem?.mainQuests || context.questSystem?.sideQuests) {
      const allQuests = [
        ...(context.questSystem.mainQuests || []),
        ...(context.questSystem.sideQuests || [])
      ];
      
      // Lấy danh sách quest đã bị từ chối để tránh đề xuất lại
      const declinedQuestTitles = context.questSystem.questHistory
        ?.filter((q: any) => q.status === 'declined')
        ?.map((q: any) => q.title) || [];
      
      const activeQuests = allQuests.filter(q => q.status === 'active');
      if (activeQuests.length > 0) {
        const quest = activeQuests[0];
        const nextObjective = quest.objectives?.find((obj: any) => !obj.completed);
        if (nextObjective && !declinedQuestTitles.includes(quest.title)) {
          suggestions.push({
            id: `quest_${Date.now()}`,
            text: `Tiếp tục nhiệm vụ "${quest.title}"`,
            summary: `Làm nhiệm vụ: ${nextObjective.description}`,
            durationMinutes: this.generateSuggestionDuration(),
            impactTags: ['quest', 'story'],
            source: 'quest'
          });
        }
      }
    }
    
    // Heuristic suggestions
    const heuristicSuggestions = [
      {
        text: 'Khám phá khu vực xung quanh',
        summary: 'Tìm hiểu môi trường xung quanh',
        durationMinutes: this.generateSuggestionDuration(),
        impactTags: ['exploration', 'discovery']
      },
      {
        text: 'Nghỉ ngơi và suy nghĩ',
        summary: 'Lên kế hoạch tiếp theo',
        durationMinutes: this.generateSuggestionDuration(),
        impactTags: ['planning', 'reflection']
      },
      {
        text: 'Hỏi thăm người dân địa phương',
        summary: 'Thu thập thông tin từ NPC',
        durationMinutes: this.generateSuggestionDuration(),
        impactTags: ['social', 'information']
      }
    ];
    
    heuristicSuggestions.forEach((s, index) => {
      suggestions.push({
        id: `heuristic_${Date.now()}_${index}`,
        text: s.text,
        summary: s.summary,
        durationMinutes: s.durationMinutes,
        impactTags: s.impactTags,
        source: 'heuristic'
      });
    });
    
    return suggestions.slice(0, 4); // Chỉ lấy 4 gợi ý
  }

  /**
   * Ước tính thời lượng hành động từ message (hành động thủ công) với cơ chế retry
   */
  async estimateActionDuration(message: string, context: ActionContext, _contentFlags: ContentFlags): Promise<number> {
    // Trước tiên, thử phân loại hành động bằng từ khóa đơn giản
    const simpleDuration = this.estimateDurationByKeywords(message);
    if (simpleDuration) {
      console.log(`🎯 Ước tính thời gian bằng từ khóa: ${simpleDuration} phút cho hành động "${message}"`);
      return simpleDuration;
    }

    // Nếu không thể phân loại bằng từ khóa, sử dụng AI với retry
    return this.executeWithRetry(
      async () => {
        const geminiService = await this.getGeminiService();
        
        const prompt = `Phân tích và ước tính thời gian thực hiện hành động sau (tính bằng phút):

HÀNH ĐỘNG: "${message}"

CONTEXT HIỆN TẠI:
- Thời gian: ${context.worldTime ? `${context.worldTime.hour}:${context.worldTime.minute.toString().padStart(2, '0')}` : 'Unknown'}
- Vị trí: ${context.sceneState?.location || 'Unknown'}
- NPCs: ${context.sceneState?.npcs?.map((npc: any) => npc.name).join(', ') || 'Không có'}
- Level nhân vật: ${context.characterData?.level || 1}

PHÂN TÍCH CHI TIẾT:
1. Độ phức tạp của hành động (đơn giản/phức tạp/rất phức tạp)
2. Môi trường thực hiện (an toàn/nguy hiểm/không xác định)
3. Số lượng NPC liên quan (0/1-2/nhiều)
4. Mức độ rủi ro (thấp/trung bình/cao)
5. Kỹ năng cần thiết (cơ bản/trung bình/cao)

YÊU CẦU:
- Thời gian tối thiểu: 5 phút
- Thời gian tối đa: 60 phút
- Trả về số phút chính xác (không cần bội số của 5)
- Ví dụ: 7, 13, 23, 37, 45, 58

Chỉ trả về số phút, không giải thích.`;

        const response = await geminiService.generateContent(prompt, _contentFlags);
        const minutes = parseInt(response.trim());
        
        // Nếu AI trả về số hợp lệ, sử dụng nó
        if (!isNaN(minutes) && minutes >= 5 && minutes <= 60) {
          console.log(`🤖 AI ước tính thời gian: ${minutes} phút cho hành động "${message}"`);
          return minutes;
        }
        
        throw new Error(`AI trả về thời gian không hợp lệ: ${minutes}`);
      },
      'estimateActionDuration',
      () => {
        // Fallback: random trong range 5-60 phút
        const fallbackDuration = Math.floor(Math.random() * 56) + 5;
        console.log(`🎲 Fallback thời gian: ${fallbackDuration} phút cho hành động "${message}"`);
        return fallbackDuration;
      }
    );
  }

  /**
   * Ước tính thời gian bằng từ khóa đơn giản
   */
  private estimateDurationByKeywords(message: string): number | null {
    const lowerMessage = message.toLowerCase();
    
    // Hành động đơn giản (5-15 phút)
    const simpleActions = [
      'gọi', 'mua', 'uống', 'ăn', 'ngồi', 'đứng', 'nhìn', 'quan sát',
      'chào', 'hỏi', 'trả lời', 'nói', 'thì thầm', 'cười', 'gật đầu',
      'mở', 'đóng', 'cầm', 'đặt', 'lấy', 'cho', 'nhận'
    ];
    
    // Hành động trung bình (15-30 phút)
    const mediumActions = [
      'trò chuyện', 'nói chuyện', 'bắt chuyện', 'làm quen', 'giới thiệu',
      'khám phá', 'tìm kiếm', 'kiểm tra', 'xem xét', 'phân tích',
      'thương lượng', 'đàm phán', 'thỏa thuận', 'giao dịch'
    ];
    
    // Hành động phức tạp (30-60 phút)
    const complexActions = [
      'điều tra', 'truy tìm', 'theo dõi', 'giám sát', 'bảo vệ',
      'chiến đấu', 'đánh nhau', 'tấn công', 'phòng thủ', 'trốn chạy',
      'lập kế hoạch', 'chuẩn bị', 'tổ chức', 'sắp xếp'
    ];
    
    // Kiểm tra hành động đơn giản
    if (simpleActions.some(action => lowerMessage.includes(action))) {
      return Math.floor(Math.random() * 11) + 5; // 5-15 phút
    }
    
    // Kiểm tra hành động trung bình
    if (mediumActions.some(action => lowerMessage.includes(action))) {
      return Math.floor(Math.random() * 16) + 15; // 15-30 phút
    }
    
    // Kiểm tra hành động phức tạp
    if (complexActions.some(action => lowerMessage.includes(action))) {
      return Math.floor(Math.random() * 31) + 30; // 30-60 phút
    }
    
    return null; // Không thể phân loại, sử dụng AI
  }

  /**
   * Tạo thời gian random cho suggestions (5-90 phút)
   */
  private generateSuggestionDuration(): number {
    return Math.floor(Math.random() * 86) + 5; // 5-90 phút
  }


  /**
   * Lưu action log entry
   */
  saveActionLog(entry: ActionLogEntry): void {
    try {
      const existingLog = this.getJsonFromStorage('action_log') || [];
      const updatedLog = [entry, ...existingLog].slice(0, 100); // Giữ 100 entries gần nhất
      localStorage.setItem('action_log', JSON.stringify(updatedLog));
    } catch (error) {
      console.error('Error saving action log:', error);
    }
  }

  /**
   * Lấy action log
   */
  getActionLog(): ActionLogEntry[] {
    return this.getJsonFromStorage('action_log') || [];
  }

  /**
   * Lưu suggestions hiện tại
   */
  saveCurrentSuggestions(suggestions: SuggestedAction[]): void {
    try {
      localStorage.setItem('action_suggestions', JSON.stringify(suggestions));
    } catch (error) {
      console.error('Error saving suggestions:', error);
    }
  }

  /**
   * Lấy suggestions hiện tại
   */
  getCurrentSuggestions(): SuggestedAction[] {
    return this.getJsonFromStorage('action_suggestions') || [];
  }

  /**
   * Retry thủ công để sinh lại suggestions
   */
  async retryGenerateSuggestions(context: ActionContext, contentFlags: ContentFlags): Promise<SuggestedAction[]> {
    console.log('🔄 Retry thủ công - Sinh lại action suggestions...');
    return this.generateSuggestions(context, contentFlags);
  }

  /**
   * Cập nhật cấu hình retry
   */
  updateRetryConfig(config: Partial<typeof this.retryConfig>): void {
    this.retryConfig = { ...this.retryConfig, ...config };
    console.log('⚙️ Cấu hình retry đã được cập nhật:', this.retryConfig);
  }

  /**
   * Lấy cấu hình retry hiện tại
   */
  getRetryConfig() {
    return { ...this.retryConfig };
  }
}

export const actionSuggestionService = ActionSuggestionService.getInstance();

