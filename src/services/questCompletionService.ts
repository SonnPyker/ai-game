import { QuestProgress, QuestObjectiveProgress, InventoryItem, NPCRelationship, CombatHistory } from '../types';

export interface QuestCompletionContext {
  inventory: InventoryItem[];
  npcRelationships: NPCRelationship[];
  combatHistory: CombatHistory;
  playerLocation?: string;
  playerPosition?: { x: number; y: number };
}

export interface QuestCompletionResult {
  completedObjectives: Array<{
    questId: string;
    objectiveId: string;
  }>;
  suggestedActions: string[];
}

class QuestCompletionService {
  private static instance: QuestCompletionService;
  private completionCache: Map<string, { result: boolean; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5000; // 5 seconds

  public static getInstance(): QuestCompletionService {
    if (!QuestCompletionService.instance) {
      QuestCompletionService.instance = new QuestCompletionService();
    }
    return QuestCompletionService.instance;
  }

  /**
   * Main method để kiểm tra tất cả quest đang active với logging chi tiết
   */
  async checkAllActiveQuests(
    context: QuestCompletionContext,
    activeQuests: QuestProgress[]
  ): Promise<QuestCompletionResult> {
    const completedObjectives: Array<{ questId: string; objectiveId: string }> = [];
    const suggestedActions: string[] = [];

    for (const quest of activeQuests) {
      if (quest.status !== 'active') continue;

      for (const objective of quest.objectives) {
        if (objective.completed || !objective.unlocked) continue;
        
        const isCompleted = await this.checkObjectiveCompletion(objective, context);
        
        if (isCompleted) {
          completedObjectives.push({
            questId: quest.id,
            objectiveId: objective.id
          });
        }
      }
    }

    // Generate suggested actions based on incomplete objectives
    for (const quest of activeQuests) {
      if (quest.status !== 'active') continue;

      const incompleteObjectives = quest.objectives.filter(obj => !obj.completed && obj.unlocked);
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
   * Clear completion cache
   */
  clearCache(): void {
    this.completionCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.completionCache.size,
      entries: Array.from(this.completionCache.keys())
    };
  }

  /**
   * Kiểm tra completion của một objective cụ thể
   */
  private async checkObjectiveCompletion(
    objective: QuestObjectiveProgress,
    context: QuestCompletionContext
  ): Promise<boolean> {
   // Quest chain objectives được xử lý trong switch case

     switch (objective.type) {
       case 'find_item':
         return this.checkFindItemObjective(objective, context);
       case 'find_npc':
         return this.checkFindNPCObjective(objective, context);
       case 'combat':
         return this.checkCombatObjective(objective, context);
       case 'travel':
         return this.checkTravelObjective(objective, context);
       case 'chain_delivery':
         return this.checkChainDeliveryObjective(objective, context);
       default:
         console.warn(`Unknown objective type: ${objective.type}`);
         return false;
     }
  }

  /**
   * Kiểm tra find_item objective với fuzzy matching chính xác hơn
   */
  private checkFindItemObjective(
    objective: QuestObjectiveProgress,
    context: QuestCompletionContext
  ): boolean {
    if (!objective.targetItemName) {
      console.warn(`⚠️ Find item objective missing targetItemName: ${objective.id}`);
      return false;
    }

    const targetName = objective.targetItemName.toLowerCase().trim();
    const cacheKey = `find_item_${objective.id}_${targetName}`;
    
    // Check cache first
    const cached = this.completionCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.result;
    }

    // Find item with improved matching
    const item = context.inventory.find(i => {
      const itemName = i.name.toLowerCase().trim();
      
      // Exact match first
      if (itemName === targetName) return true;
      
      // Contains match (more strict)
      if (itemName.includes(targetName) || targetName.includes(itemName)) return true;
      
      // Word boundary match for better accuracy
      const words = targetName.split(/\s+/);
      const itemWords = itemName.split(/\s+/);
      return words.some(word => 
        word.length > 2 && itemWords.some(itemWord => 
          itemWord.includes(word) || word.includes(itemWord)
        )
      );
    });

    // Find item objectives chỉ cần có 1 item (không cần số lượng)
    const hasItem = !!(item && item.quantity > 0);
    objective.currentQuantity = hasItem ? 1 : 0;

    // Cache result
    this.completionCache.set(cacheKey, { result: hasItem, timestamp: Date.now() });


    return hasItem;
  }

  /**
   * Kiểm tra find_npc objective với fuzzy matching chính xác hơn
   */
  private checkFindNPCObjective(
    objective: QuestObjectiveProgress,
    context: QuestCompletionContext
  ): boolean {
    if (!objective.targetNPCName) {
      console.warn(`⚠️ Find NPC objective missing targetNPCName: ${objective.id}`);
      return false;
    }

    const targetName = objective.targetNPCName.toLowerCase().trim();
    const cacheKey = `find_npc_${objective.id}_${targetName}`;
    
    // Check cache first
    const cached = this.completionCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.result;
    }

    // Find NPC with improved matching
    const npc = context.npcRelationships.find(npc => {
      const npcName = npc.name.toLowerCase().trim();
      
      // Exact match first
      if (npcName === targetName) return true;
      
      // Contains match (more strict)
      if (npcName.includes(targetName) || targetName.includes(npcName)) return true;
      
      // Word boundary match for better accuracy
      const words = targetName.split(/\s+/);
      const npcWords = npcName.split(/\s+/);
      return words.some(word => 
        word.length > 2 && npcWords.some(npcWord => 
          npcWord.includes(word) || word.includes(npcWord)
        )
      );
    });

    const hasMetNPC = npc ? npc.totalInteractions > 0 : false;

    // Cache result
    this.completionCache.set(cacheKey, { result: hasMetNPC, timestamp: Date.now() });


    return hasMetNPC;
  }

