import { SaveStorageAdapter, SaveGame, SaveSlot } from '../../types/saveGame';

export class LocalStore implements SaveStorageAdapter {
  private readonly STORAGE_PREFIX = 'save_slot_';

  async isAvailable(): Promise<boolean> {
    try {
      // Kiểm tra localStorage có khả dụng không
      const testKey = 'test_localStorage';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      console.warn('LocalStorage không khả dụng:', error);
      return false;
    }
  }

  async save(slotId: 'slot1' | 'slot2' | 'slot3' | 'local1' | 'local2' | 'local3', saveGame: SaveGame): Promise<void> {
    if (slotId.startsWith('slot')) {
      throw new Error('LocalStore chỉ hỗ trợ local slots (local1, local2, local3)');
    }
    try {
      // Cập nhật metadata
      const updatedSaveGame: SaveGame = {
        ...saveGame,
        meta: {
          ...saveGame.meta,
          slotId,
          updatedAt: Date.now(),
          source: 'local' as const,
          pendingSync: true // Đánh dấu cần sync
        }
      };

      // Lưu vào localStorage
      const storageKey = `${this.STORAGE_PREFIX}${slotId}`;
      localStorage.setItem(storageKey, JSON.stringify(updatedSaveGame));

      console.log(`✅ Đã lưu game vào slot ${slotId} trên local`);
    } catch (error) {
      console.error('Lỗi lưu LocalStorage:', error);
      throw new Error(`Lỗi lưu local: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async load(slotId: 'slot1' | 'slot2' | 'slot3' | 'local1' | 'local2' | 'local3'): Promise<SaveGame | null> {
    if (slotId.startsWith('slot')) {
      throw new Error('LocalStore chỉ hỗ trợ local slots (local1, local2, local3)');
    }
    try {
      const storageKey = `${this.STORAGE_PREFIX}${slotId}`;
      const data = localStorage.getItem(storageKey);

      if (!data) {
        return null;
      }

      const saveGame: SaveGame = JSON.parse(data);
      
      // Cập nhật metadata để phản ánh nguồn local
      saveGame.meta = {
        ...saveGame.meta,
        source: 'local'
      };

      console.log(`✅ Đã tải game từ slot ${slotId} trên local`);
      return saveGame;
    } catch (error) {
      console.error('Lỗi tải LocalStorage:', error);
      throw new Error(`Lỗi tải local: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async list(): Promise<SaveSlot[]> {
    try {
      // Tạo array cho 3 slot
      const slots: SaveSlot[] = [
        { slotId: 'slot1', isEmpty: true },
        { slotId: 'slot2', isEmpty: true },
        { slotId: 'slot3', isEmpty: true }
      ];

      // Kiểm tra từng slot
      for (let i = 1; i <= 3; i++) {
        const slotId = `slot${i}` as 'slot1' | 'slot2' | 'slot3';
        const storageKey = `${this.STORAGE_PREFIX}${slotId}`;
        const data = localStorage.getItem(storageKey);

        if (data) {
          try {
            const saveGame: SaveGame = JSON.parse(data);
            slots[i - 1] = {
              slotId,
              isEmpty: false,
              saveGame,
              lastUpdated: saveGame.meta.updatedAt,
              source: 'local',
              pendingSync: saveGame.meta.pendingSync
            };
          } catch (parseError) {
            console.warn(`Lỗi parse slot ${slotId}:`, parseError);
            // Slot bị lỗi, giữ nguyên isEmpty = true
          }
        }
      }

      return slots;
    } catch (error) {
      console.error('Lỗi liệt kê LocalStorage:', error);
      throw new Error(`Lỗi liệt kê local: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async remove(slotId: 'slot1' | 'slot2' | 'slot3' | 'local1' | 'local2' | 'local3'): Promise<void> {
    if (slotId.startsWith('slot')) {
      throw new Error('LocalStore chỉ hỗ trợ local slots (local1, local2, local3)');
    }
    try {
      const storageKey = `${this.STORAGE_PREFIX}${slotId}`;
      localStorage.removeItem(storageKey);

      console.log(`✅ Đã xóa slot ${slotId} trên local`);
    } catch (error) {
      console.error('Lỗi xóa LocalStorage:', error);
      throw new Error(`Lỗi xóa local: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Helper method để kiểm tra có dữ liệu cũ cần migrate không
  hasLegacyData(): boolean {
    const legacyKeys = [
      'world_gen_result',
      'currentCharacter',
      'rp_scenario',
      'rp_chat',
      'game_turn_counter',
      'rp_summary',
      'rp_scene_state',
      'rp_summary_indexed'
    ];

    return legacyKeys.some(key => localStorage.getItem(key) !== null);
  }

  // Helper method để lấy dữ liệu cũ cho migration
  getLegacyData(): Record<string, string | null> {
    const legacyKeys = [
      'world_gen_result',
      'currentCharacter', 
      'rp_scenario',
      'rp_chat',
      'game_turn_counter',
      'rp_summary',
      'rp_scene_state',
      'rp_summary_indexed',
      'quest_system'
    ];

    const legacyData: Record<string, string | null> = {};
    legacyKeys.forEach(key => {
      legacyData[key] = localStorage.getItem(key);
    });

    return legacyData;
  }

  // Helper method để xóa dữ liệu cũ sau khi migrate
  clearLegacyData(): void {
    const legacyKeys = [
      'world_gen_result',
      'currentCharacter',
      'rp_scenario', 
      'rp_chat',
      'game_turn_counter',
      'rp_summary',
      'rp_scene_state',
      'rp_summary_indexed'
    ];

    legacyKeys.forEach(key => {
      localStorage.removeItem(key);
    });

    console.log('✅ Đã xóa dữ liệu localStorage cũ');
  }
}
