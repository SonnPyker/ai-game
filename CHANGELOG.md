# Changelog

Tất cả các thay đổi đáng chú ý của dự án AI Roleplay Game sẽ được ghi lại trong file này.

Format dựa trên [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
và dự án này tuân theo [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [5.1.0-beta] - 2025-01-12

### 🌟 Major Features
- **Skill Tree System**: Complete implementation of combat and social skill trees
- **Combat Level Progression**: Every 3 combat levels grants +1 skill point and +7 HP
- **Social Level Progression**: Every 3 character levels grants +1 social skill point
- **Direct Stat Bonuses**: Skill tree bonuses directly modify core stats
- **HP Recalculation**: Constitution changes properly recalculate HP using character creation formula

### 🎮 Combat System Enhancements
- **Real-time Combat Log**: Combat log now displays actions in real-time during player turns with smooth animations
- **Attack Button Damage Display**: Attack buttons now show combined damage (base + buff) from temporary player stats
- **Temporary Player Stats System**: Implemented comprehensive temporary stats system for combat buffs/debuffs
- **Standardized Effect Format**: Unified consumable effect string format (type:target:value:duration)
- **Status Effect Icons**: Enhanced status effect display with proper damage modifier handling
- **Combat State Optimization**: Removed combatLog field and improved combat state management

### 🎯 Skill Tree System
- **Combat Skills**: 12 predefined combat skills with attack, damage, AC, and initiative bonuses
- **Social Skills**: 12 predefined social skills with stat bonuses and special abilities
- **Skill Point Management**: Separate combat and social skill points with reset functionality
- **Prerequisites System**: Skills require previous tier skills to be learned
- **Tier System**: 3 tiers plus special skills with different costs and bonuses
- **UI Integration**: Responsive skill tree view with mobile and desktop layouts

### 🔧 Technical Improvements
- **Effect Processing Service**: Refactored to handle new standardized effect string format
- **Combat Service**: Added getCurrentTurnActions() method for real-time action tracking
- **Skill Tree Service**: Complete service for skill management and bonus calculation
- **HP Calculation**: Proper HP recalculation when Constitution changes
- **Damage Bonus Integration**: Skill tree damage bonuses properly integrated into combat
- **TypeScript Fixes**: Resolved all TypeScript compilation errors
- **UI Synchronization**: Improved real-time updates between combat state and UI components

## [5.0.0-beta] - 2025-01-12

### 🚀 Hệ thống Parallel API Processing
- **Multi-API Key Management**: Quản lý nhiều API keys từ các account khác nhau
- **Round-Robin Distribution**: Phân phối requests đều giữa các API keys theo thuật toán round-robin
- **Parallel Processing**: Xử lý song song tối đa 5 requests cùng lúc để tăng throughput
- **Queue System**: Hệ thống queue thông minh với concurrency control
- **Account Tracking**: Theo dõi và hiển thị account name cho mỗi API key
- **Performance Monitoring**: Thống kê chi tiết về queue length, active requests, response time

### 🎯 UI Enhancements
- **Multi-API Key Manager**: Giao diện quản lý API keys với account names
- **Parallel API Tester**: Tool test hiệu suất parallel processing
- **Real-time Stats**: Hiển thị thống kê real-time về API usage
- **Debug Console**: Console logs tối ưu để track request assignment

### 🔧 Technical Improvements
- **Request ID Uniqueness**: Đảm bảo mỗi request có ID unique 100%
- **Error Handling**: Xử lý lỗi thông minh với auto-failover
- **Memory Management**: Cleanup request tracking sau khi hoàn thành
- **TypeScript Optimization**: Cải thiện type safety và build performance

### 🐛 Fixed
- **Request ID Collision**: Sửa lỗi request ID bị trùng lặp
- **Round-Robin Logic**: Cải thiện thuật toán phân phối requests
- **Console Log Spam**: Giảm thiểu logs không cần thiết
- **TypeScript Errors**: Sửa các lỗi TypeScript trong SaveLoadPage

### 🚀 Performance
- **2-5x Throughput**: Tăng throughput đáng kể với multiple API keys
- **Load Balancing**: Cân bằng tải giữa các API keys
- **Concurrent Processing**: Xử lý song song thay vì tuần tự
- **Resource Optimization**: Tối ưu hóa sử dụng tài nguyên

## [4.2.0-beta] - 2025-01-05

### 🎮 Combat Visual Feedback System
- **Combat Animation Service**: New centralized animation management system with event-driven architecture
- **Floating Damage Text**: Real-time damage numbers with smooth animations appearing directly on combatant cards
- **Visual Effects**: Shake, flash, and highlight effects for combatants during attacks and damage
- **Manual Turn Control**: Players must manually end their turn after performing actions
- **Combat State Synchronization**: Improved combat state management with automatic UI updates
- **Performance Optimized**: Hardware-accelerated animations with mobile-first design

### 🧹 Code Cleanup & Maintenance
- **Removed Test Scripts**: Cleaned up all test files and multiple enemy spawning mechanisms
- **Simplified Combat Flow**: Streamlined combat system focusing on core 1v1 combat experience
- **TypeScript Improvements**: Fixed all TypeScript errors and improved type safety
- **Build Optimization**: Successful production build with optimized bundle sizes

### 🔧 Technical Improvements
- **Event-Driven Architecture**: Combat animations use EventEmitter pattern for better decoupling
- **CSS Animation System**: Hardware-accelerated keyframe animations for better performance
- **Mobile Responsive**: Optimized animations and UI for mobile devices
- **Memory Management**: Proper cleanup of animation listeners and DOM nodes

## [4.1.0-beta] - 2025-01-05

### 🚀 Major Combat System Upgrades
- **Enhanced Combat Detection**: Cải thiện hệ thống phát hiện combat từ AI response, context, sceneState và quests
- **Improved Combat Log**: Nhóm combat logs của một lượt thành một log duy nhất với mô tả chi tiết
- **Standard DnD Turn-based Combat**: Cơ chế combat theo lượt chuẩn DnD với initiative rolls
- **Combat Turn Descriptions**: Thêm mô tả 1-2 câu cho mỗi lượt combat (VD: "[player name] swings sword at the goblin...")
- **Enemy AI System**: AI cho kẻ thù với 3 mức độ thông minh dựa trên world builder difficulty
- **Mobile Combat Optimization**: Tối ưu hóa giao diện combat cho mobile với responsive layout và touch gestures

### 🎯 Quest System Enhancements
- **Quest-based Combat Encounters**: Tự động tạo kẻ thù phù hợp với quest objectives đang active
- **Combat Objective Tracking**: Theo dõi tiến độ combat objectives trong quest system
- **Fuzzy Matching**: Cải thiện thuật toán so khớp tên enemy, item và NPC cho quest completion
- **Quest Combat Integration**: Tích hợp combat system với quest system để tạo trải nghiệm liền mạch

### 🛡️ Combat Features
- **NPC Challenge System**: NPC có thể thách đấu người chơi khi relationship đạt 'rival' hoặc cao hơn
- **Enhanced Loot System**: Kẻ thù luôn rơi item 'misc' hoặc 'consumable', có cơ hội nhỏ rơi weapon/armor
- **Combat Dialogue Bubbles**: Hiển thị mô tả combat dưới dạng dialogue bubbles thay vì combat log
- **Action Menu Redesign**: Thay đổi nút "Sử Dụng Đồ" thành "Túi Đồ" và "Kết Thúc Lượt"
- **Combat Results Panel**: Hiển thị kết quả combat với rewards và item selection
- **Item Selection Feature**: Cho phép người chơi chọn item muốn nhận từ combat rewards

### 🔧 System Improvements
- **Combat Data JSON Storage**: Lưu trữ kết quả combat dưới dạng JSON để GamePage có thể đọc và cập nhật character stats
- **Health Recovery System**: Cơ chế hồi máu khi time skip (25% cho 2-4h, 50% cho 4-6h, 75% cho 6+h)
- **Dual Level Progression**: Experience từ combat được áp dụng cho cả combatLevel và characterLevel
- **NPC Health Updates**: Cập nhật HP của NPC sau khi bị đánh bại trong combat
- **Random Combat Encounters**: Cơ chế gặp kẻ thù ngẫu nhiên mỗi 3-4 lượt với tỷ lệ dựa trên difficulty
- **AI-Generated Enemy Names**: Sử dụng AI để tạo tên và mô tả kẻ thù thay vì template

### 🐛 Fixed
- **Inventory Reset Bug**: Sửa lỗi inventory bị reset khi nhận item từ combat rewards
- **Combat Log Scrolling**: Sửa lỗi combat log không scroll và overflow container
- **Attack Button Issues**: Sửa lỗi nút attack không register click và duplicate attack prevention
- **Turn Progression**: Sửa lỗi turn không tiến triển sau action của người chơi
- **Defend Mechanism**: Sửa cơ chế defend không giảm damage
- **Combat Log Display**: Sửa lỗi combat log không hiển thị turn cuối khi người chơi bị đánh bại
- **Dice Notation Parsing**: Sửa lỗi parse dice notation với negative modifiers (1d4+-1)
- **Quest Completion**: Sửa lỗi quest completion không nhận diện đúng combat objectives
- **Save/Load System**: Tích hợp combat_history vào save/load system

### 🗑️ Removed
- **Auto-action System**: Loại bỏ hoàn toàn cơ chế auto-chat sau combat để người dùng tự code
- **Extreme Difficulty**: Loại bỏ chế độ "extreme" khỏi world builder, chỉ giữ "easy", "medium", "hard"
- **Debug Logs**: Loại bỏ các console logs không cần thiết để clean up output

## [4.0.0] - 2025-01-05

### 🚀 Performance Optimization
- **Optimized Action Suggestion Service**: Cải thiện hiệu suất xử lý prompt AI
  - **Reduced context size**: Giảm chat history từ 20 xuống 15 tin nhắn gần nhất
  - **Streamlined quest context**: Chỉ hiển thị main quest đầu tiên và side quest đầu tiên
  - **Simplified location context**: Giảm mô tả địa điểm để tiết kiệm token
  - **Optimized adult content detection**: Loại bỏ logic phức tạp không cần thiết
- **Complete Quest System Overhaul**: Đại tu toàn bộ hệ thống quest
  - **New quest chain mechanism**: Hệ thống quest chain với chain_delivery objectives
  - **Enhanced quest UI**: Cải thiện giao diện quest tracker với nút kiểm tra riêng lẻ
  - **Improved quest completion**: Cơ chế hoàn thành quest thông minh hơn
  - **Better quest management**: Quản lý quest hiệu quả hơn với manual completion buttons
- **Enhanced Prompt Efficiency**: Tối ưu hóa prompt để giảm thời gian xử lý
  - **Shorter action descriptions**: Giảm từ 10-15 từ xuống 8-12 từ
  - **Cleaner JSON output**: Yêu cầu AI chỉ trả về JSON thuần túy, không có markdown
  - **Focused content guidance**: Tập trung vào cốt truyện và nhiệm vụ hơn nội dung 18+
- **Improved Content Balance**: Cân bằng nội dung tình dục và cốt truyện
  - **Priority system**: Cốt truyện > Quest > Hành động thường > 18+
  - **Context-specific 18+ content**: Chỉ tạo gợi ý 18+ khi có context cụ thể
  - **Reduced sexual suggestions**: Giảm đáng kể gợi ý tình dục không liên quan

### 🔧 Changed
- **Action Suggestion Logic**: Cải thiện logic tạo gợi ý hành động
  - **Better content filtering**: Lọc nội dung 18+ hiệu quả hơn
  - **Smarter context analysis**: Phân tích context thông minh hơn
  - **Optimized token usage**: Sử dụng token AI hiệu quả hơn
- **Quest System Integration**: Tích hợp tốt hơn với quest system
  - **Focused quest display**: Chỉ hiển thị quest quan trọng nhất
  - **Reduced quest context**: Giảm thông tin quest không cần thiết

### 🐛 Fixed
- **Performance Issues**: Sửa các vấn đề hiệu suất trong xử lý prompt
- **Content Balance**: Cân bằng nội dung tình dục và cốt truyện
- **Token Usage**: Tối ưu hóa việc sử dụng token AI

## [3.2.0] - 2025-01-05

### 🎯 Added
- **Hệ thống Combat Level cho người chơi**: Combat Level riêng biệt dựa trên số lần tham gia chiến đấu
  - **Công thức level**: Level 1-2 cần 1 battle, mỗi level sau cần số lẻ tiếp theo (3,5,7,9...)
  - **Giới hạn tối đa**: Combat Level 30
  - **Progress bar**: Thanh tiến độ hiển thị số battles hiện tại/tổng cần thiết
  - **Auto level up**: Tự động tăng Combat Level khi đủ battles
- **Combat Level Service**: Service quản lý Combat Level với các tính năng:
  - `calculateCombatLevel()`: Tính Combat Level dựa trên số battles
  - `addCombatExperience()`: Thêm combat experience và kiểm tra level up
  - `getCombatLevelInfo()`: Lấy thông tin chi tiết về Combat Level
  - `getBattlesNeededForLevel()`: Tính số battles cần để lên level cụ thể
- **Combat Level UI**: Hiển thị Combat Level trong InfoMenu với:
  - Progress bar màu cam để phân biệt với Character Level
  - Hiển thị format "X/Y (Level Z)" giống thanh XP
  - Thông tin số battles cần để lên level tiếp theo
- **Combat Experience Integration**: Tích hợp vào CombatPage để tự động tăng combat experience khi kết thúc combat
- **Character Interface Update**: Thêm `combatExperience` field vào Character interface
- **Character Creation Integration**: Tự động khởi tạo Combat Level cho character mới

### 🔧 Changed
- **Combat Level Display**: Combat Level hiển thị đúng theo yêu cầu:
  - Level 1: 0/1 (cần 1 battle để lên Level 2)
  - Level 2: 0/3 (cần 3 battles để lên Level 3)
  - Level 3: 0/5 (cần 5 battles để lên Level 4)
- **InfoMenu Layout**: Bỏ dòng Character Level dưới thanh máu, chỉ hiển thị Combat Level
- **Combat Level Logic**: Sửa logic tính toán để hiển thị đúng số battles cần thiết

### 🐛 Fixed
- **Combat Level Calculation**: Sửa lỗi tính toán Combat Level để phù hợp với yêu cầu
- **Progress Bar Display**: Sửa lỗi hiển thị progress bar cho Combat Level
- **TypeScript Errors**: Sửa các lỗi TypeScript liên quan đến Combat Level

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