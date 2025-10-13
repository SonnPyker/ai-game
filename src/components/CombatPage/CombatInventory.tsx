import { useState, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { 
  X, 
  Sword, 
  Package, 
  Target,
  Zap,
  Heart
} from 'lucide-react';
import { InventoryItem } from '../../types';
import { Combatant } from '../../services/combatService';
import { MotionWrapper } from '../MotionWrapper';

interface CombatInventoryProps {
  inventory: InventoryItem[];
  onUseItem: (itemId: string, targetId?: string) => void;
  onClose: () => void;
  // selectedTarget?: string | null;
  onSelectTarget: (targetId: string | null) => void;
  enemies: Combatant[];
}

export function CombatInventory({
  inventory,
  onUseItem,
  onClose,
  onSelectTarget,
  enemies
}: CombatInventoryProps) {
  const [showTargetSelection, setShowTargetSelection] = useState(false);
  const [pendingItem, setPendingItem] = useState<InventoryItem | null>(null);

  // Filter items that can be used in combat
  const usableItems = useMemo(() => {
    return inventory.filter(item => {
      // Only show consumable items
      if (item.type === 'consumable') {
        if (item.stats?.effect) return true; // Any consumable with effect
        if (item.damage) return true; // Damaging consumables
        if (item.name.toLowerCase().includes('heal') || 
            item.name.toLowerCase().includes('potion') ||
            item.name.toLowerCase().includes('thuốc')) return true;
        return true; // Show all consumables regardless of other properties
      }
      
      return false;
    });
  }, [inventory]);

  const handleUseItem = (item: InventoryItem) => {
    console.log('handleUseItem called with item:', item);
    
    // Check if item requires a target (damaging items or debuff items)
    let requiresTarget = !!item.damage;
    
    if (item.stats?.effect) {
      const effect = item.stats.effect;
      
      // Check new format first
      if (effect.includes(':')) {
        const parts = effect.split(':');
        if (parts.length >= 3) {
          const [type] = parts;
          requiresTarget = type === 'debuff'; // Only debuffs need target
        }
      } else {
        // Fallback to old format
        requiresTarget = requiresTarget || (
          effect.startsWith('poison_') ||
          effect.startsWith('weakness_') ||
          effect.startsWith('slow_')
        );
      }
    }
    
    console.log('requiresTarget:', requiresTarget, 'enemies.length:', enemies.length);
    
    if (requiresTarget && enemies.length > 0) {
      setPendingItem(item);
      setShowTargetSelection(true);
    } else {
      // Use item directly (healing items, buffs, etc.)
      console.log('Using item directly:', item.id);
      onUseItem(item.id);
      onClose();
    }
  };

  const handleTargetSelect = (targetId: string) => {
    if (pendingItem) {
      onUseItem(pendingItem.id, targetId);
      onClose();
    }
    setPendingItem(null);
    setShowTargetSelection(false);
    onSelectTarget?.(null);
  };

  const handleCancelTargetSelection = () => {
    setPendingItem(null);
    setShowTargetSelection(false);
    onSelectTarget?.(null);
  };

  const getItemIcon = (item: InventoryItem) => {
    switch (item.type) {
      case 'weapon':
        return <Sword className="w-5 h-5 text-orange-400" />;
      case 'consumable':
        if (item.damage) {
          return <Zap className="w-5 h-5 text-red-400" />;
        }
        return <Heart className="w-5 h-5 text-green-400" />;
      case 'misc':
        return <Package className="w-5 h-5 text-blue-400" />;
      default:
        return <Package className="w-5 h-5 text-gray-400" />;
    }
  };

  const getItemDescription = (item: InventoryItem) => {
    if (item.damage) {
      return `Gây ${item.damage} sát thương ${item.damageType || 'vật lý'}`;
    }
    
    // Check for consumable effects - try new format first
    if (item.stats?.effect) {
      const effect = item.stats.effect;
      
      // Try new format: type:target:value:duration
      if (effect.includes(':')) {
        const parts = effect.split(':');
        if (parts.length >= 3) {
          const [type, target, value, duration] = parts;
          
          switch (type) {
            case 'heal':
              return `Hồi phục ${value} HP ngay lập tức`;
            case 'stat_buff':
              const statNames: { [key: string]: string } = {
                'strength': 'Sức mạnh',
                'agility': 'Nhanh nhẹn', 
                'constitution': 'Thể chất',
                'intelligence': 'Trí tuệ',
                'wisdom': 'Khôn ngoan',
                'charisma': 'Sức hút',
                'ac': 'Phòng thủ (AC)'
              };
              const durationText = duration === 'instant' ? 'ngay lập tức' : `trong ${duration}`;
              return `Tăng ${statNames[target] || target} ${value} ${durationText}`;
            case 'damage_buff':
              // For damage_buff, the format is: damage_buff:value:duration (no target)
              const damageValue = parts.length >= 3 ? parts[1] : value; // +1d4
              const damageDuration = parts.length >= 3 ? parts[2] : duration; // 3turns
              const durationText2 = damageDuration === 'instant' ? 'ngay lập tức' : `trong ${damageDuration}`;
              return `Tăng sát thương ${damageValue} ${durationText2}`;
            case 'debuff':
              const debuffNames: { [key: string]: string } = {
                'poison': 'Độc',
                'weakness': 'Yếu đuối',
                'slow': 'Chậm chạp'
              };
              const durationText3 = duration === 'instant' ? 'ngay lập tức' : `trong ${duration}`;
              return `Gây ${debuffNames[target] || target} ${value} cho mục tiêu ${durationText3}`;
            case 'cure':
              const cureNames: { [key: string]: string } = {
                'poison': 'độc tố',
                'all': 'tất cả hiệu ứng tiêu cực'
              };
              return `Loại bỏ ${cureNames[target] || target} ngay lập tức`;
            default:
              return item.description || 'Không có mô tả';
          }
        }
      }
      
      // Fallback to old format for backward compatibility
      if (effect.startsWith('heal_')) {
        return 'Hồi phục HP';
      } else if (effect.startsWith('damage_buff_')) {
        return 'Tăng sát thương tấn công';
      } else if (effect.startsWith('ac_buff_')) {
        return 'Tăng AC (Áo giáp)';
      } else if (effect.includes('_plus_') && effect.includes('_1hour')) {
        const statName = effect.split('_plus_')[0];
        const statNames: { [key: string]: string } = {
          'strength': 'Sức mạnh',
          'agility': 'Nhanh nhẹn', 
          'constitution': 'Thể chất',
          'intelligence': 'Trí tuệ',
          'wisdom': 'Khôn ngoan',
          'charisma': 'Sức hút'
        };
        return `Tăng ${statNames[statName] || statName}`;
      } else if (effect.startsWith('poison_')) {
        return 'Gây độc cho mục tiêu';
      } else if (effect.startsWith('weakness_')) {
        return 'Làm yếu mục tiêu';
      } else if (effect.startsWith('slow_')) {
        return 'Làm chậm mục tiêu';
      } else if (effect.startsWith('cure_')) {
        return 'Chữa trị hiệu ứng tiêu cực';
      }
    }
    
    // Fallback to name-based detection
    if (item.name.toLowerCase().includes('heal') || 
        item.name.toLowerCase().includes('potion') ||
        item.name.toLowerCase().includes('thuốc')) {
      return 'Hồi phục HP';
    }
    
    return item.description || 'Sử dụng vật phẩm';
  };

  const getItemActionText = (item: InventoryItem) => {
    if (item.damage) {
      return 'Tấn công';
    }
    
    // Check for consumable effects - try new format first
    if (item.stats?.effect) {
      const effect = item.stats.effect;
      
      // Try new format: type:target:value:duration
      if (effect.includes(':')) {
        const parts = effect.split(':');
        if (parts.length >= 3) {
          const [type] = parts;
          
          switch (type) {
            case 'heal':
              return 'Hồi phục';
            case 'stat_buff':
            case 'damage_buff':
              return 'Tăng cường';
            case 'debuff':
              return 'Gây hiệu ứng';
            case 'cure':
              return 'Chữa trị';
            default:
              return 'Sử dụng';
          }
        }
      }
      
      // Fallback to old format for backward compatibility
      if (effect.startsWith('heal_')) {
        return 'Hồi phục';
      } else if (effect.startsWith('damage_buff_') || effect.startsWith('ac_buff_') || 
                 (effect.includes('_plus_') && effect.includes('_1hour'))) {
        return 'Tăng cường';
      } else if (effect.startsWith('poison_') || effect.startsWith('weakness_') || 
                 effect.startsWith('slow_')) {
        return 'Gây hiệu ứng';
      } else if (effect.startsWith('cure_')) {
        return 'Chữa trị';
      }
    }
    
    // Fallback to name-based detection
    if (item.name.toLowerCase().includes('heal') || 
        item.name.toLowerCase().includes('potion') ||
        item.name.toLowerCase().includes('thuốc')) {
      return 'Hồi phục';
    }
    
    return 'Sử dụng';
  };

  return (
    <>
      <div className="h-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 px-6 py-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center">
              <Package className="w-6 h-6 mr-2" />
              Túi Đồ Combat
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Chọn vật phẩm để sử dụng trong combat
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto max-h-96 p-6">
          {usableItems.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-300 mb-2">
                Không có vật phẩm sử dụng được
              </h3>
              <p className="text-gray-400 text-sm">
                Chỉ có vũ khí đã trang bị và consumables có thể sử dụng trong combat
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {usableItems.map((item) => (
                <MotionWrapper
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-800/50 rounded-lg border border-gray-600 p-4 hover:border-gray-500 transition-colors"
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      {getItemIcon(item)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-white truncate">
                          {item.name}
                        </h3>
                        {item.isEquipped && (
                          <span className="text-xs bg-blue-600/20 text-blue-400 px-2 py-1 rounded">
                            Đã trang bị
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-400 mb-3">
                        {getItemDescription(item)}
                      </p>
                      
                      {/* Item Stats */}
                      {(item.damage || item.attackBonus) && (
                        <div className="flex flex-wrap gap-2 text-xs mb-3">
                          {item.damage && (
                            <span className="text-red-400 font-mono">
                              Sát thương: {item.damage}
                            </span>
                          )}
                          {item.attackBonus && (
                            <span className="text-blue-400">
                              Tấn công: +{item.attackBonus}
                            </span>
                          )}
                          {item.damageType && (
                            <span className="text-purple-400">
                              {item.damageType}
                            </span>
                          )}
                        </div>
                      )}
                      
                      {/* Quantity Display */}
                      {item.quantity !== undefined && (
                        <div className="text-xs text-gray-400 mb-2">
                          Số lượng: {item.quantity}
                        </div>
                      )}
                      
                      <button
                        onClick={() => handleUseItem(item)}
                        disabled={item.quantity === 0}
                        className={`
                          w-full py-2 px-4 rounded-lg transition-colors font-medium
                          ${item.quantity === 0
                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                            : item.damage 
                              ? 'bg-red-600 hover:bg-red-700 text-white' 
                              : 'bg-green-600 hover:bg-green-700 text-white'
                          }
                        `}
                      >
                        {item.quantity === 0 ? 'Đã hết' : getItemActionText(item)}
                      </button>
                    </div>
                  </div>
                </MotionWrapper>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Target Selection Modal */}
      <AnimatePresence>
        {showTargetSelection && (
          <MotionWrapper
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={handleCancelTargetSelection}
          >
            <MotionWrapper
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 rounded-lg shadow-2xl w-full max-w-md p-6"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Target className="w-5 h-5 mr-2" />
                Chọn Mục Tiêu cho {pendingItem?.name}
              </h3>
              
              <div className="space-y-2">
                {enemies.map((enemy) => (
                  <button
                    key={enemy.id}
                    onClick={() => handleTargetSelect(enemy.id)}
                    className="w-full p-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-left transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-white">{enemy.name}</div>
                        <div className="text-sm text-gray-400">
                          HP: {enemy.health.current}/{enemy.health.max} | AC: {enemy.armorClass}
                        </div>
                      </div>
                      <div className="text-red-400">
                        <Zap className="w-4 h-4" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              
              <button
                onClick={handleCancelTargetSelection}
                className="w-full mt-4 p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
              >
                Hủy
              </button>
            </MotionWrapper>
          </MotionWrapper>
        )}
      </AnimatePresence>
    </>
  );
}
