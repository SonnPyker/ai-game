import { useState } from 'react';
import { 
  X, 
  Pin, 
  PinOff, 
  User, 
  MapPin, 
  Users, 
  BookOpen, 
  Target,
  Heart,
  Zap,
  Shield,
  Sword,
  Brain,
  Eye,
  Star
} from 'lucide-react';
import { WorldData, Character, WorldTime, QuestSystem } from '../../types';
import { QuestTracker } from '../QuestTracker/QuestTracker';

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
  onClaimReward?: (questId: string, rewardId: string) => void;
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
  onClaimReward
}: InfoMenuProps) {
  const [activeSection, setActiveSection] = useState<string>('character');
  
  // Các mục menu chính
  const menuSections: MenuSection[] = [
    { id: 'character', title: 'Nhân Vật', icon: <User className="w-4 h-4" />, isActive: true },
    { id: 'quests', title: 'Nhiệm Vụ', icon: <Target className="w-4 h-4" />, isActive: true },
    { id: 'world', title: 'Thế Giới', icon: <MapPin className="w-4 h-4" />, isActive: true },
    { id: 'factions', title: 'Phe Phái', icon: <Users className="w-4 h-4" />, isActive: true },
    { id: 'locations', title: 'Địa Điểm', icon: <MapPin className="w-4 h-4" />, isActive: true },
    { id: 'entities', title: 'Thực Thể', icon: <Star className="w-4 h-4" />, isActive: true },
    { id: 'rules', title: 'Quy Tắc', icon: <BookOpen className="w-4 h-4" />, isActive: true }
  ];

  // Format thời gian thế giới
  const formatWorldTime = (time: WorldTime | null) => {
    if (!time) return 'Không có dữ liệu';
    return `Năm ${time.year}, Tháng ${time.month}, Ngày ${time.day}, ${time.hour}:00`;
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

        {/* Máu và Mana */}
        {(characterData.health || characterData.mana) && (
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
              <Heart className="w-5 h-5 mr-2" />
              Trạng Thái
            </h3>
            <div className="space-y-3">
              {characterData.health && (
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
              )}
              {characterData.mana && (
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Mana</span>
                    <span className="text-white">{characterData.mana.current}/{characterData.mana.max}</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${(characterData.mana.current / characterData.mana.max) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}
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

  // Render section thế giới
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
                  <div className="text-white font-medium">{principle.name}</div>
                  <div className="text-gray-400">{principle.description}</div>
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
                  <div className="text-white font-medium">{entity.name}</div>
                  <div className="text-gray-400">{entity.description}</div>
                  {entity.classification && (
                    <div className="text-xs text-gray-500">({entity.classification})</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render section phe phái
  const renderFactionsSection = () => {
    if (!worldData?.factions || worldData.factions.length === 0) {
      return <div className="text-gray-400">Không có dữ liệu phe phái</div>;
    }

    return (
      <div className="space-y-4">
        {worldData.factions.map((faction: any, index: number) => (
          <div key={index} className="bg-gray-800/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">{faction.name}</h3>
            <div className="space-y-2 text-sm">
              <div><span className="text-gray-400">Mục tiêu:</span> <span className="text-white">{faction.goal}</span></div>
              <div><span className="text-gray-400">Phương pháp:</span> <span className="text-white">{faction.methods}</span></div>
              <div><span className="text-gray-400">Điểm yếu:</span> <span className="text-white">{faction.weakness}</span></div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render section địa điểm
  const renderLocationsSection = () => {
    if (!worldData?.locations || worldData.locations.length === 0) {
      return <div className="text-gray-400">Không có dữ liệu địa điểm</div>;
    }

    return (
      <div className="space-y-4">
        {worldData.locations.map((location: any, index: number) => (
          <div key={index} className="bg-gray-800/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">{location.name}</h3>
            <div className="space-y-2 text-sm">
              <div><span className="text-gray-400">Mô tả:</span> <span className="text-white">{location.description}</span></div>
              <div><span className="text-gray-400">Vai trò:</span> <span className="text-white">{location.role}</span></div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render section quy tắc
  const renderRulesSection = () => {
    if (!worldData?.rules || worldData.rules.length === 0) {
      return <div className="text-gray-400">Không có dữ liệu quy tắc</div>;
    }

    return (
      <div className="space-y-4">
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
      </div>
    );
  };

  // Render section thực thể chính
  const renderEntitiesSection = () => {
    if (!worldData?.keyEntities || worldData.keyEntities.length === 0) {
      return <div className="text-gray-400">Không có dữ liệu thực thể</div>;
    }

    return (
      <div className="space-y-4">
        {worldData.keyEntities.map((entity: any, index: number) => (
          <div key={index} className="bg-gray-800/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">{entity.name}</h3>
            <div className="space-y-2 text-sm">
              <div><span className="text-gray-400">Loại:</span> <span className="text-white">{entity.type}</span></div>
              <div><span className="text-gray-400">Mô tả:</span> <span className="text-white">{entity.description}</span></div>
              <div><span className="text-gray-400">Hook:</span> <span className="text-white">{entity.hook}</span></div>
            </div>
          </div>
        ))}
      </div>
    );
  };

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
        onClaimReward={onClaimReward || (() => {})}
      />
    );
  };

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'character':
        return renderCharacterSection();
      case 'quests':
        return renderQuestsSection();
      case 'world':
        return renderWorldSection();
      case 'factions':
        return renderFactionsSection();
      case 'locations':
        return renderLocationsSection();
      case 'entities':
        return renderEntitiesSection();
      case 'rules':
        return renderRulesSection();
      default:
        return renderCharacterSection();
    }
  };

  return (
    <div className={`fixed top-0 right-0 h-full w-96 bg-black/95 backdrop-blur-sm border-l border-gray-700/50 z-50 flex flex-col transition-all duration-300 ${
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
            onClick={() => setActiveSection(section.id)}
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
