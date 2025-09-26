import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Save, 
  Download, 
  Upload, 
  Trash2, 
  Cloud, 
  HardDrive, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  FileText,
  User,
  Calendar,
  LogIn,
  RefreshCw
} from 'lucide-react';
import { SaveSlot, SaveGame, SyncStatus, ConflictInfo } from '../../types/saveGame';
import { saveGameService } from '../../services/saveStorage/saveGameService';
import { syncService } from '../../services/saveStorage/syncService';
import { authService, AuthState } from '../../services/saveStorage/authService';
import { AuthModal } from '../Auth/AuthModal';

interface SaveManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadGame?: (saveGame: SaveGame) => void;
  currentGameData?: {
    worldData: any;
    characterData: any;
    scenarioData: any;
    summaryData: any;
    sceneStateData: any;
    chatData: any[];
    turnCounter: number;
    worldTime: any;
    uiState?: any;
  };
}

export function SaveManager({ isOpen, onClose, onLoadGame, currentGameData }: SaveManagerProps) {
  const [slots, setSlots] = useState<SaveSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<'slot1' | 'slot2' | 'slot3' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [authState, setAuthState] = useState<AuthState>(authService.getAuthState());
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const [showConflictModal, setShowConflictModal] = useState(false);

  // Load slots khi component mount
  useEffect(() => {
    if (isOpen) {
      loadSlots();
      checkSyncStatus();
    }
  }, [isOpen]);

  // Subscribe to auth changes
  useEffect(() => {
    const unsubscribe = authService.subscribe(setAuthState);
    return unsubscribe;
  }, []);

  const loadSlots = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const slotsData = await saveGameService.listSlots();
      setSlots(slotsData);
      
      console.log('✅ Đã tải danh sách slot:', slotsData);
    } catch (err) {
      console.error('❌ Lỗi tải slots:', err);
      setError('Không thể tải danh sách slot');
    } finally {
      setLoading(false);
    }
  };

  const checkSyncStatus = async () => {
    try {
      const status = await syncService.getSyncStatus();
      setSyncStatus(status);
      
      if (status.conflictResolution === 'manual') {
        // Check for conflicts
        const result = await syncService.syncAll();
        if (result.conflicts.length > 0) {
          setConflicts(result.conflicts);
          setShowConflictModal(true);
        }
      }
    } catch (error) {
      console.error('Lỗi kiểm tra sync status:', error);
    }
  };

  const handleSync = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await syncService.syncAll();
      
      if (result.success) {
        setSuccess(`Đã sync ${result.syncedSlots.length} slot`);
        await loadSlots();
        await checkSyncStatus();
      } else {
        setError(`Lỗi sync: ${result.errors.join(', ')}`);
      }
    } catch (err) {
      console.error('❌ Lỗi sync:', err);
      setError('Lỗi đồng bộ dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleResolveConflict = async (slotId: 'slot1' | 'slot2' | 'slot3' | 'local1' | 'local2' | 'local3', resolution: 'local' | 'cloud' | 'merge' | 'both') => {
    try {
      const success = await syncService.resolveConflict(slotId, resolution);
      if (success) {
        setSuccess(`Đã giải quyết xung đột cho ${slotId}`);
        await loadSlots();
        await checkSyncStatus();
        setShowConflictModal(false);
      } else {
        setError('Lỗi giải quyết xung đột');
      }
    } catch (err) {
      console.error('❌ Lỗi resolve conflict:', err);
      setError('Lỗi giải quyết xung đột');
    }
  };

  const handleSave = async (slotId: 'slot1' | 'slot2' | 'slot3') => {
    if (!currentGameData) {
      setError('Không có dữ liệu game để lưu');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await saveGameService.saveGame(
        slotId,
        currentGameData.worldData,
        currentGameData.characterData,
        currentGameData.scenarioData,
        currentGameData.summaryData,
        currentGameData.sceneStateData,
        currentGameData.chatData,
        currentGameData.turnCounter,
        currentGameData.worldTime,
        currentGameData.uiState
      );

      if (result.success) {
        setSuccess(`Đã lưu game vào ${slotId}`);
        await loadSlots(); // Refresh danh sách
      } else {
        setError(result.error || 'Lỗi lưu game');
      }
    } catch (err) {
      console.error('❌ Lỗi lưu game:', err);
      setError('Lỗi lưu game');
    } finally {
      setLoading(false);
    }
  };

  const handleLoad = async (slotId: 'slot1' | 'slot2' | 'slot3') => {
    try {
      setLoading(true);
      setError(null);

      const result = await saveGameService.loadGame(slotId);

      if (result.success && result.saveGame) {
        setSuccess(`Đã tải game từ ${slotId}`);
        onLoadGame?.(result.saveGame);
        onClose();
      } else {
        setError(result.error || 'Lỗi tải game');
      }
    } catch (err) {
      console.error('❌ Lỗi tải game:', err);
      setError('Lỗi tải game');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (slotId: 'slot1' | 'slot2' | 'slot3') => {
    if (!confirm(`Bạn có chắc muốn xóa slot ${slotId}?`)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const success = await saveGameService.deleteSlot(slotId);
      
      if (success) {
        setSuccess(`Đã xóa slot ${slotId}`);
        await loadSlots(); // Refresh danh sách
      } else {
        setError('Lỗi xóa slot');
      }
    } catch (err) {
      console.error('❌ Lỗi xóa slot:', err);
      setError('Lỗi xóa slot');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (slotId: 'slot1' | 'slot2' | 'slot3') => {
    try {
      setLoading(true);
      setError(null);

      const jsonString = await saveGameService.exportGame(slotId);
      
      if (jsonString) {
        // Tạo file download
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `game_save_${slotId}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        setSuccess(`Đã export game từ ${slotId}`);
      } else {
        setError('Không thể export game');
      }
    } catch (err) {
      console.error('❌ Lỗi export game:', err);
      setError('Lỗi export game');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!selectedSlot) {
      setError('Vui lòng chọn slot để import');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const text = await file.text();
      const success = await saveGameService.importGame(text, selectedSlot);
      
      if (success) {
        setSuccess(`Đã import game vào ${selectedSlot}`);
        await loadSlots(); // Refresh danh sách
      } else {
        setError('Lỗi import game');
      }
    } catch (err) {
      console.error('❌ Lỗi import game:', err);
      setError('Lỗi import game');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('vi-VN');
  };

  const getSlotIcon = (slot: SaveSlot) => {
    if (slot.isEmpty) return <FileText className="w-5 h-5 text-gray-400" />;
    if (slot.source === 'cloud') return <Cloud className="w-5 h-5 text-blue-400" />;
    return <HardDrive className="w-5 h-5 text-green-400" />;
  };

  const getSlotStatus = (slot: SaveSlot) => {
    if (slot.isEmpty) return 'Trống';
    if (slot.pendingSync) return 'Chờ đồng bộ';
    return slot.source === 'cloud' ? 'Cloud' : 'Local';
  };

  const getSlotStatusColor = (slot: SaveSlot) => {
    if (slot.isEmpty) return 'text-gray-400';
    if (slot.pendingSync) return 'text-yellow-400';
    return slot.source === 'cloud' ? 'text-blue-400' : 'text-green-400';
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
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
            <h2 className="text-2xl font-bold-vietnamese text-white uppercase">
              Quản Lý Lưu Game
            </h2>
            <div className="flex items-center space-x-2">
              {/* Auth Status */}
              {authState.isAuthenticated ? (
                <div className="flex items-center space-x-2 text-green-300">
                  <User className="w-4 h-4" />
                  <span className="text-sm">{authState.user?.name || authState.user?.email}</span>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="flex items-center space-x-2 px-3 py-2 bg-blue-500/20 border border-blue-500/50 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-colors duration-200"
                >
                  <LogIn className="w-4 h-4" />
                  <span className="text-sm">Đăng nhập</span>
                </button>
              )}
              
              {/* Sync Button */}
              <button
                onClick={handleSync}
                disabled={loading || !syncService.isOnlineStatus()}
                className="flex items-center space-x-2 px-3 py-2 bg-green-500/20 border border-green-500/50 text-green-300 rounded-lg hover:bg-green-500/30 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title={syncService.isOnlineStatus() ? 'Đồng bộ dữ liệu' : 'Offline - không thể sync'}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                <span className="text-sm">Sync</span>
              </button>
              
              <button
                onClick={onClose}
                className="p-2 bg-gray-600/20 border border-gray-500/30 text-gray-300 rounded-lg hover:bg-gray-600/30 transition-colors duration-200"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Sync Status Banner */}
          {syncStatus && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mb-4 p-3 rounded-lg border ${
                syncStatus.hasLocalChanges || syncStatus.hasCloudChanges
                  ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300'
                  : 'bg-green-500/20 border-green-500/50 text-green-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                {syncStatus.hasLocalChanges || syncStatus.hasCloudChanges ? (
                  <AlertTriangle className="w-4 h-4" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                <span className="text-sm">
                  {syncStatus.hasLocalChanges && syncStatus.hasCloudChanges
                    ? 'Có thay đổi cần đồng bộ'
                    : syncStatus.hasLocalChanges
                    ? 'Có dữ liệu local chưa sync'
                    : syncStatus.hasCloudChanges
                    ? 'Có dữ liệu cloud mới'
                    : 'Dữ liệu đã đồng bộ'}
                </span>
              </div>
            </motion.div>
          )}

          {/* Status Messages */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg"
            >
              <div className="flex items-center space-x-2 text-red-300">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm">{error}</span>
              </div>
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg"
            >
              <div className="flex items-center space-x-2 text-green-300">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">{success}</span>
              </div>
            </motion.div>
          )}

          {/* Slots Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {['slot1', 'slot2', 'slot3'].map((slotId) => {
              const slot = slots.find(s => s.slotId === slotId) || {
                slotId: slotId as 'slot1' | 'slot2' | 'slot3',
                isEmpty: true
              };

              return (
                <motion.div
                  key={slotId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                    selectedSlot === slotId
                      ? 'border-blue-500/50 bg-blue-500/10'
                      : 'border-gray-600/50 bg-gray-800/30'
                  }`}
                >
                  {/* Slot Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      {getSlotIcon(slot)}
                      <span className="font-medium text-white">
                        {slotId.toUpperCase()}
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedSlot(
                        selectedSlot === slotId ? null : slotId as 'slot1' | 'slot2' | 'slot3'
                      )}
                      className={`px-2 py-1 rounded text-xs transition-colors duration-200 ${
                        selectedSlot === slotId
                          ? 'bg-blue-500/20 text-blue-300'
                          : 'bg-gray-600/20 text-gray-300 hover:bg-gray-600/30'
                      }`}
                    >
                      {selectedSlot === slotId ? 'Đã chọn' : 'Chọn'}
                    </button>
                  </div>

                  {/* Slot Content */}
                  {slot.isEmpty ? (
                    <div className="text-center py-4">
                      <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-400 text-sm">Slot trống</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Character Info */}
                      {slot.saveGame?.character && (
                        <div className="flex items-center space-x-2 text-sm">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-300">
                            {slot.saveGame.character.name}
                          </span>
                        </div>
                      )}

                      {/* Turn Counter */}
                      <div className="flex items-center space-x-2 text-sm">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-300">
                          Lượt {slot.saveGame?.turnCounter || 0}
                        </span>
                      </div>

                      {/* Last Updated */}
                      {slot.lastUpdated && (
                        <div className="flex items-center space-x-2 text-sm">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-300">
                            {formatDate(slot.lastUpdated)}
                          </span>
                        </div>
                      )}

                      {/* Status */}
                      <div className="flex items-center space-x-2 text-sm">
                        <span className={`${getSlotStatusColor(slot)}`}>
                          {getSlotStatus(slot)}
                        </span>
                        {slot.pendingSync && (
                          <AlertTriangle className="w-4 h-4 text-yellow-400" />
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="mt-4 space-y-2">
                    {!slot.isEmpty && (
                      <button
                        onClick={() => handleLoad(slotId as 'slot1' | 'slot2' | 'slot3')}
                        disabled={loading}
                        className="w-full py-2 bg-blue-500/20 border border-blue-500/50 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                      >
                        {loading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                        <span>Tải</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleSave(slotId as 'slot1' | 'slot2' | 'slot3')}
                      disabled={loading || !currentGameData}
                      className="w-full py-2 bg-green-500/20 border border-green-500/50 text-green-300 rounded-lg hover:bg-green-500/30 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      <span>Lưu</span>
                    </button>

                    {!slot.isEmpty && (
                      <button
                        onClick={() => handleDelete(slotId as 'slot1' | 'slot2' | 'slot3')}
                        disabled={loading}
                        className="w-full py-2 bg-red-500/20 border border-red-500/50 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                      >
                        {loading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                        <span>Xóa</span>
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Import/Export Section */}
          {selectedSlot && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="border-t border-gray-600/50 pt-4"
            >
              <h3 className="text-lg font-medium text-white mb-4">
                Import/Export cho {selectedSlot.toUpperCase()}
              </h3>
              
              <div className="flex space-x-4">
                <button
                  onClick={() => handleExport(selectedSlot)}
                  disabled={loading || slots.find(s => s.slotId === selectedSlot)?.isEmpty}
                  className="flex-1 py-2 bg-purple-500/20 border border-purple-500/50 text-purple-300 rounded-lg hover:bg-purple-500/30 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <Upload className="w-4 h-4" />
                  <span>Export</span>
                </button>

                <label className="flex-1 py-2 bg-orange-500/20 border border-orange-500/50 text-orange-300 rounded-lg hover:bg-orange-500/30 transition-colors duration-200 cursor-pointer flex items-center justify-center space-x-2">
                  <Download className="w-4 h-4" />
                  <span>Import</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    className="hidden"
                  />
                </label>
              </div>
            </motion.div>
          )}

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-gray-600/50 text-center">
            <p className="text-gray-400 text-sm">
              Hệ thống tự động chọn Cloud (Supabase) hoặc Local (LocalStorage) dựa trên kết nối
            </p>
          </div>
        </motion.div>
      </motion.div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          setShowAuthModal(false);
          checkSyncStatus();
        }}
      />

      {/* Conflict Resolution Modal */}
      {showConflictModal && conflicts.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-60"
          onClick={() => setShowConflictModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="glass-effect rounded-2xl p-6 max-w-2xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Giải Quyết Xung Đột Dữ Liệu</h3>
              <button
                onClick={() => setShowConflictModal(false)}
                className="p-2 bg-gray-600/20 border border-gray-500/30 text-gray-300 rounded-lg hover:bg-gray-600/30 transition-colors duration-200"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {conflicts.map((conflict, index) => (
                <div key={index} className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <h4 className="text-yellow-300 font-medium mb-3">
                    Xung đột tại {conflict.slotId.toUpperCase()}
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <h5 className="text-blue-300 font-medium mb-2">Dữ liệu Local</h5>
                      <p className="text-sm text-gray-300">
                        Cập nhật: {conflict.localSave?.meta.updatedAt ? new Date(conflict.localSave.meta.updatedAt).toLocaleString('vi-VN') : 'N/A'}
                      </p>
                      <p className="text-sm text-gray-300">
                        Character: {conflict.localSave?.character.name || 'N/A'}
                      </p>
                    </div>
                    
                    <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <h5 className="text-green-300 font-medium mb-2">Dữ liệu Cloud</h5>
                      <p className="text-sm text-gray-300">
                        Cập nhật: {conflict.cloudSave?.meta.updatedAt ? new Date(conflict.cloudSave.meta.updatedAt).toLocaleString('vi-VN') : 'N/A'}
                      </p>
                      <p className="text-sm text-gray-300">
                        Character: {conflict.cloudSave?.character.name || 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleResolveConflict(conflict.slotId, 'local')}
                        className="flex-1 py-2 bg-blue-500/20 border border-blue-500/50 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-colors duration-200"
                      >
                        Giữ Local
                      </button>
                      <button
                        onClick={() => handleResolveConflict(conflict.slotId, 'cloud')}
                        className="flex-1 py-2 bg-green-500/20 border border-green-500/50 text-green-300 rounded-lg hover:bg-green-500/30 transition-colors duration-200"
                      >
                        Giữ Cloud
                      </button>
                    </div>
                    <button
                      onClick={() => handleResolveConflict(conflict.slotId, 'both')}
                      className="w-full py-2 bg-purple-500/20 border border-purple-500/50 text-purple-300 rounded-lg hover:bg-purple-500/30 transition-colors duration-200"
                    >
                      Giữ cả hai (Local + Cloud)
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
