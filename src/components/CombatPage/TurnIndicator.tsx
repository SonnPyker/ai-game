import React from 'react';
import { MotionWrapper } from '../MotionWrapper';
import { Clock, User, Sword } from 'lucide-react';

interface TurnIndicatorProps {
  turnNumber: number;
  isPlayerTurn: boolean;
  currentCombatantName?: string;
  isProcessing?: boolean;
}

export const TurnIndicator: React.FC<TurnIndicatorProps> = ({
  turnNumber,
  isPlayerTurn,
  currentCombatantName,
  isProcessing = false
}) => {
  return (
    <MotionWrapper
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center space-x-3 px-4 py-2 bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-600/50"
    >
      {/* Turn Number */}
      <div className="flex items-center space-x-2">
        <Clock className="w-4 h-4 text-blue-400" />
        <span className="text-sm font-medium text-gray-300">
          Turn {turnNumber}
        </span>
      </div>

      {/* Separator */}
      <div className="w-px h-4 bg-gray-600"></div>

      {/* Current Turn Info */}
      <div className="flex items-center space-x-2">
        {isPlayerTurn ? (
          <>
            <User className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium text-green-400">
              Your Turn
            </span>
          </>
        ) : (
          <>
            <Sword className="w-4 h-4 text-red-400" />
            <span className="text-sm font-medium text-red-400">
              {currentCombatantName || 'Enemy Turn'}
            </span>
          </>
        )}
      </div>

      {/* Processing Indicator */}
      {isProcessing && (
        <>
          <div className="w-px h-4 bg-gray-600"></div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
            <span className="text-xs text-yellow-400">
              Processing...
            </span>
          </div>
        </>
      )}
    </MotionWrapper>
  );
};
