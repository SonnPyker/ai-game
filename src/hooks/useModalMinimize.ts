import { useState, useCallback } from 'react';
import { useMinimizedModalContext, MinimizedModalData } from '../contexts/MinimizedModalContext';

interface UseModalMinimizeProps {
  modalId: string;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
}

interface UseModalMinimizeReturn {
  isMinimized: boolean;
  minimize: () => void;
  restore: () => void;
  toggleMinimize: () => void;
  updateData: (data: Partial<Omit<MinimizedModalData, 'id' | 'position' | 'onRestore'>>) => void;
}

export function useModalMinimize({ 
  modalId, 
  title, 
  subtitle, 
  icon 
}: UseModalMinimizeProps): UseModalMinimizeReturn {
  const [isMinimized, setIsMinimized] = useState(false);
  const { addMinimizedModal, removeMinimizedModal, getNextZIndex, updateModalData } = useMinimizedModalContext();

  const minimize = useCallback(() => {
    setIsMinimized(true);
    
    const modalData: MinimizedModalData = {
      id: modalId,
      title,
      subtitle,
      icon,
      onRestore: () => {
        setIsMinimized(false);
        removeMinimizedModal(modalId);
      },
      position: {
        x: 0, // Will be auto-arranged by container
        y: 0,
        zIndex: getNextZIndex()
      }
    };
    
    addMinimizedModal(modalData);
  }, [modalId, title, subtitle, icon, addMinimizedModal, removeMinimizedModal, getNextZIndex]);

  const restore = useCallback(() => {
    setIsMinimized(false);
    removeMinimizedModal(modalId);
  }, [modalId, removeMinimizedModal]);

  const toggleMinimize = useCallback(() => {
    if (isMinimized) {
      restore();
    } else {
      minimize();
    }
  }, [isMinimized, minimize, restore]);

  const updateData = useCallback((data: Partial<Omit<MinimizedModalData, 'id' | 'position' | 'onRestore'>>) => {
    updateModalData(modalId, data);
  }, [modalId, updateModalData]);

  return {
    isMinimized,
    minimize,
    restore,
    toggleMinimize,
    updateData
  };
}
