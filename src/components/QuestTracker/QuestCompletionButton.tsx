import { useState } from 'react';
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { questCompletionService } from '../../services/questCompletionService';
import { inventoryService } from '../../services/inventoryService';
import { npcRelationshipService } from '../../services/npcRelationshipService';
import { locationService } from '../../services/locationService';
import { QuestProgress } from '../../types';

interface QuestCompletionButtonProps {
  activeQuests?: QuestProgress[];
  onQuestUpdate: (questId: string, objectiveId: string, completed: boolean) => void;
  questId?: string;
  questTitle?: string;
  size?: 'small' | 'normal';
}

export function QuestCompletionButton({ activeQuests, onQuestUpdate, questId, questTitle, size = 'normal' }: QuestCompletionButtonProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckResult, setLastCheckResult] = useState<{
    completedCount: number;
    suggestedCount: number;
    timestamp: Date | null;
  }>({
    completedCount: 0,
    suggestedCount: 0,
    timestamp: null
  });

  const handleCheckCompletion = async () => {
    if (isChecking) return;

    setIsChecking(true);
    try {
      // Tạo quest completion context
      const questCompletionContext = {
        inventory: inventoryService.getInventory(),
        npcRelationships: npcRelationshipService.getAllRelationships(),
        combatHistory: (() => {
          try {
            const combatHistoryData = localStorage.getItem('combat_history');
            const parsed = combatHistoryData ? JSON.parse(combatHistoryData) : { defeatedEnemies: [] };
            if (!Array.isArray(parsed.defeatedEnemies)) {
              parsed.defeatedEnemies = [];
            }
            return parsed;
          } catch (error) {
            console.error('Error parsing combat history:', error);
            return { defeatedEnemies: [] };
          }
        })(),
        playerLocation: (() => {
          try {
            const playerLocation = JSON.parse(localStorage.getItem('player_location') || '{}');
            const currentLocation = locationService.getLocationById(playerLocation.currentLocationId);
            return currentLocation ? currentLocation.name : playerLocation.currentLocationId;
          } catch (error) {
            console.error('Error getting location name:', error);
            return JSON.parse(localStorage.getItem('player_location') || '{}').currentLocationId;
          }
        })(),
        playerPosition: JSON.parse(localStorage.getItem('player_location') || '{}').gridPosition
      };

      let result;
      
      if (questId && questTitle) {
        // Kiểm tra một quest cụ thể
        const questToCheck = activeQuests?.find(q => q.id === questId);
        if (questToCheck) {
          result = await questCompletionService.checkAllActiveQuests(questCompletionContext, [questToCheck]);
        } else {
          // Fallback: kiểm tra tất cả active quests
          result = await questCompletionService.checkAllActiveQuests(questCompletionContext, activeQuests || []);
        }
      } else {
        // Kiểm tra tất cả active quests
        result = await questCompletionService.checkAllActiveQuests(questCompletionContext, activeQuests || []);
      }
      
      // Process completed objectives
      for (const completed of result.completedObjectives) {
        onQuestUpdate(completed.questId, completed.objectiveId, true);
      }

      setLastCheckResult({
        completedCount: result.completedObjectives.length,
        suggestedCount: result.suggestedActions.length,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('❌ Error checking quest completion:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const isSmall = size === 'small';
  
  return (
    <div className={isSmall ? "space-y-1" : "space-y-2"}>
      <button
        onClick={handleCheckCompletion}
        disabled={isChecking}
        className={`${isSmall ? 'w-auto' : 'w-full'} flex items-center justify-center space-x-2 ${
          isSmall ? 'px-2 py-1' : 'px-4 py-2'
        } rounded-lg transition-colors duration-200 ${
          isChecking
            ? 'bg-blue-600/20 text-blue-300 cursor-not-allowed'
            : 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 hover:text-white'
        }`}
      >
        {isChecking ? (
          <>
            <RefreshCw className={`${isSmall ? "w-3 h-3" : "w-4 h-4"} animate-spin`} />
            <span className={isSmall ? "text-xs" : "text-sm"}>{isSmall ? "Đang kiểm tra..." : "Đang kiểm tra..."}</span>
          </>
        ) : (
          <>
            <CheckCircle className={isSmall ? "w-3 h-3" : "w-4 h-4"} />
            <span className={isSmall ? "text-xs" : "text-sm"}>
              {isSmall 
                ? (questTitle ? `Kiểm tra` : 'Kiểm tra quest')
                : (questTitle ? `Kiểm tra "${questTitle}"` : 'Kiểm tra hoàn thành quest')
              }
            </span>
          </>
        )}
      </button>

      {lastCheckResult.timestamp && (
        <div className="text-xs text-gray-400 space-y-1">
          <div className="flex items-center space-x-2">
            {lastCheckResult.completedCount > 0 ? (
              <CheckCircle className="w-3 h-3 text-green-400" />
            ) : (
              <AlertCircle className="w-3 h-3 text-yellow-400" />
            )}
            <span>
              {lastCheckResult.completedCount > 0
                ? `${lastCheckResult.completedCount} mục tiêu hoàn thành`
                : 'Không có mục tiêu mới hoàn thành'
              }
            </span>
          </div>
          <div className="text-gray-500">
            {lastCheckResult.timestamp.toLocaleTimeString()}
          </div>
        </div>
      )}
    </div>
  );
}
