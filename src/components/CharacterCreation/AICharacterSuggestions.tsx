import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, RefreshCw, Check } from 'lucide-react';
import { geminiService } from '../../services/geminiService';
import { CharacterClass, CharacterRace } from '../../types';

interface AISuggestions {
  name: string;
  personality: string;
  backstory: string;
  goals: string[];
}

interface AICharacterSuggestionsProps {
  selectedRace: CharacterRace | null;
  selectedClass: CharacterClass | null;
  worldTheme?: string;
  onApplySuggestion: (suggestion: Partial<AISuggestions>) => void;
}

export function AICharacterSuggestions({
  selectedRace,
  selectedClass,
  worldTheme = 'Fantasy',
  onApplySuggestion
}: AICharacterSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<AISuggestions | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string>('');

  const handleGenerateSuggestions = async () => {
    if (!selectedRace || !selectedClass) {
      setError('Vui lòng chọn chủng tộc và nghề nghiệp trước');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const aiSuggestions = await geminiService.generateCharacterSuggestions(
        selectedRace.name,
        selectedClass.name,
        worldTheme
      );
      
      setSuggestions(aiSuggestions);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Lỗi khi tạo gợi ý');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplySuggestion = (field: keyof AISuggestions) => {
    if (suggestions) {
      onApplySuggestion({ [field]: suggestions[field] });
    }
  };

  const handleApplyAll = () => {
    if (suggestions) {
      onApplySuggestion(suggestions);
    }
  };

  return (
    <motion.div
      className="glass-effect p-6 rounded-xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-r from-secondary-500 to-primary-500 rounded-lg flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">AI Character Suggestions</h3>
          <p className="text-sm text-gray-300">Nhận gợi ý từ AI cho nhân vật của bạn</p>
        </div>
      </div>

      {!geminiService.isConfigured() && (
        <div className="p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-lg mb-4">
          <p className="text-yellow-300 text-sm">
            ⚠️ Cần cấu hình Google Gemini API key để sử dụng tính năng này.
            Vào Settings để cấu hình.
          </p>
        </div>
      )}

      <div className="space-y-4">
        <button
          onClick={handleGenerateSuggestions}
          disabled={isGenerating || !selectedRace || !selectedClass || !geminiService.isConfigured()}
          className="w-full btn-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {isGenerating ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>AI đang suy nghĩ...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Tạo Gợi Ý với AI</span>
            </>
          )}
        </button>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg"
          >
            <p className="text-red-300 text-sm">{error}</p>
          </motion.div>
        )}

        {suggestions && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-4"
          >
            {/* Name Suggestion */}
            <div className="p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-white">Tên Nhân Vật</h4>
                <button
                  onClick={() => handleApplySuggestion('name')}
                  className="p-1 text-green-400 hover:text-green-300 transition-colors duration-200"
                  title="Áp dụng gợi ý"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
              <p className="text-gray-300 text-sm">{suggestions.name}</p>
            </div>

            {/* Personality Suggestion */}
            <div className="p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-white">Tính Cách</h4>
                <button
                  onClick={() => handleApplySuggestion('personality')}
                  className="p-1 text-green-400 hover:text-green-300 transition-colors duration-200"
                  title="Áp dụng gợi ý"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
              <p className="text-gray-300 text-sm">{suggestions.personality}</p>
            </div>

            {/* Backstory Suggestion */}
            <div className="p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-white">Câu Chuyện Nền</h4>
                <button
                  onClick={() => handleApplySuggestion('backstory')}
                  className="p-1 text-green-400 hover:text-green-300 transition-colors duration-200"
                  title="Áp dụng gợi ý"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
              <p className="text-gray-300 text-sm">{suggestions.backstory}</p>
            </div>

            {/* Goals Suggestion */}
            <div className="p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-white">Mục Tiêu</h4>
                <button
                  onClick={() => handleApplySuggestion('goals')}
                  className="p-1 text-green-400 hover:text-green-300 transition-colors duration-200"
                  title="Áp dụng gợi ý"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
              <ul className="text-gray-300 text-sm space-y-1">
                {suggestions.goals.map((goal, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <span className="text-primary-400 mt-1">•</span>
                    <span>{goal}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Apply All Button */}
            <button
              onClick={handleApplyAll}
              className="w-full btn-primary flex items-center justify-center space-x-2"
            >
              <Check className="w-4 h-4" />
              <span>Áp Dụng Tất Cả Gợi Ý</span>
            </button>

            {/* Regenerate Button */}
            <button
              onClick={handleGenerateSuggestions}
              disabled={isGenerating}
              className="w-full bg-white/10 border border-white/20 rounded-lg text-white py-2 px-4 hover:bg-white/20 transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Tạo Gợi Ý Mới</span>
            </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
