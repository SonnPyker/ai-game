import { InventoryItem, Equipment, Character } from '../types';

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

  // Load inventory and equipment from localStorage
  private loadFromStorage(): void {
    try {
      const savedInventory = localStorage.getItem('game_inventory');
      if (savedInventory) {
        this.inventory = JSON.parse(savedInventory);
      }

      const savedEquipment = localStorage.getItem('game_equipment');
      if (savedEquipment) {
        this.equipment = JSON.parse(savedEquipment);
      }
    } catch (error) {
      console.warn('Failed to load inventory/equipment from storage:', error);
      this.inventory = [];
      this.equipment = {};
    }
  }

  // Save inventory and equipment to localStorage
  private saveToStorage(): void {
    try {
      localStorage.setItem('game_inventory', JSON.stringify(this.inventory));
      localStorage.setItem('game_equipment', JSON.stringify(this.equipment));
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
      
      // Save updated character to localStorage
      localStorage.setItem('currentCharacter', JSON.stringify(character));
      console.log('Migrated old save: Added armorClass to coreStats');
    }
  }

  // Parse items from AI response and return them for popup selection
  public parseItemsFromAIResponse(aiResponse: any): InventoryItem[] {
    if (!aiResponse || !aiResponse.sceneState) return [];

    const sceneState = aiResponse.sceneState;
    const foundItems: InventoryItem[] = [];
    
    // CHỈ parse items từ sceneState.inventory của AI response hiện tại
    if (sceneState.inventory && Array.isArray(sceneState.inventory)) {
      sceneState.inventory.forEach((itemData: any) => {
        if (this.isValidItemData(itemData)) {
          const item = this.createItemFromData(itemData);
          if (item) {
            foundItems.push(item);
          }
        }
      });
    }

    // Also check for items in other possible locations
    const additionalItems = this.findItemsInResponse(aiResponse);
    foundItems.push(...additionalItems);

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
    return itemData && 
           typeof itemData === 'object' &&
           typeof itemData.name === 'string' &&
           itemData.name.trim().length > 0;
  }

  // Create item from AI response data (without adding to inventory)
  private createItemFromData(itemData: any): InventoryItem | null {
    if (!this.isValidItemData(itemData)) {
      return null;
    }

    const item: InventoryItem = {
      id: this.generateItemId(),
      name: itemData.name.trim(),
      description: itemData.description || 'Một vật phẩm bí ẩn.',
      type: this.determineItemType(itemData),
      rarity: this.determineItemRarity(itemData),
      quantity: itemData.quantity || 1,
      icon: itemData.icon || this.getDefaultIcon(itemData.type),
      stats: {}, // Equipment không cung cấp stat bonuses
      slot: itemData.slot,
      isEquipped: false,
      tags: itemData.tags || [], // Hỗ trợ tags array
      
      // NEW: Combat stats
      damage: itemData.damage || this.autoDetectDamage(itemData),
      attackBonus: itemData.attackBonus || this.autoDetectAttackBonus(itemData),
      damageType: itemData.damageType || this.autoDetectDamageType(itemData),
      armorClass: itemData.armorClass || this.autoDetectArmorClass(itemData),
      weaponProperties: itemData.weaponProperties
    };

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

  // Update character inventory reference
  private updateCharacterInventory(): void {
    if (this.character) {
      this.character.inventory = [...this.inventory];
      this.character.equipment = { ...this.equipment };
      
      // Lưu character data vào localStorage để UI có thể đọc được
      localStorage.setItem('currentCharacter', JSON.stringify(this.character));
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
