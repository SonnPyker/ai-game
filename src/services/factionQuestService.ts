import { QuestProgress } from '../types';
import { npcRelationshipService } from './npcRelationshipService';
import { geminiService } from './geminiService';

class FactionQuestService {
  private static instance: FactionQuestService;
  private readonly FACTION_QUEST_KEY = 'faction_quests';

  private constructor() {}

  static getInstance(): FactionQuestService {
    if (!FactionQuestService.instance) {
      FactionQuestService.instance = new FactionQuestService();
    }
    return FactionQuestService.instance;
  }

  // Kiểm tra xem có thể tạo faction quest cho faction này không
  canCreateFactionQuest(factionName: string): boolean {
    const factionReputation = npcRelationshipService.calculateFactionReputation(factionName);
    return factionReputation.reputation >= 100;
  }

  // Kiểm tra xem faction đã có quest chưa
  hasActiveFactionQuest(factionName: string): boolean {
    const factionQuests = this.getFactionQuests();
    return factionQuests.some(quest => 
      quest.factionName === factionName && 
      (quest.status === 'active' || quest.status === 'available')
    );
  }

  // Tạo faction quest mới
  createFactionQuest(factionName: string): QuestProgress | null {
    if (!this.canCreateFactionQuest(factionName) || this.hasActiveFactionQuest(factionName)) {
      return null;
    }

    const questTemplates = this.getFactionQuestTemplates(factionName);
    const randomTemplate = questTemplates[Math.floor(Math.random() * questTemplates.length)];
    
    // Lấy character level để tính reward
    const characterLevel = this.getCharacterLevel();
    
    // Tạo 4 loại reward cho faction quest
    const currencyAmount = characterLevel * 25;
    const experienceAmount = characterLevel * 80;
    const reputationAmount = Math.floor(Math.random() * 21) + 30; // 30-50 điểm

    const quest: QuestProgress = {
      id: `faction_quest_${factionName}_${Date.now()}`,
      type: 'faction',
      title: randomTemplate.title,
      description: randomTemplate.description,
      status: 'available',
      factionName: factionName,
      objectives: randomTemplate.objectives.map((obj, index) => ({
        id: `obj_${index + 1}`,
        description: obj,
        completed: false,
        unlocked: index === 0,
        type: 'find_item' as const,
        aiKeywords: []
      })),
      rewards: [
        {
          type: 'currency',
          amount: currencyAmount,
          description: `Tiền tệ +${currencyAmount}`,
          claimed: false
        },
        {
          type: 'experience',
          amount: experienceAmount,
          description: `Kinh nghiệm +${experienceAmount}`,
          claimed: false
        },
        {
          type: 'item',
          amount: 1,
          items: [{
            id: `faction_item_${factionName}_${Date.now()}`,
            name: `Vật phẩm đặc trưng ${factionName}`,
            description: `Vật phẩm độc đáo từ phe phái ${factionName}`,
            type: 'misc',
            rarity: 'unique',
            quantity: 1,
            icon: '□',
            tags: ['reward', 'faction']
          }],
          description: `Vật phẩm đặc trưng ${factionName}`,
          claimed: false
        },
        {
          type: 'faction_reputation',
          amount: reputationAmount,
          factionName: factionName,
          description: `Danh tiếng phe phái ${factionName} +${reputationAmount}`,
          claimed: false
        }
      ],
      createdAt: new Date()
    };

    this.saveFactionQuest(quest);
    return quest;
  }

  // Lấy danh sách faction quests
  getFactionQuests(): QuestProgress[] {
    try {
      const data = localStorage.getItem(this.FACTION_QUEST_KEY);
      if (!data) return [];
      
      const parsed = JSON.parse(data);
      return parsed.map((quest: any) => ({
        ...quest,
        createdAt: new Date(quest.createdAt),
        completedAt: quest.completedAt ? new Date(quest.completedAt) : undefined,
        objectives: quest.objectives.map((obj: any) => ({
          ...obj,
          completedAt: obj.completedAt ? new Date(obj.completedAt) : undefined,
          unlocked: obj.unlocked !== undefined ? obj.unlocked : true
        })),
        rewards: quest.rewards.map((reward: any) => ({
          ...reward,
          claimedAt: reward.claimedAt ? new Date(reward.claimedAt) : undefined
        }))
      }));
    } catch (error) {
      console.error('Lỗi load faction quests:', error);
      return [];
    }
  }

