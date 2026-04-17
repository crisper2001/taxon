import React from 'react';
import { Modal } from './Modal';
import { Icon } from '../common/Icon';
import type { DraftKeyData } from '../../types';
import { MarkdownInput } from '../common';

// --- BuilderMetadataModal ---
interface BuilderMetadataModalProps {
  isOpen: boolean;
  onClose: () => void;
  draftKey: DraftKeyData;
  updateDraftKey: (updater: (prev: DraftKeyData) => DraftKeyData) => void;
  t: (key: string) => string;
}
export const BuilderMetadataModal: React.FC<BuilderMetadataModalProps> = ({ isOpen, onClose, draftKey, updateDraftKey, t }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={<div className="flex items-center gap-2 min-w-0"><Icon name="Info" size={24} className="text-gray-400 shrink-0" /><span className="truncate">{t('keyInfo')}</span></div>}>
      <div className="p-7 bg-bg/80 backdrop-blur-sm rounded-b-3xl max-h-[70vh] overflow-y-auto">
        <div className="flex flex-col gap-4 bg-panel-bg/50 backdrop-blur-sm p-4 rounded-2xl border border-white/20 dark:border-white/10 shadow-inner shrink-0 min-w-0">
          <label className="flex flex-col gap-1.5 min-w-0">
            <span className="text-sm font-semibold opacity-80">{t('kbTitle')}</span>
            <input type="text" value={draftKey.title} onChange={e => updateDraftKey(prev => ({ ...prev, title: e.target.value }))} className="input-base text-lg font-medium" />
          </label>
          <label className="flex flex-col gap-1.5 min-w-0">
            <span className="text-sm font-semibold opacity-80">{t('kbAuthors')}</span>
            <input type="text" value={draftKey.authors} onChange={e => updateDraftKey(prev => ({ ...prev, authors: e.target.value }))} className="input-base" />
          </label>
          <div className="relative flex flex-col min-w-0 w-full">
            <MarkdownInput label={t('kbDescription')} value={draftKey.description || ''} onChange={val => updateDraftKey(prev => ({ ...prev, description: val }))} rows={6} />
          </div>
        </div>
      </div>
    </Modal>
  );
};