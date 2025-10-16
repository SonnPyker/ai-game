import { ShoppingBag, TrendingUp, Loader2 } from 'lucide-react';
import { NPCRelationship, MerchantShop } from '../../types';
import { useState, useEffect } from 'react';
import { locationService } from '../../services/locationService';

interface MerchantSignatureNPCProps {
  npc: NPCRelationship;
  merchantShop: MerchantShop | null;
  onOpenShop: (locationId: string) => void;
}

export function MerchantSignatureNPC({ npc, merchantShop, onOpenShop }: MerchantSignatureNPCProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlayerAtMerchantLocation, setIsPlayerAtMerchantLocation] = useState(false);

  // Kiểm tra xem player có đang ở cùng location với merchant không
  useEffect(() => {
    const checkPlayerLocation = () => {
      const currentPlayerLocation = locationService.getCurrentLocation();
      const merchantLocationId = npc.merchantSignatureLocationId;
      
      if (currentPlayerLocation && merchantLocationId) {
        const isAtLocation = currentPlayerLocation.currentLocationId === merchantLocationId;
        setIsPlayerAtMerchantLocation(isAtLocation);
      } else {
        setIsPlayerAtMerchantLocation(false);
      }
    };

    // Kiểm tra ngay lập tức
    checkPlayerLocation();

    // Lắng nghe thay đổi location (có thể cần cập nhật khi player di chuyển)
    const interval = setInterval(checkPlayerLocation, 1000); // Kiểm tra mỗi giây

    return () => clearInterval(interval);
  }, [npc.merchantSignatureLocationId]);

  const handleOpenShop = async () => {
    if (isLoading || !isPlayerAtMerchantLocation) return; // Prevent multiple clicks and check location
    
    setIsLoading(true);
    if (merchantShop) {
      onOpenShop(npc.merchantSignatureLocationId || '');
    } else if (npc.merchantSignatureLocationId) {
      try {
        // Import merchantService dynamically
        const { merchantService } = await import('../../services/merchantService');
        
        // Create shop for this location
        const newShop = await merchantService.ensureMerchantShopExists(npc.merchantSignatureLocationId);
        if (newShop) {
          // Link shop with NPC
          merchantService.linkMerchantShopWithNPC(newShop.locationId, npc.id);
          
          // Open the shop modal via parent
          onOpenShop(npc.merchantSignatureLocationId);
        } else {
          onOpenShop(npc.merchantSignatureLocationId);
        }
      } catch (error) {
        console.error('Error creating shop:', error);
        onOpenShop(npc.merchantSignatureLocationId);
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
      {/* Simple Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-yellow-500/20 rounded-full flex items-center justify-center border border-yellow-500/50">
            <ShoppingBag className="w-4 h-4 text-yellow-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
              <span>{npc.name}</span>
              <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-300 text-xs rounded border border-yellow-500/50">
                Thương Gia
              </span>
            </h3>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-2">
        <button
          onClick={handleOpenShop}
          disabled={isLoading || !isPlayerAtMerchantLocation}
          className={`flex-1 py-2 px-3 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 text-sm ${
            isLoading || !isPlayerAtMerchantLocation
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
              : 'bg-yellow-600 hover:bg-yellow-700 text-white'
          }`}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Đang tạo...</span>
            </>
          ) : !isPlayerAtMerchantLocation ? (
            <>
              <ShoppingBag className="w-4 h-4" />
              <span>Không ở đây</span>
            </>
          ) : (
            <>
              <ShoppingBag className="w-4 h-4" />
              <span>Mở Cửa Hàng</span>
            </>
          )}
        </button>
        
        <button
          onClick={() => {
            // TODO: Implement negotiation functionality
          }}
          disabled={!isPlayerAtMerchantLocation}
          className={`px-3 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-2 text-sm ${
            !isPlayerAtMerchantLocation
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>{!isPlayerAtMerchantLocation ? 'Không ở đây' : 'Thương Lượng'}</span>
        </button>
      </div>
    </div>
  );
}