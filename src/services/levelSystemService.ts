import { Character } from '../types';

/**
 * Level System Service - DnD 5e Level System
 * Hỗ trợ level 1+ với bảng XP chuẩn DnD 5e cho level 1-20
 * Level từ 20+ sử dụng công thức động: xp_max_previous + (xp_max_previous/2)
 */
class LevelSystemService {
  private static instance: LevelSystemService;

  // Bảng XP cần cho mỗi level (không cộng dồn)
  private readonly XP_FOR_LEVEL = [
    300,    // Level 1 → Level 2
    900,    // Level 2 → Level 3
    2700,   // Level 3 → Level 4
    6500,   // Level 4 → Level 5
    14000,  // Level 5 → Level 6
    23000,  // Level 6 → Level 7
    34000,  // Level 7 → Level 8
    48000,  // Level 8 → Level 9
    64000,  // Level 9 → Level 10
    85000,  // Level 10 → Level 11
    100000, // Level 11 → Level 12
    120000, // Level 12 → Level 13
    140000, // Level 13 → Level 14
    165000, // Level 14 → Level 15
    195000, // Level 15 → Level 16
    225000, // Level 16 → Level 17
    265000, // Level 17 → Level 18
    305000, // Level 18 → Level 19
    355000  // Level 19 → Level 20
  ];

  private constructor() {}

  public static getInstance(): LevelSystemService {
    if (!LevelSystemService.instance) {
      LevelSystemService.instance = new LevelSystemService();
    }
    return LevelSystemService.instance;
  }

  /**
   * Lấy XP cần để lên level tiếp theo
   * @param currentLevel Level hiện tại (1+)
   * @returns XP cần để lên level tiếp theo
   */
  public getXPForLevel(currentLevel: number): number {
    if (currentLevel < 1) {
      throw new Error('Level phải từ 1 trở lên');
    }
    
    // Level 1-20 sử dụng bảng XP cố định
    if (currentLevel <= 20) {
      return this.XP_FOR_LEVEL[currentLevel - 1];
    }
    
    // Level 21+ sử dụng công thức động
    // XP cần = XP max của level trước + (XP max của level trước / 2)
    const previousLevelXP = this.getXPForLevel(currentLevel - 1);
    return previousLevelXP + Math.floor(previousLevelXP / 2);
  }


  /**
   * Thêm XP cho character và kiểm tra level up
   * @param character Character cần thêm XP
   * @param xpToAdd Số XP cần thêm
   * @returns Thông tin level up
   */
  public addExperience(character: Character, xpToAdd: number): {
    leveledUp: boolean;
    newLevel: number;
    newXP: number;
    previousLevel: number;
    levelsGained: number;
    socialSkillPointsEarned: number;
  } {
    if (xpToAdd <= 0) {
      return {
        leveledUp: false,
        newLevel: character.level || 1,
        newXP: character.experience || 0,
        previousLevel: character.level || 1,
        levelsGained: 0,
        socialSkillPointsEarned: 0
      };
    }

    let currentLevel = character.level || 1;
    let currentXP = character.experience || 0;
    let remainingXP = xpToAdd;
    let levelsGained = 0;
    const previousLevel = currentLevel;

    // Xử lý level up cho đến khi hết XP (không giới hạn level)
    while (remainingXP > 0) {
      const xpNeededForNextLevel = this.getXPForLevel(currentLevel);
      
      if (currentXP + remainingXP >= xpNeededForNextLevel) {
        // Đủ XP để lên level
        remainingXP -= (xpNeededForNextLevel - currentXP);
        currentLevel++;
        currentXP = 0; // Reset XP về 0 khi lên level
        levelsGained++;
      } else {
        // Không đủ XP để lên level, chỉ cộng vào XP hiện tại
        currentXP += remainingXP;
        remainingXP = 0;
      }
    }

    // Tính social skill points
    let socialSkillPointsEarned = 0;
    if (levelsGained > 0) {
      // Tính skill points: mỗi character level = 1 social skill point
      // Cần tính tổng skill points dựa trên level hiện tại, không phải chỉ cộng thêm
      const expectedSocialSkillPoints = currentLevel;
      const currentSocialSkillPoints = character.skillPoints?.social || 0;
      socialSkillPointsEarned = expectedSocialSkillPoints - currentSocialSkillPoints;

      // Cập nhật skill points
      if (!character.skillPoints) {
        character.skillPoints = { combat: 0, social: 0 };
      }
      character.skillPoints.social = expectedSocialSkillPoints;
    }

    // Cập nhật character
    character.experience = currentXP;
    character.level = currentLevel;

    return {
      leveledUp: levelsGained > 0,
      newLevel: currentLevel,
      newXP: currentXP,
      previousLevel: previousLevel,
      levelsGained: levelsGained,
      socialSkillPointsEarned
    };
  }

  /**
   * Lấy XP còn thiếu để lên level tiếp theo
   * @param character Character cần kiểm tra
   * @returns XP còn thiếu (không có max level)
   */
  public getXPToNextLevel(character: Character): number {
    const currentLevel = character.level || 1;
    const currentXP = character.experience || 0;

    const xpNeededForNextLevel = this.getXPForLevel(currentLevel);
    return Math.max(0, xpNeededForNextLevel - currentXP);
  }

  /**
   * Lấy % tiến độ level hiện tại
   * @param character Character cần kiểm tra
   * @returns % tiến độ (0-100)
   */
  public getLevelProgress(character: Character): number {
    const currentLevel = character.level || 1;
    const currentXP = character.experience || 0;

    const xpNeededForNextLevel = this.getXPForLevel(currentLevel);
    return Math.min(100, Math.max(0, (currentXP / xpNeededForNextLevel) * 100));
  }

  /**
   * Lấy thông tin level hiện tại
   * @param character Character cần kiểm tra
   * @returns Thông tin level chi tiết
   */
  public getLevelInfo(character: Character): {
    currentLevel: number;
    currentXP: number;
    xpToNext: number;
    progress: number;
    isMaxLevel: boolean;
  } {
    const currentLevel = character.level || 1;
    const currentXP = character.experience || 0;
    const xpToNext = this.getXPToNextLevel(character);
    const progress = this.getLevelProgress(character);
    const isMaxLevel = false; // Không còn max level

    return {
      currentLevel,
      currentXP,
      xpToNext,
      progress,
      isMaxLevel
    };
  }

  /**
   * Khởi tạo character với level 1
   * @param character Character cần khởi tạo
   */
  public initializeCharacter(character: Character): void {
    character.level = 1;
    character.experience = 0;
  }

  /**
   * Kiểm tra xem character có thể level up không
   * @param character Character cần kiểm tra
   * @returns true nếu có thể level up
   */
  public canLevelUp(character: Character): boolean {
    const currentLevel = character.level || 1;
    const currentXP = character.experience || 0;
    return currentXP >= this.getXPForLevel(currentLevel);
  }
}

// Export singleton instance
export const levelSystemService = LevelSystemService.getInstance();
