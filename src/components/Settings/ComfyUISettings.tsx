import { useState, useEffect } from 'react';
import { ComfyUISettings as ComfyUISettingsType, ComfyUIResolution } from '../../types';
import { comfyUIService } from '../../services/comfyUIService';
import { MotionWrapper } from '../MotionWrapper';
import { Settings, Image, Server, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export function ComfyUISettings() {
  const [settings, setSettings] = useState<ComfyUISettingsType>({
    enabled: false,
    resolution: '1280x720',
    serverUrl: 'http://localhost:5001',
    checkpoint: 'novaAnimeXL_ilV120.safetensors',
    loras: [
      {
        name: 'None',
        strength: 1.0,
        enabled: false,
        category: 'custom',
        description: 'No LoRA'
      }
    ],
    style: 'digital_art',
    customStyle: '',
    qualityLevel: 'high',
    enableCharacterConsistency: true, // Always enabled
    sampler: 'dpmpp_2m_sde',
    steps: 30,
    cfgScale: 8.0,
    maxLoras: 3
  });
  const [comfyUIPath, setComfyUIPath] = useState<string>('D:\\ComfyUI\\ComfyUI_windows_portable');
  const [serverStatus, setServerStatus] = useState<'connected' | 'disconnected' | 'checking'>('disconnected');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [availableCheckpoints, setAvailableCheckpoints] = useState<string[]>([]);
  const [isLoadingCheckpoints, setIsLoadingCheckpoints] = useState(false);
  const [availableLoras, setAvailableLoras] = useState<string[]>([]);
  const [isLoadingLoras, setIsLoadingLoras] = useState(false);
  const [showAddLoraModal, setShowAddLoraModal] = useState(false);
  const [selectedLoraForAdd, setSelectedLoraForAdd] = useState<string>('None');
  const [newLoraStrength, setNewLoraStrength] = useState<number>(0.7);
  const [newLoraCategory, setNewLoraCategory] = useState<'quality' | 'anatomy' | 'style' | 'detail' | 'lighting' | 'custom'>('quality');

  useEffect(() => {
    // Load settings on mount
    const loadedSettings = comfyUIService.loadSettings();
    // Ensure character consistency is always enabled
    const settingsWithConsistency = {
      ...loadedSettings,
      enableCharacterConsistency: true
    };
    setSettings(settingsWithConsistency);
    
    // Load ComfyUI path from localStorage
    const savedPath = localStorage.getItem('comfyui_path');
    if (savedPath) {
      setComfyUIPath(savedPath);
    }
    
    // Check server status
    checkServerStatus();
  }, []);

  const checkServerStatus = async () => {
    setServerStatus('checking');
    try {
      const isHealthy = await comfyUIService.checkHealth();
      setServerStatus(isHealthy ? 'connected' : 'disconnected');
      
      // Load checkpoints and LoRAs if server is connected
      if (isHealthy) {
        // Auto-update settings with available models
        await comfyUIService.autoUpdateSettings();
        
        // Reload settings after auto-update
        const updatedSettings = comfyUIService.loadSettings();
        setSettings(updatedSettings);
        
        // Load available models for UI
        await Promise.all([
          loadAvailableCheckpoints(),
          loadAvailableLoras()
        ]);
      }
    } catch (error) {
      setServerStatus('disconnected');
    }
  };

  const handleToggleEnable = (enabled: boolean) => {
    const newSettings = { ...settings, enabled };
    setSettings(newSettings);
    comfyUIService.saveSettings(newSettings);
  };

  const handleResolutionChange = (resolution: ComfyUIResolution) => {
    const newSettings = { ...settings, resolution };
    setSettings(newSettings);
    comfyUIService.saveSettings(newSettings);
  };

  const handleServerUrlChange = (serverUrl: string) => {
    const newSettings = { ...settings, serverUrl };
    setSettings(newSettings);
    comfyUIService.saveSettings(newSettings);
  };

  const handleCheckpointChange = (checkpoint: string) => {
    const newSettings = { ...settings, checkpoint };
    setSettings(newSettings);
    comfyUIService.saveSettings(newSettings);
  };


  const handleStyleChange = (style: string) => {
    const newSettings = { ...settings, style };
    setSettings(newSettings);
    comfyUIService.saveSettings(newSettings);
  };

  const handleCustomStyleChange = (customStyle: string) => {
    const newSettings = { ...settings, customStyle };
    setSettings(newSettings);
    comfyUIService.saveSettings(newSettings);
  };

  const handleQualityLevelChange = (qualityLevel: 'standard' | 'high' | 'ultra') => {
    const newSettings = { ...settings, qualityLevel };
    setSettings(newSettings);
    comfyUIService.saveSettings(newSettings);
  };

  const handleSamplerChange = (sampler: any) => {
    const newSettings = { ...settings, sampler };
    setSettings(newSettings);
    comfyUIService.saveSettings(newSettings);
  };

  const handleStepsChange = (steps: number) => {
    const newSettings = { ...settings, steps };
    setSettings(newSettings);
    comfyUIService.saveSettings(newSettings);
  };

  const handleCfgScaleChange = (cfgScale: number) => {
    const newSettings = { ...settings, cfgScale };
    setSettings(newSettings);
    comfyUIService.saveSettings(newSettings);
  };

  // LoRA Management Functions
  const handleAddLora = () => {
    if (selectedLoraForAdd === 'None') return;
    
    const newLora = {
      name: selectedLoraForAdd,
      strength: newLoraStrength,
      enabled: true,
      category: newLoraCategory,
      description: getLoraDescription(selectedLoraForAdd, newLoraCategory)
    };
    
    comfyUIService.addLora(newLora);
    const updatedSettings = comfyUIService.loadSettings();
    setSettings(updatedSettings);
    setShowAddLoraModal(false);
    setSelectedLoraForAdd('None');
    setNewLoraStrength(0.7);
    setNewLoraCategory('quality');
  };

  const handleRemoveLora = (loraName: string) => {
    comfyUIService.removeLora(loraName);
    const updatedSettings = comfyUIService.loadSettings();
    setSettings(updatedSettings);
  };

  const handleToggleLoraEnabled = (loraName: string) => {
    comfyUIService.toggleLoraEnabled(loraName);
    const updatedSettings = comfyUIService.loadSettings();
    setSettings(updatedSettings);
  };

  const handleLoraStrengthChange = (loraName: string, strength: number) => {
    comfyUIService.updateLoraStrength(loraName, strength);
    const updatedSettings = comfyUIService.loadSettings();
    setSettings(updatedSettings);
  };

  const getLoraDescription = (_loraName: string, category: string): string => {
    const descriptions: { [key: string]: string } = {
      'quality': 'Enhances detail and quality',
      'anatomy': 'Improves anatomy and fixes hand issues',
      'style': 'Enhances artistic style',
      'detail': 'Adds fine details and textures',
      'lighting': 'Enhances lighting and atmosphere',
      'custom': 'Custom LoRA configuration'
    };
    return descriptions[category] || 'Custom LoRA';
  };

  const getCategoryColor = (category: string): string => {
    const colors: { [key: string]: string } = {
      'quality': 'bg-yellow-500',
      'anatomy': 'bg-yellow-600',
      'style': 'bg-yellow-600',
      'detail': 'bg-yellow-600',
      'lighting': 'bg-yellow-500',
      'custom': 'bg-gray-500'
    };
    return colors[category] || 'bg-gray-500';
  };


  const loadAvailableCheckpoints = async () => {
    setIsLoadingCheckpoints(true);
    try {
      const checkpoints = await comfyUIService.getAvailableCheckpoints();
      setAvailableCheckpoints(checkpoints);
    } catch (error) {
      console.error('Failed to load checkpoints:', error);
    } finally {
      setIsLoadingCheckpoints(false);
    }
  };

  const loadAvailableLoras = async () => {
    setIsLoadingLoras(true);
    try {
      const loras = await comfyUIService.getAvailableLoras();
      setAvailableLoras(loras);
    } catch (error) {
      console.error('Failed to load LoRAs:', error);
    } finally {
      setIsLoadingLoras(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    try {
      await checkServerStatus();
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleComfyUIPathChange = (path: string) => {
    setComfyUIPath(path);
    localStorage.setItem('comfyui_path', path);
  };

  const handleStartComfyUI = () => {
    // Create a batch file with the current path
    const batchContent = `@echo off
echo Starting ComfyUI from: ${comfyUIPath}
cd /d "${comfyUIPath}"
run_nvidia_gpu.bat
pause`;
    
    // Create and download the batch file
    const blob = new Blob([batchContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'start_comfyui.bat';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleGenerateFullStartupScript = () => {
    // Create a complete startup script for all services
    const batchContent = `@echo off
echo ========================================
echo    AI Roleplay Game with ComfyUI
echo ========================================
echo.

echo Starting ComfyUI server...
start "ComfyUI" cmd /k "cd /d "${comfyUIPath}" && run_nvidia_gpu.bat"

echo Waiting for ComfyUI to start...
timeout /t 30 /nobreak

echo Starting ComfyUI API server...
start "ComfyUI API Server" cmd /k "cd /d "${window.location.origin.replace('http://', '').split(':')[0] === 'localhost' ? 'D:\\AI-game-test-2' : '.'}" && python comfyui_api_server.py"

echo Waiting for API server to start...
timeout /t 10 /nobreak

echo Starting React development server...
start "React App" cmd /k "cd /d "${window.location.origin.replace('http://', '').split(':')[0] === 'localhost' ? 'D:\\AI-game-test-2' : '.'}" && npm run dev"

echo.
echo ========================================
echo    All services started!
echo ========================================
echo.
echo ComfyUI: http://localhost:8188
echo API Server: http://localhost:5001
echo React App: http://localhost:5173
echo.
echo Press any key to exit...
pause > nul`;
    
    // Create and download the batch file
    const blob = new Blob([batchContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'start_game_with_comfyui.bat';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const resolutionOptions: { value: ComfyUIResolution; label: string }[] = [
    { value: '640x360', label: '640x360 (nHD)' },
    { value: '854x480', label: '854x480 (FWVGA)' },
    { value: '1280x720', label: '1280x720 (HD)' },
    { value: '1920x1080', label: '1920x1080 (Full HD)' }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <MotionWrapper
        className="text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-center space-x-3 mb-4">
          <Image className="w-8 h-8 text-yellow-400" />
          <h2 className="text-2xl font-bold text-white">ComfyUI Settings</h2>
        </div>
        <p className="text-gray-300 max-w-2xl mx-auto">
          Cấu hình ComfyUI để tạo ảnh minh họa cho game. ComfyUI sẽ tự động tạo ảnh dựa trên nội dung game.
        </p>
      </MotionWrapper>

      {/* Enable/Disable Toggle */}
      <MotionWrapper
        className="glass-effect p-6 rounded-xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Bật ComfyUI</h3>
            <p className="text-gray-300 text-sm">
              Khi bật, game sẽ tự động tạo ảnh minh họa cho các tin nhắn AI và opening message.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => handleToggleEnable(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-14 h-7 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-yellow-600"></div>
          </label>
        </div>
      </MotionWrapper>

      {/* ComfyUI Path Configuration */}
      <MotionWrapper
        className="glass-effect p-6 rounded-xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="flex items-center space-x-3 mb-4">
          <Settings className="w-5 h-5 text-yellow-400" />
          <h3 className="text-lg font-semibold text-white">ComfyUI Path Configuration</h3>
        </div>

        <div className="space-y-4">
          {/* ComfyUI Path */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              ComfyUI Installation Path
            </label>
            <input
              type="text"
              value={comfyUIPath}
              onChange={(e) => handleComfyUIPathChange(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              placeholder="D:\ComfyUI\ComfyUI_windows_portable"
            />
            <p className="text-xs text-gray-400 mt-1">
              Đường dẫn đến thư mục ComfyUI trên máy của bạn
            </p>
          </div>

          {/* Start ComfyUI Buttons */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-300">
                  Tạo file batch để khởi động ComfyUI với đường dẫn hiện tại
                </p>
              </div>
              <button
                onClick={handleStartComfyUI}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-600 text-sm flex items-center space-x-2"
              >
                <Settings className="w-4 h-4" />
                <span>Generate ComfyUI Script</span>
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-300">
                  Tạo script hoàn chỉnh để khởi động tất cả services (ComfyUI + API + React)
                </p>
              </div>
              <button
                onClick={handleGenerateFullStartupScript}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-600 text-sm flex items-center space-x-2"
              >
                <Server className="w-4 h-4" />
                <span>Generate Full Startup Script</span>
              </button>
            </div>
          </div>
        </div>
      </MotionWrapper>

      {/* Server Configuration */}
      <MotionWrapper
        className="glass-effect p-6 rounded-xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className="flex items-center space-x-3 mb-4">
          <Server className="w-5 h-5 text-yellow-400" />
          <h3 className="text-lg font-semibold text-white">Server Configuration</h3>
        </div>

        <div className="space-y-4">
          {/* Server URL */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              ComfyUI API Server URL
            </label>
            <input
              type="url"
              value={settings.serverUrl}
              onChange={(e) => handleServerUrlChange(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              placeholder="http://localhost:5001"
            />
          </div>

          {/* Connection Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {serverStatus === 'connected' && <CheckCircle className="w-5 h-5 text-yellow-400" />}
              {serverStatus === 'disconnected' && <XCircle className="w-5 h-5 text-white" />}
              {serverStatus === 'checking' && <AlertTriangle className="w-5 h-5 text-yellow-400 animate-spin" />}
              <span className="text-sm text-gray-300">
                Server Status: {
                  serverStatus === 'connected' ? 'Connected' :
                  serverStatus === 'disconnected' ? 'Disconnected' :
                  'Checking...'
                }
              </span>
            </div>
            <button
              onClick={handleTestConnection}
              disabled={isTestingConnection}
              className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isTestingConnection ? 'Testing...' : 'Test Connection'}
            </button>
          </div>
        </div>
      </MotionWrapper>

      {/* Resolution Settings */}
      <MotionWrapper
        className="glass-effect p-6 rounded-xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <div className="flex items-center space-x-3 mb-4">
          <Settings className="w-5 h-5 text-yellow-400" />
          <h3 className="text-lg font-semibold text-white">Image Settings</h3>
        </div>

        <div className="space-y-4">
          {/* Resolution Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Image Resolution (16:9 Aspect Ratio)
            </label>
            <select
              value={settings.resolution}
              onChange={(e) => handleResolutionChange(e.target.value as ComfyUIResolution)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            >
              {resolutionOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Độ phân giải cao hơn sẽ tạo ảnh đẹp hơn nhưng tốn thời gian lâu hơn.
            </p>
          </div>

          {/* Checkpoint Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-300">
                Checkpoint Model
              </label>
              <button
                onClick={loadAvailableCheckpoints}
                disabled={isLoadingCheckpoints || serverStatus !== 'connected'}
                className="px-3 py-1 bg-yellow-500 text-white rounded text-xs hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoadingCheckpoints ? 'Loading...' : 'Refresh'}
              </button>
            </div>
            <select
              value={settings.checkpoint}
              onChange={(e) => handleCheckpointChange(e.target.value)}
              disabled={availableCheckpoints.length === 0}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent disabled:opacity-50"
            >
              {availableCheckpoints.length === 0 ? (
                <option value="">{serverStatus === 'connected' ? 'Loading checkpoints...' : 'Connect to server first'}</option>
              ) : (
                availableCheckpoints.map((checkpoint) => (
                  <option key={checkpoint} value={checkpoint}>
                    {checkpoint}
                  </option>
                ))
              )}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Chọn model checkpoint để tạo ảnh. Cần kết nối server để load danh sách.
            </p>
          </div>

          {/* Multiple LoRA Management */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-300">
                LoRA Models ({settings.loras.filter(l => l.name !== 'None').length}/{settings.maxLoras})
              </label>
              <div className="flex gap-2">
                <button
                  onClick={loadAvailableLoras}
                  disabled={isLoadingLoras || serverStatus !== 'connected'}
                  className="px-3 py-1 bg-yellow-500 text-white rounded text-xs hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoadingLoras ? 'Loading...' : 'Refresh'}
                </button>
                <button
                  onClick={() => setShowAddLoraModal(true)}
                  disabled={settings.loras.filter(l => l.name !== 'None').length >= settings.maxLoras}
                  className="px-3 py-1 bg-yellow-700 hover:bg-yellow-700 text-white text-xs rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  + Add LoRA
                </button>
              </div>
            </div>
            
            {/* LoRA List */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {settings.loras.filter(l => l.name !== 'None').map((lora) => (
                <div key={lora.name} className="bg-gray-700 rounded-lg p-3 border border-gray-600">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={lora.enabled}
                        onChange={() => handleToggleLoraEnabled(lora.name)}
                        className="w-4 h-4 text-yellow-500 bg-gray-700 border-gray-600 rounded focus:ring-yellow-500"
                      />
                      <span className="text-sm font-medium text-white">{lora.name}</span>
                      <span className={`px-2 py-1 text-xs rounded-full text-white ${getCategoryColor(lora.category)}`}>
                        {lora.category}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveLora(lora.name)}
                      className="text-white hover:text-white text-sm"
                    >
                      Remove
                    </button>
                  </div>
                  
                  {lora.description && (
                    <p className="text-xs text-gray-400 mb-2">{lora.description}</p>
                  )}
                  
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">Strength:</span>
                    <input
                      type="range"
                      min="0.0"
                      max="2.0"
                      step="0.1"
                      value={lora.strength}
                      onChange={(e) => handleLoraStrengthChange(lora.name, parseFloat(e.target.value))}
                      className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-yellow-500 slider"
                    />
                    <span className="text-xs text-yellow-400 font-semibold w-8">
                      {lora.strength}
                    </span>
                  </div>
                </div>
              ))}
              
              {settings.loras.filter(l => l.name !== 'None').length === 0 && (
                <div className="text-center py-4 text-gray-400 text-sm">
                  No LoRAs added. Click "Add LoRA" to add one.
                </div>
              )}
            </div>
            
            <p className="text-xs text-gray-400 mt-2">
              LoRA models để fine-tune style và quality. Có thể sử dụng tối đa {settings.maxLoras} LoRAs cùng lúc.
            </p>
          </div>

          {/* Art Style Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Art Style
            </label>
            <select
              value={settings.style}
              onChange={(e) => handleStyleChange(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            >
              <option value="realistic">Realistic</option>
              <option value="anime">Anime</option>
              <option value="manga">Manga</option>
              <option value="cartoon">Cartoon</option>
              <option value="oil_painting">Oil Painting</option>
              <option value="watercolor">Watercolor</option>
              <option value="digital_art">Digital Art</option>
              <option value="concept_art">Concept Art</option>
              <option value="fantasy_art">Fantasy Art</option>
              <option value="sci_fi">Sci-Fi</option>
              <option value="medieval">Medieval</option>
              <option value="steampunk">Steampunk</option>
              <option value="cyberpunk">Cyberpunk</option>
              <option value="custom">Custom</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Chọn phong cách nghệ thuật cho ảnh được tạo.
            </p>
          </div>

          {/* Custom Style Input */}
          {settings.style === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Custom Style Prompt
              </label>
              <textarea
                value={settings.customStyle}
                onChange={(e) => handleCustomStyleChange(e.target.value)}
                placeholder="Enter custom style description (e.g., 'oil painting style, classical art, brush strokes')"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent resize-none"
                rows={3}
              />
              <p className="text-xs text-gray-400 mt-1">
                Mô tả phong cách tùy chỉnh bằng tiếng Anh. Sẽ được thêm vào prompt.
              </p>
            </div>
          )}

          {/* Quality Level Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Quality Level
            </label>
            <select
              value={settings.qualityLevel}
              onChange={(e) => handleQualityLevelChange(e.target.value as 'standard' | 'high' | 'ultra')}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            >
              <option value="standard">Standard (Faster)</option>
              <option value="high">High (Balanced)</option>
              <option value="ultra">Ultra (Best Quality)</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Chọn mức chất lượng ảnh. Ultra sẽ tạo ảnh đẹp nhất nhưng chậm hơn.
            </p>
          </div>

          {/* Sampler Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Sampler
            </label>
            <select
              value={settings.sampler}
              onChange={(e) => handleSamplerChange(e.target.value as any)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            >
              <option value="euler">Euler (Fast, Good Quality)</option>
              <option value="euler_ancestral">Euler Ancestral (Better Quality)</option>
              <option value="heun">Heun (High Quality, Slower)</option>
              <option value="dpm_2">DPM++ 2M (Balanced)</option>
              <option value="dpm_2_ancestral">DPM++ 2M Ancestral (Better)</option>
              <option value="dpmpp_2m">DPM++ 2M (High Quality)</option>
              <option value="dpmpp_2s_ancestral">DPM++ 2S Ancestral (Best Quality)</option>
              <option value="dpmpp_sde">DPM++ SDE (Stochastic)</option>
              <option value="dpmpp_sde_gpu">DPM++ SDE GPU (Faster)</option>
              <option value="dpmpp_2m_sde">DPM++ 2M SDE (High Quality)</option>
              <option value="dpmpp_2m_sde_gpu">DPM++ 2M SDE GPU (Faster)</option>
              <option value="dpmpp_3m_sde">DPM++ 3M SDE (Best Quality)</option>
              <option value="dpmpp_3m_sde_gpu">DPM++ 3M SDE GPU (Faster)</option>
              <option value="ddim">DDIM (Fast, Deterministic)</option>
              <option value="lcm">LCM (Fast, Low Memory)</option>
              <option value="ipndm">iPNDM (Fast, Good Quality)</option>
              <option value="deis">DEIS (Fast, High Quality)</option>
              <option value="res_multistep">Res Multistep (Balanced)</option>
              <option value="res_multistep_ancestral">Res Multistep Ancestral (Better)</option>
              <option value="gradient_estimation">Gradient Estimation (Advanced)</option>
              <option value="er_sde">ER SDE (Stochastic)</option>
              <option value="seeds_2">Seeds 2 (Fast)</option>
              <option value="seeds_3">Seeds 3 (Faster)</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Phương pháp sampling: Euler (nhanh), DPM++ (chất lượng cao), DDIM (ổn định)
            </p>
          </div>

          {/* Steps Slider */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Sampling Steps: <span className="text-yellow-400 font-semibold">{settings.steps}</span>
            </label>
            <div className="relative">
              <input
                type="range"
                min="1"
                max="150"
                value={settings.steps}
                onChange={(e) => handleStepsChange(parseInt(e.target.value))}
                className="w-full h-3 bg-gray-600 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-yellow-500 slider"
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-2">
              <span className="text-gray-500">1 (Fast)</span>
              <span className="text-gray-500">75 (Balanced)</span>
              <span className="text-gray-500">150 (Best Quality)</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Số bước sampling: 1-20 (nhanh), 20-50 (cân bằng), 50+ (chất lượng cao)
            </p>
          </div>

          {/* CFG Scale Slider */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              CFG Scale: <span className="text-yellow-400 font-semibold">{settings.cfgScale}</span>
            </label>
            <div className="relative">
              <input
                type="range"
                min="1.0"
                max="30.0"
                step="0.5"
                value={settings.cfgScale}
                onChange={(e) => handleCfgScaleChange(parseFloat(e.target.value))}
                className="w-full h-3 bg-gray-600 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-yellow-500 slider"
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-2">
              <span className="text-gray-500">1.0 (Creative)</span>
              <span className="text-gray-500">7.0 (Balanced)</span>
              <span className="text-gray-500">30.0 (Strict)</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Mức độ tuân theo prompt: 1-7 (sáng tạo), 7-15 (cân bằng), 15+ (chặt chẽ)
            </p>
          </div>

          {/* Character Consistency Toggle - Always Enabled */}
          <div>
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={true}
                disabled={true}
                className="w-4 h-4 text-yellow-500 bg-gray-700 border-gray-600 rounded focus:ring-yellow-500 focus:ring-2 opacity-50 cursor-not-allowed"
              />
              <span className="text-sm font-medium text-gray-300">
                Character Consistency (Always Enabled)
              </span>
            </label>
            <p className="text-xs text-gray-400 mt-1 ml-7">
              Đảm bảo nhân vật có ngoại hình nhất quán trong các ảnh khác nhau. Tính năng này luôn được bật để đảm bảo chất lượng ảnh.
            </p>
          </div>
        </div>
      </MotionWrapper>

      {/* Information */}
      <MotionWrapper
        className="glass-effect p-6 rounded-xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <h3 className="text-lg font-semibold text-white mb-4">Thông Tin</h3>
        
        <div className="space-y-3 text-sm text-gray-300">
          <div className="flex items-start space-x-2">
            <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 flex-shrink-0"></div>
            <p>
              <strong>ComfyUI Server:</strong> Cần chạy ComfyUI local server để sử dụng tính năng này.
            </p>
          </div>
          <div className="flex items-start space-x-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
            <p>
              <strong>Image Generation:</strong> Ảnh sẽ được tạo tự động cho opening message và mỗi AI response.
            </p>
          </div>
          <div className="flex items-start space-x-2">
            <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 flex-shrink-0"></div>
            <p>
              <strong>Performance:</strong> Image generation chạy song song, không ảnh hưởng đến tốc độ game.
            </p>
          </div>
          <div className="flex items-start space-x-2">
            <div className="w-2 h-2 bg-gray-800 rounded-full mt-2 flex-shrink-0"></div>
            <p>
              <strong>Storage:</strong> Ảnh được lưu local, tự động cleanup khi vượt quá 100 ảnh.
            </p>
          </div>
        </div>
      </MotionWrapper>

      {/* Warning if server is disconnected */}
      {!settings.enabled && (
        <MotionWrapper
          className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5" />
            <p className="font-medium">ComfyUI đã tắt</p>
          </div>
          <p className="text-sm mt-1">
            Bật ComfyUI để sử dụng tính năng tạo ảnh minh họa cho game.
          </p>
        </MotionWrapper>
      )}

      {settings.enabled && serverStatus === 'disconnected' && (
        <MotionWrapper
          className="bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <div className="flex items-center space-x-2">
            <XCircle className="w-5 h-5" />
            <p className="font-medium">ComfyUI Server không khả dụng</p>
          </div>
          <p className="text-sm mt-1">
            Vui lòng khởi động ComfyUI server hoặc kiểm tra kết nối.
          </p>
        </MotionWrapper>
      )}

      {/* Add LoRA Modal */}
      {showAddLoraModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-96 max-w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">Add New LoRA</h3>
            
            <div className="space-y-4">
              {/* LoRA Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select LoRA
                </label>
                <select
                  value={selectedLoraForAdd}
                  onChange={(e) => setSelectedLoraForAdd(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                >
                  <option value="None">Select a LoRA...</option>
                  {availableLoras.filter(lora => !settings.loras.some(l => l.name === lora)).map((lora) => (
                    <option key={lora} value={lora}>
                      {lora}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Category
                </label>
                <select
                  value={newLoraCategory}
                  onChange={(e) => setNewLoraCategory(e.target.value as any)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                >
                  <option value="quality">Quality Enhancement</option>
                  <option value="anatomy">Anatomy Improvement</option>
                  <option value="style">Style Enhancement</option>
                  <option value="detail">Detail Enhancement</option>
                  <option value="lighting">Lighting Enhancement</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              {/* Strength Slider */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Strength: <span className="text-yellow-400">{newLoraStrength}</span>
                </label>
                <input
                  type="range"
                  min="0.0"
                  max="2.0"
                  step="0.1"
                  value={newLoraStrength}
                  onChange={(e) => setNewLoraStrength(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-yellow-500 slider"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>0.0 (No Effect)</span>
                  <span>1.0 (Full Effect)</span>
                  <span>2.0 (Double Effect)</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddLoraModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddLora}
                disabled={selectedLoraForAdd === 'None'}
                className="px-4 py-2 bg-yellow-700 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Add LoRA
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
