# Changelog

Tất cả các thay đổi đáng chú ý của dự án AI Roleplay Game sẽ được ghi lại trong file này.

## [1.2.0] - 2025-09-27

### ✨ Tính năng mới
- **Hệ thống Save/Load hoàn chỉnh**: Tích hợp Supabase + LocalStorage
- **3 slot Cloud Save**: Đồng bộ real-time với Supabase
- **3 slot Local Save**: Lưu trữ offline cho người chơi không có internet
- **Cơ chế sync thông minh**: Tự động đồng bộ giữa Cloud và Local
- **UI Save/Load tối ưu**: Hiển thị thông tin chi tiết về thế giới và nhân vật

### 🔧 Cải thiện
- **Tách biệt hoàn toàn**: Cloud saves và Local saves hoạt động độc lập
- **Xóa bỏ class nhân vật**: Loại bỏ hệ thống class không cần thiết
- **Dọn dẹp code**: Xóa các file và component không sử dụng
- **Tối ưu bundle size**: Giảm kích thước build từ 381KB xuống 379.96KB

### 🐛 Sửa lỗi
- **Sửa lỗi [object Object]**: Không còn hiển thị object không đúng format
- **Sửa lỗi tên thế giới**: Hiển thị đúng từ trường `worldTitle`
- **Sửa lỗi TypeScript**: Loại bỏ các lỗi type không cần thiết

### 🗑️ Xóa bỏ
- `src/constants/gameData.ts` - Dữ liệu class/race không sử dụng
- `src/components/CharacterCreation/CharacterForm.tsx` - Component không sử dụng
- `src/components/CharacterCreation/AICharacterSuggestions.tsx` - Component không sử dụng
- `src/components/CharacterCreation/CharacterPreview.tsx` - Component không sử dụng

## [1.1.0] - 2025-09-25

### ✨ Tính năng mới
- **UI Flat Design**: Loại bỏ hoàn toàn gradient, chuyển sang flat colors
- **Settings tách biệt**: 3 tab riêng biệt cho API Keys, Game Settings, Version Info
- **Game Settings**: Cài đặt âm thanh, hiệu suất, quản lý dữ liệu
- **Font mới**: SVN-Determination Sans cho giao diện game

### 🔧 Cải thiện
- **Responsive design**: Tối ưu cho mọi thiết bị
- **Quản lý API keys**: Hệ thống quản lý API keys cải tiến
- **Cơ chế refresh**: Cải thiện logic refresh trang
- **Build process**: Tối ưu hóa quá trình build

### 🐛 Sửa lỗi
- **TypeScript errors**: Sửa các lỗi TypeScript
- **UI inconsistencies**: Sửa các lỗi giao diện không nhất quán

## [1.0.0] - 2024-01-15

### ✨ Phát hành đầu tiên
- **AI Integration**: Tích hợp Google Gemini AI
- **World Builder**: Hệ thống tạo thế giới với AI
- **Character Creation**: Tạo nhân vật thông minh
- **Chat Game**: Chat với AI trong game
- **API Management**: Quản lý API keys linh hoạt
- **Responsive Design**: Giao diện responsive cho mọi thiết bị

---

## Cấu trúc version

Dự án sử dụng [Semantic Versioning](https://semver.org/):

- **MAJOR** (1.0.0): Thay đổi lớn, có thể breaking changes
- **MINOR** (1.1.0): Thêm tính năng mới, backward compatible
- **PATCH** (1.1.1): Sửa lỗi, cải thiện nhỏ

## Ghi chú

- Tất cả các thay đổi đều được test kỹ lưỡng trước khi release
- Breaking changes sẽ được đánh dấu rõ ràng
- Mỗi version đều có build thành công và không có lỗi TypeScript
