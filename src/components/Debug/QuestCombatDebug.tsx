import React, { useState, useEffect } from 'react';
import { questCombatService } from '../../services/questCombatService';

interface QuestCombatDebugProps {
  onClose: () => void;
}

export const QuestCombatDebug: React.FC<QuestCombatDebugProps> = ({ onClose }) => {
  const [questInfo, setQuestInfo] = useState<any>(null);
  const [hasIncompleteObjectives, setHasIncompleteObjectives] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const info = questCombatService.getCombatObjectivesInfo();
    const hasIncomplete = questCombatService.hasIncompleteCombatObjectives();
    setQuestInfo(info);
    setHasIncompleteObjectives(hasIncomplete);
  }, [refreshKey]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleTestQuestUpdate = () => {
    // Test quest progress update using current active objective
    const activeObjectives = questCombatService.getActiveCombatObjectives();
    if (activeObjectives.length > 0) {
      const testEnemyName = activeObjectives[0].targetEnemyName;
      const updated = questCombatService.updateCombatObjectiveProgress(testEnemyName);
      console.log(`Test quest update for ${testEnemyName}:`, updated);
      handleRefresh();
    } else {
      console.log('No active combat objectives to test');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999]">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Quest Combat Debug</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex space-x-2">
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Refresh
            </button>
            <button
              onClick={handleTestQuestUpdate}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Test Quest Update
            </button>
          </div>

          {questInfo && (
            <div className="space-y-4">
              <div className="bg-gray-800 p-4 rounded">
                <h3 className="text-lg font-semibold text-white mb-2">Quest Combat Status</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Total Active:</span>
                    <span className="text-white ml-2">{questInfo.totalActive}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Total Completed:</span>
                    <span className="text-white ml-2">{questInfo.totalCompleted}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Has Incomplete:</span>
                    <span className={`ml-2 ${hasIncompleteObjectives ? 'text-green-400' : 'text-red-400'}`}>
                      {hasIncompleteObjectives ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">World Difficulty:</span>
                    <span className="ml-2 text-blue-400">
                      {questInfo.worldDifficulty}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Base Encounter Rate:</span>
                    <span className="ml-2 text-green-400">
                      {questInfo.randomEncounterRate}%
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Current Encounter Rate:</span>
                    <span className={`ml-2 ${questInfo.currentEncounterRate === 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {questInfo.currentEncounterRate}%
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Flee Status:</span>
                    <span className={`ml-2 ${questInfo.fleeStatus.includes('Fled') ? 'text-yellow-400' : 'text-green-400'}`}>
                      {questInfo.fleeStatus}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Quest Encounters:</span>
                    <span className={`ml-2 ${hasIncompleteObjectives ? 'text-green-400' : 'text-yellow-400'}`}>
                      {hasIncompleteObjectives ? 'Quest-based' : 'Normal Random'}
                    </span>
                  </div>
                </div>
              </div>

              {questInfo.objectives.length > 0 && (
                <div className="bg-gray-800 p-4 rounded">
                  <h3 className="text-lg font-semibold text-white mb-2">Active Objectives</h3>
                  <div className="space-y-2">
                    {questInfo.objectives.map((objective: any, index: number) => (
                      <div key={objective.id || index} className="bg-gray-700 p-3 rounded">
                        <div className="flex justify-between items-start mb-2">
                          <div className="text-white font-medium">{objective.targetEnemyName}</div>
                          <div className="text-sm text-gray-400">
                            {objective.currentKills}/{objective.requiredKills}
                          </div>
                        </div>
                        <div className="text-sm text-gray-300 mb-1">{objective.description}</div>
                        <div className="text-xs text-gray-400">
                          Type: {objective.targetEnemyType} | Quest: {objective.questId} | Status: {objective.status}
                        </div>
                        <div className="w-full bg-gray-600 rounded-full h-2 mt-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full transition-all duration-300"
                            style={{ 
                              width: `${Math.min(100, (objective.currentKills / objective.requiredKills) * 100)}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {questInfo.objectives.length === 0 && (
                <div className="bg-gray-800 p-4 rounded text-center">
                  <p className="text-gray-400">No active combat objectives found</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
