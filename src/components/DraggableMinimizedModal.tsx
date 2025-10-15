import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useMinimizedModalContext, MinimizedModalData } from '../contexts/MinimizedModalContext';

interface DraggableMinimizedModalProps {
  modalData: MinimizedModalData;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}

export function DraggableMinimizedModal({
  modalData,
  isDragging,
  onDragStart,
  onDragEnd
}: DraggableMinimizedModalProps) {
  const { updateModalPosition } = useMinimizedModalContext();
  const [isDraggingLocal, setIsDraggingLocal] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const modalRef = useRef<HTMLDivElement>(null);
  const startPos = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (modalRef.current) {
      const rect = modalRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      startPos.current = { x: e.clientX, y: e.clientY };
      setIsDraggingLocal(true);
      onDragStart();
    }
  }, [onDragStart]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Don't preventDefault here to avoid passive event listener issues
    e.stopPropagation();
    
    if (modalRef.current && e.touches[0]) {
      const touch = e.touches[0];
      const rect = modalRef.current.getBoundingClientRect();
      setDragOffset({
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      });
      startPos.current = { x: touch.clientX, y: touch.clientY };
      setIsDraggingLocal(true);
      onDragStart();
      
      // Add haptic feedback on mobile
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }
  }, [onDragStart]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingLocal) return;
    
    e.preventDefault();
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    
    // Constrain to viewport with safe zones
    const safeZone = isMobile ? 20 : 40; // Safe zone from edges
    const maxX = window.innerWidth - modalWidth - safeZone;
    const maxY = window.innerHeight - modalHeight - safeZone;
    
    const constrainedX = Math.max(safeZone, Math.min(newX, maxX));
    const constrainedY = Math.max(safeZone, Math.min(newY, maxY));
    
    updateModalPosition(modalData.id, {
      x: constrainedX,
      y: constrainedY
    });
  }, [isDraggingLocal, dragOffset, updateModalPosition, modalData.id]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDraggingLocal || !e.touches[0]) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    const newX = touch.clientX - dragOffset.x;
    const newY = touch.clientY - dragOffset.y;
    
    // Constrain to viewport with safe zones
    const safeZone = isMobile ? 20 : 40; // Safe zone from edges
    const maxX = window.innerWidth - modalWidth - safeZone;
    const maxY = window.innerHeight - modalHeight - safeZone;
    
    const constrainedX = Math.max(safeZone, Math.min(newX, maxX));
    const constrainedY = Math.max(safeZone, Math.min(newY, maxY));
    
    updateModalPosition(modalData.id, {
      x: constrainedX,
      y: constrainedY
    });
  }, [isDraggingLocal, dragOffset, updateModalPosition, modalData.id]);

  const handleMouseUp = useCallback(() => {
    if (isDraggingLocal) {
      setIsDraggingLocal(false);
      onDragEnd();
    }
  }, [isDraggingLocal, onDragEnd]);

  const handleTouchEnd = useCallback(() => {
    if (isDraggingLocal) {
      setIsDraggingLocal(false);
      onDragEnd();
    }
  }, [isDraggingLocal, onDragEnd]);

  useEffect(() => {
    if (isDraggingLocal) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd, { passive: false });
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDraggingLocal, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const modalWidth = isMobile ? 180 : 250;
  const modalHeight = isMobile ? 45 : 60;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ 
        opacity: 1, 
        scale: 1,
        y: 0
      }}
      exit={{ opacity: 0, scale: 0.8, y: 20 }}
      transition={{ duration: 0.2 }}
      className={`fixed pointer-events-auto ${isDragging || isDraggingLocal ? 'cursor-grabbing' : 'cursor-grab'}`}
      style={{
        left: modalData.position.x,
        top: modalData.position.y,
        zIndex: modalData.position.zIndex,
        width: modalWidth,
        height: modalHeight
      }}
    >
      <div
        ref={modalRef}
        className={`
          bg-gray-800 border border-gray-600 rounded-lg shadow-lg
          transition-all duration-200
          ${isDragging || isDraggingLocal 
            ? 'shadow-2xl scale-105 border-blue-400' 
            : 'hover:shadow-xl hover:scale-102'
          }
          ${isMobile ? 'text-xs' : 'text-sm'}
        `}
        style={{ touchAction: 'none' }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <div className={`flex items-center ${isMobile ? 'space-x-1.5 p-1.5' : 'space-x-2 p-2'} h-full`}>
          {modalData.icon && (
            <div className={`${isMobile ? 'p-0.5' : 'p-1'} bg-gray-600/20 rounded flex-shrink-0`}>
              {modalData.icon}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className={`text-white font-medium truncate ${isMobile ? 'text-xs' : 'text-sm'}`}>
              {modalData.title}
            </div>
            {modalData.subtitle && (
              <div className={`text-gray-400 truncate ${isMobile ? 'text-xs' : 'text-xs'}`}>
                {typeof modalData.subtitle === 'string' ? modalData.subtitle : JSON.stringify(modalData.subtitle)}
              </div>
            )}
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                modalData.onRestore();
              }}
              className={`${isMobile ? 'p-1' : 'p-1.5'} text-gray-400 hover:text-white transition-colors rounded hover:bg-gray-700 touch-manipulation`}
              title="Khôi phục"
            >
              <svg className={`${isMobile ? 'w-3 h-3' : 'w-3 h-3'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
