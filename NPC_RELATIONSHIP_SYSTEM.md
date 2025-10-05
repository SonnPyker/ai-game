# 🤝 Hệ Thống Quan Hệ và Danh Tiếng NPC

## 📋 Tổng Quan

Hệ thống quan hệ NPC là một cơ chế phức tạp theo dõi mối quan hệ giữa người chơi và các nhân vật không người chơi (NPCs) trong game. Hệ thống này dựa trên nhiều nguồn dữ liệu để tạo ra trải nghiệm tương tác thực tế và có ý nghĩa.

## 🎯 Thành Phần Chính

### 1. **Relationship Level (Mức Độ Quan Hệ)**
- **Phạm vi**: -100 đến +100
- **Ý nghĩa**: Mức độ thân thiết cá nhân giữa PC và NPC
- **Ảnh hưởng**: Cách NPC phản ứng với PC trong tương tác

### 2. **Reputation (Danh Tiếng)**
- **Phạm vi**: -100 đến +100  
- **Ý nghĩa**: Danh tiếng công khai của PC trong mắt NPC
- **Ảnh hưởng**: Cách NPC khác trong khu vực đối xử với PC

### 3. **Status (Trạng Thái Quan Hệ)**
- **Các loại**:
  - `neutral` - Trung lập (mặc định)
  - `friendly` - Thân thiện (≥80 relationship)
  - `hostile` - Thù địch (≤-60 relationship)
  - `romantic` - Lãng mạn (≥60 relationship + romantic action)
  - `rival` - Đối thủ (-30 to -59 relationship)
  - `mentor` - Thầy giáo (đặc biệt)
  - `student` - Học trò (đặc biệt)

### 4. **Notes (Ghi Chú)**
- Lưu trữ lịch sử tương tác quan trọng
- Tự động tạo dựa trên context
- Tối đa 5 notes mỗi NPC
- Chỉ lưu những ghi chú có ý nghĩa

### 5. **Tags và Metadata**
- `tags[]` - Mô tả vai trò/nghề nghiệp (merchant, noble, criminal...)
- `location` - Vị trí gặp lần cuối
- `faction` - Phe phái thuộc về
- `lastInteraction` - Thời gian tương tác cuối
- `totalInteractions` - Tổng số lần tương tác

## 🧠 Hệ Thống Phân Tích 6 Lớp

### 1. **📝 Immediate Narrative Analysis**
Phân tích narrative hiện tại để detect các action cụ thể:

#### Positive Actions:
- **Cứu mạng/Bảo vệ**: +8 relationship, +4 reputation
- **Giúp đỡ trong khó khăn**: +5 relationship, +2 reputation  
- **Giúp đỡ thường**: +2 relationship
- **Cảm ơn chân thành**: +3 relationship
- **Cảm ơn thường**: +1 relationship
- **Hành động lãng mạn**: +10 relationship

#### Negative Actions:
- **Giết/Sát hại**: -25 relationship, -15 reputation, status → hostile
- **Tấn công/Đánh**: -12 relationship, -6 reputation, status → hostile
- **Lừa dối trực tiếp**: -10 relationship, -8 reputation, status → rival
- **Chửi/Xúc phạm**: -5 relationship, -2 reputation
- **Từ chối gay gắt**: -4 relationship
- **Từ chối thường**: -1 relationship

#### Neutral Actions:
- **Giao dịch thành công**: +1 relationship, +1 reputation
- **Chia sẻ thông tin quan trọng**: +2 relationship
- **Trò chuyện thường**: 0 change (không thay đổi)

### 2. **📚 Chat History Pattern Analysis**
Phân tích 20 tin nhắn gần nhất có mention NPC:
- Đếm sentiment tích cực/tiêu cực
- **Frequency bonus**: +1 nếu ≥8 mentions, +0.5 nếu ≥5 mentions
- **Sentiment bonus**: +1 per positive mention, -1 per negative mention

### 3. **🧠 SCC Summary Integration**
Cross-reference với SCC relationship records:
- **"Thân thiết/Bạn bè"**: +2 relationship, suggest friendly status
- **"Căng thẳng/Xung đột"**: -2 relationship, suggest rival status  
- **"Lãng mạn/Yêu"**: +3 relationship, suggest romantic status

