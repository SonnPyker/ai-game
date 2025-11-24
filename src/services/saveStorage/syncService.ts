import { SaveGame, SaveSlot, SyncStatus, ConflictResolution } from '../../types/saveGame';
import { saveStorageFactory } from './saveStorageFactory';
import { SupabaseStore } from './supabaseStore';
import { LocalStore } from './localStore';

export interface SyncResult {
  success: boolean;
  syncedSlots: string[];
  conflicts: ConflictInfo[];
  errors: string[];
}

export interface ConflictInfo {
  slotId: 'slot1' | 'slot2' | 'slot3' | 'local1' | 'local2' | 'local3';
  localSave?: SaveGame;
  cloudSave?: SaveGame;
  resolution: ConflictResolution;
  resolvedSave?: SaveGame;
}

export class SyncService {
  private supabaseStore: SupabaseStore;
  private localStore: LocalStore;
  private isOnline: boolean = navigator.onLine;

  constructor() {
    this.supabaseStore = saveStorageFactory.getSupabaseStore();
    this.localStore = saveStorageFactory.getLocalStore();
    
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.backgroundSync();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  // Kiểm tra sync status cho tất cả slot
  async getSyncStatus(): Promise<SyncStatus> {
    try {
      const localSlots = await this.localStore.list();
      const cloudSlots = await this.supabaseStore.isAvailable() 
        ? await this.supabaseStore.list() 
        : [];

      const hasLocalChanges = localSlots.some(slot => slot.pendingSync);
      const hasCloudChanges = cloudSlots.length > 0;

      // Tìm conflicts
      const conflicts = this.detectConflicts(localSlots, cloudSlots);

      return {
        hasLocalChanges,
        hasCloudChanges,
        lastLocalUpdate: Math.max(...localSlots.map(slot => slot.lastUpdated || 0)),
        lastCloudUpdate: Math.max(...cloudSlots.map(slot => slot.lastUpdated || 0)),
        conflictResolution: conflicts.length > 0 ? 'manual' : 'local'
      };
    } catch (error) {
      console.error('Lỗi kiểm tra sync status:', error);
      return {
        hasLocalChanges: false,
        hasCloudChanges: false
      };
    }
  }

  // Phát hiện conflicts giữa local và cloud
  private detectConflicts(localSlots: SaveSlot[], cloudSlots: SaveSlot[]): ConflictInfo[] {
    const conflicts: ConflictInfo[] = [];

    for (const localSlot of localSlots) {
      if (localSlot.isEmpty) continue;

      const cloudSlot = cloudSlots.find(slot => slot.slotId === localSlot.slotId);
      
      if (cloudSlot && !cloudSlot.isEmpty) {
        // Có dữ liệu ở cả local và cloud
        const localTime = localSlot.lastUpdated || 0;
        const cloudTime = cloudSlot.lastUpdated || 0;
        
        // Nếu thời gian khác nhau đáng kể (> 1 phút), coi là conflict
        if (Math.abs(localTime - cloudTime) > 60000) {
          conflicts.push({
            slotId: localSlot.slotId,
            localSave: localSlot.saveGame,
            cloudSave: cloudSlot.saveGame,
            resolution: 'manual'
          });
        }
      }
    }

    return conflicts;
  }

  // Sync tất cả slot
  async syncAll(): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      syncedSlots: [],
      conflicts: [],
      errors: []
    };

    try {
      if (!this.isOnline || !await this.supabaseStore.isAvailable()) {
        console.log('Không thể sync - offline hoặc Supabase không khả dụng');
        return result;
      }

      const localSlots = await this.localStore.list();
      const cloudSlots = await this.supabaseStore.list();

      // Detect conflicts first
      const conflicts = this.detectConflicts(localSlots, cloudSlots);
      result.conflicts = conflicts;

      // Sync non-conflicting slots
      for (const localSlot of localSlots) {
        if (localSlot.isEmpty || localSlot.pendingSync === false) continue;

        const conflict = conflicts.find(c => c.slotId === localSlot.slotId);
        if (conflict) continue; // Skip conflicting slots

        try {
          // Upload local to cloud
          if (localSlot.saveGame) {
            await this.supabaseStore.save(localSlot.slotId, localSlot.saveGame);
            
            // Update local metadata to remove pendingSync
            const updatedSaveGame = {
              ...localSlot.saveGame,
              meta: {
                ...localSlot.saveGame.meta,
                pendingSync: false,
                source: 'cloud' as const
              }
            };
            await this.localStore.save(localSlot.slotId, updatedSaveGame);
            
            result.syncedSlots.push(localSlot.slotId);
          }
        } catch (error) {
          console.error(`Lỗi sync slot ${localSlot.slotId}:`, error);
          result.errors.push(`Lỗi sync ${localSlot.slotId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Download cloud changes to local
      for (const cloudSlot of cloudSlots) {
        if (cloudSlot.isEmpty) continue;

        const localSlot = localSlots.find(s => s.slotId === cloudSlot.slotId);
        const conflict = conflicts.find(c => c.slotId === cloudSlot.slotId);
        
        if (conflict) continue; // Skip conflicting slots

        // If local is empty or cloud is newer
        if (!localSlot || localSlot.isEmpty || 
            (cloudSlot.lastUpdated && localSlot.lastUpdated && 
             cloudSlot.lastUpdated > localSlot.lastUpdated)) {
          
          try {
            if (cloudSlot.saveGame) {
              await this.localStore.save(cloudSlot.slotId, cloudSlot.saveGame);
              result.syncedSlots.push(cloudSlot.slotId);
            }
          } catch (error) {
            console.error(`Lỗi download slot ${cloudSlot.slotId}:`, error);
            result.errors.push(`Lỗi download ${cloudSlot.slotId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }

      console.log('✓ Sync completed:', result);
      return result;

    } catch (error) {
      console.error('✗ Lỗi sync:', error);
      result.success = false;
      result.errors.push(`Lỗi sync tổng thể: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  }

  // Resolve conflict manually
  async resolveConflict(
    slotId: 'slot1' | 'slot2' | 'slot3' | 'local1' | 'local2' | 'local3', 
    resolution: 'local' | 'cloud' | 'merge' | 'both',
    customSave?: SaveGame
  ): Promise<boolean> {
    try {
      const conflict = await this.getConflictForSlot(slotId);
      if (!conflict) return false;

      let resolvedSave: SaveGame;

      switch (resolution) {
        case 'local':
          resolvedSave = conflict.localSave!;
          // Update both local and cloud
          await this.localStore.save(slotId, resolvedSave);
          await this.supabaseStore.save(slotId, resolvedSave);
          break;
        case 'cloud':
          resolvedSave = conflict.cloudSave!;
          // Update both local and cloud
          await this.localStore.save(slotId, resolvedSave);
          await this.supabaseStore.save(slotId, resolvedSave);
          break;
        case 'merge':
          resolvedSave = customSave || this.mergeSaves(conflict.localSave!, conflict.cloudSave!);
          // Update both local and cloud
          await this.localStore.save(slotId, resolvedSave);
          await this.supabaseStore.save(slotId, resolvedSave);
          break;
        case 'both':
          // Keep both versions - no action needed, just clear conflict
          console.log(`✓ Keeping both local and cloud versions for ${slotId}`);
          return true;
        default:
          return false;
      }

      console.log(`✓ Resolved conflict for ${slotId} with resolution: ${resolution}`);
      return true;

    } catch (error) {
      console.error(`✗ Lỗi resolve conflict cho ${slotId}:`, error);
      return false;
    }
  }

  // Get conflict info for specific slot
  private async getConflictForSlot(slotId: 'slot1' | 'slot2' | 'slot3' | 'local1' | 'local2' | 'local3'): Promise<ConflictInfo | null> {
    const localSlots = await this.localStore.list();
    const cloudSlots = await this.supabaseStore.isAvailable() 
      ? await this.supabaseStore.list() 
      : [];

    const localSlot = localSlots.find(s => s.slotId === slotId);
    const cloudSlot = cloudSlots.find(s => s.slotId === slotId);

    if (!localSlot || !cloudSlot || localSlot.isEmpty || cloudSlot.isEmpty) {
      return null;
    }

    const localTime = localSlot.lastUpdated || 0;
    const cloudTime = cloudSlot.lastUpdated || 0;

    if (Math.abs(localTime - cloudTime) > 60000) {
      return {
        slotId,
        localSave: localSlot.saveGame,
        cloudSave: cloudSlot.saveGame,
        resolution: 'manual'
      };
    }

    return null;
  }

  // Merge two saves (simple strategy: use newer one with some data from older)
  private mergeSaves(localSave: SaveGame, cloudSave: SaveGame): SaveGame {
    const localTime = localSave.meta.updatedAt;
    const cloudTime = cloudSave.meta.updatedAt;

      // Use the newer save as base
      const baseSave = localTime > cloudTime ? localSave : cloudSave;
      const otherSave = localTime > cloudTime ? cloudSave : localSave;

      // Merge some data from the older save
      return {
        ...baseSave,
        meta: {
          ...baseSave.meta,
          updatedAt: Date.now(),
          source: 'cloud' as const,
          pendingSync: false
        },
      // Keep the longer chat history
      chat: baseSave.chat.length > otherSave.chat.length ? baseSave.chat : otherSave.chat,
      // Use the higher turn counter
      turnCounter: Math.max(baseSave.turnCounter, otherSave.turnCounter)
    };
  }

  // Background sync (called when online)
  async backgroundSync(): Promise<void> {
    if (!this.isOnline) return;

    try {
      console.log('○ Starting background sync...');
      const result = await this.syncAll();
      
      if (result.success) {
        console.log(`✓ Background sync completed: ${result.syncedSlots.length} slots synced`);
      } else {
        console.warn('⚠️ Background sync had errors:', result.errors);
      }
    } catch (error) {
      console.error('✗ Background sync failed:', error);
    }
  }

  // Force sync specific slot
  async syncSlot(slotId: 'slot1' | 'slot2' | 'slot3'): Promise<boolean> {
    try {
      if (!this.isOnline || !await this.supabaseStore.isAvailable()) {
        return false;
      }

      const localSlot = (await this.localStore.list()).find(s => s.slotId === slotId);
      const cloudSlot = (await this.supabaseStore.list()).find(s => s.slotId === slotId);

      // Upload local to cloud if local has changes
      if (localSlot && !localSlot.isEmpty && localSlot.pendingSync) {
        if (localSlot.saveGame) {
          await this.supabaseStore.save(slotId, localSlot.saveGame);
          
          // Update local metadata
          const updatedSaveGame = {
            ...localSlot.saveGame,
            meta: {
              ...localSlot.saveGame.meta,
              pendingSync: false,
              source: 'cloud' as const
            }
          };
          await this.localStore.save(slotId, updatedSaveGame);
        }
      }

      // Download cloud to local if cloud is newer
      if (cloudSlot && !cloudSlot.isEmpty) {
        if (!localSlot || localSlot.isEmpty || 
            (cloudSlot.lastUpdated && localSlot.lastUpdated && 
             cloudSlot.lastUpdated > localSlot.lastUpdated)) {
          
          if (cloudSlot.saveGame) {
            await this.localStore.save(slotId, cloudSlot.saveGame);
          }
        }
      }

      console.log(`✓ Synced slot ${slotId}`);
      return true;

    } catch (error) {
      console.error(`✗ Lỗi sync slot ${slotId}:`, error);
      return false;
    }
  }

  // Check if online
  isOnlineStatus(): boolean {
    return this.isOnline;
  }
}

// Singleton instance
export const syncService = new SyncService();
