import { Character } from '../types';
import { saveGameService } from './saveStorage/saveGameService';

/**
 * Service để force recalculate skill points cho các save đã có
 * Áp dụng cơ chế mới: mỗi lần lên cấp = 1 skill point
 */
class SkillPointRecalculateService {
  private static instance: SkillPointRecalculateService;

  private constructor() {}

  public static getInstance(): SkillPointRecalculateService {
    if (!SkillPointRecalculateService.instance) {
      SkillPointRecalculateService.instance = new SkillPointRecalculateService();
    }
    return SkillPointRecalculateService.instance;
  }

  /**
   * Tính toán lại skill points cho character dựa trên level hiện tại
   * @param character Character cần recalculate
   * @returns Character đã được cập nhật skill points
   */
  public recalculateSkillPoints(character: Character): Character {
    const updatedCharacter = { ...character };

    // Khởi tạo skill points nếu chưa có
    if (!updatedCharacter.skillPoints) {
      updatedCharacter.skillPoints = { combat: 0, social: 0 };
    }

    // Tính combat skill points: mỗi combat level = 1 skill point
    const combatLevel = updatedCharacter.combatLevel || 1;
    const expectedCombatSkillPoints = combatLevel; // Level 1 = 1 point, Level 2 = 2 points, Level 3 = 3 points
    
    // Tính social skill points: mỗi character level = 1 skill point  
    const characterLevel = updatedCharacter.level || 1;
    const expectedSocialSkillPoints = characterLevel; // Level 1 = 1 point, Level 2 = 2 points, Level 3 = 3 points

    // Cập nhật skill points
    updatedCharacter.skillPoints.combat = expectedCombatSkillPoints;
    updatedCharacter.skillPoints.social = expectedSocialSkillPoints;

    console.log(`🔄 Recalculated skill points for ${updatedCharacter.name}:`);
    console.log(`  Combat Level ${combatLevel} → ${expectedCombatSkillPoints} combat skill points`);
    console.log(`  Character Level ${characterLevel} → ${expectedSocialSkillPoints} social skill points`);

    return updatedCharacter;
  }

