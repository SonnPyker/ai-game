import { InventoryItem, Character, NPCRelationship } from '../types';
import { skillTreeService } from './skillTreeService';
import { npcRelationshipService } from './npcRelationshipService';
import { inventoryService } from './inventoryService';


class TradingService {
  private static instance: TradingService;

  private constructor() {}

  public static getInstance(): TradingService {
    if (!TradingService.instance) {
      TradingService.instance = new TradingService();
    }
    return TradingService.instance;
  }

  /**
   * Tính giá trị cơ bản của item dựa trên rarity
   */
  public calculateItemValue(item: InventoryItem): number {
    const rarityValues = {
      common: 10,
      uncommon: 50,
      rare: 200,
      epic: 800,
      legendary: 3000,
      unique: 5000
    };
    
    return rarityValues[item.rarity] || 10;
  }

  /**
   * Tính giá bán cho player (50% item value + skill bonuses)
   */
  public calculateSellPrice(item: InventoryItem, character: Character): number {
    const baseValue = item.value || this.calculateItemValue(item);
    const baseSellPrice = Math.floor(baseValue * 0.5); // 50% item value
    
    // Áp dụng skill bonuses
    const skillBonuses = skillTreeService.getActiveBonuses(character);
    let finalPrice = baseSellPrice;
    
    if (skillBonuses.sellPriceModifier) {
      finalPrice = Math.floor(finalPrice * (1 + skillBonuses.sellPriceModifier / 100));
    }
    
    return Math.max(1, finalPrice); // Tối thiểu 1 gold
  }

  /**
   * Tính giá mua từ merchant (item buyPrice + skill bonuses)
   */
  public calculateBuyPrice(item: InventoryItem, character: Character): number {
    const baseBuyPrice = item.buyPrice || (this.calculateItemValue(item) * 2);
    
    // Áp dụng skill bonuses
    const skillBonuses = skillTreeService.getActiveBonuses(character);
    let finalPrice = baseBuyPrice;
    
    if (skillBonuses.shopPriceModifier) {
      finalPrice = Math.floor(finalPrice * (1 + skillBonuses.shopPriceModifier / 100));
    }
    
    return Math.max(1, finalPrice); // Tối thiểu 1 gold
  }

  /**
   * Tính giá mua với relationship modifier
   */
  public calculateBuyPriceWithRelationship(item: InventoryItem, character: Character, merchant: NPCRelationship | null): number {
    let basePrice = this.calculateBuyPrice(item, character);
    
    if (merchant) {
      const relationshipModifier = this.calculateRelationshipPriceModifier(merchant.relationshipLevel);
      basePrice = Math.floor(basePrice * (1 + relationshipModifier));
    }
    
    return Math.max(1, basePrice);
  }

  /**
   * Tính giá bán với relationship modifier
   */
  public calculateSellPriceWithRelationship(item: InventoryItem, character: Character, merchant: NPCRelationship | null): number {
    let basePrice = this.calculateSellPrice(item, character);
    
    if (merchant) {
      const relationshipModifier = this.calculateRelationshipPriceModifier(merchant.relationshipLevel);
      // Relationship âm làm giảm giá bán
      basePrice = Math.floor(basePrice * (1 - relationshipModifier));
    }
    
    return Math.max(1, basePrice);
  }

  /**
   * Tính relationship price modifier
   */
  private calculateRelationshipPriceModifier(relationshipLevel: number): number {
    if (relationshipLevel >= 0) {
      return 0; // Không có modifier khi relationship dương hoặc bằng 0
    }
    
    // Relationship âm: tăng giá mua, giảm giá bán
    const modifier = Math.abs(relationshipLevel) * 0.005; // 0.5% mỗi điểm relationship âm
    return Math.min(0.5, modifier); // Tối đa 50%
  }


  /**
   * Xử lý giao dịch mua
   */
  public processBuyTransaction(character: Character, item: InventoryItem, merchant: NPCRelationship | null): {
    success: boolean;
    message: string;
    finalPrice: number;
  } {
    const basePrice = this.calculateBuyPriceWithRelationship(item, character, merchant);
    
    if (!character.currency || character.currency < basePrice) {
      return {
        success: false,
        message: 'Bạn không có đủ tiền để mua item này.',
        finalPrice: basePrice
      };
    }
    
    // Trừ tiền
    character.currency -= basePrice;
    
    // Đảm bảo inventoryService có character reference
    inventoryService.setCharacter(character);
    
    // Tạo item copy để thêm vào inventory
    const itemCopy: InventoryItem = {
      ...item,
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      value: Math.floor(basePrice * 0.5), // Giá bán = 50% giá mua
      buyPrice: basePrice,
      quantity: 1 // Đảm bảo quantity = 1 cho item mới
    };
    
    // Sử dụng inventoryService để thêm item (tự động stack nếu có thể)
    inventoryService.addItem(itemCopy);
    
    // Lưu character (inventoryService đã tự động cập nhật character)
    localStorage.setItem('currentCharacter', JSON.stringify(character));
    
    return {
      success: true,
      message: `Bạn đã mua ${item.name} với giá ${basePrice} gold.`,
      finalPrice: basePrice
    };
  }

