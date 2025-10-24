import React, { useState } from 'react';
import { Equipment, InventoryItem, CharacterSkill } from '../../types';
import { ItemCard } from './ItemCard';
// import { accessoryEffectService } from '../../services/accessoryEffectService';
import { 
  Sword, 
  Shield, 
  Gem,
  Plus,
  Minus
} from 'lucide-react';

interface EquipmentViewProps {
  equipment: Equipment;
  inventory: InventoryItem[];
  skills?: CharacterSkill[];
  onEquipItem?: (itemId: string, slot: string) => void;
  onUnequipItem?: (itemId: string) => void;
}

type EquipmentSlot = 'weapon' | 'armor' | 'accessory1' | 'accessory2' | 'accessory3';

interface SlotInfo {
  key: EquipmentSlot;
  label: string;
  icon: React.ReactNode;
  position: { row: number; col: number };
  size: 'normal' | 'large';
}

const SLOT_CONFIG: SlotInfo[] = [
  { key: 'weapon', label: 'Vũ khí', icon: <Sword className="w-5 h-5" />, position: { row: 1, col: 1 }, size: 'normal' },
  { key: 'armor', label: 'Áo giáp', icon: <Shield className="w-5 h-5" />, position: { row: 1, col: 2 }, size: 'large' },
  { key: 'accessory1', label: 'Phụ kiện 1', icon: <Gem className="w-5 h-5" />, position: { row: 1, col: 3 }, size: 'normal' },
  { key: 'accessory2', label: 'Phụ kiện 2', icon: <Gem className="w-5 h-5" />, position: { row: 2, col: 1 }, size: 'normal' },
  { key: 'accessory3', label: 'Phụ kiện 3', icon: <Gem className="w-5 h-5" />, position: { row: 2, col: 3 }, size: 'normal' }
];

export function EquipmentView({ 
  equipment, 
  inventory, 
  skills = [],
  onEquipItem, 
  onUnequipItem
}: EquipmentViewProps) {
  const [selectedSlot, setSelectedSlot] = useState<EquipmentSlot | null>(null);
  const [showAvailableItems, setShowAvailableItems] = useState(false);


  // Get available items for a slot
  const getAvailableItemsForSlot = (slot: EquipmentSlot): InventoryItem[] => {
    return inventory.filter(item => {
      if (item.isEquipped) return false;
      
      if (slot === 'weapon') {
        return item.type === 'weapon';
      }
      
      if (slot === 'armor') {
        return item.type === 'armor';
      }
      
          if (['accessory1', 'accessory2', 'accessory3'].includes(slot)) {
            // CHỈ items có originalSlot hoặc slot accessory1/2/3 mới hiển thị
            const accessorySlot = item.originalSlot || item.slot;
            return accessorySlot && ['accessory1', 'accessory2', 'accessory3'].includes(accessorySlot);
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


  return (
    <div className="space-y-6">
      {/* Equipment Slots Grid */}
      <div className="bg-gray-800/50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4 text-center">
          Trang Bị Nhân Vật
        </h3>
        
        {/* Equipment Grid */}
        <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto">
          {SLOT_CONFIG.map((slotInfo) => {
            const item = equipment[slotInfo.key];
            const isEmpty = !item;
            
            return (
              <div
                key={slotInfo.key}
                className={`relative ${
                  slotInfo.size === 'large' ? 'row-span-2' : ''
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

      {/* Skills Display */}
      <div className="bg-gray-800/50 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
          <Sword className="w-5 h-5 mr-2" />
          Kỹ Năng Nhân Vật
        </h3>
        
        {skills && skills.length > 0 ? (
          <div className="space-y-2">
            {skills.map((skill, index) => (
              <div key={skill.id || index} className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{skill.icon || '⚔️'}</span>
                  <div>
                    <div className="text-white font-medium text-sm">{skill.name}</div>
                    <div className="text-gray-400 text-xs">
                      {skill.skillType === 'damage' ? 'Tấn Công' :
                       skill.skillType === 'healing' ? 'Hồi Phục' : 'Xã Hội'} • 
                      Level {skill.level || 1}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-blue-400 text-xs">
                    Cooldown: {skill.cooldown || 0}s
                  </div>
                  {skill.requiresTarget && (
                    <div className="text-yellow-400 text-xs">Cần mục tiêu</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">Chưa có kỹ năng nào</p>
        )}
      </div>
    </div>
  );
}
