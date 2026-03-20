import React, { useRef } from 'react';
import { Icon } from '../Icon';
import type { DraftKeyData, DraftEntity } from '../../types';
import { CustomSelect } from '../common/CustomSelect';

const generateId = () => Math.random().toString(36).substr(2, 9);
const reorderArray = <T,>(arr: T[], from: number, to: number): T[] => {
  const newArr = [...arr];
  const [moved] = newArr.splice(from, 1);
  newArr.splice(to, 0, moved);
  return newArr;
};

interface BuilderEntitiesTabProps {
  draftKey: DraftKeyData;
  updateDraftKey: (updater: (prev: DraftKeyData) => DraftKeyData) => void;
  t: (key: string) => string;
  selectedEntityId: string | null;
  setSelectedEntityId: (id: string | null) => void;
  collapsedEntities: Set<string>;
  toggleEntityCollapse: (id: string) => void;
  draggedItem: { type: 'feature' | 'entity', id: string } | null;
  setDraggedItem: (item: { type: 'feature' | 'entity', id: string } | null) => void;
  dragOverId: string | null;
  setDragOverId: (id: string | null) => void;
  draggedMedia: { type: 'feature' | 'entity' | 'state', itemId: string, stateId?: string, index: number } | null;
  setDraggedMedia: (media: { type: 'feature' | 'entity' | 'state', itemId: string, stateId?: string, index: number } | null) => void;
  setEditingMedia: (media: { type: 'feature' | 'entity' | 'state', itemId: string, stateId?: string, mediaIndex: number } | null) => void;
  setDeleteTarget: (target: { type: 'feature' | 'state' | 'entity', id: string, parentId?: string } | null) => void;
  processAndSetImage: (file: File, callback: (url: string) => void) => void;
}

