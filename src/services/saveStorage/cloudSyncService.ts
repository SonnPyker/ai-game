import { SaveGame, SaveSlot } from '../../types/saveGame';
import { SupabaseStore } from './supabaseStore';
import { LocalStorageStore } from './localStorageStore';
import { authService } from './authService';

export interface CloudSyncResult {
  success: boolean;
  action: 'push' | 'pull' | 'delete';
  slotId: string;
  error?: string;
}

export interface ConflictInfo {
  slotId: 'slot1' | 'slot2' | 'slot3';
  localUpdatedAt: number;
  cloudUpdatedAt: number;
  hasConflict: boolean;
}

export class CloudSyncService {
  private supabaseStore: SupabaseStore;
  private localStorageStore: LocalStorageStore;

  constructor() {
    this.supabaseStore = new SupabaseStore();
    this.localStorageStore = new LocalStorageStore();
  }

  // Check if cloud sync is available
  async isCloudSyncAvailable(): Promise<boolean> {
    return authService.isAuthenticated() && await this.supabaseStore.isAvailable();
  }

  // Push local slot to cloud
  async pushToCloud(slotId: 'slot1' | 'slot2' | 'slot3'): Promise<CloudSyncResult> {
    try {
      if (!(await this.isCloudSyncAvailable())) {
        return {
          success: false,
          action: 'push',
          slotId,
          error: 'Không thể đồng bộ: Chưa đăng nhập hoặc không online'
        };
      }

      // Get local save
      const localSave = await this.localStorageStore.load(slotId);
      if (!localSave) {
        return {
          success: false,
          action: 'push',
          slotId,
          error: 'Slot local không có dữ liệu'
        };
      }

      // Update metadata for cloud
      const cloudSave: SaveGame = {
        ...localSave,
        meta: {
          ...localSave.meta,
          source: 'cloud' as const,
          pendingSync: false
        }
      };

      // Save to cloud
      await this.supabaseStore.save(slotId, cloudSave);
      
      // Update local metadata to mark as synced
      const updatedLocalSave: SaveGame = {
        ...localSave,
        meta: {
          ...localSave.meta,
          pendingSync: false
        }
      };
      await this.localStorageStore.save(slotId, updatedLocalSave);

      return {
        success: true,
        action: 'push',
        slotId
      };
    } catch (error) {
      return {
        success: false,
        action: 'push',
        slotId,
        error: error instanceof Error ? error.message : 'Lỗi không xác định'
      };
    }
  }

  // Pull cloud slot to local
  async pullFromCloud(slotId: 'slot1' | 'slot2' | 'slot3'): Promise<CloudSyncResult> {
    try {
      if (!(await this.isCloudSyncAvailable())) {
        return {
          success: false,
          action: 'pull',
          slotId,
          error: 'Không thể đồng bộ: Chưa đăng nhập hoặc không online'
        };
      }

      // Get cloud save
      const cloudSave = await this.supabaseStore.load(slotId);
      if (!cloudSave) {
        return {
          success: false,
          action: 'pull',
          slotId,
          error: 'Slot cloud không có dữ liệu'
        };
      }

      // Update metadata for local
      const localSave: SaveGame = {
        ...cloudSave,
        meta: {
          ...cloudSave.meta,
          slotId,
          source: 'local' as const,
          pendingSync: false
        }
      };

      // Save to local
      await this.localStorageStore.save(slotId, localSave);
      
      return {
        success: true,
        action: 'pull',
        slotId
      };
    } catch (error) {
      return {
        success: false,
        action: 'pull',
        slotId,
        error: error instanceof Error ? error.message : 'Lỗi không xác định'
      };
    }
  }

  // Check for conflicts between local and cloud
  async checkConflicts(): Promise<ConflictInfo[]> {
    const conflicts: ConflictInfo[] = [];

    try {
      if (!(await this.isCloudSyncAvailable())) {
        return conflicts;
      }

      for (const slotId of ['slot1', 'slot2', 'slot3'] as const) {
        const localSave = await this.localStorageStore.load(slotId);
        const cloudSave = await this.supabaseStore.load(slotId);

        if (localSave && cloudSave) {
          const localUpdatedAt = localSave.meta.updatedAt;
          const cloudUpdatedAt = cloudSave.meta.updatedAt;
          const timeDiff = Math.abs(localUpdatedAt - cloudUpdatedAt);
          
          // Check if this is an intentional "keep both" conflict
          const isIntentionalConflict = localSave.meta.source === 'local' && cloudSave.meta.source === 'cloud';
          
          // Consider conflict if time difference is more than 1 minute AND not intentional
          const hasConflict = timeDiff > 60000 && !isIntentionalConflict;

          conflicts.push({
            slotId,
            localUpdatedAt,
            cloudUpdatedAt,
            hasConflict
          });
        }
      }

      return conflicts;
    } catch (error) {
      console.error('Lỗi kiểm tra xung đột:', error);
      return conflicts;
    }
  }

