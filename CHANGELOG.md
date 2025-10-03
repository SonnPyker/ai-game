# Changelog

Tất cả các thay đổi đáng chú ý của dự án AI Roleplay Game sẽ được ghi lại trong file này.

Format dựa trên [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
và dự án này tuân theo [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-01-02

### 🚀 Major Mobile Optimization Release

### 🎯 Added
- **Comprehensive Mobile UI/UX**: Complete mobile-first responsive design overhaul
- **Touch-Friendly Interactions**: All buttons and interactive elements optimized for touch
  - Minimum 44px touch targets (iOS standard)
  - Touch feedback with scale animations
  - Haptic feedback for mobile interactions
- **Mobile-Specific CSS Utilities**: New utility classes for mobile optimization
  - `.mobile-padding`, `.mobile-text`, `.mobile-button`, `.mobile-input`
  - `.touch-target`, `.touch-feedback`, `.smooth-scroll`
  - `.gpu-accelerated`, `.will-change-*` for performance
- **Enhanced Viewport Configuration**: Mobile web app meta tags
  - `user-scalable=no` to prevent zoom
  - `apple-mobile-web-app-capable` for iOS
  - `theme-color` for mobile browsers
- **Performance Optimizations**: Mobile-specific performance improvements
  - Hardware acceleration for animations
  - Optimized repaints and scrolling
  - Smooth scrolling with `-webkit-overflow-scrolling: touch`

### 🔧 Changed
- **Responsive Typography**: Font sizes optimized for mobile devices
  - Base font size: 18px → 16px (desktop), 14px (mobile)
  - Responsive text utilities for all screen sizes
- **Layout Improvements**: All components now fully responsive
  - InfoMenu: Full width on mobile (`w-full sm:w-96`)
  - SaveManager: Responsive grid layout (`sm:grid-cols-2 lg:grid-cols-3`)
  - GamePage: Mobile-optimized chat area and input
  - HomePage: Responsive hero section and features
- **Touch Interactions**: Enhanced touch experience
  - All buttons have proper touch targets
  - Touch feedback on press
  - Prevented text selection on UI elements
- **Spacing & Padding**: Mobile-optimized spacing throughout
  - Consistent mobile padding using utility classes
  - Responsive spacing for different screen sizes
- **Input Fields**: Mobile-optimized input experience
  - 16px font size to prevent zoom on iOS
  - Proper touch targets for all inputs
  - Enhanced textarea and button interactions

### 🐛 Fixed
- **Mobile Layout Issues**: Fixed various mobile layout problems
  - Sidebar responsive behavior
  - Modal sizing on small screens
  - Text overflow and wrapping issues
- **Touch Interaction Problems**: Resolved touch-related issues
  - Button press feedback
  - Scroll behavior on mobile
  - Input focus and keyboard handling
- **Performance Issues**: Optimized for mobile performance
  - Reduced bundle size impact
  - Smooth animations on mobile devices
  - Better memory usage

### ✨ Improved
- **Mobile User Experience**: Significantly enhanced mobile usability
  - Intuitive touch interactions
  - Better visual hierarchy on small screens
  - Improved readability and accessibility
- **Cross-Platform Compatibility**: Better support across devices
  - iOS Safari optimizations
  - Android Chrome improvements
  - Responsive design for all screen sizes
- **Performance**: Optimized for mobile devices
  - Faster loading times
  - Smoother animations
  - Better battery life on mobile

### 🔧 Technical Improvements
- **CSS Architecture**: Enhanced CSS structure for mobile
  - Mobile-first responsive design
  - Utility classes for common mobile patterns
  - Better organization of mobile-specific styles
- **Build Optimization**: Improved build process
  - Better chunk splitting
  - Optimized asset loading
  - Mobile-specific optimizations
- **Code Quality**: Enhanced code maintainability
  - Consistent mobile patterns
  - Better component organization
  - Improved TypeScript support

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