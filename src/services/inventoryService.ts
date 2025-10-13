import { InventoryItem, Equipment, Character } from '../types';
import { storageCache } from './storageCache';
import { skillTreeService } from './skillTreeService';

class InventoryService {
  private static instance: InventoryService;
  private inventory: InventoryItem[] = [];
  private equipment: Equipment = {};
  private character: Character | null = null;

  private constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): InventoryService {
    if (!InventoryService.instance) {
      InventoryService.instance = new InventoryService();
    }
    return InventoryService.instance;
  }

  // Load inventory and equipment from localStorage (with cache)
  private loadFromStorage(): void {
    try {
      const savedInventory = storageCache.get<InventoryItem[]>('game_inventory');
      if (savedInventory) {
        this.inventory = savedInventory;
      }

      const savedEquipment = storageCache.get<Equipment>('game_equipment');
      if (savedEquipment) {
        this.equipment = savedEquipment;
      }
    } catch (error) {
      console.warn('Failed to load inventory/equipment from storage:', error);
      this.inventory = [];
      this.equipment = {};
    }
  }

  // Save inventory and equipment to localStorage (with cache)
  private saveToStorage(): void {
    try {
      storageCache.set('game_inventory', this.inventory);
      storageCache.set('game_equipment', this.equipment);
    } catch (error) {
      console.warn('Failed to save inventory/equipment to storage:', error);
    }
  }

  // Set character reference for stats updates
  public setCharacter(character: Character): void {
    this.character = character;
    if (character.inventory) {
      this.inventory = character.inventory;
    }
    if (character.equipment) {
      this.equipment = character.equipment;
    }
    
    // Migrate old saves: add armorClass to coreStats if missing
    this.migrateOldSave(character);
    
    this.updateCharacterStats();
  }

  // Migrate old saves to include armorClass in coreStats
  private migrateOldSave(character: Character): void {
    if (character.coreStats && character.coreStats.armorClass === undefined) {
      // Calculate AC for old saves using the same logic as calculateArmorClass
      let ac = 10; // Base AC
      
      // Add agility modifier
      const agilityModifier = character.coreStats.modifiers?.agility ?? 
        Math.floor((character.coreStats.agility - 10) / 2);
      ac += agilityModifier;
      
      // Check for chest armor equipment
      if (character.equipment?.chest && character.equipment.chest.armorClass) {
        // Use armor's AC + agility modifier
        ac = character.equipment.chest.armorClass + agilityModifier;
      }
      
      character.coreStats.armorClass = ac;
      
      // Save updated character to localStorage (with cache)
      storageCache.set('currentCharacter', character);
      console.log('Migrated old save: Added armorClass to coreStats');
    }
  }

  // Parse items from AI response and return them for popup selection
  public parseItemsFromAIResponse(aiResponse: any): InventoryItem[] {
    if (!aiResponse || !aiResponse.sceneState) return [];

    const sceneState = aiResponse.sceneState;
    const foundItems: InventoryItem[] = [];
    
    // CHỈ parse items từ sceneState.availableItems của AI response hiện tại
    console.log('🔍 Debug Item Detection:', {
      hasSceneState: !!sceneState,
      hasAvailableItems: !!sceneState.availableItems,
      availableItemsCount: sceneState.availableItems?.length || 0,
      availableItems: sceneState.availableItems
    });
    
    if (sceneState.availableItems && Array.isArray(sceneState.availableItems)) {
      sceneState.availableItems.forEach((itemData: any, index: number) => {
        console.log(`🔍 Processing item ${index}:`, itemData);
        
        if (this.isValidItemData(itemData)) {
          const item = this.createItemFromData(itemData);
          if (item) {
            // Lọc bỏ quest reward items khỏi scene items
            const tags = item.tags || [];
            const isQuestReward = tags.some(tag => 
              tag.toLowerCase().includes('reward') || 
              tag.toLowerCase().includes('quest')
            );
            
            if (!isQuestReward) {
              foundItems.push(item);
              console.log(`✅ Added item to foundItems:`, item.name);
            } else {
              console.log(`❌ Skipped quest reward item:`, item.name);
            }
          } else {
            console.log(`❌ Failed to create item from data:`, itemData);
          }
        } else {
          console.log(`❌ Invalid item data:`, itemData);
        }
      });
    }
    
    console.log('🔍 Final foundItems count:', foundItems.length);

    // REMOVED: findItemsInResponse - chỉ lấy từ sceneState.availableItems
    // Đảm bảo tuyệt đối chỉ lấy items từ availableItems trong scene

    return foundItems;
  }

  // Add selected items to inventory (called from popup)
  public addSelectedItems(items: InventoryItem[]): void {
    items.forEach(item => {
      this.addItem(item);
    });
    this.saveToStorage();
    this.updateCharacterInventory();
  }

  // Find items in various parts of AI response
  private findItemsInResponse(obj: any, prefix: string = ''): InventoryItem[] {
    if (!obj || typeof obj !== 'object') return [];

    const foundItems: InventoryItem[] = [];

    Object.keys(obj).forEach(key => {
      const value = obj[key];
      
      // Look for item-related keywords
      if (key.toLowerCase().includes('item') || 
          key.toLowerCase().includes('weapon') || 
          key.toLowerCase().includes('armor') ||
          key.toLowerCase().includes('tool') ||
          key.toLowerCase().includes('potion') ||
          key.toLowerCase().includes('scroll')) {
        
        if (Array.isArray(value)) {
          value.forEach((item: any) => {
            if (this.isValidItemData(item)) {
              const parsedItem = this.createItemFromData(item);
              if (parsedItem) {
                foundItems.push(parsedItem);
              }
            }
          });
        } else if (this.isValidItemData(value)) {
          const parsedItem = this.createItemFromData(value);
          if (parsedItem) {
            foundItems.push(parsedItem);
          }
        }
      }

      // Recursively search nested objects
      if (typeof value === 'object' && value !== null) {
        const nestedItems = this.findItemsInResponse(value, `${prefix}${key}.`);
        foundItems.push(...nestedItems);
      }
    });

    return foundItems;
  }

  // Validate item data structure
  private isValidItemData(itemData: any): boolean {
    if (!itemData || typeof itemData !== 'object' || typeof itemData.name !== 'string' || itemData.name.trim().length === 0) {
      return false;
    }
    
    // Additional validation for consumables
    if (itemData.type === 'consumable' || this.determineItemType(itemData) === 'consumable') {
      // Consumables MUST have effect field
      if (!itemData.effect || typeof itemData.effect !== 'string' || itemData.effect.trim() === '') {
        console.warn('⚠️ Consumable missing effect field:', {
          name: itemData.name,
          effect: itemData.effect,
          willGenerateDefault: true
        });
        // Don't reject, will generate default effect
      }
      
      // Consumables should NOT have weapon/armor fields
      if (itemData.damage || itemData.damageType || itemData.attackBonus || itemData.armorClass) {
        console.warn('⚠️ Consumable has invalid weapon/armor fields:', {
          name: itemData.name,
          invalidFields: {
            damage: itemData.damage,
            damageType: itemData.damageType,
            attackBonus: itemData.attackBonus,
            armorClass: itemData.armorClass
          }
        });
      }
    }
    
    return true;
  }

  // Create item from AI response data (without adding to inventory)
  private createItemFromData(itemData: any): InventoryItem | null {
    if (!this.isValidItemData(itemData)) {
      return null;
    }

    const itemType = this.determineItemType(itemData);
    
    console.log('🔍 Creating item from data:', {
      name: itemData.name,
      type: itemType,
      originalData: itemData,
      hasEffect: !!itemData.effect,
      effectValue: itemData.effect
    });
    
    const item: InventoryItem = {
      id: this.generateItemId(),
      name: itemData.name.trim(),
      description: itemData.description || 'Một vật phẩm bí ẩn.',
      type: itemType,
      rarity: this.determineItemRarity(itemData),
      quantity: Math.max(1, itemData.quantity || 1), // Đảm bảo quantity >= 1
      icon: itemData.icon || this.getDefaultIcon(itemType),
      stats: {}, // Equipment không cung cấp stat bonuses
      slot: itemData.slot,
      isEquipped: false,
      tags: itemData.tags || [] // Hỗ trợ tags array
    };

    // Chỉ thêm combat stats cho weapons và armor
    if (itemType === 'weapon') {
      item.damage = itemData.damage || this.autoDetectDamage(itemData);
      item.attackBonus = itemData.attackBonus || this.autoDetectAttackBonus(itemData);
      item.damageType = itemData.damageType || this.autoDetectDamageType(itemData);
      item.weaponProperties = itemData.weaponProperties;
    } else if (itemType === 'armor') {
      item.armorClass = itemData.armorClass || this.autoDetectArmorClass(itemData);
    }

    // CONSUMABLE VALIDATION - BẮT BUỘC có effect
    if (itemType === 'consumable') {
      if (!itemData.effect || typeof itemData.effect !== 'string' || itemData.effect.trim() === '') {
        console.error('❌ Consumable validation failed:', {
          name: itemData.name,
          type: itemType,
          effect: itemData.effect,
          error: 'Missing or invalid effect field'
        });
        
        // Tạo effect mặc định dựa trên tên
        item.effect = this.generateDefaultEffect(itemData.name);
        console.warn('⚠️ Generated default effect:', item.effect);
      } else {
        item.effect = itemData.effect.trim();
      }
      
      // Thêm consumable-specific fields
      item.consumableType = this.determineConsumableType(itemData);
      item.duration = itemData.duration || 0; // Instant by default
      item.targetType = itemData.targetType || 'self';
      item.requiresTarget = itemData.requiresTarget || false;
      item.cooldown = itemData.cooldown || 0;
      item.stackable = itemData.stackable !== false; // Default true
      item.maxStacks = itemData.maxStacks || 1;
      
      // Preserve other fields from sceneState
      if (itemData.condition) (item as any).condition = itemData.condition;
      if (itemData.location) (item as any).location = itemData.location;
      if (itemData.value) (item as any).value = itemData.value;
    }

    console.log('✅ Created item:', {
      name: item.name,
      type: item.type,
      effect: item.effect,
      consumableType: item.consumableType,
      finalItem: item
    });

    return item;
  }

  // Determine item type from data
  private determineItemType(itemData: any): 'weapon' | 'armor' | 'consumable' | 'misc' {
    if (itemData.type) {
      return itemData.type;
    }

    const name = itemData.name.toLowerCase();

    // Weapon keywords
    if (name.includes('sword') || name.includes('dagger') || name.includes('bow') || 
        name.includes('staff') || name.includes('wand') || name.includes('axe') ||
        name.includes('mace') || name.includes('spear') || name.includes('vũ khí')) {
      return 'weapon';
    }

    // Armor keywords
    if (name.includes('armor') || name.includes('helmet') || name.includes('shield') ||
        name.includes('boots') || name.includes('gloves') || name.includes('ring') ||
        name.includes('amulet') || name.includes('giáp') || name.includes('mũ')) {
      return 'armor';
    }

    // Consumable keywords
    if (name.includes('potion') || name.includes('scroll') || name.includes('food') ||
        name.includes('drink') || name.includes('elixir') || name.includes('thuốc') ||
        name.includes('thức ăn')) {
      return 'consumable';
    }

    return 'misc';
  }

  // Determine item rarity from data
  private determineItemRarity(itemData: any): 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'unique' {
    if (itemData.rarity) {
      return itemData.rarity;
    }

    const name = itemData.name.toLowerCase();

    // Unique keywords (for faction quest items)
    if (name.includes('unique') || name.includes('độc nhất') || name.includes('faction') || name.includes('phe phái')) {
      return 'unique';
    }

    // Legendary keywords
    if (name.includes('legendary') || name.includes('mythic') || name.includes('huyền thoại')) {
      return 'legendary';
    }

    // Epic keywords
    if (name.includes('epic') || name.includes('ancient') || name.includes('cổ đại')) {
      return 'epic';
    }

    // Rare keywords
    if (name.includes('rare') || name.includes('magic') || name.includes('hiếm')) {
      return 'rare';
    }

    // Uncommon keywords
    if (name.includes('uncommon') || name.includes('special') || name.includes('đặc biệt')) {
      return 'uncommon';
    }

    return 'common';
  }

  // Get default icon for item type
  private getDefaultIcon(type: string): string {
    const icons = {
      weapon: '⚔️',
      armor: '🛡️',
      consumable: '🧪',
      misc: '📦'
    };
    return icons[type as keyof typeof icons] || '📦';
  }

  // Generate unique item ID
  private generateItemId(): string {
    return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Add item to inventory
  public addItem(item: InventoryItem): void {
    // Validate item is an object
    if (!item || typeof item !== 'object') {
      console.error('Invalid item provided to addItem:', item);
      return;
    }

    // Check if item already exists (by name and type)
    const existingItem = this.inventory.find(i => i.name === item.name && i.type === item.type);
    
    if (existingItem && this.isStackable(item)) {
      existingItem.quantity += item.quantity;
    } else {
      // Ensure tags array exists for new items
      if (!item.tags) {
        item.tags = [];
      }
      this.inventory.push(item);
    }

    this.saveToStorage();
    this.updateCharacterInventory();
  }

  // Check if item is stackable
  private isStackable(item: InventoryItem): boolean {
    return item.type === 'consumable' || item.type === 'misc';
  }

  // Get delivery items for a specific NPC
  public getDeliveryItems(npcId: string): InventoryItem[] {
    return this.inventory.filter(item => 
      item.tags?.includes('delivery') && 
      item.deliveryNPCId === npcId
    );
  }

  // Deliver item to NPC (remove from inventory and mark as delivered)
  public deliverItem(itemId: string, npcId: string, questId: string): boolean {
    const item = this.inventory.find(i => i.id === itemId);
    if (!item) return false;

    // Check if item is for this NPC and quest
    if (item.deliveryNPCId !== npcId || item.deliveryQuestId !== questId) {
      return false;
    }

    // Remove item from inventory
    return this.removeItem(itemId, 1);
  }

  // Mark item as delivery item
  public markItemAsDelivery(itemId: string, questId: string, npcId: string): boolean {
    const item = this.inventory.find(i => i.id === itemId);
    if (!item) return false;

    item.tags = item.tags || [];
    if (!item.tags.includes('delivery')) {
      item.tags.push('delivery');
    }
    item.deliveryQuestId = questId;
    item.deliveryNPCId = npcId;

    this.saveToStorage();
    return true;
  }

  // Remove item from inventory
  public removeItem(itemId: string, quantity: number = 1): boolean {
    const itemIndex = this.inventory.findIndex(i => i.id === itemId);
    
    if (itemIndex === -1) return false;

    const item = this.inventory[itemIndex];
    
    if (item.quantity <= quantity) {
      // If item was equipped, unequip it BEFORE removing from inventory
      if (item.isEquipped && item.slot) {
        // Remove from equipment directly
        this.equipment[item.slot as keyof Equipment] = undefined;
      }
      
      // Remove item completely from inventory
      this.inventory.splice(itemIndex, 1);
    } else {
      // Reduce quantity
      item.quantity -= quantity;
    }

    this.saveToStorage();
    this.updateCharacterInventory();
    this.updateCharacterStats();
    return true;
  }

  // Equip item
  public equipItem(itemId: string, slot?: string): boolean {
    const item = this.inventory.find(i => i.id === itemId);
    if (!item) return false;

    // Determine slot if not provided
    const targetSlot = slot || this.determineSlotForItem(item);
    if (!targetSlot) return false;

    // Unequip current item in slot
    const currentEquipped = this.equipment[targetSlot as keyof Equipment];
    if (currentEquipped) {
      this.unequipItem(currentEquipped.id);
    }

    // Equip new item
    item.isEquipped = true;
    item.slot = targetSlot as any;
    item.equipped_at = new Date();
    this.equipment[targetSlot as keyof Equipment] = item;

    this.saveToStorage();
    this.updateCharacterInventory();
    this.updateCharacterStats();
    return true;
  }

  // Unequip item
  public unequipItem(itemId: string): boolean {
    const item = this.inventory.find(i => i.id === itemId);
    if (!item || !item.isEquipped || !item.slot) return false;

    // Remove from equipment
    this.equipment[item.slot as keyof Equipment] = undefined;

    // Update item
    item.isEquipped = false;
    item.slot = undefined;
    item.equipped_at = undefined;

    this.saveToStorage();
    this.updateCharacterInventory();
    this.updateCharacterStats();
    return true;
  }

  // Determine appropriate slot for item
  private determineSlotForItem(item: InventoryItem): string | null {
    if (item.type === 'weapon') {
      // Check if main weapon slot is free
      if (!this.equipment.weapon_main) {
        return 'weapon_main';
      } else if (!this.equipment.weapon_off) {
        return 'weapon_off';
      }
      return 'weapon_main'; // Replace main weapon
    }

    if (item.type === 'armor') {
      // Determine armor slot based on name
      const name = item.name.toLowerCase();

      if (name.includes('helmet') || name.includes('hat') || name.includes('mũ')) {
        return 'head';
      }
      if (name.includes('chest') || name.includes('armor') || name.includes('giáp') || 
          name.includes('robe') || name.includes('shirt')) {
        return 'chest';
      }
      if (name.includes('gloves') || name.includes('gauntlets') || name.includes('găng')) {
        return 'hands';
      }
      if (name.includes('pants') || name.includes('trousers') || name.includes('quần')) {
        return 'legs';
      }
      if (name.includes('boots') || name.includes('shoes') || name.includes('giày')) {
        return 'feet';
      }
      if (name.includes('ring') || name.includes('amulet') || name.includes('trang sức')) {
        // Find free accessory slot
        if (!this.equipment.accessory1) return 'accessory1';
        if (!this.equipment.accessory2) return 'accessory2';
        if (!this.equipment.accessory3) return 'accessory3';
        return 'accessory1'; // Replace first accessory
      }
    }

    return null; // Cannot be equipped
  }

  // Calculate equipped stats bonuses (DISABLED - equipment no longer provides stat bonuses)
  public calculateEquippedStats(): { strength: number; agility: number; intelligence: number; constitution: number; wisdom: number; charisma: number } {
    // Equipment no longer provides stat bonuses in this simplified system
    return {
      strength: 0,
      agility: 0,
      intelligence: 0,
      constitution: 0,
      wisdom: 0,
      charisma: 0
    };
  }

  // Update character stats (equipment no longer provides stat bonuses)
  private updateCharacterStats(): void {
    if (!this.character || !this.character.coreStats) return;

    // Modifiers are calculated ONLY from base core stats (D&D rules)
    // Equipment no longer provides stat bonuses
    const baseStats = this.character.coreStats;
    this.character.coreStats.modifiers = {
      strength: Math.floor((baseStats.strength - 10) / 2),
      agility: Math.floor((baseStats.agility - 10) / 2),
      intelligence: Math.floor((baseStats.intelligence - 10) / 2),
      constitution: Math.floor((baseStats.constitution - 10) / 2),
      wisdom: Math.floor((baseStats.wisdom - 10) / 2),
      charisma: Math.floor((baseStats.charisma - 10) / 2)
    };

    // Calculate and update Armor Class (AC)
    this.character.coreStats.armorClass = this.calculateArmorClass();
  }

  // Calculate Armor Class (AC) based on agility modifier and armor
  private calculateArmorClass(): number {
    if (!this.character || !this.character.coreStats) return 10;

    let ac = 10; // Base AC
    
    // Add agility modifier (from base core stats only)
    const agilityModifier = this.character.coreStats.modifiers?.agility || 0;
    ac += agilityModifier;
    
    // Check for chest armor equipment
    const chestArmor = this.equipment.chest;
    if (chestArmor && chestArmor.armorClass) {
      // Use armor's AC + agility modifier
      ac = chestArmor.armorClass + agilityModifier;
    }
    
    return ac;
  }

  // Get current character reference
  public getCharacter(): Character | null {
    return this.character;
  }

  // Update character inventory reference
  private updateCharacterInventory(): void {
    if (this.character) {
      this.character.inventory = [...this.inventory];
      this.character.equipment = { ...this.equipment };
      
      // Lưu character data vào localStorage để UI có thể đọc được (with cache)
      storageCache.set('currentCharacter', this.character);
    }
  }

  // Get inventory
  public getInventory(): InventoryItem[] {
    return [...this.inventory];
  }

  // Get equipment
  public getEquipment(): Equipment {
    return { ...this.equipment };
  }

  // Get equipped stats bonuses
  public getEquippedStatsBonuses() {
    return this.calculateEquippedStats();
  }


  // Sort inventory
  public sortInventory(sortBy: 'name' | 'type' | 'rarity' | 'quantity'): InventoryItem[] {
    const sorted = [...this.inventory];
    
    switch (sortBy) {
      case 'name':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'type':
        return sorted.sort((a, b) => a.type.localeCompare(b.type));
      case 'rarity':
        const rarityOrder = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4, unique: 5 };
        return sorted.sort((a, b) => rarityOrder[b.rarity] - rarityOrder[a.rarity]);
      case 'quantity':
        return sorted.sort((a, b) => b.quantity - a.quantity);
      default:
        return sorted;
    }
  }

  // Filter inventory
  public filterInventory(filterBy: 'all' | 'weapon' | 'armor' | 'consumable' | 'misc' | 'equipped'): InventoryItem[] {
    if (filterBy === 'all') {
      return [...this.inventory];
    }
    
    if (filterBy === 'equipped') {
      return this.inventory.filter(item => item.isEquipped);
    }
    
    return this.inventory.filter(item => item.type === filterBy);
  }

  // Search inventory
  public searchInventory(query: string): InventoryItem[] {
    if (!query.trim()) {
      return [...this.inventory];
    }
    
    const lowercaseQuery = query.toLowerCase();
    return this.inventory.filter(item => 
      item.name.toLowerCase().includes(lowercaseQuery) ||
      item.description.toLowerCase().includes(lowercaseQuery)
    );
  }

  // Get items available for a specific slot
  public getItemsForSlot(slot: string): InventoryItem[] {
    return this.inventory.filter(item => {
      if (item.isEquipped) return false;
      
      if (slot.startsWith('weapon')) {
        return item.type === 'weapon';
      }
      
      if (['head', 'chest', 'hands', 'legs', 'feet', 'accessory1', 'accessory2', 'accessory3'].includes(slot)) {
        // Check if item has a specific slot property that matches the requested slot
        if (item.slot) {
          return item.slot === slot;
        }
        // Fallback to type check for items without slot property
        return item.type === 'armor';
      }
      
      return false;
    });
  }

  // Clear all data (for testing or reset)
  public clearAll(): void {
    this.inventory = [];
    this.equipment = {};
    this.saveToStorage();
    this.updateCharacterInventory();
    this.updateCharacterStats();
  }

  // Find item in inventory by ID
  public findItemInInventory(itemId: string): InventoryItem | null {
    return this.inventory.find(item => item.id === itemId) || null;
  }

  // Get inventory stats
  public getInventoryStats(): { totalItems: number; totalValue: number; equippedItems: number } {
    const totalItems = this.inventory.reduce((sum, item) => sum + item.quantity, 0);
    const equippedItems = this.inventory.filter(item => item.isEquipped).length;
    
    // Simple value calculation based on rarity
    const rarityValues = { common: 1, uncommon: 5, rare: 25, epic: 100, legendary: 500, unique: 1000 };
    const totalValue = this.inventory.reduce((sum, item) => 
      sum + (rarityValues[item.rarity] * item.quantity), 0
    );

    return { totalItems, totalValue, equippedItems };
  }

  // Calculate item sell price with skill bonuses
  public calculateSellPrice(item: InventoryItem): number {
    if (!this.character) return 0;

    // Base value calculation based on rarity
    const rarityValues = { common: 1, uncommon: 5, rare: 25, epic: 100, legendary: 500, unique: 1000 };
    let basePrice = rarityValues[item.rarity];

    // Apply skill bonuses
    const skillBonuses = skillTreeService.getActiveBonuses(this.character);
    if (skillBonuses.sellPriceModifier) {
      basePrice = Math.floor(basePrice * (1 + skillBonuses.sellPriceModifier / 100));
    }

    return basePrice;
  }

  // Calculate item buy price with skill bonuses
  public calculateBuyPrice(item: InventoryItem): number {
    if (!this.character) return 0;

    // Base value calculation based on rarity
    const rarityValues = { common: 1, uncommon: 5, rare: 25, epic: 100, legendary: 500, unique: 1000 };
    let basePrice = rarityValues[item.rarity] * 2; // Buy price is typically 2x sell price

    // Apply skill bonuses
    const skillBonuses = skillTreeService.getActiveBonuses(this.character);
    if (skillBonuses.shopPriceModifier) {
      basePrice = Math.floor(basePrice * (1 + skillBonuses.shopPriceModifier / 100));
    }

    return basePrice;
  }

  // Generate default effect for consumables based on name
  private generateDefaultEffect(name: string): string {
    const lowerName = name.toLowerCase();
    
    // Healing potions
    if (lowerName.includes('hồi') || lowerName.includes('heal') || lowerName.includes('potion') || 
        lowerName.includes('thuốc') || lowerName.includes('bình')) {
      if (lowerName.includes('nhỏ') || lowerName.includes('small')) {
        return 'heal:1d4:+1:instant';
      } else if (lowerName.includes('vừa') || lowerName.includes('medium')) {
        return 'heal:2d4:+2:instant';
      } else if (lowerName.includes('lớn') || lowerName.includes('large') || lowerName.includes('lớn')) {
        return 'heal:3d4:+3:instant';
      } else {
        return 'heal:1d4:+1:instant'; // Default healing
      }
    }
    
    // Strength potions
    if (lowerName.includes('sức mạnh') || lowerName.includes('strength') || lowerName.includes('bia')) {
      return 'stat_buff:strength:+2:5turns';
    }
    
    // Agility potions
    if (lowerName.includes('nhanh nhẹn') || lowerName.includes('agility') || lowerName.includes('tốc độ')) {
      return 'stat_buff:agility:+2:5turns';
    }
    
    // AC potions
    if (lowerName.includes('phòng thủ') || lowerName.includes('defense') || lowerName.includes('ac')) {
      return 'stat_buff:ac:+2:5turns';
    }
    
    // Damage buff potions
    if (lowerName.includes('tấn công') || lowerName.includes('damage') || lowerName.includes('sát thương')) {
      return 'damage_buff:+1d4:3turns';
    }
    
    // Default healing if can't determine
    return 'heal:1d4:+1:instant';
  }

  // Determine consumable type from data
  private determineConsumableType(itemData: any): 'healing' | 'buff' | 'debuff' | 'cure' | 'special' {
    if (itemData.consumableType) {
      return itemData.consumableType;
    }
    
    const name = itemData.name.toLowerCase();
    const effect = itemData.effect?.toLowerCase() || '';
    
    if (effect.includes('heal') || name.includes('hồi') || name.includes('heal')) {
      return 'healing';
    }
    
    if (effect.includes('stat_buff') || effect.includes('damage_buff') || 
        name.includes('tăng') || name.includes('buff')) {
      return 'buff';
    }
    
    if (effect.includes('debuff') || name.includes('độc') || name.includes('poison')) {
      return 'debuff';
    }
    
    if (effect.includes('cure') || name.includes('chữa') || name.includes('cure')) {
      return 'cure';
    }
    
    return 'special';
  }

  // NEW: Auto-detect damage for weapons
  private autoDetectDamage(itemData: any): string | undefined {
    if (itemData.damage) return itemData.damage;
    
    const name = itemData.name.toLowerCase();
    const type = this.determineItemType(itemData);
    
    // Only auto-detect for weapons and damaging consumables
    if (type !== 'weapon' && type !== 'consumable') return undefined;
    
    // Weapon damage based on name keywords
    if (type === 'weapon') {
      if (name.includes('dagger') || name.includes('knife') || name.includes('dao')) {
        return '1d4';
      }
      if (name.includes('sword') || name.includes('kiếm') || name.includes('blade')) {
        return '1d8';
      }
      if (name.includes('axe') || name.includes('rìu') || name.includes('búa')) {
        return '1d8';
      }
      if (name.includes('mace') || name.includes('club') || name.includes('gậy')) {
        return '1d6';
      }
      if (name.includes('spear') || name.includes('giáo') || name.includes('lance')) {
        return '1d8';
      }
      if (name.includes('bow') || name.includes('cung') || name.includes('arrow')) {
        return '1d6';
      }
      if (name.includes('wand') || name.includes('đũa') || name.includes('staff') || name.includes('gậy phép')) {
        return '1d4+1';
      }
      if (name.includes('crossbow') || name.includes('nỏ')) {
        return '1d8';
      }
      if (name.includes('great') || name.includes('two-handed') || name.includes('hai tay')) {
        return '2d6';
      }
    }
    
    // Consumable damage (potions, scrolls, etc.)
    if (type === 'consumable') {
      if (name.includes('bomb') || name.includes('explosive') || name.includes('bom')) {
        return '2d6';
      }
      if (name.includes('poison') || name.includes('độc')) {
        return '1d4';
      }
      if (name.includes('acid') || name.includes('axit')) {
        return '1d6';
      }
      if (name.includes('fire') || name.includes('lửa') || name.includes('flame')) {
        return '1d8';
      }
    }
    
    return undefined;
  }

  // NEW: Auto-detect attack bonus for weapons
  private autoDetectAttackBonus(itemData: any): number | undefined {
    if (itemData.attackBonus) return itemData.attackBonus;
    
    const type = this.determineItemType(itemData);
    if (type !== 'weapon') return undefined;
    
    // Base attack bonus based on rarity
    const rarity = itemData.rarity || 'common';
    switch (rarity) {
      case 'common': return 1;
      case 'uncommon': return 2;
      case 'rare': return 3;
      case 'epic': return 4;
      case 'legendary': return 5;
      case 'unique': return 3;
      default: return 1;
    }
  }

  // NEW: Auto-detect armor class for armor items
  private autoDetectArmorClass(itemData: any): number | undefined {
    if (itemData.armorClass) return itemData.armorClass;
    
    const type = this.determineItemType(itemData);
    if (type !== 'armor') return undefined;
    
    const name = itemData.name.toLowerCase();
    const rarity = itemData.rarity || 'common';
    
    // Base AC based on rarity
    let baseAC = 10;
    switch (rarity) {
      case 'common': baseAC = 11; break;
      case 'uncommon': baseAC = 12; break;
      case 'rare': baseAC = 13; break;
      case 'epic': baseAC = 14; break;
      case 'legendary': baseAC = 15; break;
      case 'unique': baseAC = 13; break;
    }
    
    // Adjust based on armor type keywords
    if (name.includes('leather') || name.includes('da')) {
      baseAC = Math.max(10, baseAC - 1); // Leather armor
    } else if (name.includes('chain') || name.includes('mail') || name.includes('xích')) {
      baseAC = Math.max(11, baseAC); // Chain mail
    } else if (name.includes('plate') || name.includes('tấm') || name.includes('giáp')) {
      baseAC = Math.max(12, baseAC + 1); // Plate armor
    } else if (name.includes('cloak') || name.includes('choàng') || name.includes('robe')) {
      baseAC = Math.max(10, baseAC - 2); // Cloaks/robes are lighter
    }
    
    return baseAC;
  }

  // NEW: Auto-detect damage type
  private autoDetectDamageType(itemData: any): 'physical' | 'magical' | 'fire' | 'cold' | 'lightning' | 'poison' | 'psychic' {
    if (itemData.damageType) return itemData.damageType;
    
    const name = itemData.name.toLowerCase();
    const type = this.determineItemType(itemData);
    
    // Default to physical for weapons
    if (type === 'weapon') {
      if (name.includes('fire') || name.includes('lửa') || name.includes('flame')) return 'fire';
      if (name.includes('ice') || name.includes('băng') || name.includes('cold')) return 'cold';
      if (name.includes('lightning') || name.includes('sét') || name.includes('electric')) return 'lightning';
      if (name.includes('poison') || name.includes('độc') || name.includes('venom')) return 'poison';
      if (name.includes('magic') || name.includes('phép') || name.includes('spell') || name.includes('wand') || name.includes('đũa') || name.includes('staff')) return 'magical';
      if (name.includes('mind') || name.includes('tâm') || name.includes('psychic')) return 'psychic';
      return 'physical';
    }
    
    // Consumables
    if (type === 'consumable') {
      if (name.includes('fire') || name.includes('lửa') || name.includes('bomb')) return 'fire';
      if (name.includes('ice') || name.includes('băng') || name.includes('cold')) return 'cold';
      if (name.includes('lightning') || name.includes('sét')) return 'lightning';
      if (name.includes('poison') || name.includes('độc')) return 'poison';
      if (name.includes('magic') || name.includes('phép') || name.includes('scroll')) return 'magical';
      if (name.includes('acid') || name.includes('axit')) return 'physical';
      return 'physical';
    }
    
    return 'physical';
  }

  // NEW: Validate damage notation format
  public validateDamageNotation(damage: string): boolean {
    if (!damage) return true; // Empty is valid
    
    // Match patterns like "1d8", "2d6+3", "1d4-1", etc.
    const damagePattern = /^\d+d\d+(?:[+-]\d+)?$/;
    return damagePattern.test(damage);
  }
}

// Export singleton instance
export const inventoryService = InventoryService.getInstance();
