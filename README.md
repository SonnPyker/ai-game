# 🎮 AI Roleplay Game - Hệ Thống Game Roleplay Được Hỗ Trợ Bởi AI

Một trò chơi roleplay tiên tiến được hỗ trợ bởi AI với khả năng tạo thế giới và nhân vật động, sử dụng Google Gemini API và ComfyUI cho việc tạo ảnh.

## ✨ Tính Năng Chính

### 🌍 **World Builder (Tạo Thế Giới)**
- **Tạo thế giới hoàn chỉnh** với AI hỗ trợ
- **Form đa dạng** với các trường:
  - Ý tưởng cốt lõi (Core Idea)
  - Thể loại (Genre) 
  - Bối cảnh (Setting)
  - Tông màu câu chuyện (Story Tone)
  - Ngôi kể (Narration)
  - Nguyên tắc cốt lõi (Core Principles)
  - Thực thể nền tảng (Foundation Entities)
  - Tiền tệ (Currencies)
  - Năm bắt đầu (Start Year)
  - Độ khó (Difficulty)
  - Sử dụng cấp độ (Use Levels)

- **AI Suggestions**: Gợi ý tự động cho nguyên tắc và thực thể
- **Smart Parsing**: Phân tích và xử lý dữ liệu từ AI
- **Complete World Generation**: Tạo hồ sơ thế giới hoàn chỉnh với:
  - Timeline và sự kiện
  - Phe phái và mục tiêu
  - Địa điểm quan trọng
  - Thực thể chính
  - Hệ thống kinh tế
  - Xung đột và nguy hiểm
  - Quest mở đầu
  - Đoạn văn mở đầu (Narrative Opening)

### 👤 **Character Creation (Tạo Nhân Vật)**
- **Mô tả tự do**: Nhập mô tả nhân vật bằng văn bản tự nhiên
- **AI Analysis**: AI phân tích và tự động điền form
- **Customize Character**: Tùy chỉnh chi tiết:
  - Tên, giới tính, ngoại hình
  - Tính cách và backstory
  - Personality traits
  - Core stats (6 chỉ số chính)
  - Custom stats
  - Proficiencies (kỹ năng)

- **D&D Style Stats**: Hiển thị chỉ số theo phong cách D&D (Score/Modifier)
- **AI Suggestions**: Gợi ý chỉ số phù hợp với mô tả
- **Name Generation**: Hệ thống tạo tên với nhiều tùy chọn
- **Export/Import**: Lưu và tải nhân vật dưới dạng JSON

### 🎯 **Game Chat (Trò Chơi Chính)**
- **AI-Powered Storytelling**: Câu chuyện được tạo bởi AI
- **Natural Prose**: Văn xuôi tự nhiên, không bullet points hay emoji
- **Second Person Narrative**: Sử dụng "bạn" thay vì tên nhân vật
- **Dynamic Responses**: Phản hồi dựa trên thế giới và nhân vật
- **Save/Load System**: Lưu và tải tiến trình game
- **Auto-save**: Tự động lưu khi bắt đầu game
- **Image Generation**: Tạo ảnh minh họa cho các cảnh quan trọng
- **ComfyUI Integration**: Tích hợp ComfyUI cho việc tạo ảnh chất lượng cao

### ⚔️ **Combat System (Hệ Thống Chiến Đấu)**
- **Turn-based Combat**: Chiến đấu theo lượt với AI thông minh
- **Combat Stats**: Hệ thống chỉ số chiến đấu D&D style
- **Status Effects**: Hiệu ứng trạng thái và buff/debuff
- **Equipment System**: Trang bị vũ khí và áo giáp
- **Combat Skills**: Kỹ năng chiến đấu với cooldown
- **Combat Narration**: Mô tả chi tiết các hành động chiến đấu
- **Combat History**: Lưu trữ lịch sử chiến đấu
- **Random Combat**: Chiến đấu ngẫu nhiên với kẻ thù
- **Quest Combat**: Chiến đấu liên quan đến nhiệm vụ

