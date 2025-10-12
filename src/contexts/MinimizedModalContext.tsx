import React, { createContext, useContext, useState, useCallback } from 'react';

interface MinimizedModalContextType {
  minimizedModals: Set<string>;
  addMinimizedModal: (modalId: string) => void;
  removeMinimizedModal: (modalId: string) => void;
  hasMinimizedModals: boolean;
}

const MinimizedModalContext = createContext<MinimizedModalContextType | undefined>(undefined);

export function MinimizedModalProvider({ children }: { children: React.ReactNode }) {
  const [minimizedModals, setMinimizedModals] = useState<Set<string>>(new Set());

  const addMinimizedModal = useCallback((modalId: string) => {
    setMinimizedModals(prev => new Set(prev).add(modalId));
  }, []);

  const removeMinimizedModal = useCallback((modalId: string) => {
    setMinimizedModals(prev => {
      const newSet = new Set(prev);
      newSet.delete(modalId);
      return newSet;
    });
  }, []);

  const hasMinimizedModals = minimizedModals.size > 0;

  return (
    <MinimizedModalContext.Provider
      value={{
        minimizedModals,
        addMinimizedModal,
        removeMinimizedModal,
        hasMinimizedModals
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
