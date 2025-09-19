import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  Play,
  Plus,
  X
} from 'lucide-react';
import { geminiService } from '../../services/geminiService';
import { WorldData } from '../../types';

export function WorldBuilder() {
  const [worldData, setWorldData] = useState<WorldData>({
    id: '',
    name: '',
    coreIdea: '',
    genre: '',
    setting: '',
    storyTone: '',
    narration: '',
    corePrinciples: [],
    foundationEntities: [],
    currencies: [{ name: '', description: '', isMain: true }],
    startYear: 1,
    difficulty: '',
    useLevels: false,
    description: '',
    createdAt: new Date().toISOString()
  });
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingField, setGeneratingField] = useState<string>('');
  
  // Popup selection states
  const [showPrinciplePopup, setShowPrinciplePopup] = useState(false);
  const [showEntityPopup, setShowEntityPopup] = useState(false);
  const [showWorldDescriptionPopup, setShowWorldDescriptionPopup] = useState(false);
  const [aiGeneratedPrinciples, setAiGeneratedPrinciples] = useState<Array<{id: string, name: string, description: string}>>([]);
  const [aiGeneratedEntities, setAiGeneratedEntities] = useState<Array<{id: string, name: string, description: string, classification?: string}>>([]);
  const [selectedPrincipleIndices, setSelectedPrincipleIndices] = useState<number[]>([]);
  const [selectedEntityIndices, setSelectedEntityIndices] = useState<number[]>([]);
  const [generatedWorldDescription, setGeneratedWorldDescription] = useState<string>('');

  const storyTones = [
    'Bí ẩn', 'Hào hùng', 'U ám', 'Vui tươi', 'Căng thẳng',
    'Lãng mạn', 'Kinh dị', 'Hài hước', 'Bi thương', 'Hy vọng',
    'Triết học', 'Hành động', 'Chính trị'
  ];

  const entityClassifications = [
    'Nhân vật', 'Địa điểm', 'Phe phái', 'Vật phẩm', 'Truyền thuyết'
  ];

  const narrations = [
    'Ngôi thứ nhất', 'Ngôi thứ hai', 'Ngôi thứ ba'
  ];

  const difficulties = [
    'Dễ', 'Trung bình', 'Khó', 'Cực khó'
  ];

  // Helper functions for dynamic fields
  const addCorePrinciple = () => {
    setWorldData(prev => ({
      ...prev,
      corePrinciples: [...prev.corePrinciples, { name: '', description: '' }]
    }));
  };

  const removeCorePrinciple = (index: number) => {
    setWorldData(prev => ({
      ...prev,
      corePrinciples: prev.corePrinciples.filter((_, i) => i !== index)
    }));
  };

  const updateCorePrinciple = (index: number, field: 'name' | 'description', value: string) => {
    setWorldData(prev => ({
      ...prev,
      corePrinciples: prev.corePrinciples.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const addFoundationEntity = () => {
    setWorldData(prev => ({
      ...prev,
      foundationEntities: [...prev.foundationEntities, { name: '', description: '', classification: 'Nhân vật' }]
    }));
  };

  const removeFoundationEntity = (index: number) => {
    setWorldData(prev => ({
      ...prev,
      foundationEntities: prev.foundationEntities.filter((_, i) => i !== index)
    }));
  };

  const updateFoundationEntity = (index: number, field: 'name' | 'description' | 'classification', value: string) => {
    setWorldData(prev => ({
      ...prev,
      foundationEntities: prev.foundationEntities.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const addCurrency = () => {
    setWorldData(prev => ({
      ...prev,
      currencies: [...prev.currencies, { name: '', description: '', isMain: false }]
    }));
  };

  const removeCurrency = (index: number) => {
    setWorldData(prev => ({
      ...prev,
      currencies: prev.currencies.filter((_, i) => i !== index)
    }));
  };

  const updateCurrency = (index: number, field: 'name' | 'description' | 'isMain', value: string | boolean) => {
    setWorldData(prev => ({
      ...prev,
      currencies: prev.currencies.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };


  const handleAISuggestion = async (field: string) => {
    if (field === 'coreIdea' && !worldData.coreIdea.trim()) {
      alert('Vui lòng nhập ý tưởng cốt lõi trước');
      return;
    }

    setIsGenerating(true);
    setGeneratingField(field);
    
    try {
      if (field === 'coreIdea') {
        const suggestion = await geminiService.generateCoreIdea(worldData.coreIdea);
        setWorldData(prev => ({ ...prev, coreIdea: suggestion }));
      } else if (field === 'corePrinciples') {
        const principlesText = await geminiService.generateCorePrinciples(worldData.coreIdea);
        // Parse JSON response
        let principles = [];
        try {
          // Try to parse as JSON first
          const jsonMatch = principlesText.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            principles = JSON.parse(jsonMatch[0]);
            // Limit to 5 principles
            principles = principles.slice(0, 5);
          } else {
            throw new Error('No JSON found');
          }
        } catch (error) {
          console.warn('Failed to parse principles as JSON, using fallback:', error);
          // Fallback: parse as text
          const sections = principlesText.split(/Tên:|Mô tả:/).filter(s => s.trim());
          
          for (let i = 0; i < sections.length && principles.length < 5; i += 2) {
            if (i + 1 < sections.length) {
              const name = sections[i].trim();
              const description = sections[i + 1].trim();
              if (name && description) {
                principles.push({
                  id: `principle_${i}`,
                  name: name,
                  description: description
                });
              }
            }
          }
          
          // Final fallback - limit to 5
          if (principles.length === 0) {
            const fallbackPrinciples = principlesText.split(/[.!?]+/).filter(p => p.trim()).slice(0, 5).map((p, i) => {
              const text = p.trim();
              const words = text.split(' ').slice(0, 4);
              const name = words.length > 2 ? words.join(' ') : `Nguyên tắc ${i + 1}`;
              return {
                id: `principle_${i}`,
                name: name,
                description: text
              };
            });
            principles.push(...fallbackPrinciples);
          }
        }
        setAiGeneratedPrinciples(principles);
        setShowPrinciplePopup(true);
      } else if (field === 'foundationEntities') {
        const entitiesText = await geminiService.generateFoundationEntities(worldData.coreIdea);
        // Parse JSON response
        let entities = [];
        try {
          // Try to parse as JSON first
          const jsonMatch = entitiesText.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            entities = JSON.parse(jsonMatch[0]);
            // Map 'type' to 'classification' for compatibility
            entities = entities.map((entity: any) => ({
              ...entity,
              classification: entity.type || 'Nhân vật'
            }));
            
            // Ensure we have exactly 5 entities with one of each type
            const requiredTypes = ['Nhân vật', 'Địa điểm', 'Phe phái', 'Vật phẩm', 'Truyền thuyết'];
            const typeCounts: {[key: string]: number} = {};
            const finalEntities: any[] = [];
            
            // First pass: collect one of each required type
            for (const entity of entities) {
              const type = entity.classification;
              if (requiredTypes.includes(type) && !typeCounts[type]) {
                typeCounts[type] = 1;
                finalEntities.push(entity);
              }
            }
            
            // Second pass: fill remaining slots if needed
            for (const entity of entities) {
              if (finalEntities.length >= 5) break;
              const type = entity.classification;
              if (requiredTypes.includes(type) && typeCounts[type] < 1) {
                typeCounts[type] = 1;
                finalEntities.push(entity);
              }
            }
            
            // If we still don't have 5, create fallback entities for missing types
            for (const requiredType of requiredTypes) {
              if (finalEntities.length >= 5) break;
              if (!typeCounts[requiredType]) {
                finalEntities.push({
                  id: `entity_${requiredType.toLowerCase()}`,
                  name: `Thực thể ${requiredType}`,
                  description: `Mô tả cho ${requiredType.toLowerCase()} trong thế giới này.`,
                  classification: requiredType
                });
              }
            }
            
            entities = finalEntities.slice(0, 5);
          } else {
            throw new Error('No JSON found');
          }
        } catch (error) {
          console.warn('Failed to parse entities as JSON, using fallback:', error);
          // Fallback: parse as text
          const sections = entitiesText.split(/Tên:|Mô tả:|Loại:/).filter(s => s.trim());
          
          for (let i = 0; i < sections.length && entities.length < 5; i += 3) {
            if (i + 2 < sections.length) {
              const name = sections[i].trim();
              const description = sections[i + 1].trim();
              const classification = sections[i + 2].trim();
              if (name && description) {
                entities.push({
                  id: `entity_${i}`,
                  name: name,
                  description: description,
                  classification: classification || 'Nhân vật'
                });
              }
            }
          }
          
          // Final fallback - ensure we have 5 entities with one of each type
          if (entities.length === 0) {
            const requiredTypes = ['Nhân vật', 'Địa điểm', 'Phe phái', 'Vật phẩm', 'Truyền thuyết'];
            const fallbackEntities = requiredTypes.map((type, i) => ({
              id: `entity_${i}`,
              name: `Thực thể ${type}`,
              description: `Mô tả cho ${type.toLowerCase()} trong thế giới này.`,
              classification: type
            }));
            entities.push(...fallbackEntities);
          }
        }
        setAiGeneratedEntities(entities);
        setShowEntityPopup(true);
      }
    } catch (error) {
      console.error('Error generating AI suggestion:', error);
      alert('Có lỗi xảy ra khi tạo gợi ý AI');
    } finally {
      setIsGenerating(false);
      setGeneratingField('');
    }
  };

  const handleSelectPrinciples = () => {
    const selectedPrinciples = selectedPrincipleIndices.map(index => aiGeneratedPrinciples[index]);
    setWorldData(prev => ({
      ...prev,
      corePrinciples: [...prev.corePrinciples, ...selectedPrinciples]
    }));
    setShowPrinciplePopup(false);
    setSelectedPrincipleIndices([]);
  };

  const handleSelectEntities = () => {
    const selectedEntities = selectedEntityIndices.map(index => aiGeneratedEntities[index]);
    setWorldData(prev => ({
      ...prev,
      foundationEntities: [...prev.foundationEntities, ...selectedEntities]
    }));
    setShowEntityPopup(false);
    setSelectedEntityIndices([]);
  };

  const togglePrincipleSelection = (index: number) => {
    setSelectedPrincipleIndices(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const toggleEntitySelection = (index: number) => {
    setSelectedEntityIndices(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const validateForm = () => {
    if (!worldData.coreIdea.trim()) {
      alert('Vui lòng nhập ý tưởng cốt lõi');
      return false;
    }
    if (!worldData.genre.trim()) {
      alert('Vui lòng nhập thể loại');
      return false;
    }
    if (!worldData.setting.trim()) {
      alert('Vui lòng nhập bối cảnh');
      return false;
    }
    if (!worldData.storyTone) {
      alert('Vui lòng chọn tông truyện');
      return false;
    }
    if (!worldData.narration) {
      alert('Vui lòng chọn ngôi kể');
      return false;
    }
    if (!worldData.difficulty) {
      alert('Vui lòng chọn độ khó');
      return false;
    }
    return true;
  };

  const handleCreateWorld = async () => {
    if (!validateForm()) {
      return;
    }

    setIsGenerating(true);
    try {
      console.log('🔄 Generating complete world...');
      const worldResult = await geminiService.generateCompleteWorld(worldData);
      
      // Parse JSON response
      let worldJson;
      try {
        // Try to find JSON in response
        const jsonMatch = worldResult.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          worldJson = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        console.error('Failed to parse world JSON:', parseError);
        console.log('Raw response:', worldResult);
        throw new Error('Không thể phân tích kết quả từ AI. Vui lòng thử lại.');
      }
      
      // Save to localStorage
      localStorage.setItem('world_gen_result', JSON.stringify(worldJson));
      console.log('✅ World data saved to localStorage');
      
      // Set the narrative opening for display
      setGeneratedWorldDescription(worldJson.narrativeOpening || 'Không có mô tả mở đầu.');
      setShowWorldDescriptionPopup(true);
      
    } catch (error) {
      console.error('Error generating world:', error);
      alert('Có lỗi xảy ra khi tạo thế giới: ' + (error instanceof Error ? error.message : 'Lỗi không xác định'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartGame = () => {
    // Lưu mô tả thế giới vào localStorage để game có thể sử dụng
    localStorage.setItem('currentWorldDescription', generatedWorldDescription);
    localStorage.setItem('currentWorldData', JSON.stringify(worldData));
    
    // Lấy dữ liệu thế giới hoàn chỉnh từ localStorage nếu có
    const worldGenResult = localStorage.getItem('world_gen_result');
    if (worldGenResult) {
      localStorage.setItem('completeWorldData', worldGenResult);
      console.log('✅ Complete world data saved for game use');
    }
    
    // Chuyển đến tạo nhân vật
    window.location.href = '/create-character';
  };

  const handleRegenerateDescription = async () => {
    setIsGenerating(true);
    try {
      console.log('🔄 Regenerating complete world...');
      const worldResult = await geminiService.generateCompleteWorld(worldData);
      
      // Parse JSON response
      let worldJson;
      try {
        const jsonMatch = worldResult.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          worldJson = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        console.error('Failed to parse world JSON:', parseError);
        console.log('Raw response:', worldResult);
        throw new Error('Không thể phân tích kết quả từ AI. Vui lòng thử lại.');
      }
      
      // Save to localStorage
      localStorage.setItem('world_gen_result', JSON.stringify(worldJson));
      console.log('✅ Regenerated world data saved to localStorage');
      
      // Set the narrative opening for display
      setGeneratedWorldDescription(worldJson.narrativeOpening || 'Không có mô tả mở đầu.');
      
    } catch (error) {
      console.error('Error regenerating world:', error);
      alert('Có lỗi xảy ra khi tạo lại mô tả: ' + (error instanceof Error ? error.message : 'Lỗi không xác định'));
    } finally {
      setIsGenerating(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold-vietnamese text-white mb-2">World Builder</h1>
            <p className="text-gray-400">Tạo thế giới cho cuộc phiêu lưu của bạn</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-8">
          {/* Main Form */}
          <div className="xl:col-span-2 space-y-4 lg:space-y-6">
            {/* Core Idea */}
            <motion.div
              className="glass-effect p-6 rounded-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold-vietnamese text-white">Ý Tưởng Cốt Lõi</h3>
                <button
                  onClick={() => handleAISuggestion('coreIdea')}
                  disabled={isGenerating}
                  className="px-3 py-1 bg-primary-500/20 border-2 border-primary-500/70 text-primary-300 rounded-lg hover:bg-primary-500/30 transition-colors duration-200 text-sm disabled:opacity-50"
                >
                  {isGenerating && generatingField === 'coreIdea' ? 'Đang tạo...' : 'Chi tiết hóa bằng AI'}
                </button>
              </div>
              <textarea
                value={worldData.coreIdea}
                onChange={(e) => setWorldData(prev => ({ ...prev, coreIdea: e.target.value }))}
                placeholder="Mô tả ý tưởng cốt lõi của thế giới..."
                className="w-full h-32 px-4 py-3 bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none resize-none"
              />
            </motion.div>

            {/* Genre & Setting */}
            <motion.div
              className="glass-effect p-6 rounded-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <h3 className="text-xl font-bold-vietnamese text-white mb-4">Thể Loại & Bối Cảnh</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Thể loại</label>
                  <input
                    type="text"
                    value={worldData.genre}
                    onChange={(e) => setWorldData(prev => ({ ...prev, genre: e.target.value }))}
                    placeholder="Ví dụ: Fantasy, Sci-fi, Horror..."
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Bối cảnh</label>
                  <input
                    type="text"
                    value={worldData.setting}
                    onChange={(e) => setWorldData(prev => ({ ...prev, setting: e.target.value }))}
                    placeholder="Ví dụ: Thời trung cổ, Tương lai, Hiện đại..."
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </motion.div>

            {/* Story Tone & Narration */}
            <motion.div
              className="glass-effect p-6 rounded-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <h3 className="text-xl font-bold-vietnamese text-white mb-4">Tông Truyện & Ngôi Kể</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Tông truyện</label>
                  <select
                    value={worldData.storyTone}
                    onChange={(e) => setWorldData(prev => ({ ...prev, storyTone: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600/50 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Chọn tông truyện</option>
                    {storyTones.map(tone => (
                      <option key={tone} value={tone}>{tone}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Ngôi kể</label>
                  <select
                    value={worldData.narration}
                    onChange={(e) => setWorldData(prev => ({ ...prev, narration: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600/50 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Chọn ngôi kể</option>
                    {narrations.map(narration => (
                      <option key={narration} value={narration}>{narration}</option>
                    ))}
                  </select>
                </div>
              </div>
            </motion.div>

            {/* Core Principles */}
            <motion.div
              className="glass-effect p-6 rounded-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold-vietnamese text-white">Nguyên Tắc Cốt Lõi</h3>
                <div className="flex flex-col sm:flex-row gap-2 sm:space-x-2">
                  <button
                    onClick={() => handleAISuggestion('corePrinciples')}
                    disabled={isGenerating || !worldData.coreIdea.trim()}
                    className="px-3 py-1 bg-primary-500/20 border-2 border-primary-500/70 text-primary-300 rounded-lg hover:bg-primary-500/30 transition-colors duration-200 text-sm disabled:opacity-50"
                  >
                    {isGenerating && generatingField === 'corePrinciples' ? 'Đang tạo...' : 'Gợi ý bằng AI'}
                  </button>
                  <button
                    onClick={addCorePrinciple}
                    className="p-2 bg-green-500/20 border-2 border-green-500/50 rounded-lg text-green-300 hover:bg-green-500/30 transition-colors duration-200"
                    title="Thêm nguyên tắc"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-400 mb-4">Các quy tắc và nguyên tắc cơ bản của thế giới</p>
              <div className="space-y-3">
                {worldData.corePrinciples.map((principle, index) => (
                  <div key={index} className="flex flex-col sm:flex-row gap-2 sm:space-x-2">
                    <input
                      type="text"
                      value={principle.name}
                      onChange={(e) => updateCorePrinciple(index, 'name', e.target.value)}
                      placeholder="Tên nguyên tắc"
                      className="flex-1 px-3 py-2 bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none text-sm"
                    />
                    <input
                      type="text"
                      value={principle.description}
                      onChange={(e) => updateCorePrinciple(index, 'description', e.target.value)}
                      placeholder="Mô tả"
                      className="flex-1 px-3 py-2 bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none text-sm"
                    />
                    <button
                      onClick={() => removeCorePrinciple(index)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-colors duration-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Foundation Entities */}
            <motion.div
              className="glass-effect p-6 rounded-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold-vietnamese text-white">Thực Thể Nền Tảng</h3>
                <div className="flex flex-col sm:flex-row gap-2 sm:space-x-2">
                  <button
                    onClick={() => handleAISuggestion('foundationEntities')}
                    disabled={isGenerating || !worldData.coreIdea.trim()}
                    className="px-3 py-1 bg-primary-500/20 border-2 border-primary-500/70 text-primary-300 rounded-lg hover:bg-primary-500/30 transition-colors duration-200 text-sm disabled:opacity-50"
                  >
                    {isGenerating && generatingField === 'foundationEntities' ? 'Đang tạo...' : 'Gợi ý bằng AI'}
                  </button>
                  <button
                    onClick={addFoundationEntity}
                    className="p-2 bg-green-500/20 border-2 border-green-500/50 rounded-lg text-green-300 hover:bg-green-500/30 transition-colors duration-200"
                    title="Thêm thực thể"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-400 mb-4">Các thực thể, tổ chức, hoặc sức mạnh quan trọng trong thế giới</p>
              <div className="space-y-3">
                {worldData.foundationEntities.map((entity, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex space-x-2">
                      <select
                        value={entity.classification || 'Nhân vật'}
                        onChange={(e) => updateFoundationEntity(index, 'classification', e.target.value)}
                        className="px-3 py-2 bg-gray-800/50 border border-gray-600/50 rounded-lg text-white focus:border-blue-500 focus:outline-none text-sm"
                      >
                        {entityClassifications.map((classification) => (
                          <option key={classification} value={classification} className="bg-gray-800">
                            {classification}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={entity.name}
                        onChange={(e) => updateFoundationEntity(index, 'name', e.target.value)}
                        placeholder="Tên thực thể"
                        className="flex-1 px-3 py-2 bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none text-sm"
                      />
                      <button
                        onClick={() => removeFoundationEntity(index)}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-colors duration-200"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <textarea
                      value={entity.description}
                      onChange={(e) => updateFoundationEntity(index, 'description', e.target.value)}
                      placeholder="Mô tả chi tiết"
                      rows={2}
                      className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none text-sm resize-none"
                    />
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Currencies */}
            <motion.div
              className="glass-effect p-6 rounded-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold-vietnamese text-white">Tiền Tệ</h3>
                <button
                  onClick={addCurrency}
                  className="p-2 bg-green-500/20 border-2 border-green-500/50 rounded-lg text-green-300 hover:bg-green-500/30 transition-colors duration-200"
                  title="Thêm tiền tệ"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3">
                {worldData.currencies.map((currency, index) => (
                  <div key={index} className="flex flex-col sm:flex-row gap-2 sm:space-x-2">
                    <input
                      type="text"
                      value={currency.name}
                      onChange={(e) => updateCurrency(index, 'name', e.target.value)}
                      placeholder="Tên tiền tệ"
                      className="flex-1 px-3 py-2 bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none text-sm"
                    />
                    <input
                      type="text"
                      value={currency.description}
                      onChange={(e) => updateCurrency(index, 'description', e.target.value)}
                      placeholder="Mô tả"
                      className="flex-1 px-3 py-2 bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none text-sm"
                    />
                    <label className="flex items-center space-x-3 text-sm text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={currency.isMain}
                        onChange={(e) => updateCurrency(index, 'isMain', e.target.checked)}
                        className="w-5 h-5 rounded border-2 border-gray-400 bg-transparent text-primary-500 focus:ring-primary-500 focus:ring-2 focus:ring-offset-0 cursor-pointer"
                      />
                      <span>Chính</span>
                    </label>
                    <button
                      onClick={() => removeCurrency(index)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-colors duration-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Start Year & Difficulty */}
            <motion.div
              className="glass-effect p-6 rounded-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <h3 className="text-xl font-bold-vietnamese text-white mb-4">Thời Gian & Độ Khó</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Năm bắt đầu</label>
                  <input
                    type="number"
                    value={worldData.startYear}
                    onChange={(e) => setWorldData(prev => ({ ...prev, startYear: parseInt(e.target.value) || 1 }))}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600/50 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Độ khó</label>
                  <select
                    value={worldData.difficulty}
                    onChange={(e) => setWorldData(prev => ({ ...prev, difficulty: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600/50 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Chọn độ khó</option>
                    {difficulties.map(difficulty => (
                      <option key={difficulty} value={difficulty}>{difficulty}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <label className="flex items-center space-x-3 text-sm text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={worldData.useLevels}
                    onChange={(e) => setWorldData(prev => ({ ...prev, useLevels: e.target.checked }))}
                    className="w-5 h-5 rounded border-2 border-gray-400 bg-transparent text-primary-500 focus:ring-primary-500 focus:ring-2 focus:ring-offset-0 cursor-pointer"
                  />
                  <span>Sử dụng hệ thống cấp độ</span>
                </label>
              </div>
            </motion.div>

            {/* Create World & Start Game */}
            <motion.div
              className="glass-effect p-6 rounded-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
            >
              <div className="text-center">
                <h3 className="text-xl font-bold-vietnamese text-white mb-4">Tạo Thế Giới & Chuyển Tiếp</h3>
                <p className="text-gray-400 mb-6">
                  Điền đầy đủ thông tin bên trên, sau đó nhấn nút để AI tạo mô tả thế giới và chuyển đến tạo nhân vật
                </p>
                <button
                  onClick={handleCreateWorld}
                  disabled={isGenerating}
                  className="w-full py-4 bg-gradient-to-r from-primary-500/20 to-primary-600/20 border-2 border-primary-500/50 text-primary-300 rounded-lg hover:from-primary-500/30 hover:to-primary-600/30 hover:border-primary-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3 text-lg font-medium"
                >
                  <Sparkles className="w-6 h-6" />
                  <span>{isGenerating ? 'Đang tạo thế giới...' : 'Tạo Thế Giới & Chuyển Tiếp'}</span>
                </button>
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            {/* AI Features Guide */}
            <div className="glass-effect p-6 rounded-xl">
              <h3 className="text-lg font-semibold text-white mb-4">🤖 Hướng Dẫn Sử Dụng AI</h3>
              <div className="space-y-4">
                <div className="border-l-4 border-primary-500 pl-4">
                  <h4 className="font-medium text-primary-300 mb-1">Gợi ý bằng AI (Nguyên tắc/Thực thể)</h4>
                  <p className="text-sm text-gray-300">Tạo gợi ý phù hợp với ý tưởng cốt lõi. Cần điền ý tưởng cốt lõi trước.</p>
                </div>
                <div className="border-l-4 border-green-500 pl-4">
                  <h4 className="font-medium text-green-300 mb-1">Chi Tiết Hóa bằng AI</h4>
                  <p className="text-sm text-gray-300">Phát triển và mở rộng ý tưởng hiện tại thành ý tưởng hoàn chỉnh hơn.</p>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="glass-effect p-6 rounded-xl">
              <h3 className="text-lg font-semibold text-white mb-4">💡 Mẹo Tạo Thế Giới</h3>
              <ul className="text-sm text-gray-300 space-y-2">
                <li>• Viết ý tưởng cốt lõi cơ bản, sau đó dùng "Chi Tiết Hóa bằng AI" để phát triển</li>
                <li>• Nguyên tắc cốt lõi định nghĩa quy luật của thế giới</li>
                <li>• Thực thể nền tảng là các tổ chức/sức mạnh quan trọng</li>
                <li>• Tông truyện ảnh hưởng đến cách AI kể chuyện</li>
                <li>• Ngôi kể quyết định góc nhìn của người chơi</li>
              </ul>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Principle Selection Popup */}
      {showPrinciplePopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900 border border-gray-700/50 rounded-lg p-4 sm:p-6 max-w-2xl w-full mx-2 sm:mx-4 max-h-[90vh] sm:max-h-[80vh] overflow-y-auto"
          >
            <h3 className="text-xl font-bold-vietnamese text-white mb-2">Gợi ý Nguyên Tắc</h3>
            <p className="text-sm text-gray-400 mb-4">AI đã phân tích thế giới của bạn và đề xuất các mục sau.</p>
            
            <div className="mb-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedPrincipleIndices.length === aiGeneratedPrinciples.length && aiGeneratedPrinciples.length > 0}
                  onChange={() => {
                    if (selectedPrincipleIndices.length === aiGeneratedPrinciples.length) {
                      setSelectedPrincipleIndices([]);
                    } else {
                      setSelectedPrincipleIndices(aiGeneratedPrinciples.map((_, i) => i));
                    }
                  }}
                  className="w-4 h-4 rounded border-2 border-gray-400 bg-transparent text-primary-500 focus:ring-primary-500 focus:ring-2 focus:ring-offset-0 cursor-pointer"
                />
                <span className="text-sm text-gray-300">Chọn Tất cả</span>
              </label>
            </div>
            
            <div className="space-y-4 mb-6">
              {aiGeneratedPrinciples.map((principle, index) => (
                <div
                  key={principle.id || index}
                  className={`relative bg-gray-700/50 border-2 rounded-xl p-4 cursor-pointer transition-all duration-200 shadow-lg hover:shadow-xl ${
                    selectedPrincipleIndices.includes(index)
                      ? 'border-primary-500 bg-primary-500/10 shadow-primary-500/20'
                      : 'border-gray-600/50 hover:border-primary-400/50 hover:bg-gray-700/70'
                  }`}
                  onClick={() => togglePrincipleSelection(index)}
                >
                  {/* Checkbox */}
                  <div className="absolute top-3 right-3">
                    <input
                      type="checkbox"
                      checked={selectedPrincipleIndices.includes(index)}
                      onChange={() => togglePrincipleSelection(index)}
                      className="w-5 h-5 rounded border-2 border-gray-400 bg-transparent text-primary-500 focus:ring-primary-500 focus:ring-2 focus:ring-offset-0 cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  
                  {/* Card Content */}
                  <div className="pr-8">
                    {/* Header - Tên nguyên tắc */}
                    <h4 className="text-xl font-bold-vietnamese text-white mb-3 leading-tight">
                      {principle.name}
                    </h4>
                    
                    {/* Mô tả */}
                    <p className="text-sm text-gray-300 leading-relaxed mb-0">
                      {principle.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between">
              <button
                onClick={() => setShowPrinciplePopup(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200"
              >
                Hủy
              </button>
              <button
                onClick={handleSelectPrinciples}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors duration-200"
              >
                Thêm ({selectedPrincipleIndices.length}) mục đã chọn
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Entity Selection Popup */}
      {showEntityPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900 border border-gray-700/50 rounded-lg p-4 sm:p-6 max-w-2xl w-full mx-2 sm:mx-4 max-h-[90vh] sm:max-h-[80vh] overflow-y-auto"
          >
            <h3 className="text-xl font-bold-vietnamese text-white mb-2">Gợi ý Thực Thể</h3>
            <p className="text-sm text-gray-400 mb-4">AI đã phân tích thế giới của bạn và đề xuất các mục sau.</p>
            
            <div className="mb-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedEntityIndices.length === aiGeneratedEntities.length && aiGeneratedEntities.length > 0}
                  onChange={() => {
                    if (selectedEntityIndices.length === aiGeneratedEntities.length) {
                      setSelectedEntityIndices([]);
                    } else {
                      setSelectedEntityIndices(aiGeneratedEntities.map((_, i) => i));
                    }
                  }}
                  className="w-4 h-4 rounded border-2 border-gray-400 bg-transparent text-primary-500 focus:ring-primary-500 focus:ring-2 focus:ring-offset-0 cursor-pointer"
                />
                <span className="text-sm text-gray-300">Chọn Tất cả</span>
              </label>
            </div>
            
            <div className="space-y-4 mb-6">
              {aiGeneratedEntities.map((entity, index) => (
                <div
                  key={entity.id || index}
                  className={`relative bg-gray-700/50 border-2 rounded-xl p-4 cursor-pointer transition-all duration-200 shadow-lg hover:shadow-xl ${
                    selectedEntityIndices.includes(index)
                      ? 'border-primary-500 bg-primary-500/10 shadow-primary-500/20'
                      : 'border-gray-600/50 hover:border-primary-400/50 hover:bg-gray-700/70'
                  }`}
                  onClick={() => toggleEntitySelection(index)}
                >
                  {/* Checkbox */}
                  <div className="absolute top-3 right-3">
                    <input
                      type="checkbox"
                      checked={selectedEntityIndices.includes(index)}
                      onChange={() => toggleEntitySelection(index)}
                      className="w-5 h-5 rounded border-2 border-gray-400 bg-transparent text-primary-500 focus:ring-primary-500 focus:ring-2 focus:ring-offset-0 cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  
                  {/* Card Content */}
                  <div className="pr-8">
                    {/* Header - Tên thực thể */}
                    <h4 className="text-xl font-bold-vietnamese text-white mb-3 leading-tight">
                      {entity.name}
                    </h4>
                    
                    {/* Mô tả */}
                    <p className="text-sm text-gray-300 leading-relaxed mb-3">
                      {entity.description}
                    </p>
                    
                    {/* Tag phân loại */}
                    {entity.classification && (
                      <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        Loại: {entity.classification}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between">
              <button
                onClick={() => setShowEntityPopup(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200"
              >
                Hủy
              </button>
              <button
                onClick={handleSelectEntities}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors duration-200"
              >
                Thêm ({selectedEntityIndices.length}) mục đã chọn
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* World Description Popup */}
      {showWorldDescriptionPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900 border border-gray-700/50 rounded-lg p-4 sm:p-6 max-w-4xl w-full mx-2 sm:mx-4 max-h-[95vh] sm:max-h-[80vh] overflow-y-auto"
          >
            <h3 className="text-2xl font-bold-vietnamese text-white mb-4">Mô Tả Thế Giới</h3>
            <div className="bg-gray-700/30 border border-gray-600/50 rounded-lg p-4 mb-6">
              <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                {generatedWorldDescription}
              </p>
            </div>
            <div className="flex justify-between">
              <button
                onClick={handleRegenerateDescription}
                disabled={isGenerating}
                className="px-6 py-3 bg-blue-500/20 border border-blue-500/50 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-colors duration-200 disabled:opacity-50 flex items-center space-x-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isGenerating ? 'Đang tạo lại...' : 'Tạo Lại Mô Tả'}</span>
              </button>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowWorldDescriptionPopup(false)}
                  className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200"
                >
                  Hủy
                </button>
                <button
                  onClick={handleStartGame}
                  className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors duration-200 flex items-center space-x-2"
                >
                  <Play className="w-4 h-4" />
                  <span>Tạo Nhân Vật</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}