export const BuilderEntitiesTab: React.FC<BuilderEntitiesTabProps> = ({
  draftKey, updateDraftKey, t, selectedEntityId, setSelectedEntityId, collapsedEntities, toggleEntityCollapse,
  draggedItem, setDraggedItem, dragOverId, setDragOverId, draggedMedia, setDraggedMedia, setEditingMedia, setDeleteTarget, processAndSetImage
}) => {
  const touchTimeout = useRef<NodeJS.Timeout | null>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const lastTouchPos = useRef({ x: 0, y: 0 });

  const addEntity = () => {
    const id = generateId();
    updateDraftKey(prev => ({
      ...prev,
      entities: [...prev.entities, { id, name: t('kbNewEntity' as any), scores: {} }]
    }));
    setSelectedEntityId(id);
  };

  const updateEntity = (id: string, updates: Partial<DraftEntity>) => {
    updateDraftKey(prev => ({
      ...prev,
      entities: prev.entities.map(e => e.id === id ? { ...e, ...updates } : e)
    }));
  };

  const duplicateEntity = (id: string) => {
    updateDraftKey(prev => {
      const entityToCopy = prev.entities.find(e => e.id === id);
      if (!entityToCopy) return prev;

      const newEntityId = generateId();
      const newScores: Record<string, any> = {};
      Object.entries(entityToCopy.scores).forEach(([k, v]) => {
        newScores[k] = typeof v === 'object' && v !== null ? { ...v } : v;
      });

      const newEntity: DraftEntity = {
        ...entityToCopy,
        id: newEntityId,
        name: `${entityToCopy.name} (${t('copy')})`,
        scores: newScores,
        media: entityToCopy.media ? [...entityToCopy.media] : undefined
      };

      return {
        ...prev,
        entities: [...prev.entities, newEntity]
      };
    });
  };

  const setScore = (entityId: string, itemId: string, value: any) => {
    updateDraftKey(prev => ({
      ...prev,
      entities: prev.entities.map(e => {
        if (e.id === entityId) {
          const newScores = { ...e.scores };
          if (value === null || value === false || value === '') {
            delete newScores[itemId];
          } else {
            newScores[itemId] = value;
          }
          return { ...e, scores: newScores };
        }
        return e;
      })
    }));
  };

  const reorderEntityMedia = (entityId: string, from: number, to: number) => {
    if (from === to) return;
    updateDraftKey(prev => ({
      ...prev,
      entities: prev.entities.map(e => e.id === entityId && e.media ? { ...e, media: reorderArray(e.media, from, to) } : e)
    }));
  };

  const selectedEntity = draftKey.entities.find(e => e.id === selectedEntityId);

  const renderEntityList = () => {
    const renderNode = (id: string, depth: number) => {
        const e = draftKey.entities.find(x => x.id === id);
        if (!e) return null;
        const children = draftKey.entities.filter(x => x.parentId === id);
        const isCollapsed = collapsedEntities.has(e.id);
        return (
            <React.Fragment key={e.id}>
                <div
                    draggable
                    data-entity-id={e.id}
                    onContextMenu={(ev) => ev.preventDefault()}
                    onDragStart={(ev) => {
                        ev.stopPropagation();
                        setDraggedItem({ type: 'entity', id: e.id });
                    }}
                    onDragEnd={() => {
                        setDraggedItem(null);
                        setDragOverId(null);
                    }}
                    onDragOver={(ev) => {
                        ev.preventDefault();
                        ev.stopPropagation();
                        if (draggedItem?.type === 'entity' && draggedItem.id !== e.id) {
                            let current: string | undefined = e.id;
                            let isCycle = false;
                            while (current) {
                                if (current === draggedItem.id) { isCycle = true; break; }
                                current = draftKey.entities.find(x => x.id === current)?.parentId;
                            }
                            if (!isCycle && dragOverId !== e.id) setDragOverId(e.id);
                        }
                    }}
                    onDragLeave={() => {
                        if (dragOverId === e.id) setDragOverId(null);
                    }}
                    onDrop={(ev) => {
                        ev.preventDefault();
                        ev.stopPropagation();
                        setDragOverId(null);
                        if (draggedItem?.type === 'entity' && draggedItem.id !== e.id) {
                            let current: string | undefined = e.id;
                            let isCycle = false;
                            while (current) {
                                if (current === draggedItem.id) { isCycle = true; break; }
                                current = draftKey.entities.find(x => x.id === current)?.parentId;
                            }
                            if (!isCycle) updateEntity(draggedItem.id, { parentId: e.id });
                        }
                        setDraggedItem(null);
                    }}
                    onTouchStart={(ev) => {
                        ev.stopPropagation();
                        lastTouchPos.current = { x: ev.touches[0].clientX, y: ev.touches[0].clientY };
                        touchTimeout.current = setTimeout(() => {
                            setDraggedItem({ type: 'entity', id: e.id });
                            if (navigator.vibrate) navigator.vibrate(50);
                        }, 300);
                    }}
                    onTouchMove={(ev) => {
                        const touch = ev.touches[0];
                        lastTouchPos.current = { x: touch.clientX, y: touch.clientY };
                        if (ghostRef.current) {
                            ghostRef.current.style.left = `${touch.clientX}px`;
                            ghostRef.current.style.top = `${touch.clientY}px`;
                        }
                        if (!draggedItem) {
                            if (touchTimeout.current) clearTimeout(touchTimeout.current);
                            return;
                        }
                        const el = document.elementFromPoint(touch.clientX, touch.clientY);
                        const targetEntity = el?.closest('[data-entity-id]');
                        const targetRoot = el?.closest('[data-root-drop="true"]');
                        
                        if (targetEntity) {
                            const id = targetEntity.getAttribute('data-entity-id');
                            if (id && id !== e.id) {
                                let current: string | undefined = id;
                                let isCycle = false;
                                while (current) {
                                    if (current === draggedItem.id) { isCycle = true; break; }
                                    current = draftKey.entities.find(x => x.id === current)?.parentId;
                                }
                                if (!isCycle && dragOverId !== id) setDragOverId(id);
                            }
                        } else if (targetRoot) {
                            if (dragOverId !== 'root-entity') setDragOverId('root-entity');
                        } else {
                            if (dragOverId) setDragOverId(null);
                        }
                    }}
                    onTouchEnd={(ev) => {
                        if (touchTimeout.current) clearTimeout(touchTimeout.current);
                        if (draggedItem) {
                            if (ev.cancelable) ev.preventDefault();
                            if (dragOverId && dragOverId !== 'root-entity' && dragOverId !== e.id) {
                                updateEntity(draggedItem.id, { parentId: dragOverId });
                            } else if (dragOverId === 'root-entity') {
                                updateEntity(draggedItem.id, { parentId: undefined });
                            }
                            setDraggedItem(null);
                            setDragOverId(null);
                        }
                    }}
                    onTouchCancel={() => {
                        if (touchTimeout.current) clearTimeout(touchTimeout.current);
                        setDraggedItem(null);
                        setDragOverId(null);
                    }}
                    className={`rounded-lg transition-all relative group/item flex items-center ${dragOverId === e.id ? 'ring-2 ring-accent ring-inset bg-accent/10 scale-[1.02] z-10' : ''} ${draggedItem?.id === e.id ? 'opacity-50' : ''}`}
                    style={{ paddingLeft: `${1.5 + depth * 1.5}rem`, paddingRight: '0.75rem', touchAction: draggedItem ? 'none' : 'auto' }}
                >
                    {depth > 0 && (
                        <div className="absolute top-1/2 -translate-y-1/2 border-t-2 border-border/50 pointer-events-none transition-colors group-hover/item:border-accent/50" 
                             style={{ left: `calc(${1.5 + (depth - 1) * 1.5}rem - 0.625rem)`, width: '1.5rem' }}></div>
                    )}
                    
                    {children.length > 0 && (
                        <button 
                            onClick={(ev) => { ev.stopPropagation(); toggleEntityCollapse(e.id); }} 
                            className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-black/10 dark:hover:bg-white/10 text-gray-500 cursor-pointer absolute z-20 transition-colors"
                            style={{ left: `calc(${1.5 + depth * 1.5}rem - 1.25rem)` }}
                        >
                            <Icon name="ChevronDown" size={14} className={`transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`} />
                        </button>
                    )}

                    <button onClick={() => setSelectedEntityId(e.id)} className={`w-full flex items-center gap-2 text-left py-2 px-2 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer relative z-10 ${selectedEntityId === e.id ? 'bg-accent/95 backdrop-blur-md text-white shadow-md shadow-accent/30 border border-white/20' : 'hover:bg-hover-bg/80 hover:shadow-sm hover:-translate-y-0.5 text-text border border-transparent hover:border-white/10 dark:hover:border-white/5'}`}>
                        <Icon name="Leaf" size={14} className={`shrink-0 ${selectedEntityId === e.id ? 'opacity-100' : 'opacity-60'}`} />
                        <span className="truncate">{e.name || t('kbUnnamedEntity' as any)}</span>
                    </button>
                </div>
                {children.length > 0 && !isCollapsed && (
                    <div className="relative">
                        <div className="absolute top-0 bottom-0 border-l-2 border-border/50 pointer-events-none" style={{ left: `calc(${1.5 + depth * 1.5}rem - 0.625rem)` }}></div>
                        {children.map(c => renderNode(c.id, depth + 1))}
                    </div>
                )}
            </React.Fragment>
        );
    };
    return draftKey.entities.filter(e => !e.parentId).map(e => renderNode(e.id, 0));
  };

  return (
    <div className="flex flex-col md:flex-row w-full h-full animate-fade-in">
      <div className="w-full md:w-1/3 h-[40%] md:h-full md:min-w-[280px] border-b md:border-b-0 md:border-r border-white/10 dark:border-white/5 flex flex-col bg-panel-bg/50 backdrop-blur-sm z-10 shadow-[4px_0_24px_-4px_rgba(0,0,0,0.1)] shrink-0">
        <div className="p-4 border-b border-white/10 dark:border-white/5 flex justify-between items-center bg-header-bg/85 backdrop-blur-md shadow-sm rounded-tl-3xl">
          <div className="flex items-center gap-2 font-bold text-text"><Icon name="List" size={18} className="opacity-70"/> {t('kbEntities')}</div>
          <button onClick={addEntity} className="px-3 py-1.5 bg-accent/95 backdrop-blur-md border border-white/20 text-white rounded-lg hover:bg-accent-hover hover:-translate-y-0.5 transition-all duration-300 text-sm font-bold shadow-md hover:shadow-lg shadow-accent/30 flex items-center gap-1 cursor-pointer" title={t('kbAddEntity')}><Icon name="Plus" size={14} /> {t('kbAdd' as any)}</button>
        </div>
        <div 
          className={`overflow-y-auto flex-1 p-3 space-y-0.5 rounded-b-xl transition-colors ${dragOverId === 'root-entity' ? 'bg-accent/5 ring-2 ring-inset ring-accent' : ''}`}
          data-root-drop="true"
          onDragOver={(e) => {
              e.preventDefault();
              if (draggedItem?.type === 'entity' && dragOverId !== 'root-entity') setDragOverId('root-entity');
          }}
          onDragLeave={() => {
              if (dragOverId === 'root-entity') setDragOverId(null);
          }}
          onDrop={(e) => {
              e.preventDefault();
              setDragOverId(null);
              if (draggedItem?.type === 'entity') updateEntity(draggedItem.id, { parentId: undefined });
              setDraggedItem(null);
          }}
        >
          {renderEntityList()}
          {draftKey.entities.length === 0 && <div className="p-6 text-center text-sm opacity-50 border-2 border-dashed border-border rounded-xl mt-2">{t('kbEntities')} ({t('kbEmpty' as any)})</div>}
        </div>
      </div>
      <div className="flex-1 p-8 overflow-y-auto bg-bg/50">
        {selectedEntity ? (
          <div className="max-w-2xl flex flex-col gap-6 animate-fade-in-up">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <Icon name="Leaf" size={24} className="text-accent" />
                <h3 className="text-2xl font-bold text-accent">{selectedEntity.name || t('kbUnnamedEntity' as any)}</h3>
              </div>
              <div className="flex gap-2">
                <button onClick={() => duplicateEntity(selectedEntity.id)} className="btn-secondary"><Icon name="Copy" size={16}/> {t('kbDuplicate')}</button>
                <button onClick={() => setDeleteTarget({ type: 'entity', id: selectedEntity.id })} className="btn-danger"><Icon name="Trash2" size={16}/> {t('kbDelete')}</button>
              </div>
            </div>
            
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold opacity-80">{t('kbName')}</span>
              <input type="text" value={selectedEntity.name} onChange={e => updateEntity(selectedEntity.id, { name: e.target.value })} className="input-base text-xl font-bold" />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold opacity-80">{t('kbDescription')}</span>
              <textarea value={selectedEntity.description || ''} onChange={e => updateEntity(selectedEntity.id, { description: e.target.value })} className="input-base text-sm" rows={2} />
            </label>

            <div className="flex flex-col gap-1.5 mt-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold opacity-80">{t('kbImages' as any) || 'Images'}</span>
                <label className="text-accent hover:bg-accent/10 hover:-translate-y-0.5 px-3 py-1.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-1 cursor-pointer border border-transparent hover:border-accent/30 hover:shadow-sm">
                  <Icon name="Plus" size={14}/> {t('kbAddImage' as any)}
                  <input type="file" accept="image/*" className="hidden" onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) processAndSetImage(file, url => updateEntity(selectedEntity.id, { media: [...(selectedEntity.media || []), { url }] }));
                    e.target.value = '';
                  }} />
                </label>
              </div>
              {(selectedEntity.media?.length || 0) > 0 && (
                <div className="flex gap-3 overflow-x-auto pb-2 pt-2 pr-2">
                  {selectedEntity.media?.map((m, i) => (
                    <div key={i} className={`relative shrink-0 group rounded-xl transition-all ${dragOverId === `entity-media-${i}` ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg scale-[1.02]' : ''} ${draggedMedia?.index === i && draggedMedia.itemId === selectedEntity.id ? 'opacity-50' : ''}`}
                         draggable
                         data-entity-media-idx={i}
                         onContextMenu={(e) => e.preventDefault()}
                         onDragStart={() => setDraggedMedia({ type: 'entity', itemId: selectedEntity.id, index: i })}
                         onDragEnd={() => { setDraggedMedia(null); setDragOverId(null); }}
                         onDragOver={(e) => {
                            e.preventDefault();
                            if (draggedMedia?.type === 'entity' && draggedMedia.itemId === selectedEntity.id && draggedMedia.index !== i) {
                               if (dragOverId !== `entity-media-${i}`) setDragOverId(`entity-media-${i}`);
                            }
                         }}
                         onDragLeave={() => { if (dragOverId === `entity-media-${i}`) setDragOverId(null); }}
                         onDrop={(e) => {
                            e.preventDefault();
                            setDragOverId(null);
                            if (draggedMedia?.type === 'entity' && draggedMedia.itemId === selectedEntity.id) {
                               reorderEntityMedia(selectedEntity.id, draggedMedia.index, i);
                            }
                            setDraggedMedia(null);
                         }}
                         onTouchStart={(e) => {
                             e.stopPropagation();
                             lastTouchPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                             touchTimeout.current = setTimeout(() => {
                                 setDraggedMedia({ type: 'entity', itemId: selectedEntity.id, index: i });
                                 if (navigator.vibrate) navigator.vibrate(50);
                             }, 300);
                         }}
                         onTouchMove={(e) => {
                             const touch = e.touches[0];
                             lastTouchPos.current = { x: touch.clientX, y: touch.clientY };
                             if (ghostRef.current) {
                                 ghostRef.current.style.left = `${touch.clientX}px`;
                                 ghostRef.current.style.top = `${touch.clientY}px`;
                             }
                             if (!draggedMedia) {
                                 if (touchTimeout.current) clearTimeout(touchTimeout.current);
                                 return;
                             }
                             const el = document.elementFromPoint(touch.clientX, touch.clientY);
                             const targetMedia = el?.closest('[data-entity-media-idx]');
                             if (targetMedia) {
                                 const targetIdx = parseInt(targetMedia.getAttribute('data-entity-media-idx') || '-1');
                                 if (targetIdx !== -1 && targetIdx !== i && dragOverId !== `entity-media-${targetIdx}`) setDragOverId(`entity-media-${targetIdx}`);
                             } else {
                                 if (dragOverId) setDragOverId(null);
                             }
                         }}
                         onTouchEnd={(e) => {
                             if (touchTimeout.current) clearTimeout(touchTimeout.current);
                             if (draggedMedia) {
                                 if (e.cancelable) e.preventDefault();
                                 if (dragOverId && dragOverId.startsWith('entity-media-')) {
                                     const targetIdx = parseInt(dragOverId.replace('entity-media-', ''));
                                     if (!isNaN(targetIdx) && targetIdx !== i) reorderEntityMedia(selectedEntity.id, i, targetIdx);
                                 }
                                 setDraggedMedia(null);
                                 setDragOverId(null);
                             }
                         }}
                         onTouchCancel={() => {
                             if (touchTimeout.current) clearTimeout(touchTimeout.current);
                             setDraggedMedia(null);
                             setDragOverId(null);
                         }}
                         style={{ touchAction: draggedMedia ? 'none' : 'auto' }}>
                      <div className="h-24 w-24 relative overflow-hidden rounded-xl border border-white/20 dark:border-white/10 shadow-md cursor-move group-hover:shadow-lg transition-all" onClick={() => setEditingMedia({ type: 'entity', itemId: selectedEntity.id, mediaIndex: i })}>
                        <img src={m.url} alt={m.caption || ''} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 pointer-events-none" />
                      </div>
                      <button onClick={() => {
                        const newMedia = [...selectedEntity.media!];
                        newMedia.splice(i, 1);
                        updateEntity(selectedEntity.id, { media: newMedia });
                      }} className="absolute -top-2 -right-2 bg-red-500/95 backdrop-blur-md border border-white/20 text-white rounded-full p-1 hover:bg-red-600 transition-all opacity-0 group-hover:opacity-100 shadow-md hover:shadow-lg cursor-pointer z-10"><Icon name="X" size={12}/></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4 mt-4 border border-white/20 dark:border-white/10 p-6 rounded-3xl bg-panel-bg/50 backdrop-blur-sm shadow-md">
              <h4 className="text-lg font-bold text-text mb-1 border-b border-black/5 dark:border-white/5 pb-3 flex items-center gap-2"><Icon name="Target" size={20} className="text-accent" /> {t('kbScoring')}</h4>
              {draftKey.features.length === 0 ? <div className="p-6 text-center text-sm opacity-50 border-2 border-dashed border-border rounded-xl">{t('kbNoFeaturesToScore' as any)}</div> : null}
              
              <div className="grid grid-cols-1 gap-4">
                {draftKey.features.map(f => (
                  <div key={f.id} className="p-5 bg-bg/50 backdrop-blur-sm border border-white/20 dark:border-white/10 rounded-2xl flex flex-col gap-4 shadow-inner hover:shadow-md hover:bg-bg/80 transition-all duration-300">
                    <span className="font-bold text-base text-accent flex items-center gap-2"><Icon name={f.type === 'state' ? 'ListTree' : 'Hash'} size={16} className="opacity-70" /> {f.name}</span>
                    {f.type === 'state' ? (
                      <div className="grid grid-cols-2 gap-3 pl-6">
                        {f.states.map(s => {
                          const scoreVal = selectedEntity.scores[s.id] as string;
                          return (
                            <label key={s.id} className="flex items-center justify-between gap-2 text-sm opacity-90 hover:opacity-100 font-medium group bg-panel-bg/80 backdrop-blur-sm p-1.5 px-3 rounded-xl border border-white/20 dark:border-white/10 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-accent/50 transition-all duration-300">
                              <span className="truncate" title={s.name}>{s.name}</span>
                              <CustomSelect 
                                value={scoreVal || ''} 
                                onChange={val => setScore(selectedEntity.id, s.id, val || null)} 
                                options={[
                                  { value: '', label: t('kbScoreAbsent') },
                                  { value: '1', label: t('kbScoreCommon') },
                                  { value: '2', label: t('kbScoreRare') },
                                  { value: '3', label: t('scoreUncertain') },
                                  { value: '4', label: t('scoreCommonMisinterpret') },
                                  { value: '5', label: t('scoreRareMisinterpret') }
                                ]}
                                className="bg-bg border border-white/10 dark:border-white/5 rounded-lg text-xs p-1.5 focus:outline-none focus:border-accent min-w-[100px] cursor-pointer shadow-inner"
                              />
                            </label>
                          );
                        })}
                        {f.states.length === 0 && <span className="text-sm opacity-50 italic">{t('kbNoStatesDefined' as any)}</span>}
                      </div>
                    ) : (
                      <div className="flex items-center gap-6 pl-6">
                        <label className="flex items-center gap-3 text-sm font-medium">
                            <span className="opacity-70 w-8">{t('kbMin' as any)}:</span>
                            <input type="number" value={(selectedEntity.scores[f.id] as any)?.min ?? ''} onChange={e => {
                                const val = parseFloat(e.target.value);
                                const currentMax = (selectedEntity.scores[f.id] as any)?.max ?? val;
                                setScore(selectedEntity.id, f.id, isNaN(val) ? null : { min: val, max: currentMax });
                            }} onKeyDown={(e) => { if (e.key.length === 1 && !/^[0-9.,]$/.test(e.key)) e.preventDefault(); }} className="w-24 p-2 bg-bg/80 backdrop-blur-sm border border-white/20 dark:border-white/10 rounded-lg focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/50 shadow-inner transition-all" />
                        </label>
                        <label className="flex items-center gap-3 text-sm font-medium">
                            <span className="opacity-70 w-8">{t('kbMax' as any)}:</span>
                            <input type="number" value={(selectedEntity.scores[f.id] as any)?.max ?? ''} onChange={e => {
                                const val = parseFloat(e.target.value);
                                const currentMin = (selectedEntity.scores[f.id] as any)?.min ?? val;
                                setScore(selectedEntity.id, f.id, isNaN(val) ? null : { min: currentMin, max: val });
                            }} onKeyDown={(e) => { if (e.key.length === 1 && !/^[0-9.,]$/.test(e.key)) e.preventDefault(); }} className="w-24 p-2 bg-bg/80 backdrop-blur-sm border border-white/20 dark:border-white/10 rounded-lg focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/50 shadow-inner transition-all" />
                        </label>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        ) : (
          <div className="flex h-full items-center justify-center opacity-40 text-lg font-medium flex-col gap-4">
             <Icon name="MousePointerClick" size={48} className="opacity-50" />
             {t('kbSelectEntity' as any)}
          </div>
        )}
      </div>

      {/* Touch Drag Ghost */}
      {(draggedItem || draggedMedia) && (
        <div 
          ref={ghostRef}
          className="fixed pointer-events-none z-[9999] opacity-90 scale-105"
          style={{
            left: lastTouchPos.current.x,
            top: lastTouchPos.current.y,
            transform: 'translate(-50%, -120%)',
            willChange: 'left, top'
          }}
        >
          {draggedItem ? (
            <div className="bg-panel-bg/95 backdrop-blur-xl border border-accent/50 shadow-2xl rounded-xl px-4 py-2 flex items-center gap-2 font-bold text-accent text-sm">
              <Icon name="Leaf" size={16} />
              <span className="truncate max-w-[150px]">
                {draftKey.entities.find(e => e.id === draggedItem.id)?.name || t('kbUnnamedEntity' as any)}
              </span>
            </div>
          ) : draggedMedia ? (
            <div className="h-24 w-24 rounded-xl border-2 border-accent shadow-2xl overflow-hidden bg-panel-bg/90 backdrop-blur-sm">
              <img 
                src={draftKey.entities.find(e => e.id === draggedMedia.itemId)?.media?.[draggedMedia.index]?.url} 
                alt=""
                className="w-full h-full object-cover" 
              />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};