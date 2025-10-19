import { MerchantShop, Location, WorldData, WorldTime } from '../types';
import { worldTimeService } from './worldTimeService';

class MerchantService {
  private static instance: MerchantService;
  private merchantShops: Map<string, MerchantShop> = new Map();

  private constructor() {
    // Load merchant shops từ localStorage khi khởi tạo
    this.loadMerchantShopsFromLocalStorage();
  }

  public static getInstance(): MerchantService {
    if (!MerchantService.instance) {
      MerchantService.instance = new MerchantService();
    }
    return MerchantService.instance;
  }


  /**
   * Load merchant shops từ localStorage
   */
  private loadMerchantShopsFromLocalStorage(): void {
    try {
      const merchantShopsData = localStorage.getItem('merchant_shops');
      console.log('🔍 Loading merchant shops from localStorage:', merchantShopsData);
      
      if (merchantShopsData) {
        const data = JSON.parse(merchantShopsData);
        console.log('🔍 Parsed merchant shops data:', data);
        
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          // Convert object to Map (new format only)
          Object.entries(data).forEach(([locationId, shop]) => {
            this.merchantShops.set(locationId, shop as MerchantShop);
            console.log('🔍 Loaded shop:', locationId, shop);
          });
        }
      }
      
      console.log('🔍 Loaded merchant shops count:', this.merchantShops.size);
    } catch (error) {
      console.error('Error loading merchant shops from localStorage:', error);
    }
  }

  /**
   * Liên kết merchant shop với merchant signature NPC
   */
  public linkMerchantShopWithNPC(shopId: string, npcId: string): void {
    const shop = this.merchantShops.get(shopId);
    if (shop) {
      shop.merchantNPCId = npcId;
      this.saveMerchantShops();
    }
  }

  /**
   * Lấy merchant shop theo NPC ID
   */
  public getMerchantShopByNPCId(npcId: string): MerchantShop | null {
    for (const shop of this.merchantShops.values()) {
      if (shop.merchantNPCId === npcId) {
        return shop;
      }
    }
    return null;
  }

  /**
   * Tự động tạo merchant shop cho location nếu chưa có
   */
  public async ensureMerchantShopExists(locationId: string): Promise<MerchantShop | null> {
    console.log('🔍 ensureMerchantShopExists called for location:', locationId);
    console.log('🔍 Current merchantShops count:', this.merchantShops.size);
    
    // Kiểm tra xem shop đã tồn tại chưa
    let shop = this.merchantShops.get(locationId);
    if (shop) {
      console.log('🔍 Shop already exists for location:', locationId);
      // Kiểm tra xem có cần reroll items không (sang ngày mới)
      const currentTime = this.getCurrentWorldTime();
      const needsReroll = this.shouldRerollShopItems(shop, currentTime);
      
      if (needsReroll) {
        await this.rerollShopItems(shop, currentTime);
      }
      
      return shop;
    }

    // Nếu chưa có, tạo shop mới bằng AI
    try {
      // Lấy world data từ localStorage
      const worldDataStr = localStorage.getItem('world_gen_result');
      if (!worldDataStr) {
        console.error('No world data found in localStorage');
        return null;
      }

      const worldData = JSON.parse(worldDataStr);
      
      // Tìm location trong world data
      const location = worldData.locations?.find((loc: any) => loc.id === locationId);
      if (!location) {
        console.error(`Location not found in world data: ${locationId}`);
        return null;
      }

      // Tạo shop mới bằng AI
      console.log('🔍 Creating new shop for location:', locationId);
      const shop = await this.generateMerchantShopWithAI(location, worldData);
      console.log('🔍 Created shop:', shop);
      return shop;
    } catch (error) {
      console.error('Error creating merchant shop:', error);
      return null;
    }
  }

  /**
   * Kiểm tra xem có cần reroll shop items không (sang ngày mới)
   */
  private shouldRerollShopItems(shop: MerchantShop, currentTime: WorldTime): boolean {
    if (!shop.lastRestockTime) return true;
    
    const lastRestockTime = shop.lastRestockTime;
    const timeDiff = worldTimeService.getTimeDifference(lastRestockTime, currentTime);
    const hoursDiff = timeDiff / 60; // Convert minutes to hours
    
    // Reroll nếu đã qua 24 giờ
    return hoursDiff >= 24;
  }

  /**
   * Reroll shop items (giữ nguyên skill books, chỉ reroll weapons/armor/accessories/consumables)
   */
  private async rerollShopItems(shop: MerchantShop, currentTime: WorldTime): Promise<void> {
    try {
      // Lấy world data để reroll
      const worldDataStr = localStorage.getItem('world_gen_result');
      if (!worldDataStr) {
        console.error('No world data found for reroll');
        return;
      }

      const worldData = JSON.parse(worldDataStr);
      const location = worldData.locations?.find((loc: any) => loc.id === shop.locationId);
      
      if (!location) {
        console.error(`Location not found for reroll: ${shop.locationId}`);
        return;
      }

      // Tạo prompt để reroll items
      const prompt = this.buildRerollShopPrompt(location, worldData, shop);
      
      // Gọi AI để reroll items
      const { geminiService } = await import('./geminiService');
      const aiResponse = await geminiService.generateMerchantShopData(prompt);
      
      if (aiResponse && aiResponse.merchantShop) {
        // Cập nhật inventory mới (giữ nguyên skill books)
        const newInventory = aiResponse.merchantShop.inventory;
        if (newInventory) {
          shop.inventory.weapons = newInventory.weapons || shop.inventory.weapons;
          shop.inventory.armor = newInventory.armor || shop.inventory.armor;
          shop.inventory.accessories = newInventory.accessories || shop.inventory.accessories;
          shop.inventory.consumables = newInventory.consumables || shop.inventory.consumables;
          // Giữ nguyên skill books
        }
        
        // Cập nhật thời gian restock
        shop.lastRestockTime = currentTime;
        
        // Tăng skill book chance (mỗi ngày +10%, tối đa 70%)
        shop.skillBookChance = Math.min(shop.skillBookChance + 10, 70);
        
        // Tạo skill books mới dựa trên skillBookChance mới
        await this.generateSkillBooks(shop);
        
        this.merchantShops.set(shop.locationId, shop);
        this.saveMerchantShops();
        
      }
    } catch (error) {
      console.error('Error rerolling shop items:', error);
    }
  }

  /**
   * Tạo prompt để tạo/reroll shop items
   */
  private buildRerollShopPrompt(location: Location, worldData: WorldData, currentShop?: MerchantShop): string {
    const settings = (worldData as any).settings || [];
    const system = (worldData as any).system || {};
    const powerOrTech = system.powerOrTech || 'Ma thuật cơ bản';
    const limitations = system.limitations || [];
    
    return `
Bạn là AI Storyteller chuyên tạo cửa hàng cho game roleplay. Hãy tạo ${currentShop ? 'lại' : ''} inventory cho cửa hàng sau${currentShop ? ' (REROLL ITEMS)' : ''}:

THÔNG TIN ĐỊA ĐIỂM:
- Tên: ${location.name}
- Mô tả: ${location.description}
- Loại: ${location.type}
- Vai trò: ${(location as any).role || 'Mua bán vật phẩm'}

THÔNG TIN THẾ GIỚI:
- Settings: ${settings.join(', ')}
- Hệ thống sức mạnh: ${powerOrTech}
- Giới hạn: ${limitations.join(', ')}

${currentShop ? `CỬA HÀNG HIỆN TẠI:
- Skill book chance: ${currentShop.skillBookChance}% (sẽ tăng lên ${Math.min(70, currentShop.skillBookChance + 10)}% sau restock)
- Đã có ${currentShop.inventory.weapons.length} vũ khí, ${currentShop.inventory.armor.length} áo giáp, ${currentShop.inventory.accessories.length} phụ kiện, ${currentShop.inventory.consumables.length} consumables` : `CỬA HÀNG MỚI:
- Skill book chance: 10% (bắt đầu từ 10%)
- Tạo shop mới với inventory đa dạng`}

YÊU CẦU ${currentShop ? 'REROLL' : 'TẠO CỬA HÀNG'}:
- Tạo ${currentShop ? 'lại' : ''} inventory ${currentShop ? 'mới' : ''} (weapons, armor, accessories, consumables)
- TỔNG CỘNG: Tối đa 9 items (2-3 weapons, 1-2 armor, 2-3 accessories, 2-3 consumables)
- Skill books: Tối đa 2 items (dựa trên skillBookChance: ${currentShop ? Math.min(70, currentShop.skillBookChance + 10) : 10}%)
- Cân bằng giá cả theo level thế giới
- QUAN TRỌNG KHI RESTOCK: Tạo items HOÀN TOÀN KHÁC BIỆT với shop cũ
- Đa dạng hóa tên, mô tả, stats, và giá cả
- Sử dụng các loại vũ khí, áo giáp, phụ kiện khác nhau
- Tạo giá cả đa dạng từ nhưng phải phù hợp

TỶ LỆ RARITY (QUAN TRỌNG):
- COMMON: 40% (4 items)
- UNCOMMON: 30% (3 items) 
- RARE: 20% (2 items)
- EPIC: 8% (1 item)
- LEGENDARY: 2% (có thể có 1 item)
- Ưu tiên tạo ít nhất 1-2 items RARE/EPIC/LEGENDARY

QUAN TRỌNG VỀ GIÁ CẢ:
- value: Giá trị cơ bản của item (dùng để tính giá bán cho player)
- buyPrice: Giá bán từ shop (thường gấp 1.5-2 lần value)
- Tỷ lệ: buyPrice = value × 1.5-2.0 (tùy theo rarity và sức mạnh)
- Player bán = value × 0.5 (50% giá trị cơ bản)

TRẢ VỀ JSON THEO FORMAT CHÍNH XÁC (ĐỒNG NHẤT VỚI HỆ THỐNG):
{
  "merchantShop": {
    "inventory": {
       "weapons": [
         {
           "id": "weapon_1",
           "name": "Tên vũ khí",
           "description": "Mô tả chi tiết",
           "type": "weapon",
           "rarity": "common",
           "quantity": 1,
           "icon": "⚔️",
           "damage": "1d6+1",
           "damageType": "physical",
           "attackBonus": 1,
           "slot": "weapon",
           "value": 50,
           "buyPrice": 100,
           "tags": ["weapon", "melee"]
         }
       ],
       "armor": [
         {
           "id": "armor_1",
           "name": "Tên áo giáp",
           "description": "Mô tả chi tiết",
           "type": "armor",
           "rarity": "common",
           "quantity": 1,
           "icon": "🛡️",
           "armorClass": 12,
           "slot": "armor",
           "value": 40,
           "buyPrice": 80,
           "tags": ["armor", "protection"]
         }
       ],
       "accessories": [
         {
           "id": "accessory_1",
           "name": "Tên phụ kiện",
           "description": "Mô tả chi tiết",
           "type": "accessory",
           "rarity": "common",
           "quantity": 1,
           "icon": "💍",
           "slot": "accessory1",
           "value": 30,
           "buyPrice": 60,
           "tags": ["accessory", "magical"]
         }
       ],
       "consumables": [
         {
           "id": "consumable_1",
           "name": "Tên consumable",
           "description": "Mô tả chi tiết",
           "type": "consumable",
           "rarity": "common",
           "quantity": 5,
           "icon": "🧪",
           "effect": "heal:1d4:+1:instant",
           "value": 25,
           "buyPrice": 40,
           "tags": ["consumable", "healing"]
         }
       ],
       "skillBooks": [
         {
           "id": "skillbook_1",
           "name": "Sách Kỹ Năng: Lưỡi Kiếm Sấm Sét",
           "description": "Học 1 skill ngẫu nhiên thuộc loại damage với level 1",
           "type": "skill_book",
           "skillType": "damage",
           "skillLevel": 1,
           "rarity": "common",
           "value": 100,
           "buyPrice": 150,
           "icon": "📖",
           "quantity": 1,
           "skillData": {
             "id": "skill_damage_random_1",
             "name": "Lưỡi Kiếm Sấm Sét",
             "description": "Mô tả ngắn gọn về cách sử dụng và hiệu quả",
             "level": 1,
             "skillType": "damage",
             "effects": ["instant_damage:1d6+2", "stat_buff:strength:+1:self:2turns"],
             "cooldown": 3,
             "currentCooldown": 0,
             "icon": "⚔️",
             "requiresTarget": true
           },
           "effects": ["learn_skill:skill_damage_random_1"]
         }
       ]
    }
  }
}

QUAN TRỌNG VỀ FORMAT (ĐỒNG NHẤT VỚI HỆ THỐNG):
- Giá cả phù hợp với thế giới (value = giá bán, buyPrice = giá mua = value * 1.5)
- Rarity phân bố: 50% common, 25% uncommon, 15% rare, 8% epic, 2% legendary

WEAPONS (VŨ KHÍ):
- BẮT BUỘC: damage, damageType, attackBonus, slot, quantity
- damage: "1d4", "1d6", "1d6+1", "1d8+2", "2d6+4" (dựa trên rarity)
- damageType: "physical", "magical", "fire", "cold", "lightning", "poison", "psychic", "radiant", "bludgeoning", "slashing", "piercing"
- attackBonus: +0 đến +5 (common=0-1, uncommon=1-2, rare=2-3, epic=3-4, legendary=4-5)
- slot: "weapon"
- quantity: 1 (vũ khí chỉ có 1 cái)
- icon: "⚔️", "🗡️", "🏹", "🔨", "⚡"

ARMOR (ÁO GIÁP):
- BẮT BUỘC: armorClass, slot, quantity
- armorClass: 10-20 (common=11-12, uncommon=12-13, rare=13-14, epic=14-15, legendary=15-16)
- slot: "armor" (CHỈ slot armor mới có armorClass)
- quantity: 1 (áo giáp chỉ có 1 cái)
- icon: "🛡️", "⛑️", "🧥", "👕", "👖", "👟"

ACCESSORIES (PHỤ KIỆN):
- BẮT BUỘC: slot, quantity
- slot: "accessory1", "accessory2", "accessory3" (KHÔNG có armorClass)
- quantity: 1 (phụ kiện chỉ có 1 cái)
- icon: "💍", "⌚", "📿", "🎭", "🔮", "💎", "🌟", "✨"
- KHÔNG có: damage, damageType, attackBonus, armorClass

CONSUMABLES (VẬT PHẨM TIÊU DÙNG):
- BẮT BUỘC: effect (format chuẩn theo consumableDatabase.ts), quantity
- Effect format: "type:value:duration" (theo consumableDatabase.ts)
- Healing: "heal:1d4:+1:instant", "heal:2d4:+2:instant", "heal:4d4:+4:instant", "heal:full:instant"
- Damage Buff: "damage_buff:+1d4:3turns", "damage_buff:+1d6:5turns", "damage_buff:+2d6:4turns"
- AC Buff: "stat_buff:ac:+2:3turns", "stat_buff:ac:+3:5turns", "stat_buff:ac:+4:6turns"
- Stat Buff: "stat_buff:strength:+2:5turns", "stat_buff:agility:+3:5turns", "stat_buff:intelligence:+4:5turns"
- Debuff: "debuff:poison:1d4:3turns", "debuff:weakness:2:2turns", "debuff:slow:1:4turns"
- Cure: "heal:cure_poison:instant", "heal:cure_all:instant"
- Combo Effects: "heal:1d4:+1:instant|stat_buff:ac:+2:5turns"
- quantity: Random từ 1-10 (mỗi lần mua -1)
- icon: "🧪", "💊", "🍯", "🌿", "💧", "🔥", "❄️", "⚡"
- KHÔNG có: damage, damageType, attackBonus, armorClass, slot

SKILL BOOKS (SÁCH KỸ NĂNG) - QUAN TRỌNG NHẤT:
- Tối đa 2 items (nếu có, dựa trên skillBookChance)
- QUY TẮC TẠO SKILL BOOKS:
  * skillBookChance = 0%: KHÔNG tạo skill books
  * skillBookChance = 10-40%: Tạo 1 skill book (random)
  * skillBookChance = 50-70%: Tạo 1-2 skill books (random)
  * skillBookChance = 70%+: Tạo 2 skill books (random)

BẮT BUỘC CHO SKILL BOOKS (KHÔNG ĐƯỢC SAI):
- BẮT BUỘC có trường "skillData" chứa skill data đầy đủ
- BẮT BUỘC có trường "type": "skill_book"
- BẮT BUỘC có trường "skillType": "damage" | "healing" | "social"
- BẮT BUỘC có trường "skillLevel": 1 | 2 | 3
- BẮT BUỘC có trường "rarity": "common" | "uncommon" | "rare" | "epic" | "legendary"
- BẮT BUỘC có trường "quantity": 1
- BẮT BUỘC có trường "value": số (base value)
- BẮT BUỘC có trường "buyPrice": số (value * rarity multiplier)
- BẮT BUỘC có trường "icon": "📖"
- BẮT BUỘC có trường "effects": ["learn_skill:skill_id"]

SKILL DATA BẮT BUỘC (TRONG skillData):
- BẮT BUỘC có trường "id": string unique
- BẮT BUỘC có trường "name": string (tên kỹ năng thuần túy)
- BẮT BUỘC có trường "description": string
- BẮT BUỘC có trường "level": 1 | 2 | 3
- BẮT BUỘC có trường "skillType": "damage" | "healing" | "social"
- BẮT BUỘC có trường "effects": string[] (ít nhất 2 effects)
- BẮT BUỘC có trường "cooldown": number (2-4 cho damage/healing, 0 cho social)
- BẮT BUỘC có trường "currentCooldown": 0
- BẮT BUỘC có trường "icon": string (emoji phù hợp)
- BẮT BUỘC có trường "requiresTarget": boolean (true cho damage, false cho healing/social)

EFFECTS FORMAT BẮT BUỘC (KHÔNG ĐƯỢC SAI):
- Damage: "instant_damage:1d6+2" (KHÔNG có target, sẽ tự động target enemy)
- Healing: "instant_heal:1d6+2" (KHÔNG có target, sẽ tự động target self)
- Stat Buff: "stat_buff:strength:+1:self:2turns" (BẮT BUỘC có :self:)
- Stat Debuff: "stat_buff:enemy:-1:enemy:2turns" (BẮT BUỘC có :enemy:)
- Defend: "defend" (KHÔNG có tham số khác)

TÊN QUAN TRỌNG (KHÔNG ĐƯỢC SAI):
- Skill book name: "Sách Kỹ Năng: [Tên Kỹ Năng]" hoặc "Tập Kỹ Năng: [Tên Kỹ Năng]"
- Skill name: tên kỹ năng thuần túy (KHÔNG có prefix "Sách Kỹ Năng")
- VÍ DỤ: skillBook.name = "Sách Kỹ Năng: Lưỡi Kiếm Sấm Sét", skillData.name = "Lưỡi Kiếm Sấm Sét"

RARITY VÀ GIÁ CẢ:
- RARITY: Random theo tỷ lệ (40% common, 30% uncommon, 20% rare, 8% epic, 2% legendary)
- GIÁ CẢ: value = base value, buyPrice = value * rarity multiplier
- Level 1: base 100-150, Level 2: base 200-300, Level 3: base 400-600

LƯU Ý QUAN TRỌNG:
- KHÔNG được tạo skill book nếu không chắc chắn về format
- KIỂM TRA KỸ tất cả trường bắt buộc trước khi tạo
- ĐẢM BẢO effects đúng format chuẩn
- ĐẢM BẢO tên skill book khác tên skill

MÔ TẢ VÀ TÊN:
- Mô tả chi tiết và hấp dẫn
- Phù hợp với loại cửa hàng (rèn, thuốc, chợ trời, etc.)
- Tên phù hợp với thời đại và thế giới game
`;
  }

  /**
   * Lấy thời gian hiện tại của thế giới
   */
  private getCurrentWorldTime(): WorldTime {
    try {
      const worldDataStr = localStorage.getItem('world_gen_result');
      if (worldDataStr) {
        const worldData = JSON.parse(worldDataStr);
        return worldData.currentTime || worldTimeService.initializeWorldTime(worldData.startYear || 1);
      }
    } catch (error) {
      console.error('Error getting current world time:', error);
    }
    
    return worldTimeService.initializeWorldTime(1);
  }

  /**
   * Tạo merchant shop bằng AI prompt
   */
  private async generateMerchantShopWithAI(location: Location, worldData: WorldData): Promise<MerchantShop> {
    
      // Tạo prompt cho AI
      const prompt = this.buildRerollShopPrompt(location, worldData);
    
    // Gọi AI service để tạo shop
    try {
      // Import geminiService dynamically để tránh circular dependency
      const { geminiService } = await import('./geminiService');
      
      // Gọi AI để tạo shop data
      console.log('Calling AI to generate shop...');
      const aiResponse = await geminiService.generateMerchantShopData(prompt);
      console.log('AI Response received:', aiResponse);
      
      if (aiResponse && aiResponse.merchantShop && aiResponse.merchantShop.inventory) {
        const shop: MerchantShop = {
          locationId: location.id,
          merchantNPCId: '', // Sẽ được gán khi có merchant signature NPC
          lastRestockTime: worldData.currentTime || worldTimeService.initializeWorldTime(worldData.startYear || 1),
          inventory: aiResponse.merchantShop.inventory,
          skillBookChance: 10, // Bắt đầu từ 10%
          currency: 999999 // Merchant có vô hạn tiền
        };

        // Tạo skill books dựa trên skillBookChance
        await this.generateSkillBooks(shop);
        
        this.merchantShops.set(location.id, shop);
        this.saveMerchantShops();
        
        console.log('🔍 Generated shop and saved to Map:', location.id, shop);
        console.log('🔍 Current merchantShops Map size:', this.merchantShops.size);
        
        return shop;
       } else {
         console.error('AI failed to generate shop data - NO FALLBACK!');
         console.error('AI Response:', aiResponse);
         throw new Error('AI shop generation failed - no fallback available');
       }
    } catch (error) {
      console.error('Error calling AI for shop generation:', error);
      console.error('NO FALLBACK - AI MUST WORK!');
      throw error;
    }
  }


  /**
   * Delete merchant shop by location ID
   */
  public deleteMerchantShop(locationId: string): void {
    console.log('Before delete - merchantShops size:', this.merchantShops.size);
    console.log('Before delete - merchantShops keys:', Array.from(this.merchantShops.keys()));
    
    const deleted = this.merchantShops.delete(locationId);
    console.log('Delete result:', deleted);
    
    this.saveMerchantShops();
    console.log('After delete - merchantShops size:', this.merchantShops.size);
    console.log('After delete - merchantShops keys:', Array.from(this.merchantShops.keys()));
    console.log('Deleted merchant shop for location:', locationId);
  }

  /**
   * Restock shop manually (simple version - just regenerate shop)
   */
  public async restockShop(locationId: string): Promise<boolean> {
    try {
      // Lấy world data
      const worldDataStr = localStorage.getItem('world_gen_result');
      if (!worldDataStr) {
        console.error('No world data found for restock');
        return false;
      }

      const worldData = JSON.parse(worldDataStr);
      const location = worldData.locations?.find((loc: any) => loc.id === locationId);
      
      if (!location) {
        console.error(`Location not found for restock: ${locationId}`);
        return false;
      }

      // Tạo shop mới hoàn toàn với skillBookChance tăng dần
      console.log('Generating new shop with AI...');
      const newShop = await this.generateMerchantShopWithAI(location, worldData);
      
      if (newShop) {
        // Tăng skillBookChance từ shop cũ (nếu có)
        const oldShop = this.merchantShops.get(locationId);
        if (oldShop) {
          newShop.skillBookChance = Math.min(70, oldShop.skillBookChance + 10);
          console.log(`🔍 SkillBookChance increased: ${oldShop.skillBookChance}% → ${newShop.skillBookChance}%`);
        } else {
          newShop.skillBookChance = 10; // Bắt đầu từ 10% nếu là shop mới
          console.log(`🔍 New shop skillBookChance: ${newShop.skillBookChance}%`);
        }
        
        console.log('New shop generated successfully');
        console.log('New shop inventory:', {
          weapons: newShop.inventory.weapons.length,
          armor: newShop.inventory.armor.length,
          accessories: newShop.inventory.accessories.length,
          consumables: newShop.inventory.consumables.length
        });
        console.log('New shop weapons:', newShop.inventory.weapons.map(w => ({ name: w.name, price: w.buyPrice })));
        
        // Cập nhật shop với dữ liệu mới
        this.merchantShops.set(locationId, newShop);
        this.saveMerchantShops();
        
        console.log('Shop restocked successfully');
        return true;
      } else {
        console.error('Failed to generate new shop');
        return false;
      }
    } catch (error) {
      console.error('Error restocking shop:', error);
      return false;
    }
  }

  /**
   * Kiểm tra và restock shop nếu cần (CHỈ DÙNG AI)
   */
  public async restockShopIfNeeded(shop: MerchantShop, currentTime: WorldTime): Promise<boolean> {
    // Check if it's a new day
    if (!worldTimeService.isNewDay(shop.lastRestockTime, currentTime)) {
      return false;
    }
    
    try {
      // Lấy world data để reroll
      const worldDataStr = localStorage.getItem('world_gen_result');
      if (!worldDataStr) {
        console.error('No world data found for restock');
        return false;
      }

      const worldData = JSON.parse(worldDataStr);
      const location = worldData.locations?.find((loc: any) => loc.id === shop.locationId);
      
      if (!location) {
        console.error(`Location not found for restock: ${shop.locationId}`);
        return false;
      }

      // Tạo prompt để reroll items
      const prompt = this.buildRerollShopPrompt(location, worldData, shop);
      
      // Gọi AI để reroll items
      const { geminiService } = await import('./geminiService');
      const aiResponse = await geminiService.generateMerchantShopData(prompt);
      
      if (aiResponse && aiResponse.merchantShop && aiResponse.merchantShop.inventory) {
        // Cập nhật inventory mới (giữ nguyên skill books)
        const newInventory = aiResponse.merchantShop.inventory;
        shop.inventory.weapons = newInventory.weapons || shop.inventory.weapons;
        shop.inventory.armor = newInventory.armor || shop.inventory.armor;
        shop.inventory.accessories = newInventory.accessories || shop.inventory.accessories;
        shop.inventory.consumables = newInventory.consumables || shop.inventory.consumables;
        // Giữ nguyên skill books
        
        // Tăng skill book chance
        shop.skillBookChance = Math.min(70, shop.skillBookChance + 10);
        
        // Cập nhật thời gian restock
        shop.lastRestockTime = currentTime;
        
        this.merchantShops.set(shop.locationId, shop);
        this.saveMerchantShops();
        
        return true;
      } else {
        console.error('AI failed to restock shop - NO FALLBACK!');
        return false;
      }
    } catch (error) {
      console.error('Error restocking shop with AI:', error);
      return false;
    }
  }

  /**
   * Kiểm tra và restock tất cả shops (CHỈ DÙNG AI)
   */
  public async checkAndRestockShops(currentTime: WorldTime): Promise<void> {
    const restockPromises = [];
    for (const shop of this.merchantShops.values()) {
      restockPromises.push(this.restockShopIfNeeded(shop, currentTime));
    }
    await Promise.all(restockPromises);
  }

  /**
   * Tính giá skill book (sử dụng hệ thống giá mới)
   */
  public calculateSkillBookPrice(level: number, rarity: string): number {
    return this.calculateSkillBookValue(level, rarity);
  }

  /**
   * Lấy merchant shop theo location ID
   */
  public getMerchantShopByLocation(locationId: string): MerchantShop | null {
    console.log('getMerchantShopByLocation called with locationId:', locationId);
    console.log('Available locationIds in merchantShops:', Array.from(this.merchantShops.keys()));
    const shop = this.merchantShops.get(locationId);
    console.log('Found shop:', shop ? 'YES' : 'NO');
    return shop || null;
  }

  /**
   * Lấy tất cả merchant shops
   */
  public getMerchantShops(): MerchantShop[] {
    return Array.from(this.merchantShops.values());
  }

  /**
   * Lưu merchant shops vào localStorage
   */
  private saveMerchantShops(): void {
    try {
      // Convert Map to object (like combat_history format)
      const shopsObject: { [key: string]: MerchantShop } = {};
      this.merchantShops.forEach((shop, locationId) => {
        shopsObject[locationId] = shop;
      });
      localStorage.setItem('merchant_shops', JSON.stringify(shopsObject));
      console.log('🔍 Saved merchant shops to localStorage:', shopsObject);
    } catch (error) {
      console.error('Error saving merchant shops:', error);
    }
  }

  /**
   * Load merchant shops từ save game data
   */
  public loadFromSaveGame(merchantShopData: { shops: { [key: string]: MerchantShop } }): void {
    try {
      console.log('🔍 loadFromSaveGame called with:', merchantShopData);
      if (merchantShopData && merchantShopData.shops) {
        this.merchantShops.clear();
        Object.entries(merchantShopData.shops).forEach(([locationId, shop]) => {
          this.merchantShops.set(locationId, shop);
          console.log('🔍 Loaded shop from save game:', locationId, shop);
        });
        console.log('🔍 Loaded merchant shops count:', this.merchantShops.size);
      }
    } catch (error) {
      console.error('Error loading merchant shops from save game:', error);
    }
  }

  /**
   * Reload merchant shops từ localStorage (sau khi load game)
   */
  public reloadFromLocalStorage(): void {
    this.loadMerchantShopsFromLocalStorage();
  }

  /**
   * Export merchant shops cho save game
   */
  public exportForSaveGame(): { shops: { [key: string]: MerchantShop } } {
    const shops: { [key: string]: MerchantShop } = {};
    console.log('🔍 Exporting merchant shops, current count:', this.merchantShops.size);
    console.log('🔍 Merchant shops keys:', Array.from(this.merchantShops.keys()));
    
    this.merchantShops.forEach((shop, locationId) => {
      shops[locationId] = shop;
      console.log('🔍 Exported shop:', locationId, shop);
    });
    
    console.log('🔍 Final export result:', { shops });
    console.log('🔍 Export result type:', typeof shops, Array.isArray(shops) ? 'ARRAY' : 'OBJECT');
    return { shops };
  }

  /**
   * Xóa merchant shop
   */
  public removeMerchantShop(locationId: string): void {
    this.merchantShops.delete(locationId);
    this.saveMerchantShops();
  }

  /**
   * Clear all merchant shops (for new game)
   */
  public clearAllMerchantShops(): void {
    this.merchantShops.clear();
    localStorage.removeItem('merchant_shops');
  }

  /**
   * Tạo skill books dựa trên skillBookChance
   */
  private async generateSkillBooks(shop: MerchantShop): Promise<void> {
    const skillBookChance = shop.skillBookChance;
    const random = Math.random() * 100;
    
    console.log(`🔍 Skill book generation: ${random.toFixed(2)}% vs ${skillBookChance}% chance`);
    
    if (random <= skillBookChance) {
      // Tạo 1-2 skill books
      const numSkillBooks = Math.random() < 0.5 ? 1 : 2;
      console.log(`🔍 Generating ${numSkillBooks} skill book(s)`);
      
      for (let i = 0; i < numSkillBooks; i++) {
        const skillBook = await this.createRandomSkillBook();
        shop.inventory.skillBooks = shop.inventory.skillBooks || [];
        shop.inventory.skillBooks.push(skillBook);
      }
    } else {
      console.log('🔍 No skill books generated this time');
    }
  }

  /**
   * Tạo skill book ngẫu nhiên sử dụng AI với rarity và effect random
   */
  private async createRandomSkillBook(): Promise<any> {
    try {
      // Random rarity với tỷ lệ cân bằng
      const rarityRoll = Math.random() * 100;
      let rarity: string;
      if (rarityRoll <= 40) rarity = 'common';
      else if (rarityRoll <= 70) rarity = 'uncommon';
      else if (rarityRoll <= 90) rarity = 'rare';
      else if (rarityRoll <= 98) rarity = 'epic';
      else rarity = 'legendary';

      // Random skill type
      const skillTypes = ['damage', 'healing', 'social'];
      const skillType = skillTypes[Math.floor(Math.random() * skillTypes.length)];

      // Random level dựa trên rarity
      let skillLevel: number;
      if (rarity === 'common') skillLevel = 1;
      else if (rarity === 'uncommon') skillLevel = Math.random() < 0.7 ? 1 : 2;
      else if (rarity === 'rare') skillLevel = Math.random() < 0.5 ? 2 : 3;
      else if (rarity === 'epic') skillLevel = 3;
      else skillLevel = 3; // legendary

      // Tạo prompt cho AI
      const prompt = `Tạo 1 skill book ngẫu nhiên với thông tin sau:

RARITY: ${rarity}
SKILL TYPE: ${skillType}
SKILL LEVEL: ${skillLevel}

YÊU CẦU BẮT BUỘC:
- Tạo skill book với rarity ${rarity} (${this.getRarityDescription(rarity)})
- Skill type: ${skillType} (${this.getSkillTypeDescription(skillType)})
- Skill level: ${skillLevel} (${this.getLevelDescription(skillLevel)})
- Tên skill book phải KHÁC với tên skill bên trong
- Tên skill book: "Sách Kỹ Năng: [Tên Kỹ Năng]" hoặc "Tập Kỹ Năng: [Tên Kỹ Năng]"
- Tên skill bên trong: tên kỹ năng thực tế (không có prefix "Sách Kỹ Năng")
- Effects phải cân bằng theo level và rarity
- Cooldown phù hợp với skill type

EFFECTS FORMAT BẮT BUỘC (KHÔNG ĐƯỢC SAI):
- Damage: "instant_damage:1d6+2" (KHÔNG có target, sẽ tự động target enemy)
- Healing: "instant_heal:1d6+2" (KHÔNG có target, sẽ tự động target self)
- Stat Buff: "stat_buff:strength:+1:self:2turns" (BẮT BUỘC có :self:)
- Stat Debuff: "stat_buff:enemy:-1:enemy:2turns" (BẮT BUỘC có :enemy:)
- Defend: "defend" (KHÔNG có tham số khác)

VÍ DỤ TÊN:
- Skill book name: "Sách Kỹ Năng: Lưỡi Kiếm Sấm Sét"
- Skill name: "Lưỡi Kiếm Sấm Sét"

JSON FORMAT BẮT BUỘC (KHÔNG ĐƯỢC SAI):
{
  "skillBook": {
    "id": "skill_book_unique_id",
    "name": "Sách Kỹ Năng: [Tên Kỹ Năng]",
    "description": "Mô tả skill book",
    "type": "skill_book",
    "rarity": "${rarity}",
    "quantity": 1,
    "value": 0,
    "buyPrice": 0,
    "skillData": {
      "id": "skill_unique_id",
      "name": "[Tên Kỹ Năng]",
      "description": "Mô tả skill",
      "level": ${skillLevel},
      "skillType": "${skillType}",
      "effects": ["effect1", "effect2"],
      "cooldown": 0,
      "currentCooldown": 0,
      "icon": "emoji",
      "requiresTarget": true/false
    },
    "skillType": "${skillType}",
    "skillLevel": ${skillLevel},
    "effects": ["learn_skill:skill_id"],
    "icon": "📖"
  }
}

QUAN TRỌNG NHẤT:
- Tên skill book và tên skill PHẢI KHÁC NHAU
- Skill book name có prefix "Sách Kỹ Năng:" hoặc "Tập Kỹ Năng:"
- Skill name là tên kỹ năng thuần túy
- Effects phải đúng format chuẩn (xem EFFECTS FORMAT BẮT BUỘC)
- Damage skills: requiresTarget = true, cooldown 2-4
- Healing skills: requiresTarget = false, cooldown 2-4  
- Social skills: requiresTarget = false, cooldown = 0
- Icon phù hợp với skill type
- Chỉ trả về JSON thuần túy, không thêm text khác
- KIỂM TRA KỸ tất cả trường bắt buộc trước khi tạo`;

      const { geminiService } = await import('./geminiService');
      const response = await geminiService.generateContent(prompt);
      
      if (!response) {
        throw new Error('Failed to generate skill book');
      }

      // Parse JSON response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const skillBookData = JSON.parse(jsonMatch[0]);
      const skillBook = skillBookData.skillBook;

      // Tính giá dựa trên rarity và level
      const baseValue = this.calculateSkillBookValue(skillLevel, rarity);
      skillBook.value = baseValue;
      skillBook.buyPrice = Math.floor(baseValue * this.getRarityMultiplier(rarity));

      // Đảm bảo format chuẩn với SkillBook interface
      return {
        id: skillBook.id,
        name: skillBook.name,
        description: skillBook.description,
        type: 'skill_book' as const,
        skillType: skillBook.skillType,
        skillLevel: skillBook.skillLevel,
        rarity: skillBook.rarity,
        value: skillBook.value,
        buyPrice: skillBook.buyPrice,
        icon: skillBook.icon || '📖',
        quantity: 1,
        skillData: skillBook.skillData,
        effects: skillBook.effects || [`learn_skill:${skillBook.skillData.id}`]
      };

    } catch (error) {
      console.error('Error creating AI skill book:', error);
      // Fallback to template-based creation
      return this.createFallbackSkillBook();
    }
  }

  /**
   * Tạo skill book fallback khi AI fail
   */
  private createFallbackSkillBook(): any {
    const skillTemplates = [
      {
        skillType: 'damage',
        names: ['Lưỡi Kiếm Sắc Bén', 'Cú Đấm Sấm Sét', 'Tia Lửa Hủy Diệt'],
        descriptions: [
          'Tấn công mạnh mẽ với vũ khí sắc bén',
          'Cú đấm nhanh như chớp với sức mạnh tàn phá',
          'Phóng tia lửa thiêu đốt kẻ thù'
        ],
        effects: [
          ['instant_damage:1d6+2', 'stat_buff:strength:+1:self:2turns'],
          ['instant_damage:1d8+1', 'stat_buff:agility:+1:self:2turns'],
          ['instant_damage:2d4+1', 'stat_buff:intelligence:+1:self:2turns']
        ],
        icons: ['⚔️', '👊', '🔥'],
        cooldowns: [2, 3, 4]
      },
      {
        skillType: 'healing',
        names: ['Hồi Sinh', 'Lá Thuốc Thần', 'Ánh Sáng Chữa Lành'],
        descriptions: [
          'Hồi phục sức khỏe và tăng cường thể chất',
          'Sử dụng thảo dược quý để chữa lành vết thương',
          'Ánh sáng thiêng liêng chữa lành mọi tổn thương'
        ],
        effects: [
          ['instant_heal:1d6+2', 'stat_buff:constitution:+1:self:2turns'],
          ['instant_heal:2d4+1', 'stat_buff:wisdom:+1:self:2turns'],
          ['instant_heal:1d8+1', 'stat_buff:constitution:+2:self:1turns']
        ],
        icons: ['💚', '🌿', '✨'],
        cooldowns: [3, 4, 3]
      },
      {
        skillType: 'social',
        names: ['Thuyết Phục', 'Khích Lệ', 'Đàm Phán'],
        descriptions: [
          'Thuyết phục người khác bằng lời nói khéo léo',
          'Khích lệ tinh thần và tăng cường sự tự tin',
          'Đàm phán để đạt được thỏa thuận có lợi'
        ],
        effects: [
          ['stat_buff:charisma:+2:self:3turns', 'stat_buff:wisdom:+1:self:3turns'],
          ['stat_buff:charisma:+1:self:4turns', 'stat_buff:strength:+1:self:2turns'],
          ['stat_buff:wisdom:+2:self:3turns', 'stat_buff:intelligence:+1:self:3turns']
        ],
        icons: ['💬', '🎭', '🤝'],
        cooldowns: [0, 0, 0]
      }
    ];
    
    const template = skillTemplates[Math.floor(Math.random() * skillTemplates.length)];
    const skillIndex = Math.floor(Math.random() * template.names.length);
    const skillLevel = Math.floor(Math.random() * 3) + 1;
    const rarity = Math.random() < 0.5 ? 'common' : 'uncommon';
    
    const skill = {
      id: `skill_${template.skillType}_book_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: template.names[skillIndex],
      description: template.descriptions[skillIndex],
      level: skillLevel,
      skillType: template.skillType,
      effects: template.effects[skillIndex],
      cooldown: template.cooldowns[skillIndex],
      currentCooldown: 0,
      icon: template.icons[skillIndex],
      requiresTarget: template.skillType === 'damage'
    };
    
    const baseValue = this.calculateSkillBookValue(skillLevel, rarity);
    
    // Tạo tên skill book khác với tên skill
    const skillBookNames = [
      `Sách Kỹ Năng: ${skill.name}`,
      `Tập Kỹ Năng: ${skill.name}`,
      `Cuốn Sách: ${skill.name}`,
      `Tài Liệu: ${skill.name}`,
      `Bí Kíp: ${skill.name}`
    ];
    const skillBookName = skillBookNames[Math.floor(Math.random() * skillBookNames.length)];

    return {
      id: `skill_book_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: skillBookName,
      description: `Một cuốn sách cổ chứa kiến thức về "${skill.name}". Đọc để học kỹ năng này.`,
      type: 'skill_book' as const,
      rarity: rarity as 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary',
      quantity: 1,
      value: baseValue,
      buyPrice: Math.floor(baseValue * this.getRarityMultiplier(rarity)),
      skillData: skill,
      skillType: skill.skillType,
      skillLevel: skillLevel as 1 | 2 | 3,
      effects: [`learn_skill:${skill.id}`],
      icon: '📖'
    };
  }

  /**
   * Tính giá trị cơ bản của skill book
   */
  private calculateSkillBookValue(level: number, rarity: string): number {
    const baseValue = 100 + (level * 50); // Base 100 + 50 per level
    return Math.floor(baseValue * this.getRarityMultiplier(rarity));
  }

  /**
   * Lấy multiplier cho rarity
   */
  private getRarityMultiplier(rarity: string): number {
    const multipliers = {
      'common': 1.0,
      'uncommon': 1.5,
      'rare': 2.5,
      'epic': 4.0,
      'legendary': 6.0
    };
    return multipliers[rarity as keyof typeof multipliers] || 1.0;
  }

  /**
   * Lấy mô tả rarity
   */
  private getRarityDescription(rarity: string): string {
    const descriptions = {
      'common': 'Thường - Kỹ năng cơ bản',
      'uncommon': 'Hiếm - Kỹ năng nâng cao',
      'rare': 'Quý - Kỹ năng mạnh mẽ',
      'epic': 'Huyền Thoại - Kỹ năng siêu mạnh',
      'legendary': 'Truyền Thuyết - Kỹ năng tối thượng'
    };
    return descriptions[rarity as keyof typeof descriptions] || 'Thường';
  }

  /**
   * Lấy mô tả skill type
   */
  private getSkillTypeDescription(skillType: string): string {
    const descriptions = {
      'damage': 'Tấn Công - Gây sát thương',
      'healing': 'Hồi Phục - Chữa lành và buff',
      'social': 'Xã Hội - Giao tiếp và thuyết phục'
    };
    return descriptions[skillType as keyof typeof descriptions] || 'Tấn Công';
  }

  /**
   * Lấy mô tả level
   */
  private getLevelDescription(level: number): string {
    const descriptions = {
      1: 'Cơ Bản - Dễ học, hiệu quả vừa phải',
      2: 'Nâng Cao - Khó học hơn, hiệu quả tốt',
      3: 'Bậc Thầy - Rất khó học, hiệu quả cao'
    };
    return descriptions[level as keyof typeof descriptions] || 'Cơ Bản';
  }

  /**
   * Decrease item quantity in shop
   */
  public decreaseItemQuantity(locationId: string, itemId: string): void {
    const shop = this.merchantShops.get(locationId);
    if (!shop) return;

    // Find and decrease quantity in weapons
    const weaponIndex = shop.inventory.weapons.findIndex(item => item.id === itemId);
    if (weaponIndex !== -1) {
      shop.inventory.weapons[weaponIndex].quantity = Math.max(0, shop.inventory.weapons[weaponIndex].quantity - 1);
      this.saveMerchantShops();
      return;
    }

    // Find and decrease quantity in armor
    const armorIndex = shop.inventory.armor.findIndex(item => item.id === itemId);
    if (armorIndex !== -1) {
      shop.inventory.armor[armorIndex].quantity = Math.max(0, shop.inventory.armor[armorIndex].quantity - 1);
      this.saveMerchantShops();
      return;
    }

    // Find and decrease quantity in accessories
    const accessoryIndex = shop.inventory.accessories.findIndex(item => item.id === itemId);
    if (accessoryIndex !== -1) {
      shop.inventory.accessories[accessoryIndex].quantity = Math.max(0, shop.inventory.accessories[accessoryIndex].quantity - 1);
      this.saveMerchantShops();
      return;
    }

    // Find and decrease quantity in consumables
    const consumableIndex = shop.inventory.consumables.findIndex(item => item.id === itemId);
    if (consumableIndex !== -1) {
      shop.inventory.consumables[consumableIndex].quantity = Math.max(0, shop.inventory.consumables[consumableIndex].quantity - 1);
      this.saveMerchantShops();
      return;
    }

    // Find and decrease quantity in skill books
    const skillBookIndex = shop.inventory.skillBooks.findIndex(item => item.id === itemId);
    if (skillBookIndex !== -1) {
      shop.inventory.skillBooks[skillBookIndex].quantity = Math.max(0, shop.inventory.skillBooks[skillBookIndex].quantity - 1);
      this.saveMerchantShops();
      return;
    }
  }

  /**
   * Cập nhật skill book chance cho shop
   */
  public updateSkillBookChance(shop: MerchantShop, currentTime: WorldTime): void {
    const timeDiff = worldTimeService.getTimeDifference(shop.lastRestockTime, currentTime) / 60; // Convert to hours
    const daysPassed = Math.floor(timeDiff / 24);
    
    if (daysPassed > 0) {
      shop.skillBookChance = Math.min(70, shop.skillBookChance + (daysPassed * 10));
      this.merchantShops.set(shop.locationId, shop);
      this.saveMerchantShops();
    }
  }
}

export const merchantService = MerchantService.getInstance();
