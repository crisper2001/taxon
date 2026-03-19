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

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    setIsActivelyResizing(true);
    dragOffset.current = e.clientX - (window.innerWidth - width);
  }, [width]); // Added width dependency

  const handleMouseUp = useCallback(() => {
    isResizing.current = false;
    setIsActivelyResizing(false);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return;
    requestAnimationFrame(() => {
      if (!isResizing.current) return;
      const newWidth = window.innerWidth - (e.clientX - dragOffset.current);
      const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      setWidth(clampedWidth);
    });
  }, [minWidth, maxWidth, dragOffset]); // Added dragOffset dependency

  useEffect(() => {
    if (!isVisible) return;

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mouseleave', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mouseleave', handleMouseUp);
    };
  }, [isVisible, handleMouseMove, handleMouseUp]);

  return { width, isActivelyResizing, handleMouseDown, setWidth };
};
