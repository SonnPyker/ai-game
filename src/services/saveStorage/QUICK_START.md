# Hướng Dẫn Sử Dụng Nhanh - Save System

## 🚀 Cách Sử Dụng

### 1. **Đăng Nhập/Đăng Ký**
- **Nút đăng nhập**: Có ở góc trên bên phải màn hình (AuthStatus)
- **Trong HomePage**: Nút "Đăng nhập" ở góc trên bên phải
- **Trong SettingsPage**: Nút "Đăng nhập" ở góc trên bên phải
- **Trong SaveManager**: Nút "Đăng nhập" trong header

### 2. **Lưu Game**
- Vào game → Click nút Save (💾) ở header
- Chọn slot (slot1, slot2, slot3)
- Click "Lưu" để lưu game hiện tại
- Hệ thống tự động chọn Cloud (nếu đã đăng nhập) hoặc Local

### 3. **Tải Game**
- Vào SaveManager → Chọn slot có dữ liệu
- Click "Tải" để load game
- Game sẽ được restore về trạng thái đã lưu

### 4. **Đồng Bộ Dữ Liệu**
- **Tự động**: Khi online và đã đăng nhập
- **Thủ công**: Click nút "Sync" trong SaveManager
- **Xung đột**: Modal sẽ hiện để giải quyết

### 5. **Export/Import**
- **Export**: Chọn slot → Click "Export" → Tải file JSON
- **Import**: Chọn slot → Click "Import" → Chọn file JSON

## 🔧 Cấu Hình

### **Environment Variables**
Tạo file `.env.local`:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### **Supabase Setup**
1. Tạo project trên [supabase.com](https://supabase.com)
2. Chạy SQL trong Supabase SQL Editor:
```sql
CREATE TABLE saves (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  slot_id TEXT NOT NULL CHECK (slot_id IN ('slot1', 'slot2', 'slot3')),
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, slot_id)
);

ALTER TABLE saves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own saves" ON saves
  FOR ALL USING (auth.uid() = user_id);
```

## 📱 UI Components

### **AuthStatus** (Góc trên phải)
- Hiển thị trạng thái đăng nhập
- Nút đăng nhập/đăng xuất
- Thông tin user

### **SaveManager** (Trong game)
- 3 slot system
- Save/Load/Delete/Export/Import
- Sync status
- Conflict resolution

### **AuthModal** (Popup)
- Đăng nhập/đăng ký
- Google OAuth
- Reset password

## 🔄 Sync System

### **Trạng Thái Sync**
- ✅ **Synced**: Dữ liệu đã đồng bộ
- ⚠️ **Pending**: Có thay đổi chưa sync
- 🔄 **Conflicts**: Có xung đột cần giải quyết
- 📡 **Online/Offline**: Trạng thái kết nối

### **Conflict Resolution**
- **Giữ Local**: Ưu tiên dữ liệu local
- **Giữ Cloud**: Ưu tiên dữ liệu cloud
- **Merge**: Gộp dữ liệu thông minh

## 🎮 Game Flow

### **Bắt Đầu Game**
1. Tạo World (World Builder)
2. Tạo Character (Character Creation)
3. Bắt đầu Game
4. Lưu game khi cần

### **Lưu Game**
1. Click nút Save (💾)
2. Chọn slot
3. Click "Lưu"
4. Dữ liệu được lưu (Cloud/Local)

### **Tải Game**
1. Click nút Save (💾)
2. Chọn slot có dữ liệu
3. Click "Tải"
4. Game được restore

## 🛠️ Troubleshooting

### **Lỗi Đăng Nhập**
- Kiểm tra Supabase URL và key
- Kiểm tra network connection
- Kiểm tra RLS policies

### **Lỗi Sync**
- Kiểm tra đã đăng nhập chưa
- Kiểm tra network connection
- Xem console logs

### **Lỗi Save/Load**
- Kiểm tra adapter availability
- Kiểm tra data validation
- Xem error messages

## 📊 Monitoring

### **Console Logs**
- `✅ Đã lưu game vào slotX (cloud/local)`
- `✅ Đã tải game từ slotX (cloud/local)`
- `🔄 Starting background sync...`
- `⚠️ Conflict detected for slotX`

### **UI Status**
- Auth status trong AuthStatus
- Sync status trong SaveManager
- Conflict modal khi có xung đột

## 🎯 Best Practices

### **Lưu Game**
- Lưu thường xuyên để tránh mất dữ liệu
- Sử dụng 3 slot để backup
- Export định kỳ để backup

### **Sync**
- Đăng nhập để sử dụng Cloud
- Sync thường xuyên khi online
- Giải quyết xung đột kịp thời

### **Security**
- Không chia sẻ Supabase keys
- Sử dụng RLS policies
- Đăng xuất khi không dùng
