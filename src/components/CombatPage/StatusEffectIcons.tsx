import { useState } from 'react';
import { StatusEffect } from '../../services/combatService';
import { MotionWrapper } from '../MotionWrapper';

interface StatusEffectIconsProps {
  statusEffects: StatusEffect[];
  className?: string;
}

export function StatusEffectIcons({ statusEffects, className = '' }: StatusEffectIconsProps) {
  const [hoveredEffect, setHoveredEffect] = useState<string | null>(null);

  if (!statusEffects || statusEffects.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {statusEffects.map((effect) => (
        <div
          key={effect.id}
          className="relative group"
          onMouseEnter={() => setHoveredEffect(effect.id)}
          onMouseLeave={() => setHoveredEffect(null)}
        >
          {/* Effect Icon */}
          <MotionWrapper
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="relative"
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg border transition-all duration-200 cursor-help ${
              effect.name === 'Phòng Thủ' 
                ? 'bg-blue-700/80 border-blue-500 hover:border-blue-400' 
                : 'bg-gray-700/80 border-gray-600 hover:border-gray-400'
            }`}>
              {effect.icon}
            </div>
            
            {/* Duration Badge */}
            {effect.duration > 0 && (
              <div className={`absolute -top-1 -right-1 w-4 h-4 text-white text-xs rounded-full flex items-center justify-center font-bold border ${
                effect.name === 'Phòng Thủ' 
                  ? 'bg-blue-600 border-blue-500' 
                  : 'bg-red-600 border-red-500'
              }`}>
                {effect.duration}
              </div>
            )}
          </MotionWrapper>

          {/* Tooltip */}
          {hoveredEffect === effect.id && (
            <MotionWrapper
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50"
            >
              <div className="bg-gray-900 text-white text-sm rounded-lg px-3 py-2 shadow-lg border border-gray-700 min-w-max max-w-xs">
                <div className={`font-medium mb-1 ${
                  effect.name === 'Phòng Thủ' ? 'text-blue-100' : 'text-gray-100'
                }`}>
                  {effect.name}
                </div>
                <div className="text-gray-300 text-xs mb-2">{effect.description}</div>
                
                {/* Effect Details */}
                <div className="space-y-1">
                  {effect.effects.healthModifier && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">HP:</span>
                      <span className={effect.effects.healthModifier > 0 ? 'text-green-400' : 'text-red-400'}>
                        {effect.effects.healthModifier > 0 ? '+' : ''}{effect.effects.healthModifier}
                      </span>
                    </div>
                  )}
                  
                  {effect.effects.armorClassModifier && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">AC:</span>
                      <span className={effect.effects.armorClassModifier > 0 ? 'text-green-400' : 'text-red-400'}>
                        {effect.effects.armorClassModifier > 0 ? '+' : ''}{effect.effects.armorClassModifier}
                      </span>
                    </div>
                  )}
                  
                  {effect.effects.damageModifier && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Damage:</span>
                      <span className="text-green-400">
                        +{effect.effects.damageModifier}
                      </span>
                    </div>
                  )}
                  
                  {effect.effects.statModifiers && Object.entries(effect.effects.statModifiers).map(([stat, value]) => (
                    <div key={stat} className="flex justify-between text-xs">
                      <span className="text-gray-400 capitalize">{stat}:</span>
                      <span className={value > 0 ? 'text-green-400' : 'text-red-400'}>
                        {value > 0 ? '+' : ''}{value}
                      </span>
                    </div>
                  ))}
                  
                  {effect.name === 'Phòng Thủ' && (
                    <div className="flex justify-between text-xs border-t border-gray-700 pt-1 mt-1">
                      <span className="text-gray-400">Effect:</span>
                      <span className="text-blue-400">-50% damage taken</span>
                    </div>
                  )}
                  
                  {effect.duration > 0 && (
                    <div className="flex justify-between text-xs border-t border-gray-700 pt-1 mt-1">
                      <span className="text-gray-400">Duration:</span>
                      <span className="text-yellow-400">{effect.duration} turns</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Tooltip Arrow */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
            </MotionWrapper>
          )}
        </div>
      ))}
    </div>
  );
}

// Helper component for individual status effect with animation
export function StatusEffectIcon({ 
  effect, 
  onRemove 
}: { 
  effect: StatusEffect; 
  onRemove?: (effectId: string) => void;
}) {
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemove = () => {
    if (onRemove) {
      setIsRemoving(true);
      setTimeout(() => onRemove(effect.id), 300);
    }
  };

  return (
    <MotionWrapper
      initial={{ scale: 0, opacity: 0 }}
      animate={{ 
        scale: isRemoving ? 0 : 1, 
        opacity: isRemoving ? 0 : 1 
      }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="relative group"
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg border transition-all duration-200 cursor-help ${
        effect.name === 'Phòng Thủ' 
          ? 'bg-blue-700/80 border-blue-500 hover:border-blue-400' 
          : 'bg-gray-700/80 border-gray-600 hover:border-gray-400'
      }`}>
        {effect.icon}
      </div>
      
      {/* Duration Badge */}
      {effect.duration > 0 && (
        <div className={`absolute -top-1 -right-1 w-4 h-4 text-white text-xs rounded-full flex items-center justify-center font-bold border ${
          effect.name === 'Phòng Thủ' 
            ? 'bg-blue-600 border-blue-500' 
            : 'bg-red-600 border-red-500'
        }`}>
          {effect.duration}
        </div>
      )}
      
      {/* Remove Button (if onRemove provided) */}
      {onRemove && (
        <button
          onClick={handleRemove}
          className="absolute -top-1 -left-1 w-4 h-4 bg-red-600 hover:bg-red-700 text-white text-xs rounded-full flex items-center justify-center font-bold border border-red-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          title="Remove effect"
        >
          ×
        </button>
      )}
    </MotionWrapper>
  );
}
