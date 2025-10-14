import { useState, useEffect } from 'react';
import { InventoryItem } from '../../types';
import { 
  Package, 
  Sword, 
  Shield, 
  Beaker,
  Check,
  XCircle
} from 'lucide-react';
import { ModalHeader } from '../ModalHeader';
import { useModalMinimize } from '../../hooks/useModalMinimize';

interface ItemSelectionModalProps {
  isOpen: boolean;
  items: InventoryItem[];
  onClose: () => void;
  onSelectItems: (selectedItems: InventoryItem[]) => void;
  title?: string;
  description?: string;
}

export function ItemSelectionModal({
  isOpen,
  items,
  onClose,
  onSelectItems,
  title = "Phát hiện vật phẩm",
  description = "Bạn đã tìm thấy một số vật phẩm. Hãy chọn những gì bạn muốn lấy:"
}: ItemSelectionModalProps) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const { isMinimized, minimize } = useModalMinimize({
    modalId: 'item-selection-modal',
    title: title,
    subtitle: `${items.length} vật phẩm`,
    icon: <Package className="w-5 h-5 text-green-400" />
  });

  // Initialize selected items when modal opens
  useEffect(() => {
    if (isOpen && items.length > 0) {
      setSelectedItems(new Set(items.map(item => item.id)));
    }
  }, [isOpen, items]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedItems(new Set());
    }
  }, [isOpen]);

  // Early return AFTER all hooks
  if (!isOpen) return null;

  // Show minimized modal if minimized
  if (isMinimized) {
    return null; // MinimizedModal is now handled by MinimizedModalContainer
  }

  // Select all items by default
  const handleSelectAll = () => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map(item => item.id)));
    }
  };

  const handleToggleItem = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleConfirm = () => {
    const selected = items.filter(item => selectedItems.has(item.id));
    onSelectItems(selected);
    onClose();
  };

  const handleRejectAll = () => {
    onSelectItems([]);
    onClose();
  };

  // Rarity colors
  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'text-gray-400 border-gray-400';
      case 'uncommon': return 'text-green-400 border-green-400';
      case 'rare': return 'text-blue-400 border-blue-400';
      case 'epic': return 'text-purple-400 border-purple-400';
      case 'legendary': return 'text-orange-400 border-orange-400';
      default: return 'text-gray-400 border-gray-400';
    }
  };

  // Type icons
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'weapon': return <Sword className="w-4 h-4" />;
      case 'armor': return <Shield className="w-4 h-4" />;
      case 'consumable': return <Beaker className="w-4 h-4" />;
      case 'misc': return <Package className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <ModalHeader
          title={title}
          subtitle={description}
          icon={<Package className="w-5 h-5 text-green-400" />}
          onClose={onClose}
          onMinimize={minimize}
          className="p-6"
        />

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[50vh]">
          {items.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Không có vật phẩm nào được phát hiện</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Select All Button */}
              <div className="flex justify-between items-center">
                <button
                  onClick={handleSelectAll}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    selectedItems.size === items.length
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'border-gray-600 text-gray-300 hover:border-gray-500'
                  }`}
                >
                  {selectedItems.size === items.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                </button>
                <span className="text-sm text-gray-400">
                  {selectedItems.size}/{items.length} vật phẩm được chọn
                </span>
              </div>

              {/* Items List */}
              <div className="grid gap-3">
                {items.map((item) => {
                  const isSelected = selectedItems.has(item.id);
                  return (
                    <div
                      key={item.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-gray-700 hover:border-gray-600'
                      }`}
                      onClick={() => handleToggleItem(item.id)}
                    >
                      <div className="flex items-start gap-3">
                        {/* Selection Checkbox */}
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 ${
                          isSelected
                            ? 'bg-blue-500 border-blue-500'
                            : 'border-gray-600'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>

                        {/* Item Icon */}
                        <div className="text-gray-400 mt-0.5">
                          {getTypeIcon(item.type)}
                        </div>

                        {/* Item Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-white truncate">{item.name}</h3>
                            <span className={`text-xs px-2 py-1 rounded border ${getRarityColor(item.rarity)}`}>
                              {item.rarity}
                            </span>
                            {item.quantity > 1 && (
                              <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                                x{item.quantity}
                              </span>
                            )}
                          </div>
                          
                          <p className="text-sm text-gray-400 mb-2 line-clamp-2">
                            {item.description}
                          </p>

                          {/* Stats */}
                          {item.stats && Object.keys(item.stats).length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(item.stats).map(([stat, value]) => (
                                <span
                                  key={stat}
                                  className={`text-xs px-2 py-1 rounded ${
                                    (value as number) > 0
                                      ? 'bg-green-900/50 text-green-400'
                                      : 'bg-red-900/50 text-red-400'
                                  }`}
                                >
                                  {stat}: {typeof value === 'number' && value > 0 ? '+' : ''}{value}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Equipment Slot */}
                          {item.slot && (
                            <div className="mt-2">
                              <span className="text-xs bg-purple-900/50 text-purple-400 px-2 py-1 rounded">
                                Slot: {item.slot}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-700">
          <button
            onClick={handleRejectAll}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors flex items-center gap-2"
          >
            <XCircle className="w-4 h-4" />
            Bỏ qua tất cả
          </button>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:border-gray-500 transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={handleConfirm}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Lấy vật phẩm ({selectedItems.size})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}