### 🎯 **Quest System (Hệ Thống Nhiệm Vụ)**
- **Main Quests**: Nhiệm vụ chính theo từng act
- **Side Quests**: Nhiệm vụ phụ được tạo động
- **Faction Quests**: Nhiệm vụ theo phe phái
- **Quest Objectives**: Mục tiêu chi tiết với tracking
- **Quest Rewards**: Phần thưởng đa dạng (kinh nghiệm, vật phẩm, tiền)
- **Quest Detection**: AI tự động phát hiện và tạo quest
- **Quest Completion**: Hệ thống hoàn thành quest thông minh
- **Delivery Quests**: Nhiệm vụ giao hàng
- **Quest Chains**: Chuỗi nhiệm vụ liên kết

### 🗺️ **Location & Travel System**
- **Dynamic Locations**: Địa điểm được tạo động
- **Location Types**: Shop, Story, Secondary locations
- **Travel System**: Di chuyển giữa các địa điểm
- **Location Signatures**: NPC và quest đặc trưng cho từng địa điểm
- **Map View**: Xem bản đồ thế giới
- **Location History**: Lịch sử di chuyển

### 🛒 **Merchant & Trading System**
- **Merchant Shops**: Cửa hàng với NPC merchant
- **Dynamic Inventory**: Hàng hóa thay đổi theo thời gian
- **Skill Books**: Sách kỹ năng có thể mua
- **Negotiation System**: Hệ thống thương lượng giá
- **Trading History**: Lịch sử giao dịch
- **Currency System**: Hệ thống tiền tệ đa dạng

### 👥 **NPC Relationship System**
- **Dynamic NPCs**: NPC được tạo và phát triển động
- **Relationship Tracking**: Theo dõi mối quan hệ với NPC
- **Reputation System**: Hệ thống danh tiếng
- **Faction Reputation**: Danh tiếng theo phe phái
- **NPC Arousal System**: Hệ thống hấp dẫn cho nội dung 18+
- **NPC Dialogue**: Hội thoại thông minh với NPC
- **NPC Combat**: NPC có thể tham gia chiến đấu

### 🎒 **Inventory & Equipment System**
- **Comprehensive Inventory**: Hệ thống túi đồ chi tiết
- **Equipment Slots**: Vũ khí, áo giáp, phụ kiện
- **Item Rarity**: Độ hiếm vật phẩm (common, uncommon, rare, epic, legendary)
- **Item Stats**: Chỉ số vật phẩm ảnh hưởng đến nhân vật
- **Consumables**: Vật phẩm tiêu hao với hiệu ứng đặc biệt
- **Item Trading**: Giao dịch vật phẩm
- **Item Generation**: Tạo vật phẩm động

### 🌳 **Skill Tree System**
- **Combat Skills**: Kỹ năng chiến đấu
- **Social Skills**: Kỹ năng xã hội
- **Skill Points**: Điểm kỹ năng từ level
- **Skill Bonuses**: Bonus từ kỹ năng
- **Skill Learning**: Học kỹ năng mới
- **Skill Reset**: Reset kỹ năng (có phí)

### 📊 **Level & Experience System**
- **Character Level**: Cấp độ tổng thể
- **Combat Level**: Cấp độ chiến đấu riêng
- **Experience Points**: Điểm kinh nghiệm
- **Level Bonuses**: Bonus từ level
- **Skill Points**: Điểm kỹ năng từ level

### ⏰ **World Time System**
- **Dynamic Time**: Thời gian thế giới thay đổi
- **Time-based Events**: Sự kiện theo thời gian
- **Day/Night Cycle**: Chu kỳ ngày/đêm
- **Time Tracking**: Theo dõi thời gian chi tiết

