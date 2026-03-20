import React from 'react';
import { Modal } from './Modal';
import { Icon } from '../Icon';

interface AppInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  t: (key: string) => string;
}

export const AppInfoModal: React.FC<AppInfoModalProps> = ({ isOpen, onClose, t }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('aboutTaxon' as any)}>
      <div className="p-8 flex flex-col items-center text-center gap-6">
        <div className="w-24 h-24 bg-accent/10 rounded-3xl flex items-center justify-center text-accent shadow-inner">
          <Icon name="Leaf" size={48} />
        </div>
        <div>
          <h2 className="text-3xl font-black text-accent tracking-tight mb-2">Taxon</h2>
          <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Version 1.0.0</p>
        </div>
        <p className="text-lg text-text/90 leading-relaxed max-w-md">
          {t('taxonDescription' as any)}
        </p>
      </div>
    </Modal>
  );
};