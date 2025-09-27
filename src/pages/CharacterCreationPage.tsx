import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Character } from '../types';
import { geminiService } from '../services/geminiService';
import { Sparkles, Download, RotateCcw, Check, Globe, Upload } from 'lucide-react';
import { HelpTooltip } from '../components/HelpTooltip';

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
  };
  customStats: { name: string; value: number }[];
  proficiencies: { name: string; level: number; energyCost?: number; description?: string }[];
}

export function CharacterCreationPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<'description' | 'customize'>('description');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRerolling, setIsRerolling] = useState(false);
  const [characterDescription, setCharacterDescription] = useState('');
  const [worldDescription, setWorldDescription] = useState('');
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
      charisma: 10
    },
    customStats: [],
    proficiencies: []
  });

  // Load world description from localStorage
  useEffect(() => {
    const savedWorldDescription = localStorage.getItem('currentWorldDescription');
    if (savedWorldDescription) {
      setWorldDescription(savedWorldDescription);
    }
  }, []);

  const calculateMaxHealth = () => {
    return Math.floor((characterData.coreStats.constitution - 10) / 2) + 20;
  };

  const calculateMaxEnergy = () => {
    return Math.floor((characterData.coreStats.wisdom - 10) / 2) + 15;
  };

  const handleAnalyzeDescription = async () => {
    if (!characterDescription.trim()) return;
    
    setIsAnalyzing(true);
    try {
      // Get world context from localStorage
      const worldGenResult = localStorage.getItem('world_gen_result');
      const worldContext = worldGenResult ? JSON.parse(worldGenResult) : null;
      
      console.log('World context for character analysis:', worldContext);
      
      const analysis = await geminiService.analyzeCharacterDescription(characterDescription, worldContext);
      console.log('Analysis result:', analysis);
      
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
          charisma: analysis.coreStats?.cha?.score || 10
        },
        customStats: [],
        proficiencies: analysis.skills?.map((skill: any) => ({
          name: skill.name || '',
          level: skill.level || 1,
          energyCost: calculateManaCost(skill.level || 1), // Use calculated mana cost
          description: skill.description || ''
        })) || []
      };
      
      // Add derived stats if available
      if (analysis.derived) {
        convertedData.hpMax = analysis.derived.hpMax || 100;
        convertedData.energyMax = analysis.derived.energyMax || 100;
      }
      
      console.log('Converted data:', convertedData);
      console.log('Original analysis with evidence:', analysis);
      setCharacterData(convertedData);
      setCurrentStep('customize');
      
      // Show evidence information if available
      if (analysis.unknown_fields && analysis.unknown_fields.length > 0) {
        console.log('Missing fields:', analysis.unknown_fields);
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


  const handleAddProficiency = () => {
    if (characterData.proficiencies.length >= 3) return;
    
    setCharacterData(prev => ({
      ...prev,
      proficiencies: [...prev.proficiencies, { 
        name: '', 
        level: 1, 
        energyCost: calculateManaCost(1), // Use calculated mana cost for level 1
        description: '' 
      }]
    }));
  };

  const handleRemoveProficiency = (index: number) => {
    setCharacterData(prev => ({
      ...prev,
      proficiencies: prev.proficiencies.filter((_, i) => i !== index)
    }));
  };

  // Function to calculate mana cost based on skill level (default for player-created skills)
  const calculateManaCost = (level: number): number => {
    const manaCosts = {
      1: 7,
      2: 13,
      3: 20,
      4: 30,
      5: 43
    };
    return manaCosts[level as keyof typeof manaCosts] || 7;
  };

  // Function to calculate random mana cost for rerolled skills
  const calculateRandomManaCost = (level: number): number => {
    const manaRanges = {
      1: { min: 5, max: 10 },   // Level 1: 5-10 mana
      2: { min: 10, max: 16 },  // Level 2: 10-16 mana
      3: { min: 15, max: 25 },  // Level 3: 15-25 mana
      4: { min: 25, max: 35 },  // Level 4: 25-35 mana
      5: { min: 35, max: 50 }   // Level 5: 35-50 mana
    };
    
    const range = manaRanges[level as keyof typeof manaRanges] || manaRanges[1];
    return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
  };

  const handleUpdateProficiency = (index: number, field: 'name' | 'level' | 'energyCost' | 'description', value: string | number) => {
    setCharacterData(prev => ({
      ...prev,
      proficiencies: prev.proficiencies.map((prof, i) => {
        if (i === index) {
          const updatedProf = { ...prof, [field]: value };
          
          // Auto-calculate mana cost when level changes
          if (field === 'level' && typeof value === 'number') {
            updatedProf.energyCost = calculateManaCost(value);
          }
          
          return updatedProf;
        }
        return prof;
      })
    }));
  };

  const handleResetForm = () => {
    setCharacterData({
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
        charisma: 10
      },
      customStats: [],
      proficiencies: []
    });
    setCharacterDescription('');
    setCurrentStep('description');
  };

  const handleAcceptAndStart = () => {
    // Convert to Character type and save
    const character: Character = {
      name: characterData.name,
      class: { 
        id: 'adventurer',
        name: 'Phiêu lưu gia',
        description: 'Một nhân vật phiêu lưu đa năng',
        icon: '⚔️',
        primaryStats: ['strength', 'agility'],
        abilities: ['Combat', 'Exploration']
      },
      race: { 
        id: 'human',
        name: 'Con người',
        description: 'Chủng tộc con người cân bằng',
        icon: '👤',
        racialBonuses: {},
        specialAbilities: ['Adaptability']
      },
      gender: characterData.gender,
      backstory: characterData.backstory,
      // Add custom fields
      appearance: characterData.appearance,
      personality: characterData.personality,
      personalityTraits: characterData.personalityTraits,
      coreStats: characterData.coreStats,
      customStats: [],
      proficiencies: characterData.proficiencies
    };

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
      
      console.log('World context for stats suggestion:', worldContext);
      
      const suggestions = await geminiService.suggestCharacterStats(characterData, worldContext);
      setCharacterData(prev => ({
        ...prev,
        coreStats: suggestions.coreStats || prev.coreStats,
        customStats: [],
        proficiencies: suggestions.proficiencies?.map((prof: any) => ({
          name: prof.name || '',
          level: prof.level || 1,
          energyCost: calculateManaCost(prof.level || 1), // Use calculated mana cost
          description: prof.description || ''
        })) || prev.proficiencies
      }));
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
    }
  };

  const handleRerollSkills = async () => {
    try {
      setIsRerolling(true);
      
      // Get world context from localStorage
      const worldGenResult = localStorage.getItem('world_gen_result');
      const worldContext = worldGenResult ? JSON.parse(worldGenResult) : null;
      
      console.log('Rerolling skills with world context:', worldContext);
      
      const newSkills = await geminiService.rerollCharacterSkills(characterData, worldContext);
      
      setCharacterData(prev => ({
        ...prev,
        proficiencies: newSkills.skills?.map((skill: any) => ({
          name: skill.name || '',
          level: skill.level || 1,
          energyCost: calculateRandomManaCost(skill.level || 1), // Use random mana cost for rerolled skills
          description: skill.description || ''
        })) || []
      }));
    } catch (error) {
      console.error('Error rerolling skills:', error);
    } finally {
      setIsRerolling(false);
    }
  };

  if (currentStep === 'description') {
    return (
      <div className="max-w-4xl mx-auto">
        <motion.div
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
        </motion.div>

        {/* World Description Reference */}
        {worldDescription && (
          <motion.div
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
          </motion.div>
        )}

        <motion.div
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
              className="w-full h-64 px-4 py-3 bg-white/10 border-2 border-white/40 rounded-lg text-white placeholder-gray-400 focus:border-primary-400 focus:outline-none resize-none"
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
        </motion.div>

      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <motion.div
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
      </motion.div>

      <div className="space-y-6">
        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="space-y-6"
        >
          {/* Basic Info */}
          <div className="glass-effect p-6 rounded-2xl">
            <h3 className="text-xl font-bold-vietnamese text-white mb-4 uppercase">THÔNG TIN CƠ BẢN</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Tên</label>
                <input
                  type="text"
                  value={characterData.name}
                  onChange={(e) => setCharacterData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 bg-white/10 border-2 border-white/40 rounded-lg text-white placeholder-gray-400 focus:border-primary-400 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Giới tính</label>
                <select
                  value={characterData.gender}
                  onChange={(e) => setCharacterData(prev => ({ ...prev, gender: e.target.value as any }))}
                  className="w-full px-4 py-3 bg-white/10 border-2 border-white/40 rounded-lg text-white focus:border-primary-400 focus:outline-none"
                >
                  <option value="male">Nam</option>
                  <option value="female">Nữ</option>
                  <option value="other">Khác</option>
                </select>
              </div>
            </div>
          </div>

          {/* Appearance */}
          <div className="glass-effect p-6 rounded-2xl">
            <h3 className="text-xl font-bold-vietnamese text-white mb-4 uppercase">NGOẠI HÌNH</h3>
            <textarea
              value={characterData.appearance}
              onChange={(e) => setCharacterData(prev => ({ ...prev, appearance: e.target.value }))}
              placeholder="Mô tả ngoại hình của nhân vật..."
              className="w-full h-32 px-4 py-3 bg-white/10 border-2 border-white/40 rounded-lg text-white placeholder-gray-400 focus:border-primary-400 focus:outline-none resize-none"
            />
          </div>

          {/* Personality */}
          <div className="glass-effect p-6 rounded-2xl">
            <h3 className="text-xl font-bold-vietnamese text-white mb-4 uppercase">TÍNH CÁCH (TÓM TẮT)</h3>
            <textarea
              value={characterData.personality}
              onChange={(e) => setCharacterData(prev => ({ ...prev, personality: e.target.value }))}
              placeholder="Mô tả tính cách tổng quan của nhân vật..."
              className="w-full h-32 px-4 py-3 bg-white/10 border-2 border-white/40 rounded-lg text-white placeholder-gray-400 focus:border-primary-400 focus:outline-none resize-none"
            />
          </div>

          {/* Backstory */}
          <div className="glass-effect p-6 rounded-2xl">
            <h3 className="text-xl font-bold-vietnamese text-white mb-4 uppercase">TIỂU SỬ</h3>
            <textarea
              value={characterData.backstory}
              onChange={(e) => setCharacterData(prev => ({ ...prev, backstory: e.target.value }))}
              placeholder="Viết tiểu sử chi tiết của nhân vật..."
              className="w-full h-48 px-4 py-3 bg-white/10 border-2 border-white/40 rounded-lg text-white placeholder-gray-400 focus:border-primary-400 focus:outline-none resize-none"
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
            
             <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 lg:gap-4 mb-4">
               {Object.entries(characterData.coreStats).map(([stat, value]) => {
                 const modifier = Math.floor((value - 10) / 2);
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
                       <div className="text-3xl font-bold-vietnamese text-white mb-1">{value}</div>
                       <div className={`text-lg font-semibold ${modifierColor}`}>
                         {modifierText}
                       </div>
                     </div>
                     
                     <input
                       type="number"
                       min="1"
                       max="20"
                       value={value}
                       onChange={(e) => setCharacterData(prev => ({
                         ...prev,
                         coreStats: { ...prev.coreStats, [stat]: parseInt(e.target.value) || 1 }
                       }))}
                       className="w-full px-2 py-1 bg-white/10 border-2 border-white/40 rounded text-white focus:border-primary-400 focus:outline-none text-center text-sm"
                     />
                   </div>
                 );
               })}
             </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4 text-sm">
              <div className="bg-white/5 p-3 rounded-lg">
                <div className="text-gray-300">Máu Tối Đa</div>
                <div className="text-white font-bold-vietnamese">{(characterData as any).hpMax || calculateMaxHealth()}</div>
              </div>
              <div className="bg-white/5 p-3 rounded-lg">
                <div className="text-gray-300">Năng Lượng Tối Đa</div>
                <div className="text-white font-bold-vietnamese">{(characterData as any).energyMax || calculateMaxEnergy()}</div>
              </div>
            </div>
          </div>


          {/* Proficiencies */}
          <div className="glass-effect p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold-vietnamese text-white uppercase">THÀNH THẠO (TỐI ĐA 3)</h3>
                <p className="text-xs text-gray-400 mt-1">
                  Năng lượng mặc định: Level 1=7, Level 2=13, Level 3=20, Level 4=30, Level 5=43
                </p>
                <p className="text-xs text-blue-400 mt-1">
                  Reroll sẽ tạo mana ngẫu nhiên trong khoảng cho phép
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:space-x-2">
                <button
                  onClick={handleRerollSkills}
                  disabled={isRerolling}
                  className="px-3 py-1 bg-yellow-500/20 border-2 border-yellow-500/70 text-yellow-300 rounded-lg hover:bg-yellow-500/30 transition-colors duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                  title="Tạo 3 kỹ năng ngẫu nhiên với mana cost ngẫu nhiên"
                >
                  <span>{isRerolling ? 'Đang tạo...' : '🎲 Reroll'}</span>
                </button>
                {characterData.proficiencies.length < 3 && (
                  <button
                    onClick={handleAddProficiency}
                    className="px-3 py-1 bg-primary-500/20 border-2 border-primary-500/70 text-primary-300 rounded-lg hover:bg-primary-500/30 transition-colors duration-200 text-sm"
                  >
                    + Thêm kỹ năng
                  </button>
                )}
              </div>
            </div>
            
            <div className="space-y-3">
              {/* Header labels */}
              {characterData.proficiencies.length > 0 && (
                <div className="flex items-center space-x-2 text-xs text-gray-400 mb-2">
                  <div className="flex-1">Tên kỹ năng</div>
                  <div className="w-20 text-center">Cấp độ</div>
                  <div className="w-16 text-center" title="Năng lượng tự động tính theo cấp độ">⚡ Năng lượng (Tự động)</div>
                  <div className="w-8"></div>
                </div>
              )}
              
              {characterData.proficiencies.map((prof, index) => (
                <div key={index} className="space-y-2 p-4 bg-white/5 rounded-lg border border-white/20">
                  {/* Skill Header */}
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={prof.name}
                      onChange={(e) => handleUpdateProficiency(index, 'name', e.target.value)}
                      placeholder="Tên kỹ năng..."
                      className="flex-1 px-3 py-2 bg-white/10 border-2 border-white/40 rounded-lg text-white placeholder-gray-400 focus:border-primary-400 focus:outline-none text-sm"
                    />
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={prof.level}
                      onChange={(e) => handleUpdateProficiency(index, 'level', parseInt(e.target.value) || 1)}
                      className="w-20 px-3 py-2 bg-white/10 border-2 border-white/40 rounded-lg text-white focus:border-primary-400 focus:outline-none text-sm"
                      title="Cấp độ kỹ năng"
                    />
                    <div className="flex items-center space-x-1">
                      <span className="text-xs text-gray-400">⚡</span>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={prof.energyCost || calculateManaCost(prof.level)}
                        readOnly
                        className="w-16 px-2 py-2 bg-white/5 border-2 border-white/20 rounded-lg text-white text-sm cursor-not-allowed"
                        title={`Năng lượng mặc định theo cấp độ (Level ${prof.level} = ${prof.energyCost || calculateManaCost(prof.level)} mana)`}
                      />
                    </div>
                    <button
                      onClick={() => handleRemoveProficiency(index)}
                      className="p-2 text-red-400 hover:text-red-300 transition-colors duration-200"
                    >
                      ×
                    </button>
                  </div>
                  
                  {/* Skill Description */}
                  <div>
                    <textarea
                      value={prof.description || ''}
                      onChange={(e) => handleUpdateProficiency(index, 'description', e.target.value)}
                      placeholder="Mô tả kỹ năng (cách sử dụng, hiệu quả)..."
                      className="w-full px-3 py-2 bg-white/10 border-2 border-white/40 rounded-lg text-white placeholder-gray-400 focus:border-primary-400 focus:outline-none text-sm resize-none"
                      rows={2}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Help Tooltip */}
        <HelpTooltip
          title="Hướng Dẫn Tạo Nhân Vật"
          content={[
            "📁 NHẬP/XUẤT NHÂN VẬT:",
            "• Nhập nhân vật: Tải file JSON để khôi phục nhân vật đã lưu trước đó. Tự động chuyển sang tab tùy chỉnh.",
            "• Xuất nhân vật: Lưu nhân vật hiện tại thành file JSON để chia sẻ hoặc backup (có trong tab tùy chỉnh)",
            "• Bạn có thể chia sẻ nhân vật với bạn bè hoặc tạo nhiều nhân vật khác nhau cho cùng một thế giới",
            "",
            "💡 MẸO TẠO NHÂN VẬT:",
            "• Điền đầy đủ thông tin cơ bản trước khi sử dụng AI gợi ý",
            "• Chỉ số cốt lõi ảnh hưởng đến khả năng của nhân vật trong game",
            "• Đặc điểm tính cách giúp AI hiểu rõ hơn về nhân vật",
            "• Tiểu sử chi tiết sẽ giúp AI tạo kịch bản phù hợp hơn",
            "• Sử dụng tính năng gợi ý AI để tự động hoàn thiện nhân vật"
          ]}
        />
      </div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.6 }}
        className="mt-8 flex flex-col sm:flex-row justify-center gap-3 sm:space-x-4"
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
      </motion.div>
    </div>
  );
}