import React, { useState, useEffect } from 'react';
import { 
  User, 
  Heart, 
  Star, 
  MapPin, 
  Sword, 
  Shield, 
  Zap, 
  Brain, 
  Eye, 
  Target,
  Info,
  Clock
} from 'lucide-react';
import { ContentFlags } from '../../types';
import { useModalMinimize } from '../../hooks/useModalMinimize';
import { useResponsiveContext } from '../../contexts/ResponsiveContext';
import { ModalHeader } from '../ModalHeader';
import { MotionWrapper } from '../MotionWrapper';
import { NPCArousalBar } from '../NPCArousalBar';
import { npcRelationshipService } from '../../services/npcRelationshipService';

interface NPCInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  npcId: string | null;
  contentFlags?: ContentFlags;
}

type TabType = 'info' | 'relationship';

export function NPCInfoModal({ 
  isOpen, 
  onClose, 
  npcId, 
  contentFlags 
}: NPCInfoModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [, setForceUpdate] = useState(0);
  const { shouldUseMobileLayout, getTransitionClass } = useResponsiveContext();

  // Load NPC data from npcId
  const npc = npcId ? npcRelationshipService.getRelationship(npcId) : null;

  const { isMinimized, minimize } = useModalMinimize({
    modalId: 'npc-info-modal',
    title: npc?.name || 'NPC Info',
    subtitle: 'Chi tiết nhân vật',
    icon: <User className="w-5 h-5 text-yellow-400" />
  });

  // Force re-render when NPC data changes
  useEffect(() => {
    if (npc) {
      setForceUpdate(prev => prev + 1);
    }
  }, [npc]);

  // Listen for relationship updates
  useEffect(() => {
    const handleRelationshipUpdate = () => {
      setForceUpdate(prev => prev + 1);
    };

    window.addEventListener('npc_relationship_updated', handleRelationshipUpdate);
    window.addEventListener('arousal_updated', handleRelationshipUpdate);
    
    return () => {
      window.removeEventListener('npc_relationship_updated', handleRelationshipUpdate);
      window.removeEventListener('arousal_updated', handleRelationshipUpdate);
    };
  }, []);

  if (!isOpen || !npc) return null;

  // Show minimized modal if minimized
  if (isMinimized) {
    return null; // MinimizedModal is handled by MinimizedModalContainer
  }

  const renderInfoTab = () => {
    return (
      <div className="space-y-4">
        {/* Basic Info */}
        <div className="bg-gray-800/50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
            <User className="w-5 h-5 mr-2" />
            Thông Tin Cơ Bản
          </h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-400">Tên:</span> 
              <span className="text-white ml-2 font-medium">{npc.name}</span>
            </div>
            {npc.description && (
              <div>
                <span className="text-gray-400">Mô tả:</span>
                <p className="text-white mt-1 break-words">{npc.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Combat Stats */}
        {npc.combatStats && (
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
              <Sword className="w-5 h-5 mr-2" />
              Combat Stats
            </h3>
            <div className="space-y-3">
              {/* Level Info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 flex items-center">
                    <Target className="w-4 h-4 mr-1" />
                    Combat Level
                  </span>
                  <span className="text-yellow-400 font-semibold">
                    {npc.combatStats.combatLevel || npc.combatStats.level || 1}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 flex items-center">
                    <User className="w-4 h-4 mr-1" />
                    Character Level
                  </span>
                  <span className="text-yellow-400 font-semibold">
                    {npc.combatStats.characterLevel || npc.level || 'N/A'}
                  </span>
                </div>
              </div>

              {/* HP */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">HP</span>
                  <span className="text-white">{npc.combatStats.health.current}/{npc.combatStats.health.max}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-gray-900 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${(npc.combatStats.health.current / npc.combatStats.health.max) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* AC */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400 flex items-center">
                  <Shield className="w-4 h-4 mr-1" />
                  AC
                </span>
                <span className="text-white font-semibold">{npc.combatStats.armorClass}</span>
              </div>

              {/* Core Stats */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 flex items-center">
                    <Sword className="w-4 h-4 mr-1" />
                    Strength
                  </span>
                  <span className="text-white">
                    {npc.combatStats.stats.strength}
                    {npc.combatStats.stats.modifiers.strength >= 0 ? `(+${npc.combatStats.stats.modifiers.strength})` : `(${npc.combatStats.stats.modifiers.strength})`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 flex items-center">
                    <Eye className="w-4 h-4 mr-1" />
                    Agility
                  </span>
                  <span className="text-white">
                    {npc.combatStats.stats.agility}
                    {npc.combatStats.stats.modifiers.agility >= 0 ? `(+${npc.combatStats.stats.modifiers.agility})` : `(${npc.combatStats.stats.modifiers.agility})`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 flex items-center">
                    <Brain className="w-4 h-4 mr-1" />
                    Intelligence
                  </span>
                  <span className="text-white">
                    {npc.combatStats.stats.intelligence}
                    {npc.combatStats.stats.modifiers.intelligence >= 0 ? `(+${npc.combatStats.stats.modifiers.intelligence})` : `(${npc.combatStats.stats.modifiers.intelligence})`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 flex items-center">
                    <Heart className="w-4 h-4 mr-1" />
                    Constitution
                  </span>
                  <span className="text-white">
                    {npc.combatStats.stats.constitution}
                    {npc.combatStats.stats.modifiers.constitution >= 0 ? `(+${npc.combatStats.stats.modifiers.constitution})` : `(${npc.combatStats.stats.modifiers.constitution})`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 flex items-center">
                    <Star className="w-4 h-4 mr-1" />
                    Wisdom
                  </span>
                  <span className="text-white">
                    {npc.combatStats.stats.wisdom}
                    {npc.combatStats.stats.modifiers.wisdom >= 0 ? `(+${npc.combatStats.stats.modifiers.wisdom})` : `(${npc.combatStats.stats.modifiers.wisdom})`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 flex items-center">
                    <Zap className="w-4 h-4 mr-1" />
                    Charisma
                  </span>
                  <span className="text-white">
                    {npc.combatStats.stats.charisma}
                    {npc.combatStats.stats.modifiers.charisma >= 0 ? `(+${npc.combatStats.stats.modifiers.charisma})` : `(${npc.combatStats.stats.modifiers.charisma})`}
                  </span>
                </div>
              </div>

              {/* Attacks */}
              {npc.combatStats.attacks && npc.combatStats.attacks.length > 0 && (
                <div>
                  <span className="text-gray-400 text-sm">Tấn công:</span>
                  <div className="mt-2 space-y-1">
                    {npc.combatStats.attacks.map((attack, index) => (
                      <div key={index} className="text-sm text-white bg-gray-700/50 p-2 rounded">
                        <div className="font-medium">{attack.name}</div>
                        <div className="text-gray-400 text-xs">
                          +{attack.attackBonus} to hit, {attack.damage} {attack.damageType}
                          {attack.range && ` (${attack.range}ft)`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Location & Faction */}
        <div className="bg-gray-800/50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
            <MapPin className="w-5 h-5 mr-2" />
            Vị Trí & Phe Phái
          </h3>
          <div className="space-y-2 text-sm">
            {npc.location && (
              <div>
                <span className="text-gray-400">Vị trí:</span>
                <span className="text-white ml-2">
                  {typeof npc.location === 'string' 
                    ? npc.location 
                    : (typeof npc.location === 'object' && npc.location && 'name' in npc.location
                      ? (npc.location as any).name || 'Unknown'
                      : 'Unknown')
                  }
                </span>
              </div>
            )}
            {npc.faction ? (
              <div>
                <span className="text-gray-400">Phe phái:</span>
                <span className="text-white ml-2">
                  {typeof npc.faction === 'string' ? npc.faction : 'Unknown'}
                </span>
              </div>
            ) : (
              <div>
                <span className="text-gray-400">Phe phái:</span>
                <span className="text-gray-500 ml-2 italic">Không thuộc phe phái nào</span>
              </div>
            )}
          </div>
        </div>

        {/* Additional Info */}
        <div className="bg-gray-800/50 rounded-lg p-4 mt-4">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
            <Info className="w-5 h-5 mr-2" />
            Thông Tin Khác
          </h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-400">Lần tương tác cuối:</span>
              <span className="text-white ml-2">
                {npc.lastInteraction ? new Date(npc.lastInteraction).toLocaleString('vi-VN') : 'Chưa có'}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Tổng số lần tương tác:</span>
              <span className="text-white ml-2">{npc.totalInteractions}</span>
            </div>
            {npc.tags && npc.tags.length > 0 && (
              <div>
                <span className="text-gray-400">Tags:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {npc.tags.map((tag, index) => (
                    <span key={index} className="px-2 py-1 bg-gray-600 rounded text-xs text-gray-300">
                      {typeof tag === 'string' ? tag : JSON.stringify(tag)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderRelationshipTab = () => {
    return (
      <div className="space-y-4">
        {/* Relationship Level */}
        <div className="bg-gray-800/50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
            <Heart className="w-5 h-5 mr-2" />
            Mức Độ Quan Hệ
          </h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Quan hệ</span>
                <span className="text-white font-medium">{Math.round(npc.relationshipLevel)}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div 
                  className={`h-3 rounded-full transition-all duration-300 ${
                    npc.relationshipLevel > 0 ? 'bg-yellow-600' : 'bg-gray-900'
                  }`}
                  style={{ width: `${Math.min(Math.abs(npc.relationshipLevel), 100)}%` }}
                ></div>
              </div>
            </div>
            
            <div className="flex items-center justify-center">
              <span className={`px-3 py-1 rounded text-sm font-medium ${
                npc.status === 'admiring' ? 'bg-gray-800/20 text-gray-300 border border-gray-700/50' :
                npc.status === 'ally' ? 'bg-yellow-800/20 text-yellow-300 border border-yellow-500/50' :
                npc.status === 'trusting' ? 'bg-yellow-700/20 text-yellow-300 border border-yellow-500/50' :
                npc.status === 'friendly' ? 'bg-yellow-600/20 text-yellow-300 border border-yellow-500/50' :
                npc.status === 'respectful' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/50' :
                npc.status === 'neutral' ? 'bg-gray-600/20 text-gray-300 border border-gray-500/50' :
                npc.status === 'acquaintance' ? 'bg-gray-500/20 text-gray-300 border border-gray-500/50' :
                npc.status === 'cautious' ? 'bg-yellow-600/20 text-yellow-300 border border-yellow-500/50' :
                npc.status === 'suspicious' ? 'bg-yellow-700/20 text-yellow-300 border border-yellow-500/50' :
                npc.status === 'disappointed' ? 'bg-yellow-700/20 text-yellow-300 border border-yellow-500/50' :
                npc.status === 'rival' ? 'bg-yellow-800/20 text-yellow-300 border border-yellow-500/50' :
                npc.status === 'enemy' ? 'bg-gray-900/20 text-white border border-gray-700/50' :
                npc.status === 'hostile' ? 'bg-gray-900/20 text-white border border-gray-700/50' :
                npc.status === 'competitive' ? 'bg-yellow-600/20 text-yellow-300 border border-yellow-500/50' :
                'bg-gray-600/20 text-gray-300 border border-gray-500/50'
              }`}>
                {npc.status === 'admiring' ? 'Ngưỡng mộ' :
                 npc.status === 'ally' ? 'Đồng minh' :
                 npc.status === 'trusting' ? 'Tin tưởng' :
                 npc.status === 'friendly' ? 'Thân thiện' :
                 npc.status === 'respectful' ? 'Tôn trọng' :
                 npc.status === 'neutral' ? 'Trung lập' :
                 npc.status === 'acquaintance' ? 'Quen biết' :
                 npc.status === 'cautious' ? 'Thận trọng' :
                 npc.status === 'suspicious' ? 'Nghi ngờ' :
                 npc.status === 'disappointed' ? 'Thất vọng' :
                 npc.status === 'rival' ? 'Đối thủ' :
                 npc.status === 'enemy' ? 'Kẻ thù' :
                 npc.status === 'hostile' ? 'Thù địch' :
                 npc.status === 'competitive' ? 'Cạnh tranh' :
                 'Trung lập'}
              </span>
            </div>
          </div>
        </div>

        {/* Reputation */}
        <div className="bg-gray-800/50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
            <Star className="w-5 h-5 mr-2" />
            Danh Tiếng
          </h3>
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Danh tiếng</span>
              <span className="text-white font-medium">{Math.round(npc.reputation)}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all duration-300 ${
                  npc.reputation > 0 ? 'bg-yellow-500' : 'bg-gray-900'
                }`}
                style={{ width: `${Math.min(Math.abs(npc.reputation), 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Arousal Section - Only for 18+ content */}
        {contentFlags?.adult_enabled && contentFlags?.adult_intensity === 'direct' && npc.arousal && (
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
              <Heart className="w-5 h-5 mr-2" />
              Hứng Tình
            </h3>
            
            {/* Basic Arousal Level */}
            <div className="mb-4">
              <NPCArousalBar 
                npc={npc} 
                contentFlags={contentFlags}
                className="mt-3"
              />
            </div>

            {/* Detailed Arousal Personality */}
            {npc.arousal.personality && (
              <div className="space-y-3">
                <h4 className="text-md font-medium text-white mb-2">Tính Cách Tình Cảm</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-400">Phản ứng:</span>
                    <div className="flex items-center space-x-2 mt-1">
                      <div className="w-16 bg-gray-700 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full bg-gray-800"
                          style={{ width: `${npc.arousal.personality.responsiveness}%` }}
                        ></div>
                      </div>
                      <span className="text-white text-xs">{npc.arousal.personality.responsiveness}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400">Ức chế:</span>
                    <div className="flex items-center space-x-2 mt-1">
                      <div className="w-16 bg-gray-700 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full bg-yellow-500"
                          style={{ width: `${npc.arousal.personality.inhibition}%` }}
                        ></div>
                      </div>
                      <span className="text-white text-xs">{npc.arousal.personality.inhibition}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400">Tò mò:</span>
                    <div className="flex items-center space-x-2 mt-1">
                      <div className="w-16 bg-gray-700 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full bg-yellow-600"
                          style={{ width: `${npc.arousal.personality.curiosity}%` }}
                        ></div>
                      </div>
                      <span className="text-white text-xs">{npc.arousal.personality.curiosity}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400">Kinh nghiệm:</span>
                    <div className="flex items-center space-x-2 mt-1">
                      <div className="w-16 bg-gray-700 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full bg-yellow-600"
                          style={{ width: `${npc.arousal.personality.experience}%` }}
                        ></div>
                      </div>
                      <span className="text-white text-xs">{npc.arousal.personality.experience}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400">Thống trị:</span>
                    <div className="flex items-center space-x-2 mt-1">
                      <div className="w-16 bg-gray-700 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full bg-gray-900"
                          style={{ width: `${npc.arousal.personality.dominance}%` }}
                        ></div>
                      </div>
                      <span className="text-white text-xs">{npc.arousal.personality.dominance}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400">Lãng mạn:</span>
                    <div className="flex items-center space-x-2 mt-1">
                      <div className="w-16 bg-gray-700 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full bg-gray-800"
                          style={{ width: `${npc.arousal.personality.romanticism}%` }}
                        ></div>
                      </div>
                      <span className="text-white text-xs">{npc.arousal.personality.romanticism}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Arousal Preferences */}
            {npc.arousal.preferences && (
              <div className="mt-4 space-y-3">
                <h4 className="text-md font-medium text-white mb-2">Sở Thích & Ranh Giới</h4>
                
                {/* Gender & Age Preferences */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {npc.arousal.preferences.genderPreference && (
                    <div>
                      <span className="text-gray-400">Giới tính ưa thích:</span>
                      <span className="text-white ml-2 capitalize">
                        {npc.arousal.preferences.genderPreference === 'any' ? 'Bất kỳ' :
                         npc.arousal.preferences.genderPreference === 'male' ? 'Nam' :
                         npc.arousal.preferences.genderPreference === 'female' ? 'Nữ' : 'Không'}
                      </span>
                    </div>
                  )}
                  {npc.arousal.preferences.agePreference && (
                    <div>
                      <span className="text-gray-400">Tuổi tác ưa thích:</span>
                      <span className="text-white ml-2 capitalize">
                        {npc.arousal.preferences.agePreference === 'any' ? 'Bất kỳ' :
                         npc.arousal.preferences.agePreference === 'younger' ? 'Trẻ hơn' :
                         npc.arousal.preferences.agePreference === 'same' ? 'Cùng tuổi' :
                         npc.arousal.preferences.agePreference === 'older' ? 'Lớn hơn' : 'Bất kỳ'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Turn Ons */}
                {npc.arousal.preferences.turnOns && npc.arousal.preferences.turnOns.length > 0 && (
                  <div>
                    <span className="text-gray-400 text-sm">Hấp dẫn:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {npc.arousal.preferences.turnOns.map((turnOn, index) => (
                        <span key={index} className="px-2 py-1 bg-yellow-700/20 text-yellow-300 rounded text-xs">
                          {turnOn}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Turn Offs */}
                {npc.arousal.preferences.turnOffs && npc.arousal.preferences.turnOffs.length > 0 && (
                  <div>
                    <span className="text-gray-400 text-sm">Không thích:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {npc.arousal.preferences.turnOffs.map((turnOff, index) => (
                        <span key={index} className="px-2 py-1 bg-gray-900/20 text-white rounded text-xs">
                          {turnOff}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Kinks */}
                {npc.arousal.preferences.kinks && npc.arousal.preferences.kinks.length > 0 && (
                  <div>
                    <span className="text-gray-400 text-sm">Sở thích đặc biệt:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {npc.arousal.preferences.kinks.map((kink, index) => (
                        <span key={index} className="px-2 py-1 bg-yellow-600/20 text-yellow-300 rounded text-xs">
                          {kink}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Boundaries */}
                {npc.arousal.preferences.boundaries && npc.arousal.preferences.boundaries.length > 0 && (
                  <div>
                    <span className="text-gray-400 text-sm">Ranh giới:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {npc.arousal.preferences.boundaries.map((boundary, index) => (
                        <span key={index} className="px-2 py-1 bg-yellow-700/20 text-yellow-300 rounded text-xs">
                          {boundary}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Personality Types */}
                {npc.arousal.preferences.personalityTypes && npc.arousal.preferences.personalityTypes.length > 0 && (
                  <div>
                    <span className="text-gray-400 text-sm">Kiểu tính cách ưa thích:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {npc.arousal.preferences.personalityTypes.map((type, index) => (
                        <span key={index} className="px-2 py-1 bg-yellow-600/20 text-yellow-300 rounded text-xs">
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Recent Changes */}
        {npc.arousal?.arousalHistory && npc.arousal.arousalHistory.length > 0 && (
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Thay Đổi Gần Đây
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {npc.arousal.arousalHistory
                .slice(-5) // Show only last 5 changes
                .reverse() // Most recent first
                .map((event) => (
                <div key={event.id} className="bg-gray-700/50 rounded-lg p-3 text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-gray-400 text-xs">
                      {new Date(event.timestamp).toLocaleString('vi-VN')}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      event.change > 0 
                        ? 'bg-yellow-700/20 text-yellow-300' 
                        : event.change < 0 
                        ? 'bg-gray-900/20 text-white'
                        : 'bg-gray-600/20 text-gray-300'
                    }`}>
                      {event.change > 0 ? '+' : ''}{event.change}
                    </span>
                  </div>
                  <div className="text-white mb-1">
                    <span className="font-medium">{event.reason}</span>
                  </div>
                  <div className="text-gray-300 text-xs">
                    {event.context}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      event.intensity === 'high' 
                        ? 'bg-gray-900/20 text-white' 
                        : event.intensity === 'medium' 
                        ? 'bg-yellow-500/20 text-yellow-300'
                        : 'bg-yellow-500/20 text-yellow-300'
                    }`}>
                      {event.intensity === 'high' ? 'Cao' : 
                       event.intensity === 'medium' ? 'Trung bình' : 'Thấp'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    );
  };

  return (
    <MotionWrapper
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <MotionWrapper
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className={`bg-gray-900 rounded-lg border border-gray-700 shadow-2xl flex flex-col ${
          shouldUseMobileLayout() 
            ? 'w-full h-full' 
            : 'w-full max-w-2xl max-h-[90vh]'
        }`}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {/* Header */}
        <ModalHeader
          title={npc.name}
          subtitle="Chi tiết nhân vật"
          icon={<User className="w-5 h-5 text-yellow-400" />}
          onClose={onClose}
          onMinimize={minimize}
        />

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-700/50 flex-shrink-0">
          <button
            onClick={() => setActiveTab('info')}
            className={getTransitionClass(`flex items-center space-x-2 px-4 py-3 text-sm transition-colors duration-200 flex-1 ${
              activeTab === 'info'
                ? 'bg-yellow-600/20 border-b-2 border-yellow-500 text-yellow-300'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`)}
          >
            <Info className="w-4 h-4" />
            <span>Thông tin</span>
          </button>
          <button
            onClick={() => setActiveTab('relationship')}
            className={getTransitionClass(`flex items-center space-x-2 px-4 py-3 text-sm transition-colors duration-200 flex-1 ${
              activeTab === 'relationship'
                ? 'bg-yellow-600/20 border-b-2 border-yellow-500 text-yellow-300'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`)}
          >
            <Heart className="w-4 h-4" />
            <span>Quan hệ</span>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1">
          <div className="p-4">
            {activeTab === 'info' && renderInfoTab()}
            {activeTab === 'relationship' && renderRelationshipTab()}
          </div>
        </div>
      </MotionWrapper>
    </MotionWrapper>
  );
}
