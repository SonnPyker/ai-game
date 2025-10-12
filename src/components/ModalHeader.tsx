import React from 'react';
import { X, Minus } from 'lucide-react';

interface ModalHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  onClose: () => void;
  onMinimize?: () => void;
  className?: string;
  showMinimize?: boolean;
}

export function ModalHeader({
  title,
  subtitle,
  icon,
  onClose,
  onMinimize,
  className = '',
  showMinimize = true
}: ModalHeaderProps) {
  return (
    <div className={`flex items-center justify-between p-3 sm:p-4 border-b border-gray-700 ${className}`}>
      <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
        {icon && (
          <div className="p-1.5 sm:p-2 bg-gray-600/20 rounded-lg flex-shrink-0">
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-lg sm:text-xl font-bold text-white truncate">{title}</h2>
          {subtitle && (
            <p className="text-gray-400 text-xs sm:text-sm truncate">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
        {showMinimize && onMinimize && (
          <button
            onClick={onMinimize}
            className="p-2.5 sm:p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-800/50 min-w-[40px] min-h-[40px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center"
            title="Thu nhỏ"
          >
            <Minus className="w-4 h-4 sm:w-4 sm:h-4" />
          </button>
        )}
        <button
          onClick={onClose}
          className="p-2.5 sm:p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-800/50 min-w-[40px] min-h-[40px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center"
          title="Đóng"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>
    </div>
  );
}
