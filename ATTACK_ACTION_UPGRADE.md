# 🗡️ Attack Action System Upgrade

## Tổng Quan

Hệ thống attack action đã được nâng cấp để tự động tạo combat stats cho enemies xuất hiện trong scene/context khi không tìm thấy NPC tương ứng trong relationships.

## Tính Năng Mới

### 1. Tự Động Tạo Enemy Từ Context
- Khi player chọn attack action mà không tìm thấy NPC trong relationships
- Hệ thống sẽ tự động tạo enemy từ thông tin scene context
- Sử dụng AI để generate combat stats phù hợp

### 2. Logic Lưu Trữ Thông Minh
- **Lưu vào relationships**: Tên cụ thể (ví dụ: "Tinh Linh Lá", "Marcus the Guard")
- **Không lưu**: Tên generic ("con sói", "tên cướp", "những người")

### 3. Tích Hợp AI
- Sử dụng Gemini AI để tạo combat stats dựa trên context
- Fallback về stats cơ bản nếu AI fail
- Tận dụng thông tin từ scene.npcs[] nếu có

## Files Đã Thay Đổi

### Tạo Mới
- `src/services/enemyFromContextService.ts` - Service chính xử lý enemy creation
- `src/test/enemyFromContextService.test.ts` - Test cases
- `ATTACK_ACTION_UPGRADE.md` - Documentation này

### Cập Nhật
- `src/pages/GamePage.tsx` - Hàm `handleAttackAction()` tích hợp enemy creation
- `src/services/actionSuggestionService.ts` - Cập nhật prompt để AI biết có thể đề xuất attack cho enemies

## Cách Hoạt Động

### Flow Mới
1. Player chọn attack action từ suggestions
2. Hệ thống tìm NPC trong relationships
3. **Nếu không tìm thấy:**
   - Kiểm tra `sceneState.npcs[]` có enemy không
   - Nếu có → dùng thông tin từ scene để generate stats
   - Nếu không → dùng AI tạo enemy mới từ context
   - Quyết định có lưu vào relationships hay không
4. Prepare combat stats
5. Tiến hành combat

### Logic Quyết Định Lưu Trữ

```typescript
// Lưu nếu:
- Tên cụ thể (viết hoa chữ cái đầu)
- Không phải generic patterns
- Có description chi tiết từ scene

// Không lưu nếu:
- Tên generic ("con sói", "tên cướp")
- Số nhiều ("những", "các", "đám")
- Tên quá ngắn (< 3 ký tự)
```

## Test Cases

### ✅ Test Cases Đã Implement
1. **NPC existing** - Attack NPC có trong relationships (flow cũ)
2. **Enemy mới cụ thể** - "Tinh Linh Lá" → lưu vào relationships
3. **Enemy generic** - "con sói" → không lưu
4. **Enemy từ scene** - "Linh Hầu thủ vệ" → lưu vào relationships
5. **AI fallback** - Enemy không có trong scene → dùng AI tạo mới

### 🧪 Cách Test
```javascript
// Trong browser console:
window.testEnemyFromContextService()
```

## Lợi Ích

1. **Trải Nghiệm Mượt Mà**: Không còn lỗi "Không tìm thấy NPC" khi attack enemies
2. **Tự Động Hóa**: Hệ thống tự động tạo combat stats phù hợp
3. **Thông Minh**: Chỉ lưu enemies quan trọng, không spam relationships
4. **Tích Hợp AI**: Sử dụng AI để tạo stats phù hợp với context
5. **Fallback An Toàn**: Có fallback khi AI fail

## Cấu Hình

### Environment Variables
- Cần có Gemini API key để sử dụng AI generation
- Fallback stats sẽ được tạo nếu không có AI

### Performance
- Cache enemy info nếu được tạo nhiều lần
- Không gọi AI nếu có info trong scene.npcs[]
- Chỉ lưu vào relationships khi cần thiết

## Troubleshooting

### Lỗi Thường Gặp
1. **"Không thể tạo thông tin cho [enemy]"**
   - Kiểm tra Gemini API key
   - Kiểm tra scene state có hợp lệ không

2. **Enemy không được lưu vào relationships**
   - Kiểm tra tên có phải generic không
   - Kiểm tra logic `shouldSaveEnemy()`

3. **Combat stats không hợp lệ**
   - Kiểm tra AI response parsing
   - Kiểm tra fallback stats generation

### Debug
```javascript
// Enable debug logging
localStorage.setItem('debug_enemy_creation', 'true');

// Check enemy creation logs
console.log('Enemy creation logs:', localStorage.getItem('enemy_creation_logs'));
```

## Tương Lai

### Có Thể Mở Rộng
1. **Enemy Templates**: Tạo templates cho các loại enemy phổ biến
2. **Caching**: Cache enemy stats để tránh tạo lại
3. **AI Optimization**: Tối ưu AI prompts cho từng loại enemy
4. **Visual Feedback**: Hiển thị thông tin enemy được tạo trong UI

### Metrics
- Track số lượng enemies được tạo
- Track tỷ lệ AI success/failure
- Track performance impact
