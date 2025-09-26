# 🎮 HỆ THỐNG SAVE GAME HOÀN CHỈNH

## 📋 Tổng quan

Hệ thống save game mới được thiết kế với 3 slot cố định (slot1, slot2, slot3) sử dụng localStorage làm lưu trữ chính và Supabase làm cloud sync khi đăng nhập.

## 🏗️ Kiến trúc

### **LocalStorage (Chính)**
- **3 slot cố định**: `save_slot1`, `save_slot2`, `save_slot3`
- **Format**: JSON SaveGame với metadata đầy đủ
- **Validation**: Kiểm tra dữ liệu trước khi lưu/tải
- **Atomic writes**: Ghi dữ liệu hoàn chỉnh trong 1 lần

### **Cloud Sync (Khi đăng nhập)**
- **Supabase**: Bảng `saves` với RLS
- **Push**: Đẩy local lên cloud
- **Pull**: Kéo cloud về local
- **Conflict Resolution**: Xử lý xung đột thông minh

## 🎯 Chức năng chính

### **1. Local Operations (Luôn khả dụng)**
- ✅ **Save**: Lưu game hiện tại vào slot
- ✅ **Load**: Tải game từ slot
- ✅ **Delete**: Xóa slot
- ✅ **Export**: Tải file JSON
- ✅ **Import**: Nhập file JSON

### **2. Cloud Operations (Khi đăng nhập)**
- ☁️ **Push to Cloud**: Đẩy slot local lên cloud
- ☁️ **Pull from Cloud**: Kéo slot cloud về local
- ⚠️ **Conflict Resolution**: Giải quyết xung đột dữ liệu

## 🎨 Giao diện người dùng

### **SaveLoadPage Features**
- **3 slot cards**: Hiển thị trạng thái từng slot
- **Status indicators**: Trống/Đã lưu/Xung đột
- **Action buttons**: Save, Load, Delete, Export, Import
- **Cloud buttons**: Push Cloud, Pull Cloud (khi đăng nhập)
- **Conflict modal**: Giải quyết xung đột dữ liệu
- **Status banners**: Thông báo trạng thái hệ thống

### **Visual Indicators**
- 🟢 **Green**: Thành công, đã đồng bộ
- 🟡 **Yellow**: Cảnh báo, chưa đăng nhập
- 🔴 **Red**: Lỗi, xung đột dữ liệu
- 🔵 **Blue**: Thông tin, trạng thái bình thường

## 🔧 Cấu trúc dữ liệu

### **SaveGame Interface**
```typescript
interface SaveGame {
  version: string;
  meta: {
    slotId: 'slot1' | 'slot2' | 'slot3';
    updatedAt: number;
    source: 'local' | 'cloud';
    pendingSync: boolean;
    migrated?: boolean;
  };
  world: WorldData;
  character: Character;
  scenario: any;
  summary: SCCSummary;
  sceneState: SCCState;
  chat: ChatMessage[];
  turnCounter: number;
  worldTime: WorldTime;
  ui?: SaveGameUI;
}
```

### **SaveSlot Interface**
```typescript
interface SaveSlot {
  slotId: 'slot1' | 'slot2' | 'slot3';
  isEmpty: boolean;
  saveGame?: SaveGame;
  lastUpdated?: number;
  source?: 'cloud' | 'local';
  pendingSync?: boolean;
}
```

## 🚀 Cách sử dụng

### **1. Truy cập Save Manager**
- Vào menu chính → Click "TẢI GAME"
- Hoặc truy cập trực tiếp `/saveload`

### **2. Lưu game**
- Chọn slot muốn lưu
- Click nút "Lưu" (màu xanh)
- Game sẽ được lưu vào localStorage

### **3. Tải game**
- Chọn slot có dữ liệu
- Click nút "Tải" (màu xanh)
- Game sẽ được tải và chuyển đến trang game

### **4. Export/Import**
- **Export**: Click "Export" để tải file JSON
- **Import**: Click "Import" để chọn file JSON

### **5. Cloud Sync (Khi đăng nhập)**
- **Push**: Click "Push Cloud" để đẩy lên cloud
- **Pull**: Click "Pull Cloud" để kéo từ cloud
- **Conflict**: Hệ thống sẽ tự động phát hiện và yêu cầu giải quyết

## ⚙️ Cấu hình

### **Environment Variables**
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### **Supabase Setup**
1. Tạo bảng `saves` với SQL script
2. Cấu hình RLS policies
3. Cập nhật environment variables

## 🛡️ Bảo mật & Hiệu năng

### **Data Protection**
- ✅ **Validation**: Kiểm tra dữ liệu trước khi lưu/tải
- ✅ **Atomic writes**: Ghi dữ liệu hoàn chỉnh
- ✅ **Error handling**: Xử lý lỗi an toàn
- ✅ **Size warnings**: Cảnh báo khi dữ liệu quá lớn

### **Performance**
- ✅ **LocalStorage**: Truy cập nhanh
- ✅ **Lazy loading**: Chỉ tải khi cần
- ✅ **Size optimization**: Cảnh báo khi > 2MB
- ✅ **Background sync**: Đồng bộ tự động

## 🧪 Testing

### **Test Cases**
1. **Local Operations**: Save/Load/Delete/Export/Import
2. **Cloud Sync**: Push/Pull khi đăng nhập
3. **Conflict Resolution**: Xử lý xung đột dữ liệu
4. **Offline Mode**: Hoạt động khi không có mạng
5. **Data Validation**: Kiểm tra dữ liệu hợp lệ

### **Error Scenarios**
- ❌ **Network errors**: Xử lý lỗi mạng
- ❌ **Auth errors**: Xử lý lỗi đăng nhập
- ❌ **Data corruption**: Xử lý dữ liệu hỏng
- ❌ **Storage full**: Xử lý hết dung lượng

## 📊 Monitoring

### **Console Logs**
- ✅ **Success**: "Đã lưu slot X (Cục bộ)"
- ✅ **Cloud**: "Đã đẩy Slot X lên Cloud"
- ⚠️ **Warnings**: "SaveGame size: XKB - Có thể cần tối ưu"
- ❌ **Errors**: Chi tiết lỗi với mã lỗi

### **UI Feedback**
- **Loading states**: Hiển thị khi đang xử lý
- **Success messages**: Thông báo thành công
- **Error messages**: Thông báo lỗi chi tiết
- **Status banners**: Trạng thái hệ thống

## 🔄 Migration

### **Từ hệ thống cũ**
- Tự động phát hiện dữ liệu cũ
- Chuyển đổi sang format mới
- Đánh dấu `migrated_to_cloud=false`

### **Backup & Restore**
- Export/Import JSON files
- Cloud sync làm backup tự động
- Khôi phục từ cloud khi cần

## 🎉 Kết luận

Hệ thống save game mới cung cấp:
- ✅ **3 slot cố định** với localStorage
- ✅ **Cloud sync** khi đăng nhập
- ✅ **Conflict resolution** thông minh
- ✅ **Export/Import** linh hoạt
- ✅ **UI/UX** trực quan và dễ sử dụng
- ✅ **Error handling** toàn diện
- ✅ **Performance** tối ưu

**Hệ thống đã sẵn sàng sử dụng!** 🚀
