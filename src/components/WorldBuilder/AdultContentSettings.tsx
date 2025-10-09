import { useState } from 'react';
import { MotionWrapper } from '../MotionWrapper';
import { Shield, AlertTriangle, Eye, EyeOff, Info } from 'lucide-react';
import { ContentFlags } from '../../types';

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
  const [showAgeGate, setShowAgeGate] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Xử lý thay đổi trạng thái 18+
  const handleAdultToggle = (enabled: boolean) => {
    if (enabled && !contentFlags.adult_enabled) {
      // Lần đầu bật - hiển thị age gate
      setShowAgeGate(true);
      return;
    }

    // Cập nhật trạng thái
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

  // Xác nhận age gate
  const handleAgeGateConfirm = () => {
    setShowAgeGate(false);
    const newFlags: ContentFlags = {
      ...contentFlags,
      adult_enabled: true,
      adult_intensity: 'direct_safe',
      first_time_setup: false
    };
    onContentFlagsChange(newFlags);
  };

  // Hủy age gate
  const handleAgeGateCancel = () => {
    setShowAgeGate(false);
  };

  return (
    <>
      <MotionWrapper
        className="glass-effect p-6 rounded-xl border border-red-500/20"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Nội Dung Trưởng Thành (18+)</h3>
            <p className="text-sm text-gray-300">Kiểm soát nội dung nhạy cảm trong game</p>
          </div>
        </div>

        {/* Cảnh báo quan trọng */}
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-red-300">
              <p className="font-semibold mb-2">⚠️ Cảnh báo quan trọng:</p>
              <ul className="space-y-1 text-xs">
                <li>• Chỉ dành cho người từ 18 tuổi trở lên</li>
                <li>• Nội dung có thể bao gồm tình dục, bạo lực, ngôn ngữ mạnh</li>
                <li>• Tôn trọng ranh giới và không vi phạm chính sách</li>
                <li>• Có thể tắt bất kỳ lúc nào trong game</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Toggle chính */}
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
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

          {/* Mức độ nội dung khi bật */}
          {contentFlags.adult_enabled && (
            <MotionWrapper
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3"
            >
              <h4 className="font-semibold text-white flex items-center space-x-2">
                <Info className="w-4 h-4" />
                <span>Mức độ nội dung:</span>
              </h4>
              
              <div className="grid grid-cols-1 gap-3">
                {/* Mức an toàn */}
                <label className="flex items-start space-x-3 p-3 bg-white/5 rounded-lg border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
                  <input
                    type="radio"
                    name="adult_intensity"
                    value="direct_safe"
                    checked={contentFlags.adult_intensity === 'direct_safe'}
                    onChange={() => handleIntensityChange('direct_safe')}
                    disabled={disabled}
                    className="mt-1 text-green-500 focus:ring-green-500"
                  />
                  <div>
                    <div className="font-medium text-white">🛡️ An toàn</div>
                    <p className="text-xs text-gray-300">
                      Mô tả trưởng thành ở mức an toàn, tôn trọng, không chi tiết đồ họa
                    </p>
                  </div>
                </label>

                {/* Mức tả thực */}
                <label className="flex items-start space-x-3 p-3 bg-white/5 rounded-lg border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
                  <input
                    type="radio"
                    name="adult_intensity"
                    value="direct"
                    checked={contentFlags.adult_intensity === 'direct'}
                    onChange={() => handleIntensityChange('direct')}
                    disabled={disabled}
                    className="mt-1 text-red-500 focus:ring-red-500"
                  />
                  <div>
                    <div className="font-medium text-white">⚡ Tả thực</div>
                    <p className="text-xs text-gray-300">
                      Mô tả trưởng thành chi tiết hơn, sinh động, từ ngữ trực tiếp hơn. 
                      Bao gồm: từ ngữ tả bộ phận sinh dục, cảm xúc rõ ràng sinh động, 
                      mô tả cảnh thân mật/tình dục chi tiết.
                    </p>
                  </div>
                </label>
              </div>

              {/* Thông tin chi tiết */}
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                {showDetails ? 'Ẩn chi tiết' : 'Xem chi tiết về ranh giới nội dung'}
              </button>

              {showDetails && (
                <MotionWrapper
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4"
                >
                  <h5 className="font-semibold text-blue-300 mb-2">Ranh giới nội dung:</h5>
                  <ul className="text-xs text-blue-200 space-y-1">
                    <li>• ❌ Không nội dung trẻ vị thành niên</li>
                    <li>• ❌ Không cưỡng bức/bạo lực tình dục</li>
                    <li>• ❌ Không loạn luân</li>
                    <li>• ❌ Không thú tính</li>
                    <li>• ❌ Không nội dung phi pháp</li>
                    <li>• ✅ Chỉ nội dung CONSENSUAL giữa người lớn</li>
                    <li>• ✅ Tôn trọng luật địa phương và chính sách nền tảng</li>
                  </ul>
                  
                  <h5 className="font-semibold text-red-300 mb-2 mt-4">Mức "Tả thực" bao gồm:</h5>
                  <ul className="text-xs text-red-200 space-y-1">
                    <li>• 🔥 Sử dụng từ ngữ tả bộ phận sinh dục nhiều hơn</li>
                    <li>• 💫 Mô tả cảm xúc rõ ràng sinh động hơn, tránh né tránh</li>
                    <li>• 🔥 Mô tả cảnh thân mật/tình dục rõ ràng hơn, càng chi tiết càng tốt</li>
                  </ul>
                </MotionWrapper>
              )}
            </MotionWrapper>
          )}
        </div>

        {/* Banner trạng thái */}
        {contentFlags.adult_enabled && (
          <MotionWrapper
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg"
          >
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-sm font-medium text-red-300">
                Adult Mode: ON ({contentFlags.adult_intensity === 'direct_safe' ? 'An toàn' : 'Tả thực'})
              </span>
            </div>
          </MotionWrapper>
        )}
      </MotionWrapper>

      {/* Age Gate Dialog */}
      {showAgeGate && (
        <MotionWrapper
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <MotionWrapper
            className="bg-gray-900 border border-red-500/30 rounded-xl p-6 max-w-md mx-4"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <div className="flex items-center space-x-3 mb-4">
              <Shield className="w-8 h-8 text-red-400" />
              <h3 className="text-xl font-bold text-white">Xác nhận tuổi</h3>
            </div>

            <div className="space-y-4">
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <p className="text-sm text-red-300">
                  <strong>Bạn có đủ 18 tuổi không?</strong>
                </p>
                <p className="text-xs text-gray-300 mt-2">
                  Tính năng này cho phép nội dung trưởng thành bao gồm tình dục, bạo lực và ngôn ngữ mạnh. 
                  Chỉ dành cho người từ 18 tuổi trở lên.
                </p>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                <p className="text-xs text-blue-300">
                  <strong>Lưu ý:</strong> Bạn có thể tắt tính năng này bất kỳ lúc nào trong game. 
                  Tất cả nội dung đều tuân thủ chính sách và luật pháp.
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleAgeGateCancel}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleAgeGateConfirm}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Tôi đủ 18 tuổi
                </button>
              </div>
            </div>
          </MotionWrapper>
        </MotionWrapper>
      )}
    </>
  );
}
