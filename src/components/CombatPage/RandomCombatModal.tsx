import React from 'react';
import { Sword, Shield, AlertTriangle } from 'lucide-react';
import { MotionWrapper } from '../MotionWrapper';
import { ModalHeader } from '../ModalHeader';
import { useModalMinimize } from '../../hooks/useModalMinimize';

interface RandomCombatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFight: () => void;
  onFlee: () => void;
  enemy: any; // Accept any enemy object from AI
  location: string;
  reason: string;
}

export const RandomCombatModal: React.FC<RandomCombatModalProps> = ({
  isOpen,
  onClose,
  onFight,
  onFlee,
  enemy,
  location,
  reason
}) => {
  const { isMinimized, minimize } = useModalMinimize({
    modalId: 'random-combat-modal',
    title: 'Chiến đấu ngẫu nhiên',
    subtitle: typeof location === 'string' ? location : ((location as any)?.name || 'Unknown Location'),
    icon: <Sword className="w-5 h-5 text-red-400" />
  });
  
  if (!isOpen) return null;

  // Defensive checks for enemy properties
  const enemyName = typeof enemy?.name === 'string' ? enemy.name : 'Unknown Enemy';
  const enemyType = typeof enemy?.type === 'string' ? enemy.type : 'unknown';
  const enemyLevel = typeof enemy?.level === 'number' ? enemy.level : 1;
  const enemyDescription = typeof enemy?.description === 'string' ? enemy.description : 'A mysterious enemy appears.';
  const enemyThreatLevel = typeof enemy?.threatLevel === 'string' ? enemy.threatLevel : 'medium';
  
  // Defensive checks for location and reason
  const safeLocation = typeof location === 'string' ? location : 
    (typeof location === 'object' && location && 'name' in location ? (location as any).name : 'Unknown Location');
  const safeReason = typeof reason === 'string' ? reason : 
    (typeof reason === 'object' && reason && 'description' in reason ? (reason as any).description : 'Cuộc đối đầu bất ngờ');

  // Threat level display functions
  const getThreatLevelColor = (threatLevel: string) => {
    switch (threatLevel.toLowerCase()) {
      case 'low': return 'text-green-400 bg-green-900/30 border-green-600';
      case 'medium': return 'text-yellow-400 bg-yellow-900/30 border-yellow-600';
      case 'high': return 'text-orange-400 bg-orange-900/30 border-orange-600';
      case 'extreme': return 'text-red-400 bg-red-900/30 border-red-600';
      default: return 'text-gray-400 bg-gray-900/30 border-gray-600';
    }
  };

  const getThreatLevelText = (threatLevel: string) => {
    switch (threatLevel.toLowerCase()) {
      case 'low': return 'Thấp';
      case 'medium': return 'Trung bình';
      case 'high': return 'Cao';
      case 'extreme': return 'Cực cao';
      default: return 'Không xác định';
    }
  };

  // Show minimized modal if minimized
  if (isMinimized) {
    return null; // MinimizedModal is now handled by MinimizedModalContainer
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[9999] p-4">
      <MotionWrapper
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-gray-900 border border-gray-700 rounded-2xl max-w-md w-full mx-4"
      >
        {/* Header */}
        <ModalHeader
          title="Cuộc Đối Đầu Bất Ngờ"
          subtitle="Bạn đã gặp phải kẻ thù!"
          icon={<Sword className="w-6 h-6 text-white" />}
          onClose={onClose}
          onMinimize={minimize}
          className="p-6"
        />

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Enemy Info */}
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <h3 className="text-lg font-semibold text-white">{enemyName}</h3>
              <span className="px-2 py-1 bg-red-600 text-xs text-white rounded">
                Level {enemyLevel}
              </span>
              <span className={`px-2 py-1 text-xs font-medium rounded border ${getThreatLevelColor(enemyThreatLevel)}`}>
                {getThreatLevelText(enemyThreatLevel)}
              </span>
            </div>
            
            <div className="space-y-2 text-sm text-gray-300">
              <p><span className="text-gray-400">Loại:</span> {enemyType}</p>
              <p><span className="text-gray-400">Mô tả:</span> {enemyDescription}</p>
              <p><span className="text-gray-400">Địa điểm:</span> {safeLocation}</p>
              <p><span className="text-gray-400">Lý do:</span> {safeReason}</p>
              <p><span className="text-gray-400">Mức độ nguy hiểm:</span> 
                <span className={`ml-2 px-2 py-1 text-xs font-medium rounded border ${getThreatLevelColor(enemyThreatLevel)}`}>
                  {getThreatLevelText(enemyThreatLevel)}
                </span>
              </p>
            </div>
          </div>

          {/* Warning */}
          <div className="flex items-start space-x-3 p-3 bg-yellow-900 border border-yellow-700 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-yellow-200">
              <p className="font-medium">Cảnh báo!</p>
              <p>Đây là cuộc đối đầu bất ngờ. Bạn có thể chiến đấu hoặc cố gắng tránh né.</p>
            </div>
          </div>

          {/* Combat Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={onFight}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
            >
              <Sword className="w-5 h-5" />
              <span>Chiến Đấu</span>
            </button>
            
            <button
              onClick={onFlee}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium"
            >
              <Shield className="w-5 h-5" />
              <span>Tránh Né</span>
            </button>
          </div>

          {/* Help Text */}
          <div className="text-xs text-gray-400 text-center">
            <p>• <strong>Chiến Đấu:</strong> Bắt đầu combat với kẻ thù</p>
            <p>• <strong>Tránh Né:</strong> Cố gắng trốn thoát (có thể thất bại)</p>
          </div>
        </div>
      </MotionWrapper>
    </div>
  );
};