### 🎨 **Image Generation System**
- **ComfyUI Integration**: Tích hợp ComfyUI cho tạo ảnh
- **Multiple Art Styles**: Nhiều phong cách nghệ thuật
- **Character Consistency**: Nhất quán hình ảnh nhân vật
- **LoRA Support**: Hỗ trợ LoRA models
- **Custom Prompts**: Prompt tùy chỉnh
- **Image Storage**: Lưu trữ ảnh đã tạo

### 💾 **Save & Load System**
- **Multiple Save Slots**: 3 slot lưu game
- **Cloud Sync**: Đồng bộ với cloud (Supabase)
- **Local Storage**: Lưu trữ local
- **Auto-save**: Tự động lưu
- **Migration System**: Hệ thống chuyển đổi dữ liệu
- **Save Management**: Quản lý file lưu

### ⚙️ **Settings & API Management**
- **Single API Key**: Quản lý một API key đơn giản
- **Multi-API Key System**: Hệ thống quản lý nhiều API keys:
  - Thêm/xóa/sửa API keys
  - Rotation tự động
  - Error tracking và statistics
  - Auto-switch khi key bị lỗi
  - Test API keys với metrics chi tiết

- **API Key Testing**: 
  - Test từng key riêng lẻ
  - Test tất cả keys cùng lúc
  - Hiển thị thời gian phản hồi
  - Error messages chi tiết
  - Performance metrics

### 🔄 **Auto-Switch API Key**
- **Smart Error Detection**: Phát hiện lỗi nghiêm trọng
- **Immediate Switch**: Chuyển key ngay khi gặp lỗi
- **Critical Errors**: API key invalid, quota exceeded, permission denied
- **Manual Control**: Nút "Tự Động Chuyển" và "Chuyển Tiếp"
- **Seamless Experience**: Người dùng không cần can thiệp

### 🎮 **Action Suggestion System**
- **AI Suggestions**: Gợi ý hành động từ AI
- **Quest-based Actions**: Hành động dựa trên quest
- **Heuristic Actions**: Hành động theo quy tắc
- **Action Log**: Lịch sử hành động
- **DC Checks**: Kiểm tra độ khó
- **Action Impact**: Tác động của hành động

### 🎲 **Dice Rolling System**
- **D&D Style Dice**: Xúc xắc theo phong cách D&D
- **Multiple Dice Types**: Nhiều loại xúc xắc
- **Modifier Support**: Hỗ trợ modifier
- **Roll History**: Lịch sử tung xúc xắc

### 📱 **Responsive UI/UX**
- **Mobile Optimized**: Tối ưu cho mobile
- **Desktop Support**: Hỗ trợ desktop
- **Responsive Design**: Thiết kế responsive
- **Touch Controls**: Điều khiển cảm ứng
- **Keyboard Shortcuts**: Phím tắt bàn phím

### 🎨 **Modern UI Design**
- **Dark Theme**: Giao diện tối với gradient backgrounds
- **Glass Effect**: Hiệu ứng kính mờ cho cards
- **Smooth Animations**: Chuyển động mượt mà với Framer Motion
- **Clear Typography**: Font rõ ràng, dễ đọc
- **Intuitive Navigation**: Điều hướng trực quan

### 🔧 **Advanced Features**
- **Content Flags**: Cờ nội dung 18+
- **Adult Content Control**: Kiểm soát nội dung người lớn
- **Debug Tools**: Công cụ debug
- **Performance Monitoring**: Giám sát hiệu suất
- **Error Handling**: Xử lý lỗi thông minh
- **Caching System**: Hệ thống cache
- **Memory Management**: Quản lý bộ nhớ

## 🛠️ Công Nghệ Sử Dụng

### **Frontend**
- **React 19** + **TypeScript**
- **Vite** (Build Tool)
- **Tailwind CSS** (Styling)
- **Framer Motion** (Animations)
- **Lucide React** (Icons)
- **React Router DOM** (Routing)

### **Backend & AI**
- **Google Gemini API** (AI Integration)
- **ComfyUI** (Image Generation)
- **Supabase** (Cloud Storage)

