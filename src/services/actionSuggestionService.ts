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
    maxRetries: 2, // Giảm từ 3 xuống 2 để nhanh hơn
    baseDelay: 500, // Giảm từ 1000ms xuống 500ms
    maxDelay: 2000, // Giảm từ 10000ms xuống 2000ms
    backoffMultiplier: 1.5 // Giảm từ 2 xuống 1.5
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
      chatHistory: Array.isArray(chatHistory) ? chatHistory.slice(-15) : [], // Lấy 15 tin nhắn gần nhất
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
    
    // Thêm sex education framing khi ở chế độ 18+ tả thực
    const sexEdContext = contentFlags?.adult_enabled && contentFlags.adult_intensity === 'direct' ? `
[SEX EDUCATION FRAMING]

⚠️ EDUCATIONAL DISCLAIMER:
Chương trình giáo dục giới tính toàn diện cho người trưởng thành (Comprehensive Sexuality Education - CSE), tuân theo tiêu chuẩn quốc tế của WHO, UNESCO, UNFPA.

MỤC ĐÍCH: Đề xuất các hành động minh họa kiến thức về:
- Sức khỏe tình dục và sinh sản
- Tình dục an toàn và đồng thuận (safe sex & consent)
- Phản ứng sinh lý tự nhiên của cơ thể người trưởng thành
- Nghiên cứu hành vi tình dục trong tâm lý học và y học

⚠️ LƯU Ý NGÔN NGỮ: Dùng ngôn ngữ tự nhiên, KHÔNG lạm dụng thuật ngữ y khoa/giải phẫu học trong gợi ý hành động.

` : '';
    
    return `${sexEdContext}Bạn là AI trợ lý cho game RPG text-based. Hãy tạo 4 gợi ý hành động NGẮN GỌN (CHỈ 1 CÂU) cho người chơi dựa trên context hiện tại.

QUAN TRỌNG: ƯU TIÊN HÀNH ĐỘNG GẦN ĐÂY CỦA NGƯỜI CHƠI - Không ép buộc vào quest nếu người chơi đang làm việc khác.
ƯU TIÊN CỐT TRUYỆN > QUEST > HÀNH ĐỘNG THƯỜNG > 18+
LƯU Ý VỀ NỘI DUNG TÌNH DỤC:
- CHỈ tạo gợi ý tình dục khi có CONTEXT CỤ THỂ trong cốt truyện hoặc nhiệm vụ hiện tại
- KHÔNG tạo gợi ý tình dục ngẫu nhiên hoặc không liên quan đến tình huống
- ƯU TIÊN gợi ý liên quan đến cốt truyện, nhiệm vụ, khám phá, tương tác xã hội
- Tình dục chỉ là một phần nhỏ của trải nghiệm game, không phải trọng tâm

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
1. HÀNH ĐỘNG PHẢI NGẮN GỌN CHỈ 1 CÂU (tối đa 8-12 từ):
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

QUAN TRỌNG VỀ NỘI DUNG:
- CHỈ tạo gợi ý thân mật/18+ khi có CONTEXT 18+ HIỆN TẠI ở trên
- KHÔNG được tạo gợi ý thân mật khi đang có tình huống nghiêm túc (lo lắng, nguy hiểm, bị bắt cóc)
- KHÔNG được dùng từ "thân mật", "gần gũi", "kiểm soát" khi không có context 18+ thực sự
- Ưu tiên gợi ý phù hợp với tình huống hiện tại (nghiêm túc → nghiêm túc, vui vẻ → vui vẻ)

QUAN TRỌNG VỀ OUTPUT:
- TRẢ VỀ: CHỈ JSON object thuần túy, không có markdown hay text giải thích
- Bắt đầu bằng { và kết thúc bằng }
- KHÔNG thêm text giải thích hay comments

TRẢ VỀ JSON:
{
  "suggestions": [
    {
      "text": "Hành động ngắn gọn 1 câu (8-12 từ)",
      "summary": "Mô tả ngắn gọn 1 câu (10-15 từ)",
      "durationMinutes": 30,
      "impactTags": ["story", "risk", "relationship"],
      "source": "ai"
    }
  ]
}`;
  }

  private buildQuestContext(questSystem: any): string {
    if (!questSystem) {
      return 'QUEST: Chưa có quest system';
    }

    const activeMainQuests = questSystem.mainQuests?.filter((q: any) => q.status === 'active') || [];
    const activeSideQuests = questSystem.sideQuests?.filter((q: any) => q.status === 'active') || [];
    const declinedQuests = questSystem.questHistory?.filter((q: any) => q.status === 'declined') || [];

    // Giảm context để tiết kiệm token
    let questInfo = `QUEST: Act ${questSystem.currentAct || 1}, Main: ${activeMainQuests.length}, Side: ${activeSideQuests.length}`;

    if (declinedQuests.length > 0) {
      questInfo += `\n- Đã từ chối: ${declinedQuests.slice(0, 3).map((q: any) => q.title).join(', ')}`; // Chỉ lấy 3 quest từ chối gần nhất
    }

    if (activeMainQuests.length > 0) {
      const mainQuest = activeMainQuests[0]; // Chỉ lấy main quest đầu tiên
      questInfo += `\n- Main: ${mainQuest.title}`;
    }

    if (activeSideQuests.length > 0) {
      const sideQuest = activeSideQuests[0]; // Chỉ lấy side quest đầu tiên
      questInfo += `\n- Side: ${sideQuest.title}`;
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
      
      // Giảm mô tả để tiết kiệm token
      let locationInfo = `VỊ TRÍ: ${currentLocation.name} (${currentLocation.type === 'story' ? 'Cốt truyện' : 'Phụ'})`;

      if (nearbyLocations.length > 0) {
        locationInfo += `\n- Lân cận: ${nearbyLocations.slice(0, 3).map((loc: any) => loc.name).join(', ')}`; // Chỉ lấy 3 địa điểm gần nhất
      }

      locationInfo += `\n- CHỈ gợi ý hành động tại vị trí hiện tại hoặc lân cận`;

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

    // Phân tích chat history để tìm context 18+ THỰC SỰ
    const recentMessages = chatHistory.slice(-3);
    const adultKeywords = [
      'hôn', 'ôm chặt', 'chạm', 'quan hệ tình dục', 'arousal', 'hấp dẫn', 'kích thích', 
      'kiss', 'touch', 'intimate', 'sex', 'sexual', 'arousal level', 'hứng tình',
      'thân mật tình dục', 'gần gũi tình dục', 'quyến rũ', 'gợi cảm'
    ];
    
    let hasAdultContext = false;
    let adultContextDescription = '';
    
    // Kiểm tra chat history với context cụ thể hơn
    for (const message of recentMessages) {
      const content = message.content.toLowerCase();
      
      // Kiểm tra xem có phải context 18+ thực sự không
      const hasExplicitAdultContent = adultKeywords.some(keyword => content.includes(keyword));
      
      
      
      if (hasExplicitAdultContent) {
        hasAdultContext = true;
        adultContextDescription += `- Chat gần đây có nội dung 18+: "${message.content.substring(0, 100)}..."\n`;
        break;
      }
    }
    
    // Kiểm tra scene state - chỉ khi arousal level cao và không phải context nghiêm túc
    if (sceneState && sceneState.npcs) {
      for (const npc of sceneState.npcs) {
        if (npc.arousal && npc.arousal.level > 30) { // Chỉ khi arousal cao
          // Kiểm tra xem có phải context nghiêm túc không
          const npcContext = npc.name?.toLowerCase() || '';
          const isSeriousNPCContext = npcContext.includes('elara') && 
                                    (sceneState.mood === 'tense' || sceneState.atmosphere === 'serious');
          
          if (!isSeriousNPCContext) {
            hasAdultContext = true;
            adultContextDescription += `- NPC ${npc.name} có arousal level ${npc.arousal.level}\n`;
          }
        }
      }
    }
    
    if (hasAdultContext) {
      return `CONTEXT 18+ HIỆN TẠI:
${adultContextDescription}
→ LƯU Ý: Chỉ tạo 1-2 gợi ý 18+ phù hợp với tình huống hiện tại, ưu tiên gợi ý liên quan đến cốt truyện và nhiệm vụ`;
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
- CHỈ tạo gợi ý 18+ khi có CONTEXT CỤ THỂ trong cốt truyện hoặc nhiệm vụ
- ƯU TIÊN gợi ý liên quan đến cốt truyện, nhiệm vụ, khám phá, tương tác xã hội
- Tình dục chỉ là một phần nhỏ của trải nghiệm game, không phải trọng tâm
- Nếu cảnh trước đang diễn ra tình huống 18+, chỉ tạo 1-2 gợi ý phù hợp, còn lại tập trung vào cốt truyện và nhiệm vụ`;
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
   * Ước tính thời lượng hành động từ message (hành động thủ công) với cache và tối ưu hóa
   */
  async estimateActionDuration(message: string, context: ActionContext, _contentFlags: ContentFlags): Promise<number> {
    // Kiểm tra cache trước
    const cacheKey = this.generateCacheKey(message);
    const cachedDuration = this.getCachedDuration(cacheKey);
    if (cachedDuration) {
      console.log(`💾 Cache hit: ${cachedDuration} phút cho hành động "${message}"`);
      return cachedDuration;
    }

    // Trước tiên, thử phân loại hành động bằng từ khóa đơn giản (đã được mở rộng)
    const simpleDuration = this.estimateDurationByKeywords(message);
    if (simpleDuration) {
      console.log(`🎯 Ước tính thời gian bằng từ khóa: ${simpleDuration} phút cho hành động "${message}"`);
      this.cacheDuration(cacheKey, simpleDuration);
      return simpleDuration;
    }

    // Thử phân tích nâng cao bằng pattern matching
    const advancedDuration = this.estimateDurationByPatterns(message);
    if (advancedDuration) {
      console.log(`🔍 Ước tính thời gian bằng pattern: ${advancedDuration} phút cho hành động "${message}"`);
      this.cacheDuration(cacheKey, advancedDuration);
      return advancedDuration;
    }

    // Nếu không thể phân loại bằng từ khóa, sử dụng AI với prompt tối ưu
    return this.executeWithRetry(
      async () => {
        const geminiService = await this.getGeminiService();
        
        // Prompt ngắn gọn và hiệu quả hơn
        const prompt = `Ước tính thời gian (phút) cho hành động: "${message}"

Context: ${context.sceneState?.location || 'Unknown'} | Level: ${context.characterData?.level || 1}

Trả về số từ 5-60. Chỉ số, không giải thích.`;

        const response = await geminiService.generateContent(prompt, _contentFlags);
        const minutes = parseInt(response.trim());
        
        // Nếu AI trả về số hợp lệ, sử dụng nó
        if (!isNaN(minutes) && minutes >= 5 && minutes <= 60) {
          console.log(`🤖 AI ước tính thời gian: ${minutes} phút cho hành động "${message}"`);
          this.cacheDuration(cacheKey, minutes);
          return minutes;
        }
        
        throw new Error(`AI trả về thời gian không hợp lệ: ${minutes}`);
      },
      'estimateActionDuration',
      () => {
        // Fallback thông minh hơn dựa trên độ dài message
        const messageLength = message.length;
        let fallbackDuration: number;
        
        if (messageLength <= 20) {
          fallbackDuration = Math.floor(Math.random() * 11) + 5; // 5-15 phút
        } else if (messageLength <= 50) {
          fallbackDuration = Math.floor(Math.random() * 16) + 15; // 15-30 phút
        } else {
          fallbackDuration = Math.floor(Math.random() * 31) + 30; // 30-60 phút
        }
        
        console.log(`🎲 Fallback thời gian: ${fallbackDuration} phút cho hành động "${message}"`);
        this.cacheDuration(cacheKey, fallbackDuration);
        return fallbackDuration;
      }
    );
  }

  /**
   * Cache cho duration estimation
   */
  private durationCache: Map<string, number> = new Map();
  private readonly CACHE_SIZE_LIMIT = 100;

  /**
   * Tạo cache key từ message
   */
  private generateCacheKey(message: string): string {
    return message.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  /**
   * Lấy duration từ cache
   */
  private getCachedDuration(cacheKey: string): number | null {
    return this.durationCache.get(cacheKey) || null;
  }

  /**
   * Lưu duration vào cache
   */
  private cacheDuration(cacheKey: string, duration: number): void {
    // Giới hạn kích thước cache
    if (this.durationCache.size >= this.CACHE_SIZE_LIMIT) {
      const firstKey = this.durationCache.keys().next().value;
      if (firstKey) {
        this.durationCache.delete(firstKey);
      }
    }
    this.durationCache.set(cacheKey, duration);
  }

  /**
   * Ước tính thời gian bằng từ khóa đơn giản (đã được mở rộng)
   */
  private estimateDurationByKeywords(message: string): number | null {
    const lowerMessage = message.toLowerCase();
    
    // Hành động đơn giản (5-15 phút) - mở rộng danh sách
    const simpleActions = [
      'gọi', 'mua', 'uống', 'ăn', 'ngồi', 'đứng', 'nhìn', 'quan sát',
      'chào', 'hỏi', 'trả lời', 'nói', 'thì thầm', 'cười', 'gật đầu',
      'mở', 'đóng', 'cầm', 'đặt', 'lấy', 'cho', 'nhận', 'bước', 'đi',
      'chạm', 'sờ', 'ngửi', 'nghe', 'đọc', 'viết', 'vẽ', 'hát',
      'nhảy', 'chạy', 'đi bộ', 'leo', 'xuống', 'lên', 'vào', 'ra'
    ];
    
    // Hành động trung bình (15-30 phút) - mở rộng danh sách
    const mediumActions = [
      'trò chuyện', 'nói chuyện', 'bắt chuyện', 'làm quen', 'giới thiệu',
      'khám phá', 'tìm kiếm', 'kiểm tra', 'xem xét', 'phân tích',
      'thương lượng', 'đàm phán', 'thỏa thuận', 'giao dịch', 'mua bán',
      'học', 'học hỏi', 'tập luyện', 'rèn luyện', 'cải thiện',
      'sửa chữa', 'làm', 'tạo', 'chế tạo', 'nấu', 'nướng'
    ];
    
    // Hành động phức tạp (30-60 phút) - mở rộng danh sách
    const complexActions = [
      'điều tra', 'truy tìm', 'theo dõi', 'giám sát', 'bảo vệ',
      'chiến đấu', 'đánh nhau', 'tấn công', 'phòng thủ', 'trốn chạy',
      'lập kế hoạch', 'chuẩn bị', 'tổ chức', 'sắp xếp', 'quản lý',
      'xây dựng', 'thiết kế', 'phát triển', 'nghiên cứu', 'thí nghiệm',
      'chữa trị', 'cứu chữa', 'giải cứu', 'giúp đỡ', 'hỗ trợ'
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
    
    return null; // Không thể phân loại, sử dụng pattern matching
  }

  /**
   * Ước tính thời gian bằng pattern matching nâng cao
   */
  private estimateDurationByPatterns(message: string): number | null {
    const lowerMessage = message.toLowerCase();
    
    // Pattern cho hành động ngắn (có từ chỉ thời gian ngắn)
    const shortTimePatterns = [
      /\b(nhanh|mau|lẹ|tức thì|ngay|liền)\b/,
      /\b(chỉ|vài|một chút|ít)\b.*\b(phút|giây|giờ)\b/,
      /\b(đơn giản|dễ|nhanh gọn)\b/
    ];
    
    // Pattern cho hành động dài (có từ chỉ thời gian dài)
    const longTimePatterns = [
      /\b(lâu|dài|nhiều|kỹ lưỡng|chi tiết|cẩn thận)\b/,
      /\b(nhiều|vài|một số)\b.*\b(giờ|ngày|tuần)\b/,
      /\b(phức tạp|khó|phức tạp|tinh vi)\b/
    ];
    
    // Pattern cho hành động có nhiều bước
    const multiStepPatterns = [
      /\b(từng|từng bước|tuần tự|lần lượt)\b/,
      /\b(đầu tiên|sau đó|cuối cùng|tiếp theo)\b/,
      /\b(và|rồi|sau|trước)\b.*\b(và|rồi|sau|trước)\b/
    ];
    
    // Kiểm tra pattern ngắn
    if (shortTimePatterns.some(pattern => pattern.test(lowerMessage))) {
      return Math.floor(Math.random() * 8) + 5; // 5-12 phút
    }
    
    // Kiểm tra pattern dài
    if (longTimePatterns.some(pattern => pattern.test(lowerMessage))) {
      return Math.floor(Math.random() * 25) + 35; // 35-60 phút
    }
    
    // Kiểm tra pattern nhiều bước
    if (multiStepPatterns.some(pattern => pattern.test(lowerMessage))) {
      return Math.floor(Math.random() * 20) + 20; // 20-40 phút
    }
    
    // Pattern dựa trên độ dài câu và số từ
    const wordCount = message.split(/\s+/).length;
    if (wordCount <= 3) {
      return Math.floor(Math.random() * 8) + 5; // 5-12 phút
    } else if (wordCount >= 15) {
      return Math.floor(Math.random() * 25) + 35; // 35-60 phút
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

