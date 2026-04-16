import React from 'react';
import { Icon } from '../common/Icon';

export interface BuilderListItemProps extends React.HTMLAttributes<HTMLDivElement> {
  id: string;
  name: string;
  depth: number;
  isFirst: boolean;
  isLast: boolean;
  isSelected: boolean;
  isCollapsed: boolean;
  hasChildren: boolean;
  isDragOverCenter: boolean;
  isDragOverTop: boolean;
  isDragOverBottom: boolean;
  isDragOverParentBottom?: boolean;
  isDragged: boolean;
  anyDragged: boolean;
  isSearchDimmed: boolean;
  isSearchMatch: boolean;
  iconName: any;
  imageUrl?: string;
  badges?: React.ReactNode;
  actions: React.ReactNode;
  onToggleCollapse?: (e: React.MouseEvent) => void;
  stateIndicator?: boolean;
}

export const BuilderListItem: React.FC<BuilderListItemProps> = ({
  id, name, depth, isFirst, isLast, isSelected, isCollapsed, hasChildren,
  isDragOverCenter, isDragOverTop, isDragOverBottom, isDragOverParentBottom, isDragged, anyDragged,
  isSearchDimmed, isSearchMatch, iconName, imageUrl, badges, actions,
  onToggleCollapse, stateIndicator, className = '', style, ...rest
}) => {
  return (
    <div
      data-search-match={isSearchMatch ? "true" : undefined}
      className={`builder-list-item flex items-center gap-2 p-1.5 rounded-xl transition-all duration-300 relative group/item cursor-pointer hover:bg-hover-bg/80 hover:shadow-md hover:backdrop-blur-sm ${isSelected ? 'bg-accent/20 shadow-inner ring-2 ring-accent' : 'border border-transparent'} ${isDragOverCenter ? 'ring-2 ring-accent ring-inset bg-accent/10 scale-[1.02] z-20' : ''} ${isDragOverTop || isDragOverBottom || isDragOverParentBottom ? 'z-20' : ''} ${isDragged ? 'opacity-50' : ''} ${isSearchDimmed ? 'opacity-30' : ''} ${isSearchMatch ? 'bg-accent/20 shadow-inner' : ''} data-[search-active=true]:ring-2 data-[search-active=true]:ring-accent ${className}`}
      style={{ paddingLeft: `calc(${1.5 + depth * 1.5}rem + 0.5rem)`, touchAction: anyDragged ? 'none' : 'auto', contentVisibility: (isDragOverTop || isDragOverBottom || isDragOverParentBottom) ? 'visible' : 'auto', ...style }}
      {...rest}
    >
      <div className={`absolute -top-[3px] right-0 h-[2px] bg-accent z-30 pointer-events-none transition-opacity duration-200 ${isDragOverTop ? 'opacity-100' : 'opacity-0'}`} style={{ left: `calc(${1.5 + depth * 1.5}rem + 0.5rem)` }} />
      <div className={`absolute -bottom-[3px] right-0 h-[2px] bg-accent z-30 pointer-events-none transition-opacity duration-200 ${isDragOverBottom ? 'opacity-100' : 'opacity-0'}`} style={{ left: `calc(${1.5 + depth * 1.5}rem + 0.5rem)` }} />
      <div className={`absolute -bottom-[3px] right-0 h-[2px] bg-accent z-30 pointer-events-none transition-opacity duration-200 ${isDragOverParentBottom ? 'opacity-100' : 'opacity-0'}`} style={{ left: `calc(${1.5 + Math.max(0, depth - 1) * 1.5}rem + 0.5rem)` }} />
      {hasChildren && onToggleCollapse && (
        <button onClick={onToggleCollapse} className={`w-7 h-7 flex items-center justify-center rounded-md cursor-pointer absolute z-20 transition-colors top-1/2 -translate-y-1/2 ${isSelected ? 'text-accent hover:bg-accent/10' : 'text-gray-500 hover:bg-black/10 dark:hover:bg-white/10'}`} style={{ left: `calc(${depth * 1.5}rem)` }}>
          <Icon name="ChevronRight" size={16} className={`transition-transform duration-200 ${!isCollapsed ? 'rotate-90' : ''}`} />
        </button>
      )}
      {imageUrl ? (
        <img src={imageUrl} alt={name} className={`object-cover rounded-lg shadow-sm shrink-0 w-10 h-10`} />
      ) : (
        <div className={`bg-header-bg/80 rounded-lg shadow-sm shrink-0 flex items-center justify-center text-gray-400 w-10 h-10`}>
          <Icon name={iconName} size={20} className={`shrink-0 ${isSelected ? 'opacity-100 text-accent' : 'opacity-60'}`} />
        </div>
      )}
      <span className="truncate flex-1 text-md">{name}{badges}</span>
      <div className="max-md:hidden opacity-0 group-hover/item:opacity-100 flex items-center gap-0.5 transition-opacity z-20 shrink-0 pr-1">{actions}</div>
    </div>
  );
};