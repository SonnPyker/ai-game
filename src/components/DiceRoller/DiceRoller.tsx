import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, RotateCcw, Zap, Shield, Sword, Target, Plus, Minus } from 'lucide-react';
import { DiceRoller, DiceRoll, DiceRollResult } from '../../utils/diceRoller';
import { MotionWrapper } from '../MotionWrapper';

interface DiceRollerProps {
  isOpen: boolean;
  onClose: () => void;
}

const DiceRollerComponent: React.FC<DiceRollerProps> = ({ isOpen, onClose }) => {
  const [diceNotation] = useState('d20');
  const [modifier, setModifier] = useState(0);
  const [rollHistory, setRollHistory] = useState<(DiceRoll | DiceRollResult)[]>([]);
  const [isRolling, setIsRolling] = useState(false);
  const [customNotation, setCustomNotation] = useState('');

  const availableDice = DiceRoller.getAvailableDice();
  const diceExamples = DiceRoller.getDiceExamples();

  const handleRoll = async () => {
    if (isRolling) return;
    
    setIsRolling(true);
    
    try {
      const notation = customNotation || diceNotation;
      const fullNotation = modifier !== 0 ? `${notation}${modifier >= 0 ? '+' : ''}${modifier}` : notation;
      
      const result = DiceRoller.roll(fullNotation, 'Manual Roll');
      setRollHistory(prev => [result, ...prev.slice(0, 9)]); // Keep last 10 rolls
    } catch (error) {
      console.error('Dice roll error:', error);
      alert(`Lỗi: ${error instanceof Error ? error.message : 'Không thể roll dice'}`);
    } finally {
      setTimeout(() => setIsRolling(false), 500);
    }
  };

  const handleQuickRoll = (notation: string) => {
    if (isRolling) return;
    
    setIsRolling(true);
    
    try {
      const result = DiceRoller.roll(notation, 'Quick Roll');
      setRollHistory(prev => [result, ...prev.slice(0, 9)]);
    } catch (error) {
      console.error('Dice roll error:', error);
      alert(`Lỗi: ${error instanceof Error ? error.message : 'Không thể roll dice'}`);
    } finally {
      setTimeout(() => setIsRolling(false), 500);
    }
  };

  const handleAbilityCheck = (modifier: number) => {
    if (isRolling) return;
    
    setIsRolling(true);
    
    try {
      const result = DiceRoller.abilityCheck(modifier, 'Ability Check');
      setRollHistory(prev => [result, ...prev.slice(0, 9)]);
    } catch (error) {
      console.error('Dice roll error:', error);
      alert(`Lỗi: ${error instanceof Error ? error.message : 'Không thể roll dice'}`);
    } finally {
      setTimeout(() => setIsRolling(false), 500);
    }
  };

  const handleAttack = (attackMod: number, damageNotation: string) => {
    if (isRolling) return;
    
    setIsRolling(true);
    
    try {
      const result = DiceRoller.attack(attackMod, damageNotation, 'Attack');
      setRollHistory(prev => [result, ...prev.slice(0, 9)]);
    } catch (error) {
      console.error('Dice roll error:', error);
      alert(`Lỗi: ${error instanceof Error ? error.message : 'Không thể roll dice'}`);
    } finally {
      setTimeout(() => setIsRolling(false), 500);
    }
  };

  const clearHistory = () => {
    setRollHistory([]);
  };

  const getDiceIcon = (sides: number) => {
    const icons = {
      2: <Dice1 className="w-4 h-4" />,
      3: <Dice2 className="w-4 h-4" />,
      4: <Dice3 className="w-4 h-4" />,
      6: <Dice4 className="w-4 h-4" />,
      8: <Dice5 className="w-4 h-4" />,
      10: <Dice6 className="w-4 h-4" />,
      12: <Dice1 className="w-4 h-4" />,
      20: <Dice2 className="w-4 h-4" />,
      100: <Dice3 className="w-4 h-4" />
    };
    return icons[sides as keyof typeof icons] || <Dice1 className="w-4 h-4" />;
  };

  const formatRollResult = (roll: DiceRoll | DiceRollResult) => {
    if (!roll) return <div className="text-sm text-gray-400">Invalid roll data</div>;
    
    if ('rolls' in roll && Array.isArray(roll.rolls)) {
      // Multiple rolls (like attack)
      return (
        <div className="space-y-1">
          {roll.rolls.map((r, i) => {
            if (typeof r === 'number') {
              return (
                <div key={i} className="text-sm">
                  <span className="font-mono">Roll {i + 1}:</span>
                  <span className="ml-2 font-bold text-blue-400">{r}</span>
                </div>
              );
            }
            return (
              <div key={i} className="text-sm">
                <span className="font-mono">{r.dice || 'Unknown'}:</span>
                <span className="ml-2 font-bold text-blue-400">{r.total || 0}</span>
                {r.rolls && Array.isArray(r.rolls) && r.rolls.length > 1 && (
                  <span className="ml-2 text-gray-400">
                    ({r.rolls.join(', ')}){r.modifier && ` + ${r.modifier}`}
                  </span>
                )}
              </div>
            );
          })}
          <div className="text-lg font-bold text-green-400">
            Total: {roll.total || 0}
          </div>
        </div>
      );
    } else {
      // Single roll
      const singleRoll = roll as DiceRoll;
      return (
        <div className="text-sm">
          <span className="font-mono">{singleRoll.dice || 'Unknown'}:</span>
          <span className="ml-2 font-bold text-blue-400">{singleRoll.total || 0}</span>
          {singleRoll.rolls && Array.isArray(singleRoll.rolls) && singleRoll.rolls.length > 1 && (
            <span className="ml-2 text-gray-400">
              ({singleRoll.rolls.join(', ')}){singleRoll.modifier && ` + ${singleRoll.modifier}`}
            </span>
          )}
        </div>
      );
    }
  };

  if (!isOpen) return null;

  return (
    <MotionWrapper
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <MotionWrapper
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gray-900 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gray-800 px-6 py-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center">
              <Dice1 className="w-6 h-6 mr-2" />
              Dice Roller
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Panel - Controls */}
            <div className="space-y-6">
              {/* Quick Dice Selection */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Quick Dice</h3>
                <div className="grid grid-cols-3 gap-2">
                  {availableDice.map((dice) => (
                    <button
                      key={dice}
                      onClick={() => handleQuickRoll(dice)}
                      disabled={isRolling}
                      className="p-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-white transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                    >
                      {getDiceIcon(parseInt(dice.slice(1)))}
                      <span className="font-mono">{dice}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Roll */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Custom Roll</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Dice Notation</label>
                    <input
                      type="text"
                      value={customNotation}
                      onChange={(e) => setCustomNotation(e.target.value)}
                      placeholder="e.g., 2d6+3, d20, 1d100"
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setModifier(modifier - 1)}
                      className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      value={modifier}
                      onChange={(e) => setModifier(parseInt(e.target.value) || 0)}
                      className="w-20 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-center focus:border-blue-500 focus:outline-none"
                    />
                    <button
                      onClick={() => setModifier(modifier + 1)}
                      className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    onClick={handleRoll}
                    disabled={isRolling}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center justify-center space-x-2"
                  >
                    {isRolling ? (
                      <MotionWrapper
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
                      >
                        <RotateCcw className="w-4 h-4" />
                      </MotionWrapper>
                    ) : (
                      <Dice1 className="w-4 h-4" />
                    )}
                    <span>{isRolling ? 'Rolling...' : 'Roll Dice'}</span>
                  </button>
                </div>
              </div>

              {/* Quick Actions */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Quick Actions</h3>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleAbilityCheck(0)}
                      disabled={isRolling}
                      className="p-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center justify-center space-x-2"
                    >
                      <Target className="w-4 h-4" />
                      <span>d20</span>
                    </button>
                    <button
                      onClick={() => handleAttack(0, '1d8')}
                      disabled={isRolling}
                      className="p-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center justify-center space-x-2"
                    >
                      <Sword className="w-4 h-4" />
                      <span>Attack</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleAbilityCheck(2)}
                      disabled={isRolling}
                      className="p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center justify-center space-x-2"
                    >
                      <Shield className="w-4 h-4" />
                      <span>d20+2</span>
                    </button>
                    <button
                      onClick={() => handleQuickRoll('4d6')}
                      disabled={isRolling}
                      className="p-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center justify-center space-x-2"
                    >
                      <Zap className="w-4 h-4" />
                      <span>4d6</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Examples */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Examples</h3>
                <div className="space-y-1">
                  {diceExamples.map((example, index) => (
                    <button
                      key={index}
                      onClick={() => setCustomNotation(example)}
                      className="w-full text-left p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 hover:text-white transition-colors text-sm font-mono"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Panel - Results */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-white">Roll History</h3>
                <button
                  onClick={clearHistory}
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Clear
                </button>
              </div>
              
              <div className="space-y-2 max-h-96 overflow-y-auto">
                <AnimatePresence>
                  {rollHistory.map((roll, index) => (
                    <MotionWrapper
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="p-3 bg-gray-800 rounded-lg border border-gray-700"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-400">
                          {roll.description || 'Dice Roll'}
                        </span>
                        <span className="text-xs text-gray-500">
                          #{rollHistory.length - index}
                        </span>
                      </div>
                      {formatRollResult(roll)}
                    </MotionWrapper>
                  ))}
                </AnimatePresence>
                
                {rollHistory.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    <Dice1 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No rolls yet. Start rolling some dice!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </MotionWrapper>
    </MotionWrapper>
  );
};

export default DiceRollerComponent;
