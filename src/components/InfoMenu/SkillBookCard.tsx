import { SkillBook } from '../../types';
import { 
  BookOpen, 
  Star,
  Trash2,
  Zap
} from 'lucide-react';

interface SkillBookCardProps {
  skillBook: SkillBook;
  onUse?: (skillBook: SkillBook) => void;
  onDrop?: (skillBookId: string) => void;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export function SkillBookCard({ 
  skillBook, 
  onUse,
  onDrop,
  size = 'medium',
  className = ''
}: SkillBookCardProps) {

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'text-gray-400';
      case 'uncommon': return 'text-yellow-400';
      case 'rare': return 'text-yellow-400';
      case 'epic': return 'text-yellow-400';
      case 'legendary': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const getRarityBg = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'bg-gray-800/50 border-gray-600/50';
      case 'uncommon': return 'bg-gray-900/20 border-yellow-600/50';
      case 'rare': return 'bg-yellow-900/20 border-yellow-600/50';
      case 'epic': return 'bg-gray-950/20 border-yellow-600/50';
      case 'legendary': return 'bg-yellow-900/20 border-yellow-600/50';
      default: return 'bg-gray-800/50 border-gray-600/50';
    }
  };

  const sizeClasses = {
    small: 'p-3',
    medium: 'p-4',
    large: 'p-5'
  };

  return (
    <div className={`relative ${getRarityBg(skillBook.rarity)} border rounded-lg ${sizeClasses[size]} ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <BookOpen className="w-5 h-5 text-yellow-400" />
          <div>
            <h3 className="font-medium text-white text-sm">{skillBook.name}</h3>
            <p className={`text-xs ${getRarityColor(skillBook.rarity)}`}>
              {skillBook.rarity.toUpperCase()}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-1">
          <Star className="w-4 h-4 text-yellow-400" />
          <span className="text-xs text-gray-400">Skill Book</span>
        </div>
      </div>

      {/* Description */}
      <p className="text-gray-300 text-xs mb-3 line-clamp-2">
        {skillBook.description}
      </p>

      {/* Skill Info */}
      {skillBook.skillData && (
        <div className="bg-gray-950/30 rounded p-2 mb-3">
          <div className="flex items-center justify-between text-xs">
            <div>
              <span className="text-yellow-300">Loại:</span>
              <span className="text-white ml-1">
                {skillBook.skillData.skillType === 'damage' ? 'Tấn Công' :
                 skillBook.skillData.skillType === 'healing' ? 'Hồi Phục' : 'Xã Hội'}
              </span>
            </div>
            <div>
              <span className="text-yellow-300">Level:</span>
              <span className="text-white ml-1">
                {skillBook.skillData.level === 1 ? 'Cơ Bản' :
                 skillBook.skillData.level === 2 ? 'Nâng Cao' : 'Bậc Thầy'}
              </span>
            </div>
          </div>
          <div className="mt-1">
            <span className="text-yellow-300 text-xs">Skill:</span>
            <span className="text-white ml-1 text-xs">{skillBook.skillData.name}</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex space-x-2">
        {onUse && (
          <button
            onClick={() => onUse(skillBook)}
            className="flex-1 px-3 py-2 bg-yellow-600/80 hover:bg-yellow-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-1"
          >
            <Zap className="w-4 h-4" />
            <span>Sử dụng</span>
          </button>
        )}
        
        {onDrop && (
          <button
            onClick={() => onDrop(skillBook.id)}
            className="px-3 py-2 bg-gray-900/80 hover:bg-gray-800 text-white rounded-lg text-sm transition-colors flex items-center justify-center"
            title="Vứt bỏ"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
