# Hướng dẫn chạy SQL Setup cho Supabase

## Bước 1: Truy cập Supabase Dashboard

1. Đăng nhập vào [Supabase Dashboard](https://supabase.com/dashboard)
2. Chọn project của bạn
3. Vào **SQL Editor** (biểu tượng `</>` ở sidebar)

## Bước 2: Chạy SQL Script

1. Copy toàn bộ nội dung file `supabase_setup.sql`
2. Paste vào SQL Editor
3. Click **Run** để thực thi

## Bước 3: Kiểm tra kết quả

### Kiểm tra bảng đã được tạo:
```sql
SELECT * FROM public.saves LIMIT 1;
```

### Kiểm tra RLS policies:
```sql
SELECT * FROM pg_policies WHERE tablename = 'saves';
```

### Kiểm tra functions:
```sql
SELECT * FROM pg_proc WHERE proname LIKE '%save%';
```

## Bước 4: Test với user thật

Sau khi đăng nhập vào app, chạy:

```sql
-- Xem saves của user hiện tại
SELECT * FROM public.user_saves;

-- Xem thống kê saves
SELECT * FROM public.get_user_save_stats();
```

## Các tính năng được thiết lập:

### ✅ **Bảng `saves`**
- Hỗ trợ tối đa 3 slot per user
- JSONB data field chứa SaveGame object
- Tự động cập nhật `updated_at`

### ✅ **Row Level Security (RLS)**
- Users chỉ truy cập saves của chính mình
- Policies cho SELECT, INSERT, UPDATE, DELETE

### ✅ **Triggers & Functions**
- Tự động cập nhật `updated_at`
- Kiểm tra giới hạn 3 slot
- Thống kê saves
- Cleanup saves cũ

### ✅ **Indexes**
- Tối ưu performance cho queries
- Index trên `user_id`, `slot_id`, `updated_at`

## Troubleshooting:

### Lỗi "permission denied":
- Đảm bảo đã enable RLS
- Kiểm tra user đã đăng nhập
- Verify policies đã được tạo

### Lỗi "slot limit exceeded":
- User đã có 3 slot, cần xóa slot cũ trước
- Hoặc update slot hiện có

### Lỗi "function does not exist":
- Chạy lại toàn bộ SQL script
- Kiểm tra functions trong pg_proc

## Lưu ý quan trọng:

- **Backup database** trước khi chạy script
- Script này **an toàn** để chạy nhiều lần
- Không ảnh hưởng đến dữ liệu hiện có
- Hỗ trợ migration từ localStorage
