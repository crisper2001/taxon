import React, { useState, useRef, useCallback, useEffect } from 'react';

export const useResizablePanel = (
  initialWidth: number,
  minWidth: number,
  maxWidth: number,
  isVisible: boolean,
  panelRef: React.RefObject<HTMLDivElement>,
  storageKey?: string
) => {
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
  const widthOnResize = useRef(width);

  useEffect(() => {
    widthOnResize.current = width;
  }, [width]);

  const handleMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    isResizing.current = true;
    setIsActivelyResizing(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    dragOffset.current = clientX - (window.innerWidth - widthOnResize.current);
  }, []);

  const handleMouseUp = useCallback(() => {
    if (isResizing.current) {
      setWidth(widthOnResize.current);
    }
    isResizing.current = false;
    setIsActivelyResizing(false);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isResizing.current) return;
    if (e.cancelable && 'touches' in e) e.preventDefault();
    requestAnimationFrame(() => {
      if (!isResizing.current || !panelRef.current) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const newWidth = window.innerWidth - (clientX - dragOffset.current);
      const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      widthOnResize.current = clampedWidth;
      panelRef.current.style.width = `${clampedWidth}px`;
    });
  }, [minWidth, maxWidth, panelRef]);

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
