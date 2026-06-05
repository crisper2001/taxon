import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Icon } from '../common/Icon';
import type { DraftKeyData } from '../../types';
import { MarkdownInput } from '../common';
import { ConfirmModal } from './ConfirmModal';

// --- BuilderMetadataModal ---
interface BuilderMetadataModalProps {
  isOpen: boolean;
  onClose: () => void;
  draftKey: DraftKeyData;
  updateDraftKey: (updater: (prev: DraftKeyData) => DraftKeyData) => void;
  t: (key: string) => string;
}
export const BuilderMetadataModal: React.FC<BuilderMetadataModalProps> = ({ isOpen, onClose, draftKey, updateDraftKey, t }) => {
  const [localTitle, setLocalTitle] = useState(draftKey.title);
  const [localAuthors, setLocalAuthors] = useState(draftKey.authors);
  const [localDescription, setLocalDescription] = useState(draftKey.description || '');
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLocalTitle(draftKey.title);
      setLocalAuthors(draftKey.authors);
      setLocalDescription(draftKey.description || '');
      setShowConfirmClose(false);
    }
  }, [isOpen, draftKey]);

  const isTitleEmpty = localTitle.trim() === '';
  const hasChanges = localTitle !== draftKey.title ||
                     localAuthors !== draftKey.authors ||
                     localDescription !== (draftKey.description || '');

  const handleSave = () => {
    if (isTitleEmpty || !hasChanges) return;
    updateDraftKey(prev => ({
      ...prev,
      title: localTitle,
      authors: localAuthors,
      description: localDescription
    }));
    onClose();
  };

  const handleClose = () => {
    if (hasChanges) {
      setShowConfirmClose(true);
    } else {
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={<div className="flex items-center gap-2 min-w-0"><Icon name="Info" size={24} className="text-gray-400 shrink-0" /><span className="truncate">{t('keyInfo')}</span></div>}>
      <div className="flex flex-col max-h-[70vh] bg-bg/80 backdrop-blur-sm rounded-b-3xl overflow-hidden">
        <div className="grow overflow-y-auto p-7 flex flex-col gap-4">
          <div className="flex flex-col gap-4 bg-panel-bg/50 backdrop-blur-sm p-4 rounded-2xl border border-white/20 dark:border-white/10 shadow-inner shrink-0 min-w-0">
            <label className="flex flex-col gap-1.5 min-w-0">
              <span className="text-sm font-semibold opacity-80 text-left">
                {t('kbTitle')} <span className="text-red-500 font-bold">*</span>
              </span>
              <input
                type="text"
                value={localTitle}
                maxLength={200}
                onChange={e => setLocalTitle(e.target.value)}
                className={`input-base text-lg font-medium ${isTitleEmpty ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20' : ''}`}
              />
              <div className="flex justify-between items-start mt-1 min-h-[1.25rem]">
                {isTitleEmpty ? (
                  <span className="text-xs text-red-500 font-semibold text-left">
                    {t('errTitleRequired')}
                  </span>
                ) : (
                  <span />
                )}
                <span className="text-xs font-normal opacity-60 ml-auto">
                  {localTitle.length} / 200
                </span>
              </div>
            </label>
            <label className="flex flex-col gap-1.5 min-w-0">
              <span className="text-sm font-semibold opacity-80 text-left">
                {t('kbAuthors')}
              </span>
              <input
                type="text"
                value={localAuthors}
                maxLength={200}
                onChange={e => setLocalAuthors(e.target.value)}
                className="input-base"
              />
              <div className="flex justify-end mt-1">
                <span className="text-xs font-normal opacity-60">
                  {localAuthors.length} / 200
                </span>
              </div>
            </label>
            <div className="relative flex flex-col min-w-0 w-full">
              <MarkdownInput
                label={t('kbDescription')}
                value={localDescription}
                maxLength={2000}
                onChange={val => setLocalDescription(val)}
                rows={6}
              />
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-white/10 shrink-0 bg-panel-bg/95 flex justify-end gap-3">
          <button
            onClick={handleSave}
            disabled={!hasChanges || isTitleEmpty}
            className="w-full md:w-auto justify-center px-5 py-2.5 rounded-xl font-bold text-white shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer flex items-center gap-2 border border-white/20 bg-accent/95 backdrop-blur-md hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icon name="Save" size={16} />
            {t('save')}
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={showConfirmClose}
        onClose={() => setShowConfirmClose(false)}
        onConfirm={() => {
          setShowConfirmClose(false);
          onClose();
        }}
        title={t('confirm' as any)}
        message={t('confirmDiscardChanges' as any)}
        confirmText={t('discard' as any)}
        cancelText={t('cancel')}
        isDestructive={true}
      />
    </Modal>
  );
};