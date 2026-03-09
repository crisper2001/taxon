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
    <div className="header-controls flex items-center p-2 bg-panel-bg border-b border-border gap-4 shrink-0 justify-between">
      <button onClick={() => setSidebarOpen(!isSidebarOpen)} title={t('toggleMenu')} className="p-2 rounded-md hover:bg-hover-bg cursor-pointer">
        <Icon name={isSidebarOpen ? "PanelLeftClose" : "PanelLeftOpen"} />
      </button>
      <button id="status-display" onClick={openKeyInfo} disabled={!keyData || isLoading || !!error} className="text-center italic text-gray-500 disabled:cursor-default enabled:cursor-pointer enabled:not-italic enabled:font-medium enabled:text-text p-1 rounded-md hover:enabled:bg-hover-bg">
        {statusText}
      </button>
      <button onClick={() => setAiPanelVisible(true)} disabled={isAiPanelVisible} title={isAiPanelVisible ? undefined : t('assistant')} aria-hidden={isAiPanelVisible} className={`p-2 rounded-md transition-opacity duration-300 ${isAiPanelVisible ? 'opacity-0 pointer-events-none' : 'hover:bg-hover-bg cursor-pointer'}`}>
        <Spot primaryColor="currentColor" secondaryColor="#f8fafb" mode="head" className="w-7 text-accent" />
      </button>
    </div>
  );
};
