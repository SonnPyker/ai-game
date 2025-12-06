import { useEffect, useState } from 'react';
import { MotionWrapper } from '../MotionWrapper';
import { sillyTavernConfigService } from '../../services/sillyTavernConfigService';
import { sillyTavernHealthCheck, SillyTavernHealthStatus } from '../../services/sillyTavernClient';
import { useResponsiveContext } from '../../contexts/ResponsiveContext';

function statusLabel(status: SillyTavernHealthStatus): { text: string; color: string } {
  switch (status.status) {
    case 'disabled':
      return { text: 'Đã tắt (toggle off)', color: 'text-gray-400' };
    case 'ok':
      return { text: 'Kết nối OK', color: 'text-green-400' };
    case 'unauthorized':
      return { text: `Cần đăng nhập/phiên hợp lệ: ${status.error}`, color: 'text-yellow-300' };
    case 'unreachable':
    default:
      return { text: `Không truy cập được: ${status.error}`, color: 'text-red-300' };
  }
}

export function SillyTavernSettings() {
  const { shouldUseMobileLayout } = useResponsiveContext();
  const [enabled, setEnabled] = useState(false);
  const [baseUrl, setBaseUrl] = useState('/stapi');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<SillyTavernHealthStatus>({ status: 'disabled', reason: 'toggle-off' });
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    const cfg = sillyTavernConfigService.getConfig();
    setEnabled(cfg.enabled);
    setBaseUrl(cfg.baseUrl);
    setStatus(cfg.enabled ? { status: 'unreachable', error: 'Chưa kiểm tra' } : { status: 'disabled', reason: 'toggle-off' });
  }, []);

  const handleSave = () => {
    setSaving(true);
    sillyTavernConfigService.setBaseUrl(baseUrl);
    sillyTavernConfigService.setEnabled(enabled);
    setLastSaved(new Date());
    setSaving(false);
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const result = await sillyTavernHealthCheck();
      setStatus(result);
    } catch (error: any) {
      setStatus({ status: 'unreachable', error: error?.message || 'Unknown error' });
    } finally {
      setTesting(false);
    }
  };

  const badge = statusLabel(status);

  return (
    <MotionWrapper
      className="glass-effect p-6 rounded-xl space-y-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
    >
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-xl font-semibold text-white">Kết nối SillyTavern (backend)</h3>
          <p className="text-sm text-gray-300">Dùng SillyTavern làm backend qua proxy `/stapi` (mặc định dev) để chia sẻ cookie/CSRF.</p>
        </div>
        <span className={`text-sm font-semibold ${badge.color}`}>{badge.text}</span>
      </div>

      <div className={`grid gap-4 ${shouldUseMobileLayout() ? 'grid-cols-1' : 'grid-cols-2'}`}>
        <div className="space-y-2">
          <label className="text-sm text-gray-300">ST Base URL (dev proxy mặc định: /stapi)</label>
          <input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white focus:border-yellow-500 outline-none"
            placeholder="/stapi"
          />
          <p className="text-xs text-gray-400">Bỏ slash cuối; ví dụ `/stapi` hoặc `http://localhost:8000` khi không dùng proxy.</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-gray-300">Bật/tắt SillyTavern backend</label>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setEnabled(!enabled)}
              className={`px-4 py-2 rounded-lg border transition ${
                enabled ? 'bg-yellow-600/20 border-yellow-500/50 text-yellow-300' : 'bg-white/5 border-white/10 text-gray-300'
              }`}
            >
              {enabled ? 'Đang bật' : 'Đang tắt'}
            </button>
            <span className="text-xs text-gray-400">Khi tắt, app dùng chế độ local/Gemini như hiện tại.</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-yellow-600/80 hover:bg-yellow-600 text-white disabled:opacity-60"
        >
          {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
        </button>
        <button
          onClick={handleTest}
          disabled={testing || (!enabled && !baseUrl)}
          className="px-4 py-2 rounded-lg border border-white/20 text-white hover:border-yellow-400 disabled:opacity-60"
        >
          {testing ? 'Đang kiểm tra...' : 'Test kết nối'}
        </button>
        {lastSaved && (
          <span className="text-xs text-gray-400">Đã lưu: {lastSaved.toLocaleTimeString()}</span>
        )}
      </div>
    </MotionWrapper>
  );
}
