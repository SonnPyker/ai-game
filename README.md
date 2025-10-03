# 🎮 AI Roleplay Game

Một trò chơi roleplay được hỗ trợ bởi AI với khả năng tạo thế giới và nhân vật động, sử dụng Google Gemini API.

## ✨ Tính năng chính

### 🌍 World Builder (Tạo Thế Giới)
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

### 👤 Character Creation (Tạo Nhân Vật)
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
- **Export/Import**: Lưu và tải nhân vật dưới dạng JSON

### 🎯 Game Chat (Trò Chơi)
- **AI-Powered Storytelling**: Câu chuyện được tạo bởi AI
- **Natural Prose**: Văn xuôi tự nhiên, không bullet points hay emoji
- **Second Person Narrative**: Sử dụng "bạn" thay vì tên nhân vật
- **Dynamic Responses**: Phản hồi dựa trên thế giới và nhân vật
- **Save/Load System**: Lưu và tải tiến trình game
- **Auto-save**: Tự động lưu khi bắt đầu game

### ⚙️ Settings & API Management
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

### 🔄 Auto-Switch API Key
- **Smart Error Detection**: Phát hiện lỗi nghiêm trọng
- **Immediate Switch**: Chuyển key ngay khi gặp lỗi
- **Critical Errors**: API key invalid, quota exceeded, permission denied
- **Manual Control**: Nút "Tự Động Chuyển" và "Chuyển Tiếp"
- **Seamless Experience**: Người dùng không cần can thiệp

## 🛠️ Công nghệ sử dụng

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **AI Integration**: Google Gemini API
- **Storage**: LocalStorage
- **State Management**: React Hooks

## 🚀 Cài đặt và chạy

### Yêu cầu hệ thống
- Node.js 18+ 
- npm hoặc yarn
- Google Gemini API key

### Cài đặt
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

### Cách chơi
1. **Bắt Đầu Chơi**: Nhấn nút "Bắt Đầu Chơi" trên trang chủ
2. **Tạo Thế Giới**: Xây dựng thế giới game với AI hỗ trợ
3. **Tạo Nhân Vật**: Tạo nhân vật với AI phân tích mô tả
4. **Vào Game**: Bắt đầu cuộc phiêu lưu với AI storytelling

### Cấu hình API Key
1. Vào **Settings** → **API Key Configuration**
2. Nhập Google Gemini API key
3. Test key để đảm bảo hoạt động
4. (Tùy chọn) Thêm nhiều keys trong **Multi-API Key Manager**

## 📱 Giao diện người dùng

### 🎨 Design System
- **Dark Theme**: Giao diện tối với gradient backgrounds
- **Glass Effect**: Hiệu ứng kính mờ cho cards
- **Responsive**: Tương thích mobile và desktop
- **Smooth Animations**: Chuyển động mượt mà với Framer Motion
- **Clear Typography**: Font rõ ràng, dễ đọc

### 🎯 User Experience
- **Intuitive Navigation**: Điều hướng trực quan
- **Loading States**: Hiển thị trạng thái loading
- **Error Handling**: Xử lý lỗi thân thiện
- **Form Validation**: Kiểm tra dữ liệu đầu vào
- **Auto-save**: Tự động lưu tiến trình

## 🔧 Cấu trúc dự án

```
src/
├── components/          # React components
│   ├── WorldBuilder/   # World creation components
│   ├── Settings/       # Settings và API management
│   ├── Game/          # Game chat components
│   └── Layout.tsx     # Main layout
├── services/          # Business logic
│   ├── geminiService.ts      # AI service chính
│   └── multiApiKeyService.ts # Multi-key management
├── types/             # TypeScript definitions
├── constants/         # Game data và constants
└── pages/            # Page components
```

## 🎮 Cách chơi

### 1. Tạo Thế Giới
1. Vào **World Builder**
2. Điền **Ý tưởng cốt lõi** (bắt buộc)
3. Sử dụng **AI Suggestions** để tạo nguyên tắc và thực thể
4. Điền các thông tin khác (tùy chọn)
5. Nhấn **"Tạo Thế Giới & Chuyển Tiếp"**

### 2. Tạo Nhân Vật
1. Vào **Character Creation**
2. Nhập **mô tả nhân vật** tự do
3. AI sẽ phân tích và điền form
4. Tùy chỉnh chi tiết nếu cần
5. Nhấn **"Accept & Start"**

### 3. Bắt Đầu Game
1. Vào **Game Chat**
2. AI sẽ tạo đoạn mở đầu
3. Trò chuyện với AI để phát triển câu chuyện
4. Sử dụng **Save** để lưu tiến trình

## 🔑 API Key Management

### Single Key Mode
- Quản lý một API key đơn giản
- Phù hợp cho cá nhân hoặc testing

### Multi-Key Mode
- Quản lý nhiều API keys
- Rotation tự động
- Error tracking
- Performance monitoring
- Auto-switch khi có lỗi

### Supported Features
- ✅ Add/Remove keys
- ✅ Test individual keys
- ✅ Test all keys
- ✅ Error tracking
- ✅ Usage statistics
- ✅ Auto-rotation
- ✅ Auto-switch on error

## 🐛 Troubleshooting

### API Key Issues
- **Invalid Key**: Kiểm tra key có đúng format không
- **Quota Exceeded**: Thêm key mới hoặc đợi reset quota
- **Permission Denied**: Kiểm tra quyền truy cập API

### Performance Issues
- **Slow Response**: Sử dụng multi-key để load balancing
- **Timeout**: Kiểm tra kết nối internet
- **Memory Issues**: Clear browser cache

### Game Issues
- **Save Not Working**: Kiểm tra localStorage permissions
- **Character Not Loading**: Verify character data format
- **World Not Generating**: Check API key và network

## 📈 Roadmap

### Đã hoàn thành ✅
- World Builder với AI integration
- Character Creation với AI analysis
- Multi-API key management
- Auto-switch API key system
- Save/Load system
- Responsive UI/UX

### Đang phát triển 🚧
- Enhanced game mechanics
- More AI models support
- Advanced character customization
- World persistence

### Kế hoạch 📋
- Multiplayer support
- Cloud save system
- Advanced AI features
- Mobile app
- Community features

## 🤝 Đóng góp

1. Fork repository
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Mở Pull Request

## 🌐 Deployment

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Hoặc kết nối repository với [Vercel Dashboard](https://vercel.com) để auto-deploy.

### Build cho Production
```bash
npm run build
```

Xem [README-DEPLOYMENT.md](./README-DEPLOYMENT.md) để biết chi tiết về deployment.

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

## 📞 Liên hệ

- **Project Link**: [https://github.com/your-username/ai-game-test-2](https://github.com/your-username/ai-game-test-2)
- **Issues**: [https://github.com/your-username/ai-game-test-2/issues](https://github.com/your-username/ai-game-test-2/issues)

---

**Made with ❤️ and AI**