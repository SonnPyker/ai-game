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
      if (merchantShopsData) {
        const data = JSON.parse(merchantShopsData);
        if (data && Array.isArray(data)) {
          // Convert array to Map
          data.forEach((shop: MerchantShop) => {
            this.merchantShops.set(shop.locationId, shop);
          });
        }
      }
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
    // Kiểm tra xem shop đã tồn tại chưa
    let shop = this.merchantShops.get(locationId);
    if (shop) {
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
      shop = await this.generateMerchantShopWithAI(location, worldData);
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
   * Reroll shop items (giữ nguyên skill books, chỉ reroll weapons/armor/consumables)
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
          shop.inventory.consumables = newInventory.consumables || shop.inventory.consumables;
          // Giữ nguyên skill books
        }
        
        // Cập nhật thời gian restock
        shop.lastRestockTime = currentTime;
        
        // Tăng skill book chance (mỗi ngày +10%, tối đa 70%)
        shop.skillBookChance = Math.min(shop.skillBookChance + 10, 70);
        
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
- Skill book chance: ${currentShop.skillBookChance}%
- Đã có ${currentShop.inventory.weapons.length} vũ khí, ${currentShop.inventory.armor.length} áo giáp, ${currentShop.inventory.consumables.length} consumables` : `CỬA HÀNG MỚI:
- Skill book chance: 0% (bắt đầu từ 0%)
- Tạo shop mới với inventory đa dạng`}

YÊU CẦU ${currentShop ? 'REROLL' : 'TẠO CỬA HÀNG'}:
- Tạo ${currentShop ? 'lại' : ''} inventory ${currentShop ? 'mới' : ''} (weapons, armor, consumables)
- TỔNG CỘNG: Tối đa 9 items (3-4 weapons, 2-3 armor, 3-4 consumables)
- Skill books: Tối đa 2 items (nếu có, dựa trên skillBookChance)
- Cân bằng giá cả theo level thế giới

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
           "name": "Tên skill book",
           "description": "Học 1 skill ngẫu nhiên thuộc loại damage với level 1",
           "skillType": "damage",
           "skillLevel": 1,
           "rarity": "common",
           "price": 100,
           "icon": "📖",
           "quantity": 1,
           "skill": {
             "id": "skill_damage_random_1",
             "name": "Tên skill damage",
             "description": "Mô tả ngắn gọn về cách sử dụng và hiệu quả",
             "level": 1,
             "skillType": "damage",
             "effects": ["instant_damage:1d6+2", "stat_buff:strength:+1:self:2turns"],
             "cooldown": 3,
             "currentCooldown": 0,
             "icon": "⚔️",
             "requiresTarget": true
           }
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
- slot: "armor", "accessory1", "accessory2", "accessory3"
- quantity: 1 (áo giáp chỉ có 1 cái)
- icon: "🛡️", "⛑️", "🧥", "👕", "👖", "👟"

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

SKILL BOOKS (SÁCH KỸ NĂNG):
- Tối đa 2 items (nếu có, dựa trên skillBookChance)
- QUY TẮC TẠO SKILL BOOKS:
  * skillBookChance = 0%: KHÔNG tạo skill books
  * skillBookChance = 10-40%: Tạo 1 skill book (random)
  * skillBookChance = 50-70%: Tạo 1-2 skill books (random)
  * skillBookChance = 70%+: Tạo 2 skill books (random)
- Format JSON tương tự character creation skills
- BẮT BUỘC có trường "skill" chứa skill data đầy đủ
- Skill level: 1, 2, hoặc 3 (dựa trên rarity)
- Effects: ít nhất 2 effects trong array
- Cooldown: 2-4 lượt cho damage/healing, 0 cho social
- Icon: emoji phù hợp với skill type
- requiresTarget: true cho damage, false cho healing/social

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
      const aiResponse = await geminiService.generateMerchantShopData(prompt);
      
      if (aiResponse && aiResponse.merchantShop && aiResponse.merchantShop.inventory) {
        const shop: MerchantShop = {
          locationId: location.id,
          merchantNPCId: '', // Sẽ được gán khi có merchant signature NPC
          lastRestockTime: worldData.currentTime || worldTimeService.initializeWorldTime(worldData.startYear || 1),
          inventory: aiResponse.merchantShop.inventory,
          skillBookChance: 0, // Bắt đầu từ 0%
          currency: 999999 // Merchant có vô hạn tiền
        };

        this.merchantShops.set(location.id, shop);
        this.saveMerchantShops();
        
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
   * Kiểm tra và restock shop nếu cần (CHỈ DÙNG AI)
   */
  public async restockShopIfNeeded(shop: MerchantShop, currentTime: WorldTime): Promise<boolean> {
    const timeDiff = worldTimeService.getTimeDifference(shop.lastRestockTime, currentTime) / 60; // Convert to hours
    
    // Nếu đã qua 24 giờ (1 ngày game)
    if (timeDiff >= 24) {
      
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
    
    return false;
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
   * Tính giá skill book
   */
  public calculateSkillBookPrice(level: number, rarity: string): number {
    const basePrices = { 
      common: 50, 
      uncommon: 150, 
      rare: 400, 
      epic: 1000, 
      legendary: 2500 
    };
    
    const levelMultipliers = { 1: 1, 2: 2.5, 3: 5 };
    
    const basePrice = basePrices[rarity as keyof typeof basePrices] || 50;
    const levelMultiplier = levelMultipliers[level as keyof typeof levelMultipliers] || 1;
    
    return Math.floor(basePrice * levelMultiplier);
  }

  /**
   * Lấy merchant shop theo location ID
   */
  public getMerchantShopByLocation(locationId: string): MerchantShop | null {
    const shop = this.merchantShops.get(locationId);
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
      const shopsArray = Array.from(this.merchantShops.values());
      localStorage.setItem('merchant_shops', JSON.stringify(shopsArray));
    } catch (error) {
      console.error('Error saving merchant shops:', error);
    }
  }

  /**
   * Load merchant shops từ save game data
   */
  public loadFromSaveGame(merchantShopData: { shops: { [key: string]: MerchantShop } }): void {
    try {
      if (merchantShopData && merchantShopData.shops) {
        this.merchantShops.clear();
        Object.entries(merchantShopData.shops).forEach(([, shop]) => {
          this.merchantShops.set(shop.locationId, shop);
        });
      }
    } catch (error) {
      console.error('Error loading merchant shops from save game:', error);
    }
  }

  /**
   * Export merchant shops cho save game
   */
  public exportForSaveGame(): { shops: { [key: string]: MerchantShop } } {
    const shops: { [key: string]: MerchantShop } = {};
    this.merchantShops.forEach((shop, locationId) => {
      shops[locationId] = shop;
    });
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
