import React, { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { Icon } from '../common/Icon';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false
}) => {
  const [cachedTitle, setCachedTitle] = useState(title);
  const [cachedMessage, setCachedMessage] = useState(message);
  const [cachedConfirmText, setCachedConfirmText] = useState(confirmText);
  const [cachedCancelText, setCachedCancelText] = useState(cancelText);
  const [cachedIsDestructive, setCachedIsDestructive] = useState(isDestructive);

  useEffect(() => {
    if (isOpen) {
      setCachedTitle(title);
      setCachedMessage(message);
      setCachedConfirmText(confirmText);
      setCachedCancelText(cancelText);
      setCachedIsDestructive(isDestructive);
    }
  }, [isOpen, title, message, confirmText, cancelText, isDestructive]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen && e.key === 'Enter') {
        e.preventDefault();
        onConfirm();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onConfirm, onClose]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={cachedTitle}>
      <div className="p-7 bg-bg/80 backdrop-blur-sm rounded-b-3xl">
        {typeof cachedMessage === 'string' ? (
          <p className="text-lg text-text/90 mb-8">{cachedMessage}</p>
        ) : (
          <div className="mb-8">{cachedMessage}</div>
        )}
        <div className="flex flex-col-reverse md:flex-row justify-end gap-3">
          <button onClick={onClose} className="w-full md:w-auto px-5 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-hover-bg/80 hover:shadow-sm transition-all duration-300 cursor-pointer">
            {cachedCancelText}
          </button>
          <button onClick={() => { onConfirm(); onClose(); }} className={`w-full md:w-auto justify-center px-5 py-2.5 rounded-xl font-bold text-white shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer flex items-center gap-2 border border-white/20 ${cachedIsDestructive ? 'bg-red-500/95 backdrop-blur-md hover:bg-red-600' : 'bg-accent/95 backdrop-blur-md hover:bg-accent-hover'}`}>
            {cachedIsDestructive && <Icon name="Trash2" size={18} />}
            {cachedConfirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};
