import { useState, useEffect } from 'react';
import { MotionWrapper, MotionH1, MotionP, MotionButton } from '../MotionWrapper';
import { 
  Trophy, 
  X, 
  Star, 
  Package, 
  Coins, 
  ArrowRight,
  RotateCcw,
  Check
} from 'lucide-react';
import { CombatState } from '../../services/combatService';
import { InventoryItem } from '../../types';

interface CombatResultsProps {
  combatState: CombatState;
  onContinue: (selectedItems: InventoryItem[]) => void;
}

export function CombatResults({ 
  combatState, 
  onContinue
}: CombatResultsProps) {
  const isVictory = combatState.winner === 'player';
  const rewards = combatState.rewards;
  
  // State for selected items
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  
  // Initialize all items as selected by default
  useEffect(() => {
    if (rewards?.items) {
      setSelectedItems(new Set(rewards.items.map((item, index) => 
        item.id || `item-${index}-${item.name || 'unknown'}`
      )));
    }
  }, [rewards?.items]);

  // Handle item selection
  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  // Select all items
  const selectAllItems = () => {
    if (rewards?.items) {
      setSelectedItems(new Set(rewards.items.map((item, index) => 
        item.id || `item-${index}-${item.name || 'unknown'}`
      )));
    }
  };

  // Deselect all items
  const deselectAllItems = () => {
    setSelectedItems(new Set());
  };

  // Get selected items
  const getSelectedItems = (): InventoryItem[] => {
    if (!rewards?.items) return [];
    return rewards.items.filter((item, index) => {
      const itemId = item.id || `item-${index}-${item.name || 'unknown'}`;
      return selectedItems.has(itemId);
    });
  };

  // Handle continue with selected items
  const handleContinue = () => {
    const selected = getSelectedItems();
    onContinue(selected);
  };

  const getVictoryMessage = () => {
    if (isVictory) {
      return {
        title: 'Chiến Thắng!',
        subtitle: 'Bạn đã đánh bại tất cả kẻ thù!',
        icon: <Trophy className="w-16 h-16 text-yellow-400" />,
        bgColor: 'bg-gray-900/20',
        borderColor: 'border-yellow-400/50',
        textColor: 'text-yellow-300'
      };
    } else {
      return {
        title: 'Thất Bại!',
        subtitle: 'Bạn đã bị đánh bại trong combat!',
        icon: <X className="w-16 h-16 text-white" />,
        bgColor: 'bg-gray-950/20',
        borderColor: 'border-gray-700/50',
        textColor: 'text-white'
      };
    }
  };

  const victoryData = getVictoryMessage();

  const formatExperience = (exp: number) => {
    return exp.toLocaleString('vi-VN');
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'text-gray-400';
      case 'uncommon': return 'text-yellow-400';
      case 'rare': return 'text-yellow-400';
      case 'epic': return 'text-yellow-400';
      case 'legendary': return 'text-yellow-400';
      case 'unique': return 'text-white';
      default: return 'text-gray-400';
    }
  };

  const getRarityBg = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'bg-gray-600/20';
      case 'uncommon': return 'bg-yellow-700/20';
      case 'rare': return 'bg-yellow-600/20';
      case 'epic': return 'bg-yellow-600/20';
      case 'legendary': return 'bg-yellow-700/20';
      case 'unique': return 'bg-gray-800/20';
      default: return 'bg-gray-600/20';
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <MotionWrapper
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className={`
          w-full max-w-4xl bg-gray-900 rounded-2xl shadow-2xl overflow-hidden
          ${victoryData.bgColor} ${victoryData.borderColor} border-2
        `}
      >
        {/* Header */}
        <div className="text-center p-8">
          <MotionWrapper
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="mb-4"
          >
            {victoryData.icon}
          </MotionWrapper>
          
          <MotionH1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-4xl font-bold text-white mb-2"
          >
            {victoryData.title}
          </MotionH1>
          
          <MotionP
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className={`text-lg ${victoryData.textColor}`}
          >
            {victoryData.subtitle}
          </MotionP>
        </div>

        {/* Combat Summary */}
        <div className="px-8 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-800/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white">
                {combatState.currentTurn}
              </div>
              <div className="text-sm text-gray-400">Turns</div>
            </div>
            
            <div className="bg-gray-800/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white">
                {combatState.combatants.filter(c => c.type === 'enemy' && !c.isAlive).length}
              </div>
              <div className="text-sm text-gray-400">Kẻ thù đánh bại</div>
            </div>
            
            <div className="bg-gray-800/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white">
                {combatState.turnLogs?.length || 0}
              </div>
              <div className="text-sm text-gray-400">Hành động</div>
            </div>
          </div>

          {/* Rewards Section */}
          {isVictory && rewards && (
            <MotionWrapper
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-bold text-white flex items-center">
                <Star className="w-6 h-6 mr-2 text-yellow-400" />
                Phần Thưởng
              </h2>

              {/* Experience */}
              <div className="bg-gray-800/50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Star className="w-6 h-6 text-yellow-400" />
                    <div>
                      <div className="font-medium text-white">Kinh Nghiệm</div>
                      <div className="text-sm text-gray-400">XP nhận được</div>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-yellow-400">
                    +{formatExperience(rewards?.experience || 0)}
                  </div>
                </div>
              </div>

              {/* Items */}
              {rewards.items && rewards.items.length > 0 && (
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <Package className="w-6 h-6 text-yellow-400" />
                      <div>
                        <div className="font-medium text-white">Vật Phẩm</div>
                        <div className="text-sm text-gray-400">
                          {selectedItems.size}/{rewards.items.length} vật phẩm được chọn
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={selectAllItems}
                        className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-sm rounded transition-colors"
                      >
                        Chọn Tất Cả
                      </button>
                      <button
                        onClick={deselectAllItems}
                        className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-colors"
                      >
                        Bỏ Chọn Tất Cả
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {rewards.items.map((item, index) => {
                      // Validate item data
                      if (!item || typeof item !== 'object') {
                        console.warn('Invalid item data:', item);
                        return null;
                      }
                      
                      const itemId = item.id || `item-${index}-${item.name || 'unknown'}`;
                      const itemName = item.name || 'Unknown Item';
                      const itemType = item.type || 'misc';
                      const itemRarity = item.rarity || 'common';
                      const itemIcon = item.icon || '□';
                      const itemDescription = item.description || '';
                      
                      return (
                        <MotionWrapper
                          key={itemId}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.6 + index * 0.1 }}
                          className={`
                            p-3 rounded-lg border cursor-pointer transition-all
                            ${getRarityBg(itemRarity)} 
                            ${selectedItems.has(itemId) 
                              ? 'border-yellow-400 ring-2 ring-blue-400/50' 
                              : 'border-gray-600 hover:border-gray-500'
                            }
                          `}
                          onClick={() => toggleItemSelection(itemId)}
                      >
                        <div className="flex items-center space-x-3">
                          {/* Checkbox */}
                          <div className={`
                            w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
                            ${selectedItems.has(itemId) 
                              ? 'bg-yellow-500 border-yellow-500' 
                              : 'border-gray-400 hover:border-gray-300'
                            }
                          `}>
                            {selectedItems.has(itemId) && (
                              <Check className="w-3 h-3 text-white" />
                            )}
                          </div>
                          
                          <div className="text-2xl">{itemIcon}</div>
                          <div className="flex-1">
                            <div className={`font-medium ${getRarityColor(itemRarity)}`}>
                              {itemName}
                            </div>
                            <div className="text-sm text-gray-400">
                              {itemType} • {itemRarity}
                            </div>
                            {item.damage && (
                              <div className="text-xs text-white font-mono">
                                {item.damage} damage
                              </div>
                            )}
                            {itemDescription && (
                              <div className="text-xs text-gray-500 mt-1">
                                {itemDescription}
                              </div>
                            )}
                          </div>
                        </div>
                      </MotionWrapper>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Currency */}
              {rewards?.currency && rewards.currency > 0 && (
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Coins className="w-6 h-6 text-yellow-400" />
                      <div>
                        <div className="font-medium text-white">Tiền</div>
                        <div className="text-sm text-gray-400">Vàng nhận được</div>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-yellow-400">
                      +{rewards.currency.toLocaleString('vi-VN')}
                    </div>
                  </div>
                </div>
              )}
            </MotionWrapper>
          )}
        </div>

        {/* Action Buttons */}
        <div className="px-8 pb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <MotionButton
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              onClick={handleContinue}
              className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white py-3 px-6 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
            >
              <ArrowRight className="w-5 h-5" />
              <span>Tiếp Tục ({selectedItems.size} items)</span>
            </MotionButton>

            <MotionButton
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              onClick={() => window.location.reload()}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 px-6 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
            >
              <RotateCcw className="w-5 h-5" />
              <span>Thử Lại</span>
            </MotionButton>
          </div>
        </div>
      </MotionWrapper>
    </div>
  );
}
