import React, { useState } from 'react';
import { Icon, type IconName } from '../Icon';

interface PanelProps {
  title: string;
  icon?: IconName;
  count: number;
  onSearch?: (term: string) => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  currentMatchIndex?: number;
  matchCount?: number;
  onPrevMatch?: () => void;
  onNextMatch?: () => void;
}

export const Panel: React.FC<PanelProps> = ({ title, icon, count, onSearch, children, footer, currentMatchIndex, matchCount, onPrevMatch, onNextMatch }) => {
  const [searchValue, setSearchValue] = useState('');

  return (
    <div className="panel flex flex-col h-full w-full bg-panel-bg border border-border rounded-lg shadow-md overflow-hidden relative">
      <div className="panel-header flex items-center justify-between p-3 border-b border-border bg-header-bg shrink-0">
        <div className="panel-title font-semibold flex items-center gap-2 whitespace-nowrap">
          {icon && <Icon name={icon} />}
          <span>{title}</span>
          <span className="panel-count bg-accent text-white text-xs font-bold px-2 py-0.5 rounded-full">{count}</span>
        </div>
        {onSearch && (() => {
          const hasMatches = matchCount !== undefined && matchCount > 0;
          return (
            <div className={`search-container group flex items-center gap-1 py-1 px-2 rounded-full relative transition-all duration-300 hover:bg-panel-bg focus-within:bg-panel-bg ${hasMatches || searchValue ? 'bg-panel-bg' : ''}`}>
              <Icon name="Search" className="cursor-pointer shrink-0 text-gray-500" />
              <input
                type="search"
                value={searchValue}
                onChange={(e) => {
                  setSearchValue(e.target.value);
                  onSearch(e.target.value);
                }}
                placeholder="Search..."
                className={`transition-all duration-300 ease-in-out border-none bg-transparent outline-none text-sm p-0 ${hasMatches || searchValue ? 'w-24 opacity-100' : 'w-0 opacity-0 group-hover:w-32 group-hover:opacity-100 focus:w-32 focus:opacity-100'}`}
              />
              {searchValue && (
                <button type="button" onClick={() => { setSearchValue(''); onSearch(''); }} className="p-0.5 hover:bg-accent/20 rounded cursor-pointer flex items-center justify-center text-gray-500 hover:text-accent transition-colors shrink-0" title="Clear Search">
                  <Icon name="X" size={14} />
                </button>
              )}
              {hasMatches && (
                <div className="flex items-center gap-0.5 transition-opacity opacity-100 text-accent">
                  <span className="text-xs font-medium whitespace-nowrap px-1">{currentMatchIndex! + 1} / {matchCount}</span>
                  <button type="button" onClick={onPrevMatch} className="p-0.5 hover:bg-accent/20 rounded cursor-pointer flex items-center justify-center" title="Previous Match"><Icon name="ChevronUp" size={14} /></button>
                  <button type="button" onClick={onNextMatch} className="p-0.5 hover:bg-accent/20 rounded cursor-pointer flex items-center justify-center" title="Next Match"><Icon name="ChevronDown" size={14} /></button>
                </div>
              )}
            </div>
          );
        })()}
      </div>
      <div className="panel-content overflow-y-auto grow p-2">
        {children}
      </div>
      {footer && <div className="panel-footer absolute bottom-2 right-2 z-10">{footer}</div>}
    </div>
  );
};