  // Lưu faction quest
  private saveFactionQuest(quest: QuestProgress): void {
    const factionQuests = this.getFactionQuests();
    const existingIndex = factionQuests.findIndex(q => q.id === quest.id);
    
    if (existingIndex >= 0) {
      factionQuests[existingIndex] = quest;
    } else {
      factionQuests.push(quest);
    }
    
    localStorage.setItem(this.FACTION_QUEST_KEY, JSON.stringify(factionQuests));
  }

  // Cập nhật faction quest
  updateFactionQuest(questId: string, updates: Partial<QuestProgress>): void {
    const factionQuests = this.getFactionQuests();
    const questIndex = factionQuests.findIndex(q => q.id === questId);
    
    if (questIndex >= 0) {
      factionQuests[questIndex] = { ...factionQuests[questIndex], ...updates };
      localStorage.setItem(this.FACTION_QUEST_KEY, JSON.stringify(factionQuests));
    }
  }

  // Hoàn thành faction quest
  completeFactionQuest(questId: string): void {
    const factionQuests = this.getFactionQuests();
    const quest = factionQuests.find(q => q.id === questId);
    
    if (quest && quest.factionName) {
      // Cập nhật danh tiếng phe phái
      const reputationReward = quest.rewards.find(r => r.type === 'experience');
      if (reputationReward && !reputationReward.claimed) {
        // Cộng trực tiếp vào danh tiếng phe phái
        npcRelationshipService.adjustFactionReputation(quest.factionName, reputationReward.amount);
        
        // Đánh dấu reward đã claim
        reputationReward.claimed = true;
        reputationReward.claimedAt = new Date();
      }
      
      // Cập nhật quest status
      this.updateFactionQuest(questId, {
        status: 'completed',
        completedAt: new Date()
      });
    }
  }

  /**
   * Lấy level hiện tại của character từ localStorage
   */
  private getCharacterLevel(): number {
    try {
      const characterData = localStorage.getItem('currentCharacter');
      if (characterData) {
        const character = JSON.parse(characterData);
        return character.level || 1;
      }
    } catch (error) {
      console.warn('Failed to get character level:', error);
    }
    return 1; // Default level
  }

  // Lấy quest templates cho faction
  private getFactionQuestTemplates(factionName: string): Array<{
    title: string;
    description: string;
    objectives: string[];
  }> {
    return [
      {
        title: `Nhiệm vụ từ ${factionName}`,
        description: `Phe phái ${factionName} đã tin tưởng bạn và giao cho một nhiệm vụ quan trọng.`,
        objectives: [
          `Hoàn thành yêu cầu của phe phái ${factionName}`,
          `Báo cáo kết quả cho lãnh đạo phe phái`
        ]
      },
      {
        title: `Sứ mệnh ${factionName}`,
        description: `Bạn được giao phó một sứ mệnh đặc biệt từ phe phái ${factionName}.`,
        objectives: [
          `Thực hiện sứ mệnh theo yêu cầu`,
          `Đảm bảo thành công và báo cáo`
        ]
      },
      {
        title: `Thử thách ${factionName}`,
        description: `Phe phái ${factionName} muốn kiểm tra khả năng của bạn thông qua một thử thách.`,
        objectives: [
          `Vượt qua thử thách được đưa ra`,
          `Chứng minh giá trị của bạn với phe phái`
        ]
      }
    ];
  }


