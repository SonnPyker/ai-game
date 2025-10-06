import { QuestProgress, QuestObjectiveProgress, QuestRewardProgress } from '../types';

export class QuestDetectionService {
  /**
   * Phân tích chat input để detect quest completion với context đầy đủ
   */
  async analyzeQuestCompletion(
    chatInput: string, 
    activeQuests: QuestProgress[],
    sceneState?: any,
    additionalContext?: {
      sccContext?: any;
      storyProgress?: any;
      chatHistory?: Array<{ role: string; content: string; turn?: number }>;
      worldTime?: any;
      turnCounter?: number;
      npcRelationships?: any;
    }
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
        if (objective.completed) {
          continue;
        }

        if (!objective.unlocked) {
          continue;
        }

        // Tạo một array để lưu tất cả các match methods
        const matchResults: { method: string; confidence: number; details: string }[] = [];

        // 1. Kiểm tra AI keywords (ưu tiên cao nhất)
        if (objective.aiKeywords && objective.aiKeywords.length > 0) {
          const keywordResult = this.enhancedKeywordMatching(chatInput, objective.aiKeywords);
          if (keywordResult.matched) {
            matchResults.push({
              method: 'AI Keywords',
              confidence: keywordResult.confidence,
              details: `Matched keywords: ${keywordResult.matchedKeywords?.join(', ')}`
            });
          }
        }

        // 2. Kiểm tra pattern matching với validation chặt chẽ hơn
        const patterns = this.getEnhancedQuestPatterns(objective.description);
        const patternResult = this.enhancedPatternMatching(chatInput, patterns, objective.description);
        if (patternResult.matched) {
          matchResults.push({
            method: 'Pattern Matching',
            confidence: patternResult.confidence,
            details: `Matched patterns: ${patternResult.matchedPatterns?.join(', ')}`
          });
        }

        // 3. SceneState-based analysis (chỉ khi có context cụ thể)
        if (sceneState) {
          const sceneResult = this.analyzeSceneStateForQuestCompletion(chatInput, objective.description, sceneState);
          if (sceneResult.matched) {
            matchResults.push({
              method: 'Scene State',
              confidence: sceneResult.confidence,
              details: sceneResult.details || 'Scene context match'
            });
          }
        }

        // 4. Context-based analysis (chỉ khi có context cụ thể)
        const contextResult = this.analyzeContextForQuestCompletion(chatInput, objective.description, quest);
        if (contextResult.matched) {
          matchResults.push({
            method: 'Quest Context',
            confidence: contextResult.confidence,
            details: contextResult.details || 'Quest context match'
          });
        }

        // 5. Side Quest specific analysis (ưu tiên cao cho side quest)
        if (quest.type === 'side') {
          const sideQuestResult = this.analyzeSideQuestCompletion(chatInput, objective.description, quest, additionalContext);
          if (sideQuestResult.matched) {
            matchResults.push({
              method: 'Side Quest Specific',
              confidence: sideQuestResult.confidence,
              details: sideQuestResult.details || 'Side quest specific match'
            });
          }
        }

        // 6. SCC Context analysis (chỉ khi có context cụ thể)
        if (additionalContext?.sccContext) {
          const sccResult = this.analyzeSCCContextForQuestCompletion(chatInput, objective.description, additionalContext.sccContext);
          if (sccResult.matched) {
            matchResults.push({
              method: 'SCC Context',
              confidence: sccResult.confidence,
              details: sccResult.details || 'SCC context match'
            });
          }
        }

        // 7. Chat History analysis (chỉ khi có context cụ thể)
        if (additionalContext?.chatHistory) {
          const historyResult = this.analyzeChatHistoryForQuestCompletion(chatInput, objective.description, additionalContext.chatHistory);
          if (historyResult.matched) {
            matchResults.push({
              method: 'Chat History',
              confidence: historyResult.confidence,
              details: historyResult.details || 'Chat history match'
            });
          }
        }

        // 8. NPC Relationship analysis (chỉ khi có context cụ thể)
        if (additionalContext?.npcRelationships) {
          const npcResult = this.analyzeNPCRelationshipsForQuestCompletion(chatInput, objective.description, additionalContext.npcRelationships);
          if (npcResult.matched) {
            matchResults.push({
              method: 'NPC Relationships',
              confidence: npcResult.confidence,
              details: npcResult.details || 'NPC relationship match'
            });
          }
        }

        // 9. Story Progress analysis (chỉ khi có context cụ thể)
        if (additionalContext?.storyProgress) {
          const storyResult = this.analyzeStoryProgressForQuestCompletion(chatInput, objective.description, additionalContext.storyProgress);
          if (storyResult.matched) {
            matchResults.push({
              method: 'Story Progress',
              confidence: storyResult.confidence,
              details: storyResult.details || 'Story progress match'
            });
          }
        }

        // 10. Time-based analysis (chỉ khi có context cụ thể)
        if (additionalContext?.worldTime && additionalContext?.turnCounter) {
          const timeResult = this.analyzeTimeBasedQuestCompletion(chatInput, objective.description, additionalContext.worldTime, additionalContext.turnCounter, quest);
          if (timeResult.matched) {
            matchResults.push({
              method: 'Time-based',
              confidence: timeResult.confidence,
              details: timeResult.details || 'Time-based match'
            });
          }
        }

        // Quyết định completion dựa trên kết quả tổng hợp với validation chặt chẽ hơn
        if (matchResults.length > 0) {
          // Sắp xếp theo confidence giảm dần
          matchResults.sort((a, b) => b.confidence - a.confidence);
          
          const bestMatch = matchResults[0];
          
          // Validation chặt chẽ hơn để giảm false positive
          const validationResult = this.validateQuestCompletion(chatInput, objective.description, quest, matchResults, additionalContext);
          
          if (!validationResult.isValid) {
            continue; // Skip this objective
          }
          
          // Confidence calculation với validation chặt chẽ hơn
          let minConfidence = 0.7; // Tăng ngưỡng mặc định
          let confidenceBoost = 0;
          
          if (quest.type === 'side') {
            minConfidence = 0.65; // Vẫn thấp hơn cho side quest nhưng không quá thấp
            
            // Chỉ boost nếu có multiple strong matches
            if (matchResults.length > 1) {
              const secondBest = matchResults[1];
              if (secondBest.confidence > 0.5) { // Tăng threshold
                confidenceBoost = 0.05; // Giảm boost
              }
            }
            
            // Chỉ boost nếu có Side Quest Specific match với confidence cao
            const sideQuestMatch = matchResults.find(m => m.method === 'Side Quest Specific');
            if (sideQuestMatch && sideQuestMatch.confidence > 0.6) {
              confidenceBoost += 0.03; // Giảm boost
            }
            
            // Chỉ boost nếu có AI Keywords match với confidence cao
            const aiKeywordMatch = matchResults.find(m => m.method === 'AI Keywords');
            if (aiKeywordMatch && aiKeywordMatch.confidence > 0.7) {
              confidenceBoost += 0.02; // Giảm boost
            }
          }
          
          const finalConfidence = Math.min(1.0, bestMatch.confidence + confidenceBoost);
          
          if (finalConfidence >= minConfidence) {
            completedObjectives.push({
              questId: quest.id,
              objectiveId: objective.id
            });
          }
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
      
      // Tạo objectives dựa trên loại quest
      let objectives: any[] = [];
      if (offer.isLocationSignature && offer.objectives && offer.objectives.length >= 2) {
        // Signature quest: tạo cả 2 objectives
        objectives = [
          {
            id: 'obj_1',
            description: offer.objectives[0]?.description || 'Bắt đầu nhiệm vụ',
            completed: false,
            aiKeywords: offer.objectives[0]?.aiKeywords || [],
            unlocked: true
          },
          {
            id: 'obj_2',
            description: offer.objectives[1]?.description || 'Báo cáo kết quả',
            completed: false,
            aiKeywords: offer.objectives[1]?.aiKeywords || ['báo cáo', 'gặp lại', 'trả lời'],
            unlocked: false // Objective thứ 2 sẽ unlock khi hoàn thành objective 1
          }
        ];
      } else {
        // Quest thường: chỉ tạo objective đầu tiên
        objectives = [
          {
            id: 'obj_1',
            description: offer.objectives[0]?.description || 'Bắt đầu nhiệm vụ',
            completed: false,
            aiKeywords: offer.objectives[0]?.aiKeywords || [],
            unlocked: true
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
          claimed: false
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
      aiKeywords: nextObjectiveData.aiKeywords || [],
      unlocked: true
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
   * Enhanced keyword matching với fuzzy matching và validation chặt chẽ hơn
   */
  private enhancedKeywordMatching(chatInput: string, keywords: string[]): { matched: boolean; confidence: number; matchedKeywords?: string[] } {
    const input = chatInput.toLowerCase();
    const matchedKeywords: string[] = [];
    let maxConfidence = 0;
    
    for (const keyword of keywords) {
      const keywordLower = keyword.toLowerCase();
      let confidence = 0;
      
      // Exact match - confidence cao nhất nhưng cần validation
      if (input.includes(keywordLower)) {
        // Kiểm tra context trước khi gán confidence cao
        const contextValidation = this.validateKeywordContext(input, keywordLower);
        if (contextValidation.isValid) {
          confidence = 0.9;
          matchedKeywords.push(keyword);
        } else {
          // Nếu context không hợp lệ, giảm confidence
          confidence = 0.5;
          matchedKeywords.push(keyword);
        }
      } else {
        // Fuzzy matching - tìm từ tương tự với validation chặt chẽ hơn
        const words = input.split(/\s+/);
        for (const word of words) {
          const similarity = this.calculateSimilarity(word, keywordLower);
          if (similarity > 0.8) { // Tăng threshold từ 0.7 lên 0.8
            const contextValidation = this.validateKeywordContext(input, word);
            if (contextValidation.isValid) {
              confidence = Math.max(confidence, similarity * 0.7); // Giảm confidence cho fuzzy match
              matchedKeywords.push(keyword);
              break;
            }
          }
        }
      }
      
      maxConfidence = Math.max(maxConfidence, confidence);
    }
    
    // Validation cuối cùng - từ chối nếu chỉ có generic keywords
    if (maxConfidence > 0) {
      const hasGenericKeywords = this.hasGenericKeywords(matchedKeywords);
      if (hasGenericKeywords && matchedKeywords.length === 1) {
        maxConfidence *= 0.5; // Giảm confidence cho generic keywords đơn lẻ
      }
    }
    
    return {
      matched: maxConfidence > 0,
      confidence: maxConfidence,
      matchedKeywords: matchedKeywords.length > 0 ? matchedKeywords : undefined
    };
  }

  /**
   * Validate keyword context để tránh false positive
   */
  private validateKeywordContext(input: string, keyword: string): { isValid: boolean } {
    // Kiểm tra xem keyword có quá chung chung không
    const genericKeywords = ['đến', 'tới', 'vào', 'tìm', 'kiểm tra', 'nói chuyện', 'gặp', 'hoàn thành', 'xong'];
    
    if (genericKeywords.includes(keyword)) {
      // Cần có context cụ thể hơn
      const inputWords = input.split(/\s+/).filter(word => word.length > 3);
      const hasSpecificWords = inputWords.some(word => 
        !genericKeywords.includes(word) && 
        !['của', 'với', 'trong', 'từ', 'và', 'hoặc', 'đã', 'được', 'là', 'có'].includes(word)
      );
      
      if (!hasSpecificWords) {
        return { isValid: false };
      }
    }
    
    // Kiểm tra xem input có quá ngắn không
    if (input.length < 15 && genericKeywords.includes(keyword)) {
      return { isValid: false };
    }
    
    return { isValid: true };
  }

  /**
   * Kiểm tra xem có generic keywords không
   */
  private hasGenericKeywords(keywords: string[]): boolean {
    const genericKeywords = ['đến', 'tới', 'vào', 'tìm', 'kiểm tra', 'nói chuyện', 'gặp', 'hoàn thành', 'xong'];
    return keywords.some(keyword => genericKeywords.includes(keyword.toLowerCase()));
  }

  /**
   * Enhanced pattern matching với context awareness và validation chặt chẽ hơn
   */
  private enhancedPatternMatching(chatInput: string, patterns: string[], objectiveDescription: string): { matched: boolean; confidence: number; matchedPatterns?: string[] } {
    const input = chatInput.toLowerCase();
    const objective = objectiveDescription.toLowerCase();
    const matchedPatterns: string[] = [];
    let maxConfidence = 0;
    
    // Kiểm tra xem có cần validation chặt chẽ hơn không
    const needsStrictValidation = this.needsStrictValidation(objective);
    
    for (const pattern of patterns) {
      const patternLower = pattern.toLowerCase();
      let confidence = 0;
      
      // Exact match với validation chặt chẽ hơn
      if (input.includes(patternLower)) {
        // Kiểm tra context trước khi gán confidence
        const contextValidation = this.validatePatternContext(input, patternLower, objective);
        if (contextValidation.isValid) {
          confidence = contextValidation.confidence;
          matchedPatterns.push(pattern);
        } else {
          // Nếu context không hợp lệ, giảm confidence đáng kể
          confidence = 0.3;
          matchedPatterns.push(pattern);
        }
      } else {
        // Context-aware matching với validation chặt chẽ hơn
        const contextWords = this.extractContextWords(input);
        for (const word of contextWords) {
          const similarity = this.calculateSimilarity(word, patternLower);
          if (similarity > 0.7) { // Tăng threshold từ 0.6 lên 0.7
            const contextValidation = this.validatePatternContext(input, word, objective);
            if (contextValidation.isValid) {
              confidence = Math.max(confidence, similarity * contextValidation.confidence);
              matchedPatterns.push(pattern);
              break;
            }
          }
        }
      }
      
      // Nếu cần validation chặt chẽ, kiểm tra thêm context
      if (needsStrictValidation && confidence > 0) {
        const contextMatch = this.validateContextMatch(input, patternLower, objective);
        if (!contextMatch) {
          confidence *= 0.3; // Giảm confidence mạnh hơn nếu không match context
        }
      }
      
      maxConfidence = Math.max(maxConfidence, confidence);
    }
    
    // Validation cuối cùng - từ chối nếu chỉ có generic patterns
    if (maxConfidence > 0) {
      const hasGenericOnly = this.hasOnlyGenericPatterns(matchedPatterns, objective);
      if (hasGenericOnly) {
        maxConfidence *= 0.4; // Giảm confidence mạnh cho generic patterns
      }
    }
    
    return {
      matched: maxConfidence > 0,
      confidence: maxConfidence,
      matchedPatterns: matchedPatterns.length > 0 ? matchedPatterns : undefined
    };
  }

  /**
   * Validate pattern context để tránh false positive
   */
  private validatePatternContext(input: string, pattern: string, objective: string): { isValid: boolean; confidence: number } {
    // Kiểm tra xem pattern có phù hợp với objective không
    const objectiveWords = objective.split(/\s+/).filter(word => word.length > 3);
    const hasObjectiveContext = objectiveWords.some(word => 
      input.includes(word) || this.calculateSimilarity(input, word) > 0.6
    );
    
    if (!hasObjectiveContext) {
      return {
        isValid: false,
        confidence: 0.2
      };
    }
    
    // Kiểm tra xem pattern có quá chung chung không
    const genericPatterns = ['đến', 'tới', 'vào', 'tìm', 'kiểm tra', 'nói chuyện', 'gặp'];
    if (genericPatterns.includes(pattern)) {
      // Cần có context cụ thể hơn
      const specificContext = this.hasSpecificContext(input, objective, { title: '' } as QuestProgress);
      if (!specificContext) {
        return {
          isValid: false,
          confidence: 0.3
        };
      }
    }
    
    return {
      isValid: true,
      confidence: 0.8
    };
  }

  /**
   * Kiểm tra xem chỉ có generic patterns không
   */
  private hasOnlyGenericPatterns(matchedPatterns: string[], objective: string): boolean {
    const genericPatterns = ['đến', 'tới', 'vào', 'tìm', 'kiểm tra', 'nói chuyện', 'gặp', 'hoàn thành', 'xong'];
    const objectiveWords = objective.split(/\s+/).filter(word => word.length > 3);
    
    // Nếu tất cả patterns đều là generic và không có context cụ thể
    const allGeneric = matchedPatterns.every(pattern => genericPatterns.includes(pattern.toLowerCase()));
    const hasSpecificContext = objectiveWords.some(word => 
      matchedPatterns.some(pattern => pattern.toLowerCase().includes(word))
    );
    
    return allGeneric && !hasSpecificContext;
  }

  /**
   * Kiểm tra xem objective có cần validation chặt chẽ không
   */
  private needsStrictValidation(objective: string): boolean {
    const strictKeywords = [
      'đến', 'tới', 'đi đến', 'vào', 'bước vào',
      'tìm', 'kiểm tra', 'thu thập', 'lấy',
      'nói chuyện', 'gặp', 'gặp gỡ',
      'báo cáo', 'thông báo', 'báo tin'
    ];
    
    return strictKeywords.some(keyword => objective.includes(keyword));
  }

  /**
   * Validate context match - kiểm tra xem pattern có thực sự liên quan đến objective không
   */
  private validateContextMatch(input: string, pattern: string, objective: string): boolean {
    // Nếu pattern là từ chung chung như "đến", "tìm", cần kiểm tra context cụ thể
    const genericPatterns = ['đến', 'tới', 'vào', 'tìm', 'kiểm tra', 'nói chuyện', 'gặp'];
    
    if (genericPatterns.includes(pattern)) {
      // Trích xuất đối tượng cụ thể từ objective
      const objectiveTargets = this.extractTargetsFromObjective(objective);
      if (objectiveTargets.length > 0) {
        // Kiểm tra xem input có chứa đối tượng cụ thể không
        return objectiveTargets.some(target => 
          input.includes(target.toLowerCase()) || 
          this.calculateSimilarity(input, target.toLowerCase()) > 0.6
        );
      }
    }
    
    return true; // Nếu không phải pattern chung chung, chấp nhận
  }

  /**
   * Trích xuất đối tượng cụ thể từ objective description
   */
  private extractTargetsFromObjective(objective: string): string[] {
    const targets: string[] = [];
    
    // Trích xuất location
    const locationMatch = objective.match(/(?:đến|tới|vào)\s+([^,.\s]+)/i);
    if (locationMatch) targets.push(locationMatch[1]);
    
    // Trích xuất NPC
    const npcMatch = objective.match(/(?:nói chuyện|gặp|gặp gỡ)\s+với\s+([^,.\s]+)/i);
    if (npcMatch) targets.push(npcMatch[1]);
    
    // Trích xuất item
    const itemMatch = objective.match(/(?:tìm|kiểm tra|thu thập)\s+([^,.\s]+)/i);
    if (itemMatch) targets.push(itemMatch[1]);
    
    return targets;
  }

  /**
   * Phân tích SceneState để detect quest completion (NHANH!)
   */
  private analyzeSceneStateForQuestCompletion(chatInput: string, objectiveDescription: string, sceneState: any): { matched: boolean; confidence: number; details?: string } {
    const input = chatInput.toLowerCase();
    const objective = objectiveDescription.toLowerCase();
    let maxConfidence = 0;
    let bestMatch = '';

    // Kiểm tra location-based quest completion
    if (objective.includes('đến') || objective.includes('đi đến') || objective.includes('tới')) {
      const targetLocation = this.extractLocationFromObjective(objective);
      if (targetLocation && sceneState.location) {
        const currentLocation = sceneState.location.toLowerCase();
        if (this.isLocationMatch(currentLocation, targetLocation)) {
          const confidence = 0.9;
          if (confidence > maxConfidence) {
            maxConfidence = confidence;
            bestMatch = `Location match: ${targetLocation} -> ${currentLocation}`;
          }
        }
      }
    }

    // Kiểm tra NPC-based quest completion
    if (objective.includes('nói chuyện') || objective.includes('gặp') || objective.includes('gặp gỡ')) {
      const targetNPC = this.extractNPCFromObjective(objective);
      if (targetNPC && sceneState.npcs) {
        const mentionedNPCs = sceneState.npcs.map((npc: any) => npc.name?.toLowerCase()).filter(Boolean);
        if (mentionedNPCs.some((npc: string) => this.isNPCMatch(npc, targetNPC))) {
          const confidence = 0.9;
          if (confidence > maxConfidence) {
            maxConfidence = confidence;
            bestMatch = `NPC match: ${targetNPC} found in scene`;
          }
        }
      }
    }

    // Kiểm tra item-based quest completion
    if (objective.includes('tìm') || objective.includes('kiểm tra') || objective.includes('thu thập')) {
      const targetItem = this.extractItemFromObjective(objective);
      if (targetItem && sceneState.items) {
        const availableItems = sceneState.items.map((item: any) => item.name?.toLowerCase()).filter(Boolean);
        if (availableItems.some((item: string) => this.isItemMatch(item, targetItem))) {
          const confidence = 0.9;
          if (confidence > maxConfidence) {
            maxConfidence = confidence;
            bestMatch = `Item match: ${targetItem} found in scene`;
          }
        }
      }
    }

    // Kiểm tra action-based quest completion
    if (objective.includes('hoàn thành') || objective.includes('xong') || objective.includes('kết thúc')) {
      const actionKeywords = this.extractActionKeywords(objective);
      if (actionKeywords.some(keyword => input.includes(keyword))) {
        const confidence = 0.8;
        if (confidence > maxConfidence) {
          maxConfidence = confidence;
          bestMatch = `Action match: ${actionKeywords.join(', ')}`;
        }
      }
    }

    // Kiểm tra environment-based quest completion
    if (sceneState.environment) {
      const environmentKeywords = this.extractEnvironmentKeywords(objective);
      const environmentMatch = environmentKeywords.some(keyword => 
        sceneState.environment.toLowerCase().includes(keyword) || input.includes(keyword)
      );
      if (environmentMatch) {
        const confidence = 0.7;
        if (confidence > maxConfidence) {
          maxConfidence = confidence;
          bestMatch = `Environment match: ${sceneState.environment}`;
        }
      }
    }

    // Kiểm tra weather-based quest completion
    if (sceneState.weather) {
      const weatherKeywords = this.extractWeatherKeywords(objective);
      const weatherMatch = weatherKeywords.some(keyword => 
        sceneState.weather.toLowerCase().includes(keyword) || input.includes(keyword)
      );
      if (weatherMatch) {
        const confidence = 0.7;
        if (confidence > maxConfidence) {
          maxConfidence = confidence;
          bestMatch = `Weather match: ${sceneState.weather}`;
        }
      }
    }

    // Kiểm tra time-based quest completion trong scene
    if (sceneState.timeOfDay) {
      const timeKeywords = this.extractTimeKeywords(objective);
      const timeMatch = timeKeywords.some(keyword => 
        sceneState.timeOfDay.toLowerCase().includes(keyword) || input.includes(keyword)
      );
      if (timeMatch) {
        const confidence = 0.7;
        if (confidence > maxConfidence) {
          maxConfidence = confidence;
          bestMatch = `Time match: ${sceneState.timeOfDay}`;
        }
      }
    }

    // Kiểm tra mood/atmosphere-based quest completion
    if (sceneState.mood || sceneState.atmosphere) {
      const moodKeywords = this.extractMoodKeywords(objective);
      const moodMatch = moodKeywords.some(keyword => 
        (sceneState.mood?.toLowerCase().includes(keyword) || sceneState.atmosphere?.toLowerCase().includes(keyword)) ||
        input.includes(keyword)
      );
      if (moodMatch) {
        const confidence = 0.6;
        if (confidence > maxConfidence) {
          maxConfidence = confidence;
          bestMatch = `Mood match: ${sceneState.mood || sceneState.atmosphere}`;
        }
      }
    }

    return {
      matched: maxConfidence > 0,
      confidence: maxConfidence,
      details: bestMatch || undefined
    };
  }

  /**
   * Validation chặt chẽ cho quest completion để giảm false positive (MỚI!)
   */
  private validateQuestCompletion(
    chatInput: string,
    objectiveDescription: string,
    quest: QuestProgress,
    matchResults: { method: string; confidence: number; details: string }[],
    additionalContext?: any
  ): { isValid: boolean; reason: string } {
    const input = chatInput.toLowerCase();
    const objective = objectiveDescription.toLowerCase();
    
    // 1. Kiểm tra generic patterns - từ chối nếu quá chung chung
    const genericPatterns = ['đến', 'tới', 'vào', 'tìm', 'kiểm tra', 'nói chuyện', 'gặp', 'hoàn thành', 'xong'];
    const hasGenericPattern = genericPatterns.some(pattern => input.includes(pattern));
    
    if (hasGenericPattern) {
      // Kiểm tra xem có context cụ thể không
      const hasSpecificContext = this.hasSpecificContext(input, objective, quest);
      if (!hasSpecificContext) {
        return {
          isValid: false,
          reason: 'Generic pattern without specific context'
        };
      }
    }
    
    // 2. Kiểm tra confidence distribution - từ chối nếu chỉ có 1 match yếu
    if (matchResults.length === 1 && matchResults[0].confidence < 0.8) {
      return {
        isValid: false,
        reason: 'Single weak match'
      };
    }
    
    // 3. Kiểm tra context consistency
    const contextConsistency = this.checkContextConsistency(input, objective, quest, additionalContext);
    if (!contextConsistency.isValid) {
      return {
        isValid: false,
        reason: contextConsistency.reason
      };
    }
    
    // 4. Kiểm tra quest-specific validation
    if (quest.type === 'side') {
      const sideQuestValidation = this.validateSideQuestSpecific(input, objective, quest, matchResults);
      if (!sideQuestValidation.isValid) {
        return {
          isValid: false,
          reason: sideQuestValidation.reason
        };
      }
    }
    
    // 5. Kiểm tra false positive patterns
    const falsePositivePatterns = this.checkFalsePositivePatterns(input, objective);
    if (falsePositivePatterns.isFalsePositive) {
      return {
        isValid: false,
        reason: falsePositivePatterns.reason
      };
    }
    
    return {
      isValid: true,
      reason: 'All validations passed'
    };
  }

  /**
   * Kiểm tra có context cụ thể không
   */
  private hasSpecificContext(input: string, objective: string, quest: QuestProgress): boolean {
    // Trích xuất keywords cụ thể từ objective
    const objectiveKeywords = this.extractSpecificKeywords(objective);
    const questKeywords = this.extractSpecificKeywords(quest.title);
    
    // Kiểm tra xem input có chứa keywords cụ thể không
    const hasObjectiveKeywords = objectiveKeywords.some(keyword => 
      input.includes(keyword.toLowerCase()) || 
      this.calculateSimilarity(input, keyword.toLowerCase()) > 0.7
    );
    
    const hasQuestKeywords = questKeywords.some(keyword => 
      input.includes(keyword.toLowerCase()) || 
      this.calculateSimilarity(input, keyword.toLowerCase()) > 0.7
    );
    
    return hasObjectiveKeywords || hasQuestKeywords;
  }

  /**
   * Trích xuất keywords cụ thể (loại bỏ generic words)
   */
  private extractSpecificKeywords(text: string): string[] {
    const genericWords = ['đến', 'tới', 'vào', 'tìm', 'kiểm tra', 'nói chuyện', 'gặp', 'hoàn thành', 'xong', 'làm', 'thực hiện'];
    
    return text.toLowerCase()
      .split(/\s+/)
      .filter(word => 
        word.length > 3 && 
        !genericWords.includes(word) &&
        !['của', 'với', 'trong', 'từ', 'và', 'hoặc', 'đã', 'được', 'là', 'có'].includes(word)
      );
  }

  /**
   * Kiểm tra context consistency
   */
  private checkContextConsistency(
    input: string, 
    objective: string, 
    quest: QuestProgress, 
    additionalContext?: any
  ): { isValid: boolean; reason: string } {
    // Kiểm tra xem input có phù hợp với quest context không
    if (quest.title.toLowerCase().includes('giao hàng') && !input.includes('giao') && !input.includes('chuyển')) {
      return {
        isValid: false,
        reason: 'Delivery quest context mismatch'
      };
    }
    
    if (quest.title.toLowerCase().includes('tìm kiếm') && !input.includes('tìm') && !input.includes('phát hiện')) {
      return {
        isValid: false,
        reason: 'Search quest context mismatch'
      };
    }
    
    // Kiểm tra scene state consistency
    if (additionalContext?.sceneState) {
      const sceneConsistency = this.checkSceneConsistency(input, objective, additionalContext.sceneState);
      if (!sceneConsistency.isValid) {
        return {
          isValid: false,
          reason: sceneConsistency.reason
        };
      }
    }
    
    return {
      isValid: true,
      reason: 'Context consistent'
    };
  }

  /**
   * Kiểm tra scene consistency
   */
  private checkSceneConsistency(_input: string, objective: string, sceneState: any): { isValid: boolean; reason: string } {
    // Nếu objective yêu cầu đến location cụ thể
    if (objective.includes('đến') || objective.includes('tới')) {
      const targetLocation = this.extractLocationFromObjective(objective);
      if (targetLocation && sceneState.location) {
        const currentLocation = sceneState.location.toLowerCase();
        if (!this.isLocationMatch(currentLocation, targetLocation)) {
          return {
            isValid: false,
            reason: `Location mismatch: expected ${targetLocation}, current ${currentLocation}`
          };
        }
      }
    }
    
    // Nếu objective yêu cầu gặp NPC cụ thể
    if (objective.includes('nói chuyện') || objective.includes('gặp')) {
      const targetNPC = this.extractNPCFromObjective(objective);
      if (targetNPC && sceneState.npcs) {
        const mentionedNPCs = sceneState.npcs.map((npc: any) => npc.name?.toLowerCase()).filter(Boolean);
        if (!mentionedNPCs.some((npc: string) => this.isNPCMatch(npc, targetNPC))) {
          return {
            isValid: false,
            reason: `NPC not in scene: expected ${targetNPC}`
          };
        }
      }
    }
    
    return {
      isValid: true,
      reason: 'Scene consistent'
    };
  }

  /**
   * Validation đặc biệt cho side quest
   */
  private validateSideQuestSpecific(
    _input: string,
    _objective: string,
    quest: QuestProgress,
    matchResults: { method: string; confidence: number; details: string }[]
  ): { isValid: boolean; reason: string } {
    // Side quest cần có ít nhất 2 matches hoặc 1 match rất mạnh
    const strongMatches = matchResults.filter(m => m.confidence > 0.8);
    const mediumMatches = matchResults.filter(m => m.confidence > 0.6);
    
    if (strongMatches.length === 0 && mediumMatches.length < 2) {
      return {
        isValid: false,
        reason: 'Side quest needs stronger evidence'
      };
    }
    
    // Kiểm tra quest-specific patterns
    const questTypePatterns = this.getQuestTypePatterns(quest.title);
    const hasQuestTypePattern = questTypePatterns.some(pattern => _input.includes(pattern));
    
    if (!hasQuestTypePattern && matchResults.length === 1) {
      return {
        isValid: false,
        reason: 'Side quest type pattern missing'
      };
    }
    
    return {
      isValid: true,
      reason: 'Side quest validation passed'
    };
  }

  /**
   * Lấy patterns theo quest type
   */
  private getQuestTypePatterns(questTitle: string): string[] {
    const title = questTitle.toLowerCase();
    const patterns: string[] = [];
    
    if (title.includes('giao hàng') || title.includes('delivery')) {
      patterns.push('giao', 'chuyển', 'đưa', 'mang', 'trao', 'nhận');
    }
    
    if (title.includes('tìm kiếm') || title.includes('search')) {
      patterns.push('tìm', 'tìm thấy', 'phát hiện', 'khám phá', 'tìm được');
    }
    
    if (title.includes('bảo vệ') || title.includes('protect')) {
      patterns.push('bảo vệ', 'che chở', 'giữ an toàn', 'phòng thủ');
    }
    
    if (title.includes('thu thập') || title.includes('collect')) {
      patterns.push('thu thập', 'gom', 'sưu tầm', 'có đủ');
    }
    
    return patterns;
  }

  /**
   * Kiểm tra false positive patterns
   */
  private checkFalsePositivePatterns(input: string, objective: string): { isFalsePositive: boolean; reason: string } {
    // Từ chối nếu input quá ngắn và chung chung
    if (input.length < 10 && ['đến', 'tới', 'vào', 'tìm', 'xong'].some(word => input.includes(word))) {
      return {
        isFalsePositive: true,
        reason: 'Too generic and short input'
      };
    }
    
    // Từ chối nếu input chỉ là câu hỏi
    if (input.includes('?') && !objective.includes('hỏi') && !objective.includes('thông tin')) {
      return {
        isFalsePositive: true,
        reason: 'Question input without quest context'
      };
    }
    
    // Từ chối nếu input chỉ là mô tả trạng thái
    const stateWords = ['đang', 'sẽ', 'có thể', 'có lẽ', 'có vẻ'];
    if (stateWords.some(word => input.includes(word)) && !input.includes('hoàn thành') && !input.includes('xong')) {
      return {
        isFalsePositive: true,
        reason: 'State description without completion'
      };
    }
    
    return {
      isFalsePositive: false,
      reason: 'No false positive detected'
    };
  }

  /**
   * Phân tích Side Quest completion với logic đặc biệt (MỚI!)
   */
  private analyzeSideQuestCompletion(
    chatInput: string, 
    objectiveDescription: string, 
    quest: QuestProgress, 
    additionalContext?: any
  ): { matched: boolean; confidence: number; details?: string } {
    const input = chatInput.toLowerCase();
    const objective = objectiveDescription.toLowerCase();
    let maxConfidence = 0;
    let bestMatch = '';

    // 1. Side quest specific keywords với confidence cao hơn
    const sideQuestKeywords = [
      'nhiệm vụ', 'quest', 'yêu cầu', 'giúp đỡ', 'hỗ trợ', 'thuê', 'mướn',
      'tìm kiếm', 'điều tra', 'khám phá', 'thu thập', 'bảo vệ', 'giải cứu',
      'giao hàng', 'chuyển phát', 'thông báo', 'báo cáo', 'kiểm tra'
    ];
    
    const matchedKeywords = sideQuestKeywords.filter(keyword => input.includes(keyword));
    if (matchedKeywords.length > 0) {
      const confidence = Math.min(0.8, 0.6 + (matchedKeywords.length * 0.1)); // 0.6-0.8
      if (confidence > maxConfidence) {
        maxConfidence = confidence;
        bestMatch = `Side quest keywords: ${matchedKeywords.join(', ')}`;
      }
    }

    // 2. Side quest completion patterns
    const sideQuestCompletionPatterns = [
      'hoàn thành nhiệm vụ', 'làm xong', 'thực hiện xong', 'kết thúc',
      'đã xong', 'hoàn tất', 'thành công', 'xong việc', 'hoàn thành quest',
      'quest xong', 'nhiệm vụ xong', 'yêu cầu xong'
    ];
    
    const matchedPatterns = sideQuestCompletionPatterns.filter(pattern => input.includes(pattern));
    if (matchedPatterns.length > 0) {
      const confidence = 0.9; // Confidence cao cho completion patterns
      if (confidence > maxConfidence) {
        maxConfidence = confidence;
        bestMatch = `Side quest completion: ${matchedPatterns[0]}`;
      }
    }

    // 3. Side quest specific context analysis
    if (quest.title) {
      const questTitle = quest.title.toLowerCase();
      
      // Kiểm tra xem input có đề cập đến quest title không
      if (this.calculateSimilarity(input, questTitle) > 0.6) {
        const confidence = 0.85;
        if (confidence > maxConfidence) {
          maxConfidence = confidence;
          bestMatch = `Side quest title match: ${quest.title}`;
        }
      }

      // Kiểm tra quest type specific patterns
      if (questTitle.includes('giao hàng') || questTitle.includes('delivery')) {
        const deliveryKeywords = ['giao', 'chuyển', 'đưa', 'mang', 'trao', 'nhận'];
        if (deliveryKeywords.some(keyword => input.includes(keyword))) {
          const confidence = 0.8;
          if (confidence > maxConfidence) {
            maxConfidence = confidence;
            bestMatch = 'Delivery quest pattern match';
          }
        }
      }

      if (questTitle.includes('tìm kiếm') || questTitle.includes('search')) {
        const searchKeywords = ['tìm thấy', 'phát hiện', 'khám phá', 'tìm được', 'tìm ra'];
        if (searchKeywords.some(keyword => input.includes(keyword))) {
          const confidence = 0.8;
          if (confidence > maxConfidence) {
            maxConfidence = confidence;
            bestMatch = 'Search quest pattern match';
          }
        }
      }

      if (questTitle.includes('bảo vệ') || questTitle.includes('protect')) {
        const protectKeywords = ['bảo vệ', 'che chở', 'giữ an toàn', 'phòng thủ', 'chống lại'];
        if (protectKeywords.some(keyword => input.includes(keyword))) {
          const confidence = 0.8;
          if (confidence > maxConfidence) {
            maxConfidence = confidence;
            bestMatch = 'Protection quest pattern match';
          }
        }
      }
    }

    // 4. Side quest objective specific analysis
    const objectiveWords = objective.split(/\s+/).filter(word => word.length > 3);
    const inputWords = input.split(/\s+/).filter(word => word.length > 3);
    
    // Kiểm tra overlap giữa objective và input
    const commonWords = objectiveWords.filter(word => 
      inputWords.some(inputWord => this.calculateSimilarity(word, inputWord) > 0.7)
    );
    
    if (commonWords.length > 0) {
      const confidence = Math.min(0.85, 0.5 + (commonWords.length * 0.1));
      if (confidence > maxConfidence) {
        maxConfidence = confidence;
        bestMatch = `Side quest objective words match: ${commonWords.join(', ')}`;
      }
    }

    // 5. Side quest reward context (nếu có)
    if (quest.rewards && quest.rewards.length > 0) {
      const rewardKeywords = quest.rewards.map(reward => 
        reward.description.toLowerCase().split(/\s+/)
      ).flat();
      
      const matchedRewardWords = rewardKeywords.filter(keyword => 
        keyword.length > 3 && input.includes(keyword)
      );
      
      if (matchedRewardWords.length > 0) {
        const confidence = 0.7;
        if (confidence > maxConfidence) {
          maxConfidence = confidence;
          bestMatch = `Side quest reward context: ${matchedRewardWords.join(', ')}`;
        }
      }
    }

    // 6. Side quest time sensitivity (nếu có)
    if (quest.unlockConditions?.timeBased) {
      const timeKeywords = ['nhanh', 'gấp', 'khẩn cấp', 'urgent', 'cấp bách'];
      if (timeKeywords.some(keyword => input.includes(keyword))) {
        const confidence = 0.75;
        if (confidence > maxConfidence) {
          maxConfidence = confidence;
          bestMatch = 'Time-sensitive side quest match';
        }
      }
    }

    // 7. Side quest NPC interaction context
    if (additionalContext?.npcRelationships) {
      const npcContext = this.analyzeSideQuestNPCContext(input, objective, additionalContext.npcRelationships);
      if (npcContext.matched && npcContext.confidence > maxConfidence) {
        maxConfidence = npcContext.confidence;
        bestMatch = npcContext.details || 'Side quest NPC context match';
      }
    }

    return {
      matched: maxConfidence > 0,
      confidence: maxConfidence,
      details: bestMatch || undefined
    };
  }

  /**
   * Phân tích NPC context cho side quest (MỚI!)
   */
  private analyzeSideQuestNPCContext(
    _input: string, 
    objective: string, 
    npcRelationships: any
  ): { matched: boolean; confidence: number; details?: string } {
    let maxConfidence = 0;
    let bestMatch = '';

    // Kiểm tra NPC interactions gần đây
    if (npcRelationships.encounters && Array.isArray(npcRelationships.encounters)) {
      const recentEncounters = npcRelationships.encounters.slice(-5);
      
      for (const encounter of recentEncounters) {
        if (encounter.npcName && encounter.interaction) {
          const npcName = encounter.npcName.toLowerCase();
          const interaction = encounter.interaction.toLowerCase();
          
          // Kiểm tra xem có NPC được đề cập trong objective không
          if (objective.includes(npcName) || this.calculateSimilarity(npcName, objective) > 0.6) {
            // Kiểm tra interaction có phù hợp với side quest không
            const sideQuestInteractionKeywords = [
              'nói chuyện', 'gặp', 'hỏi', 'thảo luận', 'tiếp xúc', 'giao tiếp',
              'nhận nhiệm vụ', 'báo cáo', 'thông báo', 'báo tin', 'kể lại'
            ];
            
            const hasInteractionKeyword = sideQuestInteractionKeywords.some(keyword => 
              interaction.includes(keyword)
            );

            if (hasInteractionKeyword) {
              const confidence = 0.85; // Confidence cao cho NPC interaction
              if (confidence > maxConfidence) {
                maxConfidence = confidence;
                bestMatch = `Side quest NPC interaction: ${encounter.npcName} - ${encounter.interaction}`;
              }
            }
          }
        }
      }
    }

    return {
      matched: maxConfidence > 0,
      confidence: maxConfidence,
      details: bestMatch || undefined
    };
  }

  /**
   * Phân tích Context để detect quest completion (NHANH!)
   */
  private analyzeContextForQuestCompletion(chatInput: string, _objectiveDescription: string, quest: QuestProgress): { matched: boolean; confidence: number; details?: string } {
    const input = chatInput.toLowerCase();
    let maxConfidence = 0;
    let bestMatch = '';

    // Kiểm tra quest-specific context
    if (quest.title.toLowerCase().includes('kiểm kê') || quest.title.toLowerCase().includes('inventory')) {
      // Quest kiểm kê - kiểm tra từ khóa liên quan
      const inventoryKeywords = ['kiểm tra', 'xem xét', 'quan sát', 'nhìn thấy', 'phát hiện', 'tìm thấy'];
      if (inventoryKeywords.some(keyword => input.includes(keyword))) {
        const confidence = 0.8;
        if (confidence > maxConfidence) {
          maxConfidence = confidence;
          bestMatch = 'Inventory quest context match';
        }
      }
    }

    if (quest.title.toLowerCase().includes('khẩn cấp') || quest.title.toLowerCase().includes('emergency')) {
      // Quest khẩn cấp - kiểm tra từ khóa urgency
      const urgencyKeywords = ['khẩn cấp', 'gấp', 'nhanh', 'vội', 'cấp bách', 'urgent'];
      if (urgencyKeywords.some(keyword => input.includes(keyword))) {
        const confidence = 0.8;
        if (confidence > maxConfidence) {
          maxConfidence = confidence;
          bestMatch = 'Emergency quest context match';
        }
      }
    }

    // Kiểm tra quest type context
    if (quest.type === 'side') {
      // Side quest thường có context đặc biệt
      const sideQuestKeywords = ['nhiệm vụ', 'quest', 'yêu cầu', 'giúp đỡ', 'hỗ trợ'];
      if (sideQuestKeywords.some(keyword => input.includes(keyword))) {
        const confidence = 0.6;
        if (confidence > maxConfidence) {
          maxConfidence = confidence;
          bestMatch = 'Side quest context match';
        }
      }
    }

    return {
      matched: maxConfidence > 0,
      confidence: maxConfidence,
      details: bestMatch || undefined
    };
  }

  /**
   * Trích xuất location từ objective description
   */
  private extractLocationFromObjective(objective: string): string | null {
    const locationPatterns = [
      /đến\s+([^,.\s]+)/i,
      /tới\s+([^,.\s]+)/i,
      /đi\s+đến\s+([^,.\s]+)/i,
      /kho\s+([^,.\s]+)/i,
      /phòng\s+([^,.\s]+)/i
    ];

    for (const pattern of locationPatterns) {
      const match = objective.match(pattern);
      if (match) {
        return match[1].toLowerCase();
      }
    }

    return null;
  }

  /**
   * Trích xuất NPC từ objective description
   */
  private extractNPCFromObjective(objective: string): string | null {
    const npcPatterns = [
      /gặp\s+([^,.\s]+)/i,
      /nói\s+chuyện\s+với\s+([^,.\s]+)/i,
      /hỏi\s+([^,.\s]+)/i,
      /trưởng\s+kho\s+([^,.\s]+)/i
    ];

    for (const pattern of npcPatterns) {
      const match = objective.match(pattern);
      if (match) {
        return match[1].toLowerCase();
      }
    }

    return null;
  }

  /**
   * Trích xuất item từ objective description
   */
  private extractItemFromObjective(objective: string): string | null {
    const itemPatterns = [
      /tìm\s+([^,.\s]+)/i,
      /kiểm tra\s+([^,.\s]+)/i,
      /thu thập\s+([^,.\s]+)/i,
      /"([^"]+)"/i  // Tìm trong dấu ngoặc kép
    ];

    for (const pattern of itemPatterns) {
      const match = objective.match(pattern);
      if (match) {
        return match[1].toLowerCase();
      }
    }

    return null;
  }

  /**
   * Trích xuất action keywords từ objective description
   */
  private extractActionKeywords(objective: string): string[] {
    const actionKeywords = [];
    
    if (objective.includes('hoàn thành')) actionKeywords.push('hoàn thành', 'xong', 'làm xong');
    if (objective.includes('báo cáo')) actionKeywords.push('báo cáo', 'thông báo', 'báo tin');
    if (objective.includes('kiểm tra')) actionKeywords.push('kiểm tra', 'xem xét', 'quan sát');
    if (objective.includes('tìm')) actionKeywords.push('tìm thấy', 'phát hiện', 'khám phá');
    
    return actionKeywords;
  }

  /**
   * Trích xuất environment keywords từ objective description (MỚI!)
   */
  private extractEnvironmentKeywords(objective: string): string[] {
    const environmentKeywords = [];
    
    if (objective.includes('rừng')) environmentKeywords.push('rừng', 'cây cối', 'thiên nhiên');
    if (objective.includes('núi')) environmentKeywords.push('núi', 'đồi', 'cao nguyên');
    if (objective.includes('biển')) environmentKeywords.push('biển', 'bờ biển', 'đại dương');
    if (objective.includes('sa mạc')) environmentKeywords.push('sa mạc', 'cát', 'khô cằn');
    if (objective.includes('thành phố')) environmentKeywords.push('thành phố', 'đô thị', 'phố xá');
    if (objective.includes('làng')) environmentKeywords.push('làng', 'nông thôn', 'quê hương');
    if (objective.includes('hang động')) environmentKeywords.push('hang động', 'hang', 'động');
    if (objective.includes('lâu đài')) environmentKeywords.push('lâu đài', 'cung điện', 'pháo đài');
    
    return environmentKeywords;
  }

  /**
   * Trích xuất weather keywords từ objective description (MỚI!)
   */
  private extractWeatherKeywords(objective: string): string[] {
    const weatherKeywords = [];
    
    if (objective.includes('mưa')) weatherKeywords.push('mưa', 'mưa rào', 'dông bão');
    if (objective.includes('nắng')) weatherKeywords.push('nắng', 'nắng gắt', 'trời nắng');
    if (objective.includes('tuyết')) weatherKeywords.push('tuyết', 'băng giá', 'lạnh');
    if (objective.includes('sương mù')) weatherKeywords.push('sương mù', 'mờ ảo', 'không rõ');
    if (objective.includes('gió')) weatherKeywords.push('gió', 'gió mạnh', 'bão');
    
    return weatherKeywords;
  }

  /**
   * Trích xuất time keywords từ objective description (MỚI!)
   */
  private extractTimeKeywords(objective: string): string[] {
    const timeKeywords = [];
    
    if (objective.includes('sáng')) timeKeywords.push('sáng', 'buổi sáng', 'bình minh');
    if (objective.includes('trưa')) timeKeywords.push('trưa', 'giữa trưa', 'buổi trưa');
    if (objective.includes('chiều')) timeKeywords.push('chiều', 'buổi chiều', 'hoàng hôn');
    if (objective.includes('tối')) timeKeywords.push('tối', 'buổi tối', 'chạng vạng');
    if (objective.includes('đêm')) timeKeywords.push('đêm', 'ban đêm', 'tối tăm');
    
    return timeKeywords;
  }

  /**
   * Trích xuất mood keywords từ objective description (MỚI!)
   */
  private extractMoodKeywords(objective: string): string[] {
    const moodKeywords = [];
    
    if (objective.includes('yên tĩnh')) moodKeywords.push('yên tĩnh', 'tĩnh lặng', 'bình yên');
    if (objective.includes('căng thẳng')) moodKeywords.push('căng thẳng', 'lo lắng', 'hồi hộp');
    if (objective.includes('vui vẻ')) moodKeywords.push('vui vẻ', 'hạnh phúc', 'tích cực');
    if (objective.includes('buồn')) moodKeywords.push('buồn', 'u sầu', 'tiêu cực');
    if (objective.includes('bí ẩn')) moodKeywords.push('bí ẩn', 'huyền bí', 'khó hiểu');
    if (objective.includes('nguy hiểm')) moodKeywords.push('nguy hiểm', 'rủi ro', 'đe dọa');
    
    return moodKeywords;
  }

  /**
   * Kiểm tra location match
   */
  private isLocationMatch(currentLocation: string, targetLocation: string): boolean {
    // Exact match
    if (currentLocation.includes(targetLocation) || targetLocation.includes(currentLocation)) {
      return true;
    }

    // Synonym matching
    const locationSynonyms: { [key: string]: string[] } = {
      'kho': ['kho chú cụ', 'phòng chú cụ', 'kho chú thuật', 'phòng chú thuật'],
      'phòng': ['room', 'chamber', 'hall'],
      'văn phòng': ['office', 'bureau']
    };

    for (const [key, synonyms] of Object.entries(locationSynonyms)) {
      if (targetLocation.includes(key)) {
        return synonyms.some(synonym => currentLocation.includes(synonym));
      }
    }

    return false;
  }

  /**
   * Kiểm tra NPC match
   */
  private isNPCMatch(currentNPC: string, targetNPC: string): boolean {
    // Exact match
    if (currentNPC.includes(targetNPC) || targetNPC.includes(currentNPC)) {
      return true;
    }

    // Title matching
    const npcTitles = ['trưởng', 'giám', 'hiệu', 'thầy', 'cô', 'chú', 'bác'];
    return npcTitles.some(title => 
      currentNPC.includes(title) && targetNPC.includes(title)
    );
  }

  /**
   * Kiểm tra item match
   */
  private isItemMatch(currentItem: string, targetItem: string): boolean {
    // Exact match
    if (currentItem.includes(targetItem) || targetItem.includes(currentItem)) {
      return true;
    }

    // Partial match for compound items
    const targetWords = targetItem.split(/\s+/);
    return targetWords.some(word => 
      word.length > 3 && currentItem.includes(word)
    );
  }

  /**
   * Lấy patterns cho quest objectives (enhanced version với validation chặt chẽ hơn)
   */
  private getEnhancedQuestPatterns(objectiveDescription: string): string[] {
    const patterns: string[] = [];
    const description = objectiveDescription.toLowerCase();

    // Patterns cho các loại quest phổ biến với validation chặt chẽ hơn
    if (description.includes('nói chuyện') || description.includes('gặp') || description.includes('gặp gỡ')) {
      // Chỉ thêm patterns cụ thể, không quá chung chung
      patterns.push('nói chuyện', 'gặp', 'gặp gỡ', 'thảo luận', 'hỏi', 'trò chuyện');
    }

    if (description.includes('tìm') || description.includes('tìm kiếm') || description.includes('kiểm tra')) {
      // Chỉ thêm patterns cụ thể cho việc tìm kiếm
      patterns.push('tìm thấy', 'tìm được', 'phát hiện', 'khám phá', 'kiểm tra', 'xem xét');
    }

    if (description.includes('đánh bại') || description.includes('chiến đấu') || description.includes('đối đầu')) {
      patterns.push('đánh bại', 'chiến thắng', 'thắng', 'giết', 'tiêu diệt', 'hạ gục', 'đối đầu', 'chiến đấu');
    }

    if (description.includes('thu thập') || description.includes('lấy') || description.includes('có được')) {
      patterns.push('thu thập', 'lấy được', 'có được', 'sở hữu', 'nhận được', 'tìm thấy', 'cầm', 'mang theo');
    }

    // GIẢM ĐỘ NHẠY cho location patterns - chỉ match khi có context cụ thể
    if (description.includes('đi đến') || description.includes('đến') || description.includes('tới')) {
      // Chỉ thêm patterns cơ bản, không quá chung chung
      patterns.push('đi đến', 'đến', 'tới', 'vào', 'bước vào');
    }

    if (description.includes('hoàn thành') || description.includes('xong') || description.includes('kết thúc')) {
      patterns.push('hoàn thành', 'xong', 'làm xong', 'kết thúc', 'hoàn tất', 'thực hiện xong', 'đã xong');
    }

    // Thêm patterns cho quest cụ thể từ hình ảnh
    if (description.includes('kho chú cụ') || description.includes('phòng chú cụ')) {
      patterns.push('kho chú cụ', 'phòng chú cụ', 'kho chú thuật', 'phòng chú thuật', 'kho đồ', 'phòng đồ');
    }

    if (description.includes('thiên khải thạch') || description.includes('chú cụ')) {
      patterns.push('thiên khải thạch', 'chú cụ', 'vật phẩm', 'hiện vật', 'bảo vật', 'thánh vật');
    }

    if (description.includes('báo cáo') || description.includes('thông báo')) {
      patterns.push('báo cáo', 'thông báo', 'báo tin', 'nói lại', 'kể lại', 'tường thuật');
    }

    // THÊM PATTERNS CHO SIDE QUEST (MỚI!)
    this.addSideQuestPatterns(patterns, description);

    return patterns;
  }

  /**
   * Thêm patterns đặc biệt cho side quest (MỚI!)
   */
  private addSideQuestPatterns(patterns: string[], description: string): void {
    // Delivery/Transport quests
    if (description.includes('giao') || description.includes('chuyển') || description.includes('đưa')) {
      patterns.push('giao hàng', 'chuyển phát', 'đưa đến', 'mang đến', 'trao tay', 'nhận hàng');
    }

    // Investigation quests
    if (description.includes('điều tra') || description.includes('khám phá') || description.includes('tìm hiểu')) {
      patterns.push('điều tra', 'khám phá', 'tìm hiểu', 'nghiên cứu', 'phân tích', 'kiểm tra kỹ');
    }

    // Collection quests
    if (description.includes('thu thập') || description.includes('gom') || description.includes('sưu tầm')) {
      patterns.push('thu thập', 'gom góp', 'sưu tầm', 'tích lũy', 'có đủ', 'đủ số lượng');
    }

    // Protection quests
    if (description.includes('bảo vệ') || description.includes('che chở') || description.includes('giữ an toàn')) {
      patterns.push('bảo vệ', 'che chở', 'giữ an toàn', 'phòng thủ', 'chống lại', 'ngăn chặn');
    }

    // Rescue quests
    if (description.includes('giải cứu') || description.includes('cứu') || description.includes('giúp đỡ')) {
      patterns.push('giải cứu', 'cứu', 'giúp đỡ', 'hỗ trợ', 'cứu thoát', 'giải phóng');
    }

    // Communication quests
    if (description.includes('thông báo') || description.includes('báo tin') || description.includes('truyền đạt')) {
      patterns.push('thông báo', 'báo tin', 'truyền đạt', 'thông tin', 'tin tức', 'cập nhật');
    }

    // Time-sensitive quests
    if (description.includes('nhanh') || description.includes('gấp') || description.includes('khẩn cấp')) {
      patterns.push('nhanh chóng', 'gấp rút', 'khẩn cấp', 'cấp bách', 'urgent', 'ngay lập tức');
    }

    // Reward-related patterns
    if (description.includes('phần thưởng') || description.includes('thưởng') || description.includes('tiền công')) {
      patterns.push('phần thưởng', 'thưởng', 'tiền công', 'lương', 'bồi thường', 'đền đáp');
    }

    // Quest completion patterns
    patterns.push(
      'hoàn thành nhiệm vụ', 'làm xong', 'thực hiện xong', 'kết thúc',
      'đã xong', 'hoàn tất', 'thành công', 'xong việc', 'hoàn thành quest',
      'quest xong', 'nhiệm vụ xong', 'yêu cầu xong', 'công việc xong'
    );
  }

  /**
   * Tính độ tương đồng giữa hai từ
   */
  private calculateSimilarity(word1: string, word2: string): number {
    if (word1 === word2) return 1.0;
    
    // Levenshtein distance
    const distance = this.levenshteinDistance(word1, word2);
    const maxLength = Math.max(word1.length, word2.length);
    
    return maxLength === 0 ? 1.0 : 1 - (distance / maxLength);
  }

  /**
   * Levenshtein distance algorithm
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,      // deletion
          matrix[j - 1][i] + 1,      // insertion
          matrix[j - 1][i - 1] + cost // substitution
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Trích xuất các từ có ngữ cảnh quan trọng
   */
  private extractContextWords(text: string): string[] {
    // Loại bỏ stop words và lấy các từ quan trọng
    const stopWords = ['và', 'của', 'trong', 'với', 'từ', 'đến', 'đã', 'được', 'là', 'có', 'một', 'các', 'này', 'đó'];
    
    return text
      .split(/\s+/)
      .map(word => word.toLowerCase().replace(/[^\w]/g, ''))
      .filter(word => word.length > 2 && !stopWords.includes(word));
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

  /**
   * Phân tích SCC Context để detect quest completion (MỚI!)
   */
  private analyzeSCCContextForQuestCompletion(_chatInput: string, objectiveDescription: string, sccContext: any): { matched: boolean; confidence: number; details?: string } {
    const objective = objectiveDescription.toLowerCase();
    let maxConfidence = 0;
    let bestMatch = '';

    // Kiểm tra clues trong SCC
    if (sccContext.clues && Array.isArray(sccContext.clues)) {
      const relevantClues = sccContext.clues.filter((clue: string) => 
        this.calculateSimilarity(clue.toLowerCase(), objective) > 0.6
      );
      if (relevantClues.length > 0) {
        const confidence = 0.8;
        if (confidence > maxConfidence) {
          maxConfidence = confidence;
          bestMatch = `SCC Clue match: ${relevantClues[0]}`;
        }
      }
    }

    // Kiểm tra openThreads trong SCC
    if (sccContext.openThreads && Array.isArray(sccContext.openThreads)) {
      const relevantThreads = sccContext.openThreads.filter((thread: string) => 
        this.calculateSimilarity(thread.toLowerCase(), objective) > 0.6
      );
      if (relevantThreads.length > 0) {
        const confidence = 0.8;
        if (confidence > maxConfidence) {
          maxConfidence = confidence;
          bestMatch = `SCC Thread match: ${relevantThreads[0]}`;
        }
      }
    }

    // Kiểm tra goals trong SCC
    if (sccContext.goals && Array.isArray(sccContext.goals)) {
      const relevantGoals = sccContext.goals.filter((goal: any) => 
        this.calculateSimilarity(goal.pcGoal?.toLowerCase() || '', objective) > 0.6 ||
        this.calculateSimilarity(goal.actGoal?.toLowerCase() || '', objective) > 0.6
      );
      if (relevantGoals.length > 0) {
        const confidence = 0.8;
        if (confidence > maxConfidence) {
          maxConfidence = confidence;
          bestMatch = `SCC Goal match: ${relevantGoals[0].pcGoal || relevantGoals[0].actGoal}`;
        }
      }
    }

    // Kiểm tra relationships trong SCC
    if (sccContext.relationships && Array.isArray(sccContext.relationships)) {
      const relevantRelationships = sccContext.relationships.filter((rel: any) => 
        this.calculateSimilarity(rel.npc?.toLowerCase() || '', objective) > 0.6 ||
        this.calculateSimilarity(rel.status?.toLowerCase() || '', objective) > 0.6
      );
      if (relevantRelationships.length > 0) {
        const confidence = 0.7;
        if (confidence > maxConfidence) {
          maxConfidence = confidence;
          bestMatch = `SCC Relationship match: ${relevantRelationships[0].npc} - ${relevantRelationships[0].status}`;
        }
      }
    }

    return {
      matched: maxConfidence > 0,
      confidence: maxConfidence,
      details: bestMatch || undefined
    };
  }

  /**
   * Phân tích Chat History để detect quest completion (MỚI!)
   */
  private analyzeChatHistoryForQuestCompletion(chatInput: string, objectiveDescription: string, chatHistory: Array<{ role: string; content: string; turn?: number }>): { matched: boolean; confidence: number; details?: string } {
    const input = chatInput.toLowerCase();
    const objective = objectiveDescription.toLowerCase();
    let maxConfidence = 0;
    let bestMatch = '';

    // Lấy 5 tin nhắn gần nhất để phân tích context
    const recentMessages = chatHistory.slice(-5);
    const recentContent = recentMessages.map(msg => msg.content).join(' ').toLowerCase();

    // Kiểm tra xem có từ khóa quest completion trong chat history không
    const completionKeywords = ['hoàn thành', 'xong', 'làm xong', 'kết thúc', 'thành công', 'đã xong', 'hoàn tất'];
    const hasCompletionKeyword = completionKeywords.some(keyword => 
      recentContent.includes(keyword) || input.includes(keyword)
    );

    if (hasCompletionKeyword) {
      // Kiểm tra xem có liên quan đến objective không
      const objectiveWords = objective.split(/\s+/).filter(word => word.length > 3);
      const hasObjectiveWords = objectiveWords.some(word => 
        recentContent.includes(word) || input.includes(word)
      );

      if (hasObjectiveWords) {
        const confidence = 0.7;
        if (confidence > maxConfidence) {
          maxConfidence = confidence;
          bestMatch = 'Chat History completion keyword match';
        }
      }
    }

    // Kiểm tra pattern trong chat history
    const historyPatterns = this.getEnhancedQuestPatterns(objective);
    const hasHistoryPattern = historyPatterns.some(pattern => 
      recentContent.includes(pattern.toLowerCase()) || input.includes(pattern.toLowerCase())
    );

    if (hasHistoryPattern) {
      const confidence = 0.6;
      if (confidence > maxConfidence) {
        maxConfidence = confidence;
        bestMatch = 'Chat History pattern match';
      }
    }

    return {
      matched: maxConfidence > 0,
      confidence: maxConfidence,
      details: bestMatch || undefined
    };
  }

  /**
   * Phân tích NPC Relationships để detect quest completion (MỚI!)
   */
  private analyzeNPCRelationshipsForQuestCompletion(_chatInput: string, objectiveDescription: string, npcRelationships: any): { matched: boolean; confidence: number; details?: string } {
    const objective = objectiveDescription.toLowerCase();
    let maxConfidence = 0;
    let bestMatch = '';

    // Kiểm tra NPC interactions
    if (npcRelationships.encounters && Array.isArray(npcRelationships.encounters)) {
      const recentEncounters = npcRelationships.encounters.slice(-3); // 3 encounters gần nhất
      
      for (const encounter of recentEncounters) {
        if (encounter.npcName && encounter.interaction) {
          const npcName = encounter.npcName.toLowerCase();
          const interaction = encounter.interaction.toLowerCase();
          
          // Kiểm tra xem có NPC được đề cập trong objective không
          if (objective.includes(npcName) || this.calculateSimilarity(npcName, objective) > 0.6) {
            // Kiểm tra interaction có phù hợp với quest không
            const interactionKeywords = ['nói chuyện', 'gặp', 'hỏi', 'thảo luận', 'tiếp xúc'];
            const hasInteractionKeyword = interactionKeywords.some(keyword => 
              interaction.includes(keyword)
            );

            if (hasInteractionKeyword) {
              const confidence = 0.8;
              if (confidence > maxConfidence) {
                maxConfidence = confidence;
                bestMatch = `NPC Relationship match: ${encounter.npcName} - ${encounter.interaction}`;
              }
            }
          }
        }
      }
    }

    // Kiểm tra faction reputation changes
    if (npcRelationships.factionReputations && Array.isArray(npcRelationships.factionReputations)) {
      const recentRepChanges = npcRelationships.factionReputations.filter((rep: any) => 
        rep.lastUpdated && (Date.now() - new Date(rep.lastUpdated).getTime()) < 24 * 60 * 60 * 1000 // 24 hours
      );

      for (const rep of recentRepChanges) {
        if (rep.factionName && objective.includes(rep.factionName.toLowerCase())) {
          const confidence = 0.7;
          if (confidence > maxConfidence) {
            maxConfidence = confidence;
            bestMatch = `Faction reputation match: ${rep.factionName}`;
          }
        }
      }
    }

    return {
      matched: maxConfidence > 0,
      confidence: maxConfidence,
      details: bestMatch || undefined
    };
  }

  /**
   * Phân tích Story Progress để detect quest completion (MỚI!)
   */
  private analyzeStoryProgressForQuestCompletion(_chatInput: string, objectiveDescription: string, storyProgress: any): { matched: boolean; confidence: number; details?: string } {
    const objective = objectiveDescription.toLowerCase();
    let maxConfidence = 0;
    let bestMatch = '';

    // Kiểm tra story milestones
    if (storyProgress.milestones && Array.isArray(storyProgress.milestones)) {
      const recentMilestones = storyProgress.milestones.filter((milestone: any) => 
        milestone.completed && milestone.completedAt && 
        (Date.now() - new Date(milestone.completedAt).getTime()) < 60 * 60 * 1000 // 1 hour
      );

      for (const milestone of recentMilestones) {
        if (milestone.description && this.calculateSimilarity(milestone.description.toLowerCase(), objective) > 0.6) {
          const confidence = 0.8;
          if (confidence > maxConfidence) {
            maxConfidence = confidence;
            bestMatch = `Story Progress milestone match: ${milestone.description}`;
          }
        }
      }
    }

    // Kiểm tra story flags
    if (storyProgress.flags && typeof storyProgress.flags === 'object') {
      const activeFlags = Object.entries(storyProgress.flags).filter(([key, value]) => 
        value === true && this.calculateSimilarity(key.toLowerCase(), objective) > 0.6
      );

      if (activeFlags.length > 0) {
        const confidence = 0.7;
        if (confidence > maxConfidence) {
          maxConfidence = confidence;
          bestMatch = `Story Progress flag match: ${activeFlags[0][0]}`;
        }
      }
    }

    // Kiểm tra story events
    if (storyProgress.events && Array.isArray(storyProgress.events)) {
      const recentEvents = storyProgress.events.filter((event: any) => 
        event.timestamp && (Date.now() - new Date(event.timestamp).getTime()) < 60 * 60 * 1000 // 1 hour
      );

      for (const event of recentEvents) {
        if (event.description && this.calculateSimilarity(event.description.toLowerCase(), objective) > 0.6) {
          const confidence = 0.7;
          if (confidence > maxConfidence) {
            maxConfidence = confidence;
            bestMatch = `Story Progress event match: ${event.description}`;
          }
        }
      }
    }

    return {
      matched: maxConfidence > 0,
      confidence: maxConfidence,
      details: bestMatch || undefined
    };
  }

  /**
   * Phân tích Time-based quest completion (MỚI!)
   */
  private analyzeTimeBasedQuestCompletion(_chatInput: string, objectiveDescription: string, worldTime: any, turnCounter: number, quest: QuestProgress): { matched: boolean; confidence: number; details?: string } {
    const objective = objectiveDescription.toLowerCase();
    let maxConfidence = 0;
    let bestMatch = '';

    // Kiểm tra quest duration
    if (quest.turnStarted && quest.turnCreated) {
      const questDuration = turnCounter - quest.turnStarted;
      const questAge = turnCounter - quest.turnCreated;

      // Quest đã chạy quá lâu (có thể auto-complete)
      if (questAge > 20 && (objective.includes('thời gian') || objective.includes('chờ đợi'))) {
        const confidence = 0.6;
        if (confidence > maxConfidence) {
          maxConfidence = confidence;
          bestMatch = `Time-based quest completion: Quest đã chạy ${questAge} turns`;
        }
      }

      // Quest có thời hạn ngắn
      if (questDuration > 5 && (objective.includes('nhanh') || objective.includes('gấp') || objective.includes('khẩn cấp'))) {
        const confidence = 0.7;
        if (confidence > maxConfidence) {
          maxConfidence = confidence;
          bestMatch = `Time-based quest completion: Quest khẩn cấp đã chạy ${questDuration} turns`;
        }
      }
    }

    // Kiểm tra world time
    if (worldTime && worldTime.hour !== undefined) {
      // Quest cần thực hiện vào giờ cụ thể
      if (objective.includes('buổi sáng') && worldTime.hour >= 6 && worldTime.hour < 12) {
        const confidence = 0.8;
        if (confidence > maxConfidence) {
          maxConfidence = confidence;
          bestMatch = `Time-based quest completion: Buổi sáng (${worldTime.hour}:00)`;
        }
      }
      if (objective.includes('buổi tối') && worldTime.hour >= 18) {
        const confidence = 0.8;
        if (confidence > maxConfidence) {
          maxConfidence = confidence;
          bestMatch = `Time-based quest completion: Buổi tối (${worldTime.hour}:00)`;
        }
      }
      if (objective.includes('đêm') && (worldTime.hour >= 22 || worldTime.hour < 6)) {
        const confidence = 0.8;
        if (confidence > maxConfidence) {
          maxConfidence = confidence;
          bestMatch = `Time-based quest completion: Đêm (${worldTime.hour}:00)`;
        }
      }
    }

    // Kiểm tra quest có deadline
    if (quest.unlockConditions?.timeBased) {
      const questAge = Date.now() - quest.createdAt.getTime();
      const hoursSinceCreation = questAge / (1000 * 60 * 60);
      
      if (hoursSinceCreation > 24 && objective.includes('hoàn thành')) {
        const confidence = 0.6;
        if (confidence > maxConfidence) {
          maxConfidence = confidence;
          bestMatch = `Time-based quest completion: Quest đã tạo ${hoursSinceCreation.toFixed(1)} giờ trước`;
        }
      }
    }

    return {
      matched: maxConfidence > 0,
      confidence: maxConfidence,
      details: bestMatch || undefined
    };
  }

}

export const questDetectionService = new QuestDetectionService();
