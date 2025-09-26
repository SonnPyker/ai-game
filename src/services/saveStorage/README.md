# Hệ Thống Save Game Mới

## Tổng Quan

Hệ thống save game mới sử dụng **Adapter Pattern** để hỗ trợ cả **Supabase (Cloud)** và **LocalStorage (Local)** với khả năng fallback tự động.

## Kiến Trúc

```
SaveGameService (Main Service)
├── SaveStorageFactory (Factory Pattern)
│   ├── SupabaseStore (Cloud Adapter)
│   └── LocalStore (Local Adapter)
├── MigrationService (Migration từ localStorage cũ)
└── SaveManager (UI Component)
```

## Tính Năng Chính

### 1. **3 Slot System**
- `slot1`, `slot2`, `slot3` - tối đa 3 slot
- Mỗi slot chứa một SaveGame hoàn chỉnh
- UI hiển thị trạng thái rõ ràng (Cloud/Local/Pending)

### 2. **Dual Storage**
- **Supabase (Primary)**: Khi user đăng nhập + online
- **LocalStorage (Fallback)**: Khi offline hoặc chưa đăng nhập
- Tự động chọn adapter phù hợp

### 3. **Migration System**
- Tự động migrate từ localStorage cũ
- Gộp tất cả dữ liệu vào SaveGame format
- Xóa dữ liệu cũ sau khi migrate

### 4. **SaveGame Schema**
```typescript
interface SaveGame {
  version: string;           // Schema version
  meta: SaveGameMeta;       // Metadata (slot, timestamp, source)
  world: WorldData;         // World data
  character: Character;      // Character data
  scenario: any;            // Scenario skeleton
  summary: SCCSummary;     // SCC summary
  sceneState: SCCState;    // Scene state
  chat: ChatMessage[];      // Chat history
  turnCounter: number;     // Turn counter
  worldTime: WorldTime;    // World time
  ui?: SaveGameUI;         // UI state (optional)
}
```

## Sử Dụng

### 1. **Khởi Tạo Service**
```typescript
import { saveGameService } from './services/saveStorage/saveGameService';

// Service tự động khởi tạo khi cần
await saveGameService.initialize();
```

### 2. **Lưu Game**
```typescript
const result = await saveGameService.saveGame(
  'slot1',           // slot ID
  worldData,         // world data
  characterData,     // character data
  scenarioData,      // scenario data
  summaryData,       // SCC summary
  sceneStateData,    // scene state
  chatData,          // chat history
  turnCounter,       // turn counter
  worldTime,         // world time
  uiState           // UI state (optional)
);
```

### 3. **Tải Game**
```typescript
const result = await saveGameService.loadGame('slot1');
if (result.success && result.saveGame) {
  // Áp dụng SaveGame vào game state
  applySaveGameToState(result.saveGame);
}
```

### 4. **Quản Lý Slot**
```typescript
// Liệt kê tất cả slot
const slots = await saveGameService.listSlots();

// Xóa slot
await saveGameService.deleteSlot('slot1');

// Export/Import
const jsonString = await saveGameService.exportGame('slot1');
await saveGameService.importGame(jsonString, 'slot2');
```

## UI Components

### SaveManager Component
```tsx
<SaveManager
  isOpen={showSaveManager}
  onClose={() => setShowSaveManager(false)}
  onLoadGame={handleLoadGame}
  currentGameData={getCurrentGameData()}
/>
```

**Tính năng UI:**
- Hiển thị 3 slot với thông tin chi tiết
- Nút Save/Load/Delete cho từng slot
- Export/Import JSON files
- Trạng thái Cloud/Local/Pending
- Responsive design

## Migration

### Tự Động Migration
- Service tự động phát hiện localStorage cũ
- Migrate vào `slot1` nếu trống
- Xóa dữ liệu cũ sau khi migrate

### Manual Migration
```typescript
import { migrationService } from './services/saveStorage/migrationService';

if (migrationService.needsMigration()) {
  const saveGame = await migrationService.migrateToSlot1();
}
```

## Cấu Hình

### Environment Variables
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Supabase Setup
Xem `supabaseSetup.md` để setup database và authentication.

## Lỗi Thường Gặp

### 1. **Supabase Connection Failed**
- Kiểm tra URL và anon key
- Kiểm tra network connection
- Kiểm tra RLS policies

### 2. **Migration Failed**
- Kiểm tra localStorage data integrity
- Xem console logs để debug
- Thử manual migration

### 3. **Save/Load Failed**
- Kiểm tra adapter availability
- Kiểm tra data validation
- Xem error messages

## Performance

### Tối Ưu Hóa
- JSON compression cho large saves
- Lazy loading cho UI
- Caching cho adapter selection
- Background sync khi có thể

### Giới Hạn
- Max 3 slots
- JSON size warning (>2MB)
- LocalStorage quota limits
- Network timeout handling

## Testing

### Test Cases
1. **Online + Authenticated**: SupabaseStore
2. **Offline/Unauthenticated**: LocalStore  
3. **Migration**: localStorage cũ → slot1
4. **Sync**: Local ↔ Cloud
5. **Import/Export**: JSON files
6. **Error Handling**: Network failures

### Manual Testing
```bash
# Test với Supabase
npm run dev
# Tạo world/character → Save → Check Supabase Dashboard

# Test offline
# Disconnect network → Save → Check localStorage
```

## Roadmap

### Phase 1 ✅
- [x] Adapter Pattern
- [x] 3 Slot System  
- [x] Migration System
- [x] SaveManager UI

### Phase 2 (Next)
- [ ] Sync Logic (Local ↔ Cloud)
- [ ] Conflict Resolution
- [ ] Background Sync
- [ ] Authentication Integration

### Phase 3 (Future)
- [ ] Multi-device Sync
- [ ] Version History
- [ ] Cloud Backup
- [ ] Advanced Analytics
