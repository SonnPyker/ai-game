# 📋 Cập Nhật Quy Tắc Quest System

## Tổng Quan

Đã thêm quy tắc rõ ràng về việc tạo quest để đảm bảo:
- **Signature Quest**: Chỉ được tạo 1 lần duy nhất cho mỗi địa điểm phụ
- **Side Quest Bình Thường**: Tuân thủ quy tắc quest system (tối đa 1 quest mỗi 3-5 turn)

## ✨ Quy Tắc Mới

### 🏛️ Signature Quest (Đặc Trưng Cho Địa Điểm Phụ)

#### Quy Tắc Tạo:
- ✅ **CHỈ được tạo 1 LẦN** duy nhất khi người chơi lần đầu vào địa điểm phụ
- ✅ **KHÔNG được tạo lại** nếu đã có signature quest cho địa điểm đó
- ✅ **Luôn được tạo** khi có NPC đặc trưng mới
- ✅ **Ưu tiên cao nhất** - không bị giới hạn bởi quest system rules

#### Logic Kiểm Tra:
```typescript
// Kiểm tra signature quest đã tồn tại chưa
if (response.sideQuestOffer.isLocationSignature && response.sideQuestOffer.signatureLocationId) {
  const existingSignatureQuest = questSystem.sideQuests.find(quest => 
    quest.isLocationSignature && quest.signatureLocationId === response.sideQuestOffer.signatureLocationId
  );
  
  if (existingSignatureQuest) {
    console.log(`🏛️ Signature quest đã tồn tại cho location ${response.sideQuestOffer.signatureLocationId}, bỏ qua`);
    shouldCreateQuest = false;
  }
}
```

### 🎯 Side Quest Bình Thường

#### Quy Tắc Tạo:
- ✅ **Tuân thủ quest system**: tối đa 1 side quest mỗi 3-5 turn
- ✅ **CHỈ tạo khi phù hợp** với tình huống và câu chuyện
- ✅ **KHÔNG tạo nếu** đã có quá nhiều quest active
- ✅ **Ưu tiên thấp hơn** signature quest

#### Logic Kiểm Tra:
```typescript
// Kiểm tra quest system rules cho side quest bình thường
if (!response.sideQuestOffer.isLocationSignature) {
  // Kiểm tra tần suất tạo side quest (tối đa 1 quest mỗi 3-5 turn)
  const recentSideQuests = questSystem.sideQuests.filter(quest => 
    quest.turnCreated && turnCounter && (turnCounter - quest.turnCreated) <= 5
  );
  
  if (recentSideQuests.length > 0) {
    console.log(`🎯 Đã có ${recentSideQuests.length} side quest trong 5 turn gần đây, bỏ qua quest mới`);
    shouldCreateQuest = false;
  }
}
```

## 🤖 AI Prompt Template

### Hướng Dẫn Quy Tắc Quest:

```
QUAN TRỌNG VỀ QUY TẮC TẠO QUEST:
- SIGNATURE QUEST (đặc trưng cho địa điểm phụ):
  * CHỈ được tạo 1 LẦN duy nhất khi người chơi lần đầu vào địa điểm phụ
  * KHÔNG được tạo lại nếu đã có signature quest cho địa điểm đó
  * Luôn được tạo khi có NPC đặc trưng mới
- SIDE QUEST BÌNH THƯỜNG:
  * Tuân thủ quy tắc quest system: tối đa 1 side quest mỗi 3-5 turn
  * CHỈ tạo khi phù hợp với tình huống và câu chuyện
  * KHÔNG tạo nếu đã có quá nhiều quest active
  * Ưu tiên signature quest hơn side quest bình thường
```

## 🔄 Quy Trình Hoạt Động

### 1. **AI Tạo Quest Offer**
- AI phân tích tình huống và quyết định tạo quest
- Xác định loại quest: signature hay side quest bình thường

### 2. **GamePage Kiểm Tra Quy Tắc**
```typescript
// Bước 1: Kiểm tra signature quest đã tồn tại chưa
if (isLocationSignature) {
  checkExistingSignatureQuest();
}

// Bước 2: Kiểm tra quest system rules cho side quest bình thường
if (!isLocationSignature) {
  checkQuestSystemRules();
}

// Bước 3: Tạo quest nếu đủ điều kiện
if (shouldCreateQuest) {
  showQuestOfferModal();
}
```

### 3. **Kết Quả**
- ✅ **Signature Quest**: Tạo ngay lập tức (chỉ 1 lần)
- ✅ **Side Quest**: Tạo nếu tuân thủ quest system rules
- ❌ **Bỏ qua**: Nếu vi phạm quy tắc

## 📊 Ví Dụ Hoạt Động

### Scenario 1: Lần Đầu Vào Địa Điểm Phụ
```
Player vào "Quán Rượu Lão Rượu" (lần đầu)
→ AI tạo NPC đặc trưng "Lão Rượu"
→ AI tạo signature quest "Thu thập thông tin"
→ GamePage: Kiểm tra → Chưa có signature quest → Tạo quest
→ Result: ✅ Quest được tạo
```

### Scenario 2: Vào Lại Địa Điểm Phụ
```
Player vào lại "Quán Rượu Lão Rượu"
→ AI tạo signature quest "Thu thập thông tin" (lại)
→ GamePage: Kiểm tra → Đã có signature quest → Bỏ qua
→ Result: ❌ Quest bị bỏ qua
```

### Scenario 3: Side Quest Bình Thường
```
Player ở địa điểm chính, AI muốn tạo side quest
→ GamePage: Kiểm tra → Đã có 1 side quest trong 3 turn gần đây
→ Result: ❌ Quest bị bỏ qua (vi phạm quest system rules)
```

### Scenario 4: Side Quest Sau 5 Turn
```
Player ở địa điểm chính, AI muốn tạo side quest
→ GamePage: Kiểm tra → Không có side quest trong 5 turn gần đây
→ Result: ✅ Quest được tạo
```

## 🎯 Lợi Ích

### 1. **Tránh Duplicate Quest**
- Signature quest không bị tạo lại nhiều lần
- Mỗi địa điểm phụ chỉ có 1 signature quest duy nhất

### 2. **Cân Bằng Gameplay**
- Side quest không spam quá nhiều
- Tuân thủ quest system rules hiện tại

### 3. **Trải Nghiệm Tốt Hơn**
- Người chơi không bị overwhelm bởi quá nhiều quest
- Signature quest đảm bảo nội dung đặc trưng cho địa điểm

### 4. **Logic Rõ Ràng**
- AI hiểu rõ khi nào nên tạo quest
- Hệ thống kiểm tra tự động và chính xác

## 📝 Kết Luận

Việc thêm quy tắc quest system đảm bảo:
- ✅ Signature quest chỉ tạo 1 lần duy nhất
- ✅ Side quest tuân thủ quest system rules
- ✅ Tránh spam quest và duplicate
- ✅ Trải nghiệm game cân bằng và tốt hơn
- ✅ Logic rõ ràng và dễ hiểu

**Hệ thống quest giờ đây hoạt động một cách thông minh và cân bằng!** 🎉
