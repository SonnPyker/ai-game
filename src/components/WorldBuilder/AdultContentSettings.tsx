import { Eye, EyeOff, Shield, AlertTriangle } from 'lucide-react';
import { ContentFlags } from '../../types';
import { MotionWrapper } from '../MotionWrapper';

interface AdultContentSettingsProps {
  contentFlags: ContentFlags;
  onContentFlagsChange: (flags: ContentFlags) => void;
  disabled?: boolean;
}

export function AdultContentSettings({ 
  contentFlags, 
  onContentFlagsChange, 
  disabled = false 
}: AdultContentSettingsProps) {
  // Xử lý thay đổi trạng thái 18+
  const handleAdultToggle = (enabled: boolean) => {
    const newFlags: ContentFlags = {
      ...contentFlags,
      adult_enabled: enabled,
      adult_intensity: enabled ? 'direct_safe' : 'fade'
    };
    onContentFlagsChange(newFlags);
  };

  // Xử lý thay đổi mức độ nội dung
  const handleIntensityChange = (intensity: ContentFlags['adult_intensity']) => {
    const newFlags: ContentFlags = {
      ...contentFlags,
      adult_intensity: intensity
    };
    onContentFlagsChange(newFlags);
  };

  return (
    <MotionWrapper
      className="glass-effect p-6 rounded-xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
    >
      <h3 className="text-xl font-bold-vietnamese text-white mb-4 uppercase">NỘI DUNG 18+</h3>
      
      <div className="space-y-4">
        {/* Toggle chính */}
        <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-600/50">
          <div className="flex items-center space-x-3">
            {contentFlags.adult_enabled ? (
              <Eye className="w-5 h-5 text-green-400" />
            ) : (
              <EyeOff className="w-5 h-5 text-gray-400" />
            )}
            <div>
              <h4 className="font-semibold text-white">Nội dung 18+</h4>
              <p className="text-sm text-gray-300">
                {contentFlags.adult_enabled 
                  ? 'Đã bật - Cho phép nội dung trưởng thành'
                  : 'Đã tắt - Chặn nội dung nhạy cảm'
                }
              </p>
            </div>
          </div>
          <button
            onClick={() => handleAdultToggle(!contentFlags.adult_enabled)}
            disabled={disabled}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              contentFlags.adult_enabled 
                ? 'bg-green-500' 
                : 'bg-gray-600'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                contentFlags.adult_enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Chọn mức độ nội dung khi bật */}
        {contentFlags.adult_enabled && (
          <div className="flex space-x-2">
            <button
              onClick={() => handleIntensityChange('direct_safe')}
              disabled={disabled}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                contentFlags.adult_intensity === 'direct_safe'
                  ? 'bg-primary-500/20 text-primary-300 border-2 border-primary-500/70'
                  : 'bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-700/50 border-2 border-gray-600/50'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <Shield className="w-4 h-4" />
              <span>An toàn</span>
            </button>
            
            <button
              onClick={() => handleIntensityChange('direct')}
              disabled={disabled}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                contentFlags.adult_intensity === 'direct'
                  ? 'bg-orange-500/20 text-orange-300 border-2 border-orange-500/70'
                  : 'bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-700/50 border-2 border-gray-600/50'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Tả thực</span>
            </button>
          </div>
        )}
      </div>
    </MotionWrapper>
  );
}