### 4. **🎬 Scene State Context Analysis**
Phân tích môi trường và context hiện tại:
- **NPC mood**: Happy = +1, Angry = -1
- **Private interaction**: +1 relationship (intimate moments)
- **Public interaction**: +1 reputation (visibility)
- **Dangerous situation**: +1 relationship (shared bonds)

### 5. **👤 Personality Compatibility Analysis**
- **Background matching**: Noble + Noble = +2, Merchant + Merchant = +2
- **World theme**: Romantic world = easier romance, Dark world = harder relationships

### 6. **⏰ Temporal Factors Analysis**
- **Time decay**: -1 nếu >7 ngày, -2 nếu >30 ngày (chỉ với relationship <60)
- **Frequency stability**: +1 nếu >10 total interactions

## 🎮 Caps và Balancing

### Change Limits (Per Turn):
- **Relationship Change**: -15 to +15 points max
- **Reputation Change**: -8 to +8 points max

### Status Thresholds:
```
≥ 80:  Friendly
60-79: Neutral (có thể romantic nếu có action)
-10→40: Neutral  
-30→-11: Rival
≤ -60: Hostile
```

### Romantic Status Requirements:
- Relationship level ≥ 60 AND romantic action detected
- Không tự động từ level thấp

## 🛠️ Features và Tools

### Auto-Management:
- **Merge Duplicates**: Gộp NPCs trùng lặp tự động
- **Remove Groups**: Xóa "NPC nhóm" không hợp lệ
- **Fix Statuses**: Sửa status không phù hợp với relationship level

### Manual Management:
- **Delete Individual Relationships**: Xóa quan hệ riêng lẻ
- **Expand/Collapse All**: Quản lý hiển thị UI
- **Real-time Progress Bars**: Hiển thị relationship/reputation visually

## 💾 Data Storage

### LocalStorage Keys:
- `npc_relationships` - Main relationship data
- `npc_encounters` - Encounter history
- `rp_chat` - Chat history for analysis
- `rp_summary` - SCC summary data
- `rp_scene_state` - Current scene context

### Data Structure:
```typescript
interface NPCRelationship {
  id: string;
  name: string;
  description?: string;
  relationshipLevel: number; // -100 to 100
  reputation: number; // -100 to 100
  status: 'neutral' | 'friendly' | 'hostile' | 'romantic' | 'rival' | 'mentor' | 'student';
  lastInteraction: Date;
  totalInteractions: number;
  notes?: string[];
  tags?: string[];
  location?: string;
  faction?: string;
}
```

## 🎯 Gameplay Impact

### Story Integration:
- NPCs react differently based on relationship levels
- AI receives relationship context in prompts
- Status affects available dialogue options and outcomes

### Progression Systems:
- Gradual relationship building through consistent interaction
- Meaningful consequences for actions
- Long-term relationship stability vs new acquaintances

### Balancing Features:
- No instant relationship changes from minor actions
- Context-sensitive modifications
- Realistic time decay for inactive relationships

## 🔧 Configuration & Tuning

### Sensitivity Settings:
- **Conservative Mode**: Current default với smaller bonuses
- **Pattern Detection**: Có thể điều chỉnh keywords và thresholds
- **Time Decay**: Có thể modify decay rates

### Debugging:
- Console logs cho relationship changes
- Notes system tracks reasoning
- "Sửa Status" button để manual corrections

## 📈 Future Enhancements

### Potential Additions:
- Group relationship dynamics (faction-wide effects)
- Relationship networks (NPC to NPC relationships)
- Seasonal/event-based relationship modifiers
- More sophisticated sentiment analysis
- Voice tone detection
- Economic relationship factors

---

## 🎮 Cách Sử Dụng

### Cho Players:
1. Tương tác tự nhiên với NPCs trong game
2. Xem relationship progress trong InfoMenu → Quan Hệ
3. Sử dụng "Sửa Status" nếu cần correction
4. Pay attention to notes để hiểu relationship history

### Cho Developers:
1. System tự động hoạt động sau mỗi AI response
2. Monitor console logs để debug relationship changes
3. Điều chỉnh thresholds trong `analyzeNPCInteractionSentiment`
4. Extend pattern detection cho specific game needs

---

*Last updated: Phiên bản hiện tại với balanced scoring system*
