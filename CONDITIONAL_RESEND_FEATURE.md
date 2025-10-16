# Tính Năng Nút Gửi Lại Có Điều Kiện

## Tổng Quan

Tính năng này thêm logic điều kiện cho nút "gửi lại" trong chat, chỉ hiển thị nút gửi lại cho các hành động thủ công/chat của người chơi, và ẩn nút này cho các hành động từ gợi ý hoặc di chuyển.

## Mục Đích

- **Ngăn chặn xung đột**: Tránh việc người chơi gửi lại hành động từ gợi ý hoặc di chuyển có thể gây xung đột với UI
- **Hướng dẫn người chơi**: Bắt người chơi chọn lại từ UI gợi ý hành động hoặc bản đồ di chuyển
- **Cải thiện UX**: Đảm bảo người chơi sử dụng đúng UI cho từng loại hành động

## Cách Hoạt Động

### 1. Phân Loại Hành Động

Hệ thống phân biệt 3 loại hành động dựa trên `source` trong `ActionLogEntry`:

- **`manual`**: Hành động người chơi tự gõ (hiển thị nút gửi lại)
- **`suggestion`**: Hành động từ gợi ý AI (ẩn nút gửi lại)
- **`travel`**: Hành động di chuyển (ẩn nút gửi lại)

### 2. Logic Kiểm Tra

```typescript
const shouldShowResendButton = (messageIndex: number): boolean => {
  const message = chatHistory[messageIndex];
  if (!message || message.role !== 'player') return false;
  
  const messageTurn = message.turn;
  if (messageTurn) {
    const actionEntry = actionLog.find(entry => entry.turn === messageTurn);
    
    if (actionEntry) {
      // Chỉ hiển thị nút gửi lại cho hành động manual
      return actionEntry.source === 'manual';
    }
  }
  
  // Backward compatibility: hiển thị nút gửi lại mặc định
  return true;
};
```

### 3. Xử Lý Khi Người Chơi Cố Gắng Gửi Lại

Khi người chơi cố gắng gửi lại hành động không được phép:

- **Hành động từ gợi ý**: Hiển thị thông báo "Hành động này từ gợi ý. Vui lòng chọn lại từ danh sách gợi ý hành động bên trái."
- **Hành động di chuyển**: Hiển thị thông báo "Hành động di chuyển này. Vui lòng chọn lại địa điểm trên bản đồ để di chuyển."

## Các Thay Đổi Đã Thực Hiện

### 1. GamePage.tsx

- **Thêm function `shouldShowResendButton()`**: Kiểm tra xem có nên hiển thị nút gửi lại
- **Cập nhật `handleResendMessage()`**: Thêm logic kiểm tra loại hành động và hiển thị thông báo
- **Cập nhật render nút gửi lại**: Sử dụng `shouldShowResendButton()` để điều kiện hiển thị

### 2. ChatMessage.tsx

- **Thêm prop `shouldShowResendButton`**: Cho phép component cha kiểm soát việc hiển thị nút
- **Cập nhật logic render**: Chỉ hiển thị nút khi `shouldShowResendButton` là `true`

## Test Cases

File test `src/test/conditionalResendTest.ts` bao gồm các test case:

1. **Suggestion action**: Không hiển thị nút gửi lại
2. **Travel action**: Không hiển thị nút gửi lại  
3. **Manual action**: Hiển thị nút gửi lại
4. **AI message**: Không hiển thị nút gửi lại
5. **Message không có action log**: Hiển thị nút gửi lại (backward compatibility)

## Lợi Ích

1. **Tránh xung đột UI**: Người chơi không thể gửi lại hành động từ gợi ý/di chuyển
2. **Hướng dẫn rõ ràng**: Thông báo cụ thể cho từng loại hành động
3. **UX tốt hơn**: Người chơi được hướng dẫn sử dụng đúng UI
4. **Backward compatibility**: Không ảnh hưởng đến tin nhắn cũ

## Cách Sử Dụng

Tính năng hoạt động tự động, không cần cấu hình thêm. Người chơi sẽ:

- Thấy nút gửi lại cho hành động tự gõ
- Không thấy nút gửi lại cho hành động từ gợi ý/di chuyển
- Nhận thông báo hướng dẫn khi cố gắng gửi lại hành động không được phép

## Tương Lai

Có thể mở rộng tính năng này bằng cách:

- Thêm animation cho nút gửi lại
- Tùy chỉnh thông báo cho từng loại hành động
- Thêm tooltip giải thích tại sao nút bị ẩn
- Logging để theo dõi việc sử dụng tính năng
