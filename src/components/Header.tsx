import React from 'react';
import { Icon } from './Icon';
import Spot from './Spot';
import { useAppContext } from '../context/AppContext';

interface HeaderProps {
  isSidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({ isSidebarOpen, setSidebarOpen }) => {
  const { keyData, isLoading, error, statusText, isAiPanelVisible, setAiPanelVisible, openKeyInfo, t } = useAppContext();

  if (!keyData) return null;

  return (
    <div className="header-controls flex items-center p-2.5 bg-panel-bg/95 backdrop-blur-md border-b border-border gap-4 shrink-0 justify-between z-20 shadow-sm">
      <button onClick={() => setSidebarOpen(!isSidebarOpen)} title={t('toggleMenu')} className="p-2 rounded-full hover:bg-hover-bg cursor-pointer transition-colors opacity-80 hover:opacity-100">
        <Icon name={isSidebarOpen ? "PanelLeftClose" : "PanelLeftOpen"} size={22} />
      </button>
      <button id="status-display" onClick={openKeyInfo} disabled={!keyData || isLoading || !!error} className="text-center italic text-gray-500 disabled:cursor-default enabled:cursor-pointer enabled:not-italic enabled:font-bold enabled:text-text px-4 py-1.5 rounded-full hover:enabled:bg-hover-bg transition-colors tracking-tight">
        {statusText}
      </button>
      <button onClick={() => setAiPanelVisible(true)} disabled={isAiPanelVisible} title={isAiPanelVisible ? undefined : t('assistant')} aria-hidden={isAiPanelVisible} className={`p-2 rounded-full transition-all duration-300 ${isAiPanelVisible ? 'opacity-0 scale-90 pointer-events-none' : 'opacity-90 hover:opacity-100 hover:bg-hover-bg hover:scale-105 cursor-pointer shadow-sm border border-transparent hover:border-border hover:shadow-md'}`}>
        <Spot primaryColor="currentColor" secondaryColor="#f8fafb" mode="head" className="w-6 h-6 text-accent" />
      </button>
    </div>
  );
};
