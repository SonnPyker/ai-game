# Changelog

Tất cả các thay đổi đáng chú ý của dự án AI Roleplay Game sẽ được ghi lại trong file này.

Format dựa trên [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
và dự án này tuân theo [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2024-12-20

### 🎯 Added
- **Tính năng Nội dung 18+**: Thêm hệ thống bật/tắt nội dung trưởng thành
  - 2 mức độ: "An toàn" và "Tả thực"
  - Age-gate confirmation cho lần đầu kích hoạt
  - Content flags được lưu trong save game
  - AI prompt tự động điều chỉnh theo cài đặt nội dung
- **Tab 'Khởi tạo'**: Trang quản lý flow tạo game mới
  - Hiển thị trạng thái các bước: Tạo thế giới, Tạo nhân vật, Khởi tạo kịch bản
  - Logic disable bảo vệ: không thể bỏ qua các bước bắt buộc
  - Hiển thị tên thế giới và nhân vật đã tạo
- **HelpTooltip**: Component tooltip thay thế text area hướng dẫn
  - Icon dấu hỏi ở góc trên bên phải
  - Tiết kiệm không gian UI
  - Nội dung hướng dẫn chi tiết và có tổ chức

### 🔧 Changed
- **Layout mở rộng**: WorldBuilder và CharacterCreation chuyển từ 2-3 cột sang full width
- **Opening Message**: Loại bỏ câu hỏi trực tiếp, chỉ mô tả tình huống
- **AI Prompt**: Cải thiện hướng dẫn cho nội dung 18+ với ranh giới rõ ràng
- **UI/UX**: Cải thiện visual feedback cho trạng thái disabled

### 🐛 Fixed
- **Opening Message không tuân theo ngôi kể**: Sửa lỗi AI không sử dụng trường narration
- **Missing narration field**: Thêm trường narration vào world_gen_result schema
- **Câu hỏi trong Opening**: Loại bỏ câu hỏi trực tiếp, để người chơi tự do hành động

### 🔒 Security
- **Content Boundaries**: Thiết lập ranh giới nghiêm ngặt cho nội dung 18+
  - Không nội dung trẻ vị thành niên
  - Không cưỡng bức/bạo lực tình dục
  - Không loạn luân, thú tính
  - Chỉ nội dung CONSENSUAL giữa người lớn

## [1.2.0] - 2024-12-19

### 💾 Added
- **Hệ thống Save/Load hoàn chỉnh**: Tích hợp Supabase + LocalStorage
- **3 slot Cloud Save**: Đồng bộ real-time với Supabase
- **3 slot Local Save**: Cho gaming offline
- **Cơ chế sync thông minh**: Giữa Cloud và Local saves
- **UI Save/Load tối ưu**: Thông tin chi tiết cho mỗi save slot

### 🔧 Changed
- **Tách biệt hoàn toàn**: Cloud và Local saves không còn conflict
- **Dọn dẹp code**: Xóa bỏ class nhân vật không cần thiết
- **Tối ưu bundle size**: Giảm kích thước build

### 🐛 Fixed
- **Lỗi [object Object]**: Trong hiển thị thông tin save
- **UX improvements**: Thông tin thế giới và nhân vật rõ ràng hơn

## [1.1.0] - 2024-09-25

### 🎨 Changed
- **Loại bỏ UI gradient**: Chuyển sang flat colors
- **Tách Settings**: Thành 3 tab riêng biệt
- **Game Settings**: Cài đặt âm thanh, hiệu suất, quản lý dữ liệu
- **Responsive design**: Tối ưu cho mọi thiết bị

### 🔧 Improved
- **Hệ thống quản lý API keys**: Cải thiện UX
- **Cơ chế refresh trang**: Xử lý các trường hợp ngoại lệ
- **Loại bỏ nút 'Chơi mới'**: Chỉ bắt đầu từ trang chủ

### 🐛 Fixed
- **TypeScript errors**: Tối ưu build process

## [1.0.0] - 2024-01-15

### 🎮 Initial Release
- **AI Integration**: Tích hợp Google Gemini cho tạo thế giới và nhân vật
- **Dark Theme**: Giao diện tối với thiết kế hiện đại
- **World Builder**: Hệ thống tạo thế giới với AI
- **Character Creation**: Tạo nhân vật thông minh
- **Chat System**: Chat game với AI
- **API Management**: Cài đặt API key linh hoạt
- **Responsive Design**: Hỗ trợ mọi thiết bị

---

## Legend

- **Added**: Tính năng mới
- **Changed**: Thay đổi trong chức năng hiện có
- **Deprecated**: Tính năng sẽ bị loại bỏ trong tương lai
- **Removed**: Tính năng đã bị loại bỏ
- **Fixed**: Sửa lỗi
- **Security**: Cải thiện bảo mật