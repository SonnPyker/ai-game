import { SaveGame } from '../../types/saveGame';
import { WorldData, Character, ChatMessage, SCCSummary, SCCState, WorldTime } from '../../types';
import { LocalStore } from './localStore';
import { npcRelationshipService } from '../npcRelationshipService';

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
      console.log('Không có dữ liệu cũ cần migrate');
      return null;
    }

    try {
      console.log('🔄 Bắt đầu migration từ localStorage cũ...');

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
        character: characterData,
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
        npcRelationships: npcRelationshipData
      };

      // Validate dữ liệu trước khi lưu
      if (!this.validateSaveGame(saveGame)) {
        throw new Error('Dữ liệu migration không hợp lệ');
      }

      // Lưu vào slot1
      await this.localStore.save('slot1', saveGame);

      // Xóa dữ liệu cũ
      this.localStore.clearLegacyData();

      console.log('✅ Migration hoàn thành - dữ liệu đã chuyển vào slot1');
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

      console.log('✅ SaveGame validation thành công');
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
    contentFlags?: any
  ): SaveGame {
    // Cập nhật sceneState vào summary
    const updatedSummary = {
      ...summaryData,
      sceneState: sceneStateData
    };

    // Get current NPC relationship data
    const npcRelationshipData = npcRelationshipService.exportForSaveGame();

    return {
      version: '1.0.0',
      meta: {
        slotId,
        updatedAt: Date.now(),
        source: 'local',
        pendingSync: true
      },
      world: worldData,
      character: characterData,
      scenario: scenarioData,
      summary: updatedSummary,
      sceneState: sceneStateData,
      chat: chatData,
      turnCounter,
      worldTime,
      questSystem: questSystemData,
      npcRelationships: npcRelationshipData,
      ui: uiState,
      contentFlags: contentFlags
    };
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
}

// Singleton instance
export const migrationService = new MigrationService();