### **Storage**
- **LocalStorage** (Local Storage)
- **Supabase** (Cloud Storage)
- **IndexedDB** (Advanced Local Storage)

### **State Management**
- **React Hooks** (State Management)
- **Context API** (Global State)
- **Custom Hooks** (Reusable Logic)

## 🚀 Cài Đặt Và Chạy

### **Yêu Cầu Hệ Thống**
- Node.js 18+
- npm hoặc yarn
- Google Gemini API key
- (Tùy chọn) ComfyUI server cho tạo ảnh

### **Cài Đặt**
```bash
# Clone repository
git clone <repository-url>
cd ai-game-test-2

# Cài đặt dependencies
npm install

# Chạy development server
npm run dev

# Build cho production
npm run build
```

### **Cấu Hình API Key**
1. Vào **Settings** → **API Key Configuration**
2. Nhập Google Gemini API key
3. Test key để đảm bảo hoạt động
4. (Tùy chọn) Thêm nhiều keys trong **Multi-API Key Manager**

### **Cấu Hình ComfyUI (Tùy Chọn)**
1. Cài đặt ComfyUI server
2. Vào **Settings** → **ComfyUI Settings**
3. Cấu hình server URL và settings
4. Test kết nối

## 🎮 Cách Chơi

### **1. Tạo Thế Giới**
1. Vào **World Builder**
2. Điền **Ý tưởng cốt lõi** (bắt buộc)
3. Sử dụng **AI Suggestions** để tạo nguyên tắc và thực thể
4. Điền các thông tin khác (tùy chọn)
5. Nhấn **"Tạo Thế Giới & Chuyển Tiếp"**

### **2. Tạo Nhân Vật**
1. Vào **Character Creation**
2. Nhập **mô tả nhân vật** tự do
3. AI sẽ phân tích và điền form
4. Tùy chỉnh chi tiết nếu cần
5. Nhấn **"Accept & Start"**

### **3. Bắt Đầu Game**
1. Vào **Game Chat**
2. AI sẽ tạo đoạn mở đầu
3. Trò chuyện với AI để phát triển câu chuyện
4. Sử dụng **Save** để lưu tiến trình

### **4. Khám Phá Thế Giới**
1. Sử dụng **Info Menu** để xem thông tin
2. Khám phá **Locations** mới
3. Tương tác với **NPCs**
4. Nhận và hoàn thành **Quests**

### **5. Chiến Đấu**
1. Gặp kẻ thù trong game
2. Vào **Combat Page**
3. Sử dụng kỹ năng và vật phẩm
4. Chiến thắng để nhận phần thưởng

## 📱 Giao Diện Người Dùng

### **🎨 Design System**
- **Dark Theme**: Giao diện tối với gradient backgrounds
- **Glass Effect**: Hiệu ứng kính mờ cho cards
- **Responsive**: Tương thích mobile và desktop
- **Smooth Animations**: Chuyển động mượt mà với Framer Motion
- **Clear Typography**: Font rõ ràng, dễ đọc

### **🎯 User Experience**
- **Intuitive Navigation**: Điều hướng trực quan
- **Loading States**: Hiển thị trạng thái loading
- **Error Handling**: Xử lý lỗi thân thiện
- **Form Validation**: Kiểm tra dữ liệu đầu vào
- **Auto-save**: Tự động lưu tiến trình

## 🔧 Cấu Trúc Dự Án

```
src/
├── components/          # React components
│   ├── WorldBuilder/   # World creation components
│   ├── Settings/       # Settings và API management
│   ├── Game/          # Game chat components
│   ├── CombatPage/    # Combat system components
│   ├── QuestTracker/  # Quest system components
│   ├── InfoMenu/      # Information menu components
│   ├── Shop/          # Merchant shop components
│   └── Layout.tsx     # Main layout
├── services/          # Business logic
│   ├── geminiService.ts      # AI service chính
│   ├── multiApiKeyService.ts # Multi-key management
│   ├── combatService.ts      # Combat system
│   ├── questDetectionService.ts # Quest system
│   ├── npcRelationshipService.ts # NPC relationships
│   ├── inventoryService.ts   # Inventory management
│   ├── comfyUIService.ts     # Image generation
│   └── saveStorage/          # Save system
├── types/             # TypeScript definitions
├── hooks/             # Custom React hooks
├── contexts/          # React contexts
├── utils/             # Utility functions
└── pages/            # Page components
```

