import { QuestSystem } from '../types';

interface QuestCombatObjective {
  id: string;
  type: 'combat';
  description: string;
  targetEnemyName: string;
  targetEnemyType: string;
  requiredKills: number;
  currentKills: number;
  completed: boolean;
  status: 'active' | 'completed' | 'locked';
  unlocked: boolean;
  questId: string;
}

class QuestCombatService {
  private static instance: QuestCombatService;

  public static getInstance(): QuestCombatService {
    if (!QuestCombatService.instance) {
      QuestCombatService.instance = new QuestCombatService();
    }
    return QuestCombatService.instance;
  }

  /**
   * Lấy tất cả combat objectives đang active từ quest system
   */
  public getActiveCombatObjectives(): QuestCombatObjective[] {
    try {
      const questSystemData = localStorage.getItem('quest_system');
      if (!questSystemData) {
        console.log('🔍 questCombatService: No quest_system data found');
        return [];
      }

      const questSystem: QuestSystem = JSON.parse(questSystemData);
      const activeCombatObjectives: QuestCombatObjective[] = [];

      // Xử lý quests từ các categories khác nhau
      const allQuests: any[] = [];
      
      // Thêm starter quest nếu có
      if (questSystem.starterQuest) {
        allQuests.push(questSystem.starterQuest);
      }
      
      // Thêm main quests nếu có
      if (questSystem.mainQuests && Array.isArray(questSystem.mainQuests)) {
        allQuests.push(...questSystem.mainQuests);
      }
      
      // Thêm side quests nếu có
      if (questSystem.sideQuests && Array.isArray(questSystem.sideQuests)) {
        allQuests.push(...questSystem.sideQuests);
      }
      
      // Thêm faction quests nếu có
      if (questSystem.factionQuests && Array.isArray(questSystem.factionQuests)) {
        allQuests.push(...questSystem.factionQuests);
      }

      // Duyệt qua tất cả quests - chỉ xử lý quests active (không completed, không locked)
      allQuests.forEach((quest: any) => {
        // Skip quests that are completed or locked
        if (quest.status === 'completed' || quest.status === 'locked') {
          return;
        }
        
        // Chỉ xử lý quests có status 'active'
        if (quest.status === 'active' && quest.objectives) {
          Object.values(quest.objectives).forEach((objective: any) => {
            if (objective && 
                objective.type === 'combat' && 
                objective.completed === false &&
                objective.unlocked === true) {
              activeCombatObjectives.push({
                id: objective.id,
                type: objective.type,
                description: objective.description,
                targetEnemyName: objective.targetEnemyName,
                targetEnemyType: objective.targetEnemyType,
                requiredKills: objective.requiredKills,
                currentKills: objective.currentKills || 0,
                completed: objective.completed,
                status: objective.status,
                unlocked: objective.unlocked,
                questId: quest.id || 'unknown'
              });
            }
          });
        }
      });

      return activeCombatObjectives;
    } catch (error) {
      console.error('Error reading quest combat objectives:', error);
      return [];
    }
  }

  /**
   * Lấy combat objective phù hợp nhất cho random encounter
   * Ưu tiên objective có ít kills nhất và cần nhiều kills nhất
   */
  public getBestCombatObjectiveForEncounter(): QuestCombatObjective | null {
    const activeObjectives = this.getActiveCombatObjectives();
    
    if (activeObjectives.length === 0) return null;

    // Sắp xếp theo: 1) currentKills ít nhất, 2) requiredKills nhiều nhất
    activeObjectives.sort((a, b) => {
      if (a.currentKills !== b.currentKills) {
        return a.currentKills - b.currentKills;
      }
      return b.requiredKills - a.requiredKills;
    });

    return activeObjectives[0];
  }

  /**
   * Cập nhật progress của combat objective khi enemy bị đánh bại
   */
  public updateCombatObjectiveProgress(enemyName: string): boolean {
    try {
      const questSystemData = localStorage.getItem('quest_system');
      if (!questSystemData) {
        console.log('🔍 No quest_system data found in localStorage');
        return false;
      }

      const questSystem: QuestSystem = JSON.parse(questSystemData);
      let updated = false;
      let foundObjectives = 0;

      console.log('🔍 questCombatService.updateCombatObjectiveProgress called with enemy:', enemyName);
      console.log('🔍 Quest system data:', questSystem);

      // Duyệt qua tất cả quests để tìm objective phù hợp
      // Xử lý starterQuest
      if (questSystem.starterQuest && questSystem.starterQuest.objectives) {
        Object.values(questSystem.starterQuest.objectives).forEach((objective: any) => {
          foundObjectives++;
          console.log('🔍 Checking starterQuest objective:', {
            targetEnemyName: objective.targetEnemyName,
            type: objective.type,
            status: objective.status,
            completed: objective.completed,
            matches: objective.targetEnemyName === enemyName
          });
          
          if (objective && 
              objective.type === 'combat' && 
              objective.status === 'active' && 
              !objective.completed &&
              objective.targetEnemyName === enemyName) {
            
            // Tăng currentKills
            objective.currentKills = (objective.currentKills || 0) + 1;
            
            // Kiểm tra xem đã hoàn thành chưa
            if (objective.currentKills >= objective.requiredKills) {
              objective.completed = true;
              objective.status = 'completed';
              console.log(`🎯 Quest objective completed: ${objective.description}`);
            }
            
            updated = true;
            console.log(`⚔️ Quest progress updated: ${objective.targetEnemyName} (${objective.currentKills}/${objective.requiredKills})`);
          }
        });
      }

      // Xử lý mainQuests
      if (questSystem.mainQuests && Array.isArray(questSystem.mainQuests)) {
        questSystem.mainQuests.forEach((quest: any) => {
          if (quest && quest.objectives) {
            Object.values(quest.objectives).forEach((objective: any) => {
              foundObjectives++;
              console.log('🔍 Checking mainQuest objective:', {
                targetEnemyName: objective.targetEnemyName,
                type: objective.type,
                status: objective.status,
                completed: objective.completed,
                matches: objective.targetEnemyName === enemyName
              });
              
              if (objective && 
                  objective.type === 'combat' && 
                  objective.status === 'active' && 
                  !objective.completed &&
                  objective.targetEnemyName === enemyName) {
                
                // Tăng currentKills
                objective.currentKills = (objective.currentKills || 0) + 1;
                
                // Kiểm tra xem đã hoàn thành chưa
                if (objective.currentKills >= objective.requiredKills) {
                  objective.completed = true;
                  objective.status = 'completed';
                  console.log(`🎯 Quest objective completed: ${objective.description}`);
                }
                
                updated = true;
                console.log(`⚔️ Quest progress updated: ${objective.targetEnemyName} (${objective.currentKills}/${objective.requiredKills})`);
              }
            });
          }
        });
      }

      // Xử lý sideQuests
      if (questSystem.sideQuests && Array.isArray(questSystem.sideQuests)) {
        questSystem.sideQuests.forEach((quest: any) => {
          if (quest && quest.objectives) {
            Object.values(quest.objectives).forEach((objective: any) => {
              foundObjectives++;
              console.log('🔍 Checking sideQuest objective:', {
                targetEnemyName: objective.targetEnemyName,
                type: objective.type,
                status: objective.status,
                completed: objective.completed,
                matches: objective.targetEnemyName === enemyName
              });
              
              if (objective && 
                  objective.type === 'combat' && 
                  objective.status === 'active' && 
                  !objective.completed &&
                  objective.targetEnemyName === enemyName) {
                
                // Tăng currentKills
                objective.currentKills = (objective.currentKills || 0) + 1;
                
                // Kiểm tra xem đã hoàn thành chưa
                if (objective.currentKills >= objective.requiredKills) {
                  objective.completed = true;
                  objective.status = 'completed';
                  console.log(`🎯 Quest objective completed: ${objective.description}`);
                }
                
                updated = true;
                console.log(`⚔️ Quest progress updated: ${objective.targetEnemyName} (${objective.currentKills}/${objective.requiredKills})`);
              }
            });
          }
        });
      }

      // Xử lý factionQuests
      if (questSystem.factionQuests && Array.isArray(questSystem.factionQuests)) {
        questSystem.factionQuests.forEach((quest: any) => {
          if (quest && quest.objectives) {
            Object.values(quest.objectives).forEach((objective: any) => {
              foundObjectives++;
              console.log('🔍 Checking factionQuest objective:', {
                targetEnemyName: objective.targetEnemyName,
                type: objective.type,
                status: objective.status,
                completed: objective.completed,
                matches: objective.targetEnemyName === enemyName
              });
              
              if (objective && 
                  objective.type === 'combat' && 
                  objective.status === 'active' && 
                  !objective.completed &&
                  objective.targetEnemyName === enemyName) {
                
                // Tăng currentKills
                objective.currentKills = (objective.currentKills || 0) + 1;
                
                // Kiểm tra xem đã hoàn thành chưa
                if (objective.currentKills >= objective.requiredKills) {
                  objective.completed = true;
                  objective.status = 'completed';
                  console.log(`🎯 Quest objective completed: ${objective.description}`);
                }
                
                updated = true;
                console.log(`⚔️ Quest progress updated: ${objective.targetEnemyName} (${objective.currentKills}/${objective.requiredKills})`);
              }
            });
          }
        });
      }

      console.log('🔍 Search results:', { foundObjectives, updated });

      if (updated) {
        // Lưu lại quest system
        localStorage.setItem('quest_system', JSON.stringify(questSystem));
      }

      return updated;
    } catch (error) {
      console.error('Error updating quest combat objective:', error);
      return false;
    }
  }

