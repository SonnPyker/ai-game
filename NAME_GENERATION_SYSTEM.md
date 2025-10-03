# 🎲 Hệ Thống Tạo Tên Đa Dạng

## Tổng Quan

Hệ thống tạo tên mới được thiết kế để tạo ra tên nhân vật và NPC đa dạng, phong phú với nhiều văn hóa và phong cách khác nhau.

## ✨ Tính Năng Chính

### 🌍 Đa Văn Hóa
- **Việt Nam**: Tên truyền thống Việt Nam với họ và tên phổ biến
- **Nhật Bản**: Tên Nhật Bản với phát âm và ý nghĩa
- **Trung Quốc**: Tên Trung Quốc cổ điển và hiện đại
- **Hàn Quốc**: Tên Hàn Quốc với cấu trúc họ-tên
- **Phương Tây**: Tên Anh-Mỹ phổ biến
- **Fantasy**: Tên thần thoại và phép thuật
- **Sci-Fi**: Tên tương lai và không gian
- **Trung Cổ**: Tên hiệp sĩ và quý tộc

### 🎯 Loại Tên
- **Họ và tên**: Tên đầy đủ với họ và tên
- **Tên**: Chỉ tên riêng
- **Họ**: Chỉ họ
- **Biệt danh**: Tên gọi thân mật
- **Danh hiệu**: Chức vụ và tước hiệu

### ⚙️ Tùy Chọn
- **Giới tính**: Nam, Nữ, Trung tính, Bất kỳ
- **Độ dài**: Ngắn, Trung bình, Dài
- **Phong cách**: Truyền thống, Hiện đại, Độc đáo, Cổ điển

## 🚀 Cách Sử Dụng

### 1. Trong CharacterCreationPage

```typescript
// Tạo tên nhanh
const name = nameGenerationService.generateName({
  culture: 'vietnamese',
  gender: 'male',
  type: 'full',
  length: 'medium',
  style: 'traditional'
});

// Tạo nhiều tên
const names = nameGenerationService.generateMultipleNames(6, options);
```

### 2. Tạo tên theo thể loại game

```typescript
// Tự động chọn văn hóa phù hợp
const name = nameGenerationService.generateNameForGenre('fantasy', 'male');
```

### 3. Tạo tên NPC

```typescript
// Tạo tên NPC với vai trò và phe phái
const npcName = nameGenerationService.generateNPCName('thương gia', 'phe thương nhân', 'female');
```

## 📊 Cơ Sở Dữ Liệu

### Số Lượng Tên
- **Việt Nam**: 40+ tên nam, 40+ tên nữ, 30+ họ
- **Nhật Bản**: 30+ tên nam, 30+ tên nữ, 30+ họ
- **Trung Quốc**: 30+ tên nam, 30+ tên nữ, 30+ họ
- **Hàn Quốc**: 30+ tên nam, 30+ tên nữ, 20+ họ
- **Phương Tây**: 30+ tên nam, 30+ tên nữ, 30+ họ
- **Fantasy**: 20+ tên nam, 20+ tên nữ, 20+ họ
- **Sci-Fi**: 20+ tên nam, 20+ tên nữ, 20+ họ
- **Trung Cổ**: 20+ tên nam, 20+ tên nữ, 20+ họ

### Thông Tin Bổ Sung
- **Ý nghĩa**: Giải thích ý nghĩa của tên
- **Phát âm**: Hướng dẫn phát âm (tiếng Việt, Nhật)
- **Văn hóa**: Nguồn gốc văn hóa của tên
- **Giới tính**: Phù hợp với giới tính nào

## 🎮 Tích Hợp Vào Game

### 1. CharacterCreationPage
- Nút tạo tên nhanh (Shuffle icon)
- Trình tạo tên đầy đủ (Star icon)
- Tùy chọn văn hóa, giới tính, loại tên
- Hiển thị ý nghĩa và phát âm

