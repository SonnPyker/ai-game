import { MotionWrapper } from '../MotionWrapper';
import { Sword, AlertTriangle, User, Zap, Shield } from 'lucide-react';
import { ModalHeader } from '../ModalHeader';
import { MinimizedModal } from '../MinimizedModal';
import { useModalMinimize } from '../../hooks/useModalMinimize';

interface NPCChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAcceptChallenge: () => void;
  onDeclineChallenge: () => void;
  challengeData: {
    npcName: string;
    challengeReason: string;
    combatStats: {
      level: number;
      health: { max: number };
      armorClass: number;
      attacks: Array<{
        name: string;
        attackBonus: number;
        damage: string;
        damageType: string;
      }>;
    };
    difficulty: 'easy' | 'medium' | 'hard';
  };
}

export function NPCChallengeModal({
  isOpen,
  onClose,
  onAcceptChallenge,
  onDeclineChallenge,
  challengeData
}: NPCChallengeModalProps) {
  const { isMinimized, minimize, restore } = useModalMinimize('npc-challenge-modal');

  if (!isOpen) return null;

  // Show minimized modal if minimized
  if (isMinimized) {
    return (
      <MinimizedModal
        title="Thách đấu từ NPC"
        subtitle={`${challengeData.npcName} thách đấu bạn`}
        icon={<Sword className="w-5 h-5 text-red-400" />}
        onRestore={restore}
      />
    );
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'hard': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'Dễ';
      case 'medium': return 'Trung bình';
      case 'hard': return 'Khó';
      default: return 'Không xác định';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <MotionWrapper
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-gray-900 border border-gray-700 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <ModalHeader
          title="Thách Đấu!"
          subtitle={`${challengeData.npcName} thách đấu bạn`}
          icon={<Sword className="w-6 h-6 text-red-400" />}
          onClose={onClose}
          onMinimize={minimize}
          className="bg-red-900/50 px-6 py-4 border-b border-red-700 rounded-t-2xl"
        />

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Challenge Message */}
          <div className="text-center">
            <div className="bg-red-800/30 border border-red-700 rounded-lg p-4 mb-4">
              <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
              <p className="text-red-100 text-lg font-medium">
                {challengeData.challengeReason}
              </p>
            </div>
          </div>

          {/* NPC Info */}
          <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-3">
              <User className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-semibold text-blue-100">
                {challengeData.npcName}
              </h3>
              <span className={`px-2 py-1 rounded text-xs font-medium ${getDifficultyColor(challengeData.difficulty)} bg-gray-700`}>
                {getDifficultyText(challengeData.difficulty)}
              </span>
            </div>

            {/* Combat Stats */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-green-400" />
                <span className="text-gray-300">HP:</span>
                <span className="text-green-400 font-medium">
                  {challengeData.combatStats.health.max}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-blue-400" />
                <span className="text-gray-300">AC:</span>
                <span className="text-blue-400 font-medium">
                  {challengeData.combatStats.armorClass}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-gray-300">Cấp độ:</span>
                <span className="text-yellow-400 font-medium">
                  {challengeData.combatStats.level}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Sword className="w-4 h-4 text-red-400" />
                <span className="text-gray-300">Tấn công:</span>
                <span className="text-red-400 font-medium">
                  +{challengeData.combatStats.attacks[0]?.attackBonus || 0}
                </span>
              </div>
            </div>

            {/* Attack Info */}
            {challengeData.combatStats.attacks[0] && (
              <div className="mt-3 pt-3 border-t border-gray-600">
                <div className="text-sm">
                  <span className="text-gray-400">Vũ khí:</span>
                  <span className="text-white ml-2">
                    {challengeData.combatStats.attacks[0].name}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-400">Sát thương:</span>
                  <span className="text-red-400 ml-2">
                    {challengeData.combatStats.attacks[0].damage} {challengeData.combatStats.attacks[0].damageType}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Warning */}
          <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-yellow-100">
                <p className="font-medium mb-1">Cảnh báo:</p>
                <p>Nếu bạn chấp nhận thách đấu, combat sẽ bắt đầu ngay lập tức. Bạn có thể bị thương hoặc thua cuộc!</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-700 bg-gray-800/50 rounded-b-2xl">
          <div className="flex space-x-3">
            <button
              onClick={onDeclineChallenge}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors font-medium"
            >
              Từ chối
            </button>
            <button
              onClick={onAcceptChallenge}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors font-medium flex items-center justify-center space-x-2"
            >
              <Sword className="w-4 h-4" />
              <span>Chấp nhận</span>
            </button>
          </div>
        </div>
      </MotionWrapper>
    </div>
  );
}
