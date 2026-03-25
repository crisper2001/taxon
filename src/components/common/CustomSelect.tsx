import React, { useState, useRef, useEffect } from 'react';
import { Icon } from './Icon';

interface Option {
  value: string;
  label: React.ReactNode;
}

interface CustomSelectProps {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  className?: string;
  dropdownClassName?: string;
  hideChevron?: boolean;
  customTrigger?: React.ReactNode;
  onTriggerClick?: (e: React.MouseEvent<HTMLButtonElement>, toggleOpen: () => void) => void;
  onTriggerContextMenu?: (e: React.MouseEvent<HTMLButtonElement>, toggleOpen: () => void) => void;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({ value, options, onChange, className = '', dropdownClassName = 'max-h-96 overflow-y-auto', hideChevron = false, customTrigger, onTriggerClick, onTriggerContextMenu }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.value === value) || options[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  return (
    <div className={`relative inline-block ${hideChevron ? 'w-auto' : 'w-full'}`} ref={containerRef}>
      <button
        type="button"
        className={`flex items-center ${hideChevron && !customTrigger ? 'justify-center' : 'justify-between text-left'} ${className}`}
        onClick={(e) => {
          e.preventDefault();
          if (onTriggerClick) {
            onTriggerClick(e, () => setIsOpen(!isOpen));
          } else {
            setIsOpen(!isOpen);
          }
        }}
        onContextMenu={(e) => {
          if (onTriggerContextMenu) {
            onTriggerContextMenu(e, () => setIsOpen(!isOpen));
          }
        }}
      >
        {customTrigger ? customTrigger : (
          <>
            <span className={`truncate flex items-center justify-center ${hideChevron ? '' : 'pr-2'}`}>{selectedOption ? selectedOption.label : ''}</span>
            {!hideChevron && <Icon name="ChevronDown" size={16} className={`shrink-0 transition-transform duration-300 opacity-70 ${isOpen ? 'rotate-180' : ''}`} />}
          </>
        )}
      </button>

      <div className={`absolute z-100 min-w-max w-full bg-panel-bg border rounded-2xl shadow-2xl ${hideChevron ? 'left-1/2 -translate-x-1/2' : 'left-0'} transition-all duration-300 origin-top ${isOpen ? `mt-2 border-white/20 dark:border-white/10 py-1.5 opacity-100 scale-y-100 pointer-events-auto ${dropdownClassName}` : 'mt-0 border-transparent py-0 max-h-0 overflow-hidden opacity-0 scale-y-95 pointer-events-none'}`}>
        {options.map(option => (
          <button
            key={option.value}
            type="button"
            className={`w-full flex justify-start items-center text-left px-4 py-2.5 text-sm transition-colors hover:bg-hover-bg/80 ${option.value === value ? 'text-accent font-bold bg-accent/5' : 'text-text font-medium'}`}
            onClick={(e) => {
              e.preventDefault();
              onChange(option.value);
              setIsOpen(false);
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
};
