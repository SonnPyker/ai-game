# 🔧 DEBUG SUPABASE - Hướng dẫn sửa lỗi

## Vấn đề hiện tại:
- ❌ `Supabase configuration missing`
- ❌ `supabase is not defined`
- ❌ Auth không hoạt động

## Nguyên nhân:
File `.env` không tồn tại hoặc chưa được cấu hình đúng.

## Giải pháp:

### Bước 1: Tạo file .env
```bash
# Copy file supabase.env thành .env
copy supabase.env .env
```

### Bước 2: Cấu hình Supabase
1. Vào [Supabase Dashboard](https://supabase.com/dashboard)
2. Chọn project → **Settings** → **API**
3. Copy **Project URL** và **anon public key**

### Bước 3: Cập nhật .env
Mở file `.env` và thay thế:
```env
VITE_SUPABASE_URL=https://your-actual-project-url.supabase.co
VITE_SUPABASE_ANON_KEY=your-actual-anon-key-here
```

### Bước 4: Khởi động lại
```bash
npm run dev
```

## Kiểm tra debug:

### 1. Kiểm tra console:
- Không còn lỗi "Supabase configuration missing"
- Không còn lỗi "supabase is not defined"

### 2. Test trong console:
```javascript
// Kiểm tra Supabase đã load
console.log(window.supabase);

// Test auth
supabase.auth.getSession().then(console.log);
```

### 3. Kiểm tra nút đăng nhập:
- Nút "Đăng nhập" hiển thị bình thường
- Click vào nút không bị lỗi

## Nếu vẫn lỗi:

### Kiểm tra file .env:
```bash
type .env
```

### Kiểm tra biến môi trường:
```bash
echo $env:VITE_SUPABASE_URL
echo $env:VITE_SUPABASE_ANON_KEY
```

### Restart hoàn toàn:
```bash
# Dừng dev server (Ctrl+C)
# Xóa node_modules
rm -rf node_modules
# Cài lại
npm install
# Chạy lại
npm run dev
```

## Lưu ý:
- File `.env` phải ở thư mục gốc của project
- Biến môi trường phải bắt đầu bằng `VITE_`
- Không có khoảng trắng thừa trong file .env
- Khởi động lại dev server sau khi sửa .env
