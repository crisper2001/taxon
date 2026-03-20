import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '../Icon';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  className?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({ value, options, onChange, className = '' }) => {
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
    <div className="relative inline-block w-full" ref={containerRef}>
      <button
        type="button"
        className={`flex items-center justify-between text-left ${className}`}
        onClick={(e) => {
          e.preventDefault();
          setIsOpen(!isOpen);
        }}
      >
        <span className="truncate pr-2">{selectedOption ? selectedOption.label : ''}</span>
        <Icon name="ChevronDown" size={16} className={`shrink-0 transition-transform duration-300 opacity-70 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      <div className={`absolute z-[100] w-full mt-2 bg-panel-bg/95 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-2xl max-h-60 overflow-y-auto left-0 py-1.5 transition-all duration-300 origin-top ${isOpen ? 'opacity-100 scale-y-100 pointer-events-auto' : 'opacity-0 scale-y-95 pointer-events-none'}`}>
        {options.map(option => (
          <button
            key={option.value}
            type="button"
            className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-hover-bg/80 ${option.value === value ? 'text-accent font-bold bg-accent/5' : 'text-text font-medium'}`}
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