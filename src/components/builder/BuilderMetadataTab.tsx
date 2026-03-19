import React from 'react';
import { Icon } from '../Icon';
import type { DraftKeyData } from '../../types';

interface BuilderMetadataTabProps {
  draftKey: DraftKeyData;
  updateDraftKey: (updater: (prev: DraftKeyData) => DraftKeyData) => void;
  t: (key: string) => string;
}

export const BuilderMetadataTab: React.FC<BuilderMetadataTabProps> = ({ draftKey, updateDraftKey, t }) => {
  return (
    <div className="flex flex-col gap-5 max-w-2xl animate-fade-in p-8 overflow-y-auto">
      <div className="flex items-center gap-3 mb-2">
        <Icon name="FileText" className="text-accent" size={28} />
        <h3 className="text-2xl font-bold text-accent">{t('kbMetadata')}</h3>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold opacity-80">{t('kbTitle')}</span>
        <input type="text" value={draftKey.title} onChange={e => updateDraftKey(prev => ({...prev, title: e.target.value}))} className="p-3 bg-bg border border-border rounded-xl focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent text-text text-lg font-medium shadow-sm transition-all" />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold opacity-80">{t('kbAuthors')}</span>
        <input type="text" value={draftKey.authors} onChange={e => updateDraftKey(prev => ({...prev, authors: e.target.value}))} className="p-3 bg-bg border border-border rounded-xl focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent text-text shadow-sm transition-all" />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold opacity-80">{t('kbDescription')}</span>
        <textarea rows={6} value={draftKey.description} onChange={e => updateDraftKey(prev => ({...prev, description: e.target.value}))} className="p-3 bg-bg border border-border rounded-xl focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none text-text shadow-sm transition-all" />
      </label>
    </div>
  );
};