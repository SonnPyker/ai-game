import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  X, 
  Pin, 
  PinOff, 
  User, 
  MapPin, 
  Users, 
  Target,
  Heart,
  Zap,
  Shield,
  Sword,
  Brain,
  Eye,
  Star,
  FileText,
  Trash2,
  Clock,
  MessageSquare,
  AlertTriangle,
  EyeOff
} from 'lucide-react';
import { WorldData, Character, WorldTime, QuestSystem, QuestProgress, ContentFlags } from '../../types';
import { npcRelationshipService } from '../../services/npcRelationshipService';
import { worldTimeService } from '../../services/worldTimeService';
import { QuestTracker } from '../QuestTracker/QuestTracker';
import { SCCJournal } from './SCCJournal';
import { NPCArousalBar } from '../NPCArousalBar';
import { useResponsiveContext } from '../../contexts/ResponsiveContext';

interface InfoMenuProps {
  isOpen: boolean;
  onClose: () => void;
  worldData: WorldData | null;
  characterData: Character | null;
  worldTime: WorldTime | null;
  isPinned: boolean;
  onTogglePin: () => void;
  questSystem?: QuestSystem | null;
  onQuestUpdate?: (questId: string, objectiveId: string, completed: boolean) => void;
  onQuestAccept?: (questId: string) => void;
  onQuestDecline?: (questId: string) => void;
  onQuestDeclineActive?: (questId: string) => void;
  onClaimReward?: (questId: string, rewardId: string) => void;
  onRemoveDeclinedQuests?: () => void;
  onCreateFactionQuest?: (factionName: string) => Promise<QuestProgress | null>;
  isAIProcessing?: boolean;
  isNPCAnalysisProcessing?: boolean;
  contentFlags?: ContentFlags;
  // Game info props
  turnCounter?: number;
  onToggleAdultContent?: () => void;
  onToggleAdultIntensity?: () => void;
}

interface MenuSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  isActive: boolean;
}

