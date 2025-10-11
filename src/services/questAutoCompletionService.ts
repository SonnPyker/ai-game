import { questCompletionService } from './questCompletionService';
import { inventoryService } from './inventoryService';
import { npcRelationshipService } from './npcRelationshipService';
import { QuestProgress } from '../types';

class QuestAutoCompletionService {
  private static instance: QuestAutoCompletionService;
  private lastCheckTime = 0;
  private readonly CHECK_INTERVAL = 2000; // 2 seconds

  public static getInstance(): QuestAutoCompletionService {
    if (!QuestAutoCompletionService.instance) {
      QuestAutoCompletionService.instance = new QuestAutoCompletionService();
    }
    return QuestAutoCompletionService.instance;
  }

  /**
   * Check quest completion với context hiện tại
   */
  async checkQuestCompletion(activeQuests: QuestProgress[]): Promise<{
    completedObjectives: Array<{ questId: string; objectiveId: string }>;
    suggestedActions: string[];
  }> {
    const now = Date.now();
    
    // Throttle checks to avoid excessive calls
    if (now - this.lastCheckTime < this.CHECK_INTERVAL) {
      return { completedObjectives: [], suggestedActions: [] };
    }
    
    this.lastCheckTime = now;

    const questCompletionContext = {
      inventory: inventoryService.getInventory(),
      npcRelationships: npcRelationshipService.getAllRelationships(),
      combatHistory: JSON.parse(localStorage.getItem('combat_history') || '{"defeatedEnemies":[]}'),
      playerLocation: JSON.parse(localStorage.getItem('player_location') || '{}').currentLocationId,
      playerPosition: JSON.parse(localStorage.getItem('player_location') || '{}').gridPosition
    };

    return await questCompletionService.checkAllActiveQuests(questCompletionContext, activeQuests);
  }

  /**
   * Force check quest completion (không throttle)
   */
  async forceCheckQuestCompletion(activeQuests: QuestProgress[]): Promise<{
    completedObjectives: Array<{ questId: string; objectiveId: string }>;
    suggestedActions: string[];
  }> {
    const questCompletionContext = {
      inventory: inventoryService.getInventory(),
      npcRelationships: npcRelationshipService.getAllRelationships(),
      combatHistory: JSON.parse(localStorage.getItem('combat_history') || '{"defeatedEnemies":[]}'),
      playerLocation: JSON.parse(localStorage.getItem('player_location') || '{}').currentLocationId,
      playerPosition: JSON.parse(localStorage.getItem('player_location') || '{}').gridPosition
    };

    return await questCompletionService.checkAllActiveQuests(questCompletionContext, activeQuests);
  }

  /**
   * Check specific NPC interaction for quest completion
   */
  async checkNPCInteractionForQuests(_npcName: string, activeQuests: QuestProgress[]): Promise<{
    completedObjectives: Array<{ questId: string; objectiveId: string }>;
    suggestedActions: string[];
  }> {
    const questCompletionContext = {
      inventory: inventoryService.getInventory(),
      npcRelationships: npcRelationshipService.getAllRelationships(),
      combatHistory: JSON.parse(localStorage.getItem('combat_history') || '{"defeatedEnemies":[]}'),
      playerLocation: JSON.parse(localStorage.getItem('player_location') || '{}').currentLocationId,
      playerPosition: JSON.parse(localStorage.getItem('player_location') || '{}').gridPosition
    };

    return await questCompletionService.checkAllActiveQuests(questCompletionContext, activeQuests);
  }
}

export const questAutoCompletionService = QuestAutoCompletionService.getInstance();
