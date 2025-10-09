// import React from 'react';
import { MotionWrapper, MotionH1, MotionP, MotionButton } from '../MotionWrapper';
import { 
  Trophy, 
  X, 
  Star, 
  Package, 
  Coins, 
  ArrowRight,
  RotateCcw
} from 'lucide-react';
import { CombatState } from '../../services/combatService';

interface CombatResultsProps {
  combatState: CombatState;
  onContinue: () => void;
  onViewLoot: () => void;
}

export function CombatResults({ 
  combatState, 
  onContinue, 
  onViewLoot 
}: CombatResultsProps) {
  const isVictory = combatState.winner === 'player';
  const rewards = combatState.rewards;

  const getVictoryMessage = () => {
    if (isVictory) {
      return {
        title: 'Chiến Thắng!',
        subtitle: 'Bạn đã đánh bại tất cả kẻ thù!',
        icon: <Trophy className="w-16 h-16 text-yellow-400" />,
        bgColor: 'bg-green-900/20',
        borderColor: 'border-green-400/50',
        textColor: 'text-green-300'
      };
    } else {
      return {
        title: 'Thất Bại!',
        subtitle: 'Bạn đã bị đánh bại trong combat!',
        icon: <X className="w-16 h-16 text-red-400" />,
        bgColor: 'bg-red-900/20',
        borderColor: 'border-red-400/50',
        textColor: 'text-red-300'
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
      case 'uncommon': return 'text-green-400';
      case 'rare': return 'text-blue-400';
      case 'epic': return 'text-purple-400';
      case 'legendary': return 'text-orange-400';
      case 'unique': return 'text-pink-400';
      default: return 'text-gray-400';
    }
  };

  const getRarityBg = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'bg-gray-600/20';
      case 'uncommon': return 'bg-green-600/20';
      case 'rare': return 'bg-blue-600/20';
      case 'epic': return 'bg-purple-600/20';
      case 'legendary': return 'bg-orange-600/20';
      case 'unique': return 'bg-pink-600/20';
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
                {combatState.combatLog.length}
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
                    +{formatExperience(rewards.experience)}
                  </div>
                </div>
              </div>

              {/* Items */}
              {rewards.items && rewards.items.length > 0 && (
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-4">
                    <Package className="w-6 h-6 text-blue-400" />
                    <div>
                      <div className="font-medium text-white">Vật Phẩm</div>
                      <div className="text-sm text-gray-400">
                        {rewards.items.length} vật phẩm nhận được
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {rewards.items.map((item, index) => (
                      <MotionWrapper
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 + index * 0.1 }}
                        className={`
                          p-3 rounded-lg border
                          ${getRarityBg(item.rarity)} border-gray-600
                        `}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="text-2xl">{item.icon}</div>
                          <div className="flex-1">
                            <div className={`font-medium ${getRarityColor(item.rarity)}`}>
                              {item.name}
                            </div>
                            <div className="text-sm text-gray-400">
                              {item.type} • {item.rarity}
                            </div>
                            {item.damage && (
                              <div className="text-xs text-red-400 font-mono">
                                {item.damage} damage
                              </div>
                            )}
                          </div>
                        </div>
                      </MotionWrapper>
                    ))}
                  </div>
                </div>
              )}

              {/* Currency */}
              {rewards.currency && rewards.currency > 0 && (
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
              onClick={onContinue}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
            >
              <ArrowRight className="w-5 h-5" />
              <span>Tiếp Tục</span>
            </MotionButton>

            {isVictory && rewards && rewards.items && rewards.items.length > 0 && (
              <MotionButton
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                onClick={onViewLoot}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 px-6 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
              >
                <Package className="w-5 h-5" />
                <span>Xem Chi Tiết Loot</span>
              </MotionButton>
            )}

            <MotionButton
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
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
