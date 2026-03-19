import React from 'react';
import { Icon } from './Icon';
import { useAppContext } from '../context/AppContext';

export const EmptyState: React.FC = () => {
  const { isLoading, error, statusText, triggerImport, t } = useAppContext();

  return (
    <div className="grow flex flex-col items-center justify-center p-4 text-center">
      {isLoading ? (
        <span className="animate-pulse text-2xl font-bold text-accent tracking-tight flex items-center gap-3">
          <Icon name="LoaderCircle" className="animate-spin" size={28} /> {statusText}
        </span>
      ) : error ? (
        <div className="flex flex-col items-center gap-4 max-w-md bg-red-500/10 backdrop-blur-md p-6 rounded-3xl border border-red-500/30 text-red-500 shadow-inner">
          {/* <Icon name="AlertCircle" size={40} /> */}
          <span className="text-lg font-bold tracking-tight">{statusText}</span>
        </div>
      ) : (
        <>
          <h2 className="text-6xl font-black flex items-center justify-center gap-4 mb-10 animate-fade-in-up text-accent tracking-tight">
            <Icon name="Leaf" size={60} /> Taxon
          </h2>
          <button onClick={triggerImport} className="flex flex-col items-center gap-5 p-12 rounded-[2rem] hover:bg-panel-bg/80 hover:backdrop-blur-xl transition-all duration-500 cursor-pointer border-2 border-dashed border-white/20 dark:border-white/10 hover:border-accent/50 hover:shadow-2xl hover:shadow-accent/10 shadow-lg group bg-bg/50 backdrop-blur-sm hover:-translate-y-1">
            <Icon name="FolderOpen" size={56} className="text-accent opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300" />
            <span className="text-xl font-bold text-text tracking-tight">{t('importKey')}</span>
            <span className="text-base text-gray-500 font-medium">{t('loadKeyPrompt')}</span>
          </button>
        </>
      )}
    </div>
  );
};
