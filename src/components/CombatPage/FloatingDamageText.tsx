import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CombatDamageTextData, 
  CombatAnimationType 
} from '../../types/combat';

interface FloatingDamageTextProps {
  text: CombatDamageTextData;
  onComplete: (id: string) => void;
}

const FloatingDamageText: React.FC<FloatingDamageTextProps> = ({ text, onComplete }) => {
  // Get CSS class based on damage type
  const getDamageClass = (type: CombatAnimationType) => {
    switch (type) {
      case CombatAnimationType.DAMAGE:
        return 'combat-damage-text text-red-400 font-bold text-lg';
      case CombatAnimationType.HEAL:
        return 'combat-heal-text text-green-400 font-bold text-lg';
      case CombatAnimationType.MISS:
        return 'combat-miss-text text-gray-400 font-medium text-base';
      case CombatAnimationType.CRITICAL:
        return 'combat-critical-text text-yellow-400 font-black text-xl';
      default:
        return 'combat-damage-text text-red-400 font-bold text-lg';
    }
  };

  // Get display text based on type
  const getDisplayText = (type: CombatAnimationType, value: number) => {
    switch (type) {
      case CombatAnimationType.DAMAGE:
        return `-${value}`;
      case CombatAnimationType.HEAL:
        return `+${value}`;
      case CombatAnimationType.MISS:
        return 'MISS';
      case CombatAnimationType.CRITICAL:
        return `CRIT! -${value}`;
      default:
        return `-${value}`;
    }
  };

  // Get animation variants
  const getAnimationVariants = (type: CombatAnimationType) => {
    const baseVariants = {
      initial: { 
        opacity: 0, 
        scale: 0.8,
        y: 0 
      },
      animate: { 
        opacity: 1, 
        scale: 1,
        y: -80,
        transition: {
          duration: 1.2,
          ease: "easeOut"
        }
      },
      exit: { 
        opacity: 0, 
        scale: 0.8,
        y: -100,
        transition: {
          duration: 0.3
        }
      }
    };

    // Special variants for critical hits
    if (type === CombatAnimationType.CRITICAL) {
      return {
        ...baseVariants,
        animate: {
          ...baseVariants.animate,
          scale: [0.5, 1.2, 1],
          transition: {
            duration: 1.5,
            ease: "easeOut",
            times: [0, 0.2, 1]
          }
        }
      };
    }

    return baseVariants;
  };

  const animationVariants = getAnimationVariants(text.type);
  const textColorClass = text.type === CombatAnimationType.DAMAGE ? 'text-red-400' : 
                        text.type === CombatAnimationType.HEAL ? 'text-green-400' :
                        text.type === CombatAnimationType.MISS ? 'text-gray-400' : 'text-yellow-400';
  
  const textSizeClass = text.type === CombatAnimationType.CRITICAL ? 'text-xl' : 'text-lg';
  const textClass = getDamageClass(text.type);
  const displayValue = getDisplayText(text.type, text.value);

  return (
    <motion.div
      key={text.id}
      data-combatant-id={text.combatantId}
      data-floating-text-id={text.id}
      initial={animationVariants.initial}
      animate={animationVariants.animate}
      exit={animationVariants.exit}
      transition={animationVariants.animate.transition}
      onAnimationComplete={() => onComplete(text.id)}
      className={`
        fixed pointer-events-none whitespace-nowrap font-bold text-shadow-outline z-[1000]
        ${textColorClass} ${textSizeClass} ${textClass}
      `}
      style={{
        left: text.position.x,
        top: text.position.y,
        transform: 'translate(-50%, -50%)'
      }}
    >
      {displayValue}
    </motion.div>
  );
};

// Container component to manage multiple floating damage texts
interface FloatingDamageContainerProps {
  texts: CombatDamageTextData[];
  onTextComplete: (id: string) => void;
}

export const FloatingDamageContainer: React.FC<FloatingDamageContainerProps> = ({ texts, onTextComplete }) => {
  const portalRoot = document.getElementById('floating-damage-root');
  if (!portalRoot) return null;

  return createPortal(
    <div className="fixed inset-0 pointer-events-none z-[999]">
      <AnimatePresence>
        {texts.map((text) => (
          <FloatingDamageText key={text.id} text={text} onComplete={onTextComplete} />
        ))}
      </AnimatePresence>
    </div>,
    portalRoot
  );
};
