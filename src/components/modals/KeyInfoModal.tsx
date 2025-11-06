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
  if (!keyData) return <Modal isOpen={isOpen} onClose={onClose} title="Loading..."><div /></Modal>;
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('keyInfo')}>
      <div className="p-6">
        <h2 className="text-2xl font-bold text-accent mb-2">{keyData.keyTitle}</h2>
        {keyData.keyAuthors && <p className="italic text-gray-500 mb-4 flex items-center gap-2"><Icon name="Users" /> {keyData.keyAuthors}</p>}
        <p className="leading-relaxed">{keyData.keyDescription}</p>
      </div>
    </Modal>
  );
};
