import React from 'react';
import { Icon } from './Icon';
import { useAppContext } from '../context/AppContext';

interface SidebarProps {
  isOpen: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen }) => {
  const { t, triggerImport, triggerOpenNativeKey, openPreferences, appMode, setAppMode } = useAppContext();

  return (
    <div id="sidebar" className={`fixed top-0 left-0 h-full z-30 w-60 bg-panel-bg/90 backdrop-blur-2xl border-r border-white/20 dark:border-white/10 p-5 flex flex-col gap-5 shadow-2xl transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>

      {/* Header/Branding */}
      <div className="pb-4 pt-2 flex items-center justify-center border-b border-black/5 dark:border-white/5">
        <h2 className="text-2xl font-black flex items-center gap-2 text-accent tracking-tight">
          <Icon name="Leaf" size={28} /> Taxon
        </h2>
      </div>

      {/* Mode Switcher */}
      <div className="flex bg-bg/80 backdrop-blur-sm rounded-xl p-1 shadow-inner border border-white/20 dark:border-white/10">
        <button
          onClick={() => setAppMode('identify')}
          className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition-all cursor-pointer ${appMode === 'identify' ? 'bg-accent text-white shadow-sm' : 'text-text opacity-70 hover:opacity-100 hover:bg-hover-bg'}`}
        >
          Identify
        </button>
        <button
          onClick={() => setAppMode('build')}
          className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition-all cursor-pointer ${appMode === 'build' ? 'bg-accent text-white shadow-sm' : 'text-text opacity-70 hover:opacity-100 hover:bg-hover-bg'}`}
        >
          Build
        </button>
      </div>

      {/* Key Management Actions */}
      <div className="flex flex-col gap-2 text-sm font-semibold">
        <button onClick={triggerOpenNativeKey} className="flex items-center gap-3 w-full p-3 text-left rounded-xl hover:bg-hover-bg/80 hover:backdrop-blur-md transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-0.5 group">
          <Icon name="FileJson" className="opacity-80 group-hover:opacity-100" /> {t('openNativeKey')}
        </button>
        <button onClick={triggerImport} disabled={appMode === 'build'} className="flex items-center gap-3 w-full p-3 text-left rounded-xl hover:bg-hover-bg/80 hover:backdrop-blur-md transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-sm disabled:hover:bg-transparent group">
          <Icon name="FolderOpen" className="opacity-80 group-hover:opacity-100" /> {t('importKey')}
        </button>
      </div>

      {/* Settings & Info (Pushed to bottom) */}
      <div className="mt-auto flex flex-col gap-2 pt-5 border-t border-black/5 dark:border-white/5 text-sm font-semibold">
        <button onClick={openPreferences} className="flex items-center gap-3 w-full p-3 text-left rounded-xl hover:bg-hover-bg/80 hover:backdrop-blur-md transition-all duration-300 cursor-pointer hover:shadow-sm hover:-translate-y-0.5">
          <Icon name="Settings2" className="opacity-80" /> {t('preferences')}
        </button>
      </div>
    </div>
  );
};