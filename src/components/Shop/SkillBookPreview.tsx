import { BookOpen, Zap, Heart, MessageCircle, Star, AlertTriangle } from 'lucide-react';
import { SkillBook } from '../../types';
import { skillBookService } from '../../services/skillBookService';

interface SkillBookPreviewProps {
  skillBook: SkillBook;
  onClose: () => void;
  onConfirm: () => void;
  isBuying?: boolean;
  price?: number;
  canAfford?: boolean;
}

export function SkillBookPreview({
  skillBook,
  onClose,
  onConfirm,
  isBuying = false,
  price = 0,
  canAfford = true
}: SkillBookPreviewProps) {
  const skillInfo = skillBookService.getSkillBookInfo(skillBook);

  const getSkillTypeIcon = (skillType: string) => {
    switch (skillType) {
      case 'damage':
        return <Zap className="w-5 h-5 text-white" />;
      case 'healing':
        return <Heart className="w-5 h-5 text-yellow-400" />;
      case 'social':
        return <MessageCircle className="w-5 h-5 text-yellow-400" />;
      default:
        return <BookOpen className="w-5 h-5 text-gray-400" />;
    }
  };

  const getSkillTypeColor = (skillType: string) => {
    switch (skillType) {
      case 'damage':
        return 'text-white';
      case 'healing':
        return 'text-yellow-400';
      case 'social':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common':
        return 'text-gray-400 border-gray-400';
      case 'uncommon':
        return 'text-yellow-400 border-yellow-400';
      case 'rare':
        return 'text-yellow-400 border-yellow-400';
      case 'epic':
        return 'text-yellow-400 border-gray-700';
      case 'legendary':
        return 'text-yellow-400 border-yellow-400';
      default:
        return 'text-gray-400 border-gray-400';
    }
  };

  const getLevelStars = (level: number) => {
    return Array.from({ length: 3 }, (_, index) => (
      <Star
        key={index}
        className={`w-4 h-4 ${
          index < level ? 'text-yellow-400 fill-current' : 'text-gray-600'
        }`}
      />
    ));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg border border-gray-700 max-w-md w-full max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-6 h-6 text-yellow-400" />
            <h2 className="text-xl font-bold text-white">Chi Tiết Skill Book</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Skill Book Info */}
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                {getSkillTypeIcon(skillBook.skillType)}
                <div>
                  <h3 className="text-white font-semibold text-lg">{skillBook.name}</h3>
                  <p className={`text-sm ${getSkillTypeColor(skillBook.skillType)}`}>
                    {skillInfo.skillTypeName}
                  </p>
                </div>
              </div>
              <div className={`px-2 py-1 rounded border text-xs font-medium ${getRarityColor(skillBook.rarity)}`}>
                {skillInfo.rarityName}
              </div>
            </div>

            {/* Level Stars */}
            <div className="flex items-center space-x-1 mb-3">
              <span className="text-gray-300 text-sm mr-2">Level:</span>
              {getLevelStars(skillBook.skillLevel)}
              <span className="text-gray-300 text-sm ml-2">
                ({skillInfo.levelName})
              </span>
            </div>

            {/* Description */}
            <p className="text-gray-300 text-sm leading-relaxed">
              {skillBook.description}
            </p>
          </div>

          {/* Warning */}
          <div className="bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-yellow-400 font-medium text-sm mb-1">Lưu ý quan trọng</h4>
                <p className="text-yellow-200 text-xs">
                  Skill sẽ được chọn ngẫu nhiên khi sử dụng. Bạn không thể chọn skill cụ thể.
                </p>
              </div>
            </div>
          </div>

          {/* Price Info */}
          {isBuying && (
            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Giá:</span>
                <span className="text-yellow-400 font-semibold text-lg">{price} gold</span>
              </div>
              {!canAfford && (
                <p className="text-white text-sm mt-2">
                  Bạn không có đủ tiền để mua skill book này.
                </p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={onConfirm}
              disabled={isBuying && !canAfford}
              className={`flex-1 py-2 px-4 rounded-md transition-colors ${
                isBuying && !canAfford
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-yellow-600 hover:bg-yellow-700 text-white'
              }`}
            >
              {isBuying ? 'Mua Skill Book' : 'Sử dụng Skill Book'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
