import { useState, useEffect } from 'react';
import { 
  Trash2, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  User,
  Calendar,
  Play,
  ArrowLeft,
  Upload,
  Download,
} from 'lucide-react';
import { SaveSlot } from '../types/saveGame';
import { MotionWrapper } from '../components/MotionWrapper';
import { localSaveService } from '../services/saveStorage/localSaveService';
import { cloudSyncService } from '../services/saveStorage/cloudSyncService';
import { authService, AuthState } from '../services/saveStorage/authService';
import { npcRelationshipService } from '../services/npcRelationshipService';

interface SaveLoadPageProps {
  // No props needed since we handle navigation directly
}

export function SaveLoadPage({}: SaveLoadPageProps) {
  const [cloudSlots, setCloudSlots] = useState<SaveSlot[]>([]);
  const [localSlots, setLocalSlots] = useState<SaveSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<'slot1' | 'slot2' | 'slot3' | 'local1' | 'local2' | 'local3' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [authState, setAuthState] = useState<AuthState>(authService.getAuthState());
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictSlot, setConflictSlot] = useState<'slot1' | 'slot2' | 'slot3' | null>(null);

  useEffect(() => {
    const unsubscribe = authService.subscribe(setAuthState);
    return unsubscribe;
  }, []);

  useEffect(() => {
    loadSlots();
    checkConflicts();
  }, [authState.isAuthenticated, authState.isLoading]);

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

  // Removed handleSave - Save functionality moved to GamePage

  const handleLoad = async (slotId: 'slot1' | 'slot2' | 'slot3' | 'local1' | 'local2' | 'local3') => {
    try {
      setLoading(true);
      setError(null);
      
      const isCloudSlot = slotId.startsWith('slot');
      let result;
      
      if (isCloudSlot) {
        // Load từ cloud nếu là cloud slot
        if (authState.isAuthenticated) {
          result = await cloudSyncService.loadFromCloud(slotId as 'slot1' | 'slot2' | 'slot3');
          if (!result.success) {
            setError(result.error || 'Lỗi khi tải từ cloud');
            return;
          }
        } else {
          setError('Cần đăng nhập để tải cloud slot');
          return;
        }
      } else {
        // Load từ local nếu là local slot
        result = await localSaveService.loadGame(slotId);
      }
      
      if (result.success && result.saveGame) {
        // Clear existing NPC data before loading save
        npcRelationshipService.clearAllData();
        
        // Clear existing merchant shops before loading save
        const { merchantService } = await import('../services/merchantService');
        merchantService.clearAllMerchantShops();
        
        // Clear faction data when loading different game
        localStorage.removeItem('faction_quests');
        
        // Clear selected NPC for dialogue
        localStorage.removeItem('selectedNPCForDialogue');
        localStorage.removeItem('faction_reputations');
        localStorage.removeItem('action_suggestions');
        localStorage.removeItem('action_log');
        localStorage.removeItem('player_location'); // Clear player location when loading different game
        localStorage.removeItem('game_inventory'); // Clear inventory when loading different game
        localStorage.removeItem('game_equipment'); // Clear equipment when loading different game
        localStorage.removeItem('combat_history'); // Clear combat history when loading different game
        localStorage.removeItem('combat_result'); // Clear combat result when loading different game
        
        // Cập nhật localStorage với dữ liệu từ SaveGame
        const saveGame = result.saveGame;
        

        // Cập nhật các key localStorage cần thiết
        localStorage.setItem('world_gen_result', JSON.stringify(saveGame.world));
        localStorage.setItem('currentCharacter', JSON.stringify(saveGame.character));
        localStorage.setItem('rp_scenario', JSON.stringify(saveGame.scenario));
        localStorage.setItem('rp_chat', JSON.stringify(saveGame.chat));
        localStorage.setItem('game_turn_counter', saveGame.turnCounter.toString());
        // Lọc bỏ mainQuests khỏi sceneState trước khi lưu vào localStorage
        const cleanedSceneState = { ...saveGame.sceneState } as any;
        if (cleanedSceneState.mainQuests) {
          delete cleanedSceneState.mainQuests;
        }
        localStorage.setItem('rp_scene_state', JSON.stringify(cleanedSceneState));
        
        if (saveGame.summary) {
          localStorage.setItem('rp_summary_indexed', JSON.stringify(saveGame.summary));
        }
        
        // Khôi phục quest system nếu có
        if (saveGame.questSystem) {
          localStorage.setItem('quest_system', JSON.stringify(saveGame.questSystem));
        }

        // Khôi phục merchant shops nếu có
        if (saveGame.merchantShops) {
          // Import merchant shops data vào merchantService
          const { merchantService } = await import('../services/merchantService');
          merchantService.loadFromSaveGame({ shops: saveGame.merchantShops });
        }

        // Khôi phục action suggestions và action log nếu có
        if (saveGame.actionSuggestions) {
          localStorage.setItem('action_suggestions', JSON.stringify(saveGame.actionSuggestions));
        }
        
        if (saveGame.actionLog) {
          localStorage.setItem('action_log', JSON.stringify(saveGame.actionLog));
        }

        // Khôi phục player location nếu có
        if (saveGame.playerLocation) {
          localStorage.setItem('player_location', JSON.stringify(saveGame.playerLocation));
        }
        
        // Khôi phục NPC relationship data nếu có
        if (saveGame.npcRelationships) {
          npcRelationshipService.importFromSaveGame(saveGame.npcRelationships);
        }
        
        // Khôi phục action suggestions và action log nếu có
        if (saveGame.actionSuggestions) {
          localStorage.setItem('action_suggestions', JSON.stringify(saveGame.actionSuggestions));
        }
        
        if (saveGame.actionLog) {
          localStorage.setItem('action_log', JSON.stringify(saveGame.actionLog));
        }
        
        const source = isCloudSlot ? 'Cloud' : 'Local';
        setSuccess(`Đã tải từ ${source} (Slot ${slotId})`);
        
        // Chuyển đến GamePage
        setTimeout(() => {
          window.location.href = '/game';
        }, 1000);
      } else {
        setError(result.error || 'Lỗi khi tải game');
      }
    } catch (err) {
      setError('Lỗi khi tải game');
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

  const handleExport = async (slotId: 'slot1' | 'slot2' | 'slot3' | 'local1' | 'local2' | 'local3') => {
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

  const handleImport = async (slotId: 'slot1' | 'slot2' | 'slot3' | 'local1' | 'local2' | 'local3') => {
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


  const handleResolveConflict = async (slotId: 'slot1' | 'slot2' | 'slot3', choose: 'local' | 'cloud' | 'both') => {
    try {
      setLoading(true);
      setError(null);
      const result = await cloudSyncService.resolveConflict(slotId, choose);
      if (result.success) {
        setSuccess(`Đã giải quyết xung đột cho slot ${slotId}`);
        await loadSlots();
        await checkConflicts();
        setShowConflictModal(false);
        setConflictSlot(null);
      } else {
        setError(result.error || 'Lỗi khi giải quyết xung đột');
      }
    } catch (err) {
      setError('Lỗi khi giải quyết xung đột');
    } finally {
      setLoading(false);
    }
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

  return (
    <MotionWrapper
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-6xl mx-auto p-4"
    >
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => window.history.back()}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-700/50 border border-gray-600/50 text-gray-300 rounded-lg hover:bg-gray-600/50 transition-colors duration-200"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Quay lại</span>
        </button>
        <h1 className="text-3xl font-bold-vietnamese text-white">QUẢN LÝ SAVE GAME</h1>
        {authState.isLoading ? (
          <div className="flex items-center space-x-2 px-3 py-2 bg-yellow-500/20 border border-yellow-500/50 rounded-lg text-yellow-300">
            <div className="w-4 h-4 border-2 border-yellow-300 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium">Đang kiểm tra...</span>
          </div>
        ) : authState.isAuthenticated ? (
          <div className="flex items-center space-x-2 px-3 py-2 bg-green-500/20 border border-green-500/50 rounded-lg text-green-300">
            <User className="w-4 h-4" />
            <span className="text-sm font-medium">{authState.user?.email}</span>
          </div>
        ) : (
          <span className="text-sm text-gray-400">Chưa đăng nhập</span>
        )}
      </div>

      {/* Status Banner */}
      {!authState.isAuthenticated && (
        <MotionWrapper
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-yellow-500/20 border border-yellow-500/50 text-yellow-300 rounded-lg flex items-center space-x-3"
        >
          <AlertTriangle className="w-5 h-5" />
          <span className="font-medium">Chưa đăng nhập - Dữ liệu sẽ được lưu cục bộ</span>
        </MotionWrapper>
      )}

      {/* Conflict Banner */}
      {conflicts.some(c => c.hasConflict) && (
        <MotionWrapper
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-red-500/20 border border-red-500/50 text-red-300 rounded-lg flex items-center space-x-3"
        >
          <AlertTriangle className="w-5 h-5" />
          <span className="font-medium">Có xung đột dữ liệu giữa Local và Cloud!</span>
          <button
            onClick={() => {
              const conflictSlot = conflicts.find(c => c.hasConflict);
              if (conflictSlot) {
                setConflictSlot(conflictSlot.slotId);
                setShowConflictModal(true);
              }
            }}
            className="ml-auto px-3 py-1 bg-red-500/20 border border-red-500/50 rounded text-sm hover:bg-red-500/30 transition-colors"
          >
            Giải quyết
          </button>
        </MotionWrapper>
      )}

      {/* Error/Success Messages */}
      {error && (
        <MotionWrapper
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-red-500/20 border border-red-500/50 text-red-300 rounded-lg flex items-center space-x-3"
        >
          <XCircle className="w-5 h-5" />
          <span>{error}</span>
        </MotionWrapper>
      )}
      {success && (
        <MotionWrapper
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-green-500/20 border border-green-500/50 text-green-300 rounded-lg flex items-center space-x-3"
        >
          <CheckCircle className="w-5 h-5" />
          <span>{success}</span>
        </MotionWrapper>
      )}

      {/* Cloud Save Slots - Only show if authenticated */}
      {authState.isAuthenticated && !authState.isLoading && (
        <MotionWrapper
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">☁️</span>
            </div>
            <h3 className="text-lg font-bold text-white">Cloud Save</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {['slot1', 'slot2', 'slot3'].map((slotId) => {
              const slot = cloudSlots.find(s => s.slotId === slotId);
              const status = slot ? getSlotStatus(slot) : 'empty';
              const isSelected = selectedSlot === slotId;
              const conflict = getConflictForSlot(slotId);

          return (
            <div
              key={slotId}
              className={`p-6 border-2 rounded-xl transition-all duration-200 ${
                isSelected
                  ? 'border-blue-500/50 bg-blue-500/10'
                  : 'border-gray-600/50 bg-gray-800/20'
              } ${conflict?.hasConflict ? 'border-red-500/50 bg-red-500/10' : ''}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(status)}
                  <span className="text-xl font-bold text-white">
                    {slotId.toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-400 ml-2">
                    {getStatusText(status)}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedSlot(isSelected ? null : slotId as any)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                    isSelected
                      ? 'bg-gray-600/50 text-gray-300'
                      : 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30'
                  }`}
                >
                  {isSelected ? 'Bỏ chọn' : 'Chọn'}
                </button>
              </div>

              {slot?.saveGame && (
                <div className="mb-4 p-3 bg-gray-700/30 rounded-lg">
                  <div className="flex items-center space-x-2 text-gray-300 text-sm mb-2">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {new Date(slot.saveGame.meta.updatedAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 space-y-1">
                    <div>Turn: {slot.saveGame.turnCounter} | Chat: {slot.saveGame.chat.length} tin nhắn</div>
                    {slot.saveGame.world?.worldTitle && (
                      <div>Thế giới: {slot.saveGame.world.worldTitle}</div>
                    )}
                    {slot.saveGame.character?.name && (
                      <div>Nhân vật: {slot.saveGame.character.name}</div>
                    )}
                  </div>
                  {conflict?.hasConflict && (
                    <div className="mt-2 text-xs text-red-400 flex items-center space-x-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Xung đột dữ liệu</span>
                    </div>
                  )}
                </div>
              )}

              {/* Local Actions */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <button
                  onClick={() => handleLoad(slotId as any)}
                  disabled={loading || !slot?.saveGame}
                  className="flex flex-col items-center space-y-1 px-3 py-3 bg-green-500/20 border border-green-500/50 text-green-300 rounded-lg hover:bg-green-500/30 transition-colors duration-200 disabled:opacity-50"
                >
                  <Play className="w-5 h-5" />
                  <span className="text-xs">Tải</span>
                </button>
                <button
                  onClick={() => handleDelete(slotId as any)}
                  disabled={loading || !slot?.saveGame}
                  className="flex flex-col items-center space-y-1 px-3 py-3 bg-red-500/20 border border-red-500/50 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors duration-200 disabled:opacity-50"
                >
                  <Trash2 className="w-5 h-5" />
                  <span className="text-xs">Xóa</span>
                </button>
                <button
                  onClick={() => handleExport(slotId as any)}
                  disabled={loading || !slot?.saveGame}
                  className="flex flex-col items-center space-y-1 px-3 py-3 bg-purple-500/20 border border-purple-500/50 text-purple-300 rounded-lg hover:bg-purple-500/30 transition-colors duration-200 disabled:opacity-50"
                >
                  <Download className="w-5 h-5" />
                  <span className="text-xs">Export</span>
                </button>
              </div>

              {/* Import Button */}
              <button
                onClick={() => handleImport(slotId as any)}
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-orange-500/20 border border-orange-500/50 text-orange-300 rounded-lg hover:bg-orange-500/30 transition-colors duration-200 disabled:opacity-50 mb-4"
              >
                <Upload className="w-4 h-4" />
                <span className="text-sm">Import</span>
              </button>

            </div>
          );
        })}
          </div>
        </MotionWrapper>
      )}

      {/* Local Save Slots - Always show */}
      <MotionWrapper
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.7 }}
        className="mb-8"
      >
        <div className="flex items-center space-x-2 mb-4">
          <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">💾</span>
          </div>
          <h3 className="text-lg font-bold text-white">Local Save</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {['local1', 'local2', 'local3'].map((slotId) => {
            const slot = localSlots.find(s => s.slotId === slotId);
            const status = slot ? getSlotStatus(slot) : 'empty';
            const isSelected = selectedSlot === slotId;

            return (
              <div
                key={slotId}
                className={`p-6 border-2 rounded-xl transition-all duration-200 ${
                  isSelected
                    ? 'border-blue-500/50 bg-blue-500/10'
                    : 'border-gray-600/50 bg-gray-800/20'
                }`}
              >
                {/* Slot Header */}
                <div className="flex items-center justify-between mb-4">
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
                      <User className="w-4 h-4" />
                      <span>Turn: {slot.saveGame.turnCounter}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-300 text-sm">
                      <span>Chat: {slot.saveGame.chat.length} tin nhắn</span>
                    </div>
                    {slot.saveGame.world?.worldTitle && (
                      <div className="flex items-center space-x-2 text-gray-300 text-sm">
                        <span>Thế giới: {slot.saveGame.world.worldTitle}</span>
                      </div>
                    )}
                    {slot.saveGame.character?.name && (
                      <div className="flex items-center space-x-2 text-gray-300 text-sm">
                        <span>Nhân vật: {slot.saveGame.character.name}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Local Actions */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <button
                    onClick={() => handleLoad(slotId as any)}
                    disabled={loading || !slot?.saveGame}
                    className="flex flex-col items-center space-y-1 px-3 py-3 bg-green-500/20 border border-green-500/50 text-green-300 rounded-lg hover:bg-green-500/30 transition-colors duration-200 disabled:opacity-50"
                  >
                    <Play className="w-5 h-5" />
                    <span className="text-xs">Tải</span>
                  </button>
                  <button
                    onClick={() => handleDelete(slotId as any)}
                    disabled={loading || !slot?.saveGame}
                    className="flex flex-col items-center space-y-1 px-3 py-3 bg-red-500/20 border border-red-500/50 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors duration-200 disabled:opacity-50"
                  >
                    <Trash2 className="w-5 h-5" />
                    <span className="text-xs">Xóa</span>
                  </button>
                  <button
                    onClick={() => handleExport(slotId as any)}
                    disabled={loading || !slot?.saveGame}
                    className="flex flex-col items-center space-y-1 px-3 py-3 bg-purple-500/20 border border-purple-500/50 text-purple-300 rounded-lg hover:bg-purple-500/30 transition-colors duration-200 disabled:opacity-50"
                  >
                    <Download className="w-5 h-5" />
                    <span className="text-xs">Export</span>
                  </button>
                </div>

                {/* Import Button */}
                <button
                  onClick={() => handleImport(slotId as any)}
                  disabled={loading}
                  className="w-full flex items-center justify-center space-x-2 px-3 py-3 bg-orange-500/20 border border-orange-500/50 text-orange-300 rounded-lg hover:bg-orange-500/30 transition-colors duration-200 disabled:opacity-50"
                >
                  <Upload className="w-5 h-5" />
                  <span className="text-sm">Import</span>
                </button>
              </div>
            );
          })}
        </div>
      </MotionWrapper>

      {/* Conflict Resolution Modal */}
      {showConflictModal && conflictSlot && (
        <MotionWrapper
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-gray-900 flex items-center justify-center p-4 z-50"
          onClick={() => setShowConflictModal(false)}
        >
          <MotionWrapper
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="glass-effect rounded-2xl p-6 max-w-md w-full"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-white mb-4">Giải quyết xung đột</h3>
            <p className="text-gray-300 mb-6">
              Slot {conflictSlot} có xung đột dữ liệu giữa Local và Cloud. Bạn muốn giữ bản nào?
            </p>
            <div className="space-y-3">
              <div className="flex space-x-3">
                <button
                  onClick={() => handleResolveConflict(conflictSlot, 'local')}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-500/20 border border-blue-500/50 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-colors duration-200 disabled:opacity-50"
                >
                  Giữ Local
                </button>
                <button
                  onClick={() => handleResolveConflict(conflictSlot, 'cloud')}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-green-500/20 border border-green-500/50 text-green-300 rounded-lg hover:bg-green-500/30 transition-colors duration-200 disabled:opacity-50"
                >
                  Giữ Cloud
                </button>
              </div>
              <button
                onClick={() => handleResolveConflict(conflictSlot, 'both')}
                disabled={loading}
                className="w-full px-4 py-2 bg-purple-500/20 border border-purple-500/50 text-purple-300 rounded-lg hover:bg-purple-500/30 transition-colors duration-200 disabled:opacity-50"
              >
                Giữ cả hai (Local + Cloud)
              </button>
            </div>
          </MotionWrapper>
        </MotionWrapper>
      )}
    </MotionWrapper>
  );
}