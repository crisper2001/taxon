import React from 'react';
import { Icon } from './Icon';
import { useAppContext } from '../context/AppContext';

interface SidebarProps {
  isOpen: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen }) => {
  const { keyData, t, triggerImport, resetKey, openPreferences } = useAppContext();

  return (
    <div id="sidebar" className={`fixed top-0 left-0 h-full z-30 w-60 bg-panel-bg border-r border-border p-4 flex flex-col gap-4 shadow-lg transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>

      {/* Header/Branding */}
      <div className="pb-3 flex items-center justify-center">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Icon name="Leaf" /> Taxon
        </h2>
      </div>

      {/* Key Management Actions */}
      <div className="flex flex-col gap-1 text-sm font-medium">
        <button disabled className="flex items-center gap-3 w-full p-3 text-left rounded-md hover:bg-hover-bg disabled:text-gray-500 disabled:cursor-not-allowed transition-colors cursor-pointer">
          <Icon name="FolderOpen" /> {t('openNativeKey')}
        </button>
        <button onClick={triggerImport} className="flex items-center gap-3 w-full p-3 text-left rounded-md hover:bg-hover-bg transition-colors cursor-pointer">
          <Icon name="FileJson" /> {t('importKey')}
        </button>

        <button onClick={resetKey}
          disabled={!keyData}
          className="flex items-center gap-3 w-full p-3 text-left rounded-md hover:bg-hover-bg disabled:text-gray-500 disabled:cursor-not-allowed transition-colors cursor-pointer">
          <Icon name="RotateCcw" /> {t('resetKey')}
        </button>
      </div>

      {/* Settings & Info (Pushed to bottom) */}
      <div className="mt-auto flex flex-col gap-1 pt-4 text-sm font-medium">
        <button onClick={openPreferences} className="flex items-center gap-3 w-full p-3 text-left rounded-md hover:bg-hover-bg transition-colors cursor-pointer">
          <Icon name="Settings2" /> {t('preferences')}
        </button>
      </div>
    </div>
  );
};