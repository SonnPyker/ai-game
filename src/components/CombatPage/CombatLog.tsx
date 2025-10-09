import { useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { CombatLogEntry } from '../../services/combatService';
import { MotionWrapper } from '../MotionWrapper';
import { 
  Sword, 
  Heart, 
  Shield, 
  Zap, 
  Skull, 
  Trophy, 
  X,
  Dice1,
  Target
} from 'lucide-react';

interface CombatLogProps {
  log: CombatLogEntry[];
  isPlayerTurn?: boolean;
  isInMenu?: boolean;
}

export function CombatLog({ log, isPlayerTurn = false, isInMenu = false }: CombatLogProps) {
  const logEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new entries are added
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log]);

  // Get icon for log entry type
  const getLogIcon = (type: CombatLogEntry['type']) => {
    switch (type) {
      case 'initiative':
        return <Dice1 className="w-4 h-4 text-blue-400" />;
      case 'attack':
        return <Sword className="w-4 h-4 text-orange-400" />;
      case 'damage':
        return <Heart className="w-4 h-4 text-red-400" />;
      case 'heal':
        return <Heart className="w-4 h-4 text-green-400" />;
      case 'status':
        return <Shield className="w-4 h-4 text-purple-400" />;
      case 'death':
        return <Skull className="w-4 h-4 text-red-500" />;
      case 'victory':
        return <Trophy className="w-4 h-4 text-yellow-400" />;
      case 'defeat':
        return <X className="w-4 h-4 text-red-500" />;
      default:
        return <Target className="w-4 h-4 text-gray-400" />;
    }
  };

  // Get color for log entry type
  const getLogColor = (type: CombatLogEntry['type']) => {
    switch (type) {
      case 'initiative':
        return 'text-blue-300';
      case 'attack':
        return 'text-orange-300';
      case 'damage':
        return 'text-red-300';
      case 'heal':
        return 'text-green-300';
      case 'status':
        return 'text-purple-300';
      case 'death':
        return 'text-red-400';
      case 'victory':
        return 'text-yellow-300';
      case 'defeat':
        return 'text-red-400';
      default:
        return 'text-gray-300';
    }
  };

  // Format timestamp
  const formatTime = (timestamp: Date) => {
    return new Date(timestamp).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Format dice roll details
  const formatDiceDetails = (details: any) => {
    if (!details) return null;
    
    if (details.rolls) {
      return (
        <div className="text-xs text-gray-400 mt-1">
          Rolls: {details.rolls.join(', ')}
          {details.modifier && ` + ${details.modifier}`}
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className={`${isInMenu ? 'h-full' : 'h-full bg-gray-900/50 border-t border-gray-700'}`}>
      {/* Header - only show if not in menu */}
      {!isInMenu && (
        <div className="bg-gray-800/50 px-4 py-2 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <Target className="w-5 h-5 mr-2" />
              Nhật Ký Combat
            </h3>
            <div className="text-sm text-gray-400">
              {log.length} sự kiện
            </div>
          </div>
        </div>
      )}

      {/* Log Entries */}
      <div className={`${isInMenu ? 'h-full' : 'h-[calc(100%-60px)]'} overflow-y-auto p-4 space-y-2`}>
        {log.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <Target className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Chưa có sự kiện nào</p>
          </div>
        ) : (
          <AnimatePresence>
            {log.map((entry, index) => (
              <MotionWrapper
                key={entry.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className={`
                  bg-gray-800/30 rounded-lg p-3 border-l-4
                  ${entry.type === 'victory' ? 'border-l-yellow-400 bg-yellow-900/10' : ''}
                  ${entry.type === 'defeat' ? 'border-l-red-400 bg-red-900/10' : ''}
                  ${entry.type === 'death' ? 'border-l-red-500 bg-red-900/10' : ''}
                  ${entry.type === 'damage' ? 'border-l-red-400' : ''}
                  ${entry.type === 'heal' ? 'border-l-green-400' : ''}
                  ${entry.type === 'attack' ? 'border-l-orange-400' : ''}
                  ${entry.type === 'initiative' ? 'border-l-blue-400' : ''}
                  ${entry.type === 'status' ? 'border-l-purple-400' : ''}
                `}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getLogIcon(entry.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-medium ${getLogColor(entry.type)}`}>
                        {entry.message}
                      </p>
                      <div className="text-xs text-gray-500 ml-2">
                        T{entry.turn}
                      </div>
                    </div>
                    
                    {formatDiceDetails(entry.details)}
                    
                    <div className="text-xs text-gray-500 mt-1">
                      {formatTime(entry.timestamp)}
                    </div>
                  </div>
                </div>
              </MotionWrapper>
            ))}
          </AnimatePresence>
        )}
        
        {/* Scroll anchor */}
        <div ref={logEndRef} />
      </div>

      {/* Turn Indicator - only show if not in menu */}
      {isPlayerTurn && !isInMenu && (
        <MotionWrapper
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-4 right-4 bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg"
        >
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4" />
            <span className="text-sm font-medium">Lượt của bạn</span>
          </div>
        </MotionWrapper>
      )}
    </div>
  );
}
