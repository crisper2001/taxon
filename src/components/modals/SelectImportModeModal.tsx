import React, { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { Icon } from '../common/Icon';
import { translations } from '../../constants';

interface SelectImportModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  file?: File;
  onSelectMode: (mode: 'identify' | 'build') => void;
  t: (key: keyof typeof translations['en']) => string;
}

export const SelectImportModeModal: React.FC<SelectImportModeModalProps> = ({
  isOpen,
  onClose,
  file,
  onSelectMode,
  t
}) => {
  const [cachedFile, setCachedFile] = useState<File | undefined>(file);

  useEffect(() => {
    if (isOpen && file) {
      setCachedFile(file);
    }
  }, [isOpen, file]);

  const modalTitle = (
    <div className="flex items-center gap-2 min-w-0">
      <Icon name="FolderOpen" size={24} className="shrink-0 text-accent" />
      <span className="truncate">{t('openNativeKey')}</span>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle}>
      <div className="p-7 bg-bg/80 backdrop-blur-sm rounded-b-3xl">
        <p className="text-lg text-text/90 mb-8">
          {t('selectImportModePrompt')}
          {cachedFile && (
            <span className="block text-sm font-semibold text-accent mt-1 truncate">
              {cachedFile.name}
            </span>
          )}
        </p>
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          {/* Identify Button */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => onSelectMode('identify')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectMode('identify');
              }
            }}
            className="flex-1 flex flex-col items-center gap-3 p-6 bg-panel-bg border border-transparent dark:border-white/10 hover:border-accent hover:shadow-lg rounded-2xl cursor-pointer transition-all group text-center"
          >
            <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
              <Icon name="FolderOpen" className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-text mb-1">{t('startOpenKey')}</h4>
              <p className="text-xs text-gray-500 line-clamp-2">{t('startOpenKeyDesc')}</p>
            </div>
          </div>

          {/* Build Button */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => onSelectMode('build')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectMode('build');
              }
            }}
            className="flex-1 flex flex-col items-center gap-3 p-6 bg-panel-bg border border-transparent dark:border-white/10 hover:border-accent hover:shadow-lg rounded-2xl cursor-pointer transition-all group text-center"
          >
            <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
              <Icon name="PenTool" className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-text mb-1">{t('startCreateKey')}</h4>
              <p className="text-xs text-gray-500 line-clamp-2">{t('startCreateKeyDesc')}</p>
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-hover-bg/80 hover:shadow-sm transition-all duration-300 cursor-pointer"
          >
            {t('cancel')}
          </button>
        </div>
      </div>
    </Modal>
  );
};
