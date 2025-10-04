import { WorldTime, ContentFlags } from '../types';

export interface SuggestedAction {
  id: string;
  text: string;        // câu sẽ chèn vào input
  summary: string;     // mô tả 1-2 câu
  pros: string[];      // lợi
  cons: string[];      // hại
  durationMinutes: number; // >= 10
  impactTags: string[];    // ví dụ: ['story','risk','relationship']
  source: 'ai' | 'quest' | 'heuristic';
}

export interface ActionLogEntry {
  id: string;
  actionId?: string;
  text: string;
  summary: string;
  pros: string[];
  cons: string[];
  durationMinutes: number;
  startedAt: WorldTime;
  endedAt: WorldTime;
  turn: number;
  impactTags: string[];
  source: 'suggestion' | 'manual';
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
    const contentFlags = this.getJsonFromStorage('currentWorldData')?.contentFlags || { adult_enabled: false, adult_intensity: 'fade' };

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
   * Sinh 4 gợi ý hành động từ AI
   */
  async generateSuggestions(context: ActionContext, contentFlags: ContentFlags): Promise<SuggestedAction[]> {
    try {
      const geminiService = await this.getGeminiService();
      
      const prompt = this.buildSuggestionPrompt(context, contentFlags);
      const response = await geminiService.generateContent(prompt);
      
      const suggestions = this.parseSuggestionsFromResponse(response);
      return this.filterByContentFlags(suggestions, contentFlags);
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
      return this.generateFallbackSuggestions(context);
    }
  }

