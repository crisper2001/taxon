import React from 'react';
import { Icon } from './Icon';
import { useAppContext } from '../context/AppContext';

export const EmptyState: React.FC = () => {
  const { isLoading, error, statusText, triggerImport, t } = useAppContext();

  return (
    <div className="grow flex flex-col items-center justify-center p-4 text-center">
      {isLoading ? (
        <span className="animate-pulse">{statusText}</span>
      ) : error ? (
        <span className="text-red-500">{statusText}</span>
      ) : (
        <>
          <h2 className="text-6xl font-bold flex items-center justify-center gap-3 mb-8 animate-fade-in-up">
            <Icon name="Leaf" size={60} /> Taxon
          </h2>
          <button onClick={triggerImport} className="flex flex-col items-center gap-4 p-8 rounded-lg hover:bg-hover-bg transition-colors cursor-pointer border-2 border-dashed border-border">
            <Icon name="FolderOpen" size={48} className="text-accent" />
            <span className="text-lg font-medium text-text">{t('importKey')}</span>
            <span className="text-sm text-gray-500">{t('loadKeyPrompt')}</span>
          </button>
        </>
      )}
    </div>
  );
};
