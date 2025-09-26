import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Save, 
  X, 
  Clock, 
  User, 
  MessageSquare, 
  MapPin, 
  Calendar,
  HardDrive,
  Cloud,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Trash2,
  Download,
  Upload,
} from 'lucide-react';
import { SaveSlot } from '../../types/saveGame';
import { localSaveService } from '../../services/saveStorage/localSaveService';
import { cloudSyncService } from '../../services/saveStorage/cloudSyncService';
import { authService, AuthState } from '../../services/saveStorage/authService';

interface SavePopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveGame: (slotId: 'slot1' | 'slot2' | 'slot3') => Promise<void>;
}

export function SavePopup({ isOpen, onClose, onSaveGame }: SavePopupProps) {
  const [cloudSlots, setCloudSlots] = useState<SaveSlot[]>([]);
  const [localSlots, setLocalSlots] = useState<SaveSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [authState, setAuthState] = useState<AuthState>(authService.getAuthState());
  const [conflicts, setConflicts] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = authService.subscribe(setAuthState);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadSlots();
      checkConflicts();
    }
  }, [isOpen, authState.isAuthenticated, authState.isLoading]);

  const loadSlots = async () => {
    try {
      setLoading(true);
      
      // Load local slots
      const localResult = await localSaveService.listSlots();
      setLocalSlots(localResult);
      
      // Load cloud slots if authenticated
      if (authState.isAuthenticated) {
        const cloudResult = await cloudSyncService.getCloudSlots();
        setCloudSlots(cloudResult);
      } else {
        setCloudSlots([]);
      }
    } catch (err) {
      setError('Lỗi khi tải danh sách slot');
    } finally {
      setLoading(false);
    }
  };

  const checkConflicts = async () => {
    try {
      if (authState.isAuthenticated) {
        const conflictList = await cloudSyncService.checkConflicts();
        setConflicts(conflictList);
      }
    } catch (err) {
      console.error('Lỗi khi kiểm tra xung đột:', err);
    }
  };

  const handleSaveCloud = async (slotId: 'slot1' | 'slot2' | 'slot3') => {
    try {
      setLoading(true);
      setError(null);
      await onSaveGame(slotId);
      setSuccess(`✅ Đã lưu vào slot ${slotId} (Cloud)`);
      await loadSlots();
      await checkConflicts();
    } catch (err) {
      setError('Lỗi khi lưu game lên cloud');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLocal = async (slotId: 'local1' | 'local2' | 'local3') => {
    try {
      setLoading(true);
      setError(null);
      await onSaveGame(slotId as any);
      setSuccess(`✅ Đã lưu vào slot ${slotId} (Local)`);
      await loadSlots();
    } catch (err) {
      setError('Lỗi khi lưu game cục bộ');
    } finally {
      setLoading(false);
    }
  };


  const handleDelete = async (slotId: 'slot1' | 'slot2' | 'slot3' | 'local1' | 'local2' | 'local3') => {
    if (!confirm(`Bạn có chắc muốn xóa slot ${slotId}?`)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const isCloudSlot = slotId.startsWith('slot');
      let success = false;
      
      if (isCloudSlot) {
        // Xóa từ cloud nếu là cloud slot
        if (authState.isAuthenticated) {
          const result = await cloudSyncService.deleteFromCloud(slotId as 'slot1' | 'slot2' | 'slot3');
          success = result.success;
          if (!success) {
            setError(result.error || 'Lỗi khi xóa từ cloud');
            return;
          }
        } else {
          setError('Cần đăng nhập để xóa cloud slot');
          return;
        }
      } else {
        // Xóa từ local nếu là local slot
        success = await localSaveService.deleteSlot(slotId);
      }
      
      if (success) {
        const source = isCloudSlot ? 'Cloud' : 'Local';
        setSuccess(`Đã xóa slot ${slotId} (${source})`);
        await loadSlots();
      } else {
        setError('Lỗi khi xóa slot');
      }
    } catch (err) {
      setError('Lỗi khi xóa slot');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (slotId: 'slot1' | 'slot2' | 'slot3') => {
    try {
      setLoading(true);
      setError(null);
      const result = await localSaveService.exportSlot(slotId);
      if (result.success && result.data && result.filename) {
        // Create and download file
        const blob = new Blob([result.data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        setSuccess(`Đã export slot ${slotId}`);
      } else {
        setError(result.error || 'Lỗi khi export');
      }
    } catch (err) {
      setError('Lỗi khi export');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (slotId: 'slot1' | 'slot2' | 'slot3') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        setLoading(true);
        setError(null);
        const text = await file.text();
        const result = await localSaveService.importSlot(slotId, text);
        if (result.success) {
          setSuccess(`Đã import vào slot ${slotId}`);
          await loadSlots();
        } else {
          setError(result.error || 'Lỗi khi import');
        }
      } catch (err) {
        setError('Lỗi khi import');
      } finally {
        setLoading(false);
      }
    };
    input.click();
  };


  const getSlotStatus = (slot: SaveSlot) => {
    if (!slot.saveGame) return 'empty';
    return 'saved';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'empty':
        return <div className="w-3 h-3 bg-gray-500 rounded-full" />;
      case 'saved':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      default:
        return <div className="w-3 h-3 bg-gray-500 rounded-full" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'empty':
        return 'Trống';
      case 'saved':
        return 'Đã lưu';
      default:
        return 'Không xác định';
    }
  };

  const getConflictForSlot = (slotId: string) => {
    return conflicts.find(c => c.slotId === slotId);
  };

  // Removed formatFileSize function as it's not used

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="glass-effect rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Save className="w-6 h-6 text-blue-400" />
              <h2 className="text-2xl font-bold text-white">QUẢN LÝ SAVE GAME</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Status Banner */}
          {!authState.isAuthenticated && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500/50 text-yellow-300 rounded-lg flex items-center space-x-2"
            >
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">Chưa đăng nhập - Dữ liệu sẽ được lưu cục bộ</span>
            </motion.div>
          )}

          {/* Error/Success Messages */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-red-500/20 border border-red-500/50 text-red-300 rounded-lg flex items-center space-x-2"
            >
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </motion.div>
          )}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-green-500/20 border border-green-500/50 text-green-300 rounded-lg flex items-center space-x-2"
            >
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">{success}</span>
            </motion.div>
          )}

          {/* Cloud Save Slots - Only show if authenticated */}
          {authState.isAuthenticated && !authState.isLoading && (
            <div className="mb-8">
              <div className="flex items-center space-x-2 mb-4">
                <Cloud className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-bold text-white">Cloud Save</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['slot1', 'slot2', 'slot3'].map((slotId) => {
                  const slot = cloudSlots.find(s => s.slotId === slotId);
                  const status = slot ? getSlotStatus(slot) : 'empty';
                  const conflict = getConflictForSlot(slotId);

              return (
                <div
                  key={slotId}
                  className={`p-4 border-2 rounded-xl transition-all duration-200 ${
                    'border-gray-600/50 bg-gray-800/20'
                  } ${conflict?.hasConflict ? 'border-red-500/50 bg-red-500/10' : ''}`}
                >
                  {/* Slot Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(status)}
                      <span className="text-lg font-bold text-white">
                        {slotId.toUpperCase()}
                      </span>
                      <span className="text-sm text-gray-400">
                        {getStatusText(status)}
                      </span>
                    </div>
                    {conflict?.hasConflict && (
                      <div className="w-2 h-2 bg-red-500 rounded-full" title="Có xung đột dữ liệu" />
                    )}
                  </div>

                  {/* Slot Info */}
                  {slot?.saveGame && (
                    <div className="mb-4 p-3 bg-gray-700/30 rounded-lg space-y-2">
                      <div className="flex items-center space-x-2 text-gray-300 text-sm">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {new Date(slot.saveGame.meta.updatedAt).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-300 text-sm">
                        <Clock className="w-4 h-4" />
                        <span>
                          {new Date(slot.saveGame.meta.updatedAt).toLocaleTimeString('vi-VN')}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-300 text-sm">
                        <MessageSquare className="w-4 h-4" />
                        <span>Turn: {slot.saveGame.turnCounter}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-300 text-sm">
                        <User className="w-4 h-4" />
                        <span>Chat: {slot.saveGame.chat.length} tin nhắn</span>
                      </div>
                      {slot.saveGame.world?.worldTitle && (
                        <div className="flex items-center space-x-2 text-gray-300 text-sm">
                          <MapPin className="w-4 h-4" />
                          <span className="truncate">Thế giới: {slot.saveGame.world.worldTitle}</span>
                        </div>
                      )}
                      {slot.saveGame.character?.name && (
                        <div className="flex items-center space-x-2 text-gray-300 text-sm">
                          <User className="w-4 h-4" />
                          <span className="truncate">Nhân vật: {slot.saveGame.character.name}</span>
                        </div>
                      )}
                    </div>
                  )}


                  {/* Action Buttons */}
                  <div className="space-y-2">
                    {/* Save Button */}
                      <button
                        onClick={() => handleSaveCloud(slotId as any)}
                        disabled={loading}
                        className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-blue-500/20 border border-blue-500/50 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-colors duration-200 disabled:opacity-50"
                      >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      <span className="text-sm">Lưu Game</span>
                    </button>


                    {/* Other Actions */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleDelete(slotId as any)}
                        disabled={loading || !slot?.saveGame}
                        className="flex items-center justify-center space-x-1 px-2 py-1 bg-red-500/20 border border-red-500/50 text-red-300 rounded text-xs hover:bg-red-500/30 transition-colors duration-200 disabled:opacity-50"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Xóa</span>
                      </button>
                      <button
                        onClick={() => handleExport(slotId as any)}
                        disabled={loading || !slot?.saveGame}
                        className="flex items-center justify-center space-x-1 px-2 py-1 bg-purple-500/20 border border-purple-500/50 text-purple-300 rounded text-xs hover:bg-purple-500/30 transition-colors duration-200 disabled:opacity-50"
                      >
                        <Download className="w-3 h-3" />
                        <span>Export</span>
                      </button>
                    </div>

                    {/* Import Button */}
                    <button
                      onClick={() => handleImport(slotId as any)}
                      disabled={loading}
                      className="w-full flex items-center justify-center space-x-2 px-2 py-1 bg-orange-500/20 border border-orange-500/50 text-orange-300 rounded text-xs hover:bg-orange-500/30 transition-colors duration-200 disabled:opacity-50"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Import</span>
                    </button>

                  </div>
                </div>
              );
            })}
              </div>
            </div>
          )}

          {/* Local Save Slots - Always show */}
          <div className="mb-8">
            <div className="flex items-center space-x-2 mb-4">
              <HardDrive className="w-5 h-5 text-green-400" />
              <h3 className="text-lg font-bold text-white">Local Save</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['local1', 'local2', 'local3'].map((slotId) => {
                const slot = localSlots.find(s => s.slotId === slotId);
                const status = slot ? getSlotStatus(slot) : 'empty';

                return (
                  <div
                    key={slotId}
                    className={`p-4 border-2 rounded-xl transition-all duration-200 ${
                      'border-gray-600/50 bg-gray-800/20'
                    }`}
                  >
                    {/* Slot Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(status)}
                        <span className="text-lg font-bold text-white">
                          {slotId.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-400 ml-2">
                          {status === 'saved' ? 'Đã lưu' : 'Trống'}
                        </span>
                      </div>
                    </div>

                    {/* Slot Details */}
                    {slot?.saveGame && (
                      <div className="mb-4 space-y-2">
                        <div className="flex items-center space-x-2 text-gray-300 text-sm">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {new Date(slot.saveGame.meta.updatedAt).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-gray-300 text-sm">
                          <Clock className="w-4 h-4" />
                          <span>
                            {new Date(slot.saveGame.meta.updatedAt).toLocaleTimeString('vi-VN')}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-gray-300 text-sm">
                          <MessageSquare className="w-4 h-4" />
                          <span>Turn: {slot.saveGame.turnCounter}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-gray-300 text-sm">
                          <User className="w-4 h-4" />
                          <span>Chat: {slot.saveGame.chat.length} tin nhắn</span>
                        </div>
                        {slot.saveGame.world?.worldTitle && (
                          <div className="flex items-center space-x-2 text-gray-300 text-sm">
                            <MapPin className="w-4 h-4" />
                            <span className="truncate">Thế giới: {slot.saveGame.world.worldTitle}</span>
                          </div>
                        )}
                        {slot.saveGame.character?.name && (
                          <div className="flex items-center space-x-2 text-gray-300 text-sm">
                            <User className="w-4 h-4" />
                            <span className="truncate">Nhân vật: {slot.saveGame.character.name}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="space-y-2">
                      {/* Save Button */}
                      <button
                        onClick={() => handleSaveLocal(slotId as any)}
                        disabled={loading}
                        className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-blue-500/20 border border-blue-500/50 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-colors duration-200 disabled:opacity-50"
                      >
                        {loading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        <span className="text-sm">Lưu Game</span>
                      </button>


                      {/* Other Actions */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleDelete(slotId as any)}
                          disabled={loading || !slot?.saveGame}
                          className="flex items-center justify-center space-x-1 px-2 py-1 bg-red-500/20 border border-red-500/50 text-red-300 rounded text-xs hover:bg-red-500/30 transition-colors duration-200 disabled:opacity-50"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Xóa</span>
                        </button>
                        <button
                          onClick={() => handleExport(slotId as any)}
                          disabled={loading || !slot?.saveGame}
                          className="flex items-center justify-center space-x-1 px-2 py-1 bg-purple-500/20 border border-purple-500/50 text-purple-300 rounded text-xs hover:bg-purple-500/30 transition-colors duration-200 disabled:opacity-50"
                        >
                          <Download className="w-3 h-3" />
                          <span>Export</span>
                        </button>
                      </div>

                      {/* Import Button */}
                      <button
                        onClick={() => handleImport(slotId as any)}
                        disabled={loading}
                        className="w-full flex items-center justify-center space-x-1 px-2 py-1 bg-orange-500/20 border border-orange-500/50 text-orange-300 rounded text-xs hover:bg-orange-500/30 transition-colors duration-200 disabled:opacity-50"
                      >
                        <Upload className="w-3 h-3" />
                        <span>Import</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-700/50">
            <div className="text-sm text-gray-400">
              {authState.isAuthenticated ? (
                <div className="flex items-center space-x-2">
                  <Cloud className="w-4 h-4 text-green-400" />
                  <span>Đã đăng nhập - Có thể đồng bộ cloud</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <HardDrive className="w-4 h-4 text-yellow-400" />
                  <span>Chưa đăng nhập - Chỉ lưu cục bộ</span>
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600/20 border border-gray-500/50 text-gray-300 rounded-lg hover:bg-gray-600/30 transition-colors duration-200"
            >
              Đóng
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
