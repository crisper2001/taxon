import React from 'react';
import { Icon } from './Icon';
import { useAppContext } from '../context/AppContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const appContext = useAppContext();
  const { t, triggerImport, openPreferences } = appContext;
  const openAppInfo = (appContext as any).openAppInfo;
  const closeKey = (appContext as any).closeKey;

  return (
    <div id="sidebar" className={`md:hidden fixed top-0 left-0 h-full z-40 w-60 bg-panel-bg/90 backdrop-blur-2xl border-r border-white/20 dark:border-white/10 p-5 flex flex-col gap-5 shadow-2xl transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>

      {/* Header/Branding */}
      <div onClick={() => { closeKey(); onClose(); }} title={t('closeKey' as any)} className="pb-4 pt-2 flex items-center justify-center border-b border-black/5 dark:border-white/5 cursor-pointer hover:opacity-80 transition-opacity">
        <h2 className="text-2xl font-black flex items-center gap-2 text-accent tracking-tight">
          <Icon name="Leaf" size={28} /> Taxon
        </h2>
      </div>

      {/* Key Management Actions */}
      <div className="flex flex-col gap-2 text-sm font-semibold">
        <button onClick={triggerImport} className="flex items-center gap-3 w-full p-3 text-left rounded-xl hover:bg-hover-bg/80 hover:backdrop-blur-md transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-0.5 group">
          <Icon name="FolderOpen" className="opacity-80 group-hover:opacity-100" /> {t('openNativeKey')}
        </button>
      </div>

      {/* Settings & Info (Pushed to bottom) */}
      <div className="mt-auto flex flex-col gap-2 pt-5 border-t border-black/5 dark:border-white/5 text-sm font-semibold">
        <button onClick={openPreferences} className="flex items-center gap-3 w-full p-3 text-left rounded-xl hover:bg-hover-bg/80 hover:backdrop-blur-md transition-all duration-300 cursor-pointer hover:shadow-sm hover:-translate-y-0.5">
          <Icon name="Settings2" className="opacity-80" /> {t('preferences')}
        </button>
        <button onClick={openAppInfo} className="flex items-center gap-3 w-full p-3 text-left rounded-xl hover:bg-hover-bg/80 hover:backdrop-blur-md transition-all duration-300 cursor-pointer hover:shadow-sm hover:-translate-y-0.5">
          <Icon name="Info" className="opacity-80" /> {t('aboutTaxon' as any)}
        </button>
      </div>
    </div>
  );
};