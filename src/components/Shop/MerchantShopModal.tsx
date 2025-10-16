import React, { useState, useEffect } from 'react';
import { MotionWrapper } from '../MotionWrapper';
import { ModalHeader } from '../ModalHeader';
import { useModalMinimize } from '../../hooks/useModalMinimize';
import { ShoppingBag, Sword, Shield, BookOpen, Coins, Beaker, Minus, Plus, AlertTriangle, Gem } from 'lucide-react';
import { MerchantShop, InventoryItem, Character, SkillBook, NPCRelationship } from '../../types';
import { tradingService } from '../../services/tradingService';
import { skillBookService } from '../../services/skillBookService';

interface MerchantShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  shop: MerchantShop | null;
  character: Character | null;
  locationId: string;
  onBuyItem: (item: InventoryItem, shop: MerchantShop) => void;
  onSellItem: (item: InventoryItem, shop: MerchantShop) => void;
  onUseSkillBook: (skillBook: SkillBook) => void;
}

type TabType = 'buy' | 'sell';
type ItemType = 'all' | 'weapon' | 'armor' | 'accessory' | 'consumable' | 'skillbook';

export function MerchantShopModal({
  isOpen,
  onClose,
  shop,
  character,
  locationId,
  onBuyItem,
  onSellItem,
  onUseSkillBook
}: MerchantShopModalProps) {
  const { isMinimized, minimize } = useModalMinimize({
    modalId: 'merchant-shop-modal',
    title: 'Cửa Hàng',
    icon: <ShoppingBag className="w-5 h-5 text-yellow-400" />
  });
  const [activeTab, setActiveTab] = useState<TabType>('buy');
  const [activeFilter, setActiveFilter] = useState<ItemType>('all');
  const [merchant, setMerchant] = useState<NPCRelationship | null>(null);
  const [currentShop, setCurrentShop] = useState<MerchantShop | null>(shop);
  const [sellQuantity, setSellQuantity] = useState<{ [itemId: string]: number }>({});
  const [selectedSellItem, setSelectedSellItem] = useState<InventoryItem | null>(null);

  useEffect(() => {
    if (isOpen && locationId) {
      // Lấy merchant relationship
      const merchantRel = tradingService.getMerchantRelationship(locationId);
      setMerchant(merchantRel);
    }
  }, [isOpen, locationId]);

  // Update currentShop when shop prop changes
  useEffect(() => {
    setCurrentShop(shop);
  }, [shop]);

  // Refresh shop data periodically
  useEffect(() => {
    if (!isOpen || !locationId) return;

    const refreshShopData = async () => {
      try {
        const { merchantService } = await import('../../services/merchantService');
        const updatedShop = merchantService.getMerchantShopByLocation(locationId);
        if (updatedShop) {
          setCurrentShop(updatedShop);
        }
      } catch (error) {
        console.error('Error refreshing shop data:', error);
      }
    };

    // Refresh immediately
    refreshShopData();

    // Set up interval to refresh every 2 seconds
    const interval = setInterval(refreshShopData, 2000);

    return () => clearInterval(interval);
  }, [isOpen, locationId]);

  if (!isOpen || !currentShop || !character) return null;

  if (isMinimized) {
    return null; // MinimizedModal is now handled by MinimizedModalContainer
  }

  const getFilteredItems = () => {
    if (activeTab === 'buy') {
    const allItems = [
      ...currentShop.inventory.weapons,
      ...currentShop.inventory.armor,
      ...currentShop.inventory.accessories,
      ...currentShop.inventory.consumables,
      ...currentShop.inventory.skillBooks
    ];

    if (activeFilter === 'all') return allItems;
    if (activeFilter === 'weapon') return currentShop.inventory.weapons;
    if (activeFilter === 'armor') return currentShop.inventory.armor;
    if (activeFilter === 'accessory') return currentShop.inventory.accessories;
    if (activeFilter === 'consumable') return currentShop.inventory.consumables;
    if (activeFilter === 'skillbook') return currentShop.inventory.skillBooks;
    } else {
      // Sell tab - show player inventory
      if (!character.inventory) return [];
      
      if (activeFilter === 'all') return character.inventory;
      if (activeFilter === 'accessory') return character.inventory.filter(item => item.slot && ['accessory1', 'accessory2', 'accessory3'].includes(item.slot));
      return character.inventory.filter(item => item.type === activeFilter);
    }
    
    return [];
  };

  const getItemPrice = (item: InventoryItem | SkillBook, quantity: number = 1) => {
    if ('skillType' in item) {
      // Skill book
      return item.price;
    } else {
      // Regular item
      if (activeTab === 'buy') {
        return tradingService.calculateBuyPriceWithRelationship(item as InventoryItem, character, merchant);
      } else {
        const basePrice = tradingService.calculateSellPriceWithRelationship(item as InventoryItem, character, merchant);
        return basePrice * quantity; // Multiply by quantity for sell
      }
    }
  };

  const canAfford = (price: number) => {
    if (activeTab === 'buy') {
      return character.currency && character.currency >= price;
    }
    return true; // Can always sell
  };

  const canBuyItem = (item: InventoryItem | SkillBook) => {
    if (activeTab === 'buy') {
      const price = getItemPrice(item);
      const hasEnoughMoney = canAfford(price);
      const hasQuantity = (item.quantity || 0) > 0;
      return hasEnoughMoney && hasQuantity;
    }
    return true; // Can always sell
  };

  const isItemOutOfStock = (item: InventoryItem | SkillBook) => {
    if (activeTab === 'buy') {
      return (item.quantity || 0) <= 0;
    }
    return false; // Can always sell
  };

  const handleItemAction = (item: InventoryItem | SkillBook) => {
    if ('skillType' in item) {
      // Skill book
      if (activeTab === 'buy') {
        const price = getItemPrice(item);
        if (canAfford(price)) {
          onUseSkillBook(item);
        }
      }
    } else {
      // Regular item
      if (activeTab === 'buy') {
        onBuyItem(item as InventoryItem, currentShop!);
      } else {
        // For sell tab, show quantity selection if item has quantity > 1
        const inventoryItem = item as InventoryItem;
        if (inventoryItem.quantity && inventoryItem.quantity > 1) {
          setSelectedSellItem(inventoryItem);
          setSellQuantity(prev => ({
            ...prev,
            [inventoryItem.id]: 1
          }));
        } else {
          onSellItem(inventoryItem, currentShop!);
        }
      }
    }
  };

  const handleSellWithQuantity = (item: InventoryItem, quantity: number) => {
    // Create a temporary item with the selected quantity
    const itemToSell = { ...item, quantity };
    onSellItem(itemToSell, currentShop!);
    setSelectedSellItem(null);
  };

  const getItemIcon = (item: InventoryItem | SkillBook) => {
    if ('skillType' in item) {
      return <BookOpen className="w-5 h-5" />;
    }
    
    switch (item.type) {
      case 'weapon': return <Sword className="w-5 h-5" />;
      case 'armor': return <Shield className="w-5 h-5" />;
      case 'accessory': return <Gem className="w-5 h-5" />;
      case 'consumable': return <Beaker className="w-5 h-5" />;
      default: return <Coins className="w-5 h-5" />;
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'text-gray-400';
      case 'uncommon': return 'text-green-400';
      case 'rare': return 'text-blue-400';
      case 'epic': return 'text-purple-400';
      case 'legendary': return 'text-yellow-400';
      case 'unique': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const translateEffect = (effect: string) => {
    if (!effect) return 'Không có hiệu ứng';
    
    // Parse effect string (format: type:value:duration or type:statType:value:duration)
    const parts = effect.split(':');
    if (parts.length < 2) return effect;
    
    const type = parts[0];
    let value, duration;
    
    if (type === 'stat_buff' && parts.length >= 4) {
      // Format: stat_buff:statType:value:duration
      value = `${parts[1]}:${parts[2]}`; // Combine statType:value
      duration = parts[3] || 'instant';
    } else {
      // Format: type:value:duration
      value = parts[1];
      duration = parts[2] || 'instant';
    }
    
    switch (type) {
      case 'heal':
        const healValue = value.includes('d') ? value : `+${value}`;
        return `Hồi phục ${healValue} HP${duration === 'instant' ? ' ngay lập tức' : ` trong ${duration} lượt`}`;
      
      case 'damage_buff':
        const damageValue = value.includes('d') ? value : `+${value}`;
        return `Tăng sát thương ${damageValue}${duration === 'instant' ? ' ngay lập tức' : ` trong ${duration} lượt`}`;
      
      case 'stat_buff':
        // Parse stat_buff format: stat_buff:statType:value:duration
        // Example: stat_buff:ac:+1:3turns
        const statParts = value.split(':');
        const statType = statParts[0] || value;
        const statValue = statParts[1] || '+1';
        const actualDuration = statParts[2] || duration;
        
        let statName = '';
        switch (statType) {
          case 'ac': statName = 'AC'; break;
          case 'strength': statName = 'Sức mạnh'; break;
          case 'dexterity': statName = 'Khéo léo'; break;
          case 'constitution': statName = 'Thể chất'; break;
          case 'intelligence': statName = 'Trí tuệ'; break;
          case 'wisdom': statName = 'Khôn ngoan'; break;
          case 'charisma': statName = 'Uy tín'; break;
          default: statName = statType.toUpperCase();
        }
        
        const durationText = actualDuration === 'instant' ? ' ngay lập tức' : ` trong ${actualDuration} lượt`;
        return `Tăng ${statName} ${statValue}${durationText}`;
      
      case 'mana':
        const manaValue = value.includes('d') ? value : `+${value}`;
        return `Hồi phục ${manaValue} MP${duration === 'instant' ? ' ngay lập tức' : ` trong ${duration} lượt`}`;
      
      case 'poison':
        const poisonValue = value.includes('d') ? value : `+${value}`;
        return `Gây độc ${poisonValue} sát thương${duration === 'instant' ? ' ngay lập tức' : ` trong ${duration} lượt`}`;
      
      case 'burn':
        const burnValue = value.includes('d') ? value : `+${value}`;
        return `Gây bỏng ${burnValue} sát thương${duration === 'instant' ? ' ngay lập tức' : ` trong ${duration} lượt`}`;
      
      case 'freeze':
        return `Làm đóng băng${duration === 'instant' ? ' ngay lập tức' : ` trong ${duration} lượt`}`;
      
      case 'stun':
        return `Làm choáng váng${duration === 'instant' ? ' ngay lập tức' : ` trong ${duration} lượt`}`;
      
      default:
        return effect; // Return original if unknown type
    }
  };

  const items = getFilteredItems();

  return (
    <MotionWrapper
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <MotionWrapper
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gray-900 rounded-lg border border-gray-700 max-w-4xl w-full max-h-[80vh] flex flex-col"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {/* Header - Fixed */}
        <div className="flex-shrink-0">
          <ModalHeader
            title="Cửa Hàng"
            icon={<ShoppingBag className="w-5 h-5 text-yellow-400" />}
            onClose={onClose}
            onMinimize={minimize}
          />
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
          {/* Merchant Info */}
          {merchant && (
            <div className="bg-gray-800/50 rounded-lg p-3 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">{merchant.name}</h3>
                  <p className="text-gray-400 text-sm">Thương gia</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-300 text-sm">
                    Quan hệ: {merchant.relationshipLevel > 0 ? '+' : ''}{merchant.relationshipLevel}
                  </p>
                  <p className="text-gray-300 text-sm">
                    Tiền của bạn: {character.currency || 0} gold
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex space-x-1 bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('buy')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'buy'
                  ? 'bg-yellow-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Mua Hàng
            </button>
            <button
              onClick={() => setActiveTab('sell')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'sell'
                  ? 'bg-yellow-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Bán Hàng
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            {['all', 'weapon', 'armor', 'accessory', 'consumable', 'skillbook'].map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter as ItemType)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  activeFilter === filter
                    ? 'bg-gray-700 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {filter === 'all' ? 'Tất cả' :
                 filter === 'weapon' ? 'Vũ khí' :
                 filter === 'armor' ? 'Áo giáp' :
                 filter === 'accessory' ? 'Phụ kiện' :
                 filter === 'consumable' ? 'Consumable' :
                 'Skill Books'}
              </button>
            ))}
          </div>

          {/* Items Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item, index) => {
              const price = getItemPrice(item);
              const canBuy = canBuyItem(item);
              const isSkillBook = 'skillType' in item;

              return (
                <div
                  key={`${item.id}_${index}`}
                  className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getItemIcon(item)}
                      <div>
                        <h4 className="text-white font-medium text-sm">{item.name}</h4>
                        <p className={`text-xs ${getRarityColor(item.rarity)}`}>
                          {item.rarity.toUpperCase()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-yellow-400 font-medium">{price} gold</p>
                      {!canBuy && activeTab === 'buy' && (
                        <p className="text-red-400 text-xs">
                          {!canAfford(price) ? 'Không đủ tiền' : 'Hết hàng'}
                        </p>
                      )}
                    </div>
                  </div>

                  <p className="text-gray-300 text-xs mb-3 line-clamp-2">
                    {item.description}
                  </p>

                  {/* Item Stats */}
                  {!isSkillBook && item.type === 'weapon' && (
                    <div className="bg-red-900/20 rounded p-2 mb-3">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-red-300">Sát thương:</span>
                          <span className="text-white ml-1">{item.damage}</span>
                        </div>
                        <div>
                          <span className="text-red-300">Loại:</span>
                          <span className="text-white ml-1">{item.damageType}</span>
                        </div>
                        <div>
                          <span className="text-red-300">Tấn công:</span>
                          <span className="text-white ml-1">+{item.attackBonus}</span>
                        </div>
                        <div>
                          <span className="text-red-300">Slot:</span>
                          <span className="text-white ml-1">{item.slot}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {!isSkillBook && item.type === 'armor' && (
                    <div className="bg-blue-900/20 rounded p-2 mb-3">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-blue-300">AC:</span>
                          <span className="text-white ml-1">{item.armorClass}</span>
                        </div>
                        <div>
                          <span className="text-blue-300">Slot:</span>
                          <span className="text-white ml-1">{item.slot}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {!isSkillBook && item.type === 'accessory' && (
                    <div className="bg-purple-900/20 rounded p-2 mb-3">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-purple-300">Slot:</span>
                          <span className="text-white ml-1">{item.slot}</span>
                        </div>
                        <div>
                          <span className="text-purple-300">Loại:</span>
                          <span className="text-white ml-1">Phụ kiện</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {!isSkillBook && item.type === 'consumable' && (
                    <div className="bg-green-900/20 rounded p-2 mb-3">
                      <div className="text-xs">
                        <div className="mb-1">
                          <span className="text-green-300">Hiệu ứng:</span>
                          <span className="text-white ml-1">{translateEffect(item.effect || '')}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Skill Book Info */}
                  {isSkillBook && (
                    <div className="bg-purple-900/30 rounded p-2 mb-3">
                      <p className="text-purple-300 text-xs">
                        Loại: {skillBookService.getSkillBookInfo(item).skillTypeName}
                      </p>
                      <p className="text-purple-300 text-xs">
                        Level: {skillBookService.getSkillBookInfo(item).levelName}
                      </p>
                    </div>
                  )}

                  {/* Quantity Info */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-400 text-xs">Số lượng:</span>
                      <span className="text-white text-sm font-medium">{item.quantity}</span>
                    </div>
                    {item.quantity === 0 && (
                      <span className="text-red-400 text-xs">Hết hàng</span>
                    )}
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => handleItemAction(item)}
                    disabled={!canBuy}
                    className={`w-full py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                      canBuy || activeTab === 'sell'
                        ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                        : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {activeTab === 'buy' ? (isItemOutOfStock(item) ? 'Hết hàng' : 'Mua') : 'Bán'}
                  </button>
                </div>
              );
            })}
          </div>

          {items.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-400">
                {activeTab === 'buy' ? 'Không có item nào để mua' : 'Không có item nào để bán'}
              </p>
            </div>
          )}
          </div>
        </div>
      </MotionWrapper>

      {/* Quantity Selection Modal for Selling */}
      {selectedSellItem && (
        <MotionWrapper
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-60 p-4"
          onClick={() => setSelectedSellItem(null)}
        >
          <MotionWrapper
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-gray-900 border border-gray-700 rounded-lg max-w-md w-full shadow-2xl"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">Chọn số lượng bán</h3>
              <button
                onClick={() => setSelectedSellItem(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Item Info */}
              <div className="flex items-start space-x-4">
                <div className="text-3xl flex-shrink-0">{selectedSellItem.icon || '📦'}</div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xl font-bold text-white mb-2">{selectedSellItem.name}</h4>
                  <div className="flex items-center space-x-2 mb-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      selectedSellItem.rarity === 'common' ? 'bg-gray-600 text-gray-200' :
                      selectedSellItem.rarity === 'uncommon' ? 'bg-green-600 text-green-200' :
                      selectedSellItem.rarity === 'rare' ? 'bg-blue-600 text-blue-200' :
                      selectedSellItem.rarity === 'epic' ? 'bg-purple-600 text-purple-200' :
                      'bg-yellow-600 text-yellow-200'
                    }`}>
                      {selectedSellItem.rarity}
                    </span>
                    <span className="px-3 py-1 bg-gray-700 rounded-full text-xs font-semibold">
                      {selectedSellItem.type}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quantity Selection */}
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-400" />
                    <span className="text-yellow-400 font-semibold">
                      Chọn số lượng bán
                    </span>
                  </div>
                  <span className="text-gray-400 text-sm">
                    Có {selectedSellItem.quantity} cái
                  </span>
                </div>
                
                {/* Quantity Slider */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => setSellQuantity(prev => ({
                        ...prev,
                        [selectedSellItem.id]: Math.max(1, (prev[selectedSellItem.id] || 1) - 1)
                      }))}
                      disabled={(sellQuantity[selectedSellItem.id] || 1) <= 1}
                      className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                    >
                      <Minus className="w-4 h-4 text-white" />
                    </button>
                    
                    <div className="flex-1 flex items-center">
                      <input
                        type="range"
                        min="1"
                        max={selectedSellItem.quantity}
                        value={sellQuantity[selectedSellItem.id] || 1}
                        onChange={(e) => setSellQuantity(prev => ({
                          ...prev,
                          [selectedSellItem.id]: parseInt(e.target.value)
                        }))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                        style={{
                          background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${Math.max(0, ((sellQuantity[selectedSellItem.id] || 1) - 1) / (selectedSellItem.quantity - 1)) * 100}%, #374151 ${Math.max(0, ((sellQuantity[selectedSellItem.id] || 1) - 1) / (selectedSellItem.quantity - 1)) * 100}%, #374151 100%)`
                        }}
                      />
                    </div>
                    
                    <button
                      onClick={() => setSellQuantity(prev => ({
                        ...prev,
                        [selectedSellItem.id]: Math.min(selectedSellItem.quantity, (prev[selectedSellItem.id] || 1) + 1)
                      }))}
                      disabled={(sellQuantity[selectedSellItem.id] || 1) >= selectedSellItem.quantity}
                      className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                    >
                      <Plus className="w-4 h-4 text-white" />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-center space-x-2">
                    <span className="text-2xl font-bold text-white">{sellQuantity[selectedSellItem.id] || 1}</span>
                    <span className="text-gray-400">/ {selectedSellItem.quantity}</span>
                  </div>
                </div>
              </div>

              {/* Price Info */}
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-yellow-300 font-medium">Tổng giá bán:</span>
                  <span className="text-yellow-300 font-bold text-lg">
                    {getItemPrice(selectedSellItem, sellQuantity[selectedSellItem.id] || 1)} gold
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="px-6 pb-6 space-y-3">
              {/* Sell Button */}
              <button
                onClick={() => handleSellWithQuantity(selectedSellItem, sellQuantity[selectedSellItem.id] || 1)}
                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center space-x-3 shadow-lg hover:shadow-yellow-500/25"
              >
                <Coins className="w-5 h-5" />
                <span>Bán {sellQuantity[selectedSellItem.id] || 1} cái</span>
              </button>


              {/* Cancel Button */}
              <button
                onClick={() => setSelectedSellItem(null)}
                className="w-full bg-gray-600 hover:bg-gray-500 text-white font-medium py-3 px-6 rounded-xl transition-colors"
              >
                Hủy bỏ
              </button>
            </div>
          </MotionWrapper>
        </MotionWrapper>
      )}
    </MotionWrapper>
  );
}

// CSS for custom slider
const sliderStyles = `
  .slider::-webkit-slider-thumb {
    appearance: none;
    height: 20px;
    width: 20px;
    border-radius: 50%;
    background: #f59e0b;
    cursor: pointer;
    border: 2px solid #ffffff;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
  
  .slider::-moz-range-thumb {
    height: 20px;
    width: 20px;
    border-radius: 50%;
    background: #f59e0b;
    cursor: pointer;
    border: 2px solid #ffffff;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = sliderStyles;
  document.head.appendChild(styleSheet);
}
