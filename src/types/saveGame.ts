import { WorldData, Character, ChatMessage, SCCSummary, SCCState, WorldTime, ContentFlags, QuestSystem } from './index';

// SaveGame Schema - Versioned JSON chứa toàn bộ dữ liệu game
export interface SaveGame {
  version: string; // Phiên bản schema để migration
  meta: SaveGameMeta;
  world: WorldData;
  character: Character;
  scenario: any; // Scenario skeleton từ localStorage 'rp_scenario'
  summary: SCCSummary; // SCC summary hiện tại
  sceneState: SCCState; // Scene state hiện tại
  chat: ChatMessage[]; // Lịch sử chat
  turnCounter: number; // Số lượt hiện tại
  worldTime: WorldTime; // Thời gian thế giới hiện tại
  questSystem?: QuestSystem; // Hệ thống quest và tiến trình nhiệm vụ
  ui?: SaveGameUI; // Trạng thái UI (không đồng bộ cloud)
  contentFlags?: ContentFlags; // Cờ nội dung 18+
}

// Metadata của save game
export interface SaveGameMeta {
  slotId: 'slot1' | 'slot2' | 'slot3' | 'local1' | 'local2' | 'local3';
  updatedAt: number; // Timestamp
  source: 'cloud' | 'local'; // Nguồn dữ liệu
  pendingSync?: boolean; // Có đang chờ sync không
  migrated?: boolean; // Đã migrate từ localStorage cũ chưa
}

// Trạng thái UI (không đồng bộ cloud)
export interface SaveGameUI {
  showSummaryBanner?: boolean;
  lastSummaryTurn?: number;
  // Có thể thêm các trạng thái UI khác
}

// Slot information cho UI
export interface SaveSlot {
  slotId: 'slot1' | 'slot2' | 'slot3' | 'local1' | 'local2' | 'local3';
  isEmpty: boolean;
  saveGame?: SaveGame;
  lastUpdated?: number;
  source?: 'cloud' | 'local';
  pendingSync?: boolean;
}

// Interface chung cho tất cả storage adapters
export interface SaveStorageAdapter {
  // Lưu game vào slot
  save(slotId: 'slot1' | 'slot2' | 'slot3' | 'local1' | 'local2' | 'local3', saveGame: SaveGame): Promise<void>;
  
  // Tải game từ slot
  load(slotId: 'slot1' | 'slot2' | 'slot3' | 'local1' | 'local2' | 'local3'): Promise<SaveGame | null>;
  
  // Liệt kê tất cả slot
  list(): Promise<SaveSlot[]>;
  
  // Xóa slot
  remove(slotId: 'slot1' | 'slot2' | 'slot3' | 'local1' | 'local2' | 'local3'): Promise<void>;
  
  // Kiểm tra adapter có khả dụng không
  isAvailable(): Promise<boolean>;
  
  // Sync dữ liệu (chỉ cho cloud adapter)
  sync?(): Promise<void>;
}

// Factory để chọn adapter phù hợp
export interface SaveStorageFactory {
  getAdapter(): Promise<SaveStorageAdapter>;
  getAvailableAdapters(): Promise<SaveStorageAdapter[]>;
}

// Migration data từ localStorage cũ
export interface MigrationData {
  worldData?: string; // 'world_gen_result'
  characterData?: string; // 'currentCharacter'
  scenarioData?: string; // 'rp_scenario'
  chatData?: string; // 'rp_chat'
  turnCounter?: string; // 'game_turn_counter'
  summaryData?: string; // 'rp_summary'
  sceneStateData?: string; // 'rp_scene_state'
  summaryIndexedData?: string; // 'rp_summary_indexed'
  worldTimeData?: string; // world time data
  questSystemData?: string; // 'quest_system'
}

// Sync status
export interface SyncStatus {
  hasLocalChanges: boolean;
  hasCloudChanges: boolean;
  lastLocalUpdate?: number;
  lastCloudUpdate?: number;
  conflictResolution?: 'local' | 'cloud' | 'manual';
}

// Conflict resolution types
export type ConflictResolution = 'local' | 'cloud' | 'merge' | 'manual' | 'both';

// Conflict info
export interface ConflictInfo {
  slotId: 'slot1' | 'slot2' | 'slot3' | 'local1' | 'local2' | 'local3';
  localSave?: SaveGame;
  cloudSave?: SaveGame;
  resolution: ConflictResolution;
  resolvedSave?: SaveGame;
}

// Save operation result
export interface SaveResult {
  success: boolean;
  slotId: 'slot1' | 'slot2' | 'slot3' | 'local1' | 'local2' | 'local3';
  source: 'cloud' | 'local';
  error?: string;
  pendingSync?: boolean;
}

// Load operation result
export interface LoadResult {
  success: boolean;
  saveGame?: SaveGame;
  source?: 'cloud' | 'local';
  error?: string;
}
