import { useState, useEffect } from 'react';
import { ApiKeyConfig } from '../components/Settings/ApiKeyConfig';
import { MultiApiKeyManager } from '../components/Settings/MultiApiKeyManager';
import { VersionInfo } from '../components/Settings/VersionInfo';
import { ComfyUISettings } from '../components/Settings/ComfyUISettings';
import { geminiService } from '../services/geminiService';
import { Key, Info, Image } from 'lucide-react';
import { MotionWrapper } from '../components/MotionWrapper';
import { useResponsiveContext } from '../contexts/ResponsiveContext';

export function SettingsPage() {
  const { shouldUseMobileLayout } = useResponsiveContext();
  const [isApiConfigured, setIsApiConfigured] = useState(false);
  const [showMultiKeyManager, setShowMultiKeyManager] = useState(true); // Default to multi-key mode
  const [useMultiKeyMode, setUseMultiKeyMode] = useState(true);
  const [activeTab, setActiveTab] = useState<'api' | 'comfyui' | 'info'>('api');

  useEffect(() => {
    // Kiểm tra trạng thái API khi component mount
    const checkApiStatus = async () => {
      // Đợi một chút để đảm bảo service đã khởi tạo
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Set the mode based on current state
      const isUsingMulti = geminiService.isUsingMultiKeyService();
      setUseMultiKeyMode(isUsingMulti);
      setShowMultiKeyManager(isUsingMulti);
      
      // Kiểm tra xem có API key trong localStorage không
      const hasApiKey = geminiService.hasApiKey();
      const isConfigured = geminiService.isConfigured();
      
      // Nếu có API key nhưng chưa configured, thử khởi tạo lại
      if (hasApiKey && !isConfigured) {
        // Trigger re-initialization
        const apiKey = localStorage.getItem('gemini_api_key');
        if (apiKey) {
          await geminiService.setApiKey(apiKey);
        }
      }
      
      setIsApiConfigured(geminiService.isConfigured());
    };

    checkApiStatus();
  }, []);

  const handleApiKeySet = (isSet: boolean) => {
    setIsApiConfigured(isSet);
  };

  const handleModeSwitch = (useMulti: boolean) => {
    setUseMultiKeyMode(useMulti);
    setShowMultiKeyManager(useMulti);
    geminiService.setUseMultiKeyService(useMulti);
    
    // Re-check API status after mode switch
    setTimeout(() => {
      setIsApiConfigured(geminiService.isConfigured());
    }, 100);
  };

  const tabs = [
    {
      id: 'api' as const,
      label: 'API Keys',
      icon: Key,
      description: 'Cấu hình API keys cho AI'
    },
    {
      id: 'comfyui' as const,
      label: 'ComfyUI',
      icon: Image,
      description: 'Cấu hình ComfyUI cho tạo ảnh'
    },
    {
      id: 'info' as const,
      label: 'Version & Info',
      icon: Info,
      description: 'Thông tin phiên bản'
    }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'api':
        return (
          <div className="space-y-8">
            {/* Toggle Button */}
            <MotionWrapper
              className="flex justify-center mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="glass-effect p-2 rounded-lg">
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleModeSwitch(false)}
                    className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                      !useMultiKeyMode
                        ? 'bg-primary-500/20 border-2 border-primary-500/50 text-primary-300'
                        : 'bg-white/5 border-2 border-white/10 text-gray-300 hover:border-white/20'
                    }`}
                  >
                    API Key Đơn
                  </button>
                  <button
                    onClick={() => handleModeSwitch(true)}
                    className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                      useMultiKeyMode
                        ? 'bg-primary-500/20 border-2 border-primary-500/50 text-primary-300'
                        : 'bg-white/5 border-2 border-white/10 text-gray-300 hover:border-white/20'
                    }`}
                  >
                    Multi API Keys
                  </button>
                </div>
              </div>
            </MotionWrapper>

            <MotionWrapper
              className="glass-effect p-6 rounded-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              {showMultiKeyManager ? (
                <MultiApiKeyManager onApiKeySet={handleApiKeySet} />
              ) : (
                <ApiKeyConfig onApiKeySet={handleApiKeySet} />
              )}
            </MotionWrapper>

            {/* API Status */}
            <MotionWrapper
              className="glass-effect p-6 rounded-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <h3 className="text-xl font-semibold text-white mb-4">Trạng Thái API</h3>
              
              <div className={`grid gap-6 ${shouldUseMobileLayout() ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${isApiConfigured ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-white font-medium">
                      Google Gemini API: {isApiConfigured ? 'Đã kết nối' : 'Chưa kết nối'}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-300">
                    {isApiConfigured ? (
                      <p>✅ API đã được cấu hình và sẵn sàng sử dụng các tính năng AI.</p>
                    ) : (
                      <p>⚠️ Cần cấu hình API key để sử dụng tính năng tạo thế giới và gợi ý nhân vật.</p>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-white">Tính năng AI:</h4>
                  <ul className="text-sm text-gray-300 space-y-2">
                    <li className={`flex items-center space-x-2 ${isApiConfigured ? 'text-green-300' : 'text-gray-500'}`}>
                      <span>{isApiConfigured ? '✅' : '❌'}</span>
                      <span>Tạo thế giới với AI</span>
                    </li>
                    <li className={`flex items-center space-x-2 ${isApiConfigured ? 'text-green-300' : 'text-gray-500'}`}>
                      <span>{isApiConfigured ? '✅' : '❌'}</span>
                      <span>Gợi ý nhân vật</span>
                    </li>
                    <li className={`flex items-center space-x-2 ${isApiConfigured ? 'text-green-300' : 'text-gray-500'}`}>
                      <span>{isApiConfigured ? '✅' : '❌'}</span>
                      <span>Chat với AI trong game</span>
                    </li>
                    <li className={`flex items-center space-x-2 ${isApiConfigured ? 'text-green-300' : 'text-gray-500'}`}>
                      <span>{isApiConfigured ? '✅' : '❌'}</span>
                      <span>Tạo tình huống game động</span>
                    </li>
                  </ul>
                </div>
              </div>
            </MotionWrapper>

            {/* Usage Information */}
            <MotionWrapper
              className="glass-effect p-6 rounded-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <h3 className="text-xl font-semibold text-white mb-4">Thông Tin Sử Dụng</h3>
              
              <div className={`grid gap-6 ${shouldUseMobileLayout() ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
                <div>
                  <h4 className="font-semibold text-white mb-3">Cách Lấy API Key:</h4>
                  <ol className="text-sm text-gray-300 space-y-2 list-decimal list-inside">
                    <li>Truy cập <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Google AI Studio</a></li>
                    <li>Đăng nhập bằng tài khoản Google</li>
                    <li>Click "Create API Key"</li>
                    <li>Copy API key và paste vào ô cấu hình</li>
                    <li>API key sẽ được lưu an toàn trên máy của bạn</li>
                  </ol>
                </div>

                <div>
                  <h4 className="font-semibold text-white mb-3">Lưu Ý Bảo Mật:</h4>
                  <ul className="text-sm text-gray-300 space-y-2">
                    <li>• API key chỉ được lưu trên máy của bạn</li>
                    <li>• Không chia sẻ API key với người khác</li>
                    <li>• Có thể xóa API key bất kỳ lúc nào</li>
                    <li>• API key có giới hạn sử dụng miễn phí</li>
                  </ul>
                </div>
              </div>
            </MotionWrapper>
          </div>
        );
      case 'comfyui':
        return <ComfyUISettings />;
      case 'info':
        return <VersionInfo />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <MotionWrapper
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center mb-8"
      >
        <p className="text-xl text-gray-300 max-w-3xl mx-auto">
          Cấu hình API key và các tùy chọn khác để tối ưu hóa trải nghiệm game của bạn.
        </p>
      </MotionWrapper>

      {/* Tab Navigation */}
      <MotionWrapper
        className="flex justify-center mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="glass-effect p-2 rounded-xl">
          <div className={`flex ${shouldUseMobileLayout() ? 'flex-col space-y-2' : 'flex-row space-x-2'}`}>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-3 rounded-lg transition-all duration-200 flex items-center ${
                    shouldUseMobileLayout() ? 'justify-start space-x-2 w-full' : 'space-x-2'
                  } ${
                    activeTab === tab.id
                      ? 'bg-primary-500/20 border-2 border-primary-500/50 text-primary-300'
                      : 'bg-white/5 border-2 border-white/10 text-gray-300 hover:border-white/20 hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-medium">{tab.label}</div>
                    <div className={`text-xs opacity-75 ${shouldUseMobileLayout() ? 'hidden' : 'block'}`}>{tab.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </MotionWrapper>

      {/* Tab Content */}
      <MotionWrapper
        key={activeTab}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        {renderTabContent()}
      </MotionWrapper>
    </div>
  );
}
