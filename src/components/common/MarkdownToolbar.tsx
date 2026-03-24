import React, { useEffect, useCallback } from 'react';
import { Icon } from '../Icon';

interface MarkdownToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onChange: (value: string) => void;
  value: string;
}

export const MarkdownToolbar: React.FC<MarkdownToolbarProps> = ({ textareaRef, onChange, value }) => {
  const insertFormatting = useCallback((prefix: string, suffix: string = '') => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    const newText = value.substring(0, start) + prefix + selectedText + suffix + value.substring(end);
    onChange(newText);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  }, [textareaRef, value, onChange]);

  const insertBlockFormatting = useCallback((prefix: string) => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    let lineStart = value.lastIndexOf('\n', start - 1);
    lineStart = lineStart === -1 ? 0 : lineStart + 1;
    
    const newText = value.substring(0, lineStart) + prefix + value.substring(lineStart);
    onChange(newText);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  }, [textareaRef, value, onChange]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key.toLowerCase() === 'b') {
          e.preventDefault();
          insertFormatting('**', '**');
        } else if (e.key.toLowerCase() === 'i') {
          e.preventDefault();
          insertFormatting('*', '*');
        } else if (e.key.toLowerCase() === 'k') {
          e.preventDefault();
          insertFormatting('[', '](url)');
        }
      }
    };

    textarea.addEventListener('keydown', handleKeyDown);
    return () => textarea.removeEventListener('keydown', handleKeyDown);
  }, [insertFormatting]);

  return (
    <div className="flex items-center gap-0.5 p-1 bg-panel-bg/80 backdrop-blur-sm border border-white/20 dark:border-white/10 rounded-lg w-fit shadow-sm" onMouseDown={(e) => e.preventDefault()}>
      <button type="button" onClick={() => insertFormatting('**', '**')} className="p-1 hover:bg-hover-bg rounded text-gray-500 hover:text-accent transition-colors cursor-pointer" title="Bold (Ctrl/Cmd+B)"><Icon name="Bold" size={14} /></button>
      <button type="button" onClick={() => insertFormatting('*', '*')} className="p-1 hover:bg-hover-bg rounded text-gray-500 hover:text-accent transition-colors cursor-pointer" title="Italic (Ctrl/Cmd+I)"><Icon name="Italic" size={14} /></button>
      <div className="w-px h-3 bg-border mx-1" />
      <button type="button" onClick={() => insertBlockFormatting('- ')} className="p-1 hover:bg-hover-bg rounded text-gray-500 hover:text-accent transition-colors cursor-pointer" title="Bulleted List"><Icon name="List" size={14} /></button>
      <button type="button" onClick={() => insertBlockFormatting('1. ')} className="p-1 hover:bg-hover-bg rounded text-gray-500 hover:text-accent transition-colors cursor-pointer" title="Numbered List"><Icon name="ListOrdered" size={14} /></button>
      <div className="w-px h-3 bg-border mx-1" />
      <button type="button" onClick={() => insertFormatting('[', '](url)')} className="p-1 hover:bg-hover-bg rounded text-gray-500 hover:text-accent transition-colors cursor-pointer" title="Link (Ctrl/Cmd+K)"><Icon name="Link" size={14} /></button>
    </div>
  );
};