## 🎮 Tính Năng Nâng Cao

### **🤖 AI Integration**
- **Google Gemini API**: AI chính cho storytelling
- **Multi-API Key Support**: Hỗ trợ nhiều API keys
- **Auto-Switch**: Tự động chuyển key khi lỗi
- **Error Recovery**: Khôi phục lỗi thông minh
- **Performance Monitoring**: Giám sát hiệu suất

### **🎨 Image Generation**
- **ComfyUI Integration**: Tích hợp ComfyUI
- **Multiple Art Styles**: Nhiều phong cách nghệ thuật
- **Character Consistency**: Nhất quán hình ảnh
- **LoRA Support**: Hỗ trợ LoRA models
- **Custom Prompts**: Prompt tùy chỉnh

### **💾 Advanced Save System**
- **Cloud Sync**: Đồng bộ với Supabase
- **Local Storage**: Lưu trữ local
- **Migration System**: Chuyển đổi dữ liệu
- **Multiple Slots**: Nhiều slot lưu game
- **Auto-save**: Tự động lưu

### **🎯 Quest System**
- **Dynamic Quest Generation**: Tạo quest động
- **Quest Chains**: Chuỗi nhiệm vụ
- **Faction Quests**: Nhiệm vụ phe phái
- **Delivery Quests**: Nhiệm vụ giao hàng
- **Quest Completion**: Hoàn thành quest thông minh

### **👥 NPC System**
- **Dynamic NPCs**: NPC được tạo động
- **Relationship Tracking**: Theo dõi mối quan hệ
- **Arousal System**: Hệ thống hấp dẫn 18+
- **NPC Combat**: NPC có thể chiến đấu
- **Faction Reputation**: Danh tiếng phe phái

## 🐛 Troubleshooting

### **API Key Issues**
- **Invalid Key**: Kiểm tra key có đúng format không
- **Quota Exceeded**: Thêm key mới hoặc đợi reset quota
- **Permission Denied**: Kiểm tra quyền truy cập API

### **Performance Issues**
- **Slow Response**: Sử dụng multi-key để load balancing
- **Timeout**: Kiểm tra kết nối internet
- **Memory Issues**: Clear browser cache

### **Game Issues**
- **Save Not Working**: Kiểm tra localStorage permissions
- **Character Not Loading**: Verify character data format
- **World Not Generating**: Check API key và network

## 📈 Roadmap

### **Đã Hoàn Thành ✅**
- World Builder với AI integration
- Character Creation với AI analysis
- Multi-API key management
- Auto-switch API key system
- Save/Load system
- Responsive UI/UX
- Combat system
- Quest system
- NPC relationship system
- Inventory & equipment system
- Image generation system
- Skill tree system
- Merchant & trading system

### **Đang Phát Triển 🚧**
- Enhanced game mechanics
- More AI models support
- Advanced character customization
- World persistence improvements

### **Kế Hoạch 📋**
- Multiplayer support
- Advanced cloud save system
- More AI features
- Mobile app
- Community features
- Voice integration

## 🤝 Đóng Góp

1. Fork repository
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Mở Pull Request

## 🌐 Deployment

### **Vercel (Recommended)**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Hoặc kết nối repository với [Vercel Dashboard](https://vercel.com) để auto-deploy.

### **Build Cho Production**
```bash
npm run build
```

Xem [README-DEPLOYMENT.md](./README-DEPLOYMENT.md) để biết chi tiết về deployment.

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

## 📞 Liên Hệ


---

**Made with ❤️ and AI**