  /**
   * Kiểm tra xem có combat objective nào đang active không
   */
  public hasActiveCombatObjectives(): boolean {
    return this.getActiveCombatObjectives().length > 0;
  }

  /**
   * Kiểm tra xem có combat objective nào chưa completed không
   */
  public hasIncompleteCombatObjectives(): boolean {
    const activeObjectives = this.getActiveCombatObjectives();
    return activeObjectives.some(obj => obj.completed === false);
  }

  /**
   * Lấy thông tin chi tiết về combat objectives
   */
  public getCombatObjectivesInfo(): {
    totalActive: number;
    totalCompleted: number;
    objectives: QuestCombatObjective[];
    randomEncounterRate: number;
    worldDifficulty: string;
    currentEncounterRate: number;
    fleeStatus: string;
  } {
    const activeObjectives = this.getActiveCombatObjectives();
    const completedCount = activeObjectives.filter(obj => obj.completed).length;
    
    // Get world difficulty and calculate base encounter rate
    let baseEncounterRate = 33; // Default 33% (trung bình)
    let worldDifficulty = 'Trung bình';
    
    try {
      // Read world difficulty from world_gen_result
      const worldData = localStorage.getItem('world_gen_result');
      if (worldData) {
        const world = JSON.parse(worldData);
        const difficulty = world.worldDifficulty?.toLowerCase() || world.difficulty?.toLowerCase() || 'trung bình';
        
        if (difficulty.includes('dễ') || difficulty.includes('easy')) {
          baseEncounterRate = 20; // 20% chance (dễ)
          worldDifficulty = 'Dễ';
        } else if (difficulty.includes('khó') || difficulty.includes('hard')) {
          baseEncounterRate = 40; // 40% chance (khó)
          worldDifficulty = 'Khó';
        } else {
          baseEncounterRate = 33; // 33% chance (trung bình)
          worldDifficulty = 'Trung bình';
        }
      }
    } catch (error) {
      console.error('Error parsing world data for encounter rate:', error);
    }
    
    // NEW ENCOUNTER RATE SYSTEM: 0% → tăng dần sau 5 turn → reset về 0% sau combat
    let currentEncounterRate = 0;
    let fleeStatus = 'Normal';
    
    try {
      const currentTurn = parseInt(localStorage.getItem('game_turn_counter') || '0');
      
      // Check if player just finished combat (victory/defeat/flee) - reset encounter chance
      const combatHistoryData = localStorage.getItem('combat_history');
      let lastCombatTurn = -1;
      
      if (combatHistoryData) {
        const combatHistory = JSON.parse(combatHistoryData);
        
        // Check if it's the old format (defeatedEnemies array)
        if (combatHistory.defeatedEnemies && Array.isArray(combatHistory.defeatedEnemies)) {
          // Find the most recent combat (victory/defeat/flee)
          const recentCombat = combatHistory.defeatedEnemies
            .filter((enemy: any) => enemy.turn !== undefined)
            .sort((a: any, b: any) => (b.turn || 0) - (a.turn || 0))[0];
          
          if (recentCombat) {
            lastCombatTurn = recentCombat.turn || 0;
          }
        }
        // Check if it's the new format (CombatResultData array)
        else if (Array.isArray(combatHistory)) {
          const recentCombat = combatHistory
            .filter((combat: any) => combat.metadata?.gameTurn !== undefined)
            .sort((a: any, b: any) => (b.metadata?.gameTurn || 0) - (a.metadata?.gameTurn || 0))[0];
          
          if (recentCombat) {
            lastCombatTurn = recentCombat.metadata.gameTurn || 0;
          }
        }
      }
      
      // Check if player fled recently (for random encounter flee - keep as backup)
      const fledData = localStorage.getItem('player_fled_random_combat');
      if (fledData) {
        const fleeInfo = JSON.parse(fledData);
        const fleeTurn = fleeInfo.turn || 0;
        if (fleeTurn > lastCombatTurn) {
          lastCombatTurn = fleeTurn; // Use flee turn as last encounter
        }
      }
      
      const turnsSinceLastEncounter = currentTurn - lastCombatTurn;
      
      console.log('🔍 New Encounter Rate System:', {
        currentTurn,
        lastCombatTurn,
        turnsSinceLastEncounter,
        baseEncounterRate,
        worldDifficulty: worldDifficulty
      });
      
      if (lastCombatTurn === -1) {
        // No combat history yet - start with 0% and build up
        currentEncounterRate = 0;
        fleeStatus = `Building up (${5 - Math.min(turnsSinceLastEncounter, 5)} turn(s) until ${baseEncounterRate}%)`;
        console.log('🔍 Encounter rate: 0% (building up phase - no combat history)');
      } else if (turnsSinceLastEncounter < 5) {
        // First 5 turns after last encounter: 0% chance
        currentEncounterRate = 0;
        fleeStatus = `Building up (${5 - turnsSinceLastEncounter} turn(s) until ${baseEncounterRate}%)`;
        console.log('🔍 Encounter rate: 0% (building up phase)');
      } else {
        // After 5 turns: reach target rate and maintain
        currentEncounterRate = baseEncounterRate;
        fleeStatus = `Active (${baseEncounterRate}% after ${turnsSinceLastEncounter} turns)`;
        console.log('🔍 Encounter rate: reached target rate', {
          targetRate: baseEncounterRate,
          turnsSinceLastEncounter
        });
      }
    } catch (error) {
      console.error('Error in new encounter rate system:', error);
    }
    
    return {
      totalActive: activeObjectives.length,
      totalCompleted: completedCount,
      objectives: activeObjectives,
      randomEncounterRate: baseEncounterRate, // Base rate from world difficulty
      worldDifficulty: worldDifficulty,
      currentEncounterRate: currentEncounterRate, // Current actual rate (may be 0% if fled recently)
      fleeStatus: fleeStatus
    };
  }
}

export const questCombatService = QuestCombatService.getInstance();