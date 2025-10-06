import React, { useState } from 'react';
import { Equipment, InventoryItem } from '../../types';
import { ItemCard } from './ItemCard';
import { 
  Sword, 
  Shield, 
  Crown, 
  Shirt, 
  Hand, 
  Footprints,
  Gem,
  Plus,
  Minus
} from 'lucide-react';

interface EquipmentViewProps {
  equipment: Equipment;
  inventory: InventoryItem[];
  onEquipItem?: (itemId: string, slot: string) => void;
  onUnequipItem?: (itemId: string) => void;
  onViewItemDetails?: (item: InventoryItem) => void;
}

type EquipmentSlot = 'weapon_main' | 'weapon_off' | 'head' | 'chest' | 'hands' | 'legs' | 'feet' | 'accessory1' | 'accessory2' | 'accessory3';

interface SlotInfo {
  key: EquipmentSlot;
  label: string;
  icon: React.ReactNode;
  position: { row: number; col: number };
  size: 'normal' | 'large';
}

const SLOT_CONFIG: SlotInfo[] = [
  { key: 'head', label: 'Mũ', icon: <Crown className="w-5 h-5" />, position: { row: 1, col: 2 }, size: 'normal' },
  { key: 'weapon_main', label: 'Vũ khí chính', icon: <Sword className="w-5 h-5" />, position: { row: 2, col: 1 }, size: 'normal' },
  { key: 'chest', label: 'Áo giáp', icon: <Shield className="w-5 h-5" />, position: { row: 2, col: 2 }, size: 'large' },
  { key: 'weapon_off', label: 'Vũ khí phụ', icon: <Sword className="w-5 h-5" />, position: { row: 2, col: 3 }, size: 'normal' },
  { key: 'hands', label: 'Găng tay', icon: <Hand className="w-5 h-5" />, position: { row: 3, col: 1 }, size: 'normal' },
  { key: 'accessory1', label: 'Phụ kiện 1', icon: <Gem className="w-5 h-5" />, position: { row: 3, col: 3 }, size: 'normal' },
  { key: 'legs', label: 'Quần', icon: <Shirt className="w-5 h-5" />, position: { row: 4, col: 1 }, size: 'normal' },
  { key: 'accessory2', label: 'Phụ kiện 2', icon: <Gem className="w-5 h-5" />, position: { row: 4, col: 3 }, size: 'normal' },
  { key: 'feet', label: 'Giày', icon: <Footprints className="w-5 h-5" />, position: { row: 5, col: 1 }, size: 'normal' },
  { key: 'accessory3', label: 'Phụ kiện 3', icon: <Gem className="w-5 h-5" />, position: { row: 5, col: 3 }, size: 'normal' }
];

