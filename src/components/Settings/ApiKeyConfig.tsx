import { useState } from 'react';
import { motion } from 'framer-motion';
import { Key, Eye, EyeOff, Check, X, AlertCircle } from 'lucide-react';
import { geminiService } from '../../services/geminiService';

interface ApiKeyConfigProps {
  onApiKeySet: (isSet: boolean) => void;
}

export function ApiKeyConfig({ onApiKeySet }: ApiKeyConfigProps) {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      setStatus('error');
      setErrorMessage('Vui lòng nhập API key');
      return;
    }

    setIsLoading(true);
    setStatus('idle');

    try {
      // Lưu API key và khởi tạo service
      await geminiService.setApiKey(apiKey.trim());
      
      // Kiểm tra xem API key có hợp lệ không
      if (geminiService.isConfigured()) {
        // Test API key với method chi tiết
        const testResult = await geminiService.testApiKey();
        
        if (testResult.success) {
          setStatus('success');
          onApiKeySet(true);
          setApiKey(''); // Clear input for security
        } else {
          throw new Error(testResult.error || 'API key không hợp lệ hoặc không thể kết nối đến Gemini API');
        }
      } else {
        throw new Error('Không thể khởi tạo Gemini API service');
      }
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Lỗi không xác định');
      onApiKeySet(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearApiKey = () => {
    geminiService.clearApiKey();
    setApiKey('');
    setStatus('idle');
    setErrorMessage('');
    onApiKeySet(false);
  };

  return (
    <motion.div
      className="glass-effect p-6 rounded-xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
          <Key className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">Cấu Hình Google Gemini API</h3>
          <p className="text-sm text-gray-300">Nhập API key để sử dụng AI trong game</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Google Gemini API Key
          </label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Nhập API key của bạn..."
              className="w-full px-4 py-3 pr-12 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors duration-200"
            >
              {showKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {status === 'error' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center space-x-2 p-3 bg-red-500/20 border border-red-500/30 rounded-lg"
          >
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span className="text-red-300 text-sm">{errorMessage}</span>
          </motion.div>
        )}

        {status === 'success' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center space-x-2 p-3 bg-green-500/20 border border-green-500/30 rounded-lg"
          >
            <Check className="w-5 h-5 text-green-400" />
            <span className="text-green-300 text-sm">API key đã được lưu thành công!</span>
          </motion.div>
        )}

        <div className="flex space-x-3">
          <button
            onClick={handleSaveApiKey}
            disabled={isLoading || !apiKey.trim()}
            className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Đang kiểm tra...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Lưu API Key</span>
              </>
            )}
          </button>
          
          <button
            onClick={handleClearApiKey}
            className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-colors duration-200 flex items-center space-x-2"
          >
            <X className="w-4 h-4" />
            <span>Xóa</span>
          </button>
        </div>

        <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <h4 className="text-sm font-semibold text-blue-300 mb-2">Cách lấy API Key:</h4>
          <ol className="text-xs text-gray-300 space-y-1 list-decimal list-inside">
            <li>Truy cập <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Google AI Studio</a></li>
            <li>Đăng nhập bằng tài khoản Google</li>
            <li>Click "Create API Key"</li>
            <li>Copy API key và paste vào ô trên</li>
          </ol>
        </div>
      </div>
    </motion.div>
  );
}