  // Tạo faction quest từ AI
  async createFactionQuestFromAI(factionName: string): Promise<QuestProgress | null> {
    if (!this.canCreateFactionQuest(factionName) || this.hasActiveFactionQuest(factionName)) {
      return null;
    }

    try {
      // Lấy thông tin faction
      const worldData = localStorage.getItem('world_gen_result');
      if (!worldData) return null;

      const parsed = JSON.parse(worldData);
      const faction = parsed.factions?.find((f: any) => f.name === factionName);
      if (!faction) return null;

      // Tạo prompt cho AI
      const prompt = `Tạo một quest phe phái cho "${factionName}" với thông tin sau:
- Mục tiêu phe phái: ${faction.goal}
- Phương pháp: ${faction.methods}
- Điểm yếu: ${faction.weakness}

Yêu cầu:
1. Quest phải phù hợp với mục tiêu và phương pháp của phe phái
2. Có 2-3 objectives cụ thể và có thể thực hiện
3. Phần thưởng là danh tiếng phe phái (30-50 điểm)
4. CHỈ trả về JSON thuần túy, KHÔNG có markdown code blocks, KHÔNG có text thêm

QUAN TRỌNG VỀ QUEST OBJECTIVES - 5 LOẠI CHÍNH:

1. FIND_ITEM (Tìm đồ):
   - Phải có targetItemName cụ thể
   - CHỈ tìm 1 vật phẩm (không có số lượng)
   - Description PHẢI chứa tên vật phẩm cụ thể, không được mơ hồ
   - Ví dụ: "Thu thập Ngọc lục bảo" (có tên cụ thể)
   - KHÔNG được: "Tìm kiếm một vật phẩm quý giá" (mơ hồ)

2. FIND_NPC (Tìm người):
   - Phải có targetNPCName cụ thể
   - Description PHẢI chứa tên NPC cụ thể, không được mơ hồ
   - Ví dụ: "Gặp gỡ thương nhân Aldric" (có tên cụ thể)
   - KHÔNG được: "Tìm kiếm một người liên lạc đáng tin cậy" (mơ hồ)

3. COMBAT (Chiến đấu):
   - Với enemy thường: cần targetEnemyName + targetEnemyType + requiredKills
   - Với NPC enemy: cần targetNPCName (sẽ match với NPC cụ thể)
   - Ví dụ: "Đánh bại 5 Goblin" hoặc "Hạ gục tên cướp Marcus"

4. TRAVEL (Di chuyển):
   - Phải có targetLocationName cụ thể
   - Description PHẢI chứa tên địa điểm cụ thể, không được mơ hồ
   - Ví dụ: "Đến Rừng Đen" (có tên cụ thể)
   - KHÔNG được: "Tìm kiếm một nơi an toàn" (mơ hồ)

5. DELIVERY (Giao đồ):
   - Phải có deliveryItemName + deliveryNPCName
   - Item sẽ được tag 'delivery' và gắn với quest
   - Ví dụ: "Mang Thư mật đến cho Nữ hoàng"

QUY TẮC:
- Mỗi objective CHỈ thuộc 1 type
- Tên item/NPC/enemy/location phải CỤ THỂ, KHÔNG dùng "một vật phẩm nào đó"
- Với combat: phân biệt enemy thường (cần type+name+quantity) vs NPC enemy (cần NPC name)
- Quest có thể kết hợp nhiều objective khác nhau (vd: find_item → delivery)

QUAN TRỌNG VỀ TÊN CỤ THỂ - TẠO TÊN RÕ RÀNG CHO TẤT CẢ OBJECTIVES:

FIND_NPC (Tìm người):
- KHÔNG BAO GIỜ sử dụng "một người liên lạc", "người đáng tin cậy", "thương nhân bí ẩn"
- TẠO TÊN CỤ THỂ cho từng NPC dựa trên context của quest và thế giới
- TÊN NPC PHẢI XUẤT HIỆN TRONG CẢ DESCRIPTION VÀ targetNPCName
- VÍ DỤ TỐT: "Gặp gỡ thương nhân Aldric" + targetNPCName: "Aldric"
- VÍ DỤ SAI: "Tìm kiếm một người liên lạc đáng tin cậy" (không có tên)

FIND_ITEM (Tìm đồ):
- KHÔNG BAO GIỜ sử dụng "một vật phẩm quý giá", "đồ vật bí ẩn", "vật phẩm cần thiết"
- TẠO TÊN CỤ THỂ cho từng vật phẩm dựa trên context của quest và thế giới
- TÊN VẬT PHẨM PHẢI XUẤT HIỆN TRONG CẢ DESCRIPTION VÀ targetItemName
- VÍ DỤ TỐT: "Thu thập Ngọc lục bảo" + targetItemName: "Ngọc lục bảo"
- VÍ DỤ SAI: "Tìm kiếm một vật phẩm quý giá" (không có tên)

TRAVEL (Di chuyển):
- KHÔNG BAO GIỜ sử dụng "một nơi an toàn", "địa điểm bí ẩn", "vị trí quan trọng"
- TẠO TÊN CỤ THỂ cho từng địa điểm dựa trên context của quest và thế giới
- TÊN ĐỊA ĐIỂM PHẢI XUẤT HIỆN TRONG CẢ DESCRIPTION VÀ targetLocationName
- VÍ DỤ TỐT: "Đến Rừng Đen" + targetLocationName: "Rừng Đen"
- VÍ DỤ SAI: "Tìm kiếm một nơi an toàn" (không có tên)

Trả về JSON theo format này:
{
  "id": "faction_quest_${factionName.toLowerCase()}_${Date.now()}",
  "title": "Tên quest",
  "description": "Mô tả quest",
  "objectives": [
    {
      "id": "obj_1",
      "description": "Mô tả nhiệm vụ",
      "type": "find_item|find_npc|combat|travel|delivery",
      "targetItemName": "Tên vật phẩm cụ thể (nếu type là find_item/delivery)",
      "targetNPCName": "Tên NPC cụ thể (nếu type là find_npc/delivery)",
      "targetEnemyName": "Tên enemy (nếu type là combat)",
      "targetEnemyType": "beast|humanoid|... (nếu type là combat)",
      "requiredKills": 3,
      "targetLocationName": "Tên địa điểm (nếu type là travel)"
    }
  ],
  "rewards": [
    {
      "type": "experience",
      "amount": 40,
      "description": "Danh tiếng phe phái +40"
    }
  ]
}`;

      const response = await geminiService.generateContent(prompt);
      
      // Clean response để loại bỏ markdown code blocks
      let cleanResponse = response.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      // Parse JSON response
      let questData;
      try {
        questData = JSON.parse(cleanResponse);
      } catch (parseError) {
        // Thử tìm JSON trong response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            questData = JSON.parse(jsonMatch[0]);
          } catch (matchError) {
            throw parseError;
          }
        } else {
          throw parseError;
        }
      }
      
