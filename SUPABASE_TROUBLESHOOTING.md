# Supabase Troubleshooting Guide

## Lỗi "406 Not Acceptable" khi lưu lên Cloud

### 1. Kiểm tra Supabase Configuration

Đảm bảo file `.env` có đúng thông tin:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 2. Kiểm tra RLS (Row Level Security)

Trong Supabase Dashboard, vào **Authentication > Policies** và đảm bảo có policies cho table `saves`:

```sql
-- Policy cho SELECT
CREATE POLICY "Users can view their own saves" ON saves
FOR SELECT USING (auth.uid() = user_id);

-- Policy cho INSERT
CREATE POLICY "Users can insert their own saves" ON saves
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy cho UPDATE
CREATE POLICY "Users can update their own saves" ON saves
FOR UPDATE USING (auth.uid() = user_id);

-- Policy cho DELETE
CREATE POLICY "Users can delete their own saves" ON saves
FOR DELETE USING (auth.uid() = user_id);
```

### 3. Kiểm tra Table Structure

Đảm bảo table `saves` có cấu trúc đúng:

```sql
CREATE TABLE saves (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  slot_id TEXT NOT NULL,
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, slot_id)
);
```

### 4. Kiểm tra Authentication

Đảm bảo user đã đăng nhập và có session hợp lệ:
- Kiểm tra trong browser console: `localStorage.getItem('sb-...')`
- Kiểm tra trong Supabase Dashboard: **Authentication > Users**

### 5. Debug Steps

1. Mở browser console
2. Kiểm tra network requests khi lưu
3. Xem lỗi chi tiết trong console
4. Kiểm tra Supabase logs trong Dashboard

### 6. Common Issues

- **RLS không được enable**: Bật RLS cho table `saves`
- **Policies không đúng**: Tạo lại policies với đúng syntax
- **User ID không match**: Kiểm tra `auth.uid()` vs `user_id`
- **Session expired**: Đăng nhập lại
- **API key sai**: Kiểm tra lại `.env` file

### 7. Test Commands

Trong Supabase SQL Editor, test:

```sql
-- Kiểm tra user hiện tại
SELECT auth.uid();

-- Kiểm tra saves của user
SELECT * FROM saves WHERE user_id = auth.uid();

-- Test insert
INSERT INTO saves (user_id, slot_id, data) 
VALUES (auth.uid(), 'test', '{"test": true}');
```
