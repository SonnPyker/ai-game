import { motion } from 'framer-motion';
import { CharacterClass, CharacterRace } from '../../types';

interface CharacterPreviewProps {
  name: string;
  charClass: CharacterClass | null;
  race: CharacterRace | null;
  gender: 'male' | 'female' | 'other';
  age: number;
  height: number;
  weight: number;
  hairColor: string;
  eyeColor: string;
  skinColor: string;
}

export function CharacterPreview({
  name,
  charClass,
  race,
  gender,
  age,
  height,
  weight,
  hairColor,
  eyeColor,
  skinColor
}: CharacterPreviewProps) {
  return (
    <motion.div
      className="glass-effect p-6 rounded-xl"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <h3 className="text-xl font-fantasy font-bold text-white mb-6 text-center">
        Xem Trước Nhân Vật
      </h3>
      
      <div className="text-center">
        {/* Character Avatar */}
        <motion.div
          className="w-32 h-32 mx-auto mb-6 rounded-full border-4 border-white/20 flex items-center justify-center text-6xl"
          style={{ backgroundColor: skinColor }}
          animate={{ 
            boxShadow: [
              '0 0 20px rgba(59, 130, 246, 0.3)',
              '0 0 30px rgba(147, 51, 234, 0.4)',
              '0 0 20px rgba(59, 130, 246, 0.3)'
            ]
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {charClass?.icon || '👤'}
        </motion.div>

        {/* Character Info */}
        <div className="space-y-3">
          <h4 className="text-2xl font-bold text-white">
            {name || 'Tên Nhân Vật'}
          </h4>
          
          <div className="flex justify-center space-x-4 text-sm text-gray-300">
            {charClass && (
              <span className="px-3 py-1 bg-primary-500/20 rounded-full border border-primary-500/30">
                {charClass.name}
              </span>
            )}
            {race && (
              <span className="px-3 py-1 bg-secondary-500/20 rounded-full border border-secondary-500/30">
                {race.name}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="glass-effect p-3 rounded-lg">
              <div className="text-gray-400">Tuổi</div>
              <div className="text-white font-semibold">{age}</div>
            </div>
            <div className="glass-effect p-3 rounded-lg">
              <div className="text-gray-400">Chiều Cao</div>
              <div className="text-white font-semibold">{height}cm</div>
            </div>
            <div className="glass-effect p-3 rounded-lg">
              <div className="text-gray-400">Cân Nặng</div>
              <div className="text-white font-semibold">{weight}kg</div>
            </div>
            <div className="glass-effect p-3 rounded-lg">
              <div className="text-gray-400">Giới Tính</div>
              <div className="text-white font-semibold">
                {gender === 'male' ? 'Nam' : gender === 'female' ? 'Nữ' : 'Khác'}
              </div>
            </div>
          </div>

          {/* Appearance Colors */}
          <div className="flex justify-center space-x-4 mt-4">
            <div className="text-center">
              <div 
                className="w-8 h-8 rounded-full border-2 border-white/30 mx-auto mb-1"
                style={{ backgroundColor: hairColor }}
              />
              <span className="text-xs text-gray-400">Tóc</span>
            </div>
            <div className="text-center">
              <div 
                className="w-8 h-8 rounded-full border-2 border-white/30 mx-auto mb-1"
                style={{ backgroundColor: eyeColor }}
              />
              <span className="text-xs text-gray-400">Mắt</span>
            </div>
            <div className="text-center">
              <div 
                className="w-8 h-8 rounded-full border-2 border-white/30 mx-auto mb-1"
                style={{ backgroundColor: skinColor }}
              />
              <span className="text-xs text-gray-400">Da</span>
            </div>
          </div>

          {/* Class and Race Details */}
          {(charClass || race) && (
            <div className="mt-6 space-y-4">
              {charClass && (
                <div className="glass-effect p-4 rounded-lg">
                  <h5 className="font-semibold text-white mb-2 flex items-center">
                    <span className="mr-2">{charClass.icon}</span>
                    {charClass.name}
                  </h5>
                  <p className="text-sm text-gray-300 mb-2">
                    {charClass.description}
                  </p>
                  <div className="text-xs text-gray-400">
                    <span className="font-medium">Chỉ số chính:</span> {charClass.primaryStats.join(', ')}
                  </div>
                </div>
              )}
              
              {race && (
                <div className="glass-effect p-4 rounded-lg">
                  <h5 className="font-semibold text-white mb-2 flex items-center">
                    <span className="mr-2">{race.icon}</span>
                    {race.name}
                  </h5>
                  <p className="text-sm text-gray-300 mb-2">
                    {race.description}
                  </p>
                  <div className="text-xs text-gray-400">
                    <span className="font-medium">Khả năng đặc biệt:</span> {race.specialAbilities.join(', ')}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
