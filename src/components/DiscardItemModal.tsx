import { useState, useEffect } from 'react';
import { Trash2, AlertTriangle, Minus, Plus } from 'lucide-react';
import { InventoryItem } from '../types';
import { useModalMinimize } from '../hooks/useModalMinimize';
import { MinimizedModal } from './MinimizedModal';
import { ModalHeader } from './ModalHeader';
import { MotionWrapper } from './MotionWrapper';

interface DiscardItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  onDiscard: (quantity: number) => void;
}

export function DiscardItemModal({
  isOpen,
  onClose,
  item,
  onDiscard
}: DiscardItemModalProps) {
  const { isMinimized, minimize, restore } = useModalMinimize('discard-item-modal');
  const [discardQuantity, setDiscardQuantity] = useState(1);

  // Reset quantity when modal opens or item changes
  useEffect(() => {
    if (isOpen && item) {
      setDiscardQuantity(1);
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  // Show minimized modal if minimized
  if (isMinimized) {
    return (
      <MinimizedModal
        title="Vứt bỏ vật phẩm"
        subtitle={`${item.name} (${discardQuantity}/${item.quantity || 1})`}
        icon={<Trash2 className="w-5 h-5 text-red-400" />}
        onRestore={restore}
      />
    );
  }

  const isEquipped = item.isEquipped;
  const maxQuantity = item.quantity || 1;
  const hasMultipleQuantity = maxQuantity > 1;

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
        className="bg-gray-900 border border-gray-700 rounded-lg max-w-md w-full shadow-2xl"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {/* Header */}
        <ModalHeader
          title="Vứt bỏ vật phẩm"
          icon={<Trash2 className="w-6 h-6 text-red-400" />}
          onClose={onClose}
          onMinimize={minimize}
        />

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Item Info */}
          <div className="flex items-start space-x-4">
            <div className="text-3xl flex-shrink-0">{item.icon || '📦'}</div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xl font-bold text-white mb-2">{item.name}</h4>
              <div className="flex items-center space-x-2 mb-3">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  item.rarity === 'common' ? 'bg-gray-600 text-gray-200' :
                  item.rarity === 'uncommon' ? 'bg-green-600 text-green-200' :
                  item.rarity === 'rare' ? 'bg-blue-600 text-blue-200' :
                  item.rarity === 'epic' ? 'bg-purple-600 text-purple-200' :
                  'bg-yellow-600 text-yellow-200'
                }`}>
                  {item.rarity}
                </span>
                <span className="px-3 py-1 bg-gray-700 rounded-full text-xs font-semibold">
                  {item.type}
                </span>
                {isEquipped && (
                  <span className="px-3 py-1 bg-yellow-600 text-yellow-200 rounded-full text-xs font-semibold">
                    ✩ Đã trang bị
                  </span>
                )}
              </div>
              {item.description && (
                <p className="text-gray-300 text-sm leading-relaxed">
                  {item.description}
                </p>
              )}
            </div>
          </div>

          {/* Quantity Selection */}
          {hasMultipleQuantity && (
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  <span className="text-yellow-400 font-semibold">
                    Chọn số lượng vứt bỏ
                  </span>
                </div>
                <span className="text-gray-400 text-sm">
                  Có {maxQuantity} cái
                </span>
              </div>
              
              {/* Quantity Slider */}
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setDiscardQuantity(Math.max(1, discardQuantity - 1))}
                    disabled={discardQuantity <= 1}
                    className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Minus className="w-4 h-4 text-white" />
                  </button>
                  
                  <div className="flex-1">
                    <input
                      type="range"
                      min="1"
                      max={maxQuantity}
                      value={discardQuantity}
                      onChange={(e) => setDiscardQuantity(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                      style={{
                        background: `linear-gradient(to right, #ef4444 0%, #ef4444 ${(discardQuantity / maxQuantity) * 100}%, #374151 ${(discardQuantity / maxQuantity) * 100}%, #374151 100%)`
                      }}
                    />
                  </div>
                  
                  <button
                    onClick={() => setDiscardQuantity(Math.min(maxQuantity, discardQuantity + 1))}
                    disabled={discardQuantity >= maxQuantity}
                    className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus className="w-4 h-4 text-white" />
                  </button>
                </div>
                
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-2xl font-bold text-white">{discardQuantity}</span>
                  <span className="text-gray-400">/ {maxQuantity}</span>
                </div>
              </div>
            </div>
          )}

          {/* Warning for equipped items */}
          {isEquipped && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
              <div className="flex items-center space-x-3 text-yellow-300">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">
                  Vật phẩm đang được trang bị. Vứt bỏ sẽ tự động gỡ trang bị.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="px-6 pb-6 space-y-3">
          {/* Discard Button */}
          <button
            onClick={() => {
              onDiscard(discardQuantity);
              onClose();
            }}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center space-x-3 shadow-lg hover:shadow-red-500/25"
          >
            <Trash2 className="w-5 h-5" />
            <span>
              {hasMultipleQuantity 
                ? `Vứt bỏ ${discardQuantity} cái` 
                : 'Vứt bỏ vật phẩm'
              }
            </span>
          </button>

          {/* Quick Actions for Multiple Quantity */}
          {hasMultipleQuantity && (
            <div className="flex space-x-2">
              <button
                onClick={() => setDiscardQuantity(1)}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  discardQuantity === 1 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                1 cái
              </button>
              <button
                onClick={() => setDiscardQuantity(Math.floor(maxQuantity / 2))}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  discardQuantity === Math.floor(maxQuantity / 2)
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Một nửa
              </button>
              <button
                onClick={() => setDiscardQuantity(maxQuantity)}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  discardQuantity === maxQuantity
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Tất cả
              </button>
            </div>
          )}

          {/* Cancel Button */}
          <button
            onClick={onClose}
            className="w-full bg-gray-600 hover:bg-gray-500 text-white font-medium py-3 px-6 rounded-xl transition-colors"
          >
            Hủy bỏ
          </button>
        </div>
      </MotionWrapper>
    </MotionWrapper>
  );
}

// CSS for custom slider
const sliderStyles = `
  .slider::-webkit-slider-thumb {
    appearance: none;
    height: 20px;
    width: 20px;
    border-radius: 50%;
    background: #ef4444;
    cursor: pointer;
    border: 2px solid #ffffff;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
  
  .slider::-moz-range-thumb {
    height: 20px;
    width: 20px;
    border-radius: 50%;
    background: #ef4444;
    cursor: pointer;
    border: 2px solid #ffffff;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = sliderStyles;
  document.head.appendChild(styleSheet);
}
