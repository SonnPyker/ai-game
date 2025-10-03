import { Smartphone, Monitor, RotateCcw } from 'lucide-react';
import { useResponsiveContext } from '../contexts/ResponsiveContext';
import { UIMode } from '../hooks/useResponsiveDesign';

export function UIToggle() {
  const { 
    uiMode, 
    setUIMode, 
    getEffectiveUIMode, 
    isMobile, 
    isTablet
  } = useResponsiveContext();

  const effectiveMode = getEffectiveUIMode();

  const handleModeChange = (mode: UIMode) => {
    setUIMode(mode);
  };

  const getModeIcon = (mode: UIMode) => {
    switch (mode) {
      case 'mobile':
        return <Smartphone className="w-4 h-4" />;
      case 'desktop':
        return <Monitor className="w-4 h-4" />;
      case 'auto':
        return <RotateCcw className="w-4 h-4" />;
      default:
        return <RotateCcw className="w-4 h-4" />;
    }
  };

  const getModeLabel = (mode: UIMode) => {
    switch (mode) {
      case 'mobile':
        return 'Mobile';
      case 'desktop':
        return 'Desktop';
      case 'auto':
        return 'Auto';
      default:
        return 'Auto';
    }
  };

  const getModeDescription = (mode: UIMode) => {
    switch (mode) {
      case 'mobile':
        return 'Giao diện tối ưu cho mobile';
      case 'desktop':
        return 'Giao diện tối ưu cho desktop';
      case 'auto':
        return `Tự động (hiện tại: ${isMobile ? 'Mobile' : isTablet ? 'Tablet' : 'Desktop'})`;
      default:
        return 'Tự động';
    }
  };

  return (
    <div className="flex items-center space-x-2">
      {/* Current mode indicator */}
      <div className="flex items-center space-x-1 text-xs text-gray-400">
        {getModeIcon(effectiveMode)}
        <span>{getModeLabel(effectiveMode)}</span>
      </div>

      {/* Mode toggle buttons */}
      <div className="flex bg-gray-800/50 border border-gray-700/50 rounded-lg p-1">
        {(['auto', 'mobile', 'desktop'] as UIMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => handleModeChange(mode)}
            className={`flex items-center space-x-1 px-2 py-1 rounded text-xs transition-all duration-200 ${
              uiMode === mode
                ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
            title={getModeDescription(mode)}
          >
            {getModeIcon(mode)}
            <span className="hidden sm:inline">{getModeLabel(mode)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
