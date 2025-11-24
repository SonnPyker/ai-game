import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { 
  Sword, 
  AlertTriangle, 
  CheckCircle, 
  Loader2,
  User,
  Target,
  Heart,
  Shield
} from 'lucide-react';
import { NPCRelationship } from '../../types';
import { MotionWrapper } from '../MotionWrapper';
import { ModalHeader } from '../ModalHeader';
import { useModalMinimize } from '../../hooks/useModalMinimize';

interface CombatConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartCombat: () => void;
  npc: NPCRelationship;
  isPreparing: boolean;
  preparationStatus: {
    hasCombatStats: boolean;
    hasWeapon: boolean;
    hasValidLevel: boolean;
    isGenerating: boolean;
    errors: string[];
  };
}

export function CombatConfirmationModal({
  isOpen,
  onClose,
  onStartCombat,
  npc,
  isPreparing,
  preparationStatus
}: CombatConfirmationModalProps) {
  const [showDetails, setShowDetails] = useState(false);
  const { isMinimized, minimize } = useModalMinimize({
    modalId: 'combat-confirmation-modal',
    title: 'Xác nhận chiến đấu',
    subtitle: npc?.name || 'Kẻ thù',
    icon: <Sword className="w-5 h-5 text-white" />
  });

  if (!isOpen) return null;

  // Show minimized modal if minimized
  if (isMinimized) {
    return null; // MinimizedModal is now handled by MinimizedModalContainer
  }

  const isReady = preparationStatus.hasCombatStats && 
                 preparationStatus.hasWeapon && 
                 preparationStatus.hasValidLevel &&
                 !preparationStatus.isGenerating;

  const getStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircle className="w-4 h-4 text-yellow-400" />
    ) : (
      <AlertTriangle className="w-4 h-4 text-yellow-400" />
    );
  };

  const getStatusText = (status: boolean) => {
    return status ? 'Sẵn sàng' : 'Đang chuẩn bị...';
  };

  const getStatusColor = (status: boolean) => {
    return status ? 'text-yellow-400' : 'text-yellow-400';
  };

  return (
    <AnimatePresence>
      <MotionWrapper
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <MotionWrapper
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-gray-900 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          {/* Header */}
          <ModalHeader
            title="Xác nhận Chiến đấu"
            subtitle={`Chuẩn bị đối đầu với ${npc.name}`}
            icon={<Sword className="w-6 h-6 text-white" />}
            onClose={onClose}
            onMinimize={minimize}
            className="bg-gray-800 px-6 py-4"
          />

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* NPC Info */}
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                <User className="w-5 h-5 text-yellow-400" />
                <h3 className="text-lg font-semibold text-white">{npc.name}</h3>
                <span className="px-2 py-1 bg-gray-900/20 text-white text-xs rounded">
                  Kẻ thù
                </span>
              </div>
              
              {npc.description && (
                <p className="text-gray-300 text-sm mb-3">{npc.description}</p>
              )}

              {/* NPC Stats Preview */}
              {npc.combatStats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="flex items-center space-x-2">
                    <Heart className="w-4 h-4 text-white" />
                    <span className="text-gray-400">HP:</span>
                    <span className="text-white">
                      {npc.combatStats.health?.current || 0}/{npc.combatStats.health?.max || 0}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-yellow-400" />
                    <span className="text-gray-400">AC:</span>
                    <span className="text-white">{npc.combatStats.armorClass || 'N/A'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Sword className="w-4 h-4 text-yellow-400" />
                    <span className="text-gray-400">Combat:</span>
                    <span className="text-white">{npc.combatStats.combatLevel || 'N/A'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Target className="w-4 h-4 text-yellow-400" />
                    <span className="text-gray-400">Character:</span>
                    <span className="text-white">{npc.combatStats.characterLevel || 'N/A'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Preparation Status */}
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Trạng thái Chuẩn bị</h3>
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-yellow-400 hover:text-yellow-300 text-sm"
                >
                  {showDetails ? 'Ẩn chi tiết' : 'Xem chi tiết'}
                </button>
              </div>

              {/* Status Overview */}
              <div className="flex items-center space-x-4 mb-4">
                <div className="flex items-center space-x-2">
                  {preparationStatus.isGenerating ? (
                    <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
                  ) : (
                    getStatusIcon(isReady)
                  )}
                  <span className={`font-medium ${getStatusColor(isReady)}`}>
                    {preparationStatus.isGenerating ? 'Đang chuẩn bị...' : getStatusText(isReady)}
                  </span>
                </div>
              </div>

              {/* Detailed Status */}
              {showDetails && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Combat Stats:</span>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(preparationStatus.hasCombatStats)}
                      <span className={getStatusColor(preparationStatus.hasCombatStats)}>
                        {preparationStatus.hasCombatStats ? 'Có' : 'Thiếu'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Vũ khí:</span>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(preparationStatus.hasWeapon)}
                      <span className={getStatusColor(preparationStatus.hasWeapon)}>
                        {preparationStatus.hasWeapon ? 'Có' : 'Đang tạo...'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Level hợp lệ:</span>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(preparationStatus.hasValidLevel)}
                      <span className={getStatusColor(preparationStatus.hasValidLevel)}>
                        {preparationStatus.hasValidLevel ? 'Có' : 'Thiếu'}
                      </span>
                    </div>
                  </div>

                  {/* Errors */}
                  {preparationStatus.errors.length > 0 && (
                    <div className="mt-3 p-3 bg-gray-950/20 border border-gray-700/30 rounded">
                      <h4 className="text-white font-medium mb-2">Lỗi:</h4>
                      <ul className="text-white text-sm space-y-1">
                        {preparationStatus.errors.map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Warning */}
            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
                <div>
                  <h4 className="text-yellow-400 font-medium mb-1">Cảnh báo</h4>
                  <p className="text-yellow-200 text-sm">
                    Một khi bắt đầu chiến đấu, bạn sẽ không thể quay lại cho đến khi kết thúc. 
                    Hãy đảm bảo đã chuẩn bị đầy đủ vũ khí và đồ dùng cần thiết.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-800 px-6 py-4 border-t border-gray-700">
            <div className="flex items-center justify-between">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Hủy bỏ
              </button>
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
                >
                  Chạy thoát
                </button>
                
                <button
                  onClick={onStartCombat}
                  disabled={!isReady || isPreparing}
                  className={`px-6 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                    isReady && !isPreparing
                      ? 'bg-gray-900 hover:bg-gray-900 text-white'
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isPreparing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang chuẩn bị...</span>
                    </>
                  ) : (
                    <>
                      <Sword className="w-4 h-4" />
                      <span>Bắt đầu Chiến đấu</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </MotionWrapper>
      </MotionWrapper>
    </AnimatePresence>
  );
}
