import { SaveSlot, SaveResult, LoadResult, SyncStatus } from '../../types/saveGame';
import { WorldData, Character, ChatMessage, SCCSummary, SCCState, WorldTime } from '../../types';
import { saveStorageFactory } from './saveStorageFactory';
import { migrationService } from './migrationService';

export class SaveGameService {
  private currentAdapter: any = null;
  private isInitialized: boolean = false;

  // Khởi tạo service
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Kiểm tra migration trước
      if (migrationService.needsMigration()) {
        console.log('🔄 Phát hiện dữ liệu cũ, thực hiện migration...');
        await migrationService.migrateToSlot1();
      }

      // Lấy adapter phù hợp
      this.currentAdapter = await saveStorageFactory.getAdapter();
      this.isInitialized = true;

      console.log('✅ SaveGameService đã khởi tạo');
    } catch (error) {
      console.error('❌ Lỗi khởi tạo SaveGameService:', error);
      throw error;
    }
  }

  // Lưu game vào slot
  async saveGame(
    slotId: 'slot1' | 'slot2' | 'slot3',
    worldData: WorldData,
    characterData: Character,
    scenarioData: any,
    summaryData: SCCSummary,
    sceneStateData: SCCState,
    chatData: ChatMessage[],
    turnCounter: number,
    worldTime: WorldTime,
    questSystemData?: any,
    uiState?: any,
    contentFlags?: any,
    playerLocation?: any,
    combatHistory?: any
  ): Promise<SaveResult> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Tạo SaveGame từ dữ liệu runtime
      const saveGame = migrationService.createSaveGameFromRuntime(
        worldData,
        characterData,
        scenarioData,
        summaryData,
        sceneStateData,
        chatData,
        turnCounter,
        worldTime,
        slotId,
        questSystemData,
        uiState,
        contentFlags,
        playerLocation,
        combatHistory
      );

      // Lưu vào storage
      await this.currentAdapter.save(slotId, saveGame);

      const result: SaveResult = {
        success: true,
        slotId,
        source: saveGame.meta.source,
        pendingSync: saveGame.meta.pendingSync
      };

      console.log(`✅ Đã lưu game vào ${slotId} (${saveGame.meta.source})`);
      return result;

    } catch (error) {
      console.error(`❌ Lỗi lưu game vào ${slotId}:`, error);
      return {
        success: false,
        slotId,
        source: 'local',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Tải game từ slot
  async loadGame(slotId: 'slot1' | 'slot2' | 'slot3'): Promise<LoadResult> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const saveGame = await this.currentAdapter.load(slotId);

      if (!saveGame) {
        return {
          success: false,
          error: `Slot ${slotId} trống`
        };
      }

      const result: LoadResult = {
        success: true,
        saveGame,
        source: saveGame.meta.source
      };

      console.log(`✅ Đã tải game từ ${slotId} (${saveGame.meta.source})`);
      return result;

    } catch (error) {
      console.error(`❌ Lỗi tải game từ ${slotId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Liệt kê tất cả slot
  async listSlots(): Promise<SaveSlot[]> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      return await this.currentAdapter.list();
    } catch (error) {
      console.error('❌ Lỗi liệt kê slot:', error);
      return [];
    }
  }

  // Xóa slot
  async deleteSlot(slotId: 'slot1' | 'slot2' | 'slot3'): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      await this.currentAdapter.remove(slotId);
      console.log(`✅ Đã xóa slot ${slotId}`);
      return true;
    } catch (error) {
      console.error(`❌ Lỗi xóa slot ${slotId}:`, error);
      return false;
    }
  }

  // Export game thành file JSON
  async exportGame(slotId: 'slot1' | 'slot2' | 'slot3'): Promise<string | null> {
    try {
      const loadResult = await this.loadGame(slotId);
      
      if (!loadResult.success || !loadResult.saveGame) {
        return null;
      }

      return migrationService.exportSaveGame(loadResult.saveGame);
    } catch (error) {
      console.error(`❌ Lỗi export game từ ${slotId}:`, error);
      return null;
    }
  }

  // Import game từ file JSON
  async importGame(jsonString: string, targetSlotId: 'slot1' | 'slot2' | 'slot3'): Promise<boolean> {
    try {
      const saveGame = migrationService.importSaveGame(jsonString);
      
      // Cập nhật slotId
      saveGame.meta.slotId = targetSlotId;
      saveGame.meta.updatedAt = Date.now();
      saveGame.meta.source = 'local';
      saveGame.meta.pendingSync = true;

      await this.currentAdapter.save(targetSlotId, saveGame);
      console.log(`✅ Đã import game vào ${targetSlotId}`);
      return true;
    } catch (error) {
      console.error(`❌ Lỗi import game vào ${targetSlotId}:`, error);
      return false;
    }
  }

  // Kiểm tra sync status
  async getSyncStatus(): Promise<SyncStatus> {
    try {
      const slots = await this.listSlots();
      const hasLocalChanges = slots.some(slot => slot.pendingSync);
      
      return {
        hasLocalChanges,
        hasCloudChanges: false, // Sẽ implement sau
        lastLocalUpdate: Math.max(...slots.map(slot => slot.lastUpdated || 0)),
        conflictResolution: 'local' // Mặc định ưu tiên local
      };
    } catch (error) {
      console.error('❌ Lỗi kiểm tra sync status:', error);
      return {
        hasLocalChanges: false,
        hasCloudChanges: false
      };
    }
  }

  // Kiểm tra có thay đổi chưa lưu không
  hasUnsavedChanges(
    _currentWorldData: WorldData,
    _currentCharacterData: Character,
    _currentChatData: ChatMessage[],
    _currentTurnCounter: number
  ): boolean {
    // Logic kiểm tra thay đổi sẽ được implement sau
    // Hiện tại return false để không block save
    return false;
  }

  // Lấy adapter hiện tại
  getCurrentAdapter(): any {
    return this.currentAdapter;
  }

  // Kiểm tra service đã khởi tạo chưa
  isServiceInitialized(): boolean {
    return this.isInitialized;
  }
}

// Singleton instance
export const saveGameService = new SaveGameService();
