import React from 'react';
import { motion } from 'framer-motion';
import { useResponsiveContext } from '../contexts/ResponsiveContext';

interface MotionWrapperProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  [key: string]: any;
}

/**
 * Wrapper component for framer-motion that automatically disables animations on mobile
 * Falls back to regular div when animations are disabled
 * Supports ref forwarding for combat animations
 */
export const MotionWrapper = React.forwardRef<HTMLDivElement, MotionWrapperProps>(
  ({ children, ...props }, ref) => {
    const { shouldUseAnimations, getMotionProps } = useResponsiveContext();
    
    // If animations are disabled, render regular div
    if (!shouldUseAnimations()) {
      return <div ref={ref} {...props}>{children}</div>;
    }
    
    // Use motion.div with proper props when animations are enabled
    const motionProps = getMotionProps(props);
    return <motion.div ref={ref} {...motionProps}>{children}</motion.div>;
  }
);

MotionWrapper.displayName = 'MotionWrapper';

// Convenience components for common motion elements
export function MotionButton({ children, ...props }: MotionWrapperProps) {
  const { shouldUseAnimations, getMotionProps } = useResponsiveContext();
  
  if (!shouldUseAnimations()) {
    return <button {...props}>{children}</button>;
  }
  
  const motionProps = getMotionProps(props);
  return <motion.button {...motionProps}>{children}</motion.button>;
}

export function MotionSpan({ children, ...props }: MotionWrapperProps) {
  const { shouldUseAnimations, getMotionProps } = useResponsiveContext();
  
  if (!shouldUseAnimations()) {
    return <span {...props}>{children}</span>;
  }
  
  const motionProps = getMotionProps(props);
  return <motion.span {...motionProps}>{children}</motion.span>;
}

export function MotionP({ children, ...props }: MotionWrapperProps) {
  const { shouldUseAnimations, getMotionProps } = useResponsiveContext();
  
  if (!shouldUseAnimations()) {
    return <p {...props}>{children}</p>;
  }
  
  const motionProps = getMotionProps(props);
  return <motion.p {...motionProps}>{children}</motion.p>;
}

export function MotionH1({ children, ...props }: MotionWrapperProps) {
  const { shouldUseAnimations, getMotionProps } = useResponsiveContext();
  
  if (!shouldUseAnimations()) {
    return <h1 {...props}>{children}</h1>;
  }
  
  const motionProps = getMotionProps(props);
  return <motion.h1 {...motionProps}>{children}</motion.h1>;
}

export function MotionH2({ children, ...props }: MotionWrapperProps) {
  const { shouldUseAnimations, getMotionProps } = useResponsiveContext();
  
  if (!shouldUseAnimations()) {
    return <h2 {...props}>{children}</h2>;
  }
  
  const motionProps = getMotionProps(props);
  return <motion.h2 {...motionProps}>{children}</motion.h2>;
}

export function MotionH3({ children, ...props }: MotionWrapperProps) {
  const { shouldUseAnimations, getMotionProps } = useResponsiveContext();
  
  if (!shouldUseAnimations()) {
    return <h3 {...props}>{children}</h3>;
  }
  
  const motionProps = getMotionProps(props);
  return <motion.h3 {...motionProps}>{children}</motion.h3>;
}

export function MotionH4({ children, ...props }: MotionWrapperProps) {
  const { shouldUseAnimations, getMotionProps } = useResponsiveContext();
  
  if (!shouldUseAnimations()) {
    return <h4 {...props}>{children}</h4>;
  }
  
  const motionProps = getMotionProps(props);
  return <motion.h4 {...motionProps}>{children}</motion.h4>;
}

export function MotionH5({ children, ...props }: MotionWrapperProps) {
  const { shouldUseAnimations, getMotionProps } = useResponsiveContext();
  
  if (!shouldUseAnimations()) {
    return <h5 {...props}>{children}</h5>;
  }
  
  const motionProps = getMotionProps(props);
  return <motion.h5 {...motionProps}>{children}</motion.h5>;
}

export function MotionH6({ children, ...props }: MotionWrapperProps) {
  const { shouldUseAnimations, getMotionProps } = useResponsiveContext();
  
  if (!shouldUseAnimations()) {
    return <h6 {...props}>{children}</h6>;
  }
  
  const motionProps = getMotionProps(props);
  return <motion.h6 {...motionProps}>{children}</motion.h6>;
}

export function MotionUl({ children, ...props }: MotionWrapperProps) {
  const { shouldUseAnimations, getMotionProps } = useResponsiveContext();
  
  if (!shouldUseAnimations()) {
    return <ul {...props}>{children}</ul>;
  }
  
  const motionProps = getMotionProps(props);
  return <motion.ul {...motionProps}>{children}</motion.ul>;
}

