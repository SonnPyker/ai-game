import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { HelpCircle, X } from 'lucide-react';
import { MotionWrapper } from './MotionWrapper';

interface HelpTooltipProps {
  title: string;
  content: string | string[];
  className?: string;
}

export function HelpTooltip({ title, content, className = '' }: HelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  // Chuyển đổi content thành array nếu là string
  const contentArray: (string | string[])[] = Array.isArray(content) ? content : [content];

  return (
    <div className={`relative ${className}`}>
      {/* Icon Help */}
      <button
        onClick={handleToggle}
        className="fixed top-4 right-4 z-50 p-3 bg-blue-600 border-2 border-blue-500 rounded-full text-white hover:bg-blue-700 hover:border-blue-400 transition-all duration-200 shadow-lg"
        title="Hướng dẫn"
      >
        <HelpCircle className="w-6 h-6" />
      </button>

      {/* Tooltip Content */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay */}
            <MotionWrapper
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-gray-900 z-40"
              onClick={handleClose}
            >
              <div />
            </MotionWrapper>

            {/* Tooltip Panel */}
            <MotionWrapper
              initial={{ opacity: 0, scale: 0.9, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              className="fixed top-4 right-4 z-50 w-96 max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] bg-gray-800 border border-gray-600 rounded-xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
                <h3 className="text-lg font-bold-vietnamese text-white uppercase">
                  {title}
                </h3>
                <button
                  onClick={handleClose}
                  className="p-2 text-gray-400 hover:text-white transition-colors duration-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 max-h-[calc(100vh-8rem)] overflow-y-auto scrollbar-hide">
                <div className="space-y-4">
                  {contentArray.map((item, index) => (
                    <MotionWrapper
                      key={index}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="p-4 bg-gray-800/50 border border-gray-700/30 rounded-lg"
                    >
                      <div className="text-gray-300 text-sm leading-relaxed">
                        {typeof item === 'string' ? (
                          <p>{item}</p>
                        ) : Array.isArray(item) ? (
                          <div className="space-y-2">
                            {item.map((line: string, lineIndex: number) => (
                              <p key={lineIndex}>{line}</p>
                            ))}
                          </div>
                        ) : (
                          <p>{String(item)}</p>
                        )}
                      </div>
                    </MotionWrapper>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-700/50 bg-gray-800/30">
                <p className="text-xs text-gray-400 text-center">
                  Nhấn vào bất kỳ đâu bên ngoài để đóng
                </p>
              </div>
            </MotionWrapper>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
