import { useState, useEffect } from 'react';
import { MotionWrapper } from '../MotionWrapper';
import { Sword, Shield, Zap, Skull, Target } from 'lucide-react';

interface CombatDialogueBubbleProps {
  combatantName: string;
  combatantType: 'player' | 'enemy' | 'npc';
  message: string;
  messageType: 'description' | 'attack_roll' | 'damage_roll' | 'status' | 'death';
  isVisible: boolean;
  onComplete?: () => void;
  autoHideDelay?: number;
}

export function CombatDialogueBubble({
  combatantName,
  combatantType,
  message,
  messageType,
  isVisible,
  onComplete,
  autoHideDelay = 3000
}: CombatDialogueBubbleProps) {
  const [isShowing, setIsShowing] = useState(false);
  const [isHiding, setIsHiding] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsShowing(true);
      setIsHiding(false);
      
      // Auto hide after delay
      const timer = setTimeout(() => {
        setIsHiding(true);
        setTimeout(() => {
          setIsShowing(false);
          onComplete?.();
        }, 500); // Fade out duration
      }, autoHideDelay);

      return () => clearTimeout(timer);
    } else {
      setIsShowing(false);
      setIsHiding(false);
    }
  }, [isVisible, autoHideDelay, onComplete]);

  const getIcon = () => {
    switch (messageType) {
      case 'description':
        return <Sword className="w-5 h-5" />;
      case 'attack_roll':
        return <Target className="w-5 h-5" />;
      case 'damage_roll':
        return <Zap className="w-5 h-5" />;
      case 'status':
        return <Shield className="w-5 h-5" />;
      case 'death':
        return <Skull className="w-5 h-5" />;
      default:
        return <Sword className="w-5 h-5" />;
    }
  };

  const getIconColor = () => {
    switch (messageType) {
      case 'description':
        return 'text-blue-400';
      case 'attack_roll':
        return 'text-yellow-400';
      case 'damage_roll':
        return 'text-red-400';
      case 'status':
        return 'text-green-400';
      case 'death':
        return 'text-gray-400';
      default:
        return 'text-blue-400';
    }
  };

  const getBubbleColor = () => {
    switch (combatantType) {
      case 'player':
        return 'bg-blue-800 border-blue-600 text-blue-100';
      case 'enemy':
        return 'bg-red-800 border-red-600 text-red-100';
      case 'npc':
        return 'bg-purple-800 border-purple-600 text-purple-100';
      default:
        return 'bg-gray-800 border-gray-600 text-gray-100';
    }
  };

  const getBubblePosition = () => {
    switch (combatantType) {
      case 'player':
        return 'bottom-4 left-4';
      case 'enemy':
        return 'top-4 right-4';
      case 'npc':
        return 'top-4 left-4';
      default:
        return 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2';
    }
  };

  if (!isShowing) return null;

  return (
    <div className={`fixed ${getBubblePosition()} z-50 max-w-sm`}>
      <MotionWrapper
        initial={{ opacity: 0, scale: 0.8, y: combatantType === 'player' ? 20 : -20 }}
        animate={{ 
          opacity: isHiding ? 0 : 1, 
          scale: isHiding ? 0.8 : 1,
          y: isHiding ? (combatantType === 'player' ? 20 : -20) : 0
        }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className={`${getBubbleColor()} border-2 rounded-2xl p-4 shadow-2xl backdrop-blur-sm`}
      >
        {/* Header */}
        <div className="flex items-center space-x-2 mb-2">
          <div className={`${getIconColor()}`}>
            {getIcon()}
          </div>
          <span className="font-semibold text-sm">
            {combatantName}
          </span>
          <span className="text-xs opacity-75">
            {messageType === 'description' && 'Hành động'}
            {messageType === 'attack_roll' && 'Tấn công'}
            {messageType === 'damage_roll' && 'Sát thương'}
            {messageType === 'status' && 'Trạng thái'}
            {messageType === 'death' && 'Tử vong'}
          </span>
        </div>

        {/* Message */}
        <div className="text-sm leading-relaxed">
          {message}
        </div>

        {/* Progress bar */}
        <div className="mt-3 w-full bg-black/20 rounded-full h-1">
          <div 
            className="bg-white/60 h-1 rounded-full transition-all duration-100 ease-linear"
            style={{
              width: isHiding ? '0%' : '100%',
              animation: isShowing && !isHiding ? `shrink ${autoHideDelay}ms linear forwards` : 'none'
            }}
          />
        </div>
      </MotionWrapper>

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}

interface CombatDialogueSequenceProps {
  combatantName: string;
  combatantType: 'player' | 'enemy' | 'npc';
  sequence: Array<{
    message: string;
    messageType: 'description' | 'attack_roll' | 'damage_roll' | 'status' | 'death';
    delay?: number;
  }>;
  onComplete?: () => void;
}

export function CombatDialogueSequence({
  combatantName,
  combatantType,
  sequence,
  onComplete
}: CombatDialogueSequenceProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (sequence.length > 0) {
      setIsActive(true);
      setCurrentIndex(0);
    }
  }, [sequence]);

  const handleMessageComplete = () => {
    if (currentIndex < sequence.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setIsActive(false);
      onComplete?.();
    }
  };

  if (!isActive || currentIndex >= sequence.length) return null;

  const currentMessage = sequence[currentIndex];
  const delay = currentMessage.delay || 3000;

  return (
    <CombatDialogueBubble
      combatantName={combatantName}
      combatantType={combatantType}
      message={currentMessage.message}
      messageType={currentMessage.messageType}
      isVisible={isActive}
      onComplete={handleMessageComplete}
      autoHideDelay={delay}
    />
  );
}
