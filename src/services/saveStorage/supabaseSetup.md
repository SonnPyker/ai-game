# Supabase Setup cho Save System

## 1. Tạo Supabase Project

1. Truy cập [supabase.com](https://supabase.com)
2. Đăng ký/đăng nhập tài khoản
3. Tạo project mới
4. Lưu lại URL và anon key

## 2. Tạo bảng saves

Chạy SQL sau trong Supabase SQL Editor:

```sql
-- Tạo bảng saves
CREATE TABLE saves (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  slot_id TEXT NOT NULL CHECK (slot_id IN ('slot1', 'slot2', 'slot3')),
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, slot_id)
);

-- Tạo RLS policy
ALTER TABLE saves ENABLE ROW LEVEL SECURITY;

-- Policy: User chỉ có thể CRUD dữ liệu của chính mình
CREATE POLICY "Users can manage their own saves" ON saves
  FOR ALL USING (auth.uid() = user_id);

-- Tạo index để tối ưu performance
CREATE INDEX idx_saves_user_slot ON saves(user_id, slot_id);
CREATE INDEX idx_saves_updated_at ON saves(updated_at);
```

## 3. Cấu hình Environment Variables

Tạo file `.env.local` trong root project:

```env
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

## 4. Authentication Setup (Optional)

Nếu muốn sử dụng authentication:

1. Trong Supabase Dashboard, vào Authentication > Settings
2. Cấu hình providers (Email, Google, GitHub, etc.)
3. Enable email confirmation nếu cần

## 5. Testing

1. Khởi động app: `npm run dev`
2. Tạo world và character
3. Vào game và test Save Manager
4. Kiểm tra dữ liệu trong Supabase Dashboard > Table Editor

## 6. Troubleshooting

### Lỗi RLS Policy
- Kiểm tra user đã đăng nhập chưa
- Kiểm tra policy có đúng không

### Lỗi Connection
- Kiểm tra URL và anon key
- Kiểm tra network connection
- Kiểm tra CORS settings

### Lỗi Data Type
- Kiểm tra JSONB data structure
- Kiểm tra slot_id constraint
