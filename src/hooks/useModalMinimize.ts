import { useState, useCallback } from 'react';
import { useMinimizedModalContext } from '../contexts/MinimizedModalContext';

interface UseModalMinimizeReturn {
  isMinimized: boolean;
  minimize: () => void;
  restore: () => void;
  toggleMinimize: () => void;
}

export function useModalMinimize(modalId: string): UseModalMinimizeReturn {
  const [isMinimized, setIsMinimized] = useState(false);
  const { addMinimizedModal, removeMinimizedModal } = useMinimizedModalContext();

  const minimize = useCallback(() => {
    setIsMinimized(true);
    addMinimizedModal(modalId);
  }, [modalId, addMinimizedModal]);

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

  return {
    isMinimized,
    minimize,
    restore,
    toggleMinimize
  };
}
