import React from 'react';
import { Modal } from './Modal';
import { Icon } from '../Icon';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
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
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="p-7">
        <p className="text-lg text-text/90 mb-8">{message}</p>
        <div className="flex flex-col-reverse md:flex-row justify-end gap-3">
          <button onClick={onClose} className="w-full md:w-auto px-5 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-hover-bg/80 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-300 cursor-pointer">
            {cancelText}
          </button>
          <button onClick={() => { onConfirm(); onClose(); }} className={`w-full md:w-auto justify-center px-5 py-2.5 rounded-xl font-bold text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer flex items-center gap-2 border border-white/20 ${isDestructive ? 'bg-red-500/95 backdrop-blur-md hover:bg-red-600 shadow-red-500/30' : 'bg-accent/95 backdrop-blur-md hover:bg-accent-hover shadow-accent/30'}`}>
            {isDestructive && <Icon name="Trash2" size={18} />}
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};