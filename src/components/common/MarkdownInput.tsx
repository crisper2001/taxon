import React, { useRef, useState } from 'react';
import { MarkdownToolbar } from './MarkdownToolbar';
import { Icon } from '../Icon';
import { useAppContext } from '../../context/AppContext';
import { Markdown } from './Markdown';

interface MarkdownInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}

export const MarkdownInput: React.FC<MarkdownInputProps> = ({ label, value, onChange, rows = 3 }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isPreview, setIsPreview] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const { t } = useAppContext();

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-end justify-between min-h-[32px]">
        <span onClick={() => !isPreview && textareaRef.current?.focus()} className={`text-sm font-semibold opacity-80 ${!isPreview ? 'cursor-pointer' : ''}`}>{label}</span>
        <div className="flex items-center gap-2">
          {!isPreview && (
            <div className={`transition-opacity duration-200 ${isFocused ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}><MarkdownToolbar textareaRef={textareaRef} value={value} onChange={onChange} /></div>
          )}
          <button 
            type="button" 
            onClick={() => setIsPreview(!isPreview)} 
            className={`p-1.5 rounded-lg transition-all cursor-pointer shadow-sm flex items-center justify-center ${isPreview ? 'bg-accent text-white hover:bg-accent-hover border border-transparent' : 'bg-panel-bg/80 backdrop-blur-sm text-gray-500 hover:text-accent border border-white/20 dark:border-white/10 hover:bg-hover-bg hover:shadow-md'}`}
            title={isPreview ? t('edit') : t('preview')}
          >
            <Icon name={isPreview ? 'Pencil' : 'Eye'} size={16} />
          </button>
        </div>
      </div>
      {isPreview ? (
        <div className="input-base overflow-y-auto bg-panel-bg/50" style={{ minHeight: `calc(${rows} * 1.25rem + 1.5rem + 2px)` }}>
          {value ? <Markdown content={value} className="text-sm" /> : <span className="opacity-50 italic text-sm">{t('kbEmpty' as any)}</span>}
        </div>
      ) : (
        <textarea 
          ref={textareaRef} 
          value={value} 
          onChange={e => onChange(e.target.value)} 
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="input-base text-sm resize-none" 
          rows={rows} 
        />
      )}
    </div>
  );
};