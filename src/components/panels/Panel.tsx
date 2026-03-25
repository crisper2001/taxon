import React, { useState, useRef } from 'react';
import { Icon, type IconName } from '../common/Icon';
import { useAppContext } from '../../context/AppContext';

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
  actionButton?: React.ReactNode;
  onMouseEnter?: React.MouseEventHandler<HTMLDivElement>;
  onMouseLeave?: React.MouseEventHandler<HTMLDivElement>;
}

export const Panel: React.FC<PanelProps> = ({ title, icon, count, onSearch, children, footer, currentMatchIndex, matchCount, onPrevMatch, onNextMatch, actionButton, onMouseEnter, onMouseLeave }) => {
  const [searchValue, setSearchValue] = useState('');
  const { t } = useAppContext();
  const searchInputRef = useRef<HTMLInputElement>(null);

  return (
    <div 
      className="panel flex flex-col h-full w-full bg-panel-bg/90 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-3xl shadow-lg overflow-hidden relative"
    >
      <div className="panel-header flex items-center justify-between p-3.5 border-b border-white/10 dark:border-white/5 bg-header-bg/85 backdrop-blur-md shadow-sm shrink-0 z-10">
        <div className="panel-title font-bold flex items-center gap-2 whitespace-nowrap text-text tracking-tight min-w-0 pr-2">
          {icon && <Icon name={icon} className="text-accent opacity-90 shrink-0" />}
          <span className="truncate">{title}</span>
          <span className="panel-count bg-accent text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm shrink-0">{count}</span>
        </div>
        <div className="flex items-center gap-2">
          {actionButton}
          {onSearch && (() => {
            const hasMatches = matchCount !== undefined && matchCount > 0;
            return (
              <div 
                className={`search-container group flex items-center gap-1 py-1.5 px-3 rounded-full relative transition-all duration-300 focus-within:bg-bg/80 focus-within:shadow-inner focus-within:backdrop-blur-md border border-transparent focus-within:border-white/10 cursor-text shrink-0 ${hasMatches || searchValue ? 'bg-bg/80 shadow-inner backdrop-blur-md border-white/10' : 'hover:bg-bg/50 cursor-pointer'}`}
                onClick={() => searchInputRef.current?.focus()}
              >
                <Icon name="Search" className="shrink-0 text-gray-500" />
                <input
                  ref={searchInputRef}
                  type="search"
                  value={searchValue}
                  onChange={(e) => {
                    setSearchValue(e.target.value);
                    onSearch(e.target.value);
                  }}
                  placeholder={t('search')}
                  className={`transition-all duration-300 ease-in-out border-none bg-transparent outline-none text-sm p-0 ${hasMatches || searchValue ? 'w-24 opacity-100' : 'w-0 opacity-0 group-hover:w-32 group-hover:opacity-100 focus:w-32 focus:opacity-100'}`}
                />
                {searchValue && (
                  <button type="button" onClick={(e) => { e.stopPropagation(); setSearchValue(''); onSearch(''); searchInputRef.current?.focus(); }} className="p-0.5 hover:bg-accent/20 rounded cursor-pointer flex items-center justify-center text-gray-500 hover:text-accent transition-colors shrink-0" title={t('clearSearch')}>
                    <Icon name="X" size={14} />
                  </button>
                )}
                {hasMatches && (
                  <div className="flex items-center gap-0.5 transition-opacity opacity-100 text-accent">
                    <span className="text-xs font-medium whitespace-nowrap px-1">{currentMatchIndex! + 1} / {matchCount}</span>
                    <button type="button" onClick={(e) => { e.stopPropagation(); onPrevMatch?.(); }} className="p-0.5 hover:bg-accent/20 rounded cursor-pointer flex items-center justify-center" title={t('prevMatch')}><Icon name="ChevronUp" size={14} /></button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); onNextMatch?.(); }} className="p-0.5 hover:bg-accent/20 rounded cursor-pointer flex items-center justify-center" title={t('nextMatch')}><Icon name="ChevronDown" size={14} /></button>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>
      <div 
        className="panel-content overflow-y-auto grow p-2"
        style={{ contain: 'content' }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {children}
      </div>
      {footer && (
        <div className="panel-footer absolute bottom-2 right-2 z-10" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
          {footer}
        </div>
      )}
    </div>
  );
};
