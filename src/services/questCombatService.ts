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

      // Duyệt qua tất cả quests - chỉ xử lý quests chưa completed
      allQuests.forEach((quest: any) => {
        // Skip quests that are completed
        if (quest.status === 'completed') {
          return;
        }
        
        if (quest && quest.objectives) {
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
      if (!questSystemData) return false;

      const questSystem: QuestSystem = JSON.parse(questSystemData);
      let updated = false;

      // Duyệt qua tất cả quests để tìm objective phù hợp
      Object.values(questSystem).forEach((quest: any) => {
        if (quest && quest.objectives) {
          Object.values(quest.objectives).forEach((objective: any) => {
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
  } {
    const activeObjectives = this.getActiveCombatObjectives();
    const completedCount = activeObjectives.filter(obj => obj.completed).length;
    
    // Get world difficulty and calculate encounter rate
    let encounterRate = 50; // Default 50% (trung bình)
    let worldDifficulty = 'Trung bình';
    
    try {
      const worldData = localStorage.getItem('world_gen_result');
      if (worldData) {
        const world = JSON.parse(worldData);
        const difficulty = world.difficulty?.toLowerCase() || 'trung bình';
        
        if (difficulty.includes('dễ') || difficulty.includes('easy')) {
          encounterRate = 25; // 25% chance
          worldDifficulty = 'Dễ';
        } else if (difficulty.includes('khó') || difficulty.includes('hard')) {
          encounterRate = 70; // 70% chance
          worldDifficulty = 'Khó';
        } else {
          encounterRate = 50; // 50% chance
          worldDifficulty = 'Trung bình';
        }
      }
    } catch (error) {
      console.error('Error parsing world data for encounter rate:', error);
    }
    
    return {
      totalActive: activeObjectives.length,
      totalCompleted: completedCount,
      objectives: activeObjectives,
      randomEncounterRate: encounterRate,
      worldDifficulty: worldDifficulty
    };
  }
}

export const questCombatService = QuestCombatService.getInstance();