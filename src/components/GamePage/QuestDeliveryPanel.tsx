import { useState, useEffect } from 'react';
import { Package, CheckCircle, AlertCircle } from 'lucide-react';
import { QuestProgress, InventoryItem } from '../../types';
import { inventoryService } from '../../services/inventoryService';
import { ModalHeader } from '../ModalHeader';
import { useModalMinimize } from '../../hooks/useModalMinimize';

interface QuestDeliveryPanelProps {
  npcId: string;
  npcName: string;
  deliveryQuests: QuestProgress[];
  onDeliveryComplete: (questId: string, objectiveId: string) => void;
  onClose: () => void;
}

export function QuestDeliveryPanel({ 
  npcId, 
  npcName, 
  deliveryQuests, 
  onDeliveryComplete,
  onClose 
}: QuestDeliveryPanelProps) {
  const [deliveryItems, setDeliveryItems] = useState<InventoryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isDelivering, setIsDelivering] = useState(false);
  const { isMinimized, minimize } = useModalMinimize({
    modalId: 'quest-delivery-panel',
    title: 'Giao hàng Quest',
    subtitle: `${deliveryItems.length} vật phẩm`,
    icon: <Package className="w-5 h-5 text-green-400" />
  });

  useEffect(() => {
    // Get delivery items for this NPC
    const items = inventoryService.getDeliveryItems(npcId);
    setDeliveryItems(items);
  }, [npcId]);

  const handleItemSelect = (item: InventoryItem) => {
    setSelectedItem(item);
  };

  const handleConfirmDelivery = async () => {
    if (!selectedItem) return;

    setIsDelivering(true);
    
    try {
      // Find the quest and objective for this delivery
      const quest = deliveryQuests.find(q => 
        q.objectives.some(obj => 
          obj.type === 'chain_delivery' && 
          obj.deliveryItemName === selectedItem.name &&
          obj.deliveryNPCId === npcId
        )
      );

      if (quest) {
        const objective = quest.objectives.find(obj => 
          obj.type === 'chain_delivery' && 
          obj.deliveryItemName === selectedItem.name &&
          obj.deliveryNPCId === npcId
        );

        if (objective) {
          // Deliver the item
          const success = inventoryService.deliverItem(selectedItem.id, npcId, quest.id);
          
          if (success) {
            // Mark objective as completed
            onDeliveryComplete(quest.id, objective.id);
            
            // Show success message
            
            // Update delivery items list
            const updatedItems = inventoryService.getDeliveryItems(npcId);
            setDeliveryItems(updatedItems);
            
            // Reset selection
            setSelectedItem(null);
          }
        }
      }
    } catch (error) {
      console.error('Error delivering item:', error);
    } finally {
      setIsDelivering(false);
    }
  };

  if (deliveryItems.length === 0) {
    // Show minimized modal if minimized
    if (isMinimized) {
      return null; // MinimizedModal is now handled by MinimizedModalContainer
    }

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
          <ModalHeader
            title={`Giao đồ cho ${npcName}`}
            icon={<Package className="w-5 h-5 text-gray-400" />}
            onClose={onClose}
            onMinimize={minimize}
            className="mb-4"
          />
          
          <div className="text-center py-8">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-300 text-lg mb-2">Không có vật phẩm để giao</p>
            <p className="text-gray-400 text-sm">
              Bạn cần có vật phẩm được đánh dấu để giao cho {npcName}
            </p>
          </div>
          
          <div className="flex justify-center mt-6">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show minimized modal if minimized
  if (isMinimized) {
    return null; // MinimizedModal is now handled by MinimizedModalContainer
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <ModalHeader
          title={`Giao đồ cho ${npcName}`}
          subtitle={`${deliveryItems.length} vật phẩm có thể giao`}
          icon={<Package className="w-5 h-5 text-green-400" />}
          onClose={onClose}
          onMinimize={minimize}
          className="mb-4"
        />

        <div className="space-y-4">
          <p className="text-gray-300 text-sm mb-4">
            Chọn vật phẩm cần giao:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {deliveryItems.map((item) => (
              <div
                key={item.id}
                className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                  selectedItem?.id === item.id
                    ? 'border-green-500 bg-green-900/20'
                    : 'border-gray-600 hover:border-gray-500'
                }`}
                onClick={() => handleItemSelect(item)}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{item.icon}</span>
                  <div className="flex-1">
                    <h4 className="text-white font-medium">{item.name}</h4>
                    <p className="text-gray-400 text-sm">{item.description}</p>
                    <div className="flex items-center space-x-2 mt-2">
                      <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
                        {item.type}
                      </span>
                      <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded">
                        {item.rarity}
                      </span>
                      {item.quantity > 1 && (
                        <span className="text-xs bg-gray-600 text-white px-2 py-1 rounded">
                          x{item.quantity}
                        </span>
                      )}
                    </div>
                  </div>
                  {selectedItem?.id === item.id && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex space-x-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleConfirmDelivery}
            disabled={!selectedItem || isDelivering}
            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            {isDelivering ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Đang giao...</span>
              </>
            ) : (
              <>
                <Package className="w-4 h-4" />
                <span>Giao đồ</span>
              </>
            )}
          </button>
        </div>

        {selectedItem && (
          <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5" />
              <div className="text-sm text-blue-300">
                <p className="font-medium">Xác nhận giao đồ:</p>
                <p>Bạn sẽ giao <span className="font-semibold">{selectedItem.name}</span> cho {npcName}.</p>
                <p className="text-xs mt-1 text-blue-400">
                  Vật phẩm sẽ bị xóa khỏi túi đồ sau khi giao.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
