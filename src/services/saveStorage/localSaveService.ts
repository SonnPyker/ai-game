import { SaveGame, SaveSlot } from '../../types/saveGame';
import { LocalStorageStore } from './localStorageStore';
import { npcRelationshipService } from '../npcRelationshipService';

export interface SaveResult {
  success: boolean;
  slotId: string;
  source: 'local';
  error?: string;
}

export interface LoadResult {
  success: boolean;
  saveGame?: SaveGame;
  source: 'local';
  error?: string;
}

export interface ExportResult {
  success: boolean;
  data?: string;
  filename?: string;
  error?: string;
}

export interface ImportResult {
  success: boolean;
  slotId?: string;
  error?: string;
}

export class LocalSaveService {
  private localStorageStore: LocalStorageStore;

  constructor() {
    this.localStorageStore = new LocalStorageStore();
  }

  // Save game to local slot
  async saveGame(
    slotId: 'slot1' | 'slot2' | 'slot3',
    worldData: any,
    characterData: any,
    scenarioData: any,
    summaryData: any,
    sceneStateData: any,
    chatData: any[],
    turnCounter: number,
    worldTime: any,
    questSystemData?: any,
    uiState?: any,
    contentFlags?: any,
    actionSuggestions?: any,
    actionLog?: any,
    playerLocation?: any,
    combatHistory?: any
  ): Promise<SaveResult> {
    try {
      // Cập nhật sceneState vào summary
      const updatedSummary = {
        ...summaryData,
        sceneState: sceneStateData
      };

      // Get current NPC relationship data
      const npcRelationshipData = npcRelationshipService.exportForSaveGame();

      // Create SaveGame object
      const saveGame: SaveGame = {
        version: '4.1.0-beta',
        meta: {
          slotId,
          updatedAt: Date.now(),
          source: 'local' as const,
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
        contentFlags: contentFlags,
        actionSuggestions: actionSuggestions,
        actionLog: actionLog,
        playerLocation: playerLocation,
        combatHistory: combatHistory
      };

      await this.localStorageStore.save(slotId, saveGame);
      
      return {
        success: true,
        slotId,
        source: 'local'
      };
    } catch (error) {
      return {
        success: false,
        slotId,
        source: 'local',
        error: error instanceof Error ? error.message : 'Lỗi không xác định'
      };
    }
  }

  // Load game from local slot
  async loadGame(slotId: 'slot1' | 'slot2' | 'slot3' | 'local1' | 'local2' | 'local3'): Promise<LoadResult> {
    try {
      const saveGame = await this.localStorageStore.load(slotId);
      
      if (saveGame) {
        return {
          success: true,
          saveGame,
          source: 'local'
        };
      } else {
        return {
          success: false,
          source: 'local',
          error: 'Slot không có dữ liệu'
        };
      }
    } catch (error) {
      return {
        success: false,
        source: 'local',
        error: error instanceof Error ? error.message : 'Lỗi không xác định'
      };
    }
  }

  // List all slots
  async listSlots(): Promise<SaveSlot[]> {
    try {
      return await this.localStorageStore.list();
    } catch (error) {
      console.error('Lỗi liệt kê slot:', error);
      return [];
    }
  }

  // Delete slot
  async deleteSlot(slotId: 'slot1' | 'slot2' | 'slot3' | 'local1' | 'local2' | 'local3'): Promise<boolean> {
    try {
      await this.localStorageStore.remove(slotId);
      return true;
    } catch (error) {
      console.error(`Lỗi xóa slot ${slotId}:`, error);
      return false;
    }
  }

  // Export slot to JSON file
  async exportSlot(slotId: 'slot1' | 'slot2' | 'slot3' | 'local1' | 'local2' | 'local3'): Promise<ExportResult> {
    try {
      const jsonString = await this.localStorageStore.export(slotId);
      
      if (!jsonString) {
        return {
          success: false,
          error: 'Slot không có dữ liệu để export'
        };
      }

      // Create filename
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `save_${slotId}_${timestamp}.json`;

      return {
        success: true,
        data: jsonString,
        filename
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Lỗi không xác định'
      };
    }
  }

  // Import JSON file to slot
  async importSlot(slotId: 'slot1' | 'slot2' | 'slot3' | 'local1' | 'local2' | 'local3', jsonString: string): Promise<ImportResult> {
    try {
      const success = await this.localStorageStore.import(slotId, jsonString);
      
      if (success) {
        return {
          success: true,
          slotId
        };
      } else {
        return {
          success: false,
          error: 'Không thể import dữ liệu'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Lỗi không xác định'
      };
    }
  }

  // Get storage info
  getStorageInfo() {
    return this.localStorageStore.getStorageInfo();
  }

  // Check if slot has data
  async hasSlotData(slotId: 'slot1' | 'slot2' | 'slot3'): Promise<boolean> {
    try {
      const saveGame = await this.localStorageStore.load(slotId);
      return saveGame !== null;
    } catch {
      return false;
    }
  }

  // Get slot last updated time
  async getSlotUpdatedAt(slotId: 'slot1' | 'slot2' | 'slot3'): Promise<number | null> {
    try {
      const saveGame = await this.localStorageStore.load(slotId);
      return saveGame?.meta.updatedAt || null;
    } catch {
      return null;
    }
  }
}

// Export singleton instance
export const localSaveService = new LocalSaveService();