export function EquipmentView({ 
  equipment, 
  inventory, 
  onEquipItem, 
  onUnequipItem,
  onViewItemDetails 
}: EquipmentViewProps) {
  const [selectedSlot, setSelectedSlot] = useState<EquipmentSlot | null>(null);
  const [showAvailableItems, setShowAvailableItems] = useState(false);

  // Calculate total stats bonuses
  const totalBonuses = React.useMemo(() => {
    const bonuses = {
      strength: 0,
      agility: 0,
      intelligence: 0,
      constitution: 0,
      wisdom: 0,
      charisma: 0
    };

    Object.values(equipment).forEach(item => {
      if (item && item.stats) {
        bonuses.strength += item.stats.strength || 0;
        bonuses.agility += item.stats.agility || 0;
        bonuses.intelligence += item.stats.intelligence || 0;
        bonuses.constitution += item.stats.constitution || 0;
        bonuses.wisdom += item.stats.wisdom || 0;
        bonuses.charisma += item.stats.charisma || 0;
      }
    });

    return bonuses;
  }, [equipment]);

  // Get available items for a slot
  const getAvailableItemsForSlot = (slot: EquipmentSlot): InventoryItem[] => {
    return inventory.filter(item => {
      if (item.isEquipped) return false;
      
      if (slot.startsWith('weapon')) {
        return item.type === 'weapon';
      }
      
      if (['head', 'chest', 'hands', 'legs', 'feet', 'accessory1', 'accessory2', 'accessory3'].includes(slot)) {
        return item.type === 'armor';
      }
      
      return false;
    });
  };

  const handleSlotClick = (slot: EquipmentSlot) => {
    setSelectedSlot(slot);
    setShowAvailableItems(true);
  };

  const handleEquipItem = (itemId: string) => {
    if (selectedSlot) {
      onEquipItem?.(itemId, selectedSlot);
      setShowAvailableItems(false);
      setSelectedSlot(null);
    }
  };

  const handleUnequipItem = (itemId: string) => {
    onUnequipItem?.(itemId);
  };

  const formatStatBonus = (value: number) => {
    return value > 0 ? `+${value}` : value.toString();
  };

  const getStatColor = (value: number) => {
    return value > 0 ? 'text-green-400' : value < 0 ? 'text-red-400' : 'text-gray-400';
  };

  return (
    <div className="space-y-6">
      {/* Equipment Stats Summary */}
      <div className="bg-gray-800/50 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
          <Shield className="w-5 h-5 mr-2" />
          Tổng Bonuses Trang Bị
        </h3>
        
        {Object.values(totalBonuses).some(value => value !== 0) ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            {Object.entries(totalBonuses).map(([stat, value]) => (
              <div key={stat} className="flex items-center justify-between">
                <span className="text-gray-400 capitalize">
                  {stat === 'strength' ? 'Sức mạnh' :
                   stat === 'agility' ? 'Nhanh nhẹn' :
                   stat === 'intelligence' ? 'Trí tuệ' :
                   stat === 'constitution' ? 'Thể chất' :
                   stat === 'wisdom' ? 'Khôn ngoan' :
                   stat === 'charisma' ? 'Sức hút' : stat}
                </span>
                <span className={`font-medium ${getStatColor(value)}`}>
                  {formatStatBonus(value)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">Chưa có trang bị nào được trang bị</p>
        )}
      </div>

      {/* Equipment Slots Grid */}
      <div className="bg-gray-800/50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4 text-center">
          Trang Bị Nhân Vật
        </h3>
        
        {/* Equipment Grid */}
        <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
          {SLOT_CONFIG.map((slotInfo) => {
            const item = equipment[slotInfo.key];
            const isEmpty = !item;
            
            return (
              <div
                key={slotInfo.key}
                className={`relative ${
                  slotInfo.size === 'large' ? 'col-span-1 row-span-2' : ''
                }`}
                style={{
                  gridRow: slotInfo.position.row,
                  gridColumn: slotInfo.position.col
                }}
              >
                <div
                  className={`relative border-2 border-dashed rounded-lg p-3 min-h-[80px] flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${
                    isEmpty
                      ? 'border-gray-600 hover:border-gray-500 bg-gray-700/20'
                      : 'border-gray-500 bg-gray-700/40 hover:bg-gray-700/60'
                  }`}
                  onClick={() => handleSlotClick(slotInfo.key)}
                >
                  {isEmpty ? (
                    <div className="text-center">
                      <div className="text-gray-500 mb-1">
                        {slotInfo.icon}
                      </div>
                      <div className="text-xs text-gray-400 text-center">
                        {slotInfo.label}
                      </div>
                      <Plus className="w-4 h-4 text-gray-500 mx-auto mt-1" />
                    </div>
                  ) : (
                    <div className="w-full">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-lg">{item.icon}</div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUnequipItem(item.id);
                          }}
                          className="p-1 text-gray-400 hover:text-red-400 hover:bg-red-500/20 rounded transition-colors"
                          title="Gỡ trang bị"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="text-xs text-white font-medium text-center truncate">
                        {item.name}
                      </div>
                      <div className="text-xs text-gray-400 text-center">
                        {item.rarity}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Available Items Modal */}
      {showAvailableItems && selectedSlot && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-40" 
            onClick={() => {
              setShowAvailableItems(false);
              setSelectedSlot(null);
            }}
          />
          
          {/* Modal */}
          <div className="fixed inset-4 bg-gray-800 border border-gray-600 rounded-lg z-50 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-600">
              <h3 className="text-lg font-semibold text-white">
                Chọn vật phẩm cho {SLOT_CONFIG.find(s => s.key === selectedSlot)?.label}
              </h3>
              <button
                onClick={() => {
                  setShowAvailableItems(false);
                  setSelectedSlot(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {(() => {
                const availableItems = getAvailableItemsForSlot(selectedSlot);
                
                if (availableItems.length === 0) {
                  return (
                    <div className="text-center py-8">
                      <Shield className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                      <p className="text-gray-400">Không có vật phẩm phù hợp</p>
                    </div>
                  );
                }
                
                return (
                  <div className="space-y-3">
                    {availableItems.map((item) => (
                      <div key={item.id} className="relative">
                        <ItemCard
                          item={item}
                          onEquip={() => handleEquipItem(item.id)}
                          onViewDetails={onViewItemDetails}
                          showActions={false}
                          size="large"
                          className="w-full"
                        />
                        <button
                          onClick={() => handleEquipItem(item.id)}
                          className="absolute top-2 right-2 p-2 bg-blue-600/80 hover:bg-blue-600 text-white rounded-full transition-colors"
                          title="Trang bị"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
