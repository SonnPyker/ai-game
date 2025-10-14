import React, { createContext, useContext, useState, useCallback } from 'react';

export interface MinimizedModalPosition {
  x: number;
  y: number;
  zIndex: number;
}

export interface MinimizedModalData {
  id: string;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  onRestore: () => void;
  position: MinimizedModalPosition;
}

interface MinimizedModalContextType {
  minimizedModals: Map<string, MinimizedModalData>;
  addMinimizedModal: (modalData: MinimizedModalData) => void;
  removeMinimizedModal: (modalId: string) => void;
  updateModalPosition: (modalId: string, position: Partial<MinimizedModalPosition>) => void;
  updateModalData: (modalId: string, data: Partial<Omit<MinimizedModalData, 'id' | 'position' | 'onRestore'>>) => void;
  hasMinimizedModals: boolean;
  getNextZIndex: () => number;
}

const MinimizedModalContext = createContext<MinimizedModalContextType | undefined>(undefined);

export function MinimizedModalProvider({ children }: { children: React.ReactNode }) {
  const [minimizedModals, setMinimizedModals] = useState<Map<string, MinimizedModalData>>(new Map());
  const [nextZIndex, setNextZIndex] = useState(1000);

  const getNextZIndex = useCallback(() => {
    const currentZIndex = nextZIndex;
    setNextZIndex(prev => prev + 1);
    return currentZIndex;
  }, [nextZIndex]);

  const addMinimizedModal = useCallback((modalData: MinimizedModalData) => {
    setMinimizedModals(prev => {
      const newMap = new Map(prev);
      newMap.set(modalData.id, modalData);
      return newMap;
    });
  }, []);

  const removeMinimizedModal = useCallback((modalId: string) => {
    setMinimizedModals(prev => {
      const newMap = new Map(prev);
      newMap.delete(modalId);
      return newMap;
    });
  }, []);

  const updateModalPosition = useCallback((modalId: string, position: Partial<MinimizedModalPosition>) => {
    setMinimizedModals(prev => {
      const newMap = new Map(prev);
      const existingModal = newMap.get(modalId);
      if (existingModal) {
        newMap.set(modalId, {
          ...existingModal,
          position: { ...existingModal.position, ...position }
        });
      }
      return newMap;
    });
  }, []);

  const updateModalData = useCallback((modalId: string, data: Partial<Omit<MinimizedModalData, 'id' | 'position' | 'onRestore'>>) => {
    setMinimizedModals(prev => {
      const newMap = new Map(prev);
      const existingModal = newMap.get(modalId);
      if (existingModal) {
        newMap.set(modalId, {
          ...existingModal,
          ...data
        });
      }
      return newMap;
    });
  }, []);

  const hasMinimizedModals = minimizedModals.size > 0;

  return (
    <MinimizedModalContext.Provider
      value={{
        minimizedModals,
        addMinimizedModal,
        removeMinimizedModal,
        updateModalPosition,
        updateModalData,
        hasMinimizedModals,
        getNextZIndex
      }}
    >
      {children}
    </MinimizedModalContext.Provider>
  );
}

export function useMinimizedModalContext() {
  const context = useContext(MinimizedModalContext);
  if (context === undefined) {
    throw new Error('useMinimizedModalContext must be used within a MinimizedModalProvider');
  }
  return context;
}