### 2. GeminiService
- Tự động tạo tên khi AI không tạo được tên
- Chọn văn hóa dựa trên thể loại thế giới
- Tạo tên phù hợp với bối cảnh game

### 3. NPC Generation
- Tạo tên NPC phù hợp với vai trò
- Tránh trùng lặp với tên nhân vật chính
- Hỗ trợ tạo tên theo phe phái

## 🔧 API Reference

### NameGenerationService

#### `generateName(options: NameGenerationOptions): GeneratedName`
Tạo một tên duy nhất theo tùy chọn.

#### `generateMultipleNames(count: number, options: NameGenerationOptions): GeneratedName[]`
Tạo nhiều tên cùng lúc.

#### `generateNameForGenre(genre: string, gender?: string): GeneratedName`
Tạo tên theo thể loại game.

#### `generateNPCName(role: string, faction?: string, gender?: string): GeneratedName`
Tạo tên NPC với thông tin bổ sung.

### Interfaces

```typescript
interface NameGenerationOptions {
  gender?: 'male' | 'female' | 'neutral' | 'any';
  culture?: 'vietnamese' | 'japanese' | 'chinese' | 'korean' | 'western' | 'fantasy' | 'sci-fi' | 'medieval' | 'any';
  type?: 'first' | 'last' | 'full' | 'nickname' | 'title';
  length?: 'short' | 'medium' | 'long';
  style?: 'traditional' | 'modern' | 'unique' | 'classic';
}

interface GeneratedName {
  name: string;
  meaning?: string;
  pronunciation?: string;
  culture: string;
  gender: string;
  type: string;
}
```

## 🎨 UI Components

### NameGeneratorDemo
Component demo để test hệ thống tạo tên:
- Giao diện đầy đủ với tất cả tùy chọn
- Tạo 1 tên hoặc 12 tên cùng lúc
- Hiển thị thông tin chi tiết về tên
- Thống kê hệ thống

### CharacterCreationPage Integration
- Nút tạo tên nhanh trong input tên
- Modal trình tạo tên đầy đủ
- Tích hợp với form tạo nhân vật

## 🚀 Cải Tiến Tương Lai

### 1. Mở Rộng Cơ Sở Dữ Liệu
- Thêm nhiều văn hóa khác (Ấn Độ, Ả Rập, Châu Phi...)
- Tăng số lượng tên cho mỗi văn hóa
- Thêm tên theo chủ đề (ma thuật, công nghệ...)

### 2. Tính Năng Nâng Cao
- Tạo tên theo tính cách nhân vật
- Tạo tên theo thời đại lịch sử
- Tạo tên theo địa vị xã hội
- Tạo tên theo nghề nghiệp

### 3. AI Integration
- Sử dụng AI để tạo tên mới
- Học từ tên người dùng tạo
- Tạo tên theo mô tả cụ thể

### 4. Personalization
- Lưu tên yêu thích
- Tạo danh sách tên cá nhân
- Chia sẻ tên với cộng đồng

## 📝 Ghi Chú

- Hệ thống sử dụng seed dựa trên tên để đảm bảo tính nhất quán
- Tất cả tên đều được validate để tránh trùng lặp
- Hỗ trợ Unicode đầy đủ cho tên quốc tế
- Tương thích với tất cả trình duyệt hiện đại

## 🐛 Troubleshooting

### Lỗi thường gặp:
1. **"Văn hóa không được hỗ trợ"**: Kiểm tra tên văn hóa có đúng không
2. **"Giới tính không được hỗ trợ"**: Sử dụng 'male', 'female', 'neutral', hoặc 'any'
3. **Tên trùng lặp**: Hệ thống sẽ tự động tạo tên mới sau 10 lần thử

### Debug:
- Bật console để xem log tạo tên
- Kiểm tra options có hợp lệ không
- Thử với culture='any' và gender='any' trước
