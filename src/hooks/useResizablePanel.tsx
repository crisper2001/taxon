import { useState, useRef, useCallback, useEffect } from 'react';

export const useResizablePanel = (initialWidth: number, minWidth: number, maxWidth: number, isVisible: boolean, storageKey?: string) => {
  const [width, setWidth] = useState(() => {
    if (storageKey) {
      const savedWidth = localStorage.getItem(storageKey);
      if (savedWidth) {
        const parsed = parseInt(savedWidth, 10);
        if (!isNaN(parsed) && parsed >= minWidth && parsed <= maxWidth) {
          return parsed;
        }
      }
    }
    return initialWidth;
  });

  useEffect(() => {
    if (storageKey) {
      localStorage.setItem(storageKey, width.toString());
    }
  }, [width, storageKey]);

  const isResizing = useRef(false);
  const dragOffset = useRef(0);
  const [isActivelyResizing, setIsActivelyResizing] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    isResizing.current = true;
    setIsActivelyResizing(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    dragOffset.current = clientX - (window.innerWidth - width);
  }, [width]); // Added width dependency

  const handleMouseUp = useCallback(() => {
    isResizing.current = false;
    setIsActivelyResizing(false);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isResizing.current) return;
    requestAnimationFrame(() => {
      if (!isResizing.current) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const newWidth = window.innerWidth - (clientX - dragOffset.current);
      const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      setWidth(clampedWidth);
    });
  }, [minWidth, maxWidth, dragOffset]); // Added dragOffset dependency

  useEffect(() => {
    if (!isVisible) return;

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mouseleave', handleMouseUp);
    window.addEventListener('touchmove', handleMouseMove, { passive: false });
    window.addEventListener('touchend', handleMouseUp);
    window.addEventListener('touchcancel', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mouseleave', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
      window.removeEventListener('touchcancel', handleMouseUp);
    };
  }, [isVisible, handleMouseMove, handleMouseUp]);

  return { width, isActivelyResizing, handleMouseDown, setWidth };
};
