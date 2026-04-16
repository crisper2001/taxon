import React from 'react';
import { Modal } from './Modal';
import { Icon } from '../common/Icon';

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
  version: string;
  t: (key: string) => string;
}

export const ChangelogModal: React.FC<ChangelogModalProps> = ({ isOpen, onClose, version, t }) => {
  const titleRaw = t('whatsNew' as any) || "What's New in {version}";
  const title = titleRaw.replace('{version}', version);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={<div className="flex items-center gap-2 min-w-0"><Icon name="Sparkles" size={24} className="text-accent shrink-0" /><span className="truncate">{title}</span></div>}>
      <div className="p-7 bg-bg/80 backdrop-blur-sm rounded-b-3xl max-h-[75vh] overflow-y-auto custom-scrollbar">
        <div className="flex flex-col gap-8">

          {/* New Features */}
          <div className="flex flex-col gap-3">
            <h3 className="font-bold text-accent flex items-center gap-2 text-lg">
              <Icon name="Sparkles" size={20} />
              {t('newFeatures' as any) || 'New Features'}
            </h3>
            <ul className="list-disc pl-5 space-y-2 text-text/90 font-medium">
              <li>{t('changelogFeat1' as any) || 'Support for reordering features, states, and entities'}</li>
              <li>{t('changelogFeat2' as any) || 'Search boxes in create mode'}</li>
              <li>{t('changelogFeat3' as any) || 'Match types for features'}</li>
              <li>{t('changelogFeat4' as any) || 'Options to consider uncertain and misinterpreted features'}</li>
              <li>{t('changelogFeat5' as any) || 'Option to toggle animations'}</li>
            </ul>
          </div>

          {/* Improvements */}
          <div className="flex flex-col gap-3">
            <h3 className="font-bold text-blue-500 flex items-center gap-2 text-lg">
              <Icon name="TrendingUp" size={20} />
              {t('improvements' as any) || 'Improvements'}
            </h3>
            <ul className="list-disc pl-5 space-y-2 text-text/90 font-medium">
              <li>{t('changelogMod1' as any) || '"New Key" and "Save Key" icons changed'}</li>
              <li>{t('changelogMod2' as any) || 'Auto-convert Lucid keys to native format'}</li>
              <li>{t('changelogMod3' as any) || 'Better support for Lucid keys'}</li>
              <li>{t('changelogMod4' as any) || 'Ubuntu Sans is now the default font'}</li>
              <li>{t('changelogMod5' as any) || 'Display logic of the save key modal before creating or opening a new key'}</li>
              <li>{t('changelogMod6' as any) || 'General refactoring'}</li>
            </ul>
          </div>

          {/* Bug Fixes */}
          <div className="flex flex-col gap-3">
            <h3 className="font-bold text-red-500 flex items-center gap-2 text-lg">
              <Icon name="Bug" size={20} />
              {t('bugFixes' as any) || 'Bug Fixes'}
            </h3>
            <ul className="list-disc pl-5 space-y-2 text-text/90 font-medium">
              <li>{t('changelogFix1' as any) || '"New Key" modal no longer turns into the "Open Key" modal when closed'}</li>
              <li>{t('changelogFix2' as any) || 'Feature editing modal title no longer displays the name of the last opened state'}</li>
              <li>{t('changelogFix3' as any) || 'Mobile sidebar background no longer disappears before the buttons'}</li>
              <li>{t('changelogFix4' as any) || 'Modal opening animations are no longer skipped'}</li>
            </ul>
          </div>

        </div>
      </div>
    </Modal>
  );
};