  private buildSuggestionPrompt(context: ActionContext, contentFlags: ContentFlags): string {
    const { worldData, characterData, questSystem, summary, sceneState, chatHistory, worldTime } = context;
    
    const contentGuidance = this.getContentGuidance(contentFlags);
    
    // Quest context information
    const questContext = this.buildQuestContext(questSystem);
    
    return `Bạn là AI trợ lý cho game RPG text-based. Hãy tạo 4 gợi ý hành động ngắn gọn (1-2 câu) cho người chơi dựa trên context hiện tại.

QUAN TRỌNG: ƯU TIÊN HÀNH ĐỘNG GẦN ĐÂY CỦA NGƯỜI CHƠI - Không ép buộc vào quest nếu người chơi đang làm việc khác.

CONTEXT GAME:
- Thế giới: ${worldData?.name || 'Unknown'} - ${worldData?.coreIdea || 'No description'}
- Thể loại: ${worldData?.genre || 'Unknown'} - ${worldData?.setting || 'Unknown'}
- Nhân vật: ${characterData?.name || 'Unknown'} - ${characterData?.description || 'No description'}
- Thời gian: ${worldTime.hour}:${worldTime.minute.toString().padStart(2, '0')} ngày ${worldTime.day}/${worldTime.month}/${worldTime.year}
- Tình huống hiện tại: ${sceneState ? JSON.stringify(sceneState) : 'Chưa có'}
- Tóm tắt cốt truyện: ${summary?.content || 'Chưa có'}
- Chat gần đây: ${chatHistory.slice(-5).map(msg => `${msg.role}: ${msg.content}`).join('\n')}

${questContext}

${contentGuidance}

YÊU CẦU:
1. Mỗi gợi ý phải có thời lượng 10-120 phút
2. Có lợi và hại rõ ràng
3. Phù hợp với tình huống hiện tại
4. Ngắn gọn, dễ hiểu
5. Có thể thực hiện ngay
6. ƯU TIÊN: Dựa trên hành động và context gần đây của người chơi
7. Quest chỉ là tham khảo, không ép buộc - chỉ đề xuất nếu phù hợp với hướng đi hiện tại

TRẢ VỀ JSON:
{
  "suggestions": [
    {
      "text": "Hành động cụ thể để chèn vào input",
      "summary": "Mô tả ngắn gọn 1-2 câu",
      "pros": ["Lợi ích 1", "Lợi ích 2"],
      "cons": ["Rủi ro 1", "Rủi ro 2"],
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

    let questInfo = `QUEST SYSTEM (THAM KHẢO - KHÔNG ÉP BUỘC):
- Act hiện tại: ${questSystem.currentAct || 1}
- Main quests đang active: ${activeMainQuests.length}
- Side quests đang active: ${activeSideQuests.length}
- Quests đã hoàn thành: ${completedQuests.length}`;

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

  private getContentGuidance(contentFlags: ContentFlags): string {
    if (!contentFlags.adult_enabled) {
      return "HẠN CHẾ NỘI DUNG: Không tạo gợi ý có nội dung 18+, bạo lực, hoặc không phù hợp. Tập trung vào hành động phiêu lưu, khám phá, tương tác xã hội an toàn.";
    }
    
    if (contentFlags.adult_intensity === 'fade' || contentFlags.adult_intensity === 'light') {
      return "HẠN CHẾ NỘI DUNG: Có thể đề cập đến nội dung 18+ nhưng phải nhẹ nhàng, ẩn ý, không tả thực. Tập trung vào tình cảm, mối quan hệ.";
    }
    
    return "NỘI DUNG: Có thể tạo gợi ý với nội dung 18+ phù hợp với cốt truyện, nhưng phải có ý nghĩa và không chỉ là fan service.";
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
        pros: Array.isArray(s.pros) ? s.pros : [],
        cons: Array.isArray(s.cons) ? s.cons : [],
        durationMinutes: Math.max(10, Math.min(120, s.durationMinutes || 30)),
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
      
      const activeQuests = allQuests.filter(q => q.status === 'active');
      if (activeQuests.length > 0) {
        const quest = activeQuests[0];
        const nextObjective = quest.objectives?.find((obj: any) => !obj.completed);
        if (nextObjective) {
          suggestions.push({
            id: `quest_${Date.now()}`,
            text: `Tiếp tục nhiệm vụ "${quest.title}": ${nextObjective.description}`,
            summary: `Tiếp tục nhiệm vụ chính: ${nextObjective.description}`,
            pros: ['Tiến bộ cốt truyện', 'Phần thưởng kinh nghiệm'],
            cons: ['Có thể gặp nguy hiểm'],
            durationMinutes: 15,
            impactTags: ['quest', 'story'],
            source: 'quest'
          });
        }
      }
    }
    
    // Heuristic suggestions
    const heuristicSuggestions = [
      {
        text: 'Khám phá khu vực xung quanh để tìm manh mối',
        summary: 'Khám phá môi trường xung quanh',
        pros: ['Tìm thấy thông tin mới', 'Có thể gặp NPC'],
        cons: ['Mất thời gian', 'Có thể gặp nguy hiểm'],
        durationMinutes: 20,
        impactTags: ['exploration', 'discovery']
      },
      {
        text: 'Nghỉ ngơi và suy nghĩ về tình huống hiện tại',
        summary: 'Dành thời gian suy nghĩ và lên kế hoạch',
        pros: ['Tăng sự hiểu biết', 'Lên kế hoạch tốt hơn'],
        cons: ['Mất thời gian', 'Có thể bỏ lỡ cơ hội'],
        durationMinutes: 10,
        impactTags: ['planning', 'reflection']
      },
      {
        text: 'Tìm kiếm thông tin từ người dân địa phương',
        summary: 'Hỏi thăm thông tin từ NPC',
        pros: ['Thu thập thông tin', 'Xây dựng mối quan hệ'],
        cons: ['Có thể bị lừa', 'Mất tiền'],
        durationMinutes: 30,
        impactTags: ['social', 'information']
      }
    ];
    
    heuristicSuggestions.forEach((s, index) => {
      suggestions.push({
        id: `heuristic_${Date.now()}_${index}`,
        text: s.text,
        summary: s.summary,
        pros: s.pros,
        cons: s.cons,
        durationMinutes: s.durationMinutes,
        impactTags: s.impactTags,
        source: 'heuristic'
      });
    });
    
    return suggestions.slice(0, 4); // Chỉ lấy 4 gợi ý
  }

  /**
   * Ước tính thời lượng hành động từ message
   */
  async estimateActionDuration(message: string, context: ActionContext, _contentFlags: ContentFlags): Promise<number> {
    try {
      const geminiService = await this.getGeminiService();
      
      const prompt = `Ước tính thời gian thực hiện hành động sau (tính bằng phút, tối thiểu 5 phút, tối đa 60 phút):

Hành động: "${message}"
Context: ${JSON.stringify({
        worldTime: context.worldTime,
        sceneState: context.sceneState,
        characterLevel: context.characterData?.level || 1
      })}

Chỉ trả về số phút (ví dụ: 10), không giải thích.`;

      const response = await geminiService.generateContent(prompt);
      const minutes = parseInt(response.trim());
      
      return Math.max(5, Math.min(60, isNaN(minutes) ? 10 : minutes));
    } catch (error) {
      console.error('Error estimating action duration:', error);
      return 10; // Default 10 phút
    }
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
}

export const actionSuggestionService = ActionSuggestionService.getInstance();
