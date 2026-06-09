import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Icon } from '../common/Icon';
import type { Media } from '../../types';
import { ConfirmModal } from './ConfirmModal';
import { ImageLightboxModal } from './ImageLightboxModal';

interface BuilderMediaEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  media: Media | null;
  t: (key: string) => string;
  onUpdate: (updates: Partial<Media>) => void;
}

export const BuilderMediaEditModal: React.FC<BuilderMediaEditModalProps> = ({
  isOpen,
  onClose,
  media,
  t,
  onUpdate,
}) => {
  const [cachedMedia, setCachedMedia] = useState<Media | null>(null);
  const [localCaption, setLocalCaption] = useState('');
  const [localCopyright, setLocalCopyright] = useState('');
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);

  useEffect(() => {
    if (isOpen && media) {
      setCachedMedia(media);
      setLocalCaption(media.caption || '');
      setLocalCopyright(media.copyright || '');
      setShowConfirmClose(false);
      setShowLightbox(false);
    }
  }, [isOpen, media]);

  const hasChanges = media ? (
    localCaption !== (media.caption || '') ||
    localCopyright !== (media.copyright || '')
  ) : false;

  const handleSave = () => {
    if (!hasChanges) return;
    onUpdate({
      caption: localCaption,
      copyright: localCopyright
    });
    onClose();
  };

  const handleClose = () => {
    if (hasChanges) {
      setShowConfirmClose(true);
    } else {
      onClose();
    }
  };

  const modalTitle = (
    <div className="flex items-center gap-2 min-w-0">
      <Icon name="Image" size={24} className="text-gray-400" />
      <span className="truncate">{t('kbEditMedia')}</span>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={modalTitle} size="xl">
      <div className="flex flex-col md:flex-row max-h-[85vh] overflow-hidden bg-bg/80 backdrop-blur-sm rounded-b-3xl">
        {cachedMedia && (
          <>
            <div className="w-full md:w-1/2 bg-black/5 dark:bg-white/5 flex items-center justify-center p-6 relative">
              <img
                src={cachedMedia.url}
                alt={t('preview')}
                className="max-w-full max-h-full object-contain drop-shadow-md rounded-lg cursor-zoom-in hover:scale-[1.01] transition-transform duration-200"
                onClick={() => setShowLightbox(true)}
              />
            </div>
            <div className="w-full md:w-1/2 flex flex-col h-[50vh] md:h-auto overflow-hidden">
              <div className="grow overflow-y-auto p-8 flex flex-col gap-6">
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold opacity-80 text-left">
                    {t('kbCaption')}
                  </span>
                  <textarea
                    rows={4}
                    value={localCaption}
                    maxLength={500}
                    className="input-base text-sm resize-none"
                    onChange={e => setLocalCaption(e.target.value)}
                  />
                  <div className="flex justify-end mt-1">
                    <span className="text-xs font-normal opacity-60">
                      {localCaption.length} / 500
                    </span>
                  </div>
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold opacity-80 text-left">
                    {t('kbCopyright')}
                  </span>
                  <input
                    type="text"
                    value={localCopyright}
                    maxLength={200}
                    className="input-base text-sm"
                    onChange={e => setLocalCopyright(e.target.value)}
                  />
                  <div className="flex justify-end mt-1">
                    <span className="text-xs font-normal opacity-60">
                      {localCopyright.length} / 200
                    </span>
                  </div>
                </label>
              </div>

              <div className="p-5 border-t border-white/10 shrink-0 bg-panel-bg/95 flex justify-end gap-3">
                <button
                  onClick={handleSave}
                  disabled={!hasChanges}
                  className="w-full md:w-auto justify-center px-5 py-2.5 rounded-xl font-bold text-white shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer flex items-center gap-2 border border-white/20 bg-accent/95 backdrop-blur-md hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Icon name="Save" size={16} />
                  {t('save')}
                </button>
              </div>
            </div>
          </>
        )}
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

      {cachedMedia && (
        <ImageLightboxModal
          isOpen={showLightbox}
          onClose={() => setShowLightbox(false)}
          media={[cachedMedia]}
          startIndex={0}
        />
      )}
    </Modal>
  );
};