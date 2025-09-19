import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ApiKeyConfig } from '../components/Settings/ApiKeyConfig';
import { MultiApiKeyManager } from '../components/Settings/MultiApiKeyManager';
import { geminiService } from '../services/geminiService';

export function SettingsPage() {
  const [isApiConfigured, setIsApiConfigured] = useState(false);
  const [showMultiKeyManager, setShowMultiKeyManager] = useState(true); // Default to multi-key mode
  const [useMultiKeyMode, setUseMultiKeyMode] = useState(true);

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

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center mb-12"
      >
        <h1 className="text-5xl font-fantasy font-bold text-gradient mb-4">
          Cài Đặt
        </h1>
        <p className="text-xl text-gray-300 max-w-3xl mx-auto">
          Cấu hình API key và các tùy chọn khác để tối ưu hóa trải nghiệm game của bạn.
        </p>
      </motion.div>

      <div className="space-y-8">
        {/* API Configuration */}
        {/* Toggle Button */}
        <motion.div
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
        </motion.div>

        <motion.div
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
        </motion.div>

        {/* API Status */}
        <motion.div
          className="glass-effect p-6 rounded-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <h3 className="text-xl font-semibold text-white mb-4">Trạng Thái API</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
        </motion.div>

        {/* Usage Information */}
        <motion.div
          className="glass-effect p-6 rounded-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <h3 className="text-xl font-semibold text-white mb-4">Thông Tin Sử Dụng</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
        </motion.div>

        {/* Game Settings */}
        <motion.div
          className="glass-effect p-6 rounded-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          <h3 className="text-xl font-semibold text-white mb-4">Cài Đặt Game</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-white">Âm Thanh</h4>
                <p className="text-sm text-gray-300">Bật/tắt âm thanh trong game</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-white">Animations</h4>
                <p className="text-sm text-gray-300">Bật/tắt hiệu ứng chuyển động</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-white">Auto-save</h4>
                <p className="text-sm text-gray-300">Tự động lưu tiến trình game</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
