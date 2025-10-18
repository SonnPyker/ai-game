import { HelpFAQ, HelpCategoryInfo, HelpCategory } from '../types/helpChat';

// Category definitions
export const helpCategories: HelpCategoryInfo[] = [
  {
    id: 'world-builder',
    name: 'Xây Dựng Thế Giới',
    description: 'Tạo và tùy chỉnh thế giới game',
    icon: '🌍',
    faqCount: 0 // Will be calculated
  },
  {
    id: 'character-creation',
    name: 'Tạo Nhân Vật',
    description: 'Thiết kế và tùy chỉnh nhân vật',
    icon: '👤',
    faqCount: 0 // Will be calculated
  },
  {
    id: 'combat',
    name: 'Chiến Đấu',
    description: 'Hệ thống combat và kỹ năng',
    icon: '⚔️',
    faqCount: 0 // Will be calculated
  },
  {
    id: 'gameplay',
    name: 'Chơi Game',
    description: 'Các cơ chế gameplay chính',
    icon: '🎮',
    faqCount: 0 // Will be calculated
  }
];

// FAQ Data
export const helpFAQs: HelpFAQ[] = [
  // World Builder FAQs
  {
    id: 'world-1',
    category: 'world-builder',
    question: 'Làm thế nào để tạo một thế giới mới?',
    answer: `Để tạo thế giới mới:

1. **Chọn thể loại**: Fantasy, Sci-Fi, Modern, Historical, etc.
2. **Thiết lập bối cảnh**: Mô tả thế giới, thời đại, không gian
3. **Tạo nguyên tắc cốt lõi**: Các quy tắc cơ bản của thế giới
4. **Thiết lập thực thể nền tảng**: Nhân vật, địa điểm, phe phái quan trọng
5. **Cấu hình tiền tệ**: Loại tiền tệ và giá trị
6. **Chọn độ khó**: Dễ, Trung bình, Khó

**Mẹo**: Mô tả chi tiết sẽ giúp AI tạo kịch bản phù hợp hơn.`,
    tags: ['tạo thế giới', 'world builder', 'thiết lập', 'bối cảnh']
  },
  {
    id: 'world-2',
    category: 'world-builder',
    question: 'Các thể loại thế giới có sẵn là gì?',
    answer: `Các thể loại thế giới phổ biến:

- **Fantasy**: Phép thuật, rồng, hiệp sĩ
- **Sci-Fi**: Công nghệ tương lai, không gian
- **Modern**: Thế giới hiện đại, đương đại
- **Historical**: Lịch sử thực tế hoặc lịch sử thay thế
- **Post-Apocalyptic**: Sau thảm họa, tàn tích
- **Steampunk**: Công nghệ hơi nước, Victorian
- **Cyberpunk**: Tương lai đen tối, công nghệ cao

Bạn cũng có thể tạo thể loại tùy chỉnh.`,
    tags: ['thể loại', 'genre', 'fantasy', 'sci-fi', 'modern']
  },
  {
    id: 'world-3',
    category: 'world-builder',
    question: 'Làm thế nào để thiết lập hệ thống thời gian?',
    answer: `Hệ thống thời gian trong game:

**Thời gian thế giới**:
- Năm bắt đầu: Thiết lập năm khởi điểm
- Thời gian hiện tại: Theo dõi thời gian trôi qua
- Thời gian trong ngày: Sáng, trưa, chiều, tối, đêm

**Tác động**:
- Ảnh hưởng đến hành vi NPC
- Thay đổi môi trường và bầu không khí
- Ảnh hưởng đến khả năng thực hiện hành động

**Mẹo**: Thời gian sẽ tự động trôi qua khi bạn thực hiện hành động.`,
    tags: ['thời gian', 'time', 'ngày đêm', 'năm tháng']
  },
  {
    id: 'world-4',
    category: 'world-builder',
    question: 'Cách thiết lập tiền tệ và kinh tế?',
    answer: `Thiết lập hệ thống tiền tệ:

**Tiền tệ chính**:
- Tên: Vàng, Đồng, Credit, etc.
- Mô tả: Giá trị và cách sử dụng
- Đánh dấu là tiền tệ chính

**Tiền tệ phụ** (tùy chọn):
- Các loại tiền khác trong thế giới
- Tỷ giá quy đổi

**Sử dụng trong game**:
- Mua bán với NPC
- Mua trang bị và vật phẩm
- Thưởng từ quest và combat

**Mẹo**: Tiền tệ sẽ ảnh hưởng đến giá cả và khả năng mua sắm.`,
    tags: ['tiền tệ', 'currency', 'kinh tế', 'mua bán', 'gold']
  },

  // Character Creation FAQs
  {
    id: 'char-1',
    category: 'character-creation',
    question: 'Làm thế nào để tạo nhân vật?',
    answer: `Có 2 cách tạo nhân vật:

**Cách 1: Mô tả tự do**
1. Viết mô tả chi tiết về nhân vật
2. AI sẽ tự động phân tích và điền form
3. Chỉnh sửa các thông tin được tạo

**Cách 2: Điền form thủ công**
1. Điền từng trường thông tin
2. Sử dụng AI gợi ý để hoàn thiện
3. Tùy chỉnh theo ý muốn

**Thông tin cần thiết**:
- Tên và giới tính
- Ngoại hình và tính cách
- Tiểu sử và đặc điểm
- Chỉ số cốt lõi (6 stats chính)
- Kỹ năng đặc biệt`,
    tags: ['tạo nhân vật', 'character', 'mô tả', 'form', 'AI']
  },
  {
    id: 'char-2',
    category: 'character-creation',
    question: 'Các chỉ số cốt lõi có ý nghĩa gì?',
    answer: `6 chỉ số cốt lõi (Core Stats):

**Sức mạnh (Strength)**:
- Ảnh hưởng đến sát thương vật lý
- Khả năng mang vác và phá hủy
- Modifier: (STR - 10) / 2

**Nhanh nhẹn (Agility)**:
- Ảnh hưởng đến AC (Armor Class)
- Thứ tự lượt trong combat
- Khả năng né tránh

**Trí tuệ (Intelligence)**:
- Khả năng học kỹ năng mới
- Hiểu biết về phép thuật
- Tư duy logic và giải quyết vấn đề

**Thể lực (Constitution)**:
- Ảnh hưởng đến HP tối đa
- Khả năng chống chịu
- Sức khỏe tổng thể

**Khôn ngoan (Wisdom)**:
- Nhận thức và trực giác
- Khả năng phát hiện nguy hiểm
- Hiểu biết về tự nhiên

**Uy tín (Charisma)**:
- Khả năng giao tiếp với NPC
- Thuyết phục và đàm phán
- Lãnh đạo và ảnh hưởng`,
    tags: ['chỉ số', 'stats', 'strength', 'agility', 'intelligence', 'constitution', 'wisdom', 'charisma']
  },
  {
    id: 'char-3',
    category: 'character-creation',
    question: 'Làm thế nào để tạo kỹ năng cho nhân vật?',
    answer: `Hệ thống kỹ năng nhân vật:

**Tự động tạo**:
- AI sẽ tạo 3 kỹ năng dựa trên mô tả nhân vật
- Có thể reroll để tạo kỹ năng mới
- Lock kỹ năng để giữ lại khi reroll

**Loại kỹ năng**:
- **Tấn công**: Gây sát thương cho kẻ thù
- **Hồi phục**: Chữa lành và buff
- **Xã hội**: Giao tiếp và thuyết phục

**Thông số kỹ năng**:
- Level: Cấp độ kỹ năng
- Cooldown: Thời gian hồi chiêu
- Effects: Hiệu ứng cụ thể
- Requires Target: Cần mục tiêu hay không

**Mẹo**: Kỹ năng phù hợp với tính cách sẽ hiệu quả hơn.`,
    tags: ['kỹ năng', 'skills', 'tấn công', 'hồi phục', 'xã hội', 'reroll']
  },
  {
    id: 'char-4',
    category: 'character-creation',
    question: 'Cách nhập/xuất nhân vật?',
    answer: `Quản lý nhân vật:

**Xuất nhân vật**:
1. Vào tab "Tùy chỉnh nhân vật"
2. Nhấn nút "Xuất nhân vật"
3. File JSON sẽ được tải về
4. Lưu trữ để backup hoặc chia sẻ

**Nhập nhân vật**:
1. Vào tab "Mô tả nhân vật"
2. Nhấn "Nhập nhân vật từ file JSON"
3. Chọn file JSON đã lưu
4. Tự động chuyển sang tab tùy chỉnh

**Lợi ích**:
- Backup nhân vật an toàn
- Chia sẻ với bạn bè
- Tạo nhiều nhân vật cho cùng thế giới
- Khôi phục khi có lỗi

**Lưu ý**: File JSON chứa toàn bộ thông tin nhân vật.`,
    tags: ['nhập', 'xuất', 'import', 'export', 'JSON', 'backup', 'chia sẻ']
  },

  // Combat FAQs
  {
    id: 'combat-1',
    category: 'combat',
    question: 'Hệ thống combat hoạt động như thế nào?',
    answer: `Combat turn-based:

**Thứ tự lượt**:
- Dựa trên Agility (nhanh nhẹn)
- Player và Enemy lần lượt thực hiện hành động
- Hiển thị thứ tự trong Turn Indicator

**Hành động trong lượt**:
- **Hành động chính**: Tấn công, sử dụng kỹ năng
- **Hành động phụ**: Sử dụng vật phẩm
- **Hành động kỹ năng**: Sử dụng kỹ năng đặc biệt
- **Phòng thủ**: Giảm sát thương nhận vào
- **Chạy trốn**: Thoát khỏi combat

**Kết thúc lượt**:
- Nhấn "Kết thúc lượt" để chuyển sang lượt tiếp theo
- Enemy sẽ tự động thực hiện hành động`,
    tags: ['combat', 'turn-based', 'lượt', 'hành động', 'thứ tự']
  },
  {
    id: 'combat-2',
    category: 'combat',
    question: 'Cách tấn công và gây sát thương?',
    answer: `Hệ thống tấn công:

**Tấn công cơ bản**:
1. Chọn mục tiêu (click vào enemy)
2. Chọn loại tấn công
3. Hệ thống tự động roll dice
4. Hiển thị kết quả tấn công

**Tính toán sát thương**:
- Attack Roll: 1d20 + Attack Bonus
- Damage Roll: Dice + Modifier
- Attack Bonus = Strength Modifier + Proficiency
- Damage = Weapon Dice + Strength Modifier

**Các loại tấn công**:
- **Melee**: Tấn công cận chiến
- **Ranged**: Tấn công tầm xa
- **Magic**: Tấn công phép thuật

**Mẹo**: Chọn mục tiêu có AC thấp để dễ trúng đòn.`,
    tags: ['tấn công', 'attack', 'sát thương', 'damage', 'dice', 'roll']
  },
  {
    id: 'combat-3',
    category: 'combat',
    question: 'Cách sử dụng vật phẩm trong combat?',
    answer: `Sử dụng vật phẩm:

**Mở inventory**:
- Nhấn nút "Inventory" trong Action Menu
- Xem danh sách vật phẩm có thể dùng

**Loại vật phẩm**:
- **Consumable**: Thuốc hồi máu, buff tạm thời
- **Weapon**: Vũ khí tấn công
- **Armor**: Giáp bảo vệ
- **Utility**: Vật phẩm đặc biệt

**Sử dụng**:
- Click vào vật phẩm để sử dụng
- Chọn mục tiêu nếu cần
- Vật phẩm sẽ có hiệu ứng ngay lập tức

**Consumable**:
- Có số lượng hạn chế
- Sử dụng xong sẽ giảm quantity
- Có thể mua thêm từ NPC

**Mẹo**: Luôn mang theo thuốc hồi máu để an toàn.`,
    tags: ['vật phẩm', 'inventory', 'consumable', 'thuốc', 'hồi máu']
  },
  {
    id: 'combat-4',
    category: 'combat',
    question: 'Cách chạy trốn khỏi combat?',
    answer: `Chạy trốn khỏi combat:

**Khi nào nên chạy**:
- HP thấp, không thể chiến thắng
- Enemy quá mạnh so với level
- Cần thời gian chuẩn bị

**Cách chạy trốn**:
1. Nhấn nút "Chạy trốn" trong Action Menu
2. Xác nhận hành động
3. Nhân vật sẽ thoát khỏi combat

**Hậu quả**:
- Không nhận được kinh nghiệm
- Không nhận được vật phẩm thưởng
- HP và trạng thái được giữ nguyên
- Enemy sẽ biến mất khỏi scene

**Lưu ý**:
- Không thể chạy trốn trong một số trường hợp đặc biệt
- Có thể gặp lại enemy sau khi chạy trốn

**Mẹo**: Đôi khi chạy trốn là lựa chọn khôn ngoan.`,
    tags: ['chạy trốn', 'flee', 'escape', 'thoát', 'combat']
  },
  {
    id: 'combat-5',
    category: 'combat',
    question: 'Hệ thống dice và roll trong combat như thế nào?',
    answer: `Hệ thống dice trong combat:

**Attack Roll (Tấn công)**:
- Sử dụng: 1d20 + Attack Bonus
- Mục đích: Xác định có trúng đòn hay không
- Attack Bonus = Strength Modifier + Proficiency Bonus
- Kết quả ≥ AC của mục tiêu = Trúng đòn

**Damage Roll (Sát thương)**:
- Sử dụng: Dice vũ khí + Modifier
- Ví dụ: 1d6+2 (kiếm ngắn + Strength modifier)
- Dice vũ khí: 1d4 (dao), 1d6 (kiếm ngắn), 1d8 (kiếm dài), 1d10 (rìu)
- Modifier thường là Strength cho vũ khí cận chiến

**Critical Hit (Chí mạng)**:
- Khi Attack Roll = 20 (natural 20)
- Tự động trúng đòn + gấp đôi dice sát thương
- Ví dụ: 1d6+2 → 2d6+2

**Saving Throw (Cứu ném)**:
- Sử dụng: 1d20 + Ability Modifier
- Mục đích: Chống lại hiệu ứng đặc biệt
- Ví dụ: Constitution save để chống poison

**Mẹo**: Dice roll là yếu tố may rủi quan trọng trong combat.`,
    tags: ['dice', 'roll', 'attack roll', 'damage roll', 'critical hit', 'saving throw']
  },
  {
    id: 'combat-6',
    category: 'combat',
    question: 'Các chỉ số combat quan trọng là gì?',
    answer: `Các chỉ số combat chính:

**HP (Hit Points)**:
- Máu hiện tại / Máu tối đa
- Khi HP = 0: Nhân vật bất tỉnh
- Tăng theo Constitution modifier
- Công thức: (Constitution - 10) / 2 + 20

**AC (Armor Class)**:
- Khả năng phòng thủ, khó bị trúng đòn
- Công thức: 10 + Agility Modifier + Armor Bonus
- AC càng cao càng khó bị tấn công trúng

**Attack Bonus**:
- Bonus khi tấn công
- Công thức: Strength Modifier + Proficiency Bonus
- Proficiency Bonus tăng theo level

**Damage Modifier**:
- Bonus sát thương
- Thường = Strength Modifier (vũ khí cận chiến)
- Hoặc = Agility Modifier (vũ khí tầm xa)

**Initiative (Thứ tự lượt)**:
- Dựa trên Agility
- Quyết định ai đi trước trong combat
- Agility cao = đi trước

**Speed (Tốc độ di chuyển)**:
- Khoảng cách di chuyển mỗi lượt
- Thường = 30 feet (6 ô)
- Có thể bị ảnh hưởng bởi armor nặng

**Mẹo**: Hiểu rõ các chỉ số giúp tối ưu chiến thuật combat.`,
    tags: ['HP', 'AC', 'attack bonus', 'damage', 'initiative', 'speed', 'chỉ số']
  },
  {
    id: 'combat-7',
    category: 'combat',
    question: 'Character Skills trong combat hoạt động như thế nào?',
    answer: `Hệ thống Character Skills:

**Loại kỹ năng**:
- **Damage Skills**: Gây sát thương cho kẻ thù
- **Healing Skills**: Hồi phục HP cho bản thân/đồng minh
- **Social Skills**: Thuyết phục, gây ảnh hưởng tâm lý

**Thông số kỹ năng**:
- **Level**: Cấp độ kỹ năng (1-5)
- **Cooldown**: Thời gian hồi chiêu (turns)
- **Current Cooldown**: Thời gian còn lại
- **Effects**: Hiệu ứng cụ thể
- **Requires Target**: Cần mục tiêu hay không

**Sử dụng kỹ năng**:
1. Mở menu Skills trong combat
2. Chọn kỹ năng muốn dùng
3. Chọn mục tiêu (nếu cần)
4. Kỹ năng được kích hoạt

**Cooldown System**:
- Mỗi kỹ năng có thời gian hồi chiêu
- Không thể dùng khi đang cooldown
- Cooldown giảm 1 mỗi lượt
- Kỹ năng mạnh thường có cooldown dài

**Skill Effects**:
- **Instant Damage**: Sát thương tức thì
- **Heal**: Hồi phục HP
- **Buff**: Tăng chỉ số tạm thời
- **Debuff**: Giảm chỉ số kẻ thù
- **Status Effect**: Hiệu ứng trạng thái

**Mẹo**: Sử dụng kỹ năng đúng thời điểm để tối đa hiệu quả.`,
    tags: ['skills', 'kỹ năng', 'cooldown', 'effects', 'damage', 'healing', 'social']
  },
  {
    id: 'combat-8',
    category: 'combat',
    question: 'Cách tính sát thương và phòng thủ chi tiết?',
    answer: `Tính toán sát thương và phòng thủ:

**Tính sát thương cơ bản**:
- **Vũ khí cận chiến**: Weapon Dice + Strength Modifier
- **Vũ khí tầm xa**: Weapon Dice + Agility Modifier
- **Phép thuật**: Spell Dice + Intelligence Modifier

**Ví dụ tính sát thương**:
- Kiếm dài (1d8) + Strength +3 = 1d8+3
- Cung (1d6) + Agility +2 = 1d6+2
- Fireball (3d6) + Intelligence +4 = 3d6+4

**Tính AC (Armor Class)**:
- **Cơ bản**: 10 + Agility Modifier
- **Có giáp**: 10 + Agility Modifier + Armor Bonus
- **Giáp nhẹ**: +1 đến +3 AC
- **Giáp nặng**: +4 đến +8 AC

**Ví dụ AC**:
- Không giáp + Agility +2 = AC 12
- Giáp da + Agility +2 = AC 13
- Giáp sắt + Agility +2 = AC 16

**Resistance và Vulnerability**:
- **Resistance**: Giảm 50% sát thương
- **Vulnerability**: Tăng 100% sát thương
- Áp dụng cho từng loại sát thương

**Temporary HP**:
- HP tạm thời, mất trước HP thật
- Không cộng dồn với HP thật
- Mất dần theo thời gian

**Mẹo**: Hiểu rõ cách tính giúp dự đoán kết quả combat.`,
    tags: ['sát thương', 'damage', 'AC', 'armor', 'resistance', 'vulnerability', 'temporary HP']
  },
  {
    id: 'combat-9',
    category: 'combat',
    question: 'Các loại vũ khí và trang bị trong combat?',
    answer: `Hệ thống vũ khí và trang bị:

**Vũ khí cận chiến**:
- **Dao găm**: 1d4 sát thương, nhẹ, dễ ẩn
- **Kiếm ngắn**: 1d6 sát thương, cân bằng
- **Kiếm dài**: 1d8 sát thương, mạnh
- **Rìu**: 1d10 sát thương, nặng, chậm
- **Gậy**: 1d6 sát thương, đơn giản

**Vũ khí tầm xa**:
- **Cung ngắn**: 1d6 sát thương, nhanh
- **Cung dài**: 1d8 sát thương, tầm xa
- **Nỏ**: 1d8 sát thương, mạnh, chậm
- **Dao ném**: 1d4 sát thương, nhẹ

**Giáp bảo vệ**:
- **Không giáp**: AC = 10 + Agility
- **Giáp da**: +1 AC, nhẹ
- **Giáp sắt**: +3 AC, nặng
- **Giáp sắt nặng**: +5 AC, rất nặng

**Trang bị phụ**:
- **Khiên**: +2 AC, cần tay trống
- **Găng tay**: +1 Attack Bonus
- **Giày**: +1 Speed
- **Nhẫn**: +1 Magic Resistance

**Vũ khí ma thuật**:
- Có hiệu ứng đặc biệt
- Thường +1 đến +3 Attack/Damage
- Có thể có khả năng đặc biệt

**Mẹo**: Chọn vũ khí phù hợp với playstyle và stats.`,
    tags: ['vũ khí', 'weapon', 'giáp', 'armor', 'trang bị', 'equipment', 'ma thuật']
  },

  // Gameplay FAQs
  {
    id: 'game-1',
    category: 'gameplay',
    question: 'Hệ thống quest hoạt động như thế nào?',
    answer: `Hệ thống quest:

**Nhận quest**:
- NPC sẽ đề xuất quest khi tương tác
- Quest xuất hiện trong Quest Tracker
- Có thể có nhiều quest cùng lúc

**Loại quest**:
- **Main Quest**: Cốt truyện chính
- **Side Quest**: Nhiệm vụ phụ
- **Combat Quest**: Tiêu diệt kẻ thù
- **Delivery Quest**: Giao hàng
- **Social Quest**: Tương tác với NPC

**Hoàn thành quest**:
- Thực hiện các mục tiêu được giao
- Quay lại NPC để báo cáo
- Nhận thưởng: XP, tiền, vật phẩm

**Quest Tracker**:
- Theo dõi tiến độ quest
- Hiển thị mục tiêu hiện tại
- Đánh dấu quest đã hoàn thành`,
    tags: ['quest', 'nhiệm vụ', 'NPC', 'thưởng', 'tracker']
  },
  {
    id: 'game-2',
    category: 'gameplay',
    question: 'Cách tương tác với NPC?',
    answer: `Tương tác với NPC:

**Gặp gỡ NPC**:
- NPC xuất hiện trong scene
- Click vào NPC để bắt đầu hội thoại
- Một số NPC cần điều kiện đặc biệt

**Hội thoại**:
- Chọn câu trả lời phù hợp
- Ảnh hưởng đến mối quan hệ
- Có thể mở khóa quest mới

**Mối quan hệ**:
- **Thân thiện**: NPC sẵn sàng giúp đỡ
- **Trung lập**: Tương tác bình thường
- **Thù địch**: NPC có thể tấn công

**Cải thiện mối quan hệ**:
- Chọn câu trả lời tích cực
- Hoàn thành quest cho NPC
- Tặng quà (nếu có)

**Mẹo**: Mối quan hệ tốt mở ra nhiều cơ hội.`,
    tags: ['NPC', 'hội thoại', 'mối quan hệ', 'tương tác', 'thân thiện']
  },
  {
    id: 'game-3',
    category: 'gameplay',
    question: 'Hệ thống inventory và trang bị?',
    answer: `Quản lý inventory:

**Mở inventory**:
- Nhấn nút "Info" trong header
- Chọn tab "Inventory"
- Xem tất cả vật phẩm

**Loại vật phẩm**:
- **Weapon**: Vũ khí tấn công
- **Armor**: Giáp bảo vệ
- **Consumable**: Thuốc, thức ăn
- **Utility**: Vật phẩm đặc biệt
- **Quest Item**: Vật phẩm nhiệm vụ

**Trang bị**:
- Drag & drop để trang bị
- Ảnh hưởng đến stats
- Chỉ có thể trang bị 1 mỗi slot

**Sắp xếp**:
- Tự động sắp xếp theo loại
- Tìm kiếm theo tên
- Lọc theo loại vật phẩm

**Mẹo**: Thường xuyên kiểm tra inventory để tối ưu trang bị.`,
    tags: ['inventory', 'trang bị', 'equipment', 'vật phẩm', 'weapon', 'armor']
  },
  {
    id: 'game-4',
    category: 'gameplay',
    question: 'Cách lưu và tải game?',
    answer: `Hệ thống save/load:

**Manual Save**:
- Nhấn nút "Save" trong header
- Tạo save point tại thời điểm hiện tại
- Có thể tạo nhiều save slot
- Lưu trữ trong localStorage của trình duyệt

**Load Game**:
- Nhấn nút "Load" trong header
- Chọn save slot muốn tải
- Xác nhận để tải game
- Khôi phục trạng thái game đã lưu

**Save Data bao gồm**:
- Trạng thái nhân vật (HP, level, inventory)
- Tiến độ quest và mối quan hệ NPC
- Vị trí hiện tại và thời gian thế giới
- Lịch sử chat và hành động

**Lưu ý**:
- Save data chỉ lưu trên trình duyệt hiện tại
- Xóa dữ liệu trình duyệt sẽ mất save
- Không có cloud sync tự động

**Mẹo**: Nên tạo save thủ công trước khi thực hiện hành động quan trọng.`,
    tags: ['save', 'load', 'lưu', 'tải', 'localStorage', 'backup']
  },
  {
    id: 'game-5',
    category: 'gameplay',
    question: 'Cài đặt nội dung 18+ như thế nào?',
    answer: `Quản lý nội dung 18+:

**Bật/tắt nội dung 18+**:
- Click vào biểu tượng 18+ trong header
- Chọn "Bật" để kích hoạt
- Chọn "Tắt" để vô hiệu hóa

**Mức độ nội dung**:
- **Fade**: Nội dung được làm mờ, an toàn
- **Direct**: Nội dung trực tiếp, mô tả chi tiết

**Thay đổi mức độ**:
- Click vào biểu tượng 18+ khi đã bật
- Chọn mức độ mong muốn
- Thay đổi có hiệu lực ngay lập tức

**Ảnh hưởng**:
- Thay đổi cách AI mô tả nội dung
- Ảnh hưởng đến quest và tương tác NPC
- Không ảnh hưởng đến gameplay cơ bản

**Lưu ý**: Chỉ dành cho người chơi trên 18 tuổi.`,
    tags: ['18+', 'adult', 'nội dung', 'cài đặt', 'mức độ', 'fade', 'direct']
  },
  {
    id: 'game-6',
    category: 'gameplay',
    question: 'Cách sử dụng Action Suggestions?',
    answer: `Action Suggestions:

**Tự động gợi ý**:
- AI phân tích tình huống hiện tại
- Đề xuất các hành động phù hợp
- Xuất hiện trong Action Suggestions panel

**Loại gợi ý**:
- **Combat**: Tấn công, phòng thủ, sử dụng kỹ năng
- **Social**: Nói chuyện, thuyết phục, tương tác
- **Exploration**: Khám phá, tìm kiếm, di chuyển
- **Utility**: Sử dụng vật phẩm, kiểm tra inventory

**Sử dụng gợi ý**:
- Click vào gợi ý để thực hiện
- Hoặc tự nhập hành động tương tự
- Gợi ý sẽ biến mất sau khi sử dụng

**Tùy chỉnh**:
- Có thể tắt gợi ý tự động
- Chỉ hiển thị gợi ý phù hợp với tình huống
- Học từ hành động của người chơi

**Mẹo**: Gợi ý giúp bạn khám phá các khả năng mới.`,
    tags: ['gợi ý', 'suggestions', 'hành động', 'AI', 'tự động']
  },
  {
    id: 'game-7',
    category: 'gameplay',
    question: 'Hệ thống DC Check hoạt động như thế nào?',
    answer: `DC Check (Difficulty Class Check):

**Khái niệm DC**:
- DC = Difficulty Class (Mức độ khó)
- Là ngưỡng cần đạt để thành công
- DC càng cao = càng khó thực hiện

**Cách tính DC Check**:
- Roll: 1d20 + Ability Modifier
- Kết quả ≥ DC = Thành công
- Kết quả < DC = Thất bại

**Các loại DC Check**:
- **Easy (10)**: Hành động đơn giản
- **Medium (15)**: Hành động bình thường
- **Hard (20)**: Hành động khó khăn
- **Very Hard (25)**: Hành động rất khó
- **Nearly Impossible (30)**: Hành động gần như không thể

**Ability Modifier**:
- Strength: Vận động cơ thể, phá hủy
- Agility: Nhanh nhẹn, né tránh, leo trèo
- Intelligence: Tư duy, nhớ lại, phân tích
- Constitution: Chịu đựng, chống độc
- Wisdom: Nhận thức, trực giác, chú ý
- Charisma: Thuyết phục, đe dọa, biểu diễn

**Cách tính Ability Modifier**:
- Modifier = (Ability Score - 10) / 2 (làm tròn xuống)
- Ví dụ: Strength 14 → Modifier +2
- Ví dụ: Intelligence 8 → Modifier -1

**Ví dụ DC Check**:
- **Thuyết phục NPC**: 1d20 + Charisma Modifier
- **Leo tường**: 1d20 + Agility Modifier
- **Nhớ thông tin**: 1d20 + Intelligence Modifier
- **Chống độc**: 1d20 + Constitution Modifier

**Trong game**:
- AI sẽ tự động roll dice khi bạn thực hiện hành động
- Kết quả sẽ hiển thị trong chat log
- Thành công/thất bại ảnh hưởng đến kết quả hành động

**Mẹo**: Chỉ số cao giúp tăng khả năng thành công trong các hành động khó.`,
    tags: ['DC check', 'difficulty class', 'roll', 'ability modifier', 'dice', 'thành công', 'thất bại']
  },
  {
    id: 'game-8',
    category: 'gameplay',
    question: 'Hệ thống bản đồ và di chuyển như thế nào?',
    answer: `Bản đồ và di chuyển:

**Xem bản đồ**:
- Nhấn nút "Info" trong header
- Chọn tab "Map" để xem bản đồ thế giới
- Hiển thị vị trí hiện tại và các địa điểm

**Di chuyển**:
- Mở bản đồ tương tác để chọn địa điểm
- Bấm nút "Di chuyển" để xác nhận
- Hệ thống sẽ tự động ghi tin nhắn di chuyển
- Nhấn "Gửi" để thực hiện di chuyển

**Các loại địa điểm**:
- **Thị trấn/Thành phố**: Nơi có NPC, shop, quest
- **Rừng rậm**: Có thể gặp quái vật, tài nguyên
- **Hang động**: Thường có báu vật và nguy hiểm
- **Ruins**: Di tích cổ, có thể có quest quan trọng

**Khám phá**:
- Di chuyển đến địa điểm mới để mở khóa
- Mỗi địa điểm có câu chuyện và NPC riêng
- Có thể quay lại địa điểm đã khám phá

**Thời gian di chuyển**:
- Di chuyển xa mất nhiều thời gian hơn
- Ảnh hưởng đến thời gian trong ngày
- Có thể gặp sự kiện ngẫu nhiên trên đường

**Mẹo**: Khám phá nhiều địa điểm để mở khóa quest và cơ hội mới.`,
    tags: ['bản đồ', 'map', 'di chuyển', 'khám phá', 'địa điểm', 'vị trí']
  },
  {
    id: 'game-9',
    category: 'gameplay',
    question: 'Cách mua bán và sử dụng shop?',
    answer: `Hệ thống mua bán:

**Tìm shop**:
- Shop xuất hiện trong thị trấn/thành phố
- NPC merchant sẽ đề xuất mua bán khi tương tác
- Có thể có nhiều shop khác nhau

**Mua hàng**:
- Xem danh sách vật phẩm có sẵn
- Kiểm tra giá cả và số tiền hiện có
- Chọn vật phẩm muốn mua
- Xác nhận giao dịch

**Bán hàng**:
- Chọn vật phẩm từ inventory
- Merchant sẽ đưa ra giá mua
- Có thể thương lượng giá (nếu có kỹ năng)
- Xác nhận bán để nhận tiền

**Loại vật phẩm**:
- **Vũ khí**: Kiếm, cung, gậy phép thuật
- **Giáp**: Áo giáp, mũ, giày
- **Consumable**: Thuốc hồi máu, thức ăn
- **Skill Books**: Sách học kỹ năng mới

**Thương lượng**:
- Charisma cao giúp thương lượng tốt hơn
- Có thể giảm giá mua hoặc tăng giá bán
- Mối quan hệ với merchant ảnh hưởng giá

**Mẹo**: Luôn kiểm tra giá trước khi mua, và bán vật phẩm không cần thiết.`,
    tags: ['shop', 'mua bán', 'merchant', 'thương lượng', 'giá cả', 'vật phẩm']
  },
  {
    id: 'game-10',
    category: 'gameplay',
    question: 'Các loại shop và merchant trong game?',
    answer: `Các loại shop và merchant:

**Weapon Shop**:
- Bán vũ khí các loại
- Từ vũ khí cơ bản đến ma thuật
- Có thể nâng cấp vũ khí

**Armor Shop**:
- Bán giáp bảo vệ
- Giáp nhẹ, giáp nặng, giáp ma thuật
- Phụ kiện như găng tay, giày

**General Store**:
- Vật phẩm đa dạng
- Consumable, skill books
- Vật phẩm quest và đặc biệt

**Magic Shop**:
- Vật phẩm phép thuật
- Scroll, potion, wand
- Chỉ xuất hiện ở thành phố lớn

**Black Market**:
- Vật phẩm hiếm và bất hợp pháp
- Giá cao nhưng chất lượng tốt
- Cần mối quan hệ đặc biệt

**Merchant Types**:
- **Friendly**: Giá công bằng, dễ thương lượng
- **Greedy**: Giá cao, khó thương lượng
- **Suspicious**: Cần kiểm tra kỹ trước khi mua
- **Elite**: Chỉ bán cho người có địa vị cao

**Trading Tips**:
- Mối quan hệ tốt = giá tốt hơn
- Charisma cao = thương lượng hiệu quả
- Mua nhiều = có thể được giảm giá
- Bán vật phẩm hiếm = giá cao

**Mẹo**: Xây dựng mối quan hệ tốt với merchant để có giá ưu đãi.`,
    tags: ['merchant', 'shop types', 'weapon shop', 'armor shop', 'magic shop', 'black market', 'trading']
  }
];

// Calculate FAQ count for each category
helpCategories.forEach(category => {
  category.faqCount = helpFAQs.filter(faq => faq.category === category.id).length;
});

// Service functions
export const gameFAQService = {
  // Get all categories
  getCategories: (): HelpCategoryInfo[] => {
    return helpCategories;
  },

  // Get FAQs by category
  getFAQsByCategory: (category: HelpCategory): HelpFAQ[] => {
    return helpFAQs.filter(faq => faq.category === category);
  },

  // Get FAQ by ID
  getFAQById: (id: string): HelpFAQ | undefined => {
    return helpFAQs.find(faq => faq.id === id);
  },

  // Search FAQs
  searchFAQs: (query: string): HelpFAQ[] => {
    const lowercaseQuery = query.toLowerCase();
    return helpFAQs.filter(faq => 
      faq.question.toLowerCase().includes(lowercaseQuery) ||
      faq.answer.toLowerCase().includes(lowercaseQuery) ||
      faq.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    );
  },

  // Get random FAQs
  getRandomFAQs: (count: number = 5): HelpFAQ[] => {
    const shuffled = [...helpFAQs].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }
};
