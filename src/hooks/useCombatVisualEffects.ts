import { useEffect, useRef, useState, useCallback } from 'react';
import { combatAnimationService, AnimationEvent, AnimationType } from '../services/combatAnimationService';
import { 
  CombatDamageTextData, 
  CombatEffectData
} from '../types/combat';

// Animation state for combatant cards
interface CombatantAnimationState {
  shake: boolean;
  flash: boolean;
  pulse: boolean;
  highlight: boolean;
  className: string;
}

// Hook for managing combat visual effects
export function useCombatVisualEffects(combatantId: string) {
  const [animationState, setAnimationState] = useState<CombatantAnimationState>({
    shake: false,
    flash: false,
    pulse: false,
    highlight: false,
    className: ''
  });

  const [floatingTexts, setFloatingTexts] = useState<CombatDamageTextData[]>([]);
  const animationTimeoutRef = useRef<NodeJS.Timeout>();
  const elementRef = useRef<HTMLElement>(null);

  // Cleanup animation classes after animation completes
  const cleanupAnimation = useCallback((effectType: AnimationType) => {
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }

    const duration = getAnimationDuration(effectType);
    animationTimeoutRef.current = setTimeout(() => {
      setAnimationState(prev => ({
        ...prev,
        [effectType]: false,
        className: prev.className.replace(`combat-${effectType}`, '').trim()
      }));

      // Remove will-change for performance
      if (elementRef.current) {
        elementRef.current.style.willChange = 'auto';
        elementRef.current.classList.add('combat-animation-complete');
      }
    }, duration);
  }, []);

  // Get animation duration based on type
  const getAnimationDuration = (type: AnimationType): number => {
    const durations: Record<AnimationType, number> = {
      [AnimationType.SHAKE]: 500,
      [AnimationType.FLASH]: 300,
      [AnimationType.PULSE]: 400,
      [AnimationType.HIGHLIGHT]: 300,
      [AnimationType.DAMAGE]: 1200,
      [AnimationType.HEAL]: 1200,
      [AnimationType.MISS]: 1000,
      [AnimationType.CRITICAL]: 1500,
      [AnimationType.FADE_IN]: 300,
      [AnimationType.FADE_OUT]: 200
    };
    return durations[type] || 300;
  };

  // Apply animation to combatant card
  const applyAnimation = useCallback((effectType: AnimationType, _intensity: 'low' | 'medium' | 'high' = 'medium') => {
    // Skip if user prefers reduced motion
    if (combatAnimationService.shouldReduceMotion()) {
      return;
    }

    // Set will-change for performance
    if (elementRef.current) {
      elementRef.current.style.willChange = 'transform, opacity';
      elementRef.current.classList.remove('combat-animation-complete');
    }

    setAnimationState(prev => {
      const newState = { ...prev };
      
      // Clear previous animation
      newState.className = prev.className.replace(/combat-\w+/g, '').trim();
      
      // Add new animation
      switch (effectType) {
        case AnimationType.SHAKE:
          newState.shake = true;
          newState.className += ' combat-shake';
          break;
        case AnimationType.FLASH:
          newState.flash = true;
          newState.className += ' combat-flash';
          break;
        case AnimationType.PULSE:
          newState.pulse = true;
          newState.className += ' combat-pulse';
          break;
        case AnimationType.HIGHLIGHT:
          newState.highlight = true;
          newState.className += ' combat-highlight';
          break;
      }

      return newState;
    });

    cleanupAnimation(effectType);
  }, [cleanupAnimation]);

  // Handle floating text completion
  const handleTextComplete = useCallback((id: string) => {
    setFloatingTexts(prev => prev.filter(text => text.id !== id));
  }, []);

  // Subscribe to animation events
  useEffect(() => {
    const handleDamageText = (data: CombatDamageTextData) => {
      if (data.combatantId === combatantId) {
        setFloatingTexts(prev => [...prev, data]);
      }
    };

    const handleCombatantEffect = (data: CombatEffectData) => {
      if (data.combatantId === combatantId) {
        const effectType = data.effectType as AnimationType;
        applyAnimation(effectType, data.intensity);
      }
    };

    // Subscribe to events
    combatAnimationService.on(AnimationEvent.DAMAGE_TEXT, handleDamageText);
    combatAnimationService.on(AnimationEvent.COMBATANT_EFFECT, handleCombatantEffect);

    // Cleanup
    return () => {
      combatAnimationService.off(AnimationEvent.DAMAGE_TEXT, handleDamageText);
      combatAnimationService.off(AnimationEvent.COMBATANT_EFFECT, handleCombatantEffect);
      
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, [combatantId, applyAnimation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  return {
    animationState,
    floatingTexts,
    elementRef,
    handleTextComplete
  };
}

// Hook for managing combat page-level visual effects
export function useCombatPageVisualEffects() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');

  // Handle combat processing state
  const setProcessing = useCallback((processing: boolean, message: string = '') => {
    setIsProcessing(processing);
    setProcessingMessage(message);
  }, []);

  // Subscribe to animation queue processing
  useEffect(() => {
    const handleQueueProcess = (data: { queueLength: number }) => {
      if (data.queueLength > 0) {
        setProcessing(true, `Đang xử lý ${data.queueLength} hiệu ứng...`);
      } else {
        setProcessing(false);
      }
    };

    combatAnimationService.on(AnimationEvent.QUEUE_PROCESS, handleQueueProcess);

    return () => {
      combatAnimationService.off(AnimationEvent.QUEUE_PROCESS, handleQueueProcess);
    };
  }, [setProcessing]);

  return {
    isProcessing,
    processingMessage,
    setProcessing
  };
}

// Utility hook for performance monitoring
export function useCombatPerformanceMonitoring() {
  const [metrics, setMetrics] = useState(combatAnimationService.getPerformanceMetrics());

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(combatAnimationService.getPerformanceMetrics());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return metrics;
}

// Hook for device capabilities detection
export function useCombatDeviceCapabilities() {
  const [capabilities, setCapabilities] = useState({
    isMobile: combatAnimationService.isMobileDevice(),
    isLowEnd: combatAnimationService.isDeviceLowEnd(),
    prefersReducedMotion: combatAnimationService.shouldReduceMotion()
  });

  useEffect(() => {
    // Listen for reduced motion changes
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => {
      setCapabilities(prev => ({
        ...prev,
        prefersReducedMotion: mediaQuery.matches
      }));
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return capabilities;
}
