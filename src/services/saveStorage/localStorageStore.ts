import { SaveStorageAdapter, SaveGame, SaveSlot } from '../../types/saveGame';

export class LocalStorageStore implements SaveStorageAdapter {
  private readonly SLOT_KEYS = ['save_slot1', 'save_slot2', 'save_slot3', 'save_local1', 'save_local2', 'save_local3'] as const;
  private readonly SLOT_IDS = ['slot1', 'slot2', 'slot3', 'local1', 'local2', 'local3'] as const;

  async isAvailable(): Promise<boolean> {
    try {
      return typeof window !== 'undefined' && window.localStorage !== null;
    } catch {
      return false;
    }
  }

  async save(slotId: 'slot1' | 'slot2' | 'slot3' | 'local1' | 'local2' | 'local3', saveGame: SaveGame): Promise<void> {
    try {
      if (!(await this.isAvailable())) {
        throw new Error('LocalStorage không khả dụng');
      }

      // Validate SaveGame
      if (!this.validateSaveGame(saveGame)) {
        throw new Error('Dữ liệu SaveGame không hợp lệ');
      }

      // Set metadata
      const saveGameWithMeta: SaveGame = {
        ...saveGame,
        meta: {
          ...saveGame.meta,
          slotId,
          updatedAt: Date.now(),
          source: 'local' as const,
          pendingSync: true
        }
      };

      // Atomic write
      const key = this.getSlotKey(slotId);
      const jsonString = JSON.stringify(saveGameWithMeta);
      
      // Check size warning
      const sizeKB = new Blob([jsonString]).size / 1024;
      if (sizeKB > 2048) { // 2MB
        console.warn(`SaveGame size: ${sizeKB.toFixed(2)}KB - Có thể cần tối ưu`);
      }

      localStorage.setItem(key, jsonString);
      
      console.log(`✅ Đã lưu slot ${slotId} (${sizeKB.toFixed(2)}KB)`);
    } catch (error) {
      console.error(`❌ Lỗi lưu slot ${slotId}:`, error);
      throw error;
    }
  }

  async load(slotId: 'slot1' | 'slot2' | 'slot3' | 'local1' | 'local2' | 'local3'): Promise<SaveGame | null> {
    try {
      if (!(await this.isAvailable())) {
        throw new Error('LocalStorage không khả dụng');
      }

      const key = this.getSlotKey(slotId);
      const jsonString = localStorage.getItem(key);
      
      if (!jsonString) {
        return null;
      }

      const saveGame: SaveGame = JSON.parse(jsonString);
      
      // Validate loaded SaveGame
      if (!this.validateSaveGame(saveGame)) {
        throw new Error('Dữ liệu SaveGame không hợp lệ');
      }

      console.log(`✅ Đã tải slot ${slotId}`);
      return saveGame;
    } catch (error) {
      console.error(`❌ Lỗi tải slot ${slotId}:`, error);
      return null;
    }
  }

  async list(): Promise<SaveSlot[]> {
    try {
      if (!(await this.isAvailable())) {
        return [];
      }

      const slots: SaveSlot[] = [];

      for (const slotId of this.SLOT_IDS) {
        const saveGame = await this.load(slotId);
        slots.push({
          slotId,
          isEmpty: !saveGame,
          saveGame: saveGame || undefined,
          lastUpdated: saveGame?.meta.updatedAt,
          source: 'local' as const,
          pendingSync: saveGame?.meta.pendingSync || false
        });
      }

      return slots;
    } catch (error) {
      console.error('❌ Lỗi liệt kê slot:', error);
      return [];
    }
  }

  async remove(slotId: 'slot1' | 'slot2' | 'slot3' | 'local1' | 'local2' | 'local3'): Promise<void> {
    try {
      if (!(await this.isAvailable())) {
        throw new Error('LocalStorage không khả dụng');
      }

      const key = this.getSlotKey(slotId);
      localStorage.removeItem(key);
      
      console.log(`✅ Đã xóa slot ${slotId}`);
    } catch (error) {
      console.error(`❌ Lỗi xóa slot ${slotId}:`, error);
      throw error;
    }
  }