export function InfoMenu({ 
  isOpen, 
  onClose, 
  worldData, 
  characterData, 
  worldTime,
  isPinned,
  onTogglePin,
  questSystem,
  onQuestUpdate,
  onQuestAccept,
  onQuestDecline,
  onQuestDeclineActive,
  onClaimReward,
  onRemoveDeclinedQuests,
  onCreateFactionQuest,
  isAIProcessing,
  isNPCAnalysisProcessing,
  contentFlags,
  turnCounter,
  onToggleAdultContent,
  onToggleAdultIntensity
}: InfoMenuProps) {
  // Responsive design context
  const { shouldUseMobileLayout } = useResponsiveContext();
  
  // Cache localStorage value để tránh gọi mỗi lần render
  const [activeSection, setActiveSection] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('infoMenuActiveSection');
      // Nếu đang ở gameinfo nhưng không phải mobile, chuyển về character
      if (saved === 'gameinfo' && !shouldUseMobileLayout()) {
        return 'character';
      }
      return saved || 'character';
    } catch (error) {
      // Fallback nếu localStorage không khả dụng (mobile Safari private mode)
      return 'character';
    }
  });
  const [expandedNPCs, setExpandedNPCs] = useState<Set<string>>(new Set());
  const [forceUpdate, setForceUpdate] = useState<number>(0);
  
  // Theo dõi thay đổi responsive và chuyển section khi cần
  useEffect(() => {
    // Nếu đang ở gameinfo nhưng chuyển sang desktop, chuyển về character
    if (activeSection === 'gameinfo' && !shouldUseMobileLayout()) {
      setActiveSection('character');
      try {
        localStorage.setItem('infoMenuActiveSection', 'character');
      } catch (error) {
        // Ignore localStorage errors
      }
    }
  }, [shouldUseMobileLayout, activeSection]);

  // Tối ưu localStorage access cho mobile
  const updateActiveSection = useCallback((sectionId: string) => {
    setActiveSection(sectionId);
    // Sử dụng try-catch để tránh lỗi trên mobile
    try {
      localStorage.setItem('infoMenuActiveSection', sectionId);
    } catch (error) {
      // Ignore localStorage errors on mobile Safari private mode
    }
  }, []);
  
  // Các mục menu chính - chỉ hiện "Thông Tin Game" trên mobile
  const menuSections: MenuSection[] = [
    ...(shouldUseMobileLayout() ? [{ id: 'gameinfo', title: 'Thông Tin Game', icon: <Clock className="w-4 h-4" />, isActive: true }] : []),
    { id: 'character', title: 'Nhân Vật', icon: <User className="w-4 h-4" />, isActive: true },
    { id: 'quests', title: 'Nhiệm Vụ', icon: <Target className="w-4 h-4" />, isActive: true },
    { id: 'relationships', title: 'Quan Hệ', icon: <Heart className="w-4 h-4" />, isActive: true },
    { id: 'world', title: 'Thế Giới', icon: <MapPin className="w-4 h-4" />, isActive: true },
    { id: 'factions', title: 'Phe Phái', icon: <Users className="w-4 h-4" />, isActive: true },
    { id: 'journal', title: 'Nhật Ký', icon: <FileText className="w-4 h-4" />, isActive: true }
  ];

  // Format thời gian thế giới
  const formatWorldTime = (time: WorldTime | null) => {
    if (!time) return 'Không có dữ liệu';
    return `Năm ${time.year}, Tháng ${time.month}, Ngày ${time.day}, ${time.hour}:00`;
  };

  // Render section thông tin game
  const renderGameInfoSection = () => {
    return (
      <div className="space-y-4">
        {/* Thời gian thế giới */}
        {worldTime && (
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Thời Gian Thế Giới
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-white">{worldTimeService.formatShortTime(worldTime)}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-gray-400">Thời điểm:</span>
                <span className="text-white">{worldTimeService.getTimeOfDay(worldTime)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Bộ đếm lượt */}
        {turnCounter !== undefined && (
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
              <MessageSquare className="w-5 h-5 mr-2" />
              Tiến Trình Game
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-4 h-4 text-gray-400" />
                <span className="text-white">Lượt {turnCounter}</span>
              </div>
            </div>
          </div>
        )}

        {/* Cài đặt nội dung 18+ */}
        {contentFlags && (
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
              <Shield className="w-5 h-5 mr-2" />
              Cài Đặt Nội Dung
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Nội dung 18+:</span>
                <button
                  onClick={onToggleAdultContent}
                  className="flex items-center space-x-2 hover:bg-white/5 px-3 py-2 rounded transition-colors"
                >
                  {contentFlags.adult_enabled ? (
                    contentFlags.adult_intensity === 'direct' ? (
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                    ) : (
                      <Shield className="w-4 h-4 text-orange-400" />
                    )
                  ) : (
                    <EyeOff className="w-4 h-4 text-gray-400" />
                  )}
                  <span className={`text-sm font-medium ${
                    contentFlags.adult_enabled
                      ? contentFlags.adult_intensity === 'direct' 
                        ? 'text-red-300' 
                        : 'text-orange-300'
                      : 'text-gray-400'
                  }`}>
                    {contentFlags.adult_enabled 
                      ? `18+ ${contentFlags.adult_intensity === 'direct' ? 'Tả thực' : 'An toàn'}`
                      : '18+ OFF'
                    }
                  </span>
                </button>
              </div>
              
              {contentFlags.adult_enabled && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Mức độ:</span>
                  <button
                    onClick={onToggleAdultIntensity}
                    className="flex items-center space-x-2 hover:bg-white/5 px-3 py-2 rounded transition-colors"
                  >
                    <span className="text-sm text-orange-300">
                      {contentFlags.adult_intensity === 'direct' ? 'Tả thực' : 'An toàn'}
                    </span>
                    <span className="text-xs text-gray-400">(Click để đổi)</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render section nhân vật
  const renderCharacterSection = () => {
    if (!characterData) return <div className="text-gray-400">Không có dữ liệu nhân vật</div>;

    return (
      <div className="space-y-4">
        {/* Thông tin cơ bản */}
        <div className="bg-gray-800/50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
            <User className="w-5 h-5 mr-2" />
            Thông Tin Cơ Bản
          </h3>
          <div className="space-y-2 text-sm">
            <div><span className="text-gray-400">Tên:</span> <span className="text-white">{characterData.name}</span></div>
            <div><span className="text-gray-400">Giới tính:</span> <span className="text-white">{characterData.gender}</span></div>
            <div><span className="text-gray-400">Chủng tộc:</span> <span className="text-white">{characterData.race?.name}</span></div>
          </div>
        </div>

        {/* Chỉ số cơ bản */}
        {characterData.coreStats && (
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
              <Shield className="w-5 h-5 mr-2" />
              Chỉ Số Cơ Bản
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 flex items-center">
                  <Sword className="w-4 h-4 mr-1" />
                  Sức mạnh
                </span>
                <span className="text-white font-medium">
                  {characterData.coreStats.strength}
                  {(() => {
                    const modifier = characterData.coreStats.modifiers?.strength ?? Math.floor((characterData.coreStats.strength - 10) / 2);
                    return modifier >= 0 ? `(+${modifier})` : `(${modifier})`;
                  })()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 flex items-center">
                  <Eye className="w-4 h-4 mr-1" />
                  Nhanh nhẹn
                </span>
                <span className="text-white font-medium">
                  {characterData.coreStats.agility}
                  {(() => {
                    const modifier = characterData.coreStats.modifiers?.agility ?? Math.floor((characterData.coreStats.agility - 10) / 2);
                    return modifier >= 0 ? `(+${modifier})` : `(${modifier})`;
                  })()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 flex items-center">
                  <Brain className="w-4 h-4 mr-1" />
                  Trí tuệ
                </span>
                <span className="text-white font-medium">
                  {characterData.coreStats.intelligence}
                  {(() => {
                    const modifier = characterData.coreStats.modifiers?.intelligence ?? Math.floor((characterData.coreStats.intelligence - 10) / 2);
                    return modifier >= 0 ? `(+${modifier})` : `(${modifier})`;
                  })()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 flex items-center">
                  <Heart className="w-4 h-4 mr-1" />
                  Thể chất
                </span>
                <span className="text-white font-medium">
                  {characterData.coreStats.constitution}
                  {(() => {
                    const modifier = characterData.coreStats.modifiers?.constitution ?? Math.floor((characterData.coreStats.constitution - 10) / 2);
                    return modifier >= 0 ? `(+${modifier})` : `(${modifier})`;
                  })()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 flex items-center">
                  <Star className="w-4 h-4 mr-1" />
                  Khôn ngoan
                </span>
                <span className="text-white font-medium">
                  {characterData.coreStats.wisdom}
                  {(() => {
                    const modifier = characterData.coreStats.modifiers?.wisdom ?? Math.floor((characterData.coreStats.wisdom - 10) / 2);
                    return modifier >= 0 ? `(+${modifier})` : `(${modifier})`;
                  })()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 flex items-center">
                  <Zap className="w-4 h-4 mr-1" />
                  Sức hút
                </span>
                <span className="text-white font-medium">
                  {characterData.coreStats.charisma}
                  {(() => {
                    const modifier = characterData.coreStats.modifiers?.charisma ?? Math.floor((characterData.coreStats.charisma - 10) / 2);
                    return modifier >= 0 ? `(+${modifier})` : `(${modifier})`;
                  })()}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Máu */}
        {characterData.health && (
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
              <Heart className="w-5 h-5 mr-2" />
              Trạng Thái
            </h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Máu</span>
                  <span className="text-white">{characterData.health.current}/{characterData.health.max}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-red-500 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${(characterData.health.current / characterData.health.max) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tính cách và tiểu sử */}
        {(characterData.personality || characterData.backstory) && (
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">Tính Cách & Tiểu Sử</h3>
            <div className="space-y-3 text-sm">
              {characterData.personality && (
                <div>
                  <span className="text-gray-400">Tính cách:</span>
                  <p className="text-white mt-1">{characterData.personality}</p>
                </div>
              )}
              {characterData.backstory && (
                <div>
                  <span className="text-gray-400">Tiểu sử:</span>
                  <p className="text-white mt-1">{characterData.backstory}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Kỹ năng */}
        {characterData.proficiencies && characterData.proficiencies.length > 0 && (
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">Kỹ Năng</h3>
            <div className="space-y-2">
              {characterData.proficiencies.map((skill, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <span className="text-white">{skill.name}</span>
                  <span className="text-gray-400">Cấp {skill.level}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render section thế giới (gộp thông tin thế giới, địa điểm và quy tắc)
  const renderWorldSection = () => {
    if (!worldData) return <div className="text-gray-400">Không có dữ liệu thế giới</div>;

    return (
      <div className="space-y-4">
        {/* Thông tin cơ bản thế giới */}
        <div className="bg-gray-800/50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
            <MapPin className="w-5 h-5 mr-2" />
            Thông Tin Thế Giới
          </h3>
          <div className="space-y-2 text-sm">
            <div><span className="text-gray-400">Tên:</span> <span className="text-white">{worldData.name || worldData.worldTitle}</span></div>
            <div><span className="text-gray-400">Thể loại:</span> <span className="text-white">{worldData.genre}</span></div>
            <div><span className="text-gray-400">Bối cảnh:</span> <span className="text-white">{worldData.setting}</span></div>
            <div><span className="text-gray-400">Tông truyện:</span> <span className="text-white">{worldData.storyTone}</span></div>
            <div><span className="text-gray-400">Độ khó:</span> <span className="text-white">{worldData.difficulty}</span></div>
            <div><span className="text-gray-400">Thời gian:</span> <span className="text-white">{formatWorldTime(worldTime)}</span></div>
          </div>
        </div>

        {/* Mô tả thế giới */}
        {worldData.description && (
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">Mô Tả</h3>
            <p className="text-sm text-white">{worldData.description}</p>
          </div>
        )}

        {/* Nguyên tắc cốt lõi */}
        {worldData.corePrinciples && worldData.corePrinciples.length > 0 && (
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">Nguyên Tắc Cốt Lõi</h3>
            <div className="space-y-2">
              {worldData.corePrinciples.map((principle, index) => (
                <div key={index} className="text-sm">
                  <div className="text-white font-medium">{typeof principle.name === 'string' ? principle.name : JSON.stringify(principle.name)}</div>
                  <div className="text-gray-400">{typeof principle.description === 'string' ? principle.description : JSON.stringify(principle.description)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Thực thể nền tảng */}
        {worldData.foundationEntities && worldData.foundationEntities.length > 0 && (
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">Thực Thể Nền Tảng</h3>
            <div className="space-y-2">
              {worldData.foundationEntities.map((entity, index) => (
                <div key={index} className="text-sm">
                  <div className="text-white font-medium">{typeof entity.name === 'string' ? entity.name : JSON.stringify(entity.name)}</div>
                  <div className="text-gray-400">{typeof entity.description === 'string' ? entity.description : JSON.stringify(entity.description)}</div>
                  {entity.classification && (
                    <div className="text-xs text-gray-500">({typeof entity.classification === 'string' ? entity.classification : JSON.stringify(entity.classification)})</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Địa điểm */}
        {worldData.locations && worldData.locations.length > 0 && (
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">Địa Điểm</h3>
            <div className="space-y-3">
              {worldData.locations.map((location: any, index: number) => (
                <div key={index} className="text-sm">
                  <div className="text-white font-medium">{typeof location.name === 'string' ? location.name : JSON.stringify(location.name)}</div>
                  <div className="text-gray-400">{typeof location.description === 'string' ? location.description : JSON.stringify(location.description)}</div>
                  <div className="text-xs text-gray-500">Vai trò: {typeof location.role === 'string' ? location.role : JSON.stringify(location.role)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quy tắc thế giới */}
        {worldData.rules && worldData.rules.length > 0 && (
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">Quy Tắc Thế Giới</h3>
            <div className="space-y-2">
              {worldData.rules.map((rule: string, index: number) => (
                <div key={index} className="text-sm text-white">
                  • {rule}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Thực thể chính */}
        {worldData.keyEntities && worldData.keyEntities.length > 0 && (
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
              <Star className="w-5 h-5 mr-2" />
              Thực Thể Chính
            </h3>
            <div className="space-y-4">
              {worldData.keyEntities.map((entity: any, index: number) => (
                <div key={index} className="bg-gray-700/50 rounded-lg p-3">
                  <h4 className="text-white font-medium mb-2">{typeof entity.name === 'string' ? entity.name : JSON.stringify(entity.name)}</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="text-gray-400">Loại:</span> <span className="text-white">{typeof entity.type === 'string' ? entity.type : JSON.stringify(entity.type)}</span></div>
                    <div><span className="text-gray-400">Mô tả:</span> <span className="text-white">{typeof entity.description === 'string' ? entity.description : JSON.stringify(entity.description)}</span></div>
                    <div><span className="text-gray-400">Hook:</span> <span className="text-white">{typeof entity.hook === 'string' ? entity.hook : JSON.stringify(entity.hook)}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render section phe phái
  // Function to adjust faction reputation for testing
  const adjustFactionReputation = (factionName: string, amount: number) => {
    // Adjust faction reputation directly
    npcRelationshipService.adjustFactionReputation(factionName, amount);
    
    // Force re-render
    window.location.reload();
  };

  const renderFactionsSection = () => {
    if (!worldData?.factions || worldData.factions.length === 0) {
      return <div className="text-gray-400">Không có dữ liệu phe phái</div>;
    }

    // Get faction reputation data
    const factionReputations = npcRelationshipService.getAllFactionReputations();
    
    // Helper function to get reputation description (updated for -200 to +200 range)
    const getReputationDescription = (reputation: number): string => {
      if (reputation >= 240) return 'danh tiếng xuất sắc';
      if (reputation >= 180) return 'danh tiếng rất tốt';
      if (reputation >= 120) return 'danh tiếng tốt';
      if (reputation >= 60) return 'danh tiếng khá';
      if (reputation >= 30) return 'danh tiếng ổn';
      if (reputation >= 15) return 'danh tiếng tích cực';
      if (reputation >= -15) return 'danh tiếng trung lập';
      if (reputation >= -30) return 'danh tiếng hơi xấu';
      if (reputation >= -60) return 'danh tiếng không tốt';
      if (reputation >= -120) return 'danh tiếng xấu';
      if (reputation >= -180) return 'danh tiếng rất xấu';
      if (reputation >= -240) return 'danh tiếng tệ hại';
      return 'danh tiếng cực kỳ tệ hại';
    };

    return (
      <div className="space-y-4">
        {worldData.factions.map((faction: any, index: number) => {
          // Find reputation data for this faction
          const reputationData = factionReputations.find(rep => rep.factionName === faction.name);
          
          return (
            <div key={index} className="bg-gray-800/50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-3">{faction.name}</h3>
              
              {/* Faction Reputation Bar */}
              {reputationData && reputationData.memberCount > 0 && (
                <div className="mb-4 p-3 bg-gray-700/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Danh tiếng phe phái</span>
                    <span className="text-sm text-white font-medium">
                      {reputationData.reputation} ({reputationData.memberCount} thành viên)
                    </span>
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-3 mb-2">
                    <div 
                      className={`h-3 rounded-full transition-all duration-300 ${
                        reputationData.reputation > 0 ? 'bg-green-500' : 'bg-red-500'
                      }`}
                           style={{ 
                             width: `${Math.min(Math.abs(reputationData.reputation), 300) / 3}%` 
                           }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-400">
                    {getReputationDescription(reputationData.reputation)} 
                    {reputationData.averageReputation !== 0 && (
                      <span className="ml-2">
                        (Trung bình: {reputationData.averageReputation})
                      </span>
                    )}
                  </div>
                  
                  {/* Debug buttons for testing */}
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => adjustFactionReputation(faction.name, 50)}
                      className="px-2 py-1 bg-green-600/20 border border-green-500/50 text-green-300 rounded text-xs hover:bg-green-600/30 transition-colors"
                    >
                      +50
                    </button>
                    <button
                      onClick={() => adjustFactionReputation(faction.name, 100)}
                      className="px-2 py-1 bg-blue-600/20 border border-blue-500/50 text-blue-300 rounded text-xs hover:bg-blue-600/30 transition-colors"
                    >
                      +100
                    </button>
                    <button
                      onClick={() => adjustFactionReputation(faction.name, -50)}
                      className="px-2 py-1 bg-red-600/20 border border-red-500/50 text-red-300 rounded text-xs hover:bg-red-600/30 transition-colors"
                    >
                      -50
                    </button>
                    <button
                      onClick={() => adjustFactionReputation(faction.name, -100)}
                      className="px-2 py-1 bg-orange-600/20 border border-orange-500/50 text-orange-300 rounded text-xs hover:bg-orange-600/30 transition-colors"
                    >
                      -100
                    </button>
                  </div>
                  
                  {/* Member list */}
                  {reputationData.members.length > 0 && (
                    <div className="mt-3">
                      <div className="text-xs text-gray-400 mb-2">Thành viên:</div>
                      <div className="space-y-1">
                        {reputationData.members.map((member, memberIndex) => (
                          <div key={memberIndex} className="flex items-center justify-between text-xs">
                            <span className="text-gray-300">{member.name}</span>
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-1 rounded text-xs ${
                                member.reputation > 0 ? 'bg-green-600/20 text-green-300' : 'bg-red-600/20 text-red-300'
                              }`}>
                                {member.reputation}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Faction Info */}
              <div className="space-y-2 text-sm">
                <div><span className="text-gray-400">Mục tiêu:</span> <span className="text-white">{typeof faction.goal === 'string' ? faction.goal : JSON.stringify(faction.goal)}</span></div>
                <div><span className="text-gray-400">Phương pháp:</span> <span className="text-white">{typeof faction.methods === 'string' ? faction.methods : JSON.stringify(faction.methods)}</span></div>
                <div><span className="text-gray-400">Điểm yếu:</span> <span className="text-white">{typeof faction.weakness === 'string' ? faction.weakness : JSON.stringify(faction.weakness)}</span></div>
                {reputationData && reputationData.memberCount === 0 && (
                  <div className="space-y-2">
                    <div className="text-xs text-gray-500 italic">
                      Chưa gặp thành viên nào của phe phái này
                    </div>
                    {/* Debug buttons for factions without members */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => adjustFactionReputation(faction.name, 50)}
                        className="px-2 py-1 bg-green-600/20 border border-green-500/50 text-green-300 rounded text-xs hover:bg-green-600/30 transition-colors"
                      >
                        +50
                      </button>
                      <button
                        onClick={() => adjustFactionReputation(faction.name, 100)}
                        className="px-2 py-1 bg-blue-600/20 border border-blue-500/50 text-blue-300 rounded text-xs hover:bg-blue-600/30 transition-colors"
                      >
                        +100
                      </button>
                      <button
                        onClick={() => adjustFactionReputation(faction.name, -50)}
                        className="px-2 py-1 bg-red-600/20 border border-red-500/50 text-red-300 rounded text-xs hover:bg-red-600/30 transition-colors"
                      >
                        -50
                      </button>
                      <button
                        onClick={() => adjustFactionReputation(faction.name, -100)}
                        className="px-2 py-1 bg-orange-600/20 border border-orange-500/50 text-orange-300 rounded text-xs hover:bg-orange-600/30 transition-colors"
                      >
                        -100
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

   // Helper function để làm sạch và hiển thị notes
   const cleanNotes = (notes: string[]): string[] => {
     if (!notes || notes.length === 0) return ['Chưa có ghi chú đặc biệt'];
     
     return notes
       .map((note: any) => {
         if (typeof note === 'string') {
           // Xử lý [object Object] trong string
           if (note.includes('[object Object]')) {
             return note.replace(/\[object Object\]/g, 'đối tượng');
           }
           return note;
         } else if (typeof note === 'object' && note !== null) {
           // Nếu là object, cố gắng lấy thông tin hữu ích
           if (note.name) {
             return `Đối tượng: ${note.name}`;
           } else if (note.description) {
             return `Mô tả: ${note.description}`;
           } else {
             return JSON.stringify(note);
           }
         } else {
           return String(note);
         }
       })
       .filter(note => note && note.trim().length > 0)
       .map(note => note.trim())
       .filter((note, index, arr) => arr.indexOf(note) === index); // Loại bỏ trùng lặp
   };

  // Tối ưu relationships data với useMemo
  const relationships = useMemo(() => {
    return npcRelationshipService.getAllRelationships();
  }, [forceUpdate]);

  // Render section quan hệ NPC - tối ưu với useMemo
  const renderRelationshipsSection = useMemo(() => {
    
    const toggleNPC = (npcId: string) => {
      setExpandedNPCs(prev => {
        const newSet = new Set(prev);
        if (newSet.has(npcId)) {
          newSet.delete(npcId);
        } else {
          newSet.add(npcId);
        }
        return newSet;
      });
    };
    
    const handleMergeDuplicates = () => {
      npcRelationshipService.mergeDuplicateNPCs();
      // Force re-render by updating a dummy state
      setForceUpdate(prev => prev + 1);
    };

    const handleRemoveGroupNPCs = () => {
      npcRelationshipService.removeGroupNPCs();
      // Force re-render by updating a dummy state
      setForceUpdate(prev => prev + 1);
    };

    const handleExpandAll = () => {
      const allIds = relationships.map(r => r.id);
      setExpandedNPCs(new Set(allIds));
    };

    const handleCollapseAll = () => {
      setExpandedNPCs(new Set());
    };

    const handleRemoveNPC = (npcId: string, npcName: string) => {
      if (confirm(`Bạn có chắc chắn muốn xóa quan hệ với "${npcName}"?\n\nThao tác này không thể hoàn tác.`)) {
        const success = npcRelationshipService.removeRelationship(npcId);
        if (success) {
          // Remove from expanded set if it was expanded
          setExpandedNPCs(prev => {
            const newSet = new Set(prev);
            newSet.delete(npcId);
            return newSet;
          });
          // Force re-render
          setForceUpdate(prev => prev + 1);
        }
      }
    };

    return (
      <div className="space-y-4">
        {/* Nút quản lý NPCs */}
        {relationships.length > 0 && (
          <div className="space-y-2">
            {/* Nút expand/collapse all */}
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <button
                  onClick={handleExpandAll}
                  className="px-3 py-1 bg-green-600/20 border border-green-500/50 text-green-300 rounded text-sm hover:bg-green-600/30 transition-colors flex items-center space-x-1"
                >
                  <span>Mở tất cả</span>
                </button>
                <button
                  onClick={handleCollapseAll}
                  className="px-3 py-1 bg-gray-600/20 border border-gray-500/50 text-gray-300 rounded text-sm hover:bg-gray-600/30 transition-colors flex items-center space-x-1"
                >
                  <span>Thu tất cả</span>
                </button>
              </div>
              <div className="text-xs text-gray-400">
                {expandedNPCs.size}/{relationships.length} mở rộng
              </div>
            </div>
            
            {/* Nút quản lý dữ liệu */}
            <div className="flex justify-end gap-2">
              <button
                onClick={handleRemoveGroupNPCs}
                className="px-3 py-1 bg-red-600/20 border border-red-500/50 text-red-300 rounded text-sm hover:bg-red-600/30 transition-colors flex items-center space-x-1"
              >
                <span>Xóa NPC nhóm</span>
              </button>
              <button
                onClick={handleMergeDuplicates}
                className="px-3 py-1 bg-blue-600/20 border border-blue-500/50 text-blue-300 rounded text-sm hover:bg-blue-600/30 transition-colors flex items-center space-x-1"
              >
                <span>Gộp NPC trùng lặp</span>
              </button>
            </div>
          </div>
        )}

        {/* NPC Relationships */}
        <div className="bg-gray-800/50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
            <Heart className="w-5 h-5 mr-2" />
            Quan Hệ NPC ({relationships.length})
          </h3>
          {relationships.length === 0 ? (
            <div className="text-gray-400 text-sm">
              <p>Chưa gặp NPC nào trong cuộc phiêu lưu.</p>
              <p className="mt-2 text-xs">Thông tin quan hệ sẽ được cập nhật khi bạn tương tác với các nhân vật trong game.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {relationships.map((relationship: any) => {
                // Validate relationship data
                if (!relationship || typeof relationship !== 'object') {
                  return null;
                }
                
                const isExpanded = expandedNPCs.has(relationship.id);
                
                return (
                <div key={relationship.id} className="bg-gray-700/50 rounded-lg p-3">
                  <div 
                    className="flex items-center justify-between mb-2 cursor-pointer hover:bg-gray-600/30 rounded p-1 -m-1 transition-colors"
                    onClick={() => toggleNPC(relationship.id)}
                  >
                    <div className="flex items-center space-x-2">
                      <h4 className="text-white font-medium">{relationship.name}</h4>
                        <span className={`px-2 py-1 rounded text-xs ${
                          relationship.status === 'admiring' ? 'bg-pink-500' :
                          relationship.status === 'ally' ? 'bg-green-700' :
                          relationship.status === 'trusting' ? 'bg-green-600' :
                          relationship.status === 'friendly' ? 'bg-green-500' :
                          relationship.status === 'respectful' ? 'bg-green-400' :
                          relationship.status === 'neutral' ? 'bg-gray-600' :
                          relationship.status === 'acquaintance' ? 'bg-gray-500' :
                          relationship.status === 'cautious' ? 'bg-yellow-600' :
                          relationship.status === 'suspicious' ? 'bg-yellow-700' :
                          relationship.status === 'disappointed' ? 'bg-orange-600' :
                          relationship.status === 'rival' ? 'bg-orange-700' :
                          relationship.status === 'enemy' ? 'bg-red-700' :
                          relationship.status === 'hostile' ? 'bg-red-600' :
                          relationship.status === 'competitive' ? 'bg-orange-500' :
                          'bg-gray-600'
                        }`}>
                          {relationship.status === 'admiring' ? 'Ngưỡng mộ' :
                           relationship.status === 'ally' ? 'Đồng minh' :
                           relationship.status === 'trusting' ? 'Tin tưởng' :
                           relationship.status === 'friendly' ? 'Thân thiện' :
                           relationship.status === 'respectful' ? 'Tôn trọng' :
                           relationship.status === 'neutral' ? 'Trung lập' :
                           relationship.status === 'acquaintance' ? 'Quen biết' :
                           relationship.status === 'cautious' ? 'Thận trọng' :
                           relationship.status === 'suspicious' ? 'Nghi ngờ' :
                           relationship.status === 'disappointed' ? 'Thất vọng' :
                           relationship.status === 'rival' ? 'Đối thủ' :
                           relationship.status === 'enemy' ? 'Kẻ thù' :
                           relationship.status === 'hostile' ? 'Thù địch' :
                           relationship.status === 'competitive' ? 'Cạnh tranh' :
                           'Trung lập'}
                        </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveNPC(relationship.id, relationship.name);
                        }}
                        className="p-1 text-gray-400 hover:text-red-400 hover:bg-red-500/20 rounded transition-colors"
                        title={`Xóa quan hệ với ${relationship.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <span className="text-gray-400 text-xs">
                        {isExpanded ? 'Thu gọn' : 'Mở rộng'}
                      </span>
                      <div className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  {/* Chi tiết NPC - chỉ hiển thị khi expanded */}
                  <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="mt-3 space-y-3 min-w-0">
                      {relationship.description && (
                        <p className="text-gray-300 text-sm break-words overflow-wrap-anywhere">{typeof relationship.description === 'string' ? relationship.description : JSON.stringify(relationship.description)}</p>
                      )}

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-400">Quan hệ:</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-16 bg-gray-600 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  relationship.relationshipLevel > 0 ? 'bg-green-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${Math.abs(relationship.relationshipLevel)}%` }}
                              ></div>
                            </div>
                            <span className="text-white">{relationship.relationshipLevel}</span>
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-400">Danh tiếng:</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-16 bg-gray-600 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  relationship.reputation > 0 ? 'bg-blue-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${Math.abs(relationship.reputation)}%` }}
                              ></div>
                            </div>
                            <span className="text-white">{relationship.reputation}</span>
                          </div>
                        </div>
                      </div>

                      {/* Arousal Bar - chỉ hiển thị khi 18+ ON */}
                      <NPCArousalBar 
                        npc={relationship} 
                        contentFlags={contentFlags}
                        className="mt-3"
                      />

                      <div className="text-xs text-gray-400 break-words overflow-wrap-anywhere">
                        {relationship.location && (
                          <div>
                            Vị trí: {typeof relationship.location === 'string' 
                              ? relationship.location 
                              : (typeof relationship.location === 'object' && relationship.location.name 
                                ? relationship.location.name 
                                : JSON.stringify(relationship.location))}
                          </div>
                        )}
                        {relationship.faction ? (
                          <div>Phe phái: {typeof relationship.faction === 'string' ? relationship.faction : JSON.stringify(relationship.faction)}</div>
                        ) : (
                          <div className="text-gray-500 italic">Không thuộc phe phái nào</div>
                        )}
                      </div>

                      {relationship.tags && relationship.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {relationship.tags.map((tag: any, index: number) => (
                            <span key={index} className="px-2 py-1 bg-gray-600 rounded text-xs text-gray-300 break-words overflow-wrap-anywhere">
                              {typeof tag === 'string' ? tag : JSON.stringify(tag)}
                            </span>
                          ))}
                        </div>
                      )}

                      {relationship.notes && relationship.notes.length > 0 && (
                        <div className="min-w-0">
                          <div className="text-gray-400 text-xs mb-1 font-medium">
                            Ghi chú ({relationship.notes.length}):
                          </div>
                          <div className="text-gray-300 text-xs bg-gray-600/50 p-3 rounded max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-700 min-w-0 break-words border border-gray-500/30">
                            {cleanNotes(relationship.notes).map((note, noteIndex) => (
                              <div key={noteIndex} className="mb-2 last:mb-0 break-words overflow-wrap-anywhere min-w-0 leading-relaxed">
                                <span className="text-gray-400 mr-2">•</span>
                                <span dangerouslySetInnerHTML={{ __html: note }} />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }, [relationships, expandedNPCs, contentFlags]);


  // Render section nhiệm vụ mới với quest system
  const renderQuestsSection = () => {
    if (!questSystem) {
      return <div className="text-gray-400">Hệ thống quest chưa được khởi tạo</div>;
    }

    return (
      <QuestTracker
        questSystem={questSystem}
        onQuestUpdate={onQuestUpdate || (() => {})}
        onQuestAccept={onQuestAccept || (() => {})}
        onQuestDecline={onQuestDecline || (() => {})}
        onQuestDeclineActive={onQuestDeclineActive || (() => {})}
        onClaimReward={onClaimReward || (() => {})}
        onRemoveDeclinedQuests={onRemoveDeclinedQuests}
        onCreateFactionQuest={onCreateFactionQuest}
        isAIProcessing={isAIProcessing}
        isNPCAnalysisProcessing={isNPCAnalysisProcessing}
      />
    );
  };

  // Render section nhật ký SCC
  const renderJournalSection = () => {
    return <SCCJournal isVisible={activeSection === 'journal'} />;
  };

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'gameinfo':
        return shouldUseMobileLayout() ? renderGameInfoSection() : renderCharacterSection();
      case 'character':
        return renderCharacterSection();
      case 'quests':
        return renderQuestsSection();
      case 'journal':
        return renderJournalSection();
      case 'world':
        return renderWorldSection();
      case 'factions':
        return renderFactionsSection();
      case 'relationships':
        return renderRelationshipsSection;
      default:
        return renderCharacterSection();
    }
  };

  return (
    <div className={`fixed top-0 right-0 h-screen bg-black/95 backdrop-blur-sm border-l border-gray-700/50 z-50 flex flex-col transition-all duration-300 ${
      shouldUseMobileLayout() 
        ? 'w-full max-w-sm' // Full width on mobile with max constraint
        : 'w-96' // Fixed width on desktop
    } ${
      isOpen ? 'translate-x-0' : 'translate-x-full'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
        <h2 className="text-lg font-semibold text-white">Thông Tin Game</h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={onTogglePin}
            className={`p-2 rounded-lg transition-colors duration-200 ${
              isPinned 
                ? 'bg-blue-600/30 border border-blue-500/50 text-blue-200' 
                : 'bg-gray-600/20 border border-gray-500/30 text-gray-300 hover:bg-gray-600/30'
            }`}
            title={isPinned ? 'Bỏ ghim' : 'Ghim menu'}
          >
            {isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
          </button>
          {!isPinned && (
            <button
              onClick={onClose}
              className="p-2 bg-gray-600/20 border border-gray-500/30 text-gray-300 rounded-lg hover:bg-gray-600/30 transition-colors duration-200"
              title="Đóng menu"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Menu Navigation */}
      <div className="flex border-b border-gray-700/50 overflow-x-auto">
        {menuSections.map((section) => (
          <button
            key={section.id}
            onClick={() => updateActiveSection(section.id)}
            className={`flex items-center space-x-2 px-4 py-3 text-sm whitespace-nowrap transition-colors duration-200 ${
              activeSection === section.id
                ? 'bg-blue-600/20 border-b-2 border-blue-500 text-blue-300'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
          >
            {section.icon}
            <span>{section.title}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {renderActiveSection()}
      </div>
    </div>
  );
}
