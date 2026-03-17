import React, { useState, useEffect, useRef } from 'react';

interface ToastProps {
  message: string;
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ message, onClose, duration = 3000 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    // Small delay to allow the DOM to render before adding the visible class for fade-in
    const showTimer = setTimeout(() => setIsVisible(true), 50);

    const hideTimer = setTimeout(() => {
      setIsVisible(false);
      // Wait for the fade-out transition to finish before calling onClose to remove from DOM
      setTimeout(() => onCloseRef.current(), 300);
    }, duration);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [duration]);

  return (
    <div className={`pointer-events-auto bg-accent text-white px-4 py-3 rounded-lg shadow-lg font-medium text-sm transition-all duration-300 transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
      {message}
    </div>
  );
};