  /**
   * Xử lý giao dịch bán
   */
  public processSellTransaction(character: Character, item: InventoryItem, merchant: NPCRelationship | null): {
    success: boolean;
    message: string;
    finalPrice: number;
  } {
    const sellQuantity = item.quantity || 1;
    const basePrice = this.calculateSellPriceWithRelationship(item, character, merchant);
    const totalPrice = basePrice * sellQuantity; // Nhân với số lượng
    
    // Thêm tiền
    if (!character.currency) {
      character.currency = 0;
    }
    character.currency += totalPrice;
    
    // Xử lý inventory
    if (character.inventory) {
      const itemIndex = character.inventory.findIndex(invItem => invItem.id === item.id);
      if (itemIndex !== -1) {
        const inventoryItem = character.inventory[itemIndex];
        const currentQuantity = inventoryItem.quantity || 1;
        
        if (currentQuantity <= sellQuantity) {
          // Nếu bán hết hoặc nhiều hơn, xóa item
          character.inventory.splice(itemIndex, 1);
        } else {
          // Nếu bán một phần, giảm quantity
          inventoryItem.quantity = currentQuantity - sellQuantity;
        }
      }
    }
    
    // Lưu character
    localStorage.setItem('currentCharacter', JSON.stringify(character));
    
    return {
      success: true,
      message: `Bạn đã bán ${sellQuantity} ${item.name} với giá ${totalPrice} gold.`,
      finalPrice: totalPrice
    };
  }

  /**
   * Lấy merchant relationship theo location
   */
  public getMerchantRelationship(locationId: string): NPCRelationship | null {
    // Tìm merchant NPC theo location
    const relationships = npcRelationshipService.getAllRelationships();
    const merchant = relationships.find(rel => 
      rel.location === locationId && 
      rel.tags?.includes('merchant')
    );
    
    return merchant || null;
  }

  /**
   * Cập nhật relationship sau giao dịch
   */
  public updateRelationshipAfterTrade(_character: Character, merchant: NPCRelationship | null, tradeType: 'buy' | 'sell', amount: number): void {
    if (!merchant) return;
    
    // Mua nhiều = relationship tăng
    // Bán nhiều = relationship tăng nhẹ
    let relationshipChange = 0;
    
    if (tradeType === 'buy') {
      // Mua: +1 relationship mỗi 100 gold
      relationshipChange = Math.floor(amount / 100);
    } else {
      // Bán: +1 relationship mỗi 200 gold
      relationshipChange = Math.floor(amount / 200);
    }
    
    if (relationshipChange > 0) {
      npcRelationshipService.updateRelationshipLevel(
        merchant.id,
        relationshipChange
      );
    }
  }

  /**
   * Lấy thông tin giá cả chi tiết
   */
  public getPriceInfo(item: InventoryItem, character: Character, merchant: NPCRelationship | null): {
    baseValue: number;
    buyPrice: number;
    sellPrice: number;
    relationshipModifier: number;
    skillBonuses: {
      shopPriceModifier: number;
      sellPriceModifier: number;
    };
  } {
    const baseValue = this.calculateItemValue(item);
    const buyPrice = this.calculateBuyPriceWithRelationship(item, character, merchant);
    const sellPrice = this.calculateSellPriceWithRelationship(item, character, merchant);
    
    const relationshipModifier = merchant ? 
      this.calculateRelationshipPriceModifier(merchant.relationshipLevel) : 0;
    
    const skillBonuses = skillTreeService.getActiveBonuses(character);
    
    return {
      baseValue,
      buyPrice,
      sellPrice,
      relationshipModifier: Math.round(relationshipModifier * 100),
      skillBonuses: {
        shopPriceModifier: skillBonuses.shopPriceModifier || 0,
        sellPriceModifier: skillBonuses.sellPriceModifier || 0
      }
    };
  }
}

export const tradingService = TradingService.getInstance();
