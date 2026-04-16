import React from 'react';
import { Icon } from '../common/Icon';
import type { IconName } from '../common/Icon';
import { useAppContext } from '../../context/AppContext';

export interface SidebarAction {
  icon: IconName;
  label: string;
  onClick: () => void;
  iconClass?: string;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onExit?: () => void;
  actions?: SidebarAction[];
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, onExit, actions }) => {
  const appContext = useAppContext();
  const { t, triggerImport, openPreferences } = appContext;
  const closeKey = (appContext as any).closeKey;

  const handleExit = () => {
    if (onExit) onExit();
    else closeKey();
    onClose();
  };

  const defaultActions: SidebarAction[] = [
    { icon: 'FolderOpen', label: t('openNativeKey'), onClick: triggerImport }
  ];

  const displayActions = actions || defaultActions;

  return (
    <>
      <div id="sidebar" className={`md:hidden fixed top-0 left-0 h-full z-40 w-60 bg-panel-bg/90 backdrop-blur-2xl border-r border-white/20 dark:border-white/10 p-5 flex flex-col gap-5 shadow-2xl transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>

        {/* Header/Branding */}
        <div className="pb-4 pt-2 border-b border-black/5 dark:border-white/5">
          <button onClick={handleExit} title={t('closeKey' as any)} className="flex items-center justify-center gap-3 w-full p-3 rounded-xl hover:bg-hover-bg/80 hover:backdrop-blur-md transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md border border-transparent dark:border-white/10 dark:hover:border-white/20 group">
            <h2 className="text-2xl font-black flex items-center gap-2 text-accent tracking-tight group-hover:opacity-100">
              <img src="logo.svg" alt="Taxon Logo" className="h-6 dark:hidden" />
              <img src="logo-dark.svg" alt="Taxon Logo" className="h-6 hidden dark:block" />
            </h2>
          </button>
        </div>

        {/* Key Management Actions */}
        <div className="flex flex-col gap-2 text-sm font-semibold">
          {displayActions.map((action, idx) => (
            <button key={idx} onClick={() => { action.onClick(); onClose(); }} className="flex items-center gap-3 w-full p-3 text-left rounded-xl hover:bg-hover-bg/80 hover:backdrop-blur-md transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md border border-transparent dark:border-white/10 dark:hover:border-white/20 group">
              <Icon name={action.icon} className={`opacity-80 group-hover:opacity-100 ${action.iconClass || ''}`} /> {action.label}
            </button>
          ))}
        </div>

        {/* Settings & Info (Pushed to bottom) */}
        <div className="mt-auto flex flex-col gap-2 pt-5 border-t border-black/5 dark:border-white/5 text-sm font-semibold">
          <button onClick={() => { openPreferences(); onClose(); }} className="flex items-center gap-3 w-full p-3 text-left rounded-xl hover:bg-hover-bg/80 hover:backdrop-blur-md transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md border border-transparent dark:border-white/10 dark:hover:border-white/20 group">
            <Icon name="Settings2" className="opacity-80 group-hover:opacity-100" /> {t('preferences')}
          </button>
        </div>
      </div>

      {/* Mobile Sidebar Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden" onClick={onClose} />
      )}
    </>
  );
};
