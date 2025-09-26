import { useState } from 'react';
import { motion } from 'framer-motion';
import { CHARACTER_CLASSES, CHARACTER_RACES } from '../../constants/gameData';
import { CharacterClass, CharacterRace } from '../../types';

interface CharacterFormProps {
  onCharacterCreate: (character: any) => void;
}

export function CharacterForm({ onCharacterCreate }: CharacterFormProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    class: null as CharacterClass | null,
    race: null as CharacterRace | null,
    gender: 'male' as 'male' | 'female' | 'other',
    age: 25,
    height: 170,
    weight: 70,
    hairColor: '#8B4513',
    eyeColor: '#4A90E2',
    skinColor: '#FDBCB4',
    backstory: ''
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handlePrev = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = () => {
    const character = {
      id: Date.now().toString(),
      ...formData,
      level: 1,
      stats: {
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10,
        health: 100,
        mana: 50,
        experience: 0
      },
      createdAt: new Date()
    };
    onCharacterCreate(character);
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <h3 className="text-2xl font-fantasy font-bold text-white mb-6">
              Thông Tin Cơ Bản
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tên Nhân Vật
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Nhập tên nhân vật của bạn..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Giới Tính
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => handleInputChange('gender', e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="male">Nam</option>
                  <option value="female">Nữ</option>
                  <option value="other">Khác</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tuổi
                </label>
                <input
                  type="number"
                  min="16"
                  max="100"
                  value={formData.age}
                  onChange={(e) => handleInputChange('age', parseInt(e.target.value))}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Chiều Cao (cm)
                </label>
                <input
                  type="number"
                  min="120"
                  max="250"
                  value={formData.height}
                  onChange={(e) => handleInputChange('height', parseInt(e.target.value))}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <h3 className="text-2xl font-fantasy font-bold text-white mb-6">
              Chọn Nghề Nghiệp
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {CHARACTER_CLASSES.map((charClass) => (
                <motion.div
                  key={charClass.id}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-300 ${
                    formData.class?.id === charClass.id
                      ? 'border-primary-500 bg-primary-500/20'
                      : 'border-white/20 bg-white/5 hover:border-primary-300 hover:bg-white/10'
                  }`}
                  onClick={() => handleInputChange('class', charClass)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="text-3xl mb-3">{charClass.icon}</div>
                  <h4 className="text-lg font-semibold text-white mb-2">
                    {charClass.name}
                  </h4>
                  <p className="text-sm text-gray-300 mb-3">
                    {charClass.description}
                  </p>
                  <div className="text-xs text-gray-400">
                    <p>Chỉ số chính: {charClass.primaryStats.join(', ')}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <h3 className="text-2xl font-fantasy font-bold text-white mb-6">
              Chọn Chủng Tộc
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {CHARACTER_RACES.map((race) => (
                <motion.div
                  key={race.id}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-300 ${
                    formData.race?.id === race.id
                      ? 'border-secondary-500 bg-secondary-500/20'
                      : 'border-white/20 bg-white/5 hover:border-secondary-300 hover:bg-white/10'
                  }`}
                  onClick={() => handleInputChange('race', race)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="text-3xl mb-3">{race.icon}</div>
                  <h4 className="text-lg font-semibold text-white mb-2">
                    {race.name}
                  </h4>
                  <p className="text-sm text-gray-300 mb-3">
                    {race.description}
                  </p>
                  <div className="text-xs text-gray-400">
                    <p>Khả năng đặc biệt: {race.specialAbilities.join(', ')}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        );

      case 4:
        return (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <h3 className="text-2xl font-fantasy font-bold text-white mb-6">
              Ngoại Hình & Câu Chuyện
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Màu Tóc
                </label>
                <input
                  type="color"
                  value={formData.hairColor}
                  onChange={(e) => handleInputChange('hairColor', e.target.value)}
                  className="w-full h-12 bg-white/10 border border-white/20 rounded-lg cursor-pointer"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Màu Mắt
                </label>
                <input
                  type="color"
                  value={formData.eyeColor}
                  onChange={(e) => handleInputChange('eyeColor', e.target.value)}
                  className="w-full h-12 bg-white/10 border border-white/20 rounded-lg cursor-pointer"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Màu Da
                </label>
                <input
                  type="color"
                  value={formData.skinColor}
                  onChange={(e) => handleInputChange('skinColor', e.target.value)}
                  className="w-full h-12 bg-white/10 border border-white/20 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Câu Chuyện Nền
              </label>
              <textarea
                value={formData.backstory}
                onChange={(e) => handleInputChange('backstory', e.target.value)}
                rows={4}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                placeholder="Kể về quá khứ và động cơ của nhân vật..."
              />
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="glass-effect p-8 rounded-2xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-300">
              Bước {step} / 4
            </span>
            <span className="text-sm font-medium text-gray-300">
              {Math.round((step / 4) * 100)}%
            </span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2">
            <motion.div
              className="bg-primary-500 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(step / 4) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Step Content */}
        {renderStep()}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          <button
            onClick={handlePrev}
            disabled={step === 1}
            className="px-6 py-3 bg-white/10 border border-white/20 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/20 transition-colors duration-200"
          >
            Quay Lại
          </button>
          
          {step < 4 ? (
            <button
              onClick={handleNext}
              disabled={
                (step === 1 && !formData.name) ||
                (step === 2 && !formData.class) ||
                (step === 3 && !formData.race)
              }
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Tiếp Theo
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="btn-secondary"
            >
              Tạo Nhân Vật
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