  /**
   * Kiểm tra combat objective với validation chặt chẽ hơn
   */
  private checkCombatObjective(
    objective: QuestObjectiveProgress,
    context: QuestCompletionContext
  ): boolean {
    if (!objective.targetEnemyName || !objective.requiredKills) {
      console.warn(`⚠️ Combat objective missing required fields: ${objective.id}`);
      return false;
    }

    // Validate and limit requiredKills to maximum 3
    if (objective.requiredKills > 3) {
      console.log(`⚠️ Limiting requiredKills from ${objective.requiredKills} to 3 for objective: ${objective.description}`);
      objective.requiredKills = 3;
    }

    const targetName = objective.targetEnemyName.toLowerCase().trim();
    const cacheKey = `combat_${objective.id}_${targetName}_${objective.requiredKills}`;
    
    // Check cache first
    const cached = this.completionCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.result;
    }

    const requiredKills = objective.requiredKills;
    let currentKills = 0;
    const matchedEnemies: string[] = [];

    try {
      // Lấy dữ liệu trực tiếp từ localStorage combat_history
      const combatHistoryData = localStorage.getItem('combat_history');
      let defeatedEnemies: any[] = [];
      
      if (combatHistoryData) {
        const combatHistory = JSON.parse(combatHistoryData);
        // Kiểm tra cấu trúc mới: combat_history là array của CombatResultData
        if (Array.isArray(combatHistory)) {
          // Cấu trúc mới: lấy enemiesDefeated từ tất cả combat results
          combatHistory.forEach((combatResult: any) => {
            if (combatResult.enemiesDefeated && Array.isArray(combatResult.enemiesDefeated)) {
              defeatedEnemies.push(...combatResult.enemiesDefeated);
            }
          });
        }
        // Kiểm tra cấu trúc cũ: combat_history có defeatedEnemies array
        else if (combatHistory && Array.isArray(combatHistory.defeatedEnemies)) {
          defeatedEnemies = combatHistory.defeatedEnemies;
        }
      }
      
      // Fallback: sử dụng context.combatHistory nếu localStorage không có dữ liệu
      if (defeatedEnemies.length === 0 && context.combatHistory) {
        if (Array.isArray(context.combatHistory)) {
          // Cấu trúc mới trong context
          context.combatHistory.forEach((combatResult: any) => {
            if (combatResult.enemiesDefeated && Array.isArray(combatResult.enemiesDefeated)) {
              defeatedEnemies.push(...combatResult.enemiesDefeated);
            }
          });
        } else if (Array.isArray(context.combatHistory.defeatedEnemies)) {
          // Cấu trúc cũ trong context
          defeatedEnemies = context.combatHistory.defeatedEnemies;
        }
      }
      
      console.log(`🔍 checkCombatObjective - Objective: ${objective.targetEnemyName}, Required: ${requiredKills}`);
      console.log(`🔍 checkCombatObjective - Defeated enemies from localStorage:`, defeatedEnemies.length);
      
      for (const defeatedEnemy of defeatedEnemies) {
        const enemyName = defeatedEnemy.name?.toLowerCase().trim() || '';
        
        console.log(`🔍 Comparing enemy names:`, {
          defeatedEnemyName: defeatedEnemy.name,
          enemyNameLower: enemyName,
          targetEnemyName: objective.targetEnemyName,
          targetNameLower: targetName,
          enemyType: defeatedEnemy.type,
          targetEnemyType: objective.targetEnemyType
        });
        
        // Check if enemy name matches with improved algorithm
        const nameMatches = this.fuzzyMatch(enemyName, targetName);
        
        // Check if enemy type matches (if specified)
        // Tạm thời bỏ qua type matching để chỉ focus vào tên enemy
        const typeMatches = true; // !objective.targetEnemyType || 
          // (defeatedEnemy.type?.toLowerCase().trim() === objective.targetEnemyType.toLowerCase().trim());
        
        // Check if specific enemy ID matches (for NPC enemies)
        const idMatches = !objective.targetEnemyId || 
          defeatedEnemy.enemyId === objective.targetEnemyId;

        console.log(`🔍 Match results:`, {
          nameMatches,
          typeMatches,
          idMatches,
          finalMatch: nameMatches && typeMatches && idMatches
        });

        if (nameMatches && typeMatches && idMatches) {
          currentKills++;
          matchedEnemies.push(defeatedEnemy.name);
          console.log(`✅ Combat objective match found: ${defeatedEnemy.name} (${defeatedEnemy.type})`);
        } else {
          console.log(`❌ No match for: ${defeatedEnemy.name}`);
        }
      }
      
      console.log(`🎯 checkCombatObjective - Current kills: ${currentKills}/${requiredKills}`);
      
      // Cập nhật currentKills vào quest system trong localStorage
      if (currentKills > 0) {
        try {
          const questSystemData = localStorage.getItem('quest_system');
          if (questSystemData) {
            const questSystem = JSON.parse(questSystemData);
            let questSystemUpdated = false;
            
            // Cập nhật starterQuest
            if (questSystem.starterQuest && questSystem.starterQuest.objectives) {
              Object.values(questSystem.starterQuest.objectives).forEach((obj: any) => {
                if (obj && obj.id === objective.id && obj.type === 'combat') {
                  obj.currentKills = currentKills;
                  if (currentKills >= obj.requiredKills) {
                    obj.completed = true;
                    obj.status = 'completed';
                  }
                  questSystemUpdated = true;
                  console.log(`🔄 Updated starterQuest objective ${obj.id}: ${obj.currentKills}/${obj.requiredKills}`);
                }
              });
            }
            
            // Cập nhật mainQuests
            if (questSystem.mainQuests && Array.isArray(questSystem.mainQuests)) {
              questSystem.mainQuests.forEach((quest: any) => {
                if (quest && quest.objectives) {
                  Object.values(quest.objectives).forEach((obj: any) => {
                    if (obj && obj.id === objective.id && obj.type === 'combat') {
                      obj.currentKills = currentKills;
                      if (currentKills >= obj.requiredKills) {
                        obj.completed = true;
                        obj.status = 'completed';
                      }
                      questSystemUpdated = true;
                      console.log(`🔄 Updated mainQuest objective ${obj.id}: ${obj.currentKills}/${obj.requiredKills}`);
                    }
                  });
                }
              });
            }
            
            // Cập nhật sideQuests
            if (questSystem.sideQuests && Array.isArray(questSystem.sideQuests)) {
              questSystem.sideQuests.forEach((quest: any) => {
                if (quest && quest.objectives) {
                  Object.values(quest.objectives).forEach((obj: any) => {
                    if (obj && obj.id === objective.id && obj.type === 'combat') {
                      obj.currentKills = currentKills;
                      if (currentKills >= obj.requiredKills) {
                        obj.completed = true;
                        obj.status = 'completed';
                      }
                      questSystemUpdated = true;
                      console.log(`🔄 Updated sideQuest objective ${obj.id}: ${obj.currentKills}/${obj.requiredKills}`);
                    }
                  });
                }
              });
            }
            
            // Cập nhật factionQuests
            if (questSystem.factionQuests && Array.isArray(questSystem.factionQuests)) {
              questSystem.factionQuests.forEach((quest: any) => {
                if (quest && quest.objectives) {
                  Object.values(quest.objectives).forEach((obj: any) => {
                    if (obj && obj.id === objective.id && obj.type === 'combat') {
                      obj.currentKills = currentKills;
                      if (currentKills >= obj.requiredKills) {
                        obj.completed = true;
                        obj.status = 'completed';
                      }
                      questSystemUpdated = true;
                      console.log(`🔄 Updated factionQuest objective ${obj.id}: ${obj.currentKills}/${obj.requiredKills}`);
                    }
                  });
                }
              });
            }
            
            if (questSystemUpdated) {
              localStorage.setItem('quest_system', JSON.stringify(questSystem));
              console.log(`💾 Quest system updated in localStorage with currentKills: ${currentKills}`);
              
              // Dispatch event để trigger UI update
              const questUpdateEvent = new CustomEvent('questSystemUpdated', {
                detail: { 
                  objectiveId: objective.id,
                  currentKills: currentKills,
                  requiredKills: objective.requiredKills,
                  completed: currentKills >= objective.requiredKills
                }
              });
              window.dispatchEvent(questUpdateEvent);
              console.log(`📡 Dispatched questSystemUpdated event for objective ${objective.id}`);
            }
          }
        } catch (error) {
          console.error('Error updating quest system in localStorage:', error);
        }
      }
      
    } catch (error) {
      console.error('Error reading combat history from localStorage in checkCombatObjective:', error);
      // Fallback về context nếu có lỗi
      if (context.combatHistory && Array.isArray(context.combatHistory.defeatedEnemies)) {
        const defeatedEnemies = context.combatHistory.defeatedEnemies;
        for (const defeatedEnemy of defeatedEnemies) {
          const enemyName = defeatedEnemy.name.toLowerCase().trim();
          
          const nameMatches = this.fuzzyMatch(enemyName, targetName);
          const typeMatches = !objective.targetEnemyType || 
            defeatedEnemy.type.toLowerCase().trim() === objective.targetEnemyType.toLowerCase().trim();
          const idMatches = !objective.targetEnemyId || 
            defeatedEnemy.enemyId === objective.targetEnemyId;

          if (nameMatches && typeMatches && idMatches) {
            currentKills++;
            matchedEnemies.push(defeatedEnemy.name);
          }
        }
      }
    }

