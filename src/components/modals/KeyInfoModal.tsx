import React from 'react';
import { Modal } from './Modal';
import { Icon } from '../common/Icon';
import type { KeyData } from '../../types';
import { Markdown } from '../common';

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
      <div className="p-7 bg-bg/80 backdrop-blur-sm rounded-b-3xl">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <h2 className="text-3xl font-black text-accent tracking-tight">{keyData.keyTitle}</h2>
        </div>
        {keyData.keyAuthors && <p className="font-semibold text-gray-500 mb-5 flex items-center gap-2 bg-bg/80 backdrop-blur-sm w-fit px-3 py-1.5 rounded-full border border-white/20 dark:border-white/10 shadow-inner"><Icon name="Users" size={16} /> {keyData.keyAuthors}</p>}
        <Markdown content={keyData.keyDescription || ''} className="text-lg opacity-90" />
      </div>
    </Modal>
  );
};