      // Lấy character level để tính reward
      const characterLevel = this.getCharacterLevel();
      
      // Tạo 4 loại reward cho faction quest (theo yêu cầu)
      const currencyAmount = characterLevel * 25;
      const experienceAmount = characterLevel * 80;
      const reputationAmount = Math.floor(Math.random() * 21) + 30; // 30-50 điểm

      // Tạo QuestProgress object
      const quest: QuestProgress = {
        id: questData.id || `faction_quest_${factionName}_${Date.now()}`,
        type: 'faction',
        title: questData.title,
        description: questData.description,
        status: 'available',
        factionName: factionName,
        objectives: questData.objectives.map((obj: any, index: number) => ({
          id: obj.id || `obj_${index + 1}`,
          description: obj.description,
          completed: false,
          aiKeywords: obj.aiKeywords || [],
          unlocked: index === 0
        })),
        rewards: [
          {
            type: 'currency',
            amount: currencyAmount,
            description: `Tiền tệ +${currencyAmount}`,
            claimed: false
          },
          {
            type: 'experience',
            amount: experienceAmount,
            description: `Kinh nghiệm +${experienceAmount}`,
            claimed: false
          },
          {
            type: 'item',
            amount: 1,
            items: [{
              id: `faction_item_${factionName}_${Date.now()}`,
              name: `Vật phẩm đặc trưng ${factionName}`,
              description: `Vật phẩm độc đáo từ phe phái ${factionName}`,
              type: 'misc',
              rarity: 'unique',
              quantity: 1,
              icon: '□',
              tags: ['reward', 'faction']
            }],
            description: `Vật phẩm đặc trưng ${factionName}`,
            claimed: false
          },
          {
            type: 'faction_reputation',
            amount: reputationAmount,
            factionName: factionName,
            description: `Danh tiếng phe phái ${factionName} +${reputationAmount}`,
            claimed: false
          }
        ],
        createdAt: new Date()
      };

      this.saveFactionQuest(quest);
      return quest;
    } catch (error) {
      console.error('Lỗi tạo faction quest từ AI:', error);
      return null;
    }
  }
}

export const factionQuestService = FactionQuestService.getInstance();
