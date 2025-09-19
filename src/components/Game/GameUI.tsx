import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Heart, 
  Zap, 
  Star, 
  Package, 
  BookOpen,
  BarChart3,
  Settings,
  X
} from 'lucide-react';
import { Character } from '../../types';

interface GameUIProps {
  character: Character;
  onTogglePanel: (panel: string) => void;
  activePanel: string | null;
}

export function GameUI({ character, onTogglePanel, activePanel }: GameUIProps) {
  const [isMinimized, setIsMinimized] = useState(false);

  const stats = [
    { label: 'Sức Khỏe', value: character.stats?.health || 100, max: 100, icon: Heart, color: 'text-red-400' },
    { label: 'Mana', value: character.stats?.mana || 100, max: 100, icon: Zap, color: 'text-blue-400' },
    { label: 'Kinh Nghiệm', value: character.stats?.experience || 0, max: 1000, icon: Star, color: 'text-yellow-400' },
  ];

  const panels = [
    { id: 'inventory', label: 'Túi Đồ', icon: Package, color: 'from-green-500 to-green-600' },
    { id: 'quests', label: 'Nhiệm Vụ', icon: BookOpen, color: 'from-purple-500 to-purple-600' },
    { id: 'stats', label: 'Thống Kê', icon: BarChart3, color: 'from-blue-500 to-blue-600' },
    { id: 'settings', label: 'Cài Đặt', icon: Settings, color: 'from-gray-500 to-gray-600' },
  ];

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50">
      <motion.div
        className="glass-effect rounded-2xl p-4"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Character Info Bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full flex items-center justify-center">
              <span className="text-2xl">{character.class.icon}</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{character.name}</h3>
              <p className="text-sm text-gray-300">
                {character.race.name} {character.class.name} - Cấp {character.level}
              </p>
            </div>
          </div>
          
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-2 text-gray-300 hover:text-white transition-colors duration-200"
          >
            {isMinimized ? '↑' : '↓'}
          </button>
        </div>

        {!isMinimized && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Stats Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {stats.map((stat) => {
                const Icon = stat.icon;
                const percentage = (stat.value / stat.max) * 100;
                
                return (
                  <div key={stat.label} className="glass-effect p-3 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Icon className={`w-4 h-4 ${stat.color}`} />
                        <span className="text-sm font-medium text-gray-300">
                          {stat.label}
                        </span>
                      </div>
                      <span className="text-sm text-white font-semibold">
                        {stat.value}/{stat.max}
                      </span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <motion.div
                        className={`h-2 rounded-full ${
                          stat.label === 'Sức Khỏe' ? 'bg-red-500' :
                          stat.label === 'Mana' ? 'bg-blue-500' : 'bg-yellow-500'
                        }`}
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 1, delay: 0.5 }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action Panels */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {panels.map((panel) => {
                const Icon = panel.icon;
                return (
                  <button
                    key={panel.id}
                    onClick={() => onTogglePanel(panel.id)}
                    className={`p-3 rounded-lg bg-gradient-to-r ${panel.color} text-white transition-all duration-300 hover:scale-105 hover:shadow-lg flex flex-col items-center space-y-2`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs font-medium">{panel.label}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Panel Overlays */}
      {activePanel && (
        <motion.div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => onTogglePanel('')}
        >
          <motion.div
            className="glass-effect p-6 rounded-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-fantasy font-bold text-gradient">
                {panels.find(p => p.id === activePanel)?.label}
              </h2>
              <button
                onClick={() => onTogglePanel('')}
                className="p-2 text-gray-300 hover:text-white transition-colors duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="text-center text-gray-300">
              <p>Panel {activePanel} sẽ được phát triển trong phiên bản tiếp theo.</p>
              <p className="text-sm mt-2">Tính năng này đang được xây dựng...</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
