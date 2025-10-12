import { useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { CombatLogEntry } from '../../services/combatService';
import { TurnLog } from '../../types/combat';
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
  Target,
  User,
  Bot,
  ChevronDown
} from 'lucide-react';

interface CombatLogProps {
  log: CombatLogEntry[];
  turnLogs?: TurnLog[];
  isPlayerTurn?: boolean;
  isInMenu?: boolean;
}

export function CombatLog({ log, turnLogs = [], isPlayerTurn = false, isInMenu = false }: CombatLogProps) {
  const logEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  // Auto-scroll to bottom when new entries are added, but only if user is near bottom
  useEffect(() => {
    if (shouldAutoScroll && !isUserScrolling) {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [log, turnLogs, shouldAutoScroll, isUserScrolling]);

  // Handle scroll to show/hide scroll button and manage auto-scroll behavior
  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      
      setShowScrollButton(!isNearBottom);
      
      // If user scrolls away from bottom, disable auto-scroll
      if (!isNearBottom) {
        setShouldAutoScroll(false);
        setIsUserScrolling(true);
      } else {
        // If user scrolls back to bottom, re-enable auto-scroll
        setShouldAutoScroll(true);
        setIsUserScrolling(false);
      }
    }
  };

  // Scroll to bottom function
  const scrollToBottom = () => {
    setShouldAutoScroll(true);
    setIsUserScrolling(false);
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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
      case 'info':
        return <Target className="w-4 h-4 text-blue-400" />;
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
      case 'info':
        return 'text-blue-300';
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
    <div className={`${isInMenu ? 'h-full flex flex-col min-h-0' : 'h-full bg-gray-900/50 border-t border-gray-700 flex flex-col min-h-0'}`}>
      {/* Header - only show if not in menu */}
      {!isInMenu && (
        <div className="bg-gray-800/50 px-4 py-2 border-b border-gray-700 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <Target className="w-5 h-5 mr-2" />
              Nhật Ký Combat
            </h3>
            <div className="text-sm text-gray-400">
              {turnLogs.length > 0 ? turnLogs.length : log.length} sự kiện
            </div>
          </div>
        </div>
      )}

      {/* Log Entries */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className={`${isInMenu ? 'flex-1 min-h-0' : 'flex-1 min-h-0'} overflow-y-auto p-2 sm:p-4 space-y-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 relative overscroll-contain`}
      >
        {turnLogs.length === 0 && log.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <Target className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Chưa có sự kiện nào</p>
          </div>
        ) : (
          <AnimatePresence>
            {/* Render turn-based logs if available, otherwise fallback to individual logs */}
            {turnLogs.length > 0 ? (
              turnLogs.map((turnLog, index) => (
                <MotionWrapper
                  key={`turn-${turnLog.turn}-${turnLog.combatantId}`}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="mb-4"
                >
                  {/* Turn Header */}
                  <div className={`
                    flex items-center space-x-2 mb-2 px-3 py-2 rounded-lg
                    ${turnLog.isPlayerTurn 
                      ? 'bg-blue-900/20 border border-blue-500/30' 
                      : 'bg-red-900/20 border border-red-500/30'
                    }
                  `}>
                    {turnLog.isPlayerTurn ? (
                      <User className="w-4 h-4 text-blue-400" />
                    ) : (
                      <Bot className="w-4 h-4 text-red-400" />
                    )}
                    <span className="font-semibold text-white">
                      Turn {turnLog.turn} - {turnLog.combatantName}
                    </span>
                    <div className="text-xs text-gray-400 ml-auto">
                      {formatTime(turnLog.timestamp)}
                    </div>
                  </div>

                  {/* Turn Description */}
                  <div className="bg-gray-800/40 rounded-lg p-3 mb-2 border-l-4 border-l-yellow-400">
                    <div className="flex items-start space-x-2">
                      <Target className="w-4 h-4 text-yellow-400 mt-0.5" />
                      <p className="text-sm text-yellow-200 italic">
                        {turnLog.description}
                      </p>
                    </div>
                  </div>

                  {/* Individual Actions */}
                  {turnLog.actions.map((action, actionIndex) => (
                    <MotionWrapper
                      key={action.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: actionIndex * 0.05 }}
                      className={`
                        bg-gray-800/30 rounded-lg p-2 ml-4 border-l-4
                        ${action.type === 'victory' ? 'border-l-yellow-400 bg-yellow-900/10' : ''}
                        ${action.type === 'defeat' ? 'border-l-red-400 bg-red-900/10' : ''}
                        ${action.type === 'death' ? 'border-l-red-500 bg-red-900/10' : ''}
                        ${action.type === 'damage' ? 'border-l-red-400' : ''}
                        ${action.type === 'heal' ? 'border-l-green-400' : ''}
                        ${action.type === 'attack' ? 'border-l-orange-400' : ''}
                        ${action.type === 'initiative' ? 'border-l-blue-400' : ''}
                        ${action.type === 'status' ? 'border-l-purple-400' : ''}
                      `}
                    >
                      <div className="flex items-center space-x-2">
                        <div className="flex-shrink-0">
                          {getLogIcon(action.type)}
                        </div>
                        <p className={`text-xs ${getLogColor(action.type)}`}>
                          {action.message}
                        </p>
                        {formatDiceDetails(action.details)}
                      </div>
                    </MotionWrapper>
                  ))}
                </MotionWrapper>
              ))
            ) : (
              // Fallback to individual logs
              log.map((entry, index) => (
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
              ))
            )}
          </AnimatePresence>
        )}
        
        {/* Scroll anchor */}
        <div ref={logEndRef} />
        
        {/* Scroll to bottom button */}
        {showScrollButton && (
          <MotionWrapper
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed bottom-4 right-4 z-10"
          >
            <button
              onClick={scrollToBottom}
              className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full shadow-lg transition-colors duration-200"
              title="Scroll xuống cuối"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </MotionWrapper>
        )}
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
