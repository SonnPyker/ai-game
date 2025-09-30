import { QuestProgress, QuestObjectiveProgress, QuestRewardProgress } from '../types';

export class QuestDetectionService {
  /**
   * Phân tích chat input để detect quest completion
   */
  async analyzeQuestCompletion(
    chatInput: string, 
    activeQuests: QuestProgress[]
  ): Promise<{
    completedObjectives: { questId: string; objectiveId: string }[];
    suggestedActions: string[];
  }> {
    const completedObjectives: { questId: string; objectiveId: string }[] = [];
    const suggestedActions: string[] = [];

    // Phân tích từng quest đang active
    for (const quest of activeQuests) {
      if (quest.status !== 'active') continue;

      for (const objective of quest.objectives) {
        if (objective.completed) continue;

        // Kiểm tra AI keywords
        if (objective.aiKeywords && objective.aiKeywords.length > 0) {
          const hasKeyword = objective.aiKeywords.some(keyword => 
            chatInput.toLowerCase().includes(keyword.toLowerCase())
          );
          
          if (hasKeyword) {
            completedObjectives.push({
              questId: quest.id,
              objectiveId: objective.id
            });
          }
        }

        // Kiểm tra pattern matching cho các loại quest phổ biến
        const patterns = this.getQuestPatterns(objective.description);
        const hasPattern = patterns.some(pattern => 
          chatInput.toLowerCase().includes(pattern.toLowerCase())
        );

        if (hasPattern) {
          completedObjectives.push({
            questId: quest.id,
            objectiveId: objective.id
          });
        }
      }
    }

    // Tạo suggested actions dựa trên quest chưa hoàn thành
    for (const quest of activeQuests) {
      if (quest.status !== 'active') continue;

      const incompleteObjectives = quest.objectives.filter(obj => !obj.completed);
      if (incompleteObjectives.length > 0) {
        const nextObjective = incompleteObjectives[0];
        suggestedActions.push(`Tiếp tục quest "${quest.title}": ${nextObjective.description}`);
      }
    }

    return {
      completedObjectives,
      suggestedActions
    };
  }

