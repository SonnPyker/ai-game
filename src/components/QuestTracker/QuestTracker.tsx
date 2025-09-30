import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, 
  CheckCircle, 
  Clock, 
  Lock, 
  Star, 
  Gift,
  Trophy,
  AlertCircle,
  Play,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { QuestProgress, QuestSystem } from '../../types';

interface QuestTrackerProps {
  questSystem: QuestSystem;
  onQuestUpdate: (questId: string, objectiveId: string, completed: boolean) => void;
  onQuestAccept: (questId: string) => void;
  onQuestDecline: (questId: string) => void;
  onClaimReward: (questId: string, rewardId: string) => void;
}

export function QuestTracker({ 
  questSystem, 
  onQuestUpdate, 
  onQuestAccept, 
  onQuestDecline,
  onClaimReward 
}: QuestTrackerProps) {
  // Suppress unused parameter warnings for future use
  void onQuestAccept;
  void onQuestDecline;
  
  // State để quản lý trạng thái collapse của từng quest
  const [collapsedQuests, setCollapsedQuests] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'main' | 'side'>('main');

  // Toggle collapse state của quest
  const toggleQuestCollapse = (questId: string) => {
    setCollapsedQuests(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questId)) {
        newSet.delete(questId);
      } else {
        newSet.add(questId);
      }
      return newSet;
    });
  };

  // Tính progress của quest
  const getQuestProgress = (quest: QuestProgress) => {
    const completedObjectives = quest.objectives.filter(obj => obj.completed).length;
    const totalObjectives = quest.objectives.length;
    return totalObjectives > 0 ? (completedObjectives / totalObjectives) * 100 : 0;
  };

  // Lấy status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'active':
        return <Play className="w-4 h-4 text-blue-400" />;
      case 'locked':
        return <Lock className="w-4 h-4 text-gray-400" />;
      case 'available':
        return <Target className="w-4 h-4 text-yellow-400" />; // Icon khác cho side quest available
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-400" />;
    }
  };

  // Render quest card
  const renderQuestCard = (quest: QuestProgress) => {
    const progress = getQuestProgress(quest);
    const isCompleted = quest.status === 'completed';
    const isLocked = quest.status === 'locked';

    return (
      <motion.div
        key={quest.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-gray-800/50 rounded-lg p-4 border-2 transition-all duration-200 ${
          isCompleted 
            ? 'border-green-500/50 bg-green-900/20' 
            : isLocked
            ? 'border-gray-500/30 bg-gray-900/20'
            : 'border-blue-500/30 hover:border-blue-500/50'
        }`}
      >
        {/* Quest Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => toggleQuestCollapse(quest.id)}
              className="flex items-center justify-center w-6 h-6 rounded hover:bg-gray-700/50 transition-colors"
              title={collapsedQuests.has(quest.id) ? 'Mở rộng quest' : 'Thu gọn quest'}
            >
              {collapsedQuests.has(quest.id) ? (
                <ChevronRight className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>
            {getStatusIcon(quest.status)}
            <h3 className="text-lg font-semibold text-white">{quest.title}</h3>
            {quest.act && (
              <span className="px-2 py-1 bg-blue-600/30 text-blue-200 text-xs rounded">
                Act {quest.act}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {!isLocked && (
              <>
                <span className="text-sm text-gray-400">
                  {Math.round(progress)}%
                </span>
                <Trophy className="w-4 h-4 text-yellow-400" />
              </>
            )}
            {isLocked && (
              <span className="text-xs text-gray-500 italic">Bị khóa</span>
            )}
          </div>
        </div>

        {/* Quest Content - Collapsible */}
        <AnimatePresence>
          {!collapsedQuests.has(quest.id) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              {/* Quest Description */}
              <p className="text-sm text-gray-300 mb-3">{quest.description}</p>

        {/* Progress Bar - Chỉ hiển thị khi quest không bị khóa */}
        {!isLocked && (
          <div className="w-full bg-gray-700 rounded-full h-2 mb-3">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                isCompleted ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Objectives - Chỉ hiển thị khi quest không bị khóa */}
        {quest.objectives.length > 0 && !isLocked && (
          <div className="space-y-2 mb-3">
            <h4 className="text-sm font-medium text-gray-400">Mục tiêu:</h4>
            {quest.objectives
              .filter(objective => objective.unlocked) // Chỉ hiển thị objectives đã unlock
              .map((objective) => (
                <div key={objective.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={objective.completed}
                    onChange={(e) => onQuestUpdate(quest.id, objective.id, e.target.checked)}
                    disabled={isLocked}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                  />
                  <span className={`text-sm ${
                    objective.completed ? 'text-green-400 line-through' : 'text-white'
                  }`}>
                    {objective.description}
                  </span>
                  {objective.completed && (
                    <CheckCircle className="w-3 h-3 text-green-400" />
                  )}
                </div>
              ))}
            {/* Hiển thị số objectives chưa unlock */}
            {quest.objectives.filter(obj => !obj.unlocked).length > 0 && (
              <div className="text-xs text-gray-500 italic">
                +{quest.objectives.filter(obj => !obj.unlocked).length} mục tiêu sẽ được tiết lộ...
              </div>
            )}
          </div>
        )}

        {/* Thông báo cho quest bị khóa */}
        {isLocked && (
          <div className="text-center py-4 text-gray-400">
            <Lock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm italic">Quest này sẽ được mở khóa sau khi hoàn thành quest trước đó</p>
          </div>
        )}

        {/* Rewards - Chỉ hiển thị khi quest không bị khóa */}
        {quest.rewards.length > 0 && !isLocked && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-400">Phần thưởng:</h4>
            <div className="flex flex-wrap gap-2">
              {quest.rewards.map((reward, index) => (
                <div
                  key={index}
                  className={`flex items-center space-x-1 px-2 py-1 rounded text-xs ${
                    reward.claimed 
                      ? 'bg-green-600/30 text-green-300' 
                      : 'bg-yellow-600/30 text-yellow-300'
                  }`}
                >
                  <Gift className="w-3 h-3" />
                  <span>{reward.description}</span>
                  {!reward.claimed && isCompleted && (
                    <button
                      onClick={() => onClaimReward(quest.id, reward.type)}
                      className="ml-1 text-yellow-200 hover:text-yellow-100"
                    >
                      Claim
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  // Render main quests
  const renderMainQuests = () => {
    const mainQuests = questSystem.mainQuests;
    
    if (mainQuests.length === 0) {
      return (
        <div className="text-center py-8">
          <Target className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-400">Chưa có quest chính nào</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Act Progress */}
        <div className="bg-gray-800/50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
            <Star className="w-5 h-5 mr-2 text-yellow-400" />
            Tiến Độ Cốt Truyện
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Act hiện tại:</span>
              <span className="text-white">Act {questSystem.currentAct}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Tổng số Act:</span>
              <span className="text-white">{questSystem.totalActs}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(questSystem.currentAct / questSystem.totalActs) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Main Quests */}
        {mainQuests.map(renderQuestCard)}
      </div>
    );
  };

  // Render side quests
  const renderSideQuests = () => {
    const sideQuests = questSystem.sideQuests;
    
    if (sideQuests.length === 0) {
      return (
        <div className="text-center py-8">
          <Target className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-400">Chưa có quest phụ nào</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {sideQuests.map(renderQuestCard)}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-700/50">
        <button
          onClick={() => setActiveTab('main')}
          className={`flex items-center space-x-2 px-4 py-3 text-sm transition-colors duration-200 ${
            activeTab === 'main'
              ? 'bg-blue-600/20 border-b-2 border-blue-500 text-blue-300'
              : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
          }`}
        >
          <Star className="w-4 h-4" />
          <span>Quest Chính ({questSystem.mainQuests.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('side')}
          className={`flex items-center space-x-2 px-4 py-3 text-sm transition-colors duration-200 ${
            activeTab === 'side'
              ? 'bg-blue-600/20 border-b-2 border-blue-500 text-blue-300'
              : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
          }`}
        >
          <Target className="w-4 h-4" />
          <span>Quest Phụ ({questSystem.sideQuests.length})</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'main' ? renderMainQuests() : renderSideQuests()}
      </div>
    </div>
  );
}
