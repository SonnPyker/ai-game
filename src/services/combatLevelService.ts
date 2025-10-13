import { Character } from '../types';

/**
 * Combat Level Service - XP System giống Level System bình thường
 * Sử dụng XP system với XP cần thiết là các số lẻ: 1, 3, 5, 7, 9, ...
 * Mỗi combat thắng = 1 XP combat level
 */
class CombatLevelService {
  private static instance: CombatLevelService;

  // Bảng XP cần cho mỗi combat level (không cộng dồn)
  // Level 1→2: 1 XP, Level 2→3: 3 XP, Level 3→4: 5 XP, ...
  private readonly XP_FOR_COMBAT_LEVEL = [
    1,   // Level 1 → Level 2
    3,   // Level 2 → Level 3
    5,   // Level 3 → Level 4
    7,   // Level 4 → Level 5
    9,   // Level 5 → Level 6
    11,  // Level 6 → Level 7
    13,  // Level 7 → Level 8
    15,  // Level 8 → Level 9
    17,  // Level 9 → Level 10
    19,  // Level 10 → Level 11
    21,  // Level 11 → Level 12
    23,  // Level 12 → Level 13
    25,  // Level 13 → Level 14
    27,  // Level 14 → Level 15
    29,  // Level 15 → Level 16
    31,  // Level 16 → Level 17
    33,  // Level 17 → Level 18
    35,  // Level 18 → Level 19
    37,  // Level 19 → Level 20
    39,  // Level 20 → Level 21
    41,  // Level 21 → Level 22
    43,  // Level 22 → Level 23
    45,  // Level 23 → Level 24
    47,  // Level 24 → Level 25
    49,  // Level 25 → Level 26
    51,  // Level 26 → Level 27
    53,  // Level 27 → Level 28
    55,  // Level 28 → Level 29
    57,  // Level 29 → Level 30
    59,  // Level 30 → Level 31
    61,  // Level 31 → Level 32
    63,  // Level 32 → Level 33
    65,  // Level 33 → Level 34
    67,  // Level 34 → Level 35
    69,  // Level 35 → Level 36
    71,  // Level 36 → Level 37
    73,  // Level 37 → Level 38
    75,  // Level 38 → Level 39
    77,  // Level 39 → Level 40
    79,  // Level 40 → Level 41
    81,  // Level 41 → Level 42
    83,  // Level 42 → Level 43
    85,  // Level 43 → Level 44
    87,  // Level 44 → Level 45
    89,  // Level 45 → Level 46
    91,  // Level 46 → Level 47
    93,  // Level 47 → Level 48
    95,  // Level 48 → Level 49
    97,  // Level 49 → Level 50
  ];

  private constructor() {}

  public static getInstance(): CombatLevelService {
    if (!CombatLevelService.instance) {
      CombatLevelService.instance = new CombatLevelService();
    }
    return CombatLevelService.instance;
  }

  /**
   * Lấy XP cần để lên combat level tiếp theo
   * @param currentCombatLevel Combat level hiện tại (1+)
   * @returns XP cần để lên combat level tiếp theo
   */
  public getXPForCombatLevel(currentCombatLevel: number): number {
    if (currentCombatLevel < 1) {
      throw new Error('Combat level phải từ 1 trở lên');
    }
    
    // Level 1-50 sử dụng bảng XP cố định
    if (currentCombatLevel <= 50) {
      return this.XP_FOR_COMBAT_LEVEL[currentCombatLevel - 1];
    }
    
    // Level 51+ sử dụng công thức động: 2 * level - 1
    return 2 * currentCombatLevel - 1;
  }

  /**
   * Tính Combat Level dựa trên XP combat
   * @param combatXP XP combat hiện tại
   * @returns Combat Level hiện tại
   */
  public calculateCombatLevel(combatXP: number): number {
    if (combatXP <= 0) return 1;
    
    let level = 1;
    let remainingXP = combatXP;
    
    // Xử lý level up cho đến khi hết XP
    while (remainingXP > 0) {
      const xpNeededForNextLevel = this.getXPForCombatLevel(level);
      
      if (remainingXP >= xpNeededForNextLevel) {
        // Đủ XP để lên level
        remainingXP -= xpNeededForNextLevel;
        level++;
      } else {
        // Không đủ XP để lên level
        break;
      }
    }
    
    return level;
  }

