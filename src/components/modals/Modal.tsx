import React, { useState, useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  size?: 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      // Use a short timeout to allow the component to render before starting the animation
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
      // Wait for animation to finish before un-rendering from DOM
      const timer = setTimeout(() => setIsRendered(false), 300); // Must match animation duration
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen && e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isRendered) {
    return null;
  }

  const sizeClasses = {
    md: 'max-w-xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
  }

  return (
    <div onClick={onClose} className={`modal-backdrop fixed inset-0 bg-[rgba(0,0,0,0.5)] z-40 flex items-center justify-center p-4 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div onClick={(e) => e.stopPropagation()} className={`modal flex flex-col bg-panel-bg rounded-lg shadow-2xl w-full h-auto max-h-[90vh] ${sizeClasses[size]} transition-all duration-300 ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
        <div className="modal-header flex justify-between items-center p-4 border-b border-border">
          <h3 className="text-xl font-bold">{title}</h3>
          <button onClick={onClose} className="text-2xl hover:text-red-500">&times;</button>
        </div>
        <div className="modal-content grow flex flex-col min-h-0">
          {children}
        </div>
      </div>
    </div>
  );
};
