import React from 'react';
import { Icon, type IconName } from '../Icon';

interface PanelProps {
  title: string;
  icon?: IconName;
  count: number;
  onSearch?: (term: string) => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Panel: React.FC<PanelProps> = ({ title, icon, count, onSearch, children, footer }) => {
  return (
    <div className="panel flex flex-col h-full w-full bg-panel-bg border border-border rounded-lg shadow-md overflow-hidden relative">
      <div className="panel-header flex items-center justify-between p-3 border-b border-border bg-header-bg shrink-0">
        <div className="panel-title font-semibold flex items-center gap-2 whitespace-nowrap">
          {icon && <Icon name={icon} />}
          <span>{title}</span>
          <span className="panel-count bg-accent text-white text-xs font-bold px-2 py-0.5 rounded-full">{count}</span>
        </div>
        {onSearch && (
          <div className="search-container group flex items-center gap-1 py-1 px-2 rounded-full relative transition-all duration-300 hover:bg-panel-bg focus-within:bg-panel-bg">
            <Icon name="Search" className="cursor-pointer shrink-0" />
            <input
              type="search"
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search..."
              className="w-0 opacity-0 group-hover:w-32 group-hover:opacity-100 focus:w-32 focus:opacity-100 transition-all duration-300 ease-in-out border-none bg-transparent outline-none text-sm p-0"
            />
          </div>
        )}
      </div>
      <div className="panel-content overflow-y-auto grow p-2">
        {children}
      </div>
      {footer && <div className="panel-footer absolute bottom-2 right-2 z-10">{footer}</div>}
    </div>
  );
};
