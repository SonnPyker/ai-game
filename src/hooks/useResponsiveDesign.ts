import { useState, useEffect, useCallback } from 'react';

export type UIMode = 'mobile' | 'desktop' | 'auto';

interface ResponsiveDesignState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  uiMode: UIMode;
  screenWidth: number;
  screenHeight: number;
}

export function useResponsiveDesign() {
  const [state, setState] = useState<ResponsiveDesignState>(() => {
    // Initialize with current screen size
    const width = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const height = typeof window !== 'undefined' ? window.innerHeight : 768;
    
    return {
      isMobile: width < 768,
      isTablet: width >= 768 && width < 1024,
      isDesktop: width >= 1024,
      uiMode: (localStorage.getItem('uiMode') as UIMode) || 'auto',
      screenWidth: width,
      screenHeight: height,
    };
  });

  // Update screen size on resize
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setState(prev => ({
        ...prev,
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024,
        screenWidth: width,
        screenHeight: height,
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Set UI mode
  const setUIMode = useCallback((mode: UIMode) => {
    setState(prev => ({ ...prev, uiMode: mode }));
    localStorage.setItem('uiMode', mode);
  }, []);

  // Get effective UI mode (auto resolves to actual screen size)
  const getEffectiveUIMode = useCallback(() => {
    if (state.uiMode === 'auto') {
      return state.isMobile ? 'mobile' : 'desktop';
    }
    return state.uiMode;
  }, [state.uiMode, state.isMobile]);

  // Check if we should use mobile layout
  const shouldUseMobileLayout = useCallback(() => {
    const effectiveMode = getEffectiveUIMode();
    return effectiveMode === 'mobile';
  }, [getEffectiveUIMode]);

  // Check if we should use desktop layout
  const shouldUseDesktopLayout = useCallback(() => {
    const effectiveMode = getEffectiveUIMode();
    return effectiveMode === 'desktop';
  }, [getEffectiveUIMode]);

  // Check if animations should be enabled
  const shouldUseAnimations = useCallback(() => {
    const effectiveMode = getEffectiveUIMode();
    // Tắt animation trên mobile để tăng performance
    return effectiveMode !== 'mobile';
  }, [getEffectiveUIMode]);

  // Check if loading animations should be enabled (always true)
  const shouldUseLoadingAnimations = useCallback(() => {
    return true;
  }, []);

  // Get motion props for framer-motion components
  const getMotionProps = useCallback((defaultProps: any = {}) => {
    if (!shouldUseAnimations()) {
      return {
        ...defaultProps,
        initial: false,
        animate: false,
        exit: false,
        transition: { duration: 0 },
        whileHover: {},
        whileTap: {},
        whileInView: {},
        layout: false,
      };
    }
    return defaultProps;
  }, [shouldUseAnimations]);

  // Get CSS classes for transitions
  const getTransitionClass = useCallback((baseClass: string = '') => {
    if (!shouldUseAnimations()) {
      return `${baseClass} mobile-no-transition mobile-no-animation`.trim();
    }
    return baseClass;
  }, [shouldUseAnimations]);

  // Get animation class for conditional CSS
  const getAnimationClass = useCallback(() => {
    return shouldUseAnimations() ? 'animations-enabled' : 'animations-disabled';
  }, [shouldUseAnimations]);

  return {
    ...state,
    setUIMode,
    getEffectiveUIMode,
    shouldUseMobileLayout,
    shouldUseDesktopLayout,
    shouldUseAnimations,
    shouldUseLoadingAnimations,
    getMotionProps,
    getTransitionClass,
    getAnimationClass,
  };
}
