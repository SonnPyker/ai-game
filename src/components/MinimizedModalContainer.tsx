import { useState, useRef, useCallback, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useMinimizedModalContext } from '../contexts/MinimizedModalContext';
import { DraggableMinimizedModal } from './DraggableMinimizedModal';

export function MinimizedModalContainer() {
  const { minimizedModals } = useMinimizedModalContext();
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { updateModalPosition } = useMinimizedModalContext();

  // Auto-arrange modals when they're added
  const arrangeModals = useCallback(() => {
    const modals = Array.from(minimizedModals.values());
    const container = containerRef.current;
    if (!container || modals.length === 0) return;

    const isMobile = window.innerWidth <= 768;
    const containerRect = container.getBoundingClientRect();
    const modalWidth = isMobile ? 180 : 250;
    const modalHeight = isMobile ? 45 : 60;
    const padding = isMobile ? 8 : 10;
    const maxModalsPerRow = Math.floor((containerRect.width - padding) / (modalWidth + padding));
    
    modals.forEach((modal, index) => {
      if (modal.position.x === 0 && modal.position.y === 0) {
        // Only arrange if position is default (0,0)
        const row = Math.floor(index / maxModalsPerRow);
        const col = index % maxModalsPerRow;
        
        const x = padding + col * (modalWidth + padding);
        const y = padding + row * (modalHeight + padding);
        
        // Update position through context
        updateModalPosition(modal.id, { x, y });
      }
    });
  }, [minimizedModals, updateModalPosition]);

  useEffect(() => {
    arrangeModals();
  }, [minimizedModals.size, arrangeModals]);

  // Rearrange modals when window resizes
  useEffect(() => {
    const handleResize = () => {
      arrangeModals();
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [arrangeModals]);

  if (minimizedModals.size === 0) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-50"
      style={{ zIndex: 1000 }}
    >
      <AnimatePresence>
        {Array.from(minimizedModals.values()).map((modal) => (
          <DraggableMinimizedModal
            key={modal.id}
            modalData={modal}
            isDragging={isDragging === modal.id}
            onDragStart={() => setIsDragging(modal.id)}
            onDragEnd={() => setIsDragging(null)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