export function MotionLi({ children, ...props }: MotionWrapperProps) {
  const { shouldUseAnimations, getMotionProps } = useResponsiveContext();
  
  if (!shouldUseAnimations()) {
    return <li {...props}>{children}</li>;
  }
  
  const motionProps = getMotionProps(props);
  return <motion.li {...motionProps}>{children}</motion.li>;
}

export function MotionForm({ children, ...props }: MotionWrapperProps) {
  const { shouldUseAnimations, getMotionProps } = useResponsiveContext();
  
  if (!shouldUseAnimations()) {
    return <form {...props}>{children}</form>;
  }
  
  const motionProps = getMotionProps(props);
  return <motion.form {...motionProps}>{children}</motion.form>;
}

export function MotionInput({ children, ...props }: MotionWrapperProps) {
  const { shouldUseAnimations, getMotionProps } = useResponsiveContext();
  
  if (!shouldUseAnimations()) {
    return <input {...props}>{children}</input>;
  }
  
  const motionProps = getMotionProps(props);
  return <motion.input {...motionProps}>{children}</motion.input>;
}

export function MotionTextarea({ children, ...props }: MotionWrapperProps) {
  const { shouldUseAnimations, getMotionProps } = useResponsiveContext();
  
  if (!shouldUseAnimations()) {
    return <textarea {...props}>{children}</textarea>;
  }
  
  const motionProps = getMotionProps(props);
  return <motion.textarea {...motionProps}>{children}</motion.textarea>;
}

export function MotionLabel({ children, ...props }: MotionWrapperProps) {
  const { shouldUseAnimations, getMotionProps } = useResponsiveContext();
  
  if (!shouldUseAnimations()) {
    return <label {...props}>{children}</label>;
  }
  
  const motionProps = getMotionProps(props);
  return <motion.label {...motionProps}>{children}</motion.label>;
}

export function MotionNav({ children, ...props }: MotionWrapperProps) {
  const { shouldUseAnimations, getMotionProps } = useResponsiveContext();
  
  if (!shouldUseAnimations()) {
    return <nav {...props}>{children}</nav>;
  }
  
  const motionProps = getMotionProps(props);
  return <motion.nav {...motionProps}>{children}</motion.nav>;
}

export function MotionHeader({ children, ...props }: MotionWrapperProps) {
  const { shouldUseAnimations, getMotionProps } = useResponsiveContext();
  
  if (!shouldUseAnimations()) {
    return <header {...props}>{children}</header>;
  }
  
  const motionProps = getMotionProps(props);
  return <motion.header {...motionProps}>{children}</motion.header>;
}

export function MotionFooter({ children, ...props }: MotionWrapperProps) {
  const { shouldUseAnimations, getMotionProps } = useResponsiveContext();
  
  if (!shouldUseAnimations()) {
    return <footer {...props}>{children}</footer>;
  }
  
  const motionProps = getMotionProps(props);
  return <motion.footer {...motionProps}>{children}</motion.footer>;
}

export function MotionMain({ children, ...props }: MotionWrapperProps) {
  const { shouldUseAnimations, getMotionProps } = useResponsiveContext();
  
  if (!shouldUseAnimations()) {
    return <main {...props}>{children}</main>;
  }
  
  const motionProps = getMotionProps(props);
  return <motion.main {...motionProps}>{children}</motion.main>;
}

export function MotionArticle({ children, ...props }: MotionWrapperProps) {
  const { shouldUseAnimations, getMotionProps } = useResponsiveContext();
  
  if (!shouldUseAnimations()) {
    return <article {...props}>{children}</article>;
  }
  
  const motionProps = getMotionProps(props);
  return <motion.article {...motionProps}>{children}</motion.article>;
}

export function MotionAside({ children, ...props }: MotionWrapperProps) {
  const { shouldUseAnimations, getMotionProps } = useResponsiveContext();
  
  if (!shouldUseAnimations()) {
    return <aside {...props}>{children}</aside>;
  }
  
  const motionProps = getMotionProps(props);
  return <motion.aside {...motionProps}>{children}</motion.aside>;
}

export function MotionSection({ children, ...props }: MotionWrapperProps) {
  const { shouldUseAnimations, getMotionProps } = useResponsiveContext();
  
  if (!shouldUseAnimations()) {
    return <section {...props}>{children}</section>;
  }
  
  const motionProps = getMotionProps(props);
  return <motion.section {...motionProps}>{children}</motion.section>;
}