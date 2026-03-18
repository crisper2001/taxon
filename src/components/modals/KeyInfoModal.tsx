import React from 'react';
import { Modal } from './Modal';
import { Icon } from '../Icon';
import type { KeyData } from '../../types';

// --- KeyInfoModal ---
interface KeyInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  keyData: KeyData | null;
  t: (key: string) => string;
}
export const KeyInfoModal: React.FC<KeyInfoModalProps> = ({ isOpen, onClose, keyData, t }) => {
  if (!keyData) return <Modal isOpen={isOpen} onClose={onClose} title={t('loading')}><div /></Modal>;
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('keyInfo')}>
      <div className="p-7">
        <h2 className="text-3xl font-black text-accent mb-3 tracking-tight">{keyData.keyTitle}</h2>
        {keyData.keyAuthors && <p className="font-semibold text-gray-500 mb-5 flex items-center gap-2 bg-panel-bg w-fit px-3 py-1.5 rounded-full border border-border shadow-sm"><Icon name="Users" size={16} /> {keyData.keyAuthors}</p>}
        <p className="leading-relaxed text-lg text-text/90">{keyData.keyDescription}</p>
      </div>
    </Modal>
  );
};
