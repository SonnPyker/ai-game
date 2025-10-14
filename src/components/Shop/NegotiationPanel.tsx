import { useState } from 'react';
import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, TrendingUp, TrendingDown, X } from 'lucide-react';
import { Character, NPCRelationship } from '../../types';
import { tradingService } from '../../services/tradingService';

interface NegotiationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  character: Character;
  merchant: NPCRelationship | null;
  basePrice: number;
  type: 'buy' | 'sell';
  onPriceChange: (newPrice: number) => void;
}

interface NegotiationResult {
  success: boolean;
  roll: number;
  total: number;
  dc: number;
  modifier: number;
  priceAdjustment: number;
  finalPrice: number;
  message: string;
}

export function NegotiationPanel({
  isOpen,
  onClose,
  character,
  merchant,
  basePrice,
  type,
  onPriceChange
}: NegotiationPanelProps) {
  const [isRolling, setIsRolling] = useState(false);
  const [result, setResult] = useState<NegotiationResult | null>(null);
  const [diceValue, setDiceValue] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleNegotiate = async () => {
    setIsRolling(true);
    setResult(null);
    setDiceValue(null);

    // Simulate dice rolling animation
    for (let i = 0; i < 10; i++) {
      setDiceValue(Math.floor(Math.random() * 20) + 1);
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Final roll
    const negotiationResult = tradingService.negotiatePrice(character, merchant, basePrice, type);
    setResult(negotiationResult);
    setDiceValue(negotiationResult.roll);
    setIsRolling(false);

    // Apply price change
    onPriceChange(negotiationResult.finalPrice);
  };

  const getDiceIcon = (value: number) => {
    switch (value) {
      case 1: return <Dice1 className="w-8 h-8" />;
      case 2: return <Dice2 className="w-8 h-8" />;
      case 3: return <Dice3 className="w-8 h-8" />;
      case 4: return <Dice4 className="w-8 h-8" />;
      case 5: return <Dice5 className="w-8 h-8" />;
      case 6: return <Dice6 className="w-8 h-8" />;
      default: return <Dice1 className="w-8 h-8" />;
    }
  };

  const getModifierBreakdown = () => {
    if (!result) return null;

    const charismaModifier = character.coreStats?.modifiers?.charisma || 0;
    const relationshipModifier = merchant ? Math.floor(merchant.relationshipLevel / 10) : 0;

    return (
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-300">D20 Roll:</span>
          <span className="text-white font-mono">{result.roll}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-300">Charisma Modifier:</span>
          <span className={`font-mono ${charismaModifier >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {charismaModifier >= 0 ? '+' : ''}{charismaModifier}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-300">Relationship Modifier:</span>
          <span className={`font-mono ${relationshipModifier >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {relationshipModifier >= 0 ? '+' : ''}{relationshipModifier}
          </span>
        </div>
        <div className="flex justify-between border-t border-gray-700 pt-1">
          <span className="text-gray-300 font-medium">Total:</span>
          <span className="text-white font-mono font-bold">{result.total}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-300">DC:</span>
          <span className="text-white font-mono">{result.dc}</span>
        </div>
      </div>
    );
  };

  const getPriceChangeIcon = () => {
    if (!result) return null;
    
    if (result.priceAdjustment > 0) {
      return <TrendingUp className="w-5 h-5 text-green-400" />;
    } else if (result.priceAdjustment < 0) {
      return <TrendingDown className="w-5 h-5 text-red-400" />;
    }
    return null;
  };

  const getPriceChangeColor = () => {
    if (!result) return 'text-gray-400';
    
    if (result.priceAdjustment > 0) {
      return 'text-green-400';
    } else if (result.priceAdjustment < 0) {
      return 'text-red-400';
    }
    return 'text-gray-400';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg border border-gray-700 max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Thương Lượng Giá</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Current Price */}
          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Giá hiện tại:</span>
              <span className="text-yellow-400 font-semibold text-lg">{basePrice} gold</span>
            </div>
          </div>

          {/* Dice Roll Area */}
          <div className="bg-gray-800/50 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center mb-4">
              {diceValue ? (
                <div className="text-6xl text-yellow-400">
                  {getDiceIcon(diceValue)}
                </div>
              ) : (
                <div className="text-6xl text-gray-600">
                  <Dice1 className="w-16 h-16" />
                </div>
              )}
            </div>

            {isRolling && (
              <p className="text-yellow-400 text-sm animate-pulse">Đang tung xúc xắc...</p>
            )}

            {result && (
              <div className="space-y-3">
                <div className="flex items-center justify-center space-x-2">
                  {getPriceChangeIcon()}
                  <span className={`font-semibold ${getPriceChangeColor()}`}>
                    {result.message}
                  </span>
                </div>

                {/* Modifier Breakdown */}
                {getModifierBreakdown()}

                {/* Price Change */}
                <div className="bg-gray-700/50 rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-300">Thay đổi giá:</span>
                    <span className={`font-semibold ${getPriceChangeColor()}`}>
                      {result.priceAdjustment > 0 ? '+' : ''}{result.priceAdjustment}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Giá mới:</span>
                    <span className="text-yellow-400 font-semibold text-lg">
                      {result.finalPrice} gold
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
            >
              Đóng
            </button>
            <button
              onClick={handleNegotiate}
              disabled={isRolling}
              className={`flex-1 py-2 px-4 rounded-md transition-colors ${
                isRolling
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-yellow-600 hover:bg-yellow-700 text-white'
              }`}
            >
              {isRolling ? 'Đang tung...' : 'Thương lượng'}
            </button>
          </div>

          {/* Help Text */}
          <div className="bg-blue-900/30 border border-blue-600/50 rounded-lg p-3">
            <p className="text-blue-200 text-xs">
              <strong>Cách thương lượng:</strong> Tung D20 + Charisma Modifier + (Relationship/10). 
              DC = 15 (có thể giảm nếu relationship tốt). 
              Thành công sẽ giảm giá mua hoặc tăng giá bán.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
