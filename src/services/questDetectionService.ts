import { QuestProgress, QuestObjectiveProgress, QuestRewardProgress } from '../types';

export class QuestDetectionService {
  /**
   * Tạo quest mới từ AI response
   */
  async generateSideQuestFromContext(
    aiResponse: string,
    currentStoryContext: any,
    turnCounter?: number
  ): Promise<QuestProgress | null> {
    // Kiểm tra nếu có sideQuestOffer từ AI
    if (currentStoryContext.sideQuestOffer) {
      const offer = currentStoryContext.sideQuestOffer;
      // Thêm random để tránh collision nếu 2 quests được tạo cùng lúc
      const questId = offer.isLocationSignature 
        ? `signature_quest_${offer.signatureLocationId}_${Date.now()}`
        : `side_quest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Tạo objectives dựa trên loại quest với format mới
      let objectives: any[] = [];
      if (offer.isLocationSignature && offer.objectives && offer.objectives.length >= 2) {
        // Signature quest: tạo cả 2 objectives
        objectives = [
          {
            id: 'obj_1',
            description: offer.objectives[0]?.description || 'Bắt đầu nhiệm vụ',
            completed: false,
            unlocked: true,
            type: offer.objectives[0]?.type || 'find_item',
            targetItemName: offer.objectives[0]?.targetItemName,
            targetNPCName: offer.objectives[0]?.targetNPCName,
            targetEnemyName: offer.objectives[0]?.targetEnemyName,
            targetEnemyType: offer.objectives[0]?.targetEnemyType,
            requiredQuantity: offer.objectives[0]?.requiredQuantity,
            requiredKills: offer.objectives[0]?.requiredKills,
            targetLocationName: offer.objectives[0]?.targetLocationName,
            deliveryItemName: offer.objectives[0]?.deliveryItemName,
            deliveryNPCName: offer.objectives[0]?.deliveryNPCName,
            aiKeywords: offer.objectives[0]?.aiKeywords || []
          },
          {
            id: 'obj_2',
            description: offer.objectives[1]?.description || 'Báo cáo kết quả',
            completed: false,
            unlocked: false, // Objective thứ 2 sẽ unlock khi hoàn thành objective 1
            type: offer.objectives[1]?.type || 'find_npc',
            targetItemName: offer.objectives[1]?.targetItemName,
            targetNPCName: offer.objectives[1]?.targetNPCName,
            targetEnemyName: offer.objectives[1]?.targetEnemyName,
            targetEnemyType: offer.objectives[1]?.targetEnemyType,
            requiredQuantity: offer.objectives[1]?.requiredQuantity,
            requiredKills: offer.objectives[1]?.requiredKills,
            targetLocationName: offer.objectives[1]?.targetLocationName,
            deliveryItemName: offer.objectives[1]?.deliveryItemName,
            deliveryNPCName: offer.objectives[1]?.deliveryNPCName,
            aiKeywords: offer.objectives[1]?.aiKeywords || ['báo cáo', 'gặp lại', 'trả lời']
          }
        ];
      } else {
        // Quest thường: chỉ tạo objective đầu tiên
        objectives = [
          {
            id: 'obj_1',
            description: offer.objectives[0]?.description || 'Bắt đầu nhiệm vụ',
            completed: false,
            unlocked: true,
            type: offer.objectives[0]?.type || 'find_item',
            targetItemName: offer.objectives[0]?.targetItemName,
            targetNPCName: offer.objectives[0]?.targetNPCName,
            targetEnemyName: offer.objectives[0]?.targetEnemyName,
            targetEnemyType: offer.objectives[0]?.targetEnemyType,
            requiredQuantity: offer.objectives[0]?.requiredQuantity,
            requiredKills: offer.objectives[0]?.requiredKills,
            targetLocationName: offer.objectives[0]?.targetLocationName,
            deliveryItemName: offer.objectives[0]?.deliveryItemName,
            deliveryNPCName: offer.objectives[0]?.deliveryNPCName,
            aiKeywords: offer.objectives[0]?.aiKeywords || []
          }
        ];
      }
      
      const quest: QuestProgress = {
        id: questId,
        type: 'side',
        title: offer.title,
        description: offer.description,
        status: 'available', // Side quest luôn available
        objectives: objectives,
        rewards: offer.rewards.map((reward: any) => ({
          type: reward.type,
          amount: reward.amount,
          description: reward.description,
          claimed: false,
          // Thêm items array cho item rewards
          ...(reward.type === 'item' && reward.items ? { items: reward.items } : {}),
          // Thêm các fields khác nếu có
          ...(reward.signatureLocationId ? { signatureLocationId: reward.signatureLocationId } : {}),
          ...(reward.signatureNPCId ? { signatureNPCId: reward.signatureNPCId } : {}),
          ...(reward.status ? { status: reward.status } : {})
        })),
        createdAt: new Date(),
        turnCreated: turnCounter || Date.now(), // Lưu turn khi quest được tạo để tính toán tần suất
        // Location signature quest system
        isLocationSignature: offer.isLocationSignature || false,
        signatureLocationId: offer.signatureLocationId || undefined,
        signatureNPCId: offer.signatureNPCId || undefined,
        // Lưu trữ toàn bộ objectives để tạo dần sau này
        _allObjectives: offer.objectives || []
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

    // Tạo quest từ context với format mới
    const questId = `side_quest_${Date.now()}`;
    const quest: QuestProgress = {
      id: questId,
      type: 'side',
      title: this.extractQuestTitle(aiResponse),
      description: this.extractQuestDescription(aiResponse),
      status: 'locked', // Sẽ được unlock khi player accept
      objectives: this.extractQuestObjectivesNew(aiResponse),
      rewards: this.extractQuestRewards(aiResponse, 'side', this.getCharacterLevel()),
      createdAt: new Date(),
      turnCreated: turnCounter || Date.now() // Lưu turn khi quest được tạo để tính toán tần suất
    };

    return quest;
  }

  /**
   * Tạo objective tiếp theo cho side quest
   */
  generateNextObjective(quest: QuestProgress): QuestObjectiveProgress | null {
    if (!quest._allObjectives || quest._allObjectives.length === 0) {
      return null;
    }

    // Tìm objective tiếp theo chưa được tạo
    const currentObjectiveCount = quest.objectives.length;
    const nextObjectiveData = quest._allObjectives[currentObjectiveCount];
    
    if (!nextObjectiveData) {
      return null; // Không còn objective nào
    }

    return {
      id: nextObjectiveData.id,
      description: nextObjectiveData.description,
      completed: false,
      unlocked: true,
      type: (nextObjectiveData as any).type || 'find_item',
      targetItemName: (nextObjectiveData as any).targetItemName,
      targetNPCName: (nextObjectiveData as any).targetNPCName,
      targetEnemyName: (nextObjectiveData as any).targetEnemyName,
      targetEnemyType: (nextObjectiveData as any).targetEnemyType,
      requiredQuantity: (nextObjectiveData as any).requiredQuantity,
      requiredKills: (nextObjectiveData as any).requiredKills,
      targetLocationName: (nextObjectiveData as any).targetLocationName,
      deliveryItemName: (nextObjectiveData as any).deliveryItemName,
      deliveryNPCName: (nextObjectiveData as any).deliveryNPCName,
      aiKeywords: nextObjectiveData.aiKeywords || []
    };
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
   * Extract quest objectives with new format
   */
  private extractQuestObjectivesNew(aiResponse: string): QuestObjectiveProgress[] {
    const objectives: QuestObjectiveProgress[] = [];
    
    // Simple pattern matching to create basic objectives
    const lines = aiResponse.split('\n').filter(line => line.trim());
    
    for (let i = 0; i < Math.min(lines.length, 3); i++) {
      const line = lines[i].trim();
      if (line.length < 10) continue; // Skip very short lines
      
      // Determine objective type based on content
      let type: 'find_item' | 'find_npc' | 'combat' | 'travel' | 'chain_delivery' = 'find_item';
      
      if (line.includes('đánh bại') || line.includes('tiêu diệt') || line.includes('chiến đấu')) {
        type = 'combat';
      } else if (line.includes('gặp') || line.includes('nói chuyện') || line.includes('tìm người')) {
        type = 'find_npc';
      } else if (line.includes('đến') || line.includes('di chuyển') || line.includes('tới')) {
        type = 'travel';
      } else if (line.includes('giao') || line.includes('mang đến') || line.includes('đưa cho')) {
        type = 'chain_delivery';
      }
      
      const objective: QuestObjectiveProgress = {
        id: `obj_${i + 1}`,
        description: line,
        completed: false,
        unlocked: true,
        type: type,
        aiKeywords: this.extractKeywords(line)
      };
      
      // Add specific fields based on type
      this.addTrackingFieldsToObjective(objective, line);
      
      objectives.push(objective);
    }
    
    return objectives.length > 0 ? objectives : [{
      id: 'obj_1',
      description: 'Hoàn thành nhiệm vụ',
      completed: false,
      unlocked: true,
      type: 'find_item',
      aiKeywords: []
    }];
  }

  /**
   * Add tracking fields to objective based on type and content
   */
  private addTrackingFieldsToObjective(objective: QuestObjectiveProgress, content: string): void {
    const lowerContent = content.toLowerCase();
    
    switch (objective.type) {
      case 'find_item':
        // Extract item name
        const itemMatch = lowerContent.match(/(?:tìm|thu thập|lấy|nhặt|kiếm)\s+([^,.\s]+(?:\s+[^,.\s]+)*)/);
        if (itemMatch) {
          objective.targetItemName = itemMatch[1].trim();
        }
        
        // Extract quantity
        const quantityMatch = lowerContent.match(/(\d+)\s*(?:cái|chiếc|con|người|vật|món)/);
        if (quantityMatch) {
          objective.requiredQuantity = parseInt(quantityMatch[1]);
        }
              break;
        
      case 'find_npc':
        // Extract NPC name
        const npcMatch = lowerContent.match(/(?:gặp|nói chuyện|tìm|liên lạc)\s+([^,.\s]+(?:\s+[^,.\s]+)*)/);
        if (npcMatch) {
          objective.targetNPCName = npcMatch[1].trim();
        }
        break;
        
      case 'combat':
        // Extract enemy info
        const enemyMatch = lowerContent.match(/(?:đánh bại|tiêu diệt|hạ gục|giết)\s+([^,.\s]+(?:\s+[^,.\s]+)*)/);
        if (enemyMatch) {
          objective.targetEnemyName = enemyMatch[1].trim();
        }
        
        // Extract quantity and limit to maximum 3
        const killMatch = lowerContent.match(/(\d+)\s*(?:con|tên|người)/);
        if (killMatch) {
          objective.requiredKills = Math.min(parseInt(killMatch[1]), 3);
        } else {
          objective.requiredKills = 1;
        }
        break;
        
      case 'travel':
        // Extract location name
        const locationMatch = lowerContent.match(/(?:đến|tới|di chuyển|thăm|khám phá)\s+([^,.\s]+(?:\s+[^,.\s]+)*)/);
        if (locationMatch) {
          objective.targetLocationName = locationMatch[1].trim();
        }
        break;
        
      case 'chain_delivery':
        // Extract item and NPC names
        const deliveryItemMatch = lowerContent.match(/(?:mang|giao|đưa|chuyển)\s+([^,.\s]+(?:\s+[^,.\s]+)*)\s+(?:đến|cho|tới)/);
        if (deliveryItemMatch) {
          objective.deliveryItemName = deliveryItemMatch[1].trim();
        }
        
        const deliveryNPCMatch = lowerContent.match(/(?:đến|cho|tới)\s+([^,.\s]+(?:\s+[^,.\s]+)*)/);
        if (deliveryNPCMatch) {
          objective.deliveryNPCName = deliveryNPCMatch[1].trim();
        }
        break;
    }
  }

  /**
   * Extract quest title from AI response
   */
  private extractQuestTitle(aiResponse: string): string {
    // Simple extraction - look for patterns that might indicate a title
    const lines = aiResponse.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      if (line.length > 10 && line.length < 50 && !line.includes('.')) {
        return line.trim();
      }
    }
    
    return 'Nhiệm vụ mới';
  }

  /**
   * Extract quest description from AI response
   */
  private extractQuestDescription(aiResponse: string): string {
    // Take first meaningful sentence as description
    const sentences = aiResponse.split(/[.!?]/).filter(s => s.trim().length > 10);
    return sentences[0]?.trim() || 'Mô tả nhiệm vụ';
  }

  /**
   * Extract quest rewards from AI response
   */
  private extractQuestRewards(_aiResponse: string, questType: 'main' | 'side' | 'faction', characterLevel: number): QuestRewardProgress[] {
    const rewards: QuestRewardProgress[] = [];
    
    // Default rewards based on quest type
    if (questType === 'main') {
      rewards.push(
        {
          type: 'currency',
          amount: characterLevel * 30,
          description: `Tiền tệ +${characterLevel * 30}`,
          claimed: false
        },
        {
          type: 'experience',
          amount: characterLevel * 100,
          description: `Kinh nghiệm +${characterLevel * 100}`,
          claimed: false
        },
        {
          type: 'item',
          amount: 1,
          items: [this.generateRandomRewardItem(characterLevel)],
          description: 'Vật phẩm ngẫu nhiên',
          claimed: false
        }
      );
    } else if (questType === 'side') {
      // Random 2 out of 3 reward types
      const rewardTypes = ['currency', 'experience', 'item'];
      const selectedTypes = this.shuffleArray(rewardTypes).slice(0, 2);

      selectedTypes.forEach(type => {
        if (type === 'currency') {
          rewards.push({
            type: 'currency',
            amount: characterLevel * 20,
            description: `Tiền tệ +${characterLevel * 20}`,
            claimed: false
          });
        } else if (type === 'experience') {
          rewards.push({
            type: 'experience',
            amount: characterLevel * 75,
            description: `Kinh nghiệm +${characterLevel * 75}`,
            claimed: false
          });
        } else if (type === 'item') {
          rewards.push({
            type: 'item',
            amount: 1,
            items: [this.generateRandomRewardItem(characterLevel)],
            description: 'Vật phẩm ngẫu nhiên',
            claimed: false
          });
        }
      });
    } else if (questType === 'faction') {
      rewards.push(
        {
          type: 'currency',
          amount: characterLevel * 25,
          description: `Tiền tệ +${characterLevel * 25}`,
          claimed: false
        },
        {
          type: 'experience',
          amount: characterLevel * 80,
          description: `Kinh nghiệm +${characterLevel * 80}`,
          claimed: false
        },
        {
          type: 'item',
          amount: 1,
          items: [this.generateRandomRewardItem(characterLevel, true)],
          description: 'Vật phẩm đặc trưng phe phái',
          claimed: false
        },
        {
          type: 'faction_reputation',
          amount: 50,
          description: `Danh tiếng phe phái +50`,
          claimed: false
        }
      );
    }

    return rewards;
  }

  /**
   * Shuffle array helper
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Lấy level hiện tại của character từ localStorage
   */
  private getCharacterLevel(): number {
    try {
      const characterData = localStorage.getItem('currentCharacter');
      if (characterData) {
        const character = JSON.parse(characterData);
        return character.level || 1;
      }
    } catch (error) {
      console.warn('Failed to get character level:', error);
    }
    return 1; // Default level
  }

  /**
   * Tạo item reward ngẫu nhiên với tên và mô tả rõ ràng
   */
  private generateRandomRewardItem(characterLevel: number, isFaction: boolean = false): any {
    const itemTypes = ['weapon', 'armor', 'consumable', 'misc'];
    const randomType = itemTypes[Math.floor(Math.random() * itemTypes.length)];
    
    // Tên items theo loại
    const itemNames = {
      weapon: ['Kiếm sắt', 'Rìu chiến', 'Cung tên', 'Gậy phép', 'Dao găm'],
      armor: ['Áo giáp da', 'Giáp sắt', 'Khiên gỗ', 'Mũ sắt', 'Găng tay da'],
      consumable: ['Thuốc hồi máu', 'Thuốc mana', 'Bánh mì', 'Nước uống', 'Thuốc độc'],
      misc: ['Đá quý', 'Chìa khóa', 'Bản đồ', 'Sách phép', 'Vật liệu']
    };

    const itemDescriptions = {
      weapon: ['Vũ khí sắc bén', 'Công cụ chiến đấu hiệu quả', 'Vũ khí được rèn kỹ'],
      armor: ['Trang bị bảo vệ', 'Giáp phòng thủ tốt', 'Đồ bảo hộ chất lượng'],
      consumable: ['Vật phẩm hữu ích', 'Đồ dùng cần thiết', 'Vật phẩm có giá trị'],
      misc: ['Vật phẩm đặc biệt', 'Đồ vật quý hiếm', 'Vật liệu hữu ích']
    };

    const names = itemNames[randomType as keyof typeof itemNames];
    const descriptions = itemDescriptions[randomType as keyof typeof itemDescriptions];
    
    const randomName = names[Math.floor(Math.random() * names.length)];
    const randomDesc = descriptions[Math.floor(Math.random() * descriptions.length)];
    
    // Rarity dựa trên level và loại
    let rarity: string = 'common';
    if (characterLevel >= 10) {
      rarity = Math.random() < 0.3 ? 'rare' : Math.random() < 0.6 ? 'uncommon' : 'common';
    } else if (characterLevel >= 5) {
      rarity = Math.random() < 0.2 ? 'rare' : Math.random() < 0.4 ? 'uncommon' : 'common';
    }

    if (isFaction) {
      rarity = 'unique';
    }

    const item = {
      id: `reward_item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: isFaction ? `${randomName} phe phái` : randomName,
      description: isFaction ? `${randomDesc} đặc trưng của phe phái` : randomDesc,
      type: randomType,
      rarity: rarity,
      quantity: 1,
      icon: randomType === 'weapon' ? '⚔' : randomType === 'armor' ? '○' : randomType === 'consumable' ? '○' : '□',
      isEquipped: false,
      tags: ['reward', randomType]
    };

    return item;
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
}

export const questDetectionService = new QuestDetectionService();