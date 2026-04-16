import React, { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { Icon } from '../common';
import type { KeyData } from '../../types';

export interface ChatInputFormProps {
  userInput: string;
  setUserInput: React.Dispatch<React.SetStateAction<string>>;
  selectedImage: { file: File; base64: string; mimeType: string; url: string } | null;
  setSelectedImage: React.Dispatch<React.SetStateAction<{ file: File; base64: string; mimeType: string; url: string } | null>>;
  processAndSetImage: (file: File) => Promise<void>;
  onSubmit: () => void;
  t: (key: string) => string;
  isEnabled: boolean;
  isThinking: boolean;
  geminiApiKey: string;
  appMode: 'identify' | 'build';
  keyData: KeyData | null;
}

export const ChatInputForm = React.memo<ChatInputFormProps>(({
  userInput, setUserInput, selectedImage, setSelectedImage, processAndSetImage, onSubmit, t, isEnabled, isThinking, geminiApiKey, appMode, keyData
}) => {
  const [mentionState, setMentionState] = useState<{ active: boolean; search: string; startIndex: number }>({ active: false, search: '', startIndex: -1 });
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const mentionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const allMentionableItems = useMemo(() => {
    if (appMode === 'build' || !keyData) return [];
    const entities = Array.from(keyData.allEntities.values()).map((e: any) => ({ type: 'entity' as const, id: e.id, name: e.name }));
    const features = Array.from(keyData.allFeatures.values()).map((f: any) => {
      const name = f.parentName ? `${f.parentName}: ${f.name}` : f.name;
      return { type: 'feature' as const, id: f.id, name };
    });
    return [...entities, ...features].sort((a, b) => b.name.length - a.name.length);
  }, [keyData, appMode]);

  const mentionOptions = useMemo(() => {
    if (!mentionState.active || appMode === 'build' || !keyData) return [];
    const search = mentionState.search.toLowerCase();
    if (!search) return allMentionableItems.slice(0, 30);
    return allMentionableItems.filter(item => item.name.toLowerCase().includes(search)).slice(0, 30);
  }, [mentionState.active, mentionState.search, allMentionableItems, appMode, keyData]);

  useEffect(() => {
    if (mentionState.active && mentionRefs.current[mentionSelectedIndex]) {
      mentionRefs.current[mentionSelectedIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [mentionSelectedIndex, mentionState.active]);

  let placeholder = t('aiWaiting');
  if (!geminiApiKey) placeholder = t('aiNeedApi');
  else if (!isEnabled) placeholder = t('aiNeedKey');
  else placeholder = appMode === 'build' ? t('aiBuildDescribe' as any) : t('aiDescribe');

  const adjustHeight = useCallback(() => {
    if (textareaRef.current) {
      // Prevent setting a gigantic height when the panel width is animating from/to 0px
      if (textareaRef.current.offsetWidth === 0) return;
      textareaRef.current.style.height = '0px';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [userInput, selectedImage, placeholder, adjustHeight]); // Recalculate whenever text, image, or placeholder changes

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    let lastWidth = textarea.offsetWidth;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newWidth = entry.contentRect.width;
        if (newWidth !== lastWidth) {
          lastWidth = newWidth;
          adjustHeight();
        }
      }
    });
    ro.observe(textarea);
    return () => ro.disconnect();
  }, [adjustHeight]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processAndSetImage(file);
    e.target.value = '';
  };

  const removeSelectedImage = () => {
    if (selectedImage) {
      URL.revokeObjectURL(selectedImage.url);
      setSelectedImage(null);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (!file) continue;
        processAndSetImage(file);
        break; // Only handle the first pasted image
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setUserInput(val);

    const cursor = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursor);
    const lastAt = textBeforeCursor.lastIndexOf('@');

    if (lastAt !== -1) {
      const searchStr = textBeforeCursor.slice(lastAt + 1);
      if (!searchStr.includes('\n') && searchStr.length < 50) {
        setMentionState({ active: true, search: searchStr, startIndex: lastAt });
        setMentionSelectedIndex(0);
      } else {
        setMentionState({ active: false, search: '', startIndex: -1 });
      }
    } else {
      setMentionState({ active: false, search: '', startIndex: -1 });
    }
  };

  const insertMention = (item: { name: string }) => {
    const before = userInput.slice(0, mentionState.startIndex);
    const after = userInput.slice(textareaRef.current?.selectionStart || userInput.length);
    const newVal = `${before}@${item.name} ${after}`;
    setUserInput(newVal);
    setMentionState({ active: false, search: '', startIndex: -1 });

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newPos = before.length + item.name.length + 2;
        textareaRef.current.selectionStart = newPos;
        textareaRef.current.selectionEnd = newPos;
      }
    }, 0);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onSubmit();
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionState.active && mentionOptions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionSelectedIndex(prev => (prev + 1) % mentionOptions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionSelectedIndex(prev => (prev - 1 + mentionOptions.length) % mentionOptions.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(mentionOptions[mentionSelectedIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setMentionState({ active: false, search: '', startIndex: -1 });
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const renderHighlights = () => {
    if (!userInput) return null;
    let elements: React.ReactNode[] = [];
    let remaining = userInput;
    let keyCounter = 0;

    while (remaining) {
      const atIndex = remaining.indexOf('@');
      if (atIndex === -1) {
        elements.push(<span key={keyCounter++}>{remaining}</span>);
        break;
      }
      if (atIndex > 0) {
        elements.push(<span key={keyCounter++}>{remaining.slice(0, atIndex)}</span>);
      }
      remaining = remaining.slice(atIndex); // Starts with '@'

      let matchedName = null;
      let matchedType = null;
      for (const item of allMentionableItems) {
        if (remaining.substring(1).toLowerCase().startsWith(item.name.toLowerCase())) {
          const nextChar = remaining.charAt(1 + item.name.length);
          if (!nextChar || /^[\s,.'";:!?()\[\]{}]+$/.test(nextChar)) {
            matchedName = item.name;
            matchedType = item.type;
            break;
          }
        }
      }

      if (matchedName) {
        const matchText = remaining.slice(0, 1 + matchedName.length);
        const colorClass = matchedType === 'entity' ? 'bg-accent/20 text-accent' : 'bg-green-500/20 text-green-600';
        elements.push(<span key={keyCounter++} className={`rounded-sm ${colorClass}`}>{matchText}</span>);
        remaining = remaining.slice(1 + matchedName.length);
      } else {
        elements.push(<span key={keyCounter++}>@</span>);
        remaining = remaining.slice(1);
      }
    }
    return elements;
  };

  return (
    <form onSubmit={handleSubmit} className="p-3 pt-1 relative flex flex-col shrink-0">
      {mentionState.active && mentionOptions.length > 0 && (
        <div className="absolute bottom-full left-3 right-3 bg-panel-bg border border-border rounded-xl shadow-lg mb-2 max-h-48 overflow-y-auto z-10 flex flex-col py-1 animate-fade-in-up">
          {mentionOptions.map((opt, idx) => (
            <button
              key={`${opt.type}-${opt.id}`}
              ref={el => { mentionRefs.current[idx] = el; }}
              type="button"
              className={`text-left px-3 py-2 text-sm transition-colors ${idx === mentionSelectedIndex ? 'bg-accent/10 text-accent' : 'hover:bg-hover-bg text-text'}`}
              onClick={() => insertMention(opt)}
            >
              <span className="text-[10px] font-bold opacity-50 uppercase mr-2 inline-block w-8">{opt.type === 'entity' ? t('ent') : t('feat')}</span>
              {opt.name}
            </button>
          ))}
        </div>
      )}
      <div className={`relative flex items-center w-full border border-white/20 dark:border-white/10 rounded-3xl bg-bg/80 backdrop-blur-md shadow-inner transition-all focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20 ${(!isEnabled || isThinking || !geminiApiKey) ? 'opacity-60 grayscale-30' : ''}`}>
        <div className="pl-1.5 shrink-0 flex items-center justify-center">
          <input type="file" ref={imageInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
          <button type="button" onClick={() => imageInputRef.current?.click()} disabled={!isEnabled || isThinking || !geminiApiKey} className="w-9 h-9 text-gray-500 hover:text-accent rounded-full flex items-center justify-center transition-colors cursor-pointer disabled:cursor-not-allowed disabled:hover:text-gray-500 hover:bg-hover-bg" title={t('uploadImage')}>
            <Icon name="Image" size={20} />
          </button>
        </div>
        <div className="relative w-full overflow-hidden flex flex-col justify-center">
          {selectedImage && (
            <div className="pt-3 px-2 pb-1">
              <div className="relative inline-block">
                <img src={selectedImage.url} alt={t('preview')} className="h-16 w-16 object-cover rounded-md border border-border" />
                <button type="button" onClick={removeSelectedImage} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition-colors shadow-sm cursor-pointer z-20">
                  <Icon name="X" size={12} />
                </button>
              </div>
            </div>
          )}
          <div className="relative w-full">
            <div
              ref={backdropRef}
              className="absolute inset-0 w-full h-full pt-3 pb-2 px-3 text-[15px] pointer-events-none whitespace-pre-wrap wrap-break-words overflow-y-auto font-sans text-text leading-relaxed"
              style={{ maxHeight: '120px' }}
              aria-hidden="true"
            >
              {!userInput ? <span className="text-gray-400">{placeholder}</span> : renderHighlights()}
            </div>
            <textarea
              ref={textareaRef}
              rows={1}
              value={userInput}
              onChange={handleInputChange}
              onKeyDown={handleTextareaKeyDown}
              onScroll={(e) => { if (backdropRef.current) backdropRef.current.scrollTop = e.currentTarget.scrollTop; }}
              onPaste={handlePaste}
              placeholder={placeholder}
              disabled={!isEnabled || isThinking || !geminiApiKey}
              className="w-full pt-3 pb-2 px-3 text-[15px] bg-transparent resize-none overflow-y-auto focus:outline-none z-10 font-sans placeholder-transparent leading-relaxed"
              style={{ maxHeight: '120px', color: 'inherit', WebkitTextFillColor: 'transparent', caretColor: 'currentColor' }}
              spellCheck="false"
            />
          </div>
        </div>
        <div className="pr-1.5 shrink-0 flex items-center justify-center">
          <button type="submit" disabled={!isEnabled || isThinking || (!userInput.trim() && !selectedImage) || !geminiApiKey} className="w-9 h-9 bg-accent text-white rounded-full flex items-center justify-center disabled:bg-gray-400 disabled:scale-95 transition-all duration-200 hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-bg focus:ring-accent cursor-pointer disabled:cursor-not-allowed shadow-md">
            <Icon name="ArrowUp" size={20} />
          </button>
        </div>
      </div>
    </form>
  );
});
