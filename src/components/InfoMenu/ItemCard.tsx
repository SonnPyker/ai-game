import { useState } from 'react';
import { InventoryItem } from '../../types';
import { 
  MoreVertical, 
  Sword, 
  Shield, 
  Beaker, 
  Package,
  Star,
  Plus,
  Minus,
  Trash2,
  Eye
} from 'lucide-react';

interface ItemCardProps {
  item: InventoryItem;
  onEquip?: (itemId: string) => void;
  onUnequip?: (itemId: string) => void;
  onDrop?: (itemId: string) => void;
  onViewDetails?: (item: InventoryItem) => void;
  showActions?: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export function ItemCard({ 
  item, 
  onEquip, 
  onUnequip, 
  onDrop, 
  onViewDetails,
  showActions = true,
  size = 'medium',
  className = ''
}: ItemCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  // Rarity colors
  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'text-gray-400 border-gray-400';
      case 'uncommon': return 'text-green-400 border-green-400';
      case 'rare': return 'text-blue-400 border-blue-400';
      case 'epic': return 'text-purple-400 border-purple-400';
      case 'legendary': return 'text-orange-400 border-orange-400';
      default: return 'text-gray-400 border-gray-400';
    }
  };

  // Type icons
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'weapon': return <Sword className="w-4 h-4" />;
      case 'armor': return <Shield className="w-4 h-4" />;
      case 'consumable': return <Beaker className="w-4 h-4" />;
      case 'misc': return <Package className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  // Size classes
  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'p-2 text-xs';
      case 'large':
        return 'p-4 text-base';
      default:
        return 'p-3 text-sm';
    }
  };

  // Format stats bonuses
  const formatStats = (stats?: { [key: string]: number | string }) => {
    if (!stats) return null;
    
    const statNames: { [key: string]: string } = {
      strength: 'Sức mạnh',
      agility: 'Nhanh nhẹn',
      intelligence: 'Trí tuệ',
      constitution: 'Thể chất',
      wisdom: 'Khôn ngoan',
      charisma: 'Sức hút',
      attackBonus: 'Tấn công',
      armorClass: 'Giáp',
      healing: 'Hồi máu',
      damage: 'Sát thương'
    };

    return Object.entries(stats)
      .filter(([_, value]) => value !== 0 && value !== '')
      .map(([stat, value], index) => (
        <span key={`${stat}-${index}`} className={`text-xs ${typeof value === 'number' && value > 0 ? 'text-green-400' : 'text-red-400'}`}>
          {statNames[stat]}: {typeof value === 'number' && value > 0 ? '+' : ''}{value}
        </span>
      ));
  };

  // Format damage type color
  const getDamageTypeColor = (damageType?: string) => {
    switch (damageType) {
      case 'fire': return 'text-red-400';
      case 'cold': return 'text-blue-400';
      case 'lightning': return 'text-yellow-400';
      case 'poison': return 'text-green-400';
      case 'magical': return 'text-purple-400';
      case 'psychic': return 'text-pink-400';
      default: return 'text-gray-400';
    }
  };

  // Format damage type name
  const getDamageTypeName = (damageType?: string) => {
    switch (damageType) {
      case 'fire': return 'Lửa';
      case 'cold': return 'Băng';
      case 'lightning': return 'Sét';
      case 'poison': return 'Độc';
      case 'magical': return 'Phép thuật';
      case 'psychic': return 'Tâm linh';
      case 'physical': return 'Vật lý';
      default: return 'Vật lý';
    }
  };

  const handleAction = (action: string) => {
    setShowMenu(false);
    
    switch (action) {
      case 'equip':
        onEquip?.(item.id);
        break;
      case 'unequip':
        onUnequip?.(item.id);
        break;
      case 'drop':
        onDrop?.(item.id);
        break;
      case 'view':
        onViewDetails?.(item);
        break;
    }
  };

  return (
    <div className={`relative bg-gray-800/50 rounded-lg border border-gray-600/50 hover:border-gray-500/70 transition-all duration-200 hover:shadow-lg group ${getSizeClasses()} ${className}`}>
      {/* Item Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          <div className="text-lg flex-shrink-0">
            {item.icon}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className={`font-medium truncate ${getRarityColor(item.rarity).split(' ')[0]}`}>
              {item.name}
            </h3>
            <div className="flex items-center space-x-2 text-xs text-gray-400">
              <span className={`px-1.5 py-0.5 rounded border ${getRarityColor(item.rarity)}`}>
                {item.rarity}
              </span>
              <div className="flex items-center space-x-1">
                {getTypeIcon(item.type)}
                <span className="capitalize">{item.type}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions Menu */}
        {showActions && (
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <>
                {/* Backdrop */}
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowMenu(false)}
                />
                
                {/* Menu */}
                <div className="absolute right-0 top-8 z-20 bg-gray-800 border border-gray-600 rounded-lg shadow-lg py-1 min-w-[120px]">
                  {onViewDetails && (
                    <button
                      onClick={() => handleAction('view')}
                      className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700/50 hover:text-white flex items-center space-x-2"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Xem chi tiết</span>
                    </button>
                  )}
                  
                  {item.isEquipped ? (
                    <button
                      onClick={() => handleAction('unequip')}
                      className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700/50 hover:text-white flex items-center space-x-2"
                    >
                      <Minus className="w-4 h-4" />
                      <span>Gỡ trang bị</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAction('equip')}
                      className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700/50 hover:text-white flex items-center space-x-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Trang bị</span>
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleAction('drop')}
                    className={`w-full px-3 py-2 text-left text-sm flex items-center space-x-2 ${
                      item.isEquipped 
                        ? 'text-yellow-400 hover:bg-yellow-500/20 hover:text-yellow-300' 
                        : 'text-red-400 hover:bg-red-500/20 hover:text-red-300'
                    }`}
                    title={item.isEquipped ? 'Sẽ tự động gỡ trang bị trước khi vứt bỏ' : ''}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{item.isEquipped ? 'Vứt bỏ (gỡ trang bị)' : 'Vứt bỏ'}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Item Description */}
      {size !== 'small' && (
        <p className="text-gray-400 text-xs mb-2 line-clamp-2">
          {item.description}
        </p>
      )}

      {/* Stats Bonuses */}
      {item.stats && Object.values(item.stats).some(value => value !== 0) && (
        <div className="mb-2">
          <div className="flex flex-wrap gap-1">
            {formatStats(item.stats)}
          </div>
        </div>
      )}

      {/* Combat Stats */}
      {(item.damage || item.attackBonus || item.armorClass) && (
        <div className="mb-2">
          <div className="flex flex-wrap gap-2 text-xs">
            {item.damage && (
              <span className="text-red-400 font-mono">
                Sát thương: {item.damage}
              </span>
            )}
            {item.attackBonus && (
              <span className="text-blue-400">
                Tấn công: {item.attackBonus > 0 ? '+' : ''}{item.attackBonus}
              </span>
            )}
            {item.armorClass && (
              <span className="text-green-400">
                AC: {item.armorClass}
              </span>
            )}
            {item.damageType && (
              <span className={getDamageTypeColor(item.damageType)}>
                {getDamageTypeName(item.damageType)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Item Footer */}
      <div className="flex items-center justify-between">
        {/* Quantity */}
        {item.quantity > 1 && (
          <div className="flex items-center space-x-1 text-xs text-gray-400">
            <span>×{item.quantity}</span>
          </div>
        )}

        {/* Equipped Badge */}
        {item.isEquipped && (
          <div className="flex items-center space-x-1 text-xs text-green-400">
            <Star className="w-3 h-3" />
            <span>Đã trang bị</span>
          </div>
        )}

        {/* Slot Badge */}
        {item.slot && (
          <div className="text-xs text-blue-400">
            {item.slot.replace('_', ' ')}
          </div>
        )}
      </div>

      {/* Hover Tooltip for small size */}
      {size === 'small' && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-30 max-w-xs">
          <div className="text-sm font-medium text-white mb-1">{item.name}</div>
          <div className="text-xs text-gray-300 mb-2">{item.description}</div>
          {item.stats && Object.values(item.stats).some(value => value !== 0) && (
            <div className="flex flex-wrap gap-1 mb-2">
              {formatStats(item.stats)}
            </div>
          )}
          {(item.damage || item.attackBonus) && (
            <div className="flex flex-wrap gap-2 text-xs">
              {item.damage && (
                <span className="text-red-400 font-mono">
                  Sát thương: {item.damage}
                </span>
              )}
              {item.attackBonus && (
                <span className="text-blue-400">
                  Tấn công: {item.attackBonus > 0 ? '+' : ''}{item.attackBonus}
                </span>
              )}
              {item.damageType && (
                <span className={getDamageTypeColor(item.damageType)}>
                  {getDamageTypeName(item.damageType)}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
