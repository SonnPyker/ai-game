import React, { useState } from 'react';
import { Sword, Shield, X, AlertTriangle, Backpack, User } from 'lucide-react';
import { MotionWrapper } from '../MotionWrapper';
import { InfoMenu } from '../InfoMenu/InfoMenu';

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
  const [showInventory, setShowInventory] = useState(false);
  
  if (!isOpen) return null;

  // Defensive checks for enemy properties
  const enemyName = typeof enemy?.name === 'string' ? enemy.name : 'Unknown Enemy';
  const enemyType = typeof enemy?.type === 'string' ? enemy.type : 'unknown';
  const enemyLevel = typeof enemy?.level === 'number' ? enemy.level : 1;
  const enemyDescription = typeof enemy?.description === 'string' ? enemy.description : 'A mysterious enemy appears.';
  
  // Defensive checks for location and reason
  const safeLocation = typeof location === 'string' ? location : 
    (typeof location === 'object' && location && 'name' in location ? (location as any).name : 'Unknown Location');
  const safeReason = typeof reason === 'string' ? reason : 
    (typeof reason === 'object' && reason && 'description' in reason ? (reason as any).description : 'Cuộc đối đầu bất ngờ');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[9999] p-4">
      <MotionWrapper
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-gray-900 border border-gray-700 rounded-2xl max-w-md w-full mx-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-600 rounded-lg">
              <Sword className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Cuộc Đối Đầu Bất Ngờ</h2>
              <p className="text-sm text-gray-400">Bạn đã gặp phải kẻ thù!</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

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
            </div>
            
            <div className="space-y-2 text-sm text-gray-300">
              <p><span className="text-gray-400">Loại:</span> {enemyType}</p>
              <p><span className="text-gray-400">Mô tả:</span> {enemyDescription}</p>
              <p><span className="text-gray-400">Địa điểm:</span> {safeLocation}</p>
              <p><span className="text-gray-400">Lý do:</span> {safeReason}</p>
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

          {/* Preparation Buttons */}
          <div className="space-y-3">
            <div className="flex space-x-3">
              <button
                onClick={() => setShowInventory(true)}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
              >
                <Backpack className="w-5 h-5" />
                <span>Túi Đồ</span>
              </button>
              
              <button
                onClick={() => setShowInventory(true)}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium"
              >
                <User className="w-5 h-5" />
                <span>Trang Bị</span>
              </button>
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
          </div>

          {/* Help Text */}
          <div className="text-xs text-gray-400 text-center">
            <p>• <strong>Túi Đồ/Trang Bị:</strong> Chuẩn bị trước khi chiến đấu</p>
            <p>• <strong>Chiến Đấu:</strong> Bắt đầu combat với kẻ thù</p>
            <p>• <strong>Tránh Né:</strong> Cố gắng trốn thoát (có thể thất bại)</p>
          </div>
        </div>
      </MotionWrapper>

      {/* Inventory/Equipment Modal */}
      {showInventory && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[10000] p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-xl font-bold text-white">Chuẩn Bị Trước Khi Chiến Đấu</h3>
              <button
                onClick={() => setShowInventory(false)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 max-h-[calc(90vh-80px)] overflow-y-auto">
              <InfoMenu 
                isOpen={true}
                onClose={() => setShowInventory(false)}
                worldData={null}
                characterData={null}
                worldTime={null}
                isPinned={false}
                onTogglePin={() => {}}
                questSystem={null}
                onQuestUpdate={() => {}}
                onQuestAccept={() => {}}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
