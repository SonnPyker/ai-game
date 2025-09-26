import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SaveStorageAdapter, SaveGame, SaveSlot } from '../../types/saveGame';

// Supabase configuration
const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

export class SupabaseStore implements SaveStorageAdapter {
  private supabase: SupabaseClient | null = null;
  private isConnected: boolean = false;

  constructor() {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.warn('Supabase configuration missing');
      return;
    }

    this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    this.checkConnection();
  }

  private async checkConnection(): Promise<void> {
    if (!this.supabase) {
      this.isConnected = false;
      return;
    }

    try {
      const { data, error } = await this.supabase.auth.getSession();
      if (error) {
        console.warn('Supabase connection error:', error);
        this.isConnected = false;
      } else {
        this.isConnected = !!data.session;
      }
    } catch (error) {
      console.warn('Supabase connection check failed:', error);
      this.isConnected = false;
    }
  }

  async isAvailable(): Promise<boolean> {
    await this.checkConnection();
    return this.isConnected;
  }

  async save(slotId: 'slot1' | 'slot2' | 'slot3' | 'local1' | 'local2' | 'local3', saveGame: SaveGame): Promise<void> {
    if (!this.supabase || !this.isConnected) {
      throw new Error('Supabase không khả dụng');
    }

    // Reject local slots for cloud storage
    if (slotId.startsWith('local')) {
      throw new Error('SupabaseStore chỉ hỗ trợ cloud slots (slot1, slot2, slot3)');
    }

    try {
      // Cập nhật metadata
      const updatedSaveGame: SaveGame = {
        ...saveGame,
        meta: {
          ...saveGame.meta,
          slotId,
          updatedAt: Date.now(),
          source: 'cloud',
          pendingSync: false
        }
      };

      // Lưu vào Supabase
      const { data: { session } } = await this.supabase!.auth.getSession();
      if (!session?.user?.id) {
        throw new Error('Không có session user');
      }

      const { error } = await this.supabase!
        .from('saves')
        .upsert({
          user_id: session.user.id,
          slot_id: slotId,
          data: updatedSaveGame,
          updated_at: new Date().toISOString()
        });

      if (error) {
        throw new Error(`Lỗi lưu vào Supabase: ${error.message}`);
      }

      console.log(`✅ Đã lưu game vào slot ${slotId} trên cloud`);
    } catch (error) {
      console.error('Lỗi lưu Supabase:', error);
      throw error;
    }
  }

  async load(slotId: 'slot1' | 'slot2' | 'slot3' | 'local1' | 'local2' | 'local3'): Promise<SaveGame | null> {
    // Reject local slots for cloud storage
    if (slotId.startsWith('local')) {
      throw new Error('SupabaseStore chỉ hỗ trợ cloud slots (slot1, slot2, slot3)');
    }
    if (!this.supabase || !this.isConnected) {
      throw new Error('Supabase không khả dụng');
    }

    try {
      const { data: { session } } = await this.supabase!.auth.getSession();
      if (!session?.user?.id) {
        throw new Error('Không có session user');
      }

      const { data, error } = await this.supabase!
        .from('saves')
        .select('data, updated_at')
        .eq('user_id', session.user.id)
        .eq('slot_id', slotId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Không tìm thấy record
          return null;
        }
        throw new Error(`Lỗi tải từ Supabase: ${error.message}`);
      }

      if (!data) {
        return null;
      }

      const saveGame: SaveGame = data.data;
      
      // Cập nhật metadata để phản ánh nguồn cloud
      saveGame.meta = {
        ...saveGame.meta,
        source: 'cloud',
        updatedAt: new Date(data.updated_at).getTime()
      };

      console.log(`✅ Đã tải game từ slot ${slotId} trên cloud`);
      return saveGame;
    } catch (error) {
      console.error('Lỗi tải Supabase:', error);
      throw error;
    }
  }

  async list(): Promise<SaveSlot[]> {
    if (!this.supabase || !this.isConnected) {
      throw new Error('Supabase không khả dụng');
    }

    try {
      const { data: { session } } = await this.supabase!.auth.getSession();
      if (!session?.user?.id) {
        throw new Error('Không có session user');
      }

      const { data, error } = await this.supabase!
        .from('saves')
        .select('slot_id, data, updated_at')
        .eq('user_id', session.user.id);

      if (error) {
        throw new Error(`Lỗi liệt kê từ Supabase: ${error.message}`);
      }

      // Tạo array cho 3 slot
      const slots: SaveSlot[] = [
        { slotId: 'slot1', isEmpty: true },
        { slotId: 'slot2', isEmpty: true },
        { slotId: 'slot3', isEmpty: true }
      ];

      // Điền dữ liệu từ Supabase
      if (data) {
        data.forEach((record: any) => {
          const slotIndex = parseInt(record.slot_id.replace('slot', '')) - 1;
          if (slotIndex >= 0 && slotIndex < 3) {
            slots[slotIndex] = {
              slotId: record.slot_id,
              isEmpty: false,
              saveGame: record.data,
              lastUpdated: new Date(record.updated_at).getTime(),
              source: 'cloud'
            };
          }
        });
      }

      return slots;
    } catch (error) {
      console.error('Lỗi liệt kê Supabase:', error);
      throw error;
    }
  }

  async remove(slotId: 'slot1' | 'slot2' | 'slot3' | 'local1' | 'local2' | 'local3'): Promise<void> {
    // Reject local slots for cloud storage
    if (slotId.startsWith('local')) {
      throw new Error('SupabaseStore chỉ hỗ trợ cloud slots (slot1, slot2, slot3)');
    }
    if (!this.supabase || !this.isConnected) {
      throw new Error('Supabase không khả dụng');
    }

    try {
      const { data: { session } } = await this.supabase!.auth.getSession();
      if (!session?.user?.id) {
        throw new Error('Không có session user');
      }

      const { error } = await this.supabase!
        .from('saves')
        .delete()
        .eq('user_id', session.user.id)
        .eq('slot_id', slotId);

      if (error) {
        throw new Error(`Lỗi xóa từ Supabase: ${error.message}`);
      }

      console.log(`✅ Đã xóa slot ${slotId} trên cloud`);
    } catch (error) {
      console.error('Lỗi xóa Supabase:', error);
      throw error;
    }
  }

  async sync(): Promise<void> {
    // Sync logic sẽ được implement sau
    console.log('Sync Supabase - chưa implement');
  }
}