    // Update current kills in objective (for progress tracking)
    objective.currentKills = currentKills;
    const isCompleted = currentKills >= requiredKills;

    // Cache result
    this.completionCache.set(cacheKey, { result: isCompleted, timestamp: Date.now() });


    return isCompleted;
  }

  /**
   * Kiểm tra travel objective với validation chặt chẽ hơn
   */
  private checkTravelObjective(
    objective: QuestObjectiveProgress,
    context: QuestCompletionContext
  ): boolean {
    if (!objective.targetLocationName) {
      console.warn(`⚠️ Travel objective missing targetLocationName: ${objective.id}`);
      return false;
    }

    const targetLocation = objective.targetLocationName.toLowerCase().trim();
    const cacheKey = `travel_${objective.id}_${targetLocation}`;
    
    // Check cache first
    const cached = this.completionCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.result;
    }

    // Check if player is at target location
    if (context.playerLocation && 
        this.fuzzyMatch(context.playerLocation.toLowerCase().trim(), targetLocation)) {
      return true;
    }

    let isAtLocation = false;

    // Check if player is at target location with improved matching
    if (context.playerLocation) {
      isAtLocation = this.fuzzyMatch(context.playerLocation.toLowerCase().trim(), targetLocation);
    }

    // Check if player is at target position (if specified)
    if (!isAtLocation && objective.targetPosition && context.playerPosition) {
      const distance = Math.sqrt(
        Math.pow(context.playerPosition.x - objective.targetPosition.x, 2) +
        Math.pow(context.playerPosition.y - objective.targetPosition.y, 2)
      );
      isAtLocation = distance <= 2; // Within 2 grid units
    }

    // Cache result
    this.completionCache.set(cacheKey, { result: isAtLocation, timestamp: Date.now() });


    return isAtLocation;
  }


  /**
   * Improved fuzzy matching algorithm
   */
  private fuzzyMatch(text1: string, text2: string): boolean {
    // Exact match first
    if (text1 === text2) return true;
    
    // Contains match (bidirectional)
    if (text1.includes(text2) || text2.includes(text1)) return true;
    
    // Word boundary match for better accuracy
    const words1 = text1.split(/\s+/).filter(w => w.length > 2);
    const words2 = text2.split(/\s+/).filter(w => w.length > 2);
    
    // Check if any significant words match
    return words1.some(word1 => 
      words2.some(word2 => 
        word1.includes(word2) || word2.includes(word1)
      )
    );
  }

  /**
   * Helper method để lấy delivery items cho một NPC cụ thể
   */
  getDeliveryItemsForNPC(npcId: string, inventory: InventoryItem[]): InventoryItem[] {
    return inventory.filter(item => 
      item.tags?.includes('delivery') && 
      item.deliveryNPCId === npcId
    );
  }

  /**
   * Helper method để check xem có delivery quest active không
   */
  hasActiveDeliveryQuests(
    activeQuests: QuestProgress[],
    npcId: string
  ): QuestProgress[] {
    return activeQuests.filter(quest => 
      quest.status === 'active' &&
       quest.objectives.some(obj => 
         obj.type === 'chain_delivery' && 
         obj.deliveryNPCId === npcId &&
         !obj.completed
       )
    );
  }

  /**
   * Helper method để lấy progress của combat objective
   * Lấy dữ liệu trực tiếp từ localStorage combat_history
   */
  getCombatProgress(objective: QuestObjectiveProgress, context: QuestCompletionContext): {
    current: number;
    required: number;
    percentage: number;
  } {
    if (objective.type !== 'combat' || !objective.requiredKills) {
      return { current: 0, required: 0, percentage: 0 };
    }

    // Validate and limit requiredKills to maximum 3
    if (objective.requiredKills > 3) {
      console.log(`⚠️ Limiting requiredKills from ${objective.requiredKills} to 3 for objective: ${objective.description}`);
      objective.requiredKills = 3;
    }

    const requiredKills = objective.requiredKills;
    let currentKills = 0;

    try {
      // Lấy dữ liệu trực tiếp từ localStorage combat_history
      const combatHistoryData = localStorage.getItem('combat_history');
      let defeatedEnemies: any[] = [];
      
      if (combatHistoryData) {
        const combatHistory = JSON.parse(combatHistoryData);
        // Kiểm tra cấu trúc mới: combat_history là array của CombatResultData
        if (Array.isArray(combatHistory)) {
          // Cấu trúc mới: lấy enemiesDefeated từ tất cả combat results
          combatHistory.forEach((combatResult: any) => {
            if (combatResult.enemiesDefeated && Array.isArray(combatResult.enemiesDefeated)) {
              defeatedEnemies.push(...combatResult.enemiesDefeated);
            }
          });
        }
        // Kiểm tra cấu trúc cũ: combat_history có defeatedEnemies array
        else if (combatHistory && Array.isArray(combatHistory.defeatedEnemies)) {
          defeatedEnemies = combatHistory.defeatedEnemies;
        }
      }
      
      // Fallback: sử dụng context.combatHistory nếu localStorage không có dữ liệu
      if (defeatedEnemies.length === 0 && context.combatHistory) {
        if (Array.isArray(context.combatHistory)) {
          // Cấu trúc mới trong context
          context.combatHistory.forEach((combatResult: any) => {
            if (combatResult.enemiesDefeated && Array.isArray(combatResult.enemiesDefeated)) {
              defeatedEnemies.push(...combatResult.enemiesDefeated);
            }
          });
        } else if (Array.isArray(context.combatHistory.defeatedEnemies)) {
          // Cấu trúc cũ trong context
          defeatedEnemies = context.combatHistory.defeatedEnemies;
        }
      }
      
      console.log(`🔍 getCombatProgress - Objective: ${objective.targetEnemyName}, Required: ${requiredKills}`);
      console.log(`🔍 getCombatProgress - Defeated enemies from localStorage:`, defeatedEnemies.length);
      
      for (const defeatedEnemy of defeatedEnemies) {
        const enemyName = defeatedEnemy.name?.toLowerCase().trim() || '';
        const targetName = objective.targetEnemyName?.toLowerCase().trim() || '';
        
        // Sử dụng fuzzy matching để so sánh tên enemy
        const nameMatches = this.fuzzyMatch(enemyName, targetName);
        
        // Kiểm tra type match (nếu có)
        const typeMatches = !objective.targetEnemyType || 
          (defeatedEnemy.type?.toLowerCase().trim() === objective.targetEnemyType.toLowerCase().trim());
        
        // Kiểm tra ID match (nếu có)
        const idMatches = !objective.targetEnemyId || 
          defeatedEnemy.enemyId === objective.targetEnemyId;

        if (nameMatches && typeMatches && idMatches) {
          currentKills++;
          console.log(`✅ Match found: ${defeatedEnemy.name} (${defeatedEnemy.type})`);
        }
      }
      
      console.log(`🎯 getCombatProgress - Current kills: ${currentKills}/${requiredKills}`);
      
    } catch (error) {
      console.error('Error reading combat history from localStorage:', error);
      // Fallback về context nếu có lỗi
      if (context.combatHistory && Array.isArray(context.combatHistory.defeatedEnemies)) {
        const defeatedEnemies = context.combatHistory.defeatedEnemies;
        for (const defeatedEnemy of defeatedEnemies) {
          const nameMatches = defeatedEnemy.name.toLowerCase().includes(objective.targetEnemyName!.toLowerCase());
          const typeMatches = !objective.targetEnemyType || 
            defeatedEnemy.type.toLowerCase() === objective.targetEnemyType.toLowerCase();
          const idMatches = !objective.targetEnemyId || 
            defeatedEnemy.enemyId === objective.targetEnemyId;

          if (nameMatches && typeMatches && idMatches) {
            currentKills++;
          }
        }
      }
    }

    return {
      current: currentKills,
      required: requiredKills,
      percentage: Math.min(100, (currentKills / requiredKills) * 100)
    };
  }

  /**
   * Kiểm tra chain_delivery objective (giao item cho NPC trong quest chain)
   */
  private checkChainDeliveryObjective(
    objective: QuestObjectiveProgress,
    context: QuestCompletionContext
  ): boolean {
    if (!objective.deliveryItemName || !objective.deliveryNPCName) {
      console.warn(`⚠️ Chain delivery objective missing required fields: ${objective.id}`);
      return false;
    }

    const targetItem = objective.deliveryItemName.toLowerCase().trim();
    const targetNPC = objective.deliveryNPCName.toLowerCase().trim();
    const cacheKey = `chain_delivery_${objective.id}_${targetItem}_${targetNPC}`;
    
    // Check cache first
    const cached = this.completionCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.result;
    }

    // Check if player has the required item (không cần delivery tag vì đây là quest chain)
    const hasItem = context.inventory.some(item => {
      const itemName = item.name.toLowerCase().trim();
      return this.fuzzyMatch(itemName, targetItem);
    });

    if (!hasItem) {
      return false;
    }

    // Check if player has interacted with the target NPC
    const npc = context.npcRelationships.find(npc => {
      const npcName = npc.name.toLowerCase().trim();
      return this.fuzzyMatch(npcName, targetNPC);
    });

    const hasMetNPC = npc ? npc.totalInteractions > 0 : false;

    // Cache result
    this.completionCache.set(cacheKey, { result: hasMetNPC, timestamp: Date.now() });

    return hasMetNPC;
  }
}

export const questCompletionService = QuestCompletionService.getInstance();
