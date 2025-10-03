import { Smartphone, Monitor, RotateCcw } from 'lucide-react';
import { useResponsiveContext } from '../contexts/ResponsiveContext';

export function UIModeIndicator() {
  const { 
    uiMode, 
    getEffectiveUIMode, 
    isMobile, 
    isTablet 
  } = useResponsiveContext();

  const effectiveMode = getEffectiveUIMode();

  const getModeIcon = () => {
    switch (effectiveMode) {
      case 'mobile':
        return <Smartphone className="w-3 h-3" />;
      case 'desktop':
        return <Monitor className="w-3 h-3" />;
      default:
        return <RotateCcw className="w-3 h-3" />;
    }
  };

  const getModeText = () => {
    switch (effectiveMode) {
      case 'mobile':
        return 'Mobile';
      case 'desktop':
        return 'Desktop';
      default:
        return 'Auto';
    }
  };

  if (uiMode === 'auto') {
    return (
      <div className="flex items-center space-x-1 text-xs text-gray-400">
        {getModeIcon()}
        <span>{getModeText()}</span>
        <span className="text-gray-500">
          ({isMobile ? 'Mobile' : isTablet ? 'Tablet' : 'Desktop'})
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-1 text-xs text-gray-400">
      {getModeIcon()}
      <span>{getModeText()}</span>
    </div>
  );
}