  /**
   * Thêm XP combat cho character và kiểm tra level up
   * @param character Character cần thêm XP combat
   * @param xpToAdd Số XP combat cần thêm
   * @returns Thông tin combat level up
   */
  public addCombatExperience(character: Character, xpToAdd: number): {
    leveledUp: boolean;
    newCombatLevel: number;
    newCombatXP: number;
    previousCombatLevel: number;
    levelsGained: number;
    skillPointsEarned: number;
    hpBonusEarned: number;
  } {
    if (xpToAdd <= 0) {
      return {
        leveledUp: false,
        newCombatLevel: character.combatLevel || 1,
        newCombatXP: character.combatExperience || 0,
        previousCombatLevel: character.combatLevel || 1,
        levelsGained: 0,
        skillPointsEarned: 0,
        hpBonusEarned: 0
      };
    }

    let currentCombatLevel = character.combatLevel || 1;
    let currentCombatXP = character.combatExperience || 0;
    let remainingXP = xpToAdd;
    let levelsGained = 0;
    const previousCombatLevel = currentCombatLevel;

    // Xử lý level up cho đến khi hết XP (không giới hạn level)
    while (remainingXP > 0) {
      const xpNeededForNextLevel = this.getXPForCombatLevel(currentCombatLevel);
      
      if (currentCombatXP + remainingXP >= xpNeededForNextLevel) {
        // Đủ XP để lên level
        remainingXP -= (xpNeededForNextLevel - currentCombatXP);
        currentCombatLevel++;
        currentCombatXP = 0; // Reset XP về 0 khi lên level
        levelsGained++;
      } else {
        // Không đủ XP để lên level, chỉ cộng vào XP hiện tại
        currentCombatXP += remainingXP;
        remainingXP = 0;
      }
    }

    // Tính skill points và HP bonus
    let skillPointsEarned = 0;
    let hpBonusEarned = 0;

    if (levelsGained > 0) {
      // Tính skill points: mỗi 3 combat levels = 1 skill point
      const previousSkillPoints = Math.floor((previousCombatLevel - 1) / 3);
      const newSkillPoints = Math.floor((currentCombatLevel - 1) / 3);
      skillPointsEarned = newSkillPoints - previousSkillPoints;

      // Tính HP bonus: mỗi 3 combat levels = +7 HP
      const previousHpBonus = Math.floor((previousCombatLevel - 1) / 3) * 7;
      const newHpBonus = Math.floor((currentCombatLevel - 1) / 3) * 7;
      hpBonusEarned = newHpBonus - previousHpBonus;

      // Cập nhật skill points
      if (!character.skillPoints) {
        character.skillPoints = { combat: 0, social: 0 };
      }
      character.skillPoints.combat += skillPointsEarned;

      // Cập nhật HP
      if (character.health) {
        // Chỉ cộng HP bonus từ combat level (mỗi 3 levels = +3 HP)
        // Base HP đã được tính từ Constitution trong character creation
        character.health.max += hpBonusEarned;
        character.health.current += hpBonusEarned; // Heal to full when leveling up
      }
    }

    // Cập nhật character
    character.combatExperience = currentCombatXP;
    character.combatLevel = currentCombatLevel;

    return {
      leveledUp: levelsGained > 0,
      newCombatLevel: currentCombatLevel,
      newCombatXP: currentCombatXP,
      previousCombatLevel,
      levelsGained,
      skillPointsEarned,
      hpBonusEarned
    };
  }

  /**
   * Lấy XP còn thiếu để lên combat level tiếp theo
   * @param character Character cần kiểm tra
   * @returns XP còn thiếu (không có max level)
   */
  public getXPToNextCombatLevel(character: Character): number {
    const currentCombatLevel = character.combatLevel || 1;
    const currentCombatXP = character.combatExperience || 0;

    const xpNeededForNextLevel = this.getXPForCombatLevel(currentCombatLevel);
    return Math.max(0, xpNeededForNextLevel - currentCombatXP);
  }

  /**
   * Lấy % tiến độ combat level hiện tại
   * @param character Character cần kiểm tra
   * @returns % tiến độ (0-100)
   */
  public getCombatLevelProgress(character: Character): number {
    const currentCombatLevel = character.combatLevel || 1;
    const currentCombatXP = character.combatExperience || 0;

    const xpNeededForNextLevel = this.getXPForCombatLevel(currentCombatLevel);
    return Math.min(100, Math.max(0, (currentCombatXP / xpNeededForNextLevel) * 100));
  }

  /**
   * Lấy thông tin Combat Level hiện tại
   * @param character Character cần kiểm tra
   * @returns Thông tin Combat Level chi tiết
   */
  public getCombatLevelInfo(character: Character): {
    currentCombatLevel: number;
    currentCombatXP: number;
    xpToNext: number;
    progress: number;
    isMaxLevel: boolean;
  } {
    const currentCombatLevel = character.combatLevel || 1;
    const currentCombatXP = character.combatExperience || 0;
    const xpToNext = this.getXPToNextCombatLevel(character);
    const progress = this.getCombatLevelProgress(character);
    const isMaxLevel = false; // Không còn max level

    return {
      currentCombatLevel,
      currentCombatXP,
      xpToNext,
      progress,
      isMaxLevel
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
   * Kiểm tra xem character có thể combat level up không
   * @param character Character cần kiểm tra
   * @returns true nếu có thể level up
   */
  public canCombatLevelUp(character: Character): boolean {
    const currentCombatLevel = character.combatLevel || 1;
    const currentCombatXP = character.combatExperience || 0;
    return currentCombatXP >= this.getXPForCombatLevel(currentCombatLevel);
  }

  /**
   * Lấy bảng yêu cầu Combat Level (để hiển thị)
   * @param maxLevel Level tối đa cần hiển thị (mặc định 10)
   * @returns Bảng yêu cầu cho các level
   */
  public getCombatLevelRequirements(maxLevel: number = 10): Array<{
    level: number;
    xpNeeded: number;
  }> {
    const requirements = [];
    
    for (let level = 1; level <= maxLevel; level++) {
      const xpNeeded = this.getXPForCombatLevel(level);
      
      requirements.push({
        level,
        xpNeeded
      });
    }
    
    return requirements;
  }
}

// Export singleton instance
export const combatLevelService = CombatLevelService.getInstance();