  // Resolve conflict by choosing local, cloud, or both
  async resolveConflict(
    slotId: 'slot1' | 'slot2' | 'slot3',
    choose: 'local' | 'cloud' | 'both'
  ): Promise<CloudSyncResult> {
    try {
      if (!(await this.isCloudSyncAvailable())) {
        return {
          success: false,
          action: 'push',
          slotId,
          error: 'Không thể đồng bộ: Chưa đăng nhập hoặc không online'
        };
      }

      if (choose === 'local') {
        // Push local to cloud
        return await this.pushToCloud(slotId);
      } else if (choose === 'cloud') {
        // Pull cloud to local
        return await this.pullFromCloud(slotId);
      } else if (choose === 'both') {
        // Keep both - no action needed, just clear conflict
        return {
          success: true,
          action: 'push',
          slotId
        };
      }
      
      return {
        success: false,
        action: 'push',
        slotId,
        error: 'Tùy chọn không hợp lệ'
      };
    } catch (error) {
      return {
        success: false,
        action: 'push',
        slotId,
        error: error instanceof Error ? error.message : 'Lỗi không xác định'
      };
    }
  }

  // Save directly to cloud
  async saveToCloud(slotId: 'slot1' | 'slot2' | 'slot3', saveGame: SaveGame): Promise<CloudSyncResult> {
    try {
      if (!(await this.isCloudSyncAvailable())) {
        return {
          success: false,
          action: 'push',
          slotId,
          error: 'Không thể lưu lên cloud: Chưa đăng nhập hoặc không online'
        };
      }

      // Update SaveGame metadata for cloud
      const cloudSaveGame: SaveGame = {
        ...saveGame,
        meta: {
          ...saveGame.meta,
          slotId,
          source: 'cloud',
          pendingSync: false
        }
      };

      // Save to cloud
      await this.supabaseStore.save(slotId, cloudSaveGame);

      return {
        success: true,
        action: 'push',
        slotId
      };
    } catch (error) {
      return {
        success: false,
        action: 'push',
        slotId,
        error: error instanceof Error ? error.message : 'Lỗi không xác định'
      };
    }
  }

  // Get cloud slots info
  async getCloudSlots(): Promise<SaveSlot[]> {
    try {
      if (!(await this.isCloudSyncAvailable())) {
        return [];
      }

      return await this.supabaseStore.list();
    } catch (error) {
      console.error('Lỗi lấy cloud slots:', error);
      return [];
    }
  }

  // Sync all slots (push all local to cloud)
  async syncAllToCloud(): Promise<CloudSyncResult[]> {
    const results: CloudSyncResult[] = [];

    try {
      if (!(await this.isCloudSyncAvailable())) {
        return [{
          success: false,
          action: 'push',
          slotId: 'slot1',
          error: 'Không thể đồng bộ: Chưa đăng nhập hoặc không online'
        }];
      }

      for (const slotId of ['slot1', 'slot2', 'slot3'] as const) {
        const localSave = await this.localStorageStore.load(slotId);
        if (localSave) {
          const result = await this.pushToCloud(slotId);
          results.push(result);
        }
      }

      return results;
    } catch (error) {
      console.error('Lỗi sync all to cloud:', error);
      return [{
        success: false,
        action: 'push',
        slotId: 'slot1',
        error: error instanceof Error ? error.message : 'Lỗi không xác định'
      }];
    }
  }

  // Load from cloud
  async loadFromCloud(slotId: 'slot1' | 'slot2' | 'slot3'): Promise<{ success: boolean; saveGame?: SaveGame; error?: string }> {
    try {
      if (!(await this.isCloudSyncAvailable())) {
        return {
          success: false,
          error: 'Không thể tải: Chưa đăng nhập hoặc không online'
        };
      }

      const saveGame = await this.supabaseStore.load(slotId);
      if (saveGame) {
        console.log(`✓ Đã tải slot ${slotId} từ cloud`);
        return {
          success: true,
          saveGame
        };
      } else {
        return {
          success: false,
          error: 'Không tìm thấy dữ liệu trong cloud'
        };
      }
    } catch (error) {
      console.error('Lỗi tải từ cloud:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Lỗi không xác định'
      };
    }
  }

  // Delete from cloud
  async deleteFromCloud(slotId: 'slot1' | 'slot2' | 'slot3'): Promise<CloudSyncResult> {
    try {
      if (!(await this.isCloudSyncAvailable())) {
        return {
          success: false,
          action: 'delete',
          slotId,
          error: 'Không thể xóa: Chưa đăng nhập hoặc không online'
        };
      }

      await this.supabaseStore.remove(slotId);
      console.log(`✓ Đã xóa slot ${slotId} từ cloud`);
      
      return {
        success: true,
        action: 'delete',
        slotId
      };
    } catch (error) {
      console.error('Lỗi xóa từ cloud:', error);
      return {
        success: false,
        action: 'delete',
        slotId,
        error: error instanceof Error ? error.message : 'Lỗi không xác định'
      };
    }
  }
}

// Export singleton instance
export const cloudSyncService = new CloudSyncService();
