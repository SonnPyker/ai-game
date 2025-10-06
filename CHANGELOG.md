# Changelog

Tất cả các thay đổi đáng chú ý của dự án AI Roleplay Game sẽ được ghi lại trong file này.

Format dựa trên [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
và dự án này tuân theo [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.1.0] - 2025-01-05

### 🎯 Added
- **Hệ thống thông tin cá nhân NPC nâng cao**: Thông tin chi tiết về NPCs được hiển thị dần dần
  - **8 loại thông tin**: Tuổi, nghề nghiệp, địa chỉ, gia đình, lý lịch, tính cách, mục tiêu, bí mật
  - **Progressive Revelation**: Thông tin chỉ hiển thị khi được AI tiết lộ qua tương tác
  - **Smart Detection**: Hệ thống nhận diện thông minh với 50+ keywords và patterns
  - **Data Cleaning**: Tự động làm sạch và chuẩn hóa dữ liệu trước khi lưu
- **UI cải tiến**: Giao diện thông tin cá nhân sạch sẽ, không còn text `(ai_response)`
- **Migration System**: Tự động cập nhật NPCs cũ để hỗ trợ thông tin cá nhân mới

### 🔧 Changed
- **Enhanced Pattern Detection**: Cải thiện độ chính xác nhận diện thông tin cá nhân
  - **Age patterns**: Thêm `độ tuổi`, `khoảng X tuổi`, `ngoài X tuổi`
  - **Occupation patterns**: Thêm `từng là`, `trước đây là`, `nghề cũ là`, `chuyên về`
  - **Address patterns**: Thêm `khu phố`, `quận`, `huyện`, `tỉnh`, `thành phố`
  - **Family patterns**: Thêm `con trai`, `con gái`, `anh trai`, `chị gái`, `bà nội`, `ông nội`
  - **Background patterns**: Thêm `kinh nghiệm`, `học vấn`, `bằng cấp`, `trường học`
  - **Personality patterns**: Thêm các từ mô tả tính cách cụ thể
  - **Goals patterns**: Thêm `muốn trở thành`, `muốn làm`, `muốn có`, `muốn đạt được`
  - **Secrets patterns**: Thêm `che giấu`, `không tiết lộ`, `quá khứ đen tối`
- **Data Processing**: Chỉ phân tích khi AI response thực sự chứa thông tin cá nhân
- **Duplicate Prevention**: Chỉ lưu thông tin mới, không ghi đè thông tin đã có

### 🐛 Fixed
- **UI Cleanup**: Loại bỏ text `(ai_response)` khỏi giao diện thông tin cá nhân
- **Data Quality**: Cải thiện chất lượng dữ liệu với hàm làm sạch thông minh
- **Performance**: Tối ưu hóa việc phân tích chỉ khi cần thiết
- **Memory Usage**: Giảm thiểu việc lưu trữ dữ liệu không cần thiết

### 🚀 Performance
- **Smart Analysis**: Chỉ phân tích khi có keywords liên quan
- **Efficient Storage**: Chỉ lưu thông tin có ý nghĩa (0 < length < 200)
- **Optimized Patterns**: Regex patterns được tối ưu hóa cho hiệu suất
- **Lazy Loading**: Thông tin cá nhân được load khi cần thiết

## [2.6.0] - 2025-01-02

### 🎯 Added
- **Hệ thống gợi ý hành động AI thông minh**: 4 gợi ý hành động được tạo tự động dựa trên context game
- **Lịch sử hành động (Action Log)**: Theo dõi tất cả hành động đã thực hiện với thu/mở từng mục
- **Cơ chế thời gian hành động**: Mỗi hành động có thời gian thực hiện (5-120 phút) được AI quyết định
- **Tích hợp Save System**: Action suggestions và log được lưu/khôi phục cùng với game data
- **UI responsive**: Gợi ý hành động hiển thị 2x2 grid (PC) và 4x1 (mobile)
- **Cơ chế highlight và deselect**: Chọn/hủy chọn gợi ý hành động trực quan

### 🔧 Changed
- **Chat input behavior**: Có thể gõ sẵn text khi AI đang xử lý, chỉ disable nút gửi
- **Action classification**: Phân biệt hành động gợi ý vs thủ công trong Action Log
- **Time system**: Thêm phút vào WorldTime (HH:mm format)
- **AI response validation**: Kiểm tra toàn diện AI response trước khi xử lý
- **Error handling**: Cơ chế backup/restore suggestions khi AI response lỗi

### 🐛 Fixed
- **geminiService.generateText error**: Sửa lỗi method không tồn tại
- **TypeScript warnings**: Sửa các unused variables trong services
- **UI alignment**: Sửa lỗi alignment khi InfoMenu được pin
- **Suggestion regeneration**: Ngăn tạo lại suggestions khi refresh trang

### 🚀 Performance
- **Lazy loading**: Action suggestions và log được load lazy
- **Optimized prompts**: Giảm thời gian AI response cho action duration
- **Smart caching**: Suggestions được cache trong localStorage

## [1.4.0] - 2025-01-02

### 🎯 Added
- **Tích hợp Quest System vào Save System**: Quest progress được lưu và khôi phục hoàn chỉnh
- **SCC Journal**: Lịch sử tóm tắt SCC với UI có thể thu gọn trong InfoMenu
- **Auto-fill Chat Input**: Tự động điền câu trả lời khi accept/decline quest
- **Quest Decline System**: Cho phép từ chối side quest đã nhận với tracking đầy đủ

### 🔧 Changed
- **Đồng bộ Turn Counter**: SCC và game state sử dụng cùng một turn counter
- **AI Quest Behavior**: AI không nhắc lại quest đã từ chối
- **Quest UI**: Bỏ nút "Nhận Quest" ở QuestTracker, chỉ giữ "Từ chối"
- **Migration System**: Hỗ trợ migrate quest system từ localStorage cũ

### 🐛 Fixed
- **Quest Duplication**: Ngăn chặn quest hiện lại sau khi đã accept/decline
- **SCC Summary Keying**: Fix lỗi SCC summary không hiển thị trong journal
- **Turn Counter Sync**: Đồng bộ hóa turn counter giữa các hệ thống
- **Save Data Cleanup**: Fix `rp_summary_backup` không được xóa khi reset game

### ✨ Improved
- **Quest UX**: Cải thiện trải nghiệm người dùng với quest system
- **Save System**: Tăng cường khả năng lưu/khôi phục dữ liệu
- **Performance**: Tối ưu hóa hiệu suất và memory usage
- **UI/UX**: Cải thiện giao diện và trải nghiệm tổng thể

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