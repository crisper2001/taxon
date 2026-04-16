import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Icon } from '../common/Icon';
import type { Media } from '../../types';

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
  const [cachedMedia, setCachedMedia] = useState<Media | null>(media);

  useEffect(() => {
    if (isOpen) {
      setCachedMedia(media);
    }
  }, [isOpen, media]);

  const modalTitle = (
    <div className="flex items-center gap-2 min-w-0">
      <Icon name="Image" size={24} className="text-gray-400" />
      <span className="truncate">{t('kbEditMedia')}</span>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} size="xl">
      <div className="flex flex-col md:flex-row max-h-[85vh] overflow-hidden bg-bg/80 backdrop-blur-sm rounded-b-3xl">
        {cachedMedia && (
          <>
            <div className="w-full md:w-1/2 bg-black/5 dark:bg-white/5 flex items-center justify-center p-6 relative">
              <img src={cachedMedia.url} alt={t('preview')} className="max-w-full max-h-full object-contain drop-shadow-md rounded-lg" />
            </div>
            <div className="w-full md:w-1/2 p-8 flex flex-col gap-6 overflow-y-auto">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold opacity-80">{t('kbCaption')}</span>
                <textarea
                  rows={4}
                  value={cachedMedia.caption || ''}
                  className="input-base text-sm resize-none"
                  onChange={e => onUpdate({ caption: e.target.value })}
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold opacity-80">{t('kbCopyright')}</span>
                <input
                  type="text"
                  value={cachedMedia.copyright || ''}
                  className="input-base text-sm"
                  onChange={e => onUpdate({ copyright: e.target.value })}
                />
              </label>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};