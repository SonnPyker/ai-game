import React from 'react';
import { MotionWrapper } from '../MotionWrapper';
import { Clock, User, Sword, ChevronRight, Zap } from 'lucide-react';

interface TurnIndicatorProps {
  turnNumber: number;
  isPlayerTurn: boolean;
  currentCombatantName?: string;
  nextCombatantName?: string;
  isProcessing?: boolean;
  turnOrder?: string[];
  currentCombatantIndex?: number;
}

export const TurnIndicator: React.FC<TurnIndicatorProps> = ({
  turnNumber,
  isPlayerTurn,
  currentCombatantName,
  nextCombatantName,
  isProcessing = false,
  turnOrder = [],
  currentCombatantIndex = 0
}) => {
  // Get next combatant info
  const nextIndex = (currentCombatantIndex + 1) % turnOrder.length;
  const nextCombatantId = turnOrder[nextIndex];
  const isNextPlayerTurn = nextCombatantId === 'player';
  const nextName = nextCombatantName || (isNextPlayerTurn ? 'Player' : `Enemy ${nextCombatantId}`);

  return (
    <MotionWrapper
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center space-x-3 px-3 py-2 bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-600/50"
    >
      {/* Turn Number */}
      <div className="flex items-center space-x-1">
        <Clock className="w-4 h-4 text-blue-400" />
        <span className="text-sm font-bold text-blue-400">
          Turn {turnNumber}
        </span>
      </div>

      {/* Separator */}
      <div className="w-px h-4 bg-gray-600"></div>

      {/* Current Turn - Compact */}
      <div className="flex items-center space-x-1 px-2 py-1 bg-gray-700/50 rounded border border-gray-500/50">
        {isPlayerTurn ? (
          <User className="w-4 h-4 text-green-400" />
        ) : (
          <Sword className="w-4 h-4 text-red-400" />
        )}
        <span className={`text-sm font-bold ${isPlayerTurn ? 'text-green-400' : 'text-red-400'}`}>
          {isPlayerTurn ? 'Bạn' : (currentCombatantName || 'Kẻ thù')}
        </span>
        <Zap className="w-3 h-3 text-yellow-400 animate-pulse" />
      </div>

      {/* Next Turn Indicator - Only if multiple combatants */}
      {turnOrder.length > 1 && (
        <>
          <ChevronRight className="w-3 h-3 text-gray-400" />
          <div className="flex items-center space-x-1 px-1 py-1 bg-gray-600/30 rounded text-xs">
            <span className="text-gray-400">Tiếp:</span>
            <span className={`font-medium ${isNextPlayerTurn ? 'text-green-300' : 'text-red-300'}`}>
              {isNextPlayerTurn ? 'Bạn' : nextName}
            </span>
          </div>
        </>
      )}

      {/* Processing Indicator */}
      {isProcessing && (
        <>
          <div className="w-px h-4 bg-gray-600"></div>
          <div className="flex items-center space-x-1">
            <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse"></div>
            <span className="text-xs text-yellow-400">
              Đang xử lý...
            </span>
          </div>
        </>
      )}
    </MotionWrapper>
  );
};