  // Export SaveGame as JSON string
  async export(slotId: 'slot1' | 'slot2' | 'slot3' | 'local1' | 'local2' | 'local3'): Promise<string | null> {
    try {
      const saveGame = await this.load(slotId);
      if (!saveGame) {
        return null;
      }

      return JSON.stringify(saveGame, null, 2);
    } catch (error) {
      console.error(`❌ Lỗi export slot ${slotId}:`, error);
      return null;
    }
  }

  // Import SaveGame from JSON string
  async import(slotId: 'slot1' | 'slot2' | 'slot3' | 'local1' | 'local2' | 'local3', jsonString: string): Promise<boolean> {
    try {
      if (!this.isAvailable()) {
        throw new Error('LocalStorage không khả dụng');
      }

      const saveGame: SaveGame = JSON.parse(jsonString);
      
      // Validate imported SaveGame
      if (!this.validateSaveGame(saveGame)) {
        throw new Error('Dữ liệu SaveGame không hợp lệ');
      }

      // Set correct slotId and metadata
      const saveGameWithMeta: SaveGame = {
        ...saveGame,
        meta: {
          ...saveGame.meta,
          slotId,
          updatedAt: Date.now(),
          source: 'local' as const,
          pendingSync: true
        }
      };

      await this.save(slotId, saveGameWithMeta);
      return true;
    } catch (error) {
      console.error(`❌ Lỗi import slot ${slotId}:`, error);
      return false;
    }
  }

  // Get slot key for localStorage
  private getSlotKey(slotId: 'slot1' | 'slot2' | 'slot3' | 'local1' | 'local2' | 'local3'): string {
    const index = this.SLOT_IDS.indexOf(slotId);
    return this.SLOT_KEYS[index];
  }

  // Validate SaveGame structure
  private validateSaveGame(saveGame: any): saveGame is SaveGame {
    if (!saveGame || typeof saveGame !== 'object') {
      return false;
    }

    // Check required fields
    const requiredFields = ['version', 'meta', 'world', 'character', 'scenario', 'summary', 'sceneState', 'chat', 'turnCounter', 'worldTime'];
    for (const field of requiredFields) {
      if (!(field in saveGame)) {
        console.error(`Missing required field: ${field}`);
        return false;
      }
    }

    // Check meta structure
    const meta = saveGame.meta;
    if (!meta || typeof meta !== 'object') {
      return false;
    }

    const requiredMetaFields = ['slotId', 'updatedAt'];
    for (const field of requiredMetaFields) {
      if (!(field in meta)) {
        console.error(`Missing required meta field: ${field}`);
        return false;
      }
    }

    // Check slotId is valid
    if (!this.SLOT_IDS.includes(meta.slotId)) {
      console.error(`Invalid slotId: ${meta.slotId}`);
      return false;
    }

    // Check updatedAt is number
    if (typeof meta.updatedAt !== 'number') {
      console.error(`Invalid updatedAt: ${meta.updatedAt}`);
      return false;
    }

    // Check chat is array
    if (!Array.isArray(saveGame.chat)) {
      console.error('Chat must be an array');
      return false;
    }

    // Check turnCounter is number
    if (typeof saveGame.turnCounter !== 'number') {
      console.error('TurnCounter must be a number');
      return false;
    }

    return true;
  }

  // Get storage info
  getStorageInfo(): { totalSlots: number; usedSlots: number; totalSize: number } {
    let usedSlots = 0;
    let totalSize = 0;

    for (const slotId of this.SLOT_IDS) {
      const key = this.getSlotKey(slotId);
      const data = localStorage.getItem(key);
      if (data) {
        usedSlots++;
        totalSize += new Blob([data]).size;
      }
    }

    return {
      totalSlots: this.SLOT_IDS.length,
      usedSlots,
      totalSize
    };
  }
}
