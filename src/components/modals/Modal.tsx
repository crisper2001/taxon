import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../common/Icon';

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
    let raf1: number;
    let raf2: number;
    let timer: NodeJS.Timeout;

    if (isOpen) {
      setIsRendered(true);
      // Double requestAnimationFrame guarantees the DOM has painted the initial state before animating
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          setIsVisible(true);
        });
      });
    } else {
      setIsVisible(false);
      timer = setTimeout(() => setIsRendered(false), 300); // Must match animation duration
    }
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearTimeout(timer);
    };
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

  return createPortal(
    <div onClick={onClose} className={`modal-backdrop fixed inset-0 bg-black/50 backdrop-blur-md z-60 flex items-center justify-center p-4 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'} text-text font-sans will-change-opacity`}>
      <div onClick={(e) => e.stopPropagation()} className={`modal flex flex-col bg-panel-bg/95 backdrop-blur-xl rounded-3xl shadow-[0_16px_40px_rgba(0,0,0,0.2)] border border-white/20 dark:border-white/10 w-full h-auto max-h-[90vh] ${sizeClasses[size]} transition-all duration-300 ${isVisible ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4'} will-change-transform`}>
        <div className="modal-header flex justify-between items-center p-5 border-b border-black/5 dark:border-white/5">
          <h3 className="text-2xl font-bold tracking-tight">{title}</h3>
          <button onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-hover-bg text-gray-500 hover:text-red-500 transition-colors cursor-pointer shrink-0">
            <Icon name="X" size={24} />
          </button>
        </div>
        <div className="modal-content grow flex flex-col min-h-0">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};
