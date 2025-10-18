import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Character } from '../types';
import { MotionWrapper } from '../components/MotionWrapper';
import { geminiService } from '../services/geminiService';
import { nameGenerationService, NameGenerationOptions, GeneratedName } from '../services/nameGenerationService';
import { levelSystemService } from '../services/levelSystemService';
import { combatLevelService } from '../services/combatLevelService';
import { currencyService } from '../services/currencyService';
import { skillTreeService } from '../services/skillTreeService';
import { Sparkles, Download, RotateCcw, Check, Globe, Upload, Shuffle, Star } from 'lucide-react';
import { useResponsiveContext } from '../contexts/ResponsiveContext';
import { translateEffectFormat } from '../utils/skillEffectTranslator';
import { HelpButton } from '../components/HelpChat/HelpButton';

interface CharacterData {
  name: string;
  gender: 'male' | 'female' | 'other';
  appearance: string;
  personality: string;
  backstory: string;
  personalityTraits: string[];
  coreStats: {
    strength: number;
    agility: number;
    intelligence: number;
    constitution: number;
    wisdom: number;
    charisma: number;
    armorClass: number;
    modifiers: {
      strength: number;
      agility: number;
      intelligence: number;
      constitution: number;
      wisdom: number;
      charisma: number;
    };
  };
  health?: {
    current: number;
    max: number;
  };
  customStats: { name: string; value: number }[];
  proficiencies: { name: string; level: number; description?: string }[]; // Legacy
  skills: {
    id: string;
    name: string;
    description: string;
    level: number;
    skillType: 'damage' | 'healing' | 'social';
    effects: string[];
    cooldown: number;
    currentCooldown: number;
    icon: string;
    requiresTarget?: boolean;
  }[];
}

