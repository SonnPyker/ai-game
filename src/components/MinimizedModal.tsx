import React from 'react';
import { MotionWrapper } from './MotionWrapper';

interface MinimizedModalProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  onRestore: () => void;
  className?: string;
}

export function MinimizedModal({
  title,
  subtitle,
  icon,
  onRestore,
  className = ''
}: MinimizedModalProps) {
  return (
    <MotionWrapper
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={`fixed bottom-4 right-4 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-50 ${className}`}
    >
      <div className="flex items-center space-x-3 p-3 min-w-[200px] sm:min-w-[250px]">
        {icon && (
          <div className="p-1 sm:p-1.5 bg-gray-600/20 rounded">
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <span className="text-white text-sm sm:text-base font-medium truncate block">{title}</span>
          {subtitle && (
            <span className="text-gray-400 text-xs truncate block">{subtitle}</span>
          )}
        </div>
        <div className="flex items-center">
          <button
            onClick={onRestore}
            className="p-2 sm:p-2.5 text-gray-400 hover:text-white transition-colors rounded hover:bg-gray-700 min-w-[32px] min-h-[32px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center"
            title="Khôi phục"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
        </div>
      </div>
    </MotionWrapper>
  );
}
