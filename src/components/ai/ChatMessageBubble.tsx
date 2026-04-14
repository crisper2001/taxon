import React, { useState, useEffect, useRef } from 'react';
import { Icon, Markdown } from '../common';
import type { KeyData, ChatMessage } from '../../types';

export interface ChatMessageBubbleProps {
  msg: ChatMessage;
  index: number;
  keyData: KeyData | null;
  t: (key: string) => string;
  isLatestAi?: boolean;
  isLatestUser?: boolean;
  onRegenerate?: () => void;
  onEditSubmit?: (index: number, newText: string) => void;
  onVersionChange?: (index: number, newVersionIndex: number) => void;
  isThinking?: boolean;
  onImageClick?: (url: string) => void;
  appMode: 'identify' | 'build';
}

export const ChatMessageBubble = React.memo<ChatMessageBubbleProps>(({
  msg, index, keyData, t, isLatestAi, isLatestUser, onRegenerate, onEditSubmit, onVersionChange, isThinking, onImageClick, appMode
}) => {
  const [isCopied, setIsCopied] = useState(false);

  // Truncate AI messages if they exceed 500 characters (excluding HTML markup used for clickable entities)
  const isLong = msg.sender === 'ai' && msg.content.replace(/<[^>]*>?/gm, '').length > 500;
  const [isExpanded, setIsExpanded] = useState(!isLong);
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);

  const [addedFeatures, setAddedFeatures] = useState<Set<number>>(new Set());
  const [addedEntities, setAddedEntities] = useState<Set<number>>(new Set());
  const [addedAll, setAddedAll] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(msg.content);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setAddedFeatures(new Set());
    setAddedEntities(new Set());
    setAddedAll(false);
  }, [msg.currentVersionIndex, msg.data]);

  const handleUndo = () => {
    if (msg.draftSnapshot) {
      window.dispatchEvent(new CustomEvent('restore-builder-snapshot', { detail: msg.draftSnapshot }));
    } else {
      window.dispatchEvent(new CustomEvent('undo-builder-history'));
    }
    setAddedFeatures(new Set());
    setAddedEntities(new Set());
    setAddedAll(false);
  };

  // Auto-focus and resize when entering edit mode
  useEffect(() => {
    if (isEditing && editTextareaRef.current) {
      editTextareaRef.current.focus();
      editTextareaRef.current.style.height = 'auto';
      editTextareaRef.current.style.height = `${editTextareaRef.current.scrollHeight}px`;
      editTextareaRef.current.selectionStart = editTextareaRef.current.value.length;
      editTextareaRef.current.selectionEnd = editTextareaRef.current.value.length;
    }
  }, [isEditing]);

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditValue(msg.content);
  };

  const handleSaveEdit = () => {
    if (editValue.trim() && editValue.trim() !== msg.content.trim() && onEditSubmit) {
      setIsEditing(false);
      onEditSubmit(index, editValue);
    } else if (editValue.trim() === msg.content.trim()) {
      setIsEditing(false);
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      handleCancelEdit();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    }
  };

  const handleCopy = () => {
    // Strip out HTML tags (like the clickable-entity spans) to copy plain clean text/Markdown
    const textToCopy = msg.content.replace(/<[^>]*>?/gm, '');
    navigator.clipboard.writeText(textToCopy);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const hasFeatures = msg.data?.features_used && msg.data.features_used.length > 0;
  const isIdentification = !msg.data?.answer?.trim();
  const hasConsideredData = appMode === 'identify' && hasFeatures && isIdentification;
  const hasSuggestions = appMode === 'build' && (msg.data?.suggested_features?.length || msg.data?.suggested_entities?.length);
  const hasEdits = appMode === 'build' && (msg.data?.suggested_features?.some((sf: any) => sf.id) || msg.data?.suggested_entities?.some((se: any) => se.id));

  return (
    <div className={`chat-message flex flex-col animate-fade-in-up duration-300 ease-out space-y-1 mb-2 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
      <div className={`msg-content flex flex-col max-w-[92%] p-3.5 rounded-3xl border transition-all ${msg.sender === 'user' ? 'bg-accent/95 backdrop-blur-md text-white rounded-br-sm border-white/20 shadow-md' : 'bg-header-bg/90 backdrop-blur-md rounded-bl-sm border-white/20 dark:border-white/10 shadow-sm'}`}>

        {/* Text Content */}
        {msg.imageUrl && (
          <div className="mb-2">
            <img src={msg.imageUrl} alt={t('uploadedImage')} className="max-h-48 rounded-2xl object-contain shadow-sm cursor-pointer hover:opacity-90 transition-opacity" onClick={() => onImageClick && onImageClick(msg.imageUrl!)} />
          </div>
        )}
        {isEditing ? (
          <div className="flex flex-col w-full min-w-[200px] sm:min-w-[250px]">
            <textarea
              ref={editTextareaRef}
              value={editValue}
              onChange={(e) => {
                setEditValue(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              onKeyDown={handleEditKeyDown}
              className="w-full bg-black/20 text-white border-none rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-white/50 text-sm font-sans"
              rows={1}
            />
            <div className="flex justify-end gap-2 mt-2">
              <button onClick={handleCancelEdit} className="text-xs px-3 py-1.5 rounded-md bg-black/20 hover:bg-black/30 transition-colors font-medium">{t('cancel')}</button>
              <button onClick={handleSaveEdit} disabled={!editValue.trim() || isThinking} className="text-xs px-3 py-1.5 rounded-md bg-white text-accent hover:bg-gray-100 transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed">{t('save')}</button>
            </div>
          </div>
        ) : (
          <>
            {msg.content && (
              <div className={`relative ${!isExpanded ? 'max-h-48 overflow-hidden' : ''}`}>
                <Markdown content={msg.content} className={`text-[15px] space-y-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mt-1 [&_ul_ul]:list-[circle] [&_ul_ul]:mt-1 [&_li>p]:inline ${msg.sender === 'user' ? 'text-white! **:text-white!' : ''}`} />
                {!isExpanded && (
                  <div className={`absolute bottom-0 left-0 w-full h-12 bg-linear-to-t ${msg.sender === 'user' ? 'from-accent' : 'from-header-bg'} to-transparent pointer-events-none`} />
                )}
              </div>
            )}

            {appMode === 'build' && msg.data?.suggested_features && msg.data.suggested_features.length > 0 && (
              <div className="mt-3 flex flex-col gap-2 w-full">
                <h4 className="text-[11px] font-bold opacity-80 uppercase tracking-wider">{t('aiSuggestedFeatures' as any)}</h4>
                {msg.data.suggested_features.map((sf: any, idx: number) => {
                  const isAdded = addedFeatures.has(idx) || addedAll;
                  const isEdit = !!sf.id;
                  const isDelete = sf.action === 'delete';
                  const buttonText = isAdded ? (t('addedItem' as any) || 'Added') : (isDelete ? t('kbDelete' as any) : (isEdit ? (t('updateItem' as any) || 'Update') : t('addToKey' as any)));
                  const buttonClass = isAdded ? 'bg-green-500/20 text-green-600 dark:text-green-400 hover:bg-red-500/20 hover:text-red-500 dark:hover:text-red-400 cursor-pointer shadow-none' : (isDelete ? 'bg-red-500 text-white hover:bg-red-600 cursor-pointer' : (isEdit ? 'bg-blue-500 text-white hover:bg-blue-600 cursor-pointer' : 'bg-accent text-white hover:bg-accent-hover cursor-pointer'));
                  return (
                    <div key={idx} className={`bg-bg p-2.5 rounded-xl border border-black/5 dark:border-white/5 shadow-sm flex flex-col gap-1.5 animate-fade-in-up transition-opacity ${isAdded ? 'opacity-60' : ''} ${isDelete ? 'border-red-500/30 bg-red-500/5' : ''}`}>
                      <div className="flex justify-between items-start gap-2">
                        <span className={`font-bold text-sm leading-tight ${isDelete ? 'text-red-500 line-through' : 'text-accent'}`}>{sf.name}</span>
                        <button
                          onClick={() => {
                            if (!isAdded) {
                              window.dispatchEvent(new CustomEvent('add-draft-feature', { detail: sf }));
                              setAddedFeatures(prev => new Set(prev).add(idx));
                            } else {
                              handleUndo();
                            }
                          }}
                          className={`shrink-0 text-[11px] px-2 py-1 rounded-md transition-colors font-semibold shadow-sm flex items-center gap-1 group ${buttonClass}`}
                        >
                          <Icon name={isAdded ? "Check" : (isDelete ? "Trash2" : (isEdit ? "RefreshCw" : "Plus"))} size={12} className={isAdded ? "group-hover:hidden" : ""} />
                          {isAdded && <Icon name="Undo" size={12} className="hidden group-hover:block" />}
                          <span className={isAdded ? "group-hover:hidden" : ""}>{buttonText}</span>
                          {isAdded && <span className="hidden group-hover:block">{t('kbUndo' as any)}</span>}
                        </button>
                      </div>
                      {sf.description && <span className="text-xs opacity-75 leading-snug">{sf.description}</span>}
                      {sf.type === 'state' && sf.states && (
                        <div className="flex flex-col gap-1 mt-1">
                          {sf.states.map((s: any, sIdx: number) => (
                            <div key={typeof s === 'string' ? s : (s.name || sIdx)} className="text-[10px] px-2 py-1 bg-black/5 dark:bg-white/10 rounded-md flex flex-col">
                              <span className={`font-bold opacity-90 ${s.action === 'delete' ? 'text-red-500 line-through' : ''}`}>
                                {typeof s === 'string' ? s : s.name}
                                {s.action === 'delete' && <span className="ml-1 opacity-70 font-normal">({t('kbDelete' as any)})</span>}
                              </span>
                              {s.description && <span className="opacity-75 font-normal mt-0.5">{s.description}</span>}
                              {s.values && s.values.length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {s.values.map((v: any, vIdx: number) => <span key={vIdx} className={`px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 text-[9px] ${v.action === 'delete' ? 'line-through text-red-500' : ''}`}>{v.name}</span>)}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {sf.type === 'numeric' && (
                        <div className="flex flex-wrap gap-1.5 mt-1 items-center">
                          <div className="text-[10px] px-1.5 py-0.5 bg-black/5 dark:bg-white/10 rounded-md font-medium opacity-90 w-fit">{t('kbTypeNumeric' as any)}</div>
                          {((sf.base_unit && sf.base_unit !== 'none') || (sf.unit_prefix && sf.unit_prefix !== 'none')) && (
                            <div className="text-[10px] px-1.5 py-0.5 bg-accent/10 text-accent rounded-md font-medium w-fit border border-accent/20">
                              {[sf.unit_prefix !== 'none' ? sf.unit_prefix : '', sf.base_unit !== 'none' ? sf.base_unit : ''].filter(Boolean).join(' ')}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {appMode === 'build' && msg.data?.suggested_entities && msg.data.suggested_entities.length > 0 && (
              <div className="mt-3 flex flex-col gap-2 w-full">
                <h4 className="text-[11px] font-bold opacity-80 uppercase tracking-wider">{t('aiSuggestedEntities' as any)}</h4>
                {msg.data.suggested_entities.map((se: any, idx: number) => {
                  const isAdded = addedEntities.has(idx) || addedAll;
                  const isEdit = !!se.id;
                  const isDelete = se.action === 'delete';
                  const buttonText = isAdded ? (t('addedItem' as any) || 'Added') : (isDelete ? t('kbDelete' as any) : (isEdit ? (t('updateItem' as any) || 'Update') : t('addToKey' as any)));
                  const buttonClass = isAdded ? 'bg-green-500/20 text-green-600 dark:text-green-400 hover:bg-red-500/20 hover:text-red-500 dark:hover:text-red-400 cursor-pointer shadow-none' : (isDelete ? 'bg-red-500 text-white hover:bg-red-600 cursor-pointer' : (isEdit ? 'bg-blue-500 text-white hover:bg-blue-600 cursor-pointer' : 'bg-accent text-white hover:bg-accent-hover cursor-pointer'));
                  return (
                    <div key={idx} className={`bg-bg p-2.5 rounded-xl border border-black/5 dark:border-white/5 shadow-sm flex flex-col gap-1.5 animate-fade-in-up transition-opacity ${isAdded ? 'opacity-60' : ''} ${isDelete ? 'border-red-500/30 bg-red-500/5' : ''}`}>
                      <div className="flex justify-between items-start gap-2">
                        <span className={`font-bold text-sm leading-tight ${isDelete ? 'text-red-500 line-through' : 'text-accent'}`}>{se.name}</span>
                        <button
                          onClick={() => {
                            if (!isAdded) {
                              window.dispatchEvent(new CustomEvent('add-draft-entity', { detail: se }));
                              setAddedEntities(prev => new Set(prev).add(idx));
                            } else {
                              handleUndo();
                            }
                          }}
                          className={`shrink-0 text-[11px] px-2 py-1 rounded-md transition-colors font-semibold shadow-sm flex items-center gap-1 group ${buttonClass}`}
                        >
                          <Icon name={isAdded ? "Check" : (isDelete ? "Trash2" : (isEdit ? "RefreshCw" : "Plus"))} size={12} className={isAdded ? "group-hover:hidden" : ""} />
                          {isAdded && <Icon name="Undo" size={12} className="hidden group-hover:block" />}
                          <span className={isAdded ? "group-hover:hidden" : ""}>{buttonText}</span>
                          {isAdded && <span className="hidden group-hover:block">{t('kbUndo' as any)}</span>}
                        </button>
                      </div>
                      {se.description && <span className="text-xs opacity-75 leading-snug">{se.description}</span>}
                      {(se.clear_scores || se.action === 'clear_scores') && (
                        <div className="flex items-center gap-1 mt-1.5 text-[10px] text-red-500 dark:text-red-400 font-bold bg-red-500/10 w-fit px-1.5 py-0.5 rounded-md">
                          <Icon name="Eraser" size={10} />
                          <span>{t('clearScores' as any) || 'Clear existing scores'}</span>
                        </div>
                      )}
                      {se.scores && se.scores.length > 0 && (
                        <div className="flex flex-col gap-1 mt-1.5 border-t border-black/5 dark:border-white/5 pt-1.5">
                          <span className="text-[9px] font-bold opacity-60 uppercase tracking-wider">Suggested Scores</span>
                          {se.scores.map((sc: any, sidx: number) => (
                            <div key={sidx} className="flex justify-between items-center text-[10px] bg-black/5 dark:bg-white/10 px-1.5 py-1 rounded-md">
                              <span className="font-medium opacity-90">{sc.feature_name}{sc.state_name ? ` > ${sc.state_name}` : ''}</span>
                              <span className="opacity-80 italic">{sc.score_value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {hasSuggestions && (
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => {
                    if (!addedAll) {
                      window.dispatchEvent(new CustomEvent('add-all-draft-items', { detail: { features: msg.data?.suggested_features, entities: msg.data?.suggested_entities } }));
                      setAddedAll(true);
                      if (msg.data?.suggested_features) setAddedFeatures(new Set(msg.data.suggested_features.map((_, i) => i)));
                      if (msg.data?.suggested_entities) setAddedEntities(new Set(msg.data.suggested_entities.map((_, i) => i)));
                    } else {
                      handleUndo();
                    }
                  }}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-colors shadow-sm font-bold flex items-center gap-1.5 group ${addedAll ? 'bg-green-500/20 text-green-600 dark:text-green-400 hover:bg-red-500/20 hover:text-red-500 dark:hover:text-red-400 cursor-pointer shadow-none' : (hasEdits ? 'bg-blue-500 text-white hover:bg-blue-600 cursor-pointer' : 'bg-accent text-white hover:bg-accent-hover cursor-pointer')}`}
                >
                  <Icon name={addedAll ? "Check" : (hasEdits ? "RefreshCw" : "Plus")} size={14} className={addedAll ? "group-hover:hidden" : ""} />
                  {addedAll && <Icon name="Undo" size={14} className="hidden group-hover:block" />}
                  <span className={addedAll ? "group-hover:hidden" : ""}>{addedAll ? (t('addedItem' as any) || 'Added') : (hasEdits ? t('updateAllToKey' as any) || 'Update All' : t('addAllToKey' as any))}</span>
                  {addedAll && <span className="hidden group-hover:block">{t('kbUndo' as any)}</span>}
                </button>
              </div>
            )}
          </>
        )}

        {/* Read More Toggle */}
        {isLong && !isEditing && (
          <div className="mt-1">
            <button onClick={() => setIsExpanded(!isExpanded)} className={`text-xs font-semibold hover:underline focus:outline-none ${msg.sender === 'user' ? 'text-white/90 hover:text-white' : 'text-accent'}`}>
              {isExpanded ? t('readLess') : t('readMore')}
            </button>
          </div>
        )}

        {/* Action Bar */}
        {msg.sender === 'user' && isLatestUser && !isEditing && onEditSubmit && (
          <div className="mt-1 flex justify-end">
            <button
              onClick={() => setIsEditing(true)}
              disabled={isThinking}
              title={t('edit')}
              className="flex items-center gap-1 text-xs opacity-60 hover:opacity-100 transition-all cursor-pointer focus:outline-none disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Icon name="Pencil" className="w-3.5 h-3.5" />
              <span>{t('edit')}</span>
            </button>
          </div>
        )}
        {msg.sender === 'ai' && msg.content && (
          <div className="mt-2 flex items-center justify-between">
            <div>
              {msg.versions && msg.versions.length > 1 && (
                <div className="flex items-center gap-2 text-xs text-text opacity-70 bg-bg px-2 py-1 rounded-md border border-border shadow-sm">
                  <button
                    onClick={() => onVersionChange && onVersionChange(index, msg.currentVersionIndex! - 1)}
                    disabled={msg.currentVersionIndex === 0 || isThinking}
                    className="hover:text-accent disabled:opacity-30 cursor-pointer flex items-center justify-center transition-colors"
                    title={t('previousVersion')}
                  ><Icon name="ChevronLeft" size={14} /></button>
                  <span className="font-medium select-none min-w-8 text-center">{msg.currentVersionIndex! + 1} / {msg.versions.length}</span>
                  <button
                    onClick={() => onVersionChange && onVersionChange(index, msg.currentVersionIndex! + 1)}
                    disabled={msg.currentVersionIndex === msg.versions.length - 1 || isThinking}
                    className="hover:text-accent disabled:opacity-30 cursor-pointer flex items-center justify-center transition-colors"
                    title={t('nextVersion')}
                  ><Icon name="ChevronRight" size={14} /></button>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              {isLatestAi && onRegenerate && (
                <button
                  onClick={onRegenerate}
                  disabled={isThinking}
                  title={t('regenerate')}
                  className="flex items-center gap-1 text-xs opacity-60 hover:opacity-100 hover:text-accent transition-all cursor-pointer focus:outline-none disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Icon name="RefreshCw" className={`w-3.5 h-3.5 ${isThinking ? 'animate-spin' : ''}`} />
                  <span>{t('regenerate')}</span>
                </button>
              )}
              <button onClick={handleCopy} title={t('copy')} className="flex items-center gap-1 text-xs opacity-60 hover:opacity-100 hover:text-accent transition-all cursor-pointer focus:outline-none"><Icon name={isCopied ? "Check" : "Copy"} className="w-3.5 h-3.5" /><span>{isCopied ? t('copied') : t('copy')}</span></button>
            </div>
          </div>
        )}
      </div>

      {/* Togglable Features & Entities Considered (Separated from main bubble) */}
      {hasConsideredData && (
        <div className={`flex flex-col max-w-[90%] w-full ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
          <button
            onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-accent transition-colors py-1.5 px-3 rounded-xl border border-border hover:bg-hover-bg focus:outline-none bg-panel-bg shadow-sm mt-1"
          >
            <Icon name="List" className="w-3.5 h-3.5" />
            <span>{t('aiConsideredData')}</span>
            <Icon name="ChevronRight" className={`w-3.5 h-3.5 transition-transform duration-300 ${isDetailsExpanded ? 'rotate-90' : ''}`} />
          </button>

          <div className={`overflow-hidden transition-all duration-300 ease-in-out w-full ${isDetailsExpanded ? 'max-h-[500px] opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
            <div className="p-3 bg-panel-bg border border-border rounded-xl shadow-sm text-sm w-full overflow-y-auto">
              {hasFeatures && (
                <div className="mb-2 last:mb-0"><h4 className="text-xs font-semibold mb-1 opacity-80 uppercase tracking-wider">{t('aiFeaturesConsidered')}</h4><ul className="list-disc list-inside text-xs space-y-1 opacity-90">{msg.data!.features_used.map(f => { const feature = keyData!.allFeatures.get(f.id); const featureName = feature ? (feature.parentName ? `${feature.parentName}: ${feature.name}` : feature.name) : f.description; return { f, featureName }; }).sort((a, b) => a.featureName.localeCompare(b.featureName)).map(({ f, featureName }) => <li key={f.id}>{featureName}</li>)}</ul></div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}, (prev, next) => {
  return prev.msg === next.msg &&
    prev.index === next.index &&
    prev.keyData === next.keyData &&
    prev.t === next.t &&
    prev.isLatestAi === next.isLatestAi &&
    prev.isLatestUser === next.isLatestUser &&
    prev.isThinking === next.isThinking &&
    prev.appMode === next.appMode;
});
