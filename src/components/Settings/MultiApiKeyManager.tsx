import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { 
  Key, 
  Plus, 
  Trash2, 
  Edit, 
  Check, 
  X, 
  AlertTriangle,
  Activity,
  TrendingUp,
  Shield,
  RefreshCw
} from 'lucide-react';
import { geminiService } from '../../services/geminiService';
import { MotionWrapper } from '../MotionWrapper';
import { ApiKeyInfo, ApiKeyStats } from '../../services/multiApiKeyService';

interface MultiApiKeyManagerProps {
  onApiKeySet: (hasKeys: boolean) => void;
}

export function MultiApiKeyManager({ onApiKeySet }: MultiApiKeyManagerProps) {
  const [apiKeys, setApiKeys] = useState<ApiKeyInfo[]>([]);
  const [stats, setStats] = useState<ApiKeyStats | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newApiKey, setNewApiKey] = useState('');
  const [newApiKeyName, setNewApiKeyName] = useState('');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [testingKeys, setTestingKeys] = useState<{ [keyId: string]: boolean }>({});
  const [testResults, setTestResults] = useState<{ [keyId: string]: { success: boolean; error?: string; details?: any } }>({});

  useEffect(() => {
    loadApiKeys();
    loadStats();
  }, []);

  const loadApiKeys = () => {
    const keys = geminiService.getApiKeys();
    setApiKeys(keys);
    onApiKeySet(keys.length > 0);
  };

  const loadStats = () => {
    const currentStats = geminiService.getApiKeyStats();
    setStats(currentStats);
  };

  const handleAddApiKey = async () => {
    if (!newApiKey.trim()) {
      setErrorMessage('Vui lòng nhập API key');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      const keyId = geminiService.addApiKey(newApiKey.trim(), newApiKeyName.trim());
      
      // Test key ngay sau khi thêm
      const isValid = await geminiService.testApiKey(keyId);
      if (!isValid) {
        geminiService.removeApiKey(keyId);
        throw new Error('API key không hợp lệ hoặc không thể kết nối đến Gemini API');
      }

      setStatus('success');
      setSuccessMessage('API key đã được thêm và test thành công!');
      setNewApiKey('');
      setNewApiKeyName('');
      setShowAddForm(false);
      
      loadApiKeys();
      loadStats();
      
      setTimeout(() => {
        setStatus('idle');
        setSuccessMessage('');
      }, 3000);
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Lỗi không xác định');
    }
  };

  const handleRemoveApiKey = (keyId: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa API key này?')) {
      geminiService.removeApiKey(keyId);
      loadApiKeys();
      loadStats();
      setSuccessMessage('API key đã được xóa');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const handleEditKey = (keyId: string, currentName: string) => {
    setEditingKey(keyId);
    setEditName(currentName);
  };

  const handleSaveEdit = () => {
    if (editingKey && editName.trim()) {
      geminiService.updateApiKey(editingKey, { name: editName.trim() });
      loadApiKeys();
      setEditingKey(null);
      setEditName('');
      setSuccessMessage('Tên API key đã được cập nhật');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const handleCancelEdit = () => {
    setEditingKey(null);
    setEditName('');
  };

  const handleTestKey = async (keyId: string) => {
    setTestingKeys(prev => ({ ...prev, [keyId]: true }));
    
    try {
      const result = await geminiService.testApiKey(keyId);
      setTestResults(prev => ({ ...prev, [keyId]: result }));
      
      if (result.success) {
        setSuccessMessage(`✅ API key hoạt động tốt! (${result.details?.duration || 'N/A'})`);
      } else {
        setErrorMessage(`❌ API key không hoạt động: ${result.error || 'Unknown error'}`);
        console.error('❌ Individual key test failed:', result);
      }
    } catch (error) {
      const errorResult = { success: false, error: 'Lỗi khi test API key', details: { error: error } };
      setTestResults(prev => ({ ...prev, [keyId]: errorResult }));
      setErrorMessage('Lỗi khi test API key');
    } finally {
      setTestingKeys(prev => ({ ...prev, [keyId]: false }));
      setTimeout(() => {
        setSuccessMessage('');
        setErrorMessage('');
      }, 3000);
    }
  };

  const handleTestAllKeys = async () => {
    setTestingKeys({});
    setTestResults({});
    
    const results = await geminiService.testAllApiKeys();
    setTestResults(results);
    
    const workingKeys = Object.values(results).filter(r => r.success).length;
    const totalKeys = Object.keys(results).length;
    
    
    if (workingKeys === totalKeys) {
      setSuccessMessage(`✅ Tất cả ${totalKeys} API keys đều hoạt động tốt!`);
    } else {
      const failedKeys = Object.entries(results)
        .filter(([_, result]) => !result.success)
        .map(([keyId, result]) => `${keyId}: ${result.error}`)
        .join(', ');
      
      setErrorMessage(`⚠️ ${workingKeys}/${totalKeys} API keys hoạt động. Lỗi: ${failedKeys}`);
    }
    
    setTimeout(() => {
      setSuccessMessage('');
      setErrorMessage('');
    }, 8000);
  };

  const handleResetErrors = () => {
    geminiService.resetKeyErrors();
    loadApiKeys();
    loadStats();
    setSuccessMessage('Đã reset tất cả lỗi API keys');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleAutoSwitch = async () => {
    setStatus('loading');
    setErrorMessage('');
    setSuccessMessage('');
    
    try {
      const success = await geminiService.autoSwitchOnError();
      
      if (success) {
        const currentKey = geminiService.getCurrentKeyInfo();
        setSuccessMessage(`✅ Đã tự động chuyển sang key: ${currentKey?.name || 'Unknown'}`);
        loadApiKeys();
        loadStats();
      } else {
        setErrorMessage('❌ Không tìm thấy key nào đang hoạt động');
      }
    } catch (error) {
      console.error('Auto-switch failed:', error);
      setErrorMessage('Lỗi khi thực hiện auto-switch');
    } finally {
      setStatus('idle');
      setTimeout(() => {
        setSuccessMessage('');
        setErrorMessage('');
      }, 5000);
    }
  };

  const handleForceSwitch = async () => {
    setStatus('loading');
    setErrorMessage('');
    setSuccessMessage('');
    
    try {
      const success = await geminiService.forceSwitchToNextKey();
      
      if (success) {
        const currentKey = geminiService.getCurrentKeyInfo();
        setSuccessMessage(`✅ Đã chuyển sang key: ${currentKey?.name || 'Unknown'}`);
        loadApiKeys();
        loadStats();
      } else {
        setErrorMessage('❌ Không có key nào khác để chuyển');
      }
    } catch (error) {
      console.error('Force switch failed:', error);
      setErrorMessage('Lỗi khi chuyển key');
    } finally {
      setStatus('idle');
      setTimeout(() => {
        setSuccessMessage('');
        setErrorMessage('');
      }, 5000);
    }
  };


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getKeyStatusColor = (key: ApiKeyInfo) => {
    if (!key.isActive) return 'text-red-400';
    if (key.errorCount > 0) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getKeyStatusText = (key: ApiKeyInfo) => {
    if (!key.isActive) return 'Bị vô hiệu hóa';
    if (key.errorCount > 0) return `${key.errorCount} lỗi`;
    return 'Hoạt động tốt';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white flex items-center space-x-2">
            <Key className="w-6 h-6 text-primary-400" />
            <span>Quản Lý API Keys</span>
          </h2>
          <p className="text-gray-400 mt-1">
            Thêm nhiều API keys để tự động xoay vòng khi key bị giới hạn
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm API Key</span>
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-effect p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Key className="w-5 h-5 text-primary-400" />
              <span className="text-sm text-gray-400">Tổng Keys</span>
            </div>
            <div className="text-2xl font-bold text-white">{stats.totalKeys}</div>
          </div>
          
          <div className="glass-effect p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Shield className="w-5 h-5 text-green-400" />
              <span className="text-sm text-gray-400">Active</span>
            </div>
            <div className="text-2xl font-bold text-white">{stats.activeKeys}</div>
          </div>
          
          <div className="glass-effect p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              <span className="text-sm text-gray-400">Tổng Usage</span>
            </div>
            <div className="text-2xl font-bold text-white">{stats.totalUsage}</div>
          </div>
          
          <div className="glass-effect p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <span className="text-sm text-gray-400">Tổng Lỗi</span>
            </div>
            <div className="text-2xl font-bold text-white">{stats.totalErrors}</div>
          </div>
        </div>
      )}

      {/* Current Key Info */}
      {geminiService.getCurrentKeyInfo() && (
        <div className="glass-effect p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
              <Activity className="w-5 h-5 text-primary-400" />
              <span>Key Hiện Tại</span>
            </h3>
            <div className="flex items-center space-x-2 flex-wrap gap-2">
              <button
                onClick={handleTestAllKeys}
                className="px-3 py-1 bg-blue-500/20 border border-blue-500/50 rounded text-blue-300 hover:bg-blue-500/30 transition-colors text-sm"
              >
                Test Tất Cả
              </button>
              <button
                onClick={handleAutoSwitch}
                disabled={status === 'loading'}
                className="px-3 py-1 bg-green-500/20 border border-green-500/50 rounded text-green-300 hover:bg-green-500/30 transition-colors text-sm disabled:opacity-50"
              >
                {status === 'loading' ? 'Đang chuyển...' : 'Tự Động Chuyển'}
              </button>
              <button
                onClick={handleForceSwitch}
                disabled={status === 'loading'}
                className="px-3 py-1 bg-purple-500/20 border border-purple-500/50 rounded text-purple-300 hover:bg-purple-500/30 transition-colors text-sm disabled:opacity-50"
              >
                {status === 'loading' ? 'Đang chuyển...' : 'Chuyển Tiếp'}
              </button>
              <button
                onClick={handleResetErrors}
                className="px-3 py-1 bg-yellow-500/20 border border-yellow-500/50 rounded text-yellow-300 hover:bg-yellow-500/30 transition-colors text-sm"
              >
                Reset Lỗi
              </button>
            </div>
          </div>
          <div className="text-sm text-gray-300">
            <div className="flex justify-between">
              <span>Key đang dùng:</span>
              <span className="text-white font-medium">{geminiService.getCurrentKeyInfo()?.name}</span>
            </div>
            <div className="flex justify-between">
              <span>Lần xoay tiếp theo:</span>
              <span className="text-white font-medium">{geminiService.getNextRotationIn()} lần sử dụng</span>
            </div>
          </div>
        </div>
      )}

      {/* Add Form */}
      <AnimatePresence>
        {showAddForm && (
          <MotionWrapper
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-effect p-4 rounded-lg"
          >
            <h3 className="text-lg font-semibold text-white mb-4">Thêm API Key Mới</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-2">Tên API Key (tùy chọn)</label>
                <input
                  type="text"
                  value={newApiKeyName}
                  onChange={(e) => setNewApiKeyName(e.target.value)}
                  placeholder="Ví dụ: Key chính, Key backup..."
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:border-primary-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-2">Google Gemini API Key</label>
                <input
                  type="password"
                  value={newApiKey}
                  onChange={(e) => setNewApiKey(e.target.value)}
                  placeholder="Nhập API key của bạn..."
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:border-primary-400 focus:outline-none"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleAddApiKey}
                  disabled={status === 'loading'}
                  className="btn-primary flex items-center space-x-2"
                >
                  {status === 'loading' ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>Thêm & Test</span>
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="btn-outline flex items-center space-x-2"
                >
                  <X className="w-4 h-4" />
                  <span>Hủy</span>
                </button>
              </div>
            </div>
          </MotionWrapper>
        )}
      </AnimatePresence>

      {/* API Keys List */}
      <div className="space-y-3">
        {apiKeys.length === 0 ? (
          <div className="text-center py-8">
            <Key className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">Chưa có API key nào</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="btn-primary"
            >
              Thêm API Key Đầu Tiên
            </button>
          </div>
        ) : (
          apiKeys.map((key) => (
            <MotionWrapper
              key={key.id}
              className="glass-effect p-4 rounded-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    {editingKey === key.id ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm"
                        autoFocus
                      />
                    ) : (
                      <h4 className="text-lg font-semibold text-white">{key.name}</h4>
                    )}
                    <span className={`text-sm ${getKeyStatusColor(key)}`}>
                      {getKeyStatusText(key)}
                    </span>
                    {key.id === geminiService.getCurrentKeyInfo()?.id && (
                      <span className="px-2 py-1 bg-primary-500/20 border border-primary-500/50 rounded text-primary-300 text-xs">
                        Đang dùng
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-400">
                    <div>
                      <span className="block">Usage:</span>
                      <span className="text-white font-medium">{key.usageCount}</span>
                    </div>
                    <div>
                      <span className="block">Lỗi:</span>
                      <span className="text-white font-medium">{key.errorCount}</span>
                    </div>
                    <div>
                      <span className="block">Lần cuối:</span>
                      <span className="text-white font-medium">{formatDate(key.lastUsed)}</span>
                    </div>
                    <div>
                      <span className="block">Tạo:</span>
                      <span className="text-white font-medium">{formatDate(key.createdAt)}</span>
                    </div>
                  </div>
                  
                  {key.lastError && (
                    <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-red-300 text-sm">
                      <strong>Lỗi cuối:</strong> {key.lastError}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  {editingKey === key.id ? (
                    <>
                      <button
                        onClick={handleSaveEdit}
                        className="p-2 text-green-400 hover:bg-green-500/20 rounded-lg transition-colors"
                        title="Lưu"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                        title="Hủy"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleTestKey(key.id)}
                        disabled={testingKeys[key.id]}
                        className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                        title="Test key"
                      >
                        {testingKeys[key.id] ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Activity className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleEditKey(key.id, key.name)}
                        className="p-2 text-yellow-400 hover:bg-yellow-500/20 rounded-lg transition-colors"
                        title="Sửa tên"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRemoveApiKey(key.id)}
                        className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                        title="Xóa key"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              {/* Test Result */}
              {testResults[key.id] !== undefined && (
                <div className={`mt-3 p-3 rounded-lg text-sm ${
                  testResults[key.id].success 
                    ? 'bg-green-500/10 border border-green-500/20 text-green-300'
                    : 'bg-red-500/10 border border-red-500/20 text-red-300'
                }`}>
                  <div className="font-medium">
                    {testResults[key.id].success ? '✅ API key hoạt động tốt' : '❌ API key không hoạt động'}
                  </div>
                  {testResults[key.id].details && (
                    <div className="mt-1 text-xs opacity-75">
                      {testResults[key.id].details.duration && (
                        <div>⏱️ Thời gian: {testResults[key.id].details.duration}</div>
                      )}
                      {testResults[key.id].details.responseLength && (
                        <div>📝 Độ dài phản hồi: {testResults[key.id].details.responseLength} ký tự</div>
                      )}
                      {testResults[key.id].details.responsePreview && (
                        <div>💬 Xem trước: {testResults[key.id].details.responsePreview.substring(0, 50)}...</div>
                      )}
                    </div>
                  )}
                  {testResults[key.id].error && (
                    <div className="mt-1 text-xs opacity-75">
                      🔍 Chi tiết lỗi: {testResults[key.id].error}
                    </div>
                  )}
                </div>
              )}
            </MotionWrapper>
          ))
        )}
      </div>

      {/* Messages */}
      {successMessage && (
        <MotionWrapper
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-300"
        >
          {successMessage}
        </MotionWrapper>
      )}
      
      {errorMessage && (
        <MotionWrapper
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300"
        >
          {errorMessage}
        </MotionWrapper>
      )}
    </div>
  );
}
