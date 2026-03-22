import React from 'react';
import { Icon } from '../Icon';
import type { DraftKeyData } from '../../types';
import { MarkdownInput } from '../common/MarkdownInput';

interface BuilderMetadataTabProps {
  draftKey: DraftKeyData;
  updateDraftKey: (updater: (prev: DraftKeyData) => DraftKeyData) => void;
  t: (key: string) => string;
}

export const BuilderMetadataTab: React.FC<BuilderMetadataTabProps> = ({ draftKey, updateDraftKey, t }) => {
  return (
    <div className="flex flex-col gap-5 animate-fade-in p-6 overflow-y-auto">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold opacity-80">{t('kbTitle')}</span>
        <input type="text" value={draftKey.title} onChange={e => updateDraftKey(prev => ({...prev, title: e.target.value}))} className="input-base text-lg font-medium" />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold opacity-80">{t('kbAuthors')}</span>
        <input type="text" value={draftKey.authors} onChange={e => updateDraftKey(prev => ({...prev, authors: e.target.value}))} className="input-base" />
      </label>
      <MarkdownInput label={t('kbDescription')} value={draftKey.description || ''} onChange={val => updateDraftKey(prev => ({...prev, description: val}))} rows={6} />
    </div>
  );
};