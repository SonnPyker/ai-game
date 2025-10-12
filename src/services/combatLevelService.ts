import { Character } from '../types';

/**
 * Combat Level Service - Quản lý Combat Level dựa trên số lần tham gia chiến đấu
 * Công thức: Level 1-2 cần 1 lần, mỗi level sau cần số lẻ tiếp theo (3,5,7,9,...)
 */
class CombatLevelService {
  private static instance: CombatLevelService;

  private constructor() {}

  public static getInstance(): CombatLevelService {
    if (!CombatLevelService.instance) {
      CombatLevelService.instance = new CombatLevelService();
    }
    return CombatLevelService.instance;
  }

  /**
   * Tính Combat Level dựa trên số lần tham gia chiến đấu
   * @param combatExperience Số lần tham gia chiến đấu
   * @returns Combat Level hiện tại
   */
  public calculateCombatLevel(combatExperience: number): number {
    if (combatExperience <= 0) return 1;
    
    let level = 1;
    
    // Level 1-2: 1 battle (total 1)
    if (combatExperience >= 1) {
      level = 2;
    }
    
    // Level 2-3: 3 battles (total 4)
    if (combatExperience >= 4) {
      level = 3;
    }
    
    // Level 3-4: 5 battles (total 9)
    if (combatExperience >= 9) {
      level = 4;
    }
    
    // Level 4-5: 7 battles (total 16)
    if (combatExperience >= 16) {
      level = 5;
    }
    
    // Level 5-6: 9 battles (total 25)
    if (combatExperience >= 25) {
      level = 6;
    }
    
    // Level 6-7: 11 battles (total 36)
    if (combatExperience >= 36) {
      level = 7;
    }
    
    // Level 7-8: 13 battles (total 49)
    if (combatExperience >= 49) {
      level = 8;
    }
    
    // Level 8-9: 15 battles (total 64)
    if (combatExperience >= 64) {
      level = 9;
    }
    
    // Level 9-10: 17 battles (total 81)
    if (combatExperience >= 81) {
      level = 10;
    }
    
    // Level 10-11: 19 battles (total 100)
    if (combatExperience >= 100) {
      level = 11;
    }
    
    // Level 11-12: 21 battles (total 121)
    if (combatExperience >= 121) {
      level = 12;
    }
    
    // Level 12-13: 23 battles (total 144)
    if (combatExperience >= 144) {
      level = 13;
    }
    
    // Level 13-14: 25 battles (total 169)
    if (combatExperience >= 169) {
      level = 14;
    }
    
    // Level 14-15: 27 battles (total 196)
    if (combatExperience >= 196) {
      level = 15;
    }
    
    // Level 15-16: 29 battles (total 225)
    if (combatExperience >= 225) {
      level = 16;
    }
    
    // Level 16-17: 31 battles (total 256)
    if (combatExperience >= 256) {
      level = 17;
    }
    
    // Level 17-18: 33 battles (total 289)
    if (combatExperience >= 289) {
      level = 18;
    }
    
    // Level 18-19: 35 battles (total 324)
    if (combatExperience >= 324) {
      level = 19;
    }
    
    // Level 19-20: 37 battles (total 361)
    if (combatExperience >= 361) {
      level = 20;
    }
    
    // Level 20-21: 39 battles (total 400)
    if (combatExperience >= 400) {
      level = 21;
    }
    
    // Level 21-22: 41 battles (total 441)
    if (combatExperience >= 441) {
      level = 22;
    }
    
    // Level 22-23: 43 battles (total 484)
    if (combatExperience >= 484) {
      level = 23;
    }
    
    // Level 23-24: 45 battles (total 529)
    if (combatExperience >= 529) {
      level = 24;
    }
    
    // Level 24-25: 47 battles (total 576)
    if (combatExperience >= 576) {
      level = 25;
    }
    
    // Level 25-26: 49 battles (total 625)
    if (combatExperience >= 625) {
      level = 26;
    }
    
    // Level 26-27: 51 battles (total 676)
    if (combatExperience >= 676) {
      level = 27;
    }
    
    // Level 27-28: 53 battles (total 729)
    if (combatExperience >= 729) {
      level = 28;
    }
    
    // Level 28-29: 55 battles (total 784)
    if (combatExperience >= 784) {
      level = 29;
    }
    
    // Level 29-30: 57 battles (total 841)
    if (combatExperience >= 841) {
      level = 30;
    }
    
    // Giới hạn tối đa level 30
    return Math.min(level, 30);
  }

  /**
   * Tính số lần chiến đấu cần để lên Combat Level tiếp theo
   * @param currentCombatLevel Combat Level hiện tại
   * @param currentCombatExperience Số lần đã tham gia chiến đấu
   * @returns Số lần còn thiếu để lên level tiếp theo
   */
  public getBattlesToNextCombatLevel(currentCombatLevel: number, currentCombatExperience: number): number {
    const totalBattlesForNextLevel = this.getTotalBattlesForLevel(currentCombatLevel + 1);
    
    return Math.max(0, totalBattlesForNextLevel - currentCombatExperience);
  }

  /**
   * Tính tổng số lần chiến đấu cần để đạt một Combat Level cụ thể
   * @param targetLevel Combat Level mục tiêu
   * @returns Tổng số lần chiến đấu cần
   */
  public getTotalBattlesForLevel(targetLevel: number): number {
    if (targetLevel <= 1) return 0;
    if (targetLevel === 2) return 1;
    if (targetLevel === 3) return 4; // 1 + 3 = 4
    
    let totalBattles = 4; // Level 1-3 cần 4 lần (1+3)
    for (let level = 4; level <= targetLevel; level++) {
      // Mỗi level cần số lẻ: 5, 7, 9, 11, ...
      totalBattles += (2 * level - 1);
    }
    
    return totalBattles;
  }

  /**
   * Tính số lần chiến đấu cần để lên một level cụ thể
   * @param targetLevel Level mục tiêu
   * @returns Số lần chiến đấu cần để lên level đó
   */
  public getBattlesNeededForLevel(targetLevel: number): number {
    if (targetLevel <= 1) return 0;
    if (targetLevel === 2) return 1;
    if (targetLevel === 3) return 3; // Cần 3 battles để lên từ level 2 lên 3
    
    // Level 4+: 5, 7, 9, 11, ...
    return 2 * targetLevel - 1;
  }

  /**
   * Thêm combat experience cho character
   * @param character Character cần cập nhật
   * @param battlesToAdd Số lần chiến đấu cần thêm
   * @returns Thông tin combat level up
   */
  public addCombatExperience(character: Character, battlesToAdd: number): {
    leveledUp: boolean;
    newCombatLevel: number;
    newCombatExperience: number;
    previousCombatLevel: number;
    levelsGained: number;
    battlesToNext: number;
  } {
    if (battlesToAdd <= 0) {
      return {
        leveledUp: false,
        newCombatLevel: character.combatLevel || 1,
        newCombatExperience: character.combatExperience || 0,
        previousCombatLevel: character.combatLevel || 1,
        levelsGained: 0,
        battlesToNext: this.getBattlesToNextCombatLevel(character.combatLevel || 1, character.combatExperience || 0)
      };
    }

    const previousCombatLevel = character.combatLevel || 1;
    const currentCombatExperience = character.combatExperience || 0;
    const newCombatExperience = currentCombatExperience + battlesToAdd;
    const newCombatLevel = this.calculateCombatLevel(newCombatExperience);
    const levelsGained = newCombatLevel - previousCombatLevel;

    // Cập nhật character
    character.combatExperience = newCombatExperience;
    character.combatLevel = newCombatLevel;

    return {
      leveledUp: levelsGained > 0,
      newCombatLevel,
      newCombatExperience,
      previousCombatLevel,
      levelsGained,
      battlesToNext: this.getBattlesToNextCombatLevel(newCombatLevel, newCombatExperience)
    };
  }

  /**
   * Lấy thông tin Combat Level hiện tại
   * @param character Character cần kiểm tra
   * @returns Thông tin Combat Level chi tiết
   */
  public getCombatLevelInfo(character: Character): {
    currentCombatLevel: number;
    currentCombatExperience: number;
    battlesToNext: number;
    progress: number;
    totalBattlesForCurrentLevel: number;
    totalBattlesForNextLevel: number;
  } {
    const currentCombatLevel = character.combatLevel || 1;
    const currentCombatExperience = character.combatExperience || 0;
    const battlesToNext = this.getBattlesToNextCombatLevel(currentCombatLevel, currentCombatExperience);
    
    const totalBattlesForNextLevel = this.getBattlesNeededForLevel(currentCombatLevel + 1);
    const battlesInCurrentLevel = currentCombatExperience - this.getTotalBattlesForLevel(currentCombatLevel);
    const battlesNeededForCurrentLevel = totalBattlesForNextLevel;
    
    const progress = battlesNeededForCurrentLevel > 0 
      ? (battlesInCurrentLevel / battlesNeededForCurrentLevel) * 100 
      : 100;

    return {
      currentCombatLevel,
      currentCombatExperience,
      battlesToNext,
      progress: Math.min(100, Math.max(0, progress)),
      totalBattlesForCurrentLevel: this.getTotalBattlesForLevel(currentCombatLevel),
      totalBattlesForNextLevel
    };
  }

  /**
   * Khởi tạo character với Combat Level 1
   * @param character Character cần khởi tạo
   */
  public initializeCharacter(character: Character): void {
    character.combatLevel = 1;
    character.combatExperience = 0;
  }

  /**
   * Lấy bảng yêu cầu Combat Level (để hiển thị)
   * @param maxLevel Level tối đa cần hiển thị (mặc định 10)
   * @returns Bảng yêu cầu cho các level
   */
  public getCombatLevelRequirements(maxLevel: number = 10): Array<{
    level: number;
    totalBattlesNeeded: number;
    battlesForThisLevel: number;
  }> {
    const requirements = [];
    
    for (let level = 1; level <= maxLevel; level++) {
      const totalBattlesNeeded = this.getTotalBattlesForLevel(level);
      const battlesForThisLevel = level === 1 ? 0 : (level === 2 ? 1 : (2 * level - 1));
      
      requirements.push({
        level,
        totalBattlesNeeded,
        battlesForThisLevel
      });
    }
    
    return requirements;
  }
}

// Export singleton instance
export const combatLevelService = CombatLevelService.getInstance();