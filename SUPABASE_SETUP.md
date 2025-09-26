# Hướng dẫn cấu hình Supabase

## Bước 1: Tạo file .env

Tạo file `.env` trong thư mục gốc của project với nội dung:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

## Bước 2: Lấy thông tin từ Supabase Dashboard

1. Đăng nhập vào [Supabase Dashboard](https://supabase.com/dashboard)
2. Chọn project của bạn
3. Vào **Settings** > **API**
4. Copy các giá trị:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`

## Bước 3: Ví dụ cấu hình

```env
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY5ODc2MDAwMCwiZXhwIjoyMDE0MzM2MDAwfQ.example_signature
```

## Bước 4: Khởi động lại dev server

Sau khi tạo file `.env`, khởi động lại dev server:

```bash
npm run dev
```

## Lưu ý quan trọng

- File `.env` đã được thêm vào `.gitignore` để bảo mật
- Không commit file `.env` lên Git
- Chỉ sử dụng **anon key**, không sử dụng **service_role key** ở client
