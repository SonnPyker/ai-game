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
  ChevronRight,
  Trash2,
  Users,
  Plus,
  Loader2
} from 'lucide-react';
import { QuestProgress, QuestSystem } from '../../types';
import { npcRelationshipService } from '../../services/npcRelationshipService';

interface QuestTrackerProps {
  questSystem: QuestSystem;
  onQuestUpdate: (questId: string, objectiveId: string, completed: boolean) => void;
  onQuestAccept: (questId: string) => void;
  onQuestDecline: (questId: string) => void;
  onQuestDeclineActive: (questId: string) => void;
  onClaimReward: (questId: string, rewardId: string) => void;
  onRemoveDeclinedQuests?: () => void;
  onCreateFactionQuest?: (factionName: string) => Promise<QuestProgress | null>;
  isAIProcessing?: boolean;
  isNPCAnalysisProcessing?: boolean;
}

export function QuestTracker({ 
  questSystem, 
  onQuestUpdate, 
  onQuestAccept, 
  onQuestDecline,
  onQuestDeclineActive,
  onClaimReward,
  onRemoveDeclinedQuests,
  onCreateFactionQuest,
  isAIProcessing,
  isNPCAnalysisProcessing
}: QuestTrackerProps) {
  // Suppress unused parameter warnings for future use
  void onQuestAccept;
  void onQuestDecline;
  
  // State để quản lý trạng thái collapse của từng quest
  const [collapsedQuests, setCollapsedQuests] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'main' | 'side' | 'faction'>('main');
  const [isCreatingQuest, setIsCreatingQuest] = useState<string | null>(null);

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

  // Check if faction has enough reputation
  const checkFactionReputation = (factionName: string) => {
    const factionReputation = npcRelationshipService.calculateFactionReputation(factionName);
    return factionReputation.reputation >= 100;
  };

  // Check if any AI processing is happening
  const isAnyAIProcessing = isAIProcessing || isNPCAnalysisProcessing;

  // Handle create faction quest
  const handleCreateFactionQuest = async (factionName: string) => {
    if (!onCreateFactionQuest) return;
    
    // Check if AI is processing
    if (isAnyAIProcessing) {
      alert('AI đang xử lý yêu cầu khác. Vui lòng đợi hoàn thành trước khi tạo quest phe phái.');
      return;
    }
    
    // Check reputation before creating quest
    if (!checkFactionReputation(factionName)) {
      const factionReputation = npcRelationshipService.calculateFactionReputation(factionName);
      alert(`Không thể tạo quest phe phái!\n\nDanh tiếng hiện tại: ${factionReputation.reputation}/100\nCần đạt ít nhất 100 điểm danh tiếng để tạo quest phe phái.`);
      return;
    }
    
    setIsCreatingQuest(factionName);
    try {
      await onCreateFactionQuest(factionName);
    } catch (error) {
      console.error('Lỗi tạo faction quest:', error);
      alert('Có lỗi xảy ra khi tạo quest phe phái. Vui lòng thử lại.');
    } finally {
      setIsCreatingQuest(null);
    }
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
      case 'declined':
        return <AlertCircle className="w-4 h-4 text-red-400" />; // Icon cho quest đã từ chối
      default:
        return <Clock className="w-4 h-4 text-yellow-400" />;
    }
  };

  // Render quest card
  const renderQuestCard = (quest: QuestProgress) => {
    const progress = getQuestProgress(quest);
    const isCompleted = quest.status === 'completed';
    const isLocked = quest.status === 'locked';
    const isDeclined = quest.status === 'declined';

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
            : isDeclined
            ? 'border-red-500/30 bg-red-900/20'
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
            {!isLocked && !isDeclined && (
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
            {isDeclined && (
              <span className="text-xs text-red-400 italic">Đã từ chối</span>
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

        {/* Progress Bar - Chỉ hiển thị khi quest không bị khóa và không bị từ chối */}
        {!isLocked && !isDeclined && (
          <div className="w-full bg-gray-700 rounded-full h-2 mb-3">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                isCompleted ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Objectives - Chỉ hiển thị khi quest không bị khóa và không bị từ chối */}
        {quest.objectives.length > 0 && !isLocked && !isDeclined && (
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

        {/* Thông báo cho quest đã từ chối */}
        {isDeclined && (
          <div className="text-center py-4 text-red-400">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm italic">Quest này đã bị từ chối và không thể nhận lại</p>
          </div>
        )}

        {/* Rewards - Chỉ hiển thị khi quest không bị khóa và không bị từ chối */}
        {quest.rewards.length > 0 && !isLocked && !isDeclined && (
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

        {/* Quest Actions - Cho side quest available và active */}
        {quest.type === 'side' && !isLocked && !isDeclined && (quest.status === 'active' || quest.status === 'available') && (
          <div className="flex justify-end space-x-2 mt-3 pt-3 border-t border-gray-700/50">
            <button
              onClick={() => onQuestDeclineActive(quest.id)}
              className="px-3 py-1 bg-red-600/20 border border-red-500/50 text-red-300 rounded text-sm hover:bg-red-600/30 transition-colors"
            >
              Từ chối Quest
            </button>
          </div>
        )}

        {/* Hiển thị trạng thái cho quest đã từ chối */}
        {quest.type === 'side' && quest.status === 'declined' && (
          <div className="flex justify-end space-x-2 mt-3 pt-3 border-t border-gray-700/50">
            <span className="px-3 py-1 bg-gray-600/20 border border-gray-500/50 text-gray-400 rounded text-sm">
              Đã từ chối
            </span>
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
    const declinedQuests = sideQuests.filter(q => q.status === 'declined');
    
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
        {/* Nút xóa quest đã từ chối */}
        {declinedQuests.length > 0 && onRemoveDeclinedQuests && (
          <div className="flex justify-end mb-3">
            <button
              onClick={onRemoveDeclinedQuests}
              className="px-3 py-1 bg-gray-600/20 border border-gray-500/50 text-gray-300 rounded text-sm hover:bg-gray-600/30 transition-colors flex items-center space-x-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>Xóa quest đã từ chối ({declinedQuests.length})</span>
            </button>
          </div>
        )}
        
        {sideQuests.map(renderQuestCard)}
      </div>
    );
  };

  // Render faction quests
  const renderFactionQuests = () => {
    const factionQuests = questSystem.factionQuests;
    
    // Get available factions from world data
    const worldData = localStorage.getItem('world_gen_result');
    let availableFactions: any[] = [];
    if (worldData) {
      try {
        const parsed = JSON.parse(worldData);
        availableFactions = parsed.factions || [];
      } catch (error) {
        console.error('Lỗi parse world data:', error);
      }
    }

    if (factionQuests.length === 0) {
      return (
        <div className="space-y-4">
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-400">Chưa có quest phe phái nào</p>
            <p className="text-gray-500 text-sm mt-2">
              Quest phe phái sẽ xuất hiện khi danh tiếng phe phái đạt 100 điểm trở lên
            </p>
          </div>
          
           {/* Create quest buttons for available factions */}
           {availableFactions.length > 0 && (
             <div className="space-y-3">
               <h4 className="text-md font-semibold text-white">Tạo Quest Phe Phái:</h4>
               <div className="grid grid-cols-1 gap-2">
                 {availableFactions.map((faction: any) => {
                   const factionReputation = npcRelationshipService.calculateFactionReputation(faction.name);
                   const canCreateQuest = checkFactionReputation(faction.name);
                   
                   return (
                     <button
                       key={faction.name}
                       onClick={() => handleCreateFactionQuest(faction.name)}
                       disabled={isCreatingQuest === faction.name || isAnyAIProcessing}
                       className={`flex items-center justify-between p-3 rounded-lg transition-colors disabled:opacity-50 ${
                         canCreateQuest 
                           ? 'bg-gray-700/50 hover:bg-gray-700/70' 
                           : 'bg-red-900/20 border border-red-500/30 hover:bg-red-900/30'
                       }`}
                       title={isAnyAIProcessing ? 'AI đang xử lý, vui lòng đợi...' : !canCreateQuest ? 'Cần 100 điểm danh tiếng để tạo quest' : 'Tạo quest phe phái'}
                     >
                       <div className="flex items-center space-x-2">
                         <Users className="w-4 h-4" />
                         <div className="text-left">
                           <div className="text-white">{faction.name}</div>
                           <div className={`text-xs ${
                             canCreateQuest ? 'text-green-400' : 'text-red-400'
                           }`}>
                             Danh tiếng: {factionReputation.reputation}/100
                             {!canCreateQuest && ' (Chưa đủ)'}
                           </div>
                         </div>
                       </div>
                       {isCreatingQuest === faction.name ? (
                         <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                       ) : isAnyAIProcessing ? (
                         <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
                       ) : canCreateQuest ? (
                         <Plus className="w-4 h-4 text-gray-400" />
                       ) : (
                         <AlertCircle className="w-4 h-4 text-red-400" />
                       )}
                     </button>
                   );
                 })}
               </div>
             </div>
           )}
        </div>
      );
    }

    // Group faction quests by faction
    const questsByFaction = factionQuests.reduce((acc, quest) => {
      const faction = quest.factionName || 'Không xác định';
      if (!acc[faction]) {
        acc[faction] = [];
      }
      acc[faction].push(quest);
      return acc;
    }, {} as Record<string, QuestProgress[]>);

    return (
      <div className="space-y-6">
        {Object.entries(questsByFaction).map(([factionName, quests]) => (
          <div key={factionName} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>{factionName}</span>
                <span className="text-sm text-gray-400">({quests.length})</span>
              </h3>
               <button
                 onClick={() => handleCreateFactionQuest(factionName)}
                 disabled={isCreatingQuest === factionName || isAnyAIProcessing}
                 className={`flex items-center space-x-1 px-2 py-1 rounded text-xs transition-colors disabled:opacity-50 ${
                   checkFactionReputation(factionName)
                     ? 'bg-blue-600/20 border border-blue-500/50 text-blue-300 hover:bg-blue-600/30'
                     : 'bg-red-600/20 border border-red-500/50 text-red-300 hover:bg-red-600/30'
                 }`}
                 title={isAnyAIProcessing ? 'AI đang xử lý, vui lòng đợi...' : !checkFactionReputation(factionName) ? 'Cần 100 điểm danh tiếng để tạo quest' : 'Tạo quest phe phái'}
               >
                 {isCreatingQuest === factionName ? (
                   <Loader2 className="w-3 h-3 animate-spin" />
                 ) : isAnyAIProcessing ? (
                   <Loader2 className="w-3 h-3 animate-spin text-yellow-400" />
                 ) : checkFactionReputation(factionName) ? (
                   <Plus className="w-3 h-3" />
                 ) : (
                   <AlertCircle className="w-3 h-3" />
                 )}
                 <span>Tạo Quest</span>
               </button>
            </div>
            <div className="space-y-3 pl-4">
              {quests.map(renderQuestCard)}
            </div>
          </div>
        ))}
        
         {/* Create quest buttons for factions without quests */}
         {availableFactions.length > 0 && (
           <div className="space-y-3">
             <h4 className="text-md font-semibold text-white">Tạo Quest Cho Phe Phái Khác:</h4>
             <div className="grid grid-cols-1 gap-2">
               {availableFactions
                 .filter(faction => !questsByFaction[faction.name])
                 .map((faction: any) => {
                   const factionReputation = npcRelationshipService.calculateFactionReputation(faction.name);
                   const canCreateQuest = checkFactionReputation(faction.name);
                   
                   return (
                     <button
                       key={faction.name}
                       onClick={() => handleCreateFactionQuest(faction.name)}
                       disabled={isCreatingQuest === faction.name || isAnyAIProcessing}
                       className={`flex items-center justify-between p-3 rounded-lg transition-colors disabled:opacity-50 ${
                         canCreateQuest 
                           ? 'bg-gray-700/50 hover:bg-gray-700/70' 
                           : 'bg-red-900/20 border border-red-500/30 hover:bg-red-900/30'
                       }`}
                       title={isAnyAIProcessing ? 'AI đang xử lý, vui lòng đợi...' : !canCreateQuest ? 'Cần 100 điểm danh tiếng để tạo quest' : 'Tạo quest phe phái'}
                     >
                       <div className="flex items-center space-x-2">
                         <Users className="w-4 h-4" />
                         <div className="text-left">
                           <div className="text-white">{faction.name}</div>
                           <div className={`text-xs ${
                             canCreateQuest ? 'text-green-400' : 'text-red-400'
                           }`}>
                             Danh tiếng: {factionReputation.reputation}/100
                             {!canCreateQuest && ' (Chưa đủ)'}
                           </div>
                         </div>
                       </div>
                       {isCreatingQuest === faction.name ? (
                         <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                       ) : isAnyAIProcessing ? (
                         <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
                       ) : canCreateQuest ? (
                         <Plus className="w-4 h-4 text-gray-400" />
                       ) : (
                         <AlertCircle className="w-4 h-4 text-red-400" />
                       )}
                     </button>
                   );
                 })}
               </div>
             </div>
           )}
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
        <button
          onClick={() => setActiveTab('faction')}
          className={`flex items-center space-x-2 px-4 py-3 text-sm transition-colors duration-200 ${
            activeTab === 'faction'
              ? 'bg-blue-600/20 border-b-2 border-blue-500 text-blue-300'
              : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Quest Phe Phái ({questSystem.factionQuests.length})</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'main' ? renderMainQuests() : activeTab === 'side' ? renderSideQuests() : renderFactionQuests()}
      </div>
    </div>
  );
}
