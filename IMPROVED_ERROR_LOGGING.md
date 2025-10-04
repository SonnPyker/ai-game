# Cải Thiện Logging Lỗi AI Response

## Vấn Đề
Từ console log, có thể thấy lỗi "AI response chứa thông báo lỗi" đang xảy ra, nhưng không rõ nguyên nhân cụ thể.

## Cải Thiện Đã Thực Hiện

### 1. Cải Thiện Validation Pattern
**Trước:**
```typescript
// Kiểm tra quá nghiêm ngặt
if (narrative.includes('error') || narrative.includes('lỗi') || 
    narrative.includes('failed') || narrative.includes('thất bại') || 
    narrative.includes('cannot') || narrative.includes('không thể')) {
  return { isValid: false, error: 'AI response chứa thông báo lỗi' };
}
```

**Sau:**
```typescript
// Kiểm tra pattern lỗi cụ thể hơn
const errorPatterns = [
  'error:', 'lỗi:', 'failed:', 'thất bại:',
  'cannot generate', 'không thể tạo',
  'api error', 'lỗi api',
  'generation failed', 'tạo thất bại',
  'invalid response', 'phản hồi không hợp lệ',
  'sorry, i cannot', 'xin lỗi, tôi không thể',
  'i apologize, but', 'tôi xin lỗi, nhưng'
];

const hasErrorPattern = errorPatterns.some(pattern => narrative.includes(pattern));
if (hasErrorPattern) {
  console.error('🚫 AI response chứa thông báo lỗi:', {
    narrative: response.narrative,
    detectedPatterns: errorPatterns.filter(pattern => narrative.includes(pattern))
  });
  return { isValid: false, error: 'AI response chứa thông báo lỗi' };
}
```

### 2. Thêm Logging Chi Tiết AI Response
```typescript
console.log('🤖 Gọi AI API với context:', {
  turnCounter: turnCounter,
  enhancedMessage: enhancedMessage,
  contentFlags: gameState.contentFlags,
  worldTime: gameState.worldTime
});

console.log('🤖 AI response nhận được:', {
  hasResponse: !!response,
  hasNarrative: !!response?.narrative,
  narrativeLength: response?.narrative?.length,
  narrativePreview: response?.narrative?.substring(0, 100) + '...',
  hasSceneState: !!response?.sceneState,
  hasStoryProgress: !!response?.storyProgress
});
```

### 3. Cải Thiện Logging Validation Lỗi
```typescript
if (!validation.isValid) {
  console.error('🚫 AI response validation failed:', {
    error: validation.error,
    response: response,
    narrative: response?.narrative,
    narrativeLength: response?.narrative?.length
  });
  throw new Error(validation.error || 'AI response validation failed');
}
```

### 4. Cải Thiện Logging Catch Block
```typescript
} catch (error) {
  console.error('🚫 Lỗi gửi tin nhắn:', {
    error: error,
    errorMessage: error instanceof Error ? error.message : 'Có lỗi xảy ra',
    errorStack: error instanceof Error ? error.stack : undefined,
    aiResponseSuccess: aiResponseSuccess,
    currentMessage: currentMessage,
    turnCounter: turnCounter
  });
  // ...
}
```

## Lợi Ích

### 1. **Debug Dễ Dàng Hơn**
- Thấy được context khi gọi AI API
- Thấy được AI response thực tế nhận được
- Thấy được pattern lỗi cụ thể được detect

### 2. **Validation Chính Xác Hơn**
- Không báo lỗi với nội dung câu chuyện bình thường
- Chỉ báo lỗi với các pattern lỗi thực sự
- Ghi log pattern nào được detect

### 3. **Thông Tin Chi Tiết**
- Stack trace đầy đủ
- Context đầy đủ khi lỗi xảy ra
- Preview của narrative để debug

## Cách Sử Dụng

1. **Mở Developer Console** (F12)
2. **Gửi tin nhắn** trong game
3. **Xem log chi tiết**:
   - `🤖 Gọi AI API với context:` - Context gửi cho AI
   - `🤖 AI response nhận được:` - Response từ AI
   - `🚫 AI response validation failed:` - Lỗi validation (nếu có)
   - `🚫 Lỗi gửi tin nhắn:` - Lỗi tổng thể (nếu có)

## Kết Quả

Bây giờ khi có lỗi, bạn sẽ thấy:
- ✅ **Context đầy đủ** khi gọi AI API
- ✅ **AI response thực tế** nhận được
- ✅ **Pattern lỗi cụ thể** được detect
- ✅ **Stack trace đầy đủ** để debug
- ✅ **Validation chính xác hơn** không báo lỗi sai

Hãy thử gửi tin nhắn lại và xem console log để hiểu rõ hơn về lỗi!
