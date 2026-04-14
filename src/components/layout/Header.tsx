import React from 'react';
import { Icon } from '../common/Icon';
import { Spot } from '../common/Spot';
import { useAppContext } from '../../context/AppContext';

interface HeaderProps {
  isSidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  leftActions?: React.ReactNode;
  centerContent?: React.ReactNode;
  onLogoClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ isSidebarOpen, setSidebarOpen, leftActions, centerContent, onLogoClick }) => {
  const appContext = useAppContext();
  const { keyData, isLoading, error, statusText, isAiPanelVisible, setAiPanelVisible, openKeyInfo, t, appMode, triggerOpenNativeKey, exportLoadedKeyToNative, openPreferences, enableAi } = appContext;
  const closeKey = (appContext as any).closeKey;
  const handleLogoClick = onLogoClick || closeKey;

  return (
    <div className="header-controls animate-header-in relative flex items-center p-2 md:p-2.5 bg-panel-bg/85 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl md:rounded-3xl m-2 mb-0 md:m-4 md:mb-0 gap-4 shrink-0 justify-between z-20 shadow-lg">
      {/* Left section: Mobile hamburger + Desktop Menu */}
      <div className="flex items-center gap-2 relative w-10 md:w-auto transition-all z-30">
        <button onClick={() => setSidebarOpen(!isSidebarOpen)} title={t('toggleMenu')} className="md:hidden p-2 rounded-full transition-all duration-300 opacity-90 hover:opacity-100 hover:bg-hover-bg/80 cursor-pointer shadow-sm border border-transparent dark:border-white/10 hover:border-black/10 dark:hover:border-white/20 hover:shadow-md flex items-center justify-center text-accent">
          <Icon name="Leaf" size={24} />
        </button>

        {/* Desktop Brand */}
        <div onClick={handleLogoClick} title={t('closeKey' as any)} className="hidden md:flex items-center gap-2 px-3 py-1.5 shrink-0 rounded-full transition-all duration-300 opacity-90 hover:opacity-100 hover:bg-hover-bg/80 cursor-pointer shadow-sm border border-transparent dark:border-white/10 hover:border-black/10 dark:hover:border-white/20 hover:shadow-md">
          <Icon name="Leaf" size={24} className="text-accent" />
          <span className="font-black text-xl tracking-tight text-accent">Taxon</span>
        </div>

        {/* Desktop Horizontal Menu */}
        <div className="hidden md:flex items-center gap-2 ml-2">
          {leftActions || (
            <>
              <button onClick={triggerOpenNativeKey} title={t('openNativeKey')} className="p-2 rounded-full transition-all duration-300 opacity-90 hover:opacity-100 hover:bg-hover-bg/80 cursor-pointer shadow-sm border border-transparent dark:border-white/10 hover:border-black/10 dark:hover:border-white/20 hover:shadow-md flex items-center justify-center shrink-0">
                <Icon name="FolderOpen" size={24} className="opacity-80" />
              </button>

              <button onClick={openPreferences} title={t('preferences')} className="p-2 rounded-full transition-all duration-300 opacity-90 hover:opacity-100 hover:bg-hover-bg/80 cursor-pointer shadow-sm border border-transparent dark:border-white/10 hover:border-black/10 dark:hover:border-white/20 hover:shadow-md flex items-center justify-center shrink-0">
                <Icon name="Settings2" size={24} className="opacity-80" />
              </button>
            </>
          )}
        </div>
      </div>

      {centerContent || (
        <button id="status-display" onClick={openKeyInfo} disabled={!keyData || isLoading || !!error || appMode === 'build'} className="absolute left-1/2 -translate-x-1/2 text-center italic text-gray-500 disabled:cursor-default enabled:cursor-pointer enabled:not-italic enabled:font-bold enabled:text-text px-3 md:px-4 py-1.5 tracking-tight flex items-center justify-center gap-2 overflow-hidden max-w-[150px] sm:max-w-xs md:max-w-md text-sm md:text-base z-10 rounded-full transition-all duration-300 enabled:opacity-90 enabled:hover:opacity-100 enabled:hover:bg-hover-bg/80 shadow-sm border border-transparent dark:border-white/10 enabled:hover:border-black/10 dark:enabled:hover:border-white/20 enabled:hover:shadow-md">
          <span className="truncate">{appMode === 'build' ? t('builderMode') : statusText}</span>
        </button>
      )}
      <div className="flex items-center z-20">
        {enableAi && (appMode === 'build' || (appMode === 'identify' && keyData)) ? (
          <button onClick={() => setAiPanelVisible(true)} disabled={isAiPanelVisible} title={isAiPanelVisible ? undefined : t('assistant')} aria-hidden={isAiPanelVisible} className={`p-2 rounded-full transition-all duration-300 ${isAiPanelVisible ? 'opacity-0 scale-90 pointer-events-none' : 'opacity-90 hover:opacity-100 hover:bg-hover-bg/80 cursor-pointer shadow-sm border border-transparent dark:border-white/10 hover:border-black/10 dark:hover:border-white/20 hover:shadow-md'}`}>
            <Spot primaryColor="currentColor" secondaryColor="#f8fafb" mode="head" className="w-6 h-6 text-accent" />
          </button>
        ) : (
          <div className="w-10"></div>
        )}
      </div>
    </div>
  );
};
