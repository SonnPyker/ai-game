import { useState } from 'react';
import { Package, CheckCircle, AlertCircle } from 'lucide-react';
import { InventoryItem, QuestProgress } from '../../types';
import { inventoryService } from '../../services/inventoryService';

interface DeliveryButtonProps {
  npcId: string;
  npcName: string;
  deliveryQuests: QuestProgress[];
  onDeliveryComplete: (questId: string, objectiveId: string) => void;
}

export function DeliveryButton({ 
  npcId, 
  npcName, 
  deliveryQuests, 
  onDeliveryComplete 
}: DeliveryButtonProps) {
  const [showDeliveryPanel, setShowDeliveryPanel] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isDelivering, setIsDelivering] = useState(false);

  // Get all delivery items for this NPC
  const deliveryItems = inventoryService.getDeliveryItems(npcId);

  if (deliveryItems.length === 0) {
    return null;
  }

  const handleDeliveryClick = () => {
    setShowDeliveryPanel(true);
  };

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
            
            // Close panel
            setShowDeliveryPanel(false);
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

  const handleCancelDelivery = () => {
    setShowDeliveryPanel(false);
    setSelectedItem(null);
  };

  return (
    <>
      {/* Delivery Button */}
      <button
        onClick={handleDeliveryClick}
        className="flex items-center space-x-2 px-4 py-2 bg-yellow-700 hover:bg-yellow-700 text-white rounded-lg transition-colors"
      >
        <Package className="w-4 h-4" />
        <span>Giao đồ ({deliveryItems.length})</span>
      </button>

      {/* Delivery Panel Modal */}
      {showDeliveryPanel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                Giao đồ cho {npcName}
              </h3>
              <button
                onClick={handleCancelDelivery}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-gray-300 text-sm mb-4">
                Chọn vật phẩm cần giao:
              </p>

              {deliveryItems.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedItem?.id === item.id
                      ? 'border-yellow-500 bg-gray-900/20'
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                  onClick={() => handleItemSelect(item)}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{item.icon}</span>
                    <div className="flex-1">
                      <h4 className="text-white font-medium">{item.name}</h4>
                      <p className="text-gray-400 text-sm">{item.description}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs bg-yellow-600 text-white px-2 py-1 rounded">
                          {item.type}
                        </span>
                        <span className="text-xs bg-yellow-600 text-white px-2 py-1 rounded">
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
                      <CheckCircle className="w-5 h-5 text-yellow-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleCancelDelivery}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmDelivery}
                disabled={!selectedItem || isDelivering}
                className="flex-1 px-4 py-2 bg-yellow-700 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center space-x-2"
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
              <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-500 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5" />
                  <div className="text-sm text-yellow-300">
                    <p className="font-medium">Xác nhận giao đồ:</p>
                    <p>Bạn sẽ giao <span className="font-semibold">{selectedItem.name}</span> cho {npcName}.</p>
                    <p className="text-xs mt-1 text-yellow-400">
                      Vật phẩm sẽ bị xóa khỏi túi đồ sau khi giao.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
