import { useState, useEffect } from 'react';
import { ComfyUISettings as ComfyUISettingsType, ComfyUIResolution } from '../../types';
import { comfyUIService } from '../../services/comfyUIService';
import { MotionWrapper } from '../MotionWrapper';
import { Settings, Image, Server, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export function ComfyUISettings() {
  const [settings, setSettings] = useState<ComfyUISettingsType>({
    enabled: false,
    resolution: '1280x720',
    serverUrl: 'http://localhost:5001'
  });
  const [comfyUIPath, setComfyUIPath] = useState<string>('D:\\ComfyUI\\ComfyUI_windows_portable');
  const [serverStatus, setServerStatus] = useState<'connected' | 'disconnected' | 'checking'>('disconnected');
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  useEffect(() => {
    // Load settings on mount
    const loadedSettings = comfyUIService.loadSettings();
    setSettings(loadedSettings);
    
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
echo API Server: http://localhost:5000
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
          <Image className="w-8 h-8 text-purple-400" />
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
            <div className="w-14 h-7 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-purple-600"></div>
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
          <Settings className="w-5 h-5 text-green-400" />
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
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm flex items-center space-x-2"
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
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 text-sm flex items-center space-x-2"
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
          <Server className="w-5 h-5 text-blue-400" />
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
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="http://localhost:5001"
            />
          </div>

          {/* Connection Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {serverStatus === 'connected' && <CheckCircle className="w-5 h-5 text-green-400" />}
              {serverStatus === 'disconnected' && <XCircle className="w-5 h-5 text-red-400" />}
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
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
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
          <Settings className="w-5 h-5 text-green-400" />
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
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
            <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
            <p>
              <strong>ComfyUI Server:</strong> Cần chạy ComfyUI local server để sử dụng tính năng này.
            </p>
          </div>
          <div className="flex items-start space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
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
            <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
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
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg"
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
    </div>
  );
}
