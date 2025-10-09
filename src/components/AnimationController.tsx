import { useEffect } from 'react';
import { useResponsiveContext } from '../contexts/ResponsiveContext';

/**
 * Component to control global animation state by applying CSS classes to body
 */
export function AnimationController() {
  const { getAnimationClass } = useResponsiveContext();

  useEffect(() => {
    const animationClass = getAnimationClass();
    
    // Remove existing animation classes
    document.body.classList.remove('animations-enabled', 'animations-disabled');
    
    // Add current animation class
    document.body.classList.add(animationClass);

    // Cleanup function to remove classes when component unmounts
    return () => {
      document.body.classList.remove('animations-enabled', 'animations-disabled');
    };
  }, [getAnimationClass]);

  return null; // This component doesn't render anything
}