  /**
   * Recalculate skill points cho tất cả saves trong localStorage
   * @returns Kết quả recalculate cho từng slot
   */
  public async recalculateAllSaves(): Promise<{
    success: boolean;
    results: Array<{
      slotId: string;
      success: boolean;
      characterName?: string;
      oldCombatPoints?: number;
      oldSocialPoints?: number;
      newCombatPoints?: number;
      newSocialPoints?: number;
      error?: string;
    }>;
  }> {
    const results: Array<{
      slotId: string;
      success: boolean;
      characterName?: string;
      oldCombatPoints?: number;
      oldSocialPoints?: number;
      newCombatPoints?: number;
      newSocialPoints?: number;
      error?: string;
    }> = [];

    const slots: ('slot1' | 'slot2' | 'slot3')[] = ['slot1', 'slot2', 'slot3'];

    for (const slotId of slots) {
      try {
        // Load save từ slot
        const loadResult = await saveGameService.loadGame(slotId);
        
        if (!loadResult.success || !loadResult.saveGame) {
          results.push({
            slotId,
            success: false,
            error: 'No save data found'
          });
          continue;
        }

        const saveData = loadResult.saveGame;
        const character = saveData.character;

        if (!character) {
          results.push({
            slotId,
            success: false,
            error: 'No character data found'
          });
          continue;
        }

        // Lưu skill points cũ để so sánh
        const oldCombatPoints = character.skillPoints?.combat || 0;
        const oldSocialPoints = character.skillPoints?.social || 0;

        // Recalculate skill points
        const updatedCharacter = this.recalculateSkillPoints(character);

        // Cập nhật save data
        saveData.character = updatedCharacter;

        // Save lại vào slot
        const saveResult = await saveGameService.saveGame(
          slotId,
          saveData.world,
          updatedCharacter,
          saveData.scenario,
          saveData.summary,
          saveData.sceneState,
          saveData.chat,
          saveData.turnCounter,
          saveData.worldTime,
          saveData.questSystem,
          saveData.ui,
          saveData.contentFlags,
          saveData.playerLocation,
          saveData.combatHistory,
          saveData.playerFledRandomCombat,
          saveData.merchantShops
        );

        if (saveResult.success) {
          results.push({
            slotId,
            success: true,
            characterName: character.name,
            oldCombatPoints,
            oldSocialPoints,
            newCombatPoints: updatedCharacter.skillPoints?.combat || 0,
            newSocialPoints: updatedCharacter.skillPoints?.social || 0
          });
        } else {
          results.push({
            slotId,
            success: false,
            characterName: character.name,
            error: saveResult.error || 'Failed to save updated character'
          });
        }

      } catch (error) {
        results.push({
          slotId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    console.log(`🎯 Skill point recalculation completed: ${successCount}/${totalCount} saves updated`);

    return {
      success: successCount > 0,
      results
    };
  }

  /**
   * Recalculate skill points cho character hiện tại (trong localStorage)
   * @returns Character đã được cập nhật
   */
  public recalculateCurrentCharacter(): Character | null {
    try {
      const currentCharacterData = localStorage.getItem('currentCharacter');
      if (!currentCharacterData) {
        console.log('No current character found in localStorage');
        return null;
      }

      const character = JSON.parse(currentCharacterData) as Character;
      const updatedCharacter = this.recalculateSkillPoints(character);

      // Lưu lại vào localStorage
      localStorage.setItem('currentCharacter', JSON.stringify(updatedCharacter));

      console.log('✅ Current character skill points recalculated and saved');
      return updatedCharacter;

    } catch (error) {
      console.error('❌ Error recalculating current character:', error);
      return null;
    }
  }

  /**
   * Kiểm tra xem character có cần recalculate không
   * @param character Character cần kiểm tra
   * @returns true nếu cần recalculate
   */
  public needsRecalculate(character: Character): boolean {
    const combatLevel = character.combatLevel || 1;
    const characterLevel = character.level || 1;
    
    const expectedCombatPoints = combatLevel - 1;
    const expectedSocialPoints = characterLevel - 1;
    
    const currentCombatPoints = character.skillPoints?.combat || 0;
    const currentSocialPoints = character.skillPoints?.social || 0;

    return currentCombatPoints !== expectedCombatPoints || currentSocialPoints !== expectedSocialPoints;
  }

  /**
   * Lấy thông tin skill points hiện tại vs expected
   * @param character Character cần kiểm tra
   * @returns Thông tin so sánh skill points
   */
  public getSkillPointComparison(character: Character): {
    combat: {
      current: number;
      expected: number;
      needsUpdate: boolean;
    };
    social: {
      current: number;
      expected: number;
      needsUpdate: boolean;
    };
    overallNeedsUpdate: boolean;
  } {
    const combatLevel = character.combatLevel || 1;
    const characterLevel = character.level || 1;
    
    const expectedCombatPoints = combatLevel - 1;
    const expectedSocialPoints = characterLevel - 1;
    
    const currentCombatPoints = character.skillPoints?.combat || 0;
    const currentSocialPoints = character.skillPoints?.social || 0;

    const combatNeedsUpdate = currentCombatPoints !== expectedCombatPoints;
    const socialNeedsUpdate = currentSocialPoints !== expectedSocialPoints;

    return {
      combat: {
        current: currentCombatPoints,
        expected: expectedCombatPoints,
        needsUpdate: combatNeedsUpdate
      },
      social: {
        current: currentSocialPoints,
        expected: expectedSocialPoints,
        needsUpdate: socialNeedsUpdate
      },
      overallNeedsUpdate: combatNeedsUpdate || socialNeedsUpdate
    };
  }
}

// Export singleton instance
export const skillPointRecalculateService = SkillPointRecalculateService.getInstance();
