// import React from 'react';
import { Heart, Shield, Sword, Target, ArrowRight } from 'lucide-react';
import { Combatant, combatService } from '../../services/combatService';
import { MotionWrapper } from '../MotionWrapper';
import { useCombatVisualEffects } from '../../hooks/useCombatVisualEffects';
import { FloatingDamageContainer } from './FloatingDamageText';
import { StatusEffectIcons } from './StatusEffectIcons';

interface CombatantCardProps {
  combatant: Combatant;
  isEnemy: boolean;
  isSelected?: boolean;
  isPlayerTurn?: boolean;
  isCurrentTurn?: boolean; // NEW: Whether this combatant is currently taking their turn
  onSelect?: () => void;
  temporaryPlayerStats?: any; // TemporaryPlayerStats
}

export function CombatantCard({ 
  combatant, 
  isEnemy, 
  isSelected = false, 
  isPlayerTurn = false, 
  isCurrentTurn = false,
  onSelect,
  temporaryPlayerStats
}: CombatantCardProps) {
  // Determine if this is an ally
  const isAlly = combatant.type === 'ally';
  const hpPercentage = (combatant.health.current / combatant.health.max) * 100;
  const isAlive = combatant.isAlive;
  // isCurrentTurn is now passed as prop

  // Use visual effects hook
  const { animationState, floatingTexts, elementRef, handleTextComplete } = useCombatVisualEffects(combatant.id);

  // Get HP bar color based on percentage
  const getHPBarColor = (percentage: number) => {
    if (percentage > 60) return 'bg-green-500';
    if (percentage > 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Get status text
  const getStatusText = () => {
    if (!isAlive) return 'Bị đánh bại';
    if (isCurrentTurn) {
      return isEnemy ? 'Đang lượt' : 'Lượt của bạn';
    }
    if (isEnemy && isPlayerTurn) return 'Mục tiêu';
    return 'Chờ lượt';
  };

  // Get status color
  const getStatusColor = () => {
    if (!isAlive) return 'text-red-400';
    if (isCurrentTurn) return isEnemy ? 'text-orange-400' : 'text-blue-400';
    if (isEnemy && isPlayerTurn) return 'text-yellow-400';
    return 'text-gray-400';
  };

  return (
    <>
      <MotionWrapper
        ref={elementRef as any}
        data-combatant-id={combatant.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`
          relative bg-gray-800/50 rounded-lg border-2 p-4 transition-all duration-200
          ${isSelected ? 'border-yellow-400 shadow-lg shadow-yellow-400/20' : 'border-gray-600'}
          ${!isAlive ? 'opacity-50' : ''}
          ${isCurrentTurn ? (
            isEnemy ? 'ring-2 ring-orange-400 border-orange-400 shadow-lg shadow-orange-400/30' : 
            isAlly ? 'ring-2 ring-green-400 border-green-400 shadow-lg shadow-green-400/30' :
            'ring-2 ring-blue-400 border-blue-400 shadow-lg shadow-blue-400/30'
          ) : ''}
          ${onSelect ? 'cursor-pointer hover:border-gray-500' : ''}
          ${animationState.className}
        `}
        onClick={onSelect}
        whileHover={onSelect ? { scale: 1.02 } : {}}
        whileTap={onSelect ? { scale: 0.98 } : {}}
      >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          {/* Current Turn Arrow Indicator */}
          {isCurrentTurn && (
            <ArrowRight className={`w-5 h-5 ${
              isEnemy ? 'text-orange-400' : 
              isAlly ? 'text-green-400' : 
              'text-blue-400'
            }`} />
          )}
          <h3 className={`font-bold text-lg ${
            isEnemy ? 'text-red-400' : 
            isAlly ? 'text-green-400' : 
            'text-blue-400'
          }`}>
            {combatant.name}
          </h3>
          {isEnemy && (
            <span className="text-xs bg-red-600/20 text-red-400 px-2 py-1 rounded">
              Kẻ thù
            </span>
          )}
          {isAlly && (
            <span className="text-xs bg-green-600/20 text-green-400 px-2 py-1 rounded">
              Đồng minh
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {isCurrentTurn && (
            <div className={`text-xs font-bold px-2 py-1 rounded ${
              isEnemy ? 'bg-orange-400/20 text-orange-400' : 
              isAlly ? 'bg-green-400/20 text-green-400' :
              'bg-blue-400/20 text-blue-400'
            }`}>
              ĐANG LƯỢT
            </div>
          )}
          {isSelected && (
            <Target className="w-5 h-5 text-yellow-400" />
          )}
        </div>
      </div>

      {/* Status */}
      <div className={`text-sm font-medium mb-2 ${getStatusColor()} flex items-center space-x-2`}>
        <span>{getStatusText()}</span>
      </div>

      {/* HP Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-sm mb-1">
          <div className="flex items-center space-x-1">
            <Heart className="w-4 h-4 text-red-400" />
            <span>HP</span>
          </div>
          <span className="text-gray-300">
            {combatant.health.current}/{combatant.health.max}
          </span>
        </div>
        
        <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
          <div 
            className={`h-full ${getHPBarColor(hpPercentage)} transition-all duration-500 ease-out`}
            style={{ width: `${hpPercentage}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="flex items-center space-x-1">
          <Shield className="w-4 h-4 text-blue-400" />
          <span className="text-gray-300">AC:</span>
          <span className="font-mono">
            {!isEnemy && temporaryPlayerStats 
              ? temporaryPlayerStats.armorClass 
              : combatService.calculateACWithEffects(combatant)
            }
          </span>
        </div>
        
        <div className="flex items-center space-x-1">
          <Sword className="w-4 h-4 text-orange-400" />
          <span className="text-gray-300">Combat:</span>
          <span className="font-mono">{combatant.combatLevel || combatant.level || 1}</span>
        </div>
      </div>

      {/* Character Level (if different from combat level) */}
      {(combatant.characterLevel && combatant.characterLevel !== (combatant.combatLevel || combatant.level)) && (
        <div className="mt-2 text-sm">
          <div className="flex items-center space-x-1">
            <span className="text-gray-400">Character Level:</span>
            <span className="font-mono text-green-400">{combatant.characterLevel}</span>
          </div>
        </div>
      )}

      {/* Equipped Armor */}
      {combatant.equippedArmor && (
        <div className="mt-3">
          <div className="text-xs text-gray-400 mb-1">Áo giáp:</div>
          <div className="flex items-center space-x-2 text-xs bg-gray-700/50 rounded px-2 py-1">
            <span className="text-lg">{combatant.equippedArmor.icon}</span>
            <div className="flex-1">
              <div className="font-medium text-gray-200">{combatant.equippedArmor.name}</div>
              <div className="text-gray-400">
                +{combatant.equippedArmor.armorClass || 0} AC
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attacks */}
      {combatant.attacks.length > 0 && (
        <div className="mt-3">
          <div className="text-xs text-gray-400 mb-1">Tấn công:</div>
          <div className="space-y-1">
            {combatant.attacks.slice(0, 2).map((attack, index) => {
              // For player, show combined damage (base + bonus)
              let displayDamage = attack.damage;
              if (!isEnemy && temporaryPlayerStats?.damageBonus && temporaryPlayerStats.damageBonus.trim() !== '') {
                displayDamage = `${attack.damage} + ${temporaryPlayerStats.damageBonus}`;
              }
              
              return (
                <div key={index} className="text-xs bg-gray-700/50 rounded px-2 py-1">
                  <div className="font-medium">{attack.name}</div>
                  <div className="text-gray-300">
                    +{attack.attackBonus} to hit, {displayDamage} {attack.damageType}
                  </div>
                </div>
              );
            })}
            {combatant.attacks.length > 2 && (
              <div className="text-xs text-gray-500">
                +{combatant.attacks.length - 2} tấn công khác
              </div>
            )}
          </div>
        </div>
      )}

      {/* Status Effects */}
      {combatant.statusEffects.length > 0 && (
        <div className="mt-3">
          <div className="text-xs text-gray-400 mb-1">Hiệu ứng:</div>
          <StatusEffectIcons 
            statusEffects={combatant.statusEffects}
            className="justify-start"
          />
        </div>
      )}

      {/* Death Overlay */}
      {!isAlive && (
        <MotionWrapper
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-red-900/20 rounded-lg flex items-center justify-center"
        >
          <div className="text-center">
            <div className="text-4xl mb-2">💀</div>
            <div className="text-red-400 font-bold">Bị đánh bại</div>
          </div>
        </MotionWrapper>
      )}
      </MotionWrapper>

      {/* Floating Damage Texts */}
      <FloatingDamageContainer
        texts={floatingTexts}
        onTextComplete={handleTextComplete}
      />
    </>
  );
}