export function CharacterCreationPage() {
  const navigate = useNavigate();
  const { shouldUseMobileLayout } = useResponsiveContext();
  const [currentStep, setCurrentStep] = useState<'description' | 'customize'>('description');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRerolling, setIsRerolling] = useState(false);
  const [lockedSkills, setLockedSkills] = useState<Set<string>>(new Set());
  const [isGeneratingName, setIsGeneratingName] = useState(false);
  const [characterDescription, setCharacterDescription] = useState('');
  const [worldDescription, setWorldDescription] = useState('');
  const [nameGenerationOptions, setNameGenerationOptions] = useState<NameGenerationOptions>({
    gender: 'any',
    culture: 'any',
    type: 'full',
    length: 'medium',
    style: 'traditional'
  });
  const [generatedNames, setGeneratedNames] = useState<GeneratedName[]>([]);
  const [showNameGenerator, setShowNameGenerator] = useState(false);
  const [characterData, setCharacterData] = useState<CharacterData>({
    name: '',
    gender: 'male',
    appearance: '',
    personality: '',
    backstory: '',
    personalityTraits: [],
    coreStats: {
      strength: 10,
      agility: 10,
      intelligence: 10,
      constitution: 10,
      wisdom: 10,
      charisma: 10,
      armorClass: 10, // Base AC
      modifiers: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        constitution: 0,
        wisdom: 0,
        charisma: 0
      }
    },
    health: {
      current: 20, // Sẽ được tính lại dựa trên constitution
      max: 20
    },
    customStats: [],
    proficiencies: [], // Legacy
    skills: [] // New skill system
  });

  // Load world description from localStorage
  useEffect(() => {
    const savedWorldDescription = localStorage.getItem('currentWorldDescription');
    if (savedWorldDescription) {
      setWorldDescription(savedWorldDescription);
    }
  }, []);

  // Cập nhật tùy chọn tạo tên khi giới tính thay đổi
  useEffect(() => {
    setNameGenerationOptions(prev => ({
      ...prev,
      gender: characterData.gender === 'other' ? 'any' : characterData.gender
    }));
  }, [characterData.gender]);


  // Cập nhật health khi core stats thay đổi
  const updateHealth = (newCoreStats: typeof characterData.coreStats) => {
    const maxHealth = Math.floor((newCoreStats.constitution - 10) / 2) + 20;
    
    setCharacterData(prev => ({
      ...prev,
      coreStats: newCoreStats,
      health: {
        current: Math.min(prev.health?.current || maxHealth, maxHealth),
        max: maxHealth
      }
    }));
  };

  // Tạo tên ngẫu nhiên
  const handleGenerateNames = async () => {
    setIsGeneratingName(true);
    try {
      const names = nameGenerationService.generateMultipleNames(6, nameGenerationOptions);
      setGeneratedNames(names);
    } catch (error) {
      console.error('Lỗi tạo tên:', error);
    } finally {
      setIsGeneratingName(false);
    }
  };

  // Chọn tên từ danh sách đã tạo
  const handleSelectName = (name: string) => {
    setCharacterData(prev => ({ ...prev, name }));
    setShowNameGenerator(false);
  };

  // Tạo tên nhanh
  const handleQuickGenerateName = () => {
    try {
      const name = nameGenerationService.generateName(nameGenerationOptions);
      setCharacterData(prev => ({ ...prev, name: name.name }));
    } catch (error) {
      console.error('Lỗi tạo tên nhanh:', error);
    }
  };

  const handleAnalyzeDescription = async () => {
    if (!characterDescription.trim()) return;
    
    setIsAnalyzing(true);
    try {
      // Get world context from localStorage
      const worldGenResult = localStorage.getItem('world_gen_result');
      const worldContext = worldGenResult ? JSON.parse(worldGenResult) : null;
      
      const analysis = await geminiService.analyzeCharacterDescription(characterDescription, worldContext);
      
      // Convert new schema to old format for compatibility
      const convertedData: any = {
        name: analysis.name || '',
        gender: analysis.gender === 'Nam' ? 'male' : analysis.gender === 'Nữ' ? 'female' : 'male',
        appearance: analysis.appearance || '',
        personality: analysis.personalitySummary || '',
        backstory: analysis.backstory || '',
        personalityTraits: analysis.traits || [],
        coreStats: {
          strength: analysis.coreStats?.str?.score || 10,
          agility: analysis.coreStats?.dex?.score || 10,
          intelligence: analysis.coreStats?.int?.score || 10,
          constitution: analysis.coreStats?.con?.score || 10,
          wisdom: analysis.coreStats?.wis?.score || 10,
          charisma: analysis.coreStats?.cha?.score || 10,
          modifiers: {
            strength: Math.floor(((analysis.coreStats?.str?.score || 10) - 10) / 2),
            agility: Math.floor(((analysis.coreStats?.dex?.score || 10) - 10) / 2),
            intelligence: Math.floor(((analysis.coreStats?.int?.score || 10) - 10) / 2),
            constitution: Math.floor(((analysis.coreStats?.con?.score || 10) - 10) / 2),
            wisdom: Math.floor(((analysis.coreStats?.wis?.score || 10) - 10) / 2),
            charisma: Math.floor(((analysis.coreStats?.cha?.score || 10) - 10) / 2)
          }
        },
        health: {
          current: Math.floor(((analysis.coreStats?.con?.score || 10) - 10) / 2) + 20,
          max: Math.floor(((analysis.coreStats?.con?.score || 10) - 10) / 2) + 20
        },
        customStats: [],
        proficiencies: analysis.skills?.map((skill: any) => ({
          name: skill.name || '',
          level: skill.level || 1,
          description: skill.description || ''
        })) || []
      };
      
      // Add derived stats if available
      if (analysis.derived) {
        convertedData.hpMax = analysis.derived.hpMax || 100;
        convertedData.energyMax = analysis.derived.energyMax || 100;
      }
      
      setCharacterData(convertedData);
      setCurrentStep('customize');
      
      // Show evidence information if available
      if (analysis.unknown_fields && analysis.unknown_fields.length > 0) {
        // Missing fields detected
      }
    } catch (error) {
      console.error('Error analyzing character:', error);
      alert('Có lỗi xảy ra khi phân tích nhân vật. Vui lòng thử lại.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddPersonalityTrait = () => {
    setCharacterData(prev => ({
      ...prev,
      personalityTraits: [...prev.personalityTraits, '']
    }));
  };

  const handleRemovePersonalityTrait = (index: number) => {
    setCharacterData(prev => ({
      ...prev,
      personalityTraits: prev.personalityTraits.filter((_, i) => i !== index)
    }));
  };

  const handleUpdatePersonalityTrait = (index: number, value: string) => {
    setCharacterData(prev => ({
      ...prev,
      personalityTraits: prev.personalityTraits.map((trait, i) => 
        i === index ? value : trait
      )
    }));
  };



  const handleResetForm = () => {
    const defaultCoreStats = {
      strength: 10,
      agility: 10,
      intelligence: 10,
      constitution: 10,
      wisdom: 10,
      charisma: 10,
      armorClass: 10,
      modifiers: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        constitution: 0,
        wisdom: 0,
        charisma: 0
      }
    };
    
    const maxHealth = Math.floor((defaultCoreStats.constitution - 10) / 2) + 20;
    
    setCharacterData({
      name: '',
      gender: 'male',
      appearance: '',
      personality: '',
      backstory: '',
      personalityTraits: [],
      coreStats: defaultCoreStats,
      health: {
        current: maxHealth,
        max: maxHealth
      },
      customStats: [],
      proficiencies: [], // Legacy
      skills: [] // New skill system
    });
    setCharacterDescription('');
    setCurrentStep('description');
  };

  const handleAcceptAndStart = () => {
    // Calculate final AC based on agility modifier
    const finalCoreStats = {
      ...characterData.coreStats,
      armorClass: 10 + characterData.coreStats.modifiers.agility
    };

    // Convert to Character type and save
    const character: Character = {
      name: characterData.name,
      gender: characterData.gender,
      backstory: characterData.backstory,
      // Add custom fields
      appearance: characterData.appearance,
      personality: characterData.personality,
      personalityTraits: characterData.personalityTraits,
      coreStats: finalCoreStats,
      health: characterData.health,
      customStats: [],
      proficiencies: characterData.proficiencies, // Legacy
      skills: characterData.skills || [] // New skill system
    };

    // Khởi tạo level và experience
    levelSystemService.initializeCharacter(character);
    
    // Khởi tạo combat level
    combatLevelService.initializeCharacter(character);

    // Khởi tạo skill tree
    skillTreeService.initializeCharacter(character);

    // Khởi tạo currency dựa trên world data
    try {
      const worldData = localStorage.getItem('world_gen_result');
      if (worldData) {
        const parsedWorldData = JSON.parse(worldData);
        currencyService.initializeCharacter(character, parsedWorldData);
      } else {
        // Fallback nếu không có world data
        character.currency = 100; // Default currency
      }
    } catch (error) {
      console.warn('Failed to initialize currency:', error);
      character.currency = 100; // Fallback currency
    }

    localStorage.setItem('currentCharacter', JSON.stringify(character));
    navigate('/game');
  };

  const handleExportCharacter = () => {
    try {
      const exportData = {
        ...characterData,
        exportedAt: new Date().toISOString(),
        version: '1.0.0'
      };
      
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `character-${characterData.name || 'unnamed'}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      alert('✅ Đã xuất dữ liệu nhân vật thành công!');
    } catch (error) {
      console.error('Error exporting character:', error);
      alert('❌ Có lỗi xảy ra khi xuất dữ liệu nhân vật');
    }
  };

  // Import character data from JSON file
  const handleImportCharacter = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importedData = JSON.parse(content);
        
        // Validate the imported data structure
        if (!importedData.name && !importedData.coreStats) {
          throw new Error('Dữ liệu không hợp lệ: thiếu thông tin cơ bản');
        }
        
        // Update character data with imported data
        setCharacterData(prev => ({
          ...prev,
          ...importedData,
          // Ensure required fields have defaults
          name: importedData.name || prev.name,
          gender: importedData.gender || prev.gender,
          coreStats: importedData.coreStats || prev.coreStats,
          personalityTraits: importedData.personalityTraits || prev.personalityTraits,
          customStats: importedData.customStats || prev.customStats,
          proficiencies: importedData.proficiencies || prev.proficiencies
        }));
        
        // Auto switch to customize tab after successful import
        setCurrentStep('customize');
        
        alert('✅ Đã nhập dữ liệu nhân vật thành công! Chuyển sang tab tùy chỉnh.');
      } catch (error) {
        console.error('Error importing character:', error);
        alert('❌ Có lỗi xảy ra khi nhập dữ liệu nhân vật: ' + (error instanceof Error ? error.message : 'Lỗi không xác định'));
      }
    };
    reader.readAsText(file);
  };

  const handleAISuggestStats = async () => {
    try {
      // Get world context from localStorage
      const worldGenResult = localStorage.getItem('world_gen_result');
      const worldContext = worldGenResult ? JSON.parse(worldGenResult) : null;
      
      
      const suggestions = await geminiService.suggestCharacterStats(characterData, worldContext);
      setCharacterData(prev => ({
        ...prev,
        coreStats: suggestions.coreStats || prev.coreStats,
        customStats: [],
        skills: suggestions.skills?.map((skill: any) => ({
          id: skill.id || `skill_${Date.now()}_${Math.random()}`,
          name: skill.name || '',
          description: skill.description || '',
          level: skill.level || 1,
          skillType: skill.skillType || 'damage',
          effects: skill.effects || ['instant_damage:1d4', 'stat_buff:strength:+1:self:2turns'],
          requiresTarget: skill.requiresTarget || true,
          cooldown: skill.cooldown || 3,
          currentCooldown: 0,
          icon: skill.icon || '⚔️'
        })) || prev.skills
      }));
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
    }
  };

  const handleToggleLockSkill = (skillId: string) => {
    setLockedSkills(prev => {
      const newSet = new Set(prev);
      if (newSet.has(skillId)) {
        newSet.delete(skillId);
      } else {
        newSet.add(skillId);
      }
      return newSet;
    });
  };

  const handleRerollSkills = async () => {
    try {
      setIsRerolling(true);
      
      // Get world context from localStorage
      const worldGenResult = localStorage.getItem('world_gen_result');
      const worldContext = worldGenResult ? JSON.parse(worldGenResult) : null;
      
      const newSkills = await geminiService.rerollCharacterSkills(characterData, worldContext);
      
      setCharacterData(prev => {
        const currentSkills = prev.skills || [];
        const lockedSkillIds = Array.from(lockedSkills);
        
        // Giữ lại các skill đã lock
        const lockedSkillsList = currentSkills.filter(skill => lockedSkillIds.includes(skill.id));
        
        // Lấy các skill mới (không lock) và đảm bảo ID unique
        const newSkillsToAdd = newSkills.skills?.map((skill: any, index: number) => ({
          id: skill.id || `skill_${skill.skillType || 'damage'}_${Date.now()}_${index}`,
          name: skill.name || '',
          description: skill.description || '',
          level: skill.level || 1,
          skillType: skill.skillType || 'damage',
          effects: skill.effects || ['instant_damage:1d4', 'stat_buff:strength:+1:self:2turns'],
          requiresTarget: skill.requiresTarget || true,
          cooldown: skill.cooldown || 3,
          currentCooldown: 0,
          icon: skill.icon || '⚔️'
        })) || [];
        
        // Kết hợp: locked skills + new skills (tối đa 3 skills)
        const combinedSkills = [...lockedSkillsList, ...newSkillsToAdd].slice(0, 3);
        
        return {
          ...prev,
          skills: combinedSkills
        };
      });
    } catch (error) {
      console.error('Error rerolling skills:', error);
    } finally {
      setIsRerolling(false);
    }
  };



  if (currentStep === 'description') {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        {/* Help Button */}
        <HelpButton variant="fixed" />
        
        <div className="max-w-4xl mx-auto">
        <MotionWrapper
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-extrabold-vietnamese text-white mb-4 uppercase">
            MÔ TẢ NHÂN VẬT
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Hãy mô tả nhân vật của bạn bằng ngôn ngữ tự do. AI sẽ phân tích và tự động điền vào form tạo nhân vật.
          </p>
        </MotionWrapper>

        {/* World Description Reference */}
        {worldDescription && (
          <MotionWrapper
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="glass-effect p-6 rounded-xl mb-6"
          >
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <Globe className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white">Thế giới đã tạo</h3>
            </div>
            <div className="bg-gray-800/30 border border-gray-600/50 rounded-lg p-4 max-h-40 overflow-y-auto">
              <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                {worldDescription}
              </p>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              💡 Tham khảo thông tin thế giới ở trên để mô tả nhân vật phù hợp với bối cảnh
            </p>
          </MotionWrapper>
        )}

        <MotionWrapper
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="glass-effect p-8 rounded-2xl"
        >
          <div className="mb-6">
            <label className="block text-lg font-semibold text-white mb-3">
              Mô tả nhân vật của bạn
            </label>
            <textarea
              value={characterDescription}
              onChange={(e) => setCharacterDescription(e.target.value)}
              placeholder="Ví dụ: Tôi muốn tạo một nhân vật tên là Aria, một nữ pháp sư trẻ tuổi với mái tóc bạc dài và đôi mắt tím. Cô ấy thông minh nhưng hơi kiêu ngạo, có khả năng điều khiển phép thuật băng. Cô sinh ra trong một gia đình quý tộc nhưng đã bỏ nhà ra đi để tìm kiếm tri thức cổ xưa..."
              className="w-full h-64 px-4 py-3 bg-white/10 border-2 border-white/40 rounded-lg text-white placeholder-gray-400 focus:border-primary-400 focus:outline-none resize-none break-words overflow-wrap-anywhere"
            />
          </div>

          <div className="flex flex-col items-center space-y-3">
            <button
              onClick={handleAnalyzeDescription}
              disabled={!characterDescription.trim() || isAnalyzing}
              className="px-8 py-4 bg-primary-500/20 border-2 border-primary-500/70 rounded-lg text-primary-300 hover:bg-primary-500/30 hover:border-primary-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-3"
            >
              <Sparkles className="w-5 h-5" />
              <span>{isAnalyzing ? 'Đang phân tích...' : 'Phân Tích & Tạo Nhân Vật'}</span>
            </button>
            
            {/* Import Character Button */}
            <label className="px-6 py-3 bg-blue-500/20 border-2 border-blue-500/50 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-colors duration-200 cursor-pointer flex items-center space-x-2">
              <Upload className="w-4 h-4" />
              <span>Nhập nhân vật từ file JSON</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportCharacter}
                className="hidden"
              />
            </label>
            
            {/* World context indicator */}
            {(() => {
              try {
                return localStorage.getItem('world_gen_result') && (
                  <div className="text-xs text-gray-400 text-center max-w-md">
                    <div className="flex items-center justify-center space-x-1 mb-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span>AI sẽ sử dụng thông tin thế giới để suy luận</span>
                    </div>
                    <p>Nhân vật sẽ được tạo phù hợp với thế giới đã thiết lập</p>
                  </div>
                );
              } catch {
                return null;
              }
            })()}
          </div>
        </MotionWrapper>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      {/* Help Button */}
      <HelpButton variant="fixed" />
      
      <div className="max-w-7xl mx-auto">
      <MotionWrapper
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center mb-8"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-4xl font-bold-vietnamese text-white mb-2 uppercase">
              TÙY CHỈNH NHÂN VẬT
            </h1>
            <p className="text-lg text-gray-300">
              Chỉnh sửa và hoàn thiện nhân vật của bạn
            </p>
          </div>
          
          {/* Export Button */}
          <div className="flex space-x-3">
            <button
              onClick={handleExportCharacter}
              className="px-4 py-2 bg-green-500/20 border-2 border-green-500/50 text-green-300 rounded-lg hover:bg-green-500/30 transition-colors duration-200 flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Xuất nhân vật</span>
            </button>
          </div>
        </div>
      </MotionWrapper>

      <div className="space-y-6">
        {/* Main Content */}
        <MotionWrapper
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="space-y-6"
        >
          {/* Basic Info */}
          <div className="glass-effect p-6 rounded-2xl">
            <h3 className="text-xl font-bold-vietnamese text-white mb-4 uppercase">THÔNG TIN CƠ BẢN</h3>
            
            <div className={`grid gap-3 lg:gap-4 ${shouldUseMobileLayout() ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Tên</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={characterData.name}
                    onChange={(e) => setCharacterData(prev => ({ ...prev, name: e.target.value }))}
                    className="flex-1 px-4 py-3 bg-white/10 border-2 border-white/40 rounded-lg text-white placeholder-gray-400 focus:border-primary-400 focus:outline-none break-words overflow-wrap-anywhere"
                    placeholder="Nhập tên nhân vật..."
                  />
                  <button
                    type="button"
                    onClick={handleQuickGenerateName}
                    className="px-3 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors duration-200 flex items-center gap-1"
                    title="Tạo tên ngẫu nhiên"
                  >
                    <Shuffle className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNameGenerator(!showNameGenerator)}
                    className="px-3 py-3 bg-secondary-500 hover:bg-secondary-600 text-white rounded-lg transition-colors duration-200 flex items-center gap-1"
                    title="Mở trình tạo tên"
                  >
                    <Star className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Giới tính</label>
                <select
                  value={characterData.gender}
                  onChange={(e) => setCharacterData(prev => ({ ...prev, gender: e.target.value as any }))}
                  className="w-full px-4 py-3 bg-white/10 border-2 border-white/40 rounded-lg text-white focus:border-primary-400 focus:outline-none break-words overflow-wrap-anywhere"
                >
                  <option value="male">Nam</option>
                  <option value="female">Nữ</option>
                  <option value="other">Khác</option>
                </select>
              </div>
            </div>
          </div>

          {/* Name Generator */}
          {showNameGenerator && (
            <div className="glass-effect p-6 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold-vietnamese text-white uppercase">TRÌNH TẠO TÊN</h3>
                <button
                  type="button"
                  onClick={() => setShowNameGenerator(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Name Generation Options */}
              <div className={`grid gap-4 mb-6 ${shouldUseMobileLayout() ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'}`}>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Văn hóa</label>
                  <select
                    value={nameGenerationOptions.culture}
                    onChange={(e) => setNameGenerationOptions(prev => ({ ...prev, culture: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-white/10 border border-white/30 rounded-lg text-white text-sm focus:border-primary-400 focus:outline-none"
                  >
                    <option value="any">Bất kỳ</option>
                    <option value="vietnamese">Việt Nam</option>
                    <option value="japanese">Nhật Bản</option>
                    <option value="chinese">Trung Quốc</option>
                    <option value="korean">Hàn Quốc</option>
                    <option value="western">Phương Tây</option>
                    <option value="fantasy">Fantasy</option>
                    <option value="sci-fi">Sci-Fi</option>
                    <option value="medieval">Trung Cổ</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Giới tính</label>
                  <select
                    value={nameGenerationOptions.gender}
                    onChange={(e) => setNameGenerationOptions(prev => ({ ...prev, gender: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-white/10 border border-white/30 rounded-lg text-white text-sm focus:border-primary-400 focus:outline-none"
                  >
                    <option value="any">Bất kỳ</option>
                    <option value="male">Nam</option>
                    <option value="female">Nữ</option>
                    <option value="neutral">Trung tính</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Loại tên</label>
                  <select
                    value={nameGenerationOptions.type}
                    onChange={(e) => setNameGenerationOptions(prev => ({ ...prev, type: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-white/10 border border-white/30 rounded-lg text-white text-sm focus:border-primary-400 focus:outline-none"
                  >
                    <option value="full">Họ và tên</option>
                    <option value="first">Tên</option>
                    <option value="last">Họ</option>
                    <option value="nickname">Biệt danh</option>
                    <option value="title">Danh hiệu</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Độ dài</label>
                  <select
                    value={nameGenerationOptions.length}
                    onChange={(e) => setNameGenerationOptions(prev => ({ ...prev, length: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-white/10 border border-white/30 rounded-lg text-white text-sm focus:border-primary-400 focus:outline-none"
                  >
                    <option value="short">Ngắn</option>
                    <option value="medium">Trung bình</option>
                    <option value="long">Dài</option>
                  </select>
                </div>
              </div>

              {/* Generate Button */}
              <div className="flex justify-center mb-6">
                <button
                  type="button"
                  onClick={handleGenerateNames}
                  disabled={isGeneratingName}
                  className="px-6 py-3 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-500 text-white rounded-lg transition-colors duration-200 flex items-center gap-2"
                >
                  {isGeneratingName ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Đang tạo...
                    </>
                  ) : (
                    <>
                      <Shuffle className="w-4 h-4" />
                      Tạo 6 tên ngẫu nhiên
                    </>
                  )}
                </button>
              </div>

              {/* Generated Names */}
              {generatedNames.length > 0 && (
                <div>
                  <h4 className="text-lg font-medium text-white mb-3">Tên đã tạo:</h4>
                  <div className={`grid gap-3 ${shouldUseMobileLayout() ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
                    {generatedNames.map((nameData, index) => (
                      <div
                        key={index}
                        className="p-3 bg-white/5 border border-white/20 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                        onClick={() => handleSelectName(nameData.name)}
                      >
                        <div className="font-medium text-white mb-1">{nameData.name}</div>
                        <div className="text-sm text-gray-400">
                          {nameData.culture} • {nameData.gender} • {nameData.type}
                        </div>
                        {nameData.meaning && (
                          <div className="text-xs text-gray-500 mt-1">{nameData.meaning}</div>
                        )}
                        {nameData.pronunciation && (
                          <div className="text-xs text-gray-500">Phát âm: {nameData.pronunciation}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Appearance */}
          <div className="glass-effect p-6 rounded-2xl">
            <h3 className="text-xl font-bold-vietnamese text-white mb-4 uppercase">NGOẠI HÌNH</h3>
            <textarea
              value={characterData.appearance}
              onChange={(e) => setCharacterData(prev => ({ ...prev, appearance: e.target.value }))}
              placeholder="Mô tả ngoại hình của nhân vật..."
              className="w-full h-32 px-4 py-3 bg-white/10 border-2 border-white/40 rounded-lg text-white placeholder-gray-400 focus:border-primary-400 focus:outline-none resize-none break-words overflow-wrap-anywhere"
            />
          </div>

          {/* Personality */}
          <div className="glass-effect p-6 rounded-2xl">
            <h3 className="text-xl font-bold-vietnamese text-white mb-4 uppercase">TÍNH CÁCH (TÓM TẮT)</h3>
            <textarea
              value={characterData.personality}
              onChange={(e) => setCharacterData(prev => ({ ...prev, personality: e.target.value }))}
              placeholder="Mô tả tính cách tổng quan của nhân vật..."
              className="w-full h-32 px-4 py-3 bg-white/10 border-2 border-white/40 rounded-lg text-white placeholder-gray-400 focus:border-primary-400 focus:outline-none resize-none break-words overflow-wrap-anywhere"
            />
          </div>

          {/* Backstory */}
          <div className="glass-effect p-6 rounded-2xl">
            <h3 className="text-xl font-bold-vietnamese text-white mb-4 uppercase">TIỂU SỬ</h3>
            <textarea
              value={characterData.backstory}
              onChange={(e) => setCharacterData(prev => ({ ...prev, backstory: e.target.value }))}
              placeholder="Viết tiểu sử chi tiết của nhân vật..."
              className="w-full h-48 px-4 py-3 bg-white/10 border-2 border-white/40 rounded-lg text-white placeholder-gray-400 focus:border-primary-400 focus:outline-none resize-none break-words overflow-wrap-anywhere"
            />
          </div>

          {/* Personality Traits */}
          <div className="glass-effect p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold-vietnamese text-white uppercase">ĐẶC ĐIỂM TÍNH CÁCH</h3>
              <button
                onClick={handleAddPersonalityTrait}
                className="px-3 py-1 bg-primary-500/20 border-2 border-primary-500/70 text-primary-300 rounded-lg hover:bg-primary-500/30 transition-colors duration-200 text-sm"
              >
                + Thêm đặc điểm
              </button>
            </div>
            
            <div className="space-y-3">
              {characterData.personalityTraits.map((trait, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={trait}
                    onChange={(e) => handleUpdatePersonalityTrait(index, e.target.value)}
                    placeholder="Đặc điểm tính cách..."
                    className="flex-1 px-3 py-2 bg-white/10 border-2 border-white/40 rounded-lg text-white placeholder-gray-400 focus:border-primary-400 focus:outline-none text-sm"
                  />
                  <button
                    onClick={() => handleRemovePersonalityTrait(index)}
                    className="p-2 text-red-400 hover:text-red-300 transition-colors duration-200"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Core Stats */}
          <div className="glass-effect p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold-vietnamese text-white uppercase">CHỈ SỐ CỐT LÕI</h3>
              <button
                onClick={handleAISuggestStats}
                className="px-3 py-1 bg-green-500/20 border-2 border-green-500/50 text-green-300 rounded-lg hover:bg-green-500/30 transition-colors duration-200 text-sm flex items-center space-x-1"
              >
                <Sparkles className="w-4 h-4" />
                <span>Gợi ý chỉ số</span>
              </button>
            </div>
            
             <div className={`grid grid-cols-2 gap-3 lg:gap-4 mb-4 ${shouldUseMobileLayout() ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
               {Object.entries(characterData.coreStats).map(([stat, value]) => {
                   if (stat === 'modifiers') return null; // Skip modifiers object
                 
                 const baseValue = typeof value === 'number' ? value : 10;
                 const modifier = Math.floor((baseValue - 10) / 2);
                 const modifierText = modifier >= 0 ? `+${modifier}` : `${modifier}`;
                 const modifierColor = modifier >= 0 ? 'text-green-400' : 'text-red-400';
                 
                 return (
                   <div key={stat} className="bg-white/5 p-4 rounded-lg border-2 border-white/20">
                     <label className="block text-sm font-medium text-gray-300 mb-3 text-center capitalize">
                       {stat === 'strength' ? 'Sức mạnh' :
                        stat === 'agility' ? 'Nhanh nhẹn' :
                        stat === 'intelligence' ? 'Trí tuệ' :
                        stat === 'constitution' ? 'Thể lực' :
                        stat === 'wisdom' ? 'Khôn ngoan' :
                        stat === 'charisma' ? 'Uy tín' : stat}
                     </label>
                     
                     <div className="text-center mb-3">
                       <div className="text-3xl font-bold-vietnamese text-white mb-1">{baseValue}</div>
                       <div className={`text-lg font-semibold ${modifierColor}`}>
                         {modifierText}
                       </div>
                     </div>
                     
                     <input
                       type="number"
                       min="1"
                       max="20"
                       value={baseValue}
                       onChange={(e) => {
                         const newValue = parseInt(e.target.value) || 1;
                         const newCoreStats = {
                           ...characterData.coreStats,
                           [stat]: newValue,
                           modifiers: {
                             ...characterData.coreStats.modifiers,
                             [stat]: Math.floor((newValue - 10) / 2)
                           }
                         };
                         updateHealth(newCoreStats);
                       }}
                       className="w-full px-2 py-1 bg-white/10 border-2 border-white/40 rounded text-white focus:border-primary-400 focus:outline-none text-center text-sm"
                     />
                   </div>
                 );
               })}
             </div>
            
            <div className="grid grid-cols-1 gap-3 lg:gap-4 text-sm">
              <div className="bg-white/5 p-3 rounded-lg">
                <div className="text-gray-300">Máu (Hiện tại/Tối đa)</div>
                <div className="text-white font-bold-vietnamese">
                  {characterData.health?.current || 0}/{characterData.health?.max || 0}
                </div>
              </div>
            </div>
          </div>


          {/* Skills */}
          <div className="glass-effect p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-lg font-bold-vietnamese text-white uppercase">KỸ NĂNG NHÂN VẬT (3 SKILL)</h3>
                <p className="text-xs text-blue-400 mt-0.5">
                  Reroll tạo 3 kỹ năng ngẫu nhiên (có thể lock skill để giữ lại)
                </p>
              </div>
              <button
                onClick={handleRerollSkills}
                disabled={isRerolling}
                className="px-3 py-1.5 bg-yellow-500/20 border border-yellow-500/70 text-yellow-300 rounded-lg hover:bg-yellow-500/30 transition-colors duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                title="Tạo 3 kỹ năng ngẫu nhiên"
              >
                <span>{isRerolling ? 'Đang tạo...' : '🎲 Reroll'}</span>
              </button>
            </div>
            
            <div className="space-y-3">
              {characterData.skills && characterData.skills.map((skill) => (
                <div key={skill.id} className="p-3 bg-white/5 rounded-lg border border-white/20">
                  {/* Skill Header - Compact */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-xl">{skill.icon}</span>
                      <div>
                        <h3 className="text-base font-medium text-white">{skill.name}</h3>
                        <div className="flex items-center space-x-2 text-xs text-gray-400">
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                            skill.skillType === 'damage' 
                              ? 'bg-red-500/20 text-red-300'
                              : skill.skillType === 'healing'
                                ? 'bg-green-500/20 text-green-300'
                                : 'bg-purple-500/20 text-purple-300'
                          }`}>
                            {skill.skillType === 'damage' ? 'Tấn Công' : 
                             skill.skillType === 'healing' ? 'Hồi Phục' : 'Xã Hội'}
                          </span>
                          <span>Lv.{skill.level}</span>
                          <span>•</span>
                          <span>{skill.cooldown === 0 ? 'Không CD' : `CD ${skill.cooldown}`}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleLockSkill(skill.id)}
                      className={`p-1.5 rounded-lg transition-colors duration-200 ${
                        lockedSkills.has(skill.id)
                          ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/50'
                          : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 border border-gray-500/30'
                      }`}
                      title={lockedSkills.has(skill.id) ? 'Bỏ khóa skill' : 'Khóa skill khi reroll'}
                    >
                      {lockedSkills.has(skill.id) ? '🔒' : '🔓'}
                    </button>
                  </div>
                  
                  {/* Skill Description - Compact */}
                  <div className="mb-2">
                    <p className="text-xs text-gray-300 leading-tight">{skill.description}</p>
                  </div>
                  
                  {/* Skill Effects - Compact */}
                  <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded p-2">
                    <div className="flex items-start space-x-1">
                      <span className="text-blue-400 text-xs mt-0.5">⚡</span>
                      <div className="flex-1">
                        <span className="text-blue-300 font-medium text-xs">Hiệu quả:</span>
                        <div className="mt-0.5 text-xs text-blue-200 leading-tight">
                          {translateEffectFormat(skill.effects)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {(!characterData.skills || characterData.skills.length === 0) && (
                <div className="text-center py-4 text-gray-400">
                  <p className="text-sm">Chưa có kỹ năng nào. Nhấn "Reroll" để tạo 3 kỹ năng tự động.</p>
                </div>
              )}
            </div>
          </div>
        </MotionWrapper>

      </div>

      {/* Action Buttons */}
      <MotionWrapper
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.6 }}
        className={`mt-8 flex ${shouldUseMobileLayout() ? 'flex-col gap-3' : 'flex-row justify-center gap-3 sm:space-x-4'}`}
      >
        <button
          onClick={handleResetForm}
          className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200 flex items-center space-x-2"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Tạo Lại</span>
        </button>
        
        <button
          onClick={handleExportCharacter}
          className="px-6 py-3 bg-blue-500/20 border-2 border-blue-500/50 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-colors duration-200 flex items-center space-x-2"
        >
          <Download className="w-4 h-4" />
          <span>Xuất Nhân Vật</span>
        </button>
        
        <button
          onClick={handleAcceptAndStart}
          className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors duration-200 flex items-center space-x-2"
        >
          <Check className="w-4 h-4" />
          <span>Chấp Nhận & Vào Game</span>
        </button>
      </MotionWrapper>
      </div>
    </div>
  );
}