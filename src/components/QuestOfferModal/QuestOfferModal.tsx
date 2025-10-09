import { MotionWrapper } from '../MotionWrapper';
import { X, CheckCircle, Target, Gift } from 'lucide-react';

interface QuestOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  onDecline: () => void;
  questOffer: {
    title: string;
    description: string;
    objectives?: Array<{
      id: string;
      description: string;
      aiKeywords: string[];
    }>;
    rewards?: Array<{
      type: string;
      amount: number;
      description: string;
    }>;
  } | null;
}

export function QuestOfferModal({ 
  isOpen, 
  onClose, 
  onAccept, 
  onDecline, 
  questOffer 
}: QuestOfferModalProps) {
  if (!isOpen || !questOffer) return null;

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
        className="bg-gray-900 rounded-lg border border-gray-700 max-w-md w-full max-h-[80vh] overflow-y-auto"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white flex items-center">
            <Target className="w-5 h-5 mr-2 text-yellow-400" />
            Quest Mới
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Quest Title */}
          <h3 className="text-lg font-semibold text-white">{questOffer.title}</h3>
          
          {/* Quest Description */}
          <p className="text-gray-300 text-sm leading-relaxed">
            {questOffer.description}
          </p>

          {/* Objectives */}
          {questOffer.objectives && questOffer.objectives.length > 0 ? (
            <div>
              <h4 className="text-sm font-medium text-gray-400 mb-2 flex items-center">
                <CheckCircle className="w-4 h-4 mr-1" />
                Mục tiêu:
              </h4>
              <ul className="space-y-1">
                {questOffer.objectives.map((objective) => (
                  <li key={objective.id} className="text-sm text-gray-300 flex items-start">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                    {objective.description}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div>
              <h4 className="text-sm font-medium text-gray-400 mb-2 flex items-center">
                <CheckCircle className="w-4 h-4 mr-1" />
                Mục tiêu:
              </h4>
              <p className="text-sm text-gray-500 italic">Chưa có mục tiêu cụ thể</p>
            </div>
          )}

          {/* Rewards */}
          {questOffer.rewards && questOffer.rewards.length > 0 ? (
            <div>
              <h4 className="text-sm font-medium text-gray-400 mb-2 flex items-center">
                <Gift className="w-4 h-4 mr-1" />
                Phần thưởng:
              </h4>
              <div className="space-y-1">
                {questOffer.rewards.map((reward, index) => (
                  <div key={index} className="text-sm text-yellow-300 bg-yellow-600/20 px-2 py-1 rounded">
                    {reward.description}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <h4 className="text-sm font-medium text-gray-400 mb-2 flex items-center">
                <Gift className="w-4 h-4 mr-1" />
                Phần thưởng:
              </h4>
              <p className="text-sm text-gray-500 italic">Chưa có phần thưởng cụ thể</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex space-x-3 p-4 border-t border-gray-700">
          <button
            onClick={() => {
              onAccept();
              onClose();
            }}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Nhận Quest
          </button>
          <button
            onClick={() => {
              onDecline();
              onClose();
            }}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Từ chối
          </button>
        </div>
      </MotionWrapper>
    </MotionWrapper>
  );
}
