import { SaveStorageAdapter, SaveStorageFactory } from '../../types/saveGame';
import { SupabaseStore } from './supabaseStore';
import { LocalStore } from './localStore';

export class SaveStorageFactoryImpl implements SaveStorageFactory {
  private supabaseStore: SupabaseStore;
  private localStore: LocalStore;

  constructor() {
    this.supabaseStore = new SupabaseStore();
    this.localStore = new LocalStore();
  }

  async getAdapter(): Promise<SaveStorageAdapter> {
    // Ưu tiên Supabase nếu khả dụng
    const isSupabaseAvailable = await this.supabaseStore.isAvailable();
    
    if (isSupabaseAvailable) {
      console.log('📡 Sử dụng SupabaseStore (Cloud)');
      return this.supabaseStore;
    }

    // Fallback về LocalStorage
    const isLocalAvailable = await this.localStore.isAvailable();
    
    if (isLocalAvailable) {
      console.log('💾 Sử dụng LocalStore (Local)');
      return this.localStore;
    }

    throw new Error('Không có storage adapter nào khả dụng');
  }

  async getAvailableAdapters(): Promise<SaveStorageAdapter[]> {
    const adapters: SaveStorageAdapter[] = [];

    // Kiểm tra Supabase
    if (await this.supabaseStore.isAvailable()) {
      adapters.push(this.supabaseStore);
    }

    // Kiểm tra LocalStorage
    if (await this.localStore.isAvailable()) {
      adapters.push(this.localStore);
    }

    return adapters;
  }

  // Getter để truy cập trực tiếp các adapter
  getSupabaseStore(): SupabaseStore {
    return this.supabaseStore;
  }

  getLocalStore(): LocalStore {
    return this.localStore;
  }
}

// Singleton instance
export const saveStorageFactory = new SaveStorageFactoryImpl();
