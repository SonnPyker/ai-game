import { createContext, useContext, ReactNode } from 'react';
import { useResponsiveDesign, UIMode } from '../hooks/useResponsiveDesign';

interface ResponsiveContextType {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  uiMode: UIMode;
  screenWidth: number;
  screenHeight: number;
  setUIMode: (mode: UIMode) => void;
  getEffectiveUIMode: () => 'mobile' | 'desktop';
  shouldUseMobileLayout: () => boolean;
  shouldUseDesktopLayout: () => boolean;
}

const ResponsiveContext = createContext<ResponsiveContextType | undefined>(undefined);

interface ResponsiveProviderProps {
  children: ReactNode;
}

export function ResponsiveProvider({ children }: ResponsiveProviderProps) {
  const responsiveData = useResponsiveDesign();

  return (
    <ResponsiveContext.Provider value={responsiveData}>
      {children}
    </ResponsiveContext.Provider>
  );
}

export function useResponsiveContext() {
  const context = useContext(ResponsiveContext);
  if (context === undefined) {
    throw new Error('useResponsiveContext must be used within a ResponsiveProvider');
  }
  return context;
}
