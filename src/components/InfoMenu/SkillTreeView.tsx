import { useState } from 'react';
import { Character, SkillTreeSkill } from '../../types';
import { skillTreeService } from '../../services/skillTreeService';
import { combatLevelService } from '../../services/combatLevelService';
import { levelSystemService } from '../../services/levelSystemService';
import { 
  Sword, 
  Heart, 
  Zap, 
  Star, 
  RotateCcw,
  Check,
  Lock,
  AlertTriangle
} from 'lucide-react';

interface SkillTreeViewProps {
  character: Character;
  onCharacterUpdate?: (character: Character) => void;
}

export function SkillTreeView({ character, onCharacterUpdate }: SkillTreeViewProps) {
  const [activeTab, setActiveTab] = useState<'combat' | 'social'>('combat');
  const [showResetModal, setShowResetModal] = useState(false);

  // Lấy skill definitions
  const skillDefinitions = skillTreeService.getSkillDefinitions();
  
  // Lọc skills theo category
  const combatSkills = skillDefinitions.filter(skill => skill.category === 'combat');
  const socialSkills = skillDefinitions.filter(skill => skill.category === 'social');

  // Lấy active bonuses
  const activeBonuses = skillTreeService.getActiveBonuses(character);

  // Skill points hiện tại
  const combatPoints = character.skillPoints?.combat || 0;
  const socialPoints = character.skillPoints?.social || 0;

  // Learned skills
  const learnedCombatSkills = character.skillTree?.combat?.learned || [];
  const learnedSocialSkills = character.skillTree?.social?.learned || [];

  // Available skills
  const availableCombatSkills = character.skillTree?.combat?.available || [];
  const availableSocialSkills = character.skillTree?.social?.available || [];

  // Học skill
  const handleLearnSkill = (skillId: string) => {
    const success = skillTreeService.learnSkill(character, skillId);
    if (success && onCharacterUpdate) {
      onCharacterUpdate(character);
    }
  };

  // Reset skill tree
  const handleResetSkillTree = () => {
    const cost = 1000; // Cost để reset
    const success = skillTreeService.resetSkillTree(character, cost);
    if (success && onCharacterUpdate) {
      onCharacterUpdate(character);
      setShowResetModal(false);
    }
  };

  // Render skill icon
  const renderSkillIcon = (skill: SkillTreeSkill) => {
    const isLearned = learnedCombatSkills.includes(skill.id) || learnedSocialSkills.includes(skill.id);
    const canLearn = skillTreeService.canLearnSkill(character, skill.id);
    
    return (
      <div className={`w-16 h-16 rounded-lg flex items-center justify-center text-3xl transition-all duration-200 ${
        isLearned 
          ? 'bg-green-600/20 border-2 border-green-500 text-green-300' 
          : canLearn 
            ? 'bg-blue-600/20 border-2 border-blue-500 text-blue-300 hover:bg-blue-600/30 cursor-pointer'
            : 'bg-gray-600/20 border-2 border-gray-500 text-gray-400'
      }`}>
        {skill.icon || '⭐'}
      </div>
    );
  };

  // Render skill card
  const renderSkillCard = (skill: SkillTreeSkill) => {
    const isLearned = learnedCombatSkills.includes(skill.id) || learnedSocialSkills.includes(skill.id);
    const canLearn = skillTreeService.canLearnSkill(character, skill.id);
    const isAvailable = availableCombatSkills.includes(skill.id) || availableSocialSkills.includes(skill.id);

    return (
      <div 
        key={skill.id}
        className={`bg-gray-800/50 rounded-lg p-4 border transition-all duration-200 md:min-h-[280px] ${
          isLearned 
            ? 'border-green-500/50 bg-green-900/20' 
            : canLearn 
              ? 'border-blue-500/50 hover:border-blue-400 cursor-pointer'
              : 'border-gray-600/50'
        }`}
        onClick={() => canLearn && handleLearnSkill(skill.id)}
      >
        <div className="flex items-start space-x-3 md:flex-col md:items-center md:text-center md:space-x-0 md:space-y-3">
          <div className="flex flex-col items-center">
            {renderSkillIcon(skill)}
            <span className={`text-xs px-2 py-1 rounded mt-2 ${
              skill.tier === 1 ? 'bg-gray-600 text-gray-300' :
              skill.tier === 2 ? 'bg-blue-600 text-blue-300' :
              skill.tier === 3 ? 'bg-purple-600 text-purple-300' :
              'bg-yellow-600 text-yellow-300'
            }`}>
              {skill.tier === 'special' ? 'Đặc biệt' : `Tier ${skill.tier}`}
            </span>
          </div>
          
          <div className="flex-1 md:w-full">
            <div className="flex items-center justify-between mb-2 md:justify-center">
              <h3 className={`font-semibold text-sm ${
                isLearned ? 'text-green-300' : canLearn ? 'text-blue-300' : 'text-gray-400'
              }`}>
                {skill.name}
              </h3>
              <div className="flex items-center space-x-1 md:ml-2">
                {isLearned && <Check className="w-4 h-4 text-green-400" />}
                {!isAvailable && !isLearned && <Lock className="w-4 h-4 text-gray-500" />}
              </div>
            </div>
            
            <p className="text-xs text-gray-300 mb-2">{skill.description}</p>
            
            {/* Bonuses - Compact display */}
            <div className="space-y-1 mb-3">
              {skill.bonuses.armorClass && (
                <div className="text-xs text-green-400 font-medium">
                  +{skill.bonuses.armorClass} AC
                </div>
              )}
              {skill.bonuses.attackBonus && (
                <div className="text-xs text-green-400 font-medium">
                  +{skill.bonuses.attackBonus} Attack
                </div>
              )}
              {skill.bonuses.damageBonus && (
                <div className="text-xs text-green-400 font-medium">
                  {skill.bonuses.damageBonus} Damage
                </div>
              )}
              {skill.bonuses.initiative && (
                <div className="text-xs text-green-400 font-medium">
                  +{skill.bonuses.initiative} Initiative
                </div>
              )}
              {skill.bonuses.criticalChance && (
                <div className="text-xs text-green-400 font-medium">
                  +{skill.bonuses.criticalChance}% Critical
                </div>
              )}
              {skill.bonuses.statBonuses && Object.entries(skill.bonuses.statBonuses).map(([stat, value]) => (
                <div key={stat} className="text-xs text-green-400 font-medium">
                  +{value} {stat.charAt(0).toUpperCase() + stat.slice(1)}
                </div>
              ))}
              {skill.bonuses.shopPriceModifier && (
                <div className="text-xs text-green-400 font-medium">
                  {skill.bonuses.shopPriceModifier}% Shop
                </div>
              )}
              {skill.bonuses.sellPriceModifier && (
                <div className="text-xs text-green-400 font-medium">
                  +{skill.bonuses.sellPriceModifier}% Sell
                </div>
              )}
              {skill.bonuses.reputationGainModifier && (
                <div className="text-xs text-green-400 font-medium">
                  +{skill.bonuses.reputationGainModifier}% Rep
                </div>
              )}
              {skill.bonuses.relationshipGainModifier && (
                <div className="text-xs text-green-400 font-medium">
                  +{skill.bonuses.relationshipGainModifier}% Rel
                </div>
              )}
            </div>
            
            {/* Cost and Learn Button */}
            <div className="flex items-center justify-between md:flex-col md:items-center md:space-y-2">
              <span className="text-xs text-gray-500">
                {skill.cost} skill point{skill.cost > 1 ? 's' : ''}
              </span>
              {canLearn && (
                <button className="px-3 py-1 bg-blue-600 text-blue-100 rounded text-xs hover:bg-blue-700 transition-colors">
                  Learn
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Test buttons for leveling up
  const renderTestButtons = () => (
    <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
      <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
        <Zap className="w-5 h-5 mr-2" />
        Test Level Up
      </h3>
      <div className="flex space-x-3">
        <button
          onClick={() => {
            // Add combat experience to trigger combat level up
            const result = combatLevelService.addCombatExperience(character, 1);
            if (result.leveledUp) {
              alert(`Combat Level Up! New Level: ${result.newCombatLevel}\nSkill Points Earned: ${result.skillPointsEarned}\nHP Bonus: +${result.hpBonusEarned}`);
              onCharacterUpdate?.(character);
            } else {
              alert(`Combat XP added. Progress: ${result.newCombatXP}/${combatLevelService.getXPForCombatLevel(character.combatLevel || 1)} XP to next level`);
            }
          }}
          className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors text-sm"
        >
          +1 Combat XP
        </button>
        <button
          onClick={() => {
            // Add regular experience to trigger character level up
            const result = levelSystemService.addExperience(character, 300);
            if (result.leveledUp) {
              alert(`Character Level Up! New Level: ${result.newLevel}\nSocial Skill Points Earned: ${result.socialSkillPointsEarned}`);
              onCharacterUpdate?.(character);
            } else {
              alert(`XP added. Current Level: ${result.newLevel}`);
            }
          }}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors text-sm"
        >
          +300 XP
        </button>
        <button
          onClick={() => {
            // Add both types of experience
            const combatResult = combatLevelService.addCombatExperience(character, 1);
            const levelResult = levelSystemService.addExperience(character, 300);
            
            let message = '';
            if (combatResult.leveledUp) {
              message += `Combat Level Up! Level: ${combatResult.newCombatLevel}\nCombat Skill Points: +${combatResult.skillPointsEarned}\nHP Bonus: +${combatResult.hpBonusEarned}\n\n`;
            }
            if (levelResult.leveledUp) {
              message += `Character Level Up! Level: ${levelResult.newLevel}\nSocial Skill Points: +${levelResult.socialSkillPointsEarned}`;
            }
            if (!message) {
              message = 'XP added. Check progress in character info.';
            }
            alert(message);
            onCharacterUpdate?.(character);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
        >
          +Both
        </button>
      </div>
    </div>
  );

  // Render active bonuses summary
  const renderActiveBonuses = () => (
    <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
      <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
        <Star className="w-5 h-5 mr-2" />
        Active Bonuses
      </h3>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <h4 className="text-blue-300 font-medium mb-2">Combat</h4>
          <div className="space-y-1">
            {activeBonuses.armorClass && activeBonuses.armorClass > 0 && (
              <div className="text-gray-300">+{activeBonuses.armorClass} AC</div>
            )}
            {activeBonuses.attackBonus && activeBonuses.attackBonus > 0 && (
              <div className="text-gray-300">+{activeBonuses.attackBonus} Attack</div>
            )}
            {activeBonuses.damageBonus && (
              <div className="text-gray-300">{activeBonuses.damageBonus} Damage</div>
            )}
            {activeBonuses.initiative && activeBonuses.initiative > 0 && (
              <div className="text-gray-300">+{activeBonuses.initiative} Initiative</div>
            )}
            {activeBonuses.criticalChance && activeBonuses.criticalChance > 0 && (
              <div className="text-gray-300">+{activeBonuses.criticalChance}% Critical</div>
            )}
          </div>
        </div>
        <div>
          <h4 className="text-green-300 font-medium mb-2">Social</h4>
          <div className="space-y-1">
            {activeBonuses.statBonuses && Object.entries(activeBonuses.statBonuses).map(([stat, value]) => 
              value > 0 && (
                <div key={stat} className="text-gray-300">
                  +{value} {stat.charAt(0).toUpperCase() + stat.slice(1)}
                </div>
              )
            )}
            {activeBonuses.shopPriceModifier && activeBonuses.shopPriceModifier !== 0 && (
              <div className="text-gray-300">{activeBonuses.shopPriceModifier}% Shop Prices</div>
            )}
            {activeBonuses.sellPriceModifier && activeBonuses.sellPriceModifier > 0 && (
              <div className="text-gray-300">+{activeBonuses.sellPriceModifier}% Sell Prices</div>
            )}
            {activeBonuses.reputationGainModifier && activeBonuses.reputationGainModifier > 0 && (
              <div className="text-gray-300">+{activeBonuses.reputationGainModifier}% Reputation</div>
            )}
            {activeBonuses.relationshipGainModifier && activeBonuses.relationshipGainModifier > 0 && (
              <div className="text-gray-300">+{activeBonuses.relationshipGainModifier}% Relationship</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Test Buttons */}
      {renderTestButtons()}
      
      {/* Active Bonuses */}
      {renderActiveBonuses()}

      {/* Skill Points */}
      <div className="bg-gray-800/50 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-3">Skill Points</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-3">
            <Sword className="w-6 h-6 text-orange-400" />
            <div>
              <div className="text-orange-300 font-medium">Combat Points</div>
              <div className="text-2xl font-bold text-orange-400">{combatPoints}</div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Heart className="w-6 h-6 text-pink-400" />
            <div>
              <div className="text-pink-300 font-medium">Social Points</div>
              <div className="text-2xl font-bold text-pink-400">{socialPoints}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700/50">
        <button
          onClick={() => setActiveTab('combat')}
          className={`flex items-center space-x-2 px-4 py-3 text-sm transition-colors duration-200 ${
            activeTab === 'combat'
              ? 'bg-orange-600/20 border-b-2 border-orange-500 text-orange-300'
              : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
          }`}
        >
          <Sword className="w-4 h-4" />
          <span>Combat Skills</span>
        </button>
        <button
          onClick={() => setActiveTab('social')}
          className={`flex items-center space-x-2 px-4 py-3 text-sm transition-colors duration-200 ${
            activeTab === 'social'
              ? 'bg-pink-600/20 border-b-2 border-pink-500 text-pink-300'
              : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
          }`}
        >
          <Heart className="w-4 h-4" />
          <span>Social Skills</span>
        </button>
      </div>

      {/* Skills Grid */}
      <div className="space-y-4 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4 md:space-y-0">
        {activeTab === 'combat' 
          ? combatSkills.map(renderSkillCard)
          : socialSkills.map(renderSkillCard)
        }
      </div>

      {/* Reset Button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowResetModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-red-600/20 border border-red-500/50 text-red-300 rounded hover:bg-red-600/30 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reset Skill Tree (1000 gold)</span>
        </button>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-400" />
              <h3 className="text-lg font-semibold text-white">Reset Skill Tree</h3>
            </div>
            <p className="text-gray-300 mb-6">
              Bạn có chắc chắn muốn reset toàn bộ skill tree? Thao tác này sẽ:
            </p>
            <ul className="text-sm text-gray-400 mb-6 space-y-1">
              <li>• Hoàn lại tất cả skill points</li>
              <li>• Xóa tất cả skills đã học</li>
              <li>• Tốn 1000 gold</li>
            </ul>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowResetModal(false)}
                className="flex-1 px-4 py-2 bg-gray-600 text-gray-300 rounded hover:bg-gray-700 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleResetSkillTree}
                className="flex-1 px-4 py-2 bg-red-600 text-red-100 rounded hover:bg-red-700 transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
