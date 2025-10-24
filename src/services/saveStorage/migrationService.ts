import { SaveGame } from '../../types/saveGame';
import { WorldData, Character, ChatMessage, SCCSummary, SCCState, WorldTime } from '../../types';
import { LocalStore } from './localStore';
import { npcRelationshipService } from '../npcRelationshipService';
import { comfyUIService } from '../comfyUIService';

export class MigrationService {
  private localStore: LocalStore;

  constructor() {
    this.localStore = new LocalStore();
  }

  // Kiểm tra có dữ liệu cũ cần migrate không
  needsMigration(): boolean {
    return this.localStore.hasLegacyData();
  }

  // Thực hiện migration từ localStorage cũ sang slot1
  async migrateToSlot1(): Promise<SaveGame | null> {
    if (!this.needsMigration()) {
      return null;
    }

    try {

      const legacyData = this.localStore.getLegacyData();
      
      // Parse dữ liệu cũ
      const worldData: WorldData = legacyData['world_gen_result'] 
        ? JSON.parse(legacyData['world_gen_result']) 
        : null;
      
      const characterData: Character = legacyData['currentCharacter']
        ? JSON.parse(legacyData['currentCharacter'])
        : null;

      const scenarioData = legacyData['rp_scenario']
        ? JSON.parse(legacyData['rp_scenario'])
        : null;

      const chatData: ChatMessage[] = legacyData['rp_chat']
        ? JSON.parse(legacyData['rp_chat']).map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        : [];

      const turnCounter = legacyData['game_turn_counter']
        ? parseInt(legacyData['game_turn_counter'], 10)
        : 0;

      const sceneStateData: SCCState = legacyData['rp_scene_state']
        ? JSON.parse(legacyData['rp_scene_state'])
        : {};

      const summaryData: SCCSummary = legacyData['rp_summary']
        ? JSON.parse(legacyData['rp_summary'])
        : {
          recap: '',
          timeline: [],
          clues: [],
          openThreads: [],
          relationships: [],
          goals: [],
          risks: []
        };

      // Cập nhật sceneState vào summary
      summaryData.sceneState = sceneStateData;

      const questSystemData = legacyData['quest_system']
        ? JSON.parse(legacyData['quest_system'])
        : undefined;

      // Get current NPC relationship data
      const npcRelationshipData = npcRelationshipService.exportForSaveGame();

      // Get current merchant shops data
      const { merchantService } = await import('../merchantService');
      const merchantShopsData = merchantService.exportForSaveGame();

      // Tạo SaveGame từ dữ liệu cũ
      const saveGame: SaveGame = {
        version: '1.0.0',
        meta: {
          slotId: 'slot1',
          updatedAt: Date.now(),
          source: 'local',
          pendingSync: true,
          migrated: true
        },
        world: worldData,
        character: characterData ? this.migrateCharacterSkills(characterData) : characterData,
        scenario: scenarioData,
        summary: summaryData,
        sceneState: sceneStateData,
        chat: chatData,
        turnCounter: turnCounter,
        worldTime: worldData?.currentTime || {
          hour: 12,
          day: 1,
          month: 1,
          year: 1,
          dayOfWeek: 1
        },
        questSystem: questSystemData,
        npcRelationships: npcRelationshipData,
        merchantShops: merchantShopsData.shops
      };

      // Validate dữ liệu trước khi lưu
      if (!this.validateSaveGame(saveGame)) {
        throw new Error('Dữ liệu migration không hợp lệ');
      }

      // Lưu vào slot1
      await this.localStore.save('slot1', saveGame);

      // Xóa dữ liệu cũ
      this.localStore.clearLegacyData();

      return saveGame;

    } catch (error) {
      console.error('❌ Lỗi migration:', error);
      throw new Error(`Migration thất bại: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Validate SaveGame trước khi lưu
  private validateSaveGame(saveGame: SaveGame): boolean {
    try {
      // Kiểm tra các trường bắt buộc
      if (!saveGame.version || !saveGame.meta || !saveGame.meta.slotId) {
        console.error('SaveGame thiếu trường bắt buộc');
        return false;
      }

      // Kiểm tra slotId hợp lệ
      if (!['slot1', 'slot2', 'slot3'].includes(saveGame.meta.slotId)) {
        console.error('SlotId không hợp lệ:', saveGame.meta.slotId);
        return false;
      }

      // Kiểm tra dữ liệu world và character
      if (!saveGame.world || !saveGame.character) {
        console.error('Thiếu dữ liệu world hoặc character');
        return false;
      }

      // Kiểm tra chat array
      if (!Array.isArray(saveGame.chat)) {
        console.error('Chat không phải array');
        return false;
      }

      // Kiểm tra turnCounter
      if (typeof saveGame.turnCounter !== 'number' || saveGame.turnCounter < 0) {
        console.error('TurnCounter không hợp lệ:', saveGame.turnCounter);
        return false;
      }

      return true;

    } catch (error) {
      console.error('❌ Lỗi validation SaveGame:', error);
      return false;
    }
  }

  // Tạo SaveGame từ dữ liệu runtime hiện tại
  createSaveGameFromRuntime(
    worldData: WorldData,
    characterData: Character,
    scenarioData: any,
    summaryData: SCCSummary,
    sceneStateData: SCCState,
    chatData: ChatMessage[],
    turnCounter: number,
    worldTime: WorldTime,
    slotId: 'slot1' | 'slot2' | 'slot3' = 'slot1',
    questSystemData?: any,
    uiState?: any,
    contentFlags?: any,
    playerLocation?: any,
    combatHistory?: any,
    playerFledRandomCombat?: any,
    merchantShopsData?: any
  ): SaveGame {
    // Debug logging
    
    // Cập nhật sceneState vào summary
    const updatedSummary = {
      ...summaryData,
      sceneState: sceneStateData
    };

    // Get current NPC relationship data
    const npcRelationshipData = npcRelationshipService.exportForSaveGame();

    // Get ComfyUI settings
    const comfyUISettings = comfyUIService.getSettings();

    // Get generated images from chat messages
    const generatedImages = chatData
      .filter(msg => msg.imageUrl)
      .map(msg => msg.imageUrl!);

    const saveGame = {
      version: '4.1.0-beta',
      meta: {
        slotId,
        updatedAt: Date.now(),
        source: 'local' as const,
        pendingSync: true
      },
      world: worldData,
      character: characterData ? this.migrateCharacterSkills(characterData) : characterData,
      scenario: scenarioData,
      summary: updatedSummary,
      sceneState: sceneStateData,
      chat: chatData,
      turnCounter,
      worldTime,
      questSystem: questSystemData,
      npcRelationships: npcRelationshipData,
      ui: uiState,
      contentFlags: contentFlags,
      playerLocation: playerLocation,
      combatHistory: combatHistory,
      playerFledRandomCombat: playerFledRandomCombat,
      comfyUISettings: comfyUISettings,
      generatedImages: generatedImages,
      merchantShops: merchantShopsData?.shops || {}
    };
    
    return saveGame;
  }

  // Export SaveGame thành JSON string
  exportSaveGame(saveGame: SaveGame): string {
    return JSON.stringify(saveGame, null, 2);
  }

  // Import SaveGame từ JSON string
  importSaveGame(jsonString: string): SaveGame {
    try {
      const saveGame: SaveGame = JSON.parse(jsonString);
      
      if (!this.validateSaveGame(saveGame)) {
        throw new Error('SaveGame không hợp lệ');
      }

      return saveGame;
    } catch (error) {
      throw new Error(`Lỗi import SaveGame: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Migrate proficiencies to skills for character data
  migrateProficienciesToSkills(character: Character): Character {
    if (!character.proficiencies || character.proficiencies.length === 0) {
      // If no proficiencies, create default skills
      character.skills = [
        {
          id: 'skill_damage_default',
          name: 'Tấn Công Cơ Bản',
          description: 'Kỹ năng tấn công cơ bản',
          level: 1,
          skillType: 'damage',
          effects: ['instant_damage:1d6+2', 'stat_buff:strength:+1:self:2turns'],
          cooldown: 3,
          currentCooldown: 0,
          icon: '⚔️',
          requiresTarget: true
        },
        {
          id: 'skill_healing_default',
          name: 'Hồi Phục',
          description: 'Kỹ năng hồi phục cơ bản',
          level: 1,
          skillType: 'healing',
          effects: ['instant_heal:1d6+2', 'stat_buff:constitution:+1:self:2turns'],
          cooldown: 3,
          currentCooldown: 0,
          icon: '💚',
          requiresTarget: false
        },
        {
          id: 'skill_social_default',
          name: 'Giao Tiếp',
          description: 'Kỹ năng giao tiếp cơ bản',
          level: 1,
          skillType: 'social',
          effects: ['stat_buff:charisma:+2:self:3turns', 'stat_buff:wisdom:+1:self:3turns'],
          cooldown: 0,
          currentCooldown: 0,
          icon: '💬',
          requiresTarget: false
        }
      ];
      return character;
    }

    // Convert proficiencies to skills
    const skills = character.proficiencies.map((prof, index) => {
      // Determine skill type based on name or description
      let skillType: 'damage' | 'healing' | 'social' = 'damage';
      let effects: string[] = ['instant_damage:1d4', 'stat_buff:strength:+1:self:2turns'];
      let icon = '⚔️';
      let cooldown = 3;
      let requiresTarget = true;

      const name = prof.name.toLowerCase();
      const description = prof.description?.toLowerCase() || '';

      if (name.includes('heal') || name.includes('hồi') || name.includes('phục') || 
          description.includes('heal') || description.includes('hồi') || description.includes('phục')) {
        skillType = 'healing';
        effects = ['instant_heal:1d4:+1', 'stat_buff:constitution:+1:self:2turns'];
        icon = '💚';
        cooldown = 3;
        requiresTarget = false;
      } else if (name.includes('social') || name.includes('giao') || name.includes('thuyết') || 
                 description.includes('social') || description.includes('giao') || description.includes('thuyết')) {
        skillType = 'social';
        effects = ['stat_buff:charisma:+2:self:3turns', 'stat_buff:wisdom:+1:self:3turns'];
        icon = '💬';
        cooldown = 0;
        requiresTarget = false;
      } else if (name.includes('damage') || name.includes('tấn') || name.includes('công') || 
                 description.includes('damage') || description.includes('tấn') || description.includes('công')) {
        skillType = 'damage';
        effects = ['instant_damage:1d4', 'stat_buff:strength:+1:self:2turns'];
        icon = '⚔️';
        cooldown = 3;
        requiresTarget = true;
      }

      return {
        id: `skill_${skillType}_${index + 1}`,
        name: prof.name,
        description: prof.description || 'Kỹ năng đặc biệt',
        level: prof.level || 1,
        skillType,
        effects,
        cooldown,
        currentCooldown: 0,
        icon,
        requiresTarget
      };
    });

    // Ensure we have exactly 3 skills
    while (skills.length < 3) {
      const skillTypes = skills.map(s => s.skillType);
      let newSkillType: 'damage' | 'healing' | 'social' = 'damage';
      
      if (!skillTypes.includes('damage')) {
        newSkillType = 'damage';
      } else if (!skillTypes.includes('healing')) {
        newSkillType = 'healing';
      } else if (!skillTypes.includes('social')) {
        newSkillType = 'social';
      }

      const defaultSkills = {
        damage: {
          id: `skill_damage_${skills.length + 1}`,
          name: 'Tấn Công Cơ Bản',
          description: 'Kỹ năng tấn công cơ bản',
          level: 1,
          skillType: 'damage' as const,
          effects: ['instant_damage:1d4', 'stat_buff:strength:+1:self:2turns'],
          cooldown: 3,
          currentCooldown: 0,
          icon: '⚔️',
          requiresTarget: true
        },
        healing: {
          id: `skill_healing_${skills.length + 1}`,
          name: 'Hồi Phục',
          description: 'Kỹ năng hồi phục cơ bản',
          level: 1,
          skillType: 'healing' as const,
          effects: ['instant_heal:1d4:+1', 'stat_buff:constitution:+1:self:2turns'],
          cooldown: 3,
          currentCooldown: 0,
          icon: '💚',
          requiresTarget: false
        },
        social: {
          id: `skill_social_${skills.length + 1}`,
          name: 'Giao Tiếp',
          description: 'Kỹ năng giao tiếp cơ bản',
          level: 1,
          skillType: 'social' as const,
          effects: ['stat_buff:charisma:+2:self:3turns', 'stat_buff:wisdom:+1:self:3turns'],
          cooldown: 0,
          currentCooldown: 0,
          icon: '💬',
          requiresTarget: false
        }
      };

      skills.push(defaultSkills[newSkillType]);
    }

    // Limit to 3 skills
    character.skills = skills.slice(0, 3);
    
    // Keep proficiencies for backward compatibility but mark as legacy
    character.proficiencies = character.proficiencies.map(prof => ({
      ...prof,
      legacy: true
    }));

    return character;
  }

  // Migrate character data to include skills
  migrateCharacterSkills(character: Character): Character {
    // If character already has skills, return as is
    if (character.skills && character.skills.length > 0) {
      return character;
    }

    // Create default skills if no proficiencies exist
    if (!character.proficiencies || character.proficiencies.length === 0) {
      character.skills = [
        {
          id: 'skill_damage_default',
          name: 'Đòn Tấn Công Mạnh',
          description: 'Tấn công với sức mạnh toàn bộ',
          level: 1,
          skillType: 'damage',
          effects: ['instant_damage:1d6+2', 'stat_buff:strength:+1:self:2turns'],
          cooldown: 2,
          currentCooldown: 0,
          icon: '⚔️',
          requiresTarget: true
        },
        {
          id: 'skill_healing_default',
          name: 'Phòng Thủ Kiên Cố',
          description: 'Tập trung phòng thủ',
          level: 1,
          skillType: 'healing',
          effects: ['defend', 'stat_buff:constitution:+2:self:2turns'],
          cooldown: 3,
          currentCooldown: 0,
          icon: '🛡️',
          requiresTarget: false
        },
        {
          id: 'skill_social_default',
          name: 'Khích Lệ',
          description: 'Tăng sức mạnh bản thân',
          level: 1,
          skillType: 'social',
          effects: ['stat_buff:charisma:+2:self:3turns', 'stat_buff:wisdom:+1:self:3turns'],
          cooldown: 4,
          currentCooldown: 0,
          icon: '💬',
          requiresTarget: false
        }
      ];
      return character;
    }

    // Migrate proficiencies to skills
    return this.migrateProficienciesToSkills(character);
  }
}

// Singleton instance
export const migrationService = new MigrationService();
