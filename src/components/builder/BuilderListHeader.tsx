import React from 'react';
import { Icon } from '../common/Icon';

export interface BuilderListHeaderProps {
  title: string;
  icon: any;
  count1: number;
  count1Title?: string;
  count2?: number;
  count2Title?: string;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  matchCount: number;
  currentMatchIndex: number;
  setCurrentMatchIndex: React.Dispatch<React.SetStateAction<number>>;
  onAdd?: () => void;
  addTitle?: string;
  addLabel?: string;
  t: (key: string) => string;
}

export const BuilderListHeader: React.FC<BuilderListHeaderProps> = ({
  title, icon, count1, count1Title, count2, count2Title,
  searchTerm, setSearchTerm, searchInputRef, matchCount,
  currentMatchIndex, setCurrentMatchIndex, onAdd, addTitle, addLabel, t
}) => {
  return (
    <div className="flex items-center justify-between p-3.5 border-b border-white/10 dark:border-white/5 bg-header-bg/85 backdrop-blur-md shadow-sm shrink-0 z-10">
      <div className="panel-title font-bold flex-1 min-w-0 flex items-center gap-2 whitespace-nowrap tracking-tight pr-2">
        <Icon name={icon} size={24} className="shrink-0 text-accent opacity-90" />
        <span className="truncate min-w-0 text-accent text-lg bg-transparent" title={title}>{title}</span>
        <div className="flex items-center gap-1 shrink-0">
          <span className="bg-accent text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm" title={count1Title}>{count1}</span>
          {count2 !== undefined && <span className="bg-accent/20 text-accent text-xs font-bold px-2 py-0.5 rounded-full shadow-sm" title={count2Title}>{count2}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div
          className={`search-container group flex items-center gap-1 py-1.5 px-3 rounded-full relative transition-all duration-300 focus-within:bg-bg/80 focus-within:shadow-inner focus-within:backdrop-blur-md border border-transparent focus-within:border-white/10 cursor-text shrink-0 ${matchCount > 0 || searchTerm ? 'bg-bg/80 shadow-inner backdrop-blur-md border-white/10' : 'hover:bg-bg/50 cursor-pointer'}`}
          onClick={() => searchInputRef.current?.focus()}
        >
          <Icon name="Search" className="shrink-0 text-gray-500" />
          <input
            ref={searchInputRef}
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('search')}
            className={`transition-all duration-300 ease-in-out border-none bg-transparent outline-none text-sm p-0 ${matchCount > 0 || searchTerm ? 'w-24 opacity-100' : 'w-0 opacity-0 group-hover:w-32 group-hover:opacity-100 focus:w-32 focus:opacity-100'}`}
          />
          {searchTerm && <button type="button" onClick={(e) => { e.stopPropagation(); setSearchTerm(''); searchInputRef.current?.focus(); }} className="p-0.5 hover:bg-accent/20 rounded cursor-pointer flex items-center justify-center text-gray-500 hover:text-accent transition-colors shrink-0" title={t('clearSearch')}><Icon name="X" size={14} /></button>}
          {matchCount > 0 && (
            <div className="flex items-center gap-0.5 transition-opacity opacity-100 text-accent">
              <span className="text-xs font-medium whitespace-nowrap px-1">{currentMatchIndex + 1} / {matchCount}</span>
              <button type="button" onClick={(e) => { e.stopPropagation(); setCurrentMatchIndex(prev => prev > 0 ? prev - 1 : matchCount - 1); }} className="p-0.5 hover:bg-accent/20 rounded cursor-pointer flex items-center justify-center" title={t('prevMatch')}><Icon name="ChevronUp" size={14} /></button>
              <button type="button" onClick={(e) => { e.stopPropagation(); setCurrentMatchIndex(prev => prev < matchCount - 1 ? prev + 1 : 0); }} className="p-0.5 hover:bg-accent/20 rounded cursor-pointer flex items-center justify-center" title={t('nextMatch')}><Icon name="ChevronDown" size={14} /></button>
            </div>
          )}
        </div>
        {onAdd && addLabel && (
          <button onClick={onAdd} className="shrink-0 px-3 py-1.5 bg-accent/95 backdrop-blur-md border border-white/20 text-white rounded-lg hover:bg-accent-hover transition-all duration-300 text-sm font-bold shadow-md hover:shadow-lg hidden md:flex items-center gap-1 cursor-pointer" title={addTitle}>
            <Icon name="Plus" size={14} /> <span>{addLabel}</span>
          </button>
        )}
      </div>
    </div>
  );
};