  /**
   * Tạo quest mới từ AI response
   */
  async generateSideQuestFromContext(
    aiResponse: string,
    currentStoryContext: any
  ): Promise<QuestProgress | null> {
    // Kiểm tra nếu có sideQuestOffer từ AI
    if (currentStoryContext.sideQuestOffer) {
      const offer = currentStoryContext.sideQuestOffer;
      // Thêm random để tránh collision nếu 2 quests được tạo cùng lúc
      const questId = `side_quest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const quest: QuestProgress = {
        id: questId,
        type: 'side',
        title: offer.title,
        description: offer.description,
        status: 'available', // Side quest luôn available
        objectives: offer.objectives.map((obj: any, index: number) => ({
          id: obj.id,
          description: obj.description,
          completed: false,
          aiKeywords: obj.aiKeywords || [],
          unlocked: index === 0 // Chỉ objective đầu tiên được unlock
        })),
        rewards: offer.rewards.map((reward: any) => ({
          type: reward.type,
          amount: reward.amount,
          description: reward.description,
          claimed: false
        })),
        createdAt: new Date()
      };

      return quest;
    }

    // Fallback: Tìm các từ khóa tạo quest trong AI response
    const questTriggers = [
      'nhiệm vụ', 'quest', 'yêu cầu', 'giúp đỡ', 'tìm kiếm', 
      'thu thập', 'điều tra', 'bảo vệ', 'giải cứu'
    ];

    const hasQuestTrigger = questTriggers.some(trigger => 
      aiResponse.toLowerCase().includes(trigger)
    );

    if (!hasQuestTrigger) return null;

    // Tạo quest từ context
    const questId = `side_quest_${Date.now()}`;
    const quest: QuestProgress = {
      id: questId,
      type: 'side',
      title: this.extractQuestTitle(aiResponse),
      description: this.extractQuestDescription(aiResponse),
      status: 'locked', // Sẽ được unlock khi player accept
      objectives: this.extractQuestObjectives(aiResponse),
      rewards: this.extractQuestRewards(aiResponse),
      createdAt: new Date()
    };

    return quest;
  }

  /**
   * Kiểm tra điều kiện unlock quest
   */
  checkQuestUnlockConditions(
    quest: QuestProgress,
    gameState: any
  ): boolean {
    if (!quest.unlockConditions) return true;

    const { timeBased, turnBased, storyProgress } = quest.unlockConditions;

    // Kiểm tra time-based unlock
    if (timeBased) {
      const currentTime = gameState.worldTime;
      const questTime = quest.createdAt;
      const timeDiff = currentTime ? 
        (new Date().getTime() - questTime.getTime()) / (1000 * 60 * 60) : 0; // hours
      
      if (timeDiff < 1) return false; // Cần ít nhất 1 giờ
    }

    // Kiểm tra turn-based unlock
    if (turnBased && gameState.turnCounter < turnBased) {
      return false;
    }

    // Kiểm tra story progress
    if (storyProgress) {
      // Logic kiểm tra story progress
      // Có thể dựa vào completed quests hoặc story flags
    }

    return true;
  }

  /**
   * Lấy patterns cho quest objectives
   */
  private getQuestPatterns(objectiveDescription: string): string[] {
    const patterns: string[] = [];
    const description = objectiveDescription.toLowerCase();

    // Patterns cho các loại quest phổ biến
    if (description.includes('nói chuyện') || description.includes('gặp')) {
      patterns.push('nói chuyện', 'gặp', 'thảo luận', 'hỏi');
    }

    if (description.includes('tìm') || description.includes('tìm kiếm')) {
      patterns.push('tìm thấy', 'tìm được', 'phát hiện', 'khám phá');
    }

    if (description.includes('đánh bại') || description.includes('chiến đấu')) {
      patterns.push('đánh bại', 'chiến thắng', 'thắng', 'giết');
    }

    if (description.includes('thu thập') || description.includes('lấy')) {
      patterns.push('thu thập', 'lấy được', 'có được', 'sở hữu');
    }

    if (description.includes('đi đến') || description.includes('đến')) {
      patterns.push('đến', 'đi đến', 'tới', 'vào');
    }

    if (description.includes('hoàn thành') || description.includes('xong')) {
      patterns.push('hoàn thành', 'xong', 'làm xong', 'kết thúc');
    }

    return patterns;
  }

  /**
   * Trích xuất quest title từ AI response
   */
  private extractQuestTitle(aiResponse: string): string {
    // Tìm title trong response, thường nằm trong dấu ngoặc kép hoặc sau dấu ":"
    const titleMatch = aiResponse.match(/"([^"]+)"/) || 
                      aiResponse.match(/title:\s*([^\n]+)/i) ||
                      aiResponse.match(/nhiệm vụ:\s*([^\n]+)/i);
    
    return titleMatch ? titleMatch[1].trim() : 'Quest Mới';
  }

  /**
   * Trích xuất quest description từ AI response
   */
  private extractQuestDescription(aiResponse: string): string {
    // Lấy đoạn mô tả dài nhất trong response
    const sentences = aiResponse.split(/[.!?]/);
    const longestSentence = sentences.reduce((longest, current) => 
      current.length > longest.length ? current : longest
    );
    
    return longestSentence.trim() || aiResponse.substring(0, 200) + '...';
  }

  /**
   * Trích xuất quest objectives từ AI response
   */
  private extractQuestObjectives(aiResponse: string): QuestObjectiveProgress[] {
    const objectives: QuestObjectiveProgress[] = [];
    
    // Tìm các bullet points hoặc numbered lists
    const bulletMatches = aiResponse.match(/[•\-\*]\s*([^\n]+)/g);
    const numberMatches = aiResponse.match(/\d+\.\s*([^\n]+)/g);
    
    const allMatches = [...(bulletMatches || []), ...(numberMatches || [])];
    
    allMatches.forEach((match, index) => {
      const description = match.replace(/[•\-\*]\s*|\d+\.\s*/, '').trim();
      if (description.length > 10) { // Chỉ lấy những mô tả có ý nghĩa
        objectives.push({
          id: `obj_${index}`,
          description,
          completed: false,
          aiKeywords: this.extractKeywords(description),
          unlocked: index === 0 // Chỉ objective đầu tiên được unlock
        });
      }
    });

    // Nếu không tìm thấy bullet points, tạo objective mặc định
    if (objectives.length === 0) {
      objectives.push({
        id: 'obj_0',
        description: 'Hoàn thành nhiệm vụ',
        completed: false,
        aiKeywords: ['hoàn thành', 'xong', 'làm xong'],
        unlocked: true
      });
    }

    return objectives;
  }

  /**
   * Trích xuất quest rewards từ AI response
   */
  private extractQuestRewards(aiResponse: string): QuestRewardProgress[] {
    const rewards: QuestRewardProgress[] = [];
    
    // Tìm các phần thưởng được đề cập
    const rewardMatches = aiResponse.match(/phần thưởng[:\s]*([^\n]+)/i) ||
                         aiResponse.match(/reward[:\s]*([^\n]+)/i) ||
                         aiResponse.match(/thưởng[:\s]*([^\n]+)/i);
    
    if (rewardMatches) {
      const rewardText = rewardMatches[1];
      
      // Tách các phần thưởng
      const rewardItems = rewardText.split(/[,;]/);
      
      rewardItems.forEach((item) => {
        const trimmed = item.trim();
        if (trimmed.length > 0) {
          rewards.push({
            type: this.determineRewardType(trimmed),
            amount: this.extractRewardAmount(trimmed),
            description: trimmed,
            claimed: false
          });
        }
      });
    }

    // Nếu không tìm thấy rewards, tạo reward mặc định
    if (rewards.length === 0) {
      rewards.push({
        type: 'experience',
        amount: 100,
        description: 'Kinh nghiệm +100',
        claimed: false
      });
    }

    return rewards;
  }

  /**
   * Trích xuất keywords từ description
   */
  private extractKeywords(description: string): string[] {
    const words = description.toLowerCase().split(/\s+/);
    
    // Từ khóa quan trọng
    const importantWords = words.filter(word => 
      word.length > 3 && 
      !['của', 'với', 'trong', 'từ', 'đến', 'và', 'hoặc'].includes(word)
    );
    
    return importantWords.slice(0, 5); // Lấy 5 từ khóa quan trọng nhất
  }

  /**
   * Xác định loại reward
   */
  private determineRewardType(rewardText: string): 'experience' | 'item' | 'gold' | 'story_progress' {
    const text = rewardText.toLowerCase();
    
    if (text.includes('kinh nghiệm') || text.includes('exp') || text.includes('xp')) {
      return 'experience';
    }
    if (text.includes('vàng') || text.includes('gold') || text.includes('tiền')) {
      return 'gold';
    }
    if (text.includes('vật phẩm') || text.includes('item') || text.includes('đồ')) {
      return 'item';
    }
    if (text.includes('cốt truyện') || text.includes('story') || text.includes('tiến độ')) {
      return 'story_progress';
    }
    
    return 'experience'; // Mặc định
  }

  /**
   * Trích xuất số lượng reward
   */
  private extractRewardAmount(rewardText: string): number {
    const numberMatch = rewardText.match(/\d+/);
    return numberMatch ? parseInt(numberMatch[0]) : 100;
  }
}

export const questDetectionService = new QuestDetectionService();
