import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { 
  Sword, 
  AlertTriangle, 
  Target,
  Bot,
  Star
} from 'lucide-react';
import { QuestCombatData } from '../../types/combat';
import { MotionWrapper } from '../MotionWrapper';
import { ModalHeader } from '../ModalHeader';
import { useModalMinimize } from '../../hooks/useModalMinimize';

interface QuestCombatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartCombat: (combatData: QuestCombatData) => void;
  combatData: QuestCombatData | null;
}

export function QuestCombatModal({
  isOpen,
  onClose,
  onStartCombat,
  combatData
}: QuestCombatModalProps) {
  const [isStarting, setIsStarting] = useState(false);
  const { isMinimized, minimize } = useModalMinimize({
    modalId: 'quest-combat-modal',
    title: 'Chiến đấu Quest',
    subtitle: combatData?.questTitle || 'Quest',
    icon: <Sword className="w-5 h-5 text-red-400" />
  });

  useEffect(() => {
    if (isOpen) {
      setIsStarting(false);
    }
  }, [isOpen]);

  if (!isOpen || !combatData) return null;

  // Show minimized modal if minimized
  if (isMinimized) {
    return null; // MinimizedModal is now handled by MinimizedModalContainer
  }

  const handleStartCombat = async () => {
    setIsStarting(true);
    try {
      await onStartCombat(combatData);
    } catch (error) {
      console.error('Error starting combat:', error);
      setIsStarting(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'hard': return 'text-orange-400';
      case 'extreme': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'Dễ';
      case 'medium': return 'Trung bình';
      case 'hard': return 'Khó';
      case 'extreme': return 'Cực khó';
      default: return 'Không xác định';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <MotionWrapper
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <MotionWrapper
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            {/* Header */}
            <ModalHeader
              title="Chiến Đấu Nhiệm Vụ"
              subtitle={combatData.questTitle}
              icon={<Sword className="w-6 h-6 text-red-400" />}
              onClose={onClose}
              onMinimize={minimize}
              className="bg-gradient-to-r from-red-900/50 to-orange-900/50 p-6 border-b border-red-500/30"
            />

            {/* Content */}
            <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {/* Quest Objective */}
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-2 flex items-center">
                  <Target className="w-5 h-5 mr-2 text-blue-400" />
                  Mục Tiêu Nhiệm Vụ
                </h3>
                <p className="text-gray-300">{combatData.objectiveDescription}</p>
              </div>

              {/* Combat Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Difficulty & Level */}
                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                  <h4 className="text-md font-semibold text-white mb-3 flex items-center">
                    <AlertTriangle className="w-4 h-4 mr-2 text-yellow-400" />
                    Thông Tin Chiến Đấu
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Độ khó:</span>
                      <span className={`font-medium ${getDifficultyColor(combatData.difficulty)}`}>
                        {getDifficultyText(combatData.difficulty)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Level khuyến nghị:</span>
                      <span className="text-white font-medium">{combatData.recommendedLevel}+</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Số kẻ thù:</span>
                      <span className="text-white font-medium">{combatData.enemies.length}</span>
                    </div>
                  </div>
                </div>

                {/* Rewards Preview */}
                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                  <h4 className="text-md font-semibold text-white mb-3 flex items-center">
                    <Star className="w-4 h-4 mr-2 text-yellow-400" />
                    Phần Thưởng
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Kinh nghiệm:</span>
                      <span className="text-green-400 font-medium">+{combatData.rewards.experience}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Tiền tệ:</span>
                      <span className="text-yellow-400 font-medium">+{combatData.rewards.currency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Vật phẩm:</span>
                      <span className="text-blue-400 font-medium">{combatData.rewards.items.length} món</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Enemies List */}
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <h4 className="text-md font-semibold text-white mb-3 flex items-center">
                  <Bot className="w-4 h-4 mr-2 text-red-400" />
                  Kẻ Thù Sẽ Gặp
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {combatData.enemies.map((enemy) => (
                    <div
                      key={enemy.id}
                      className="bg-gray-700/50 rounded-lg p-3 border border-gray-600"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-white">{enemy.name}</h5>
                        <span className="text-xs text-gray-400">Level {enemy.level || 1}</span>
                      </div>
                      <div className="space-y-1 text-xs text-gray-400">
                        <div className="flex justify-between">
                          <span>HP:</span>
                          <span className="text-red-400">{enemy.health?.max || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>AC:</span>
                          <span className="text-blue-400">{enemy.armorClass || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Loại:</span>
                          <span className="text-purple-400">{enemy.type || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Warning */}
              <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h5 className="text-yellow-300 font-medium mb-1">Cảnh báo</h5>
                    <p className="text-yellow-200 text-sm">
                      Một khi bắt đầu chiến đấu, bạn sẽ không thể thoát cho đến khi thắng hoặc thua. 
                      Hãy đảm bảo bạn đã chuẩn bị đầy đủ trang bị và vật phẩm.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-800/50 p-6 border-t border-gray-700">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
                >
                  Hủy
                </button>
                <button
                  onClick={handleStartCombat}
                  disabled={isStarting}
                  className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium flex items-center justify-center space-x-2"
                >
                  {isStarting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Đang bắt đầu...</span>
                    </>
                  ) : (
                    <>
                      <Sword className="w-4 h-4" />
                      <span>Bắt đầu chiến đấu</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </MotionWrapper>
        </MotionWrapper>
      )}
    </AnimatePresence>
  );
}
