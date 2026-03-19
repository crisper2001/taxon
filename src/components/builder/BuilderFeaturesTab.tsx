import React from 'react';
import { Icon } from '../Icon';
import type { DraftKeyData, DraftFeature } from '../../types';

const generateId = () => Math.random().toString(36).substr(2, 9);
const reorderArray = <T,>(arr: T[], from: number, to: number): T[] => {
  const newArr = [...arr];
  const [moved] = newArr.splice(from, 1);
  newArr.splice(to, 0, moved);
  return newArr;
};

interface BuilderFeaturesTabProps {
  draftKey: DraftKeyData;
  updateDraftKey: (updater: (prev: DraftKeyData) => DraftKeyData) => void;
  t: (key: string) => string;
  selectedFeatureId: string | null;
  setSelectedFeatureId: (id: string | null) => void;
  collapsedFeatures: Set<string>;
  toggleFeatureCollapse: (id: string) => void;
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

export const BuilderFeaturesTab: React.FC<BuilderFeaturesTabProps> = ({
  draftKey, updateDraftKey, t, selectedFeatureId, setSelectedFeatureId, collapsedFeatures, toggleFeatureCollapse,
  draggedItem, setDraggedItem, dragOverId, setDragOverId, draggedMedia, setDraggedMedia, setEditingMedia, setDeleteTarget, processAndSetImage
}) => {
  const addFeature = () => {
    const id = generateId();
    updateDraftKey(prev => ({
      ...prev,
      features: [...prev.features, { id, name: 'New Feature', type: 'state', states: [] }]
    }));
    setSelectedFeatureId(id);
  };

  const updateFeature = (id: string, updates: Partial<DraftFeature>) => {
    updateDraftKey(prev => ({
      ...prev,
      features: prev.features.map(f => f.id === id ? { ...f, ...updates } : f)
    }));
  };

  const duplicateFeature = (id: string) => {
    updateDraftKey(prev => {
      const featureToCopy = prev.features.find(f => f.id === id);
      if (!featureToCopy) return prev;

      const newFeatureId = generateId();
      const stateIdMap = new Map<string, string>();
      
      const newStates = featureToCopy.states.map(s => {
        const newStateId = generateId();
        stateIdMap.set(s.id, newStateId);
        return { ...s, id: newStateId, media: s.media ? [...s.media] : undefined };
      });

      const newFeature: DraftFeature = {
        ...featureToCopy,
        id: newFeatureId,
        name: `${featureToCopy.name} (Copy)`,
        states: newStates,
        media: featureToCopy.media ? [...featureToCopy.media] : undefined
      };

      const newEntities = prev.entities.map(e => {
        const newScores = { ...e.scores };
        if (featureToCopy.type === 'numeric' && newScores[id]) {
          const oldScore = newScores[id];
          newScores[newFeatureId] = typeof oldScore === 'object' && oldScore !== null ? { ...oldScore } : oldScore;
        } else if (featureToCopy.type === 'state') {
          featureToCopy.states.forEach(s => {
            if (newScores[s.id]) {
              newScores[stateIdMap.get(s.id)!] = newScores[s.id];
            }
          });
        }
        return { ...e, scores: newScores };
      });

      return {
        ...prev,
        features: [...prev.features, newFeature],
        entities: newEntities
      };
    });
  };

  const addState = (featureId: string) => {
    updateDraftKey(prev => ({
      ...prev,
      features: prev.features.map(f => {
        if (f.id === featureId) {
          return { ...f, states: [...f.states, { id: generateId(), name: 'New State' }] };
        }
        return f;
      })
    }));
  };

  const updateState = (featureId: string, stateId: string, newName: string) => {
    updateDraftKey(prev => ({
      ...prev,
      features: prev.features.map(f => {
        if (f.id === featureId) {
          return { ...f, states: f.states.map(s => s.id === stateId ? { ...s, name: newName } : s) };
        }
        return f;
      })
    }));
  };

  const reorderFeatureMedia = (featureId: string, from: number, to: number) => {
    if (from === to) return;
    updateDraftKey(prev => ({
      ...prev,
      features: prev.features.map(f => f.id === featureId && f.media ? { ...f, media: reorderArray(f.media, from, to) } : f)
    }));
  };

  const reorderStateMedia = (featureId: string, stateId: string, from: number, to: number) => {
    if (from === to) return;
    updateDraftKey(prev => ({
      ...prev,
      features: prev.features.map(f => {
        if (f.id === featureId) {
          return {
            ...f,
            states: f.states.map(s => s.id === stateId && s.media ? { ...s, media: reorderArray(s.media, from, to) } : s)
          };
        }
        return f;
      })
    }));
  };

  const selectedFeature = draftKey.features.find(f => f.id === selectedFeatureId);

  const renderFeatureList = () => {
    const renderNode = (id: string, depth: number) => {
        const f = draftKey.features.find(x => x.id === id);
        if (!f) return null;
        const children = draftKey.features.filter(x => x.parentId === id);
        const iconName = f.type === 'state' ? 'ListTree' : 'Hash';
        const isCollapsed = collapsedFeatures.has(f.id);
        return (
            <React.Fragment key={f.id}>
                <div
                    draggable
                    onDragStart={(e) => {
                        e.stopPropagation();
                        setDraggedItem({ type: 'feature', id: f.id });
                    }}
                    onDragEnd={() => {
                        setDraggedItem(null);
                        setDragOverId(null);
                    }}
                    onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (draggedItem?.type === 'feature' && draggedItem.id !== f.id) {
                            let current: string | undefined = f.id;
                            let isCycle = false;
                            while (current) {
                                if (current === draggedItem.id) { isCycle = true; break; }
                                current = draftKey.features.find(x => x.id === current)?.parentId;
                            }
                            if (!isCycle && dragOverId !== f.id) setDragOverId(f.id);
                        }
                    }}
                    onDragLeave={() => {
                        if (dragOverId === f.id) setDragOverId(null);
                    }}
                    onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDragOverId(null);
                        if (draggedItem?.type === 'feature' && draggedItem.id !== f.id) {
                            let current: string | undefined = f.id;
                            let isCycle = false;
                            while (current) {
                                if (current === draggedItem.id) { isCycle = true; break; }
                                current = draftKey.features.find(x => x.id === current)?.parentId;
                            }
                            if (!isCycle) updateFeature(draggedItem.id, { parentId: f.id });
                        }
                        setDraggedItem(null);
                    }}
                    className={`rounded-lg transition-all relative group/item flex items-center ${dragOverId === f.id ? 'ring-2 ring-accent ring-inset bg-accent/10 scale-[1.02] z-10' : ''}`}
                    style={{ paddingLeft: `${1.5 + depth * 1.5}rem`, paddingRight: '0.75rem' }}
                >
                    {depth > 0 && (
                        <div className="absolute top-1/2 -translate-y-1/2 border-t-2 border-border/50 pointer-events-none transition-colors group-hover/item:border-accent/50" 
                             style={{ left: `calc(${1.5 + (depth - 1) * 1.5}rem - 0.625rem)`, width: '1.5rem' }}></div>
                    )}
                    
                    {children.length > 0 && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); toggleFeatureCollapse(f.id); }} 
                            className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-black/10 dark:hover:bg-white/10 text-gray-500 cursor-pointer absolute z-20 transition-colors"
                            style={{ left: `calc(${1.5 + depth * 1.5}rem - 1.25rem)` }}
                        >
                            <Icon name="ChevronDown" size={14} className={`transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`} />
                        </button>
                    )}

                    <button onClick={() => setSelectedFeatureId(f.id)} className={`w-full flex items-center gap-2 text-left py-2 px-2 rounded-lg text-sm font-medium transition-all cursor-pointer relative z-10 ${selectedFeatureId === f.id ? 'bg-accent text-white shadow-md' : 'hover:bg-hover-bg text-text border border-transparent hover:border-border'}`}>
                        <Icon name={iconName} size={14} className={`shrink-0 ${selectedFeatureId === f.id ? 'opacity-100' : 'opacity-60'}`} />
                        <span className="truncate">{f.name || 'Unnamed Feature'}</span>
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
    return draftKey.features.filter(f => !f.parentId).map(f => renderNode(f.id, 0));
  };

  return (
    <div className="flex w-full h-full animate-fade-in">
      <div className="w-1/3 min-w-[280px] border-r border-border flex flex-col bg-panel-bg z-10 shadow-[2px_0_8px_-4px_rgba(0,0,0,0.1)]">
        <div className="p-4 border-b border-border flex justify-between items-center bg-header-bg">
          <div className="flex items-center gap-2 font-bold text-text"><Icon name="ListTree" size={18} className="opacity-70"/> {t('kbFeatures')}</div>
          <button onClick={addFeature} className="px-3 py-1.5 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors text-sm font-bold shadow-sm flex items-center gap-1 cursor-pointer hover:shadow-md" title={t('kbAddFeature')}><Icon name="Plus" size={14} /> Add</button>
        </div>
        <div 
          className={`overflow-y-auto flex-1 p-3 space-y-0.5 rounded-b-xl transition-colors ${dragOverId === 'root-feature' ? 'bg-accent/5 ring-2 ring-inset ring-accent' : ''}`}
          onDragOver={(e) => {
              e.preventDefault();
              if (draggedItem?.type === 'feature' && dragOverId !== 'root-feature') setDragOverId('root-feature');
          }}
          onDragLeave={() => {
              if (dragOverId === 'root-feature') setDragOverId(null);
          }}
          onDrop={(e) => {
              e.preventDefault();
              setDragOverId(null);
              if (draggedItem?.type === 'feature') updateFeature(draggedItem.id, { parentId: undefined });
              setDraggedItem(null);
          }}
        >
          {renderFeatureList()}
          {draftKey.features.length === 0 && <div className="p-6 text-center text-sm opacity-50 border-2 border-dashed border-border rounded-xl mt-2">{t('kbFeatures')} (Empty)</div>}
        </div>
      </div>
      <div className="flex-1 p-8 overflow-y-auto bg-bg">
        {selectedFeature ? (
          <div className="max-w-xl flex flex-col gap-6 animate-fade-in-up">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <Icon name={selectedFeature.type === 'state' ? 'ListTree' : 'Hash'} size={24} className="text-accent" />
                <h3 className="text-2xl font-bold text-accent">{selectedFeature.name || 'Unnamed Feature'}</h3>
              </div>
              <div className="flex gap-2">
                <button onClick={() => duplicateFeature(selectedFeature.id)} className="text-text hover:bg-hover-bg border border-border px-3 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm hover:shadow-md"><Icon name="Copy" size={16}/> {t('kbDuplicate')}</button>
                <button onClick={() => setDeleteTarget({ type: 'feature', id: selectedFeature.id })} className="text-red-500 hover:bg-red-500 hover:text-white border border-red-500/30 px-3 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm hover:shadow-md"><Icon name="Trash2" size={16}/> {t('kbDelete')}</button>
              </div>
            </div>
            
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold opacity-80">{t('kbName')}</span>
              <input type="text" value={selectedFeature.name} onChange={e => updateFeature(selectedFeature.id, { name: e.target.value })} className="p-3 bg-panel-bg border border-border rounded-xl focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent text-text text-lg font-medium shadow-sm transition-all" />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold opacity-80">{t('kbDescription')}</span>
              <textarea value={selectedFeature.description || ''} onChange={e => updateFeature(selectedFeature.id, { description: e.target.value })} className="p-3 bg-panel-bg border border-border rounded-xl focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent text-text text-sm shadow-sm transition-all" rows={2} />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold opacity-80">{t('kbType')}</span>
              <select value={selectedFeature.type} onChange={e => updateFeature(selectedFeature.id, { type: e.target.value as 'numeric' | 'state' })} className="p-3 bg-panel-bg border border-border rounded-xl focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent text-text shadow-sm transition-all cursor-pointer">
                <option value="state">{t('kbTypeState')}</option>
                <option value="numeric">{t('kbTypeNumeric')}</option>
              </select>
            </label>

            <div className="flex flex-col gap-1.5 mt-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold opacity-80">Images</span>
                <label className="text-accent hover:bg-accent/10 px-3 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-1 cursor-pointer border border-transparent hover:border-accent/30">
                  <Icon name="Plus" size={14}/> Add Image
                  <input type="file" accept="image/*" className="hidden" onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) processAndSetImage(file, url => updateFeature(selectedFeature.id, { media: [...(selectedFeature.media || []), { url }] }));
                    e.target.value = '';
                  }} />
                </label>
              </div>
              {(selectedFeature.media?.length || 0) > 0 && (
                <div className="flex gap-3 overflow-x-auto pb-2 pt-2 pr-2">
                  {selectedFeature.media?.map((m, i) => (
                    <div key={i} className={`relative shrink-0 group rounded-xl transition-all ${dragOverId === `feature-media-${i}` ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg scale-[1.02]' : ''}`}
                         draggable
                         onDragStart={() => setDraggedMedia({ type: 'feature', itemId: selectedFeature.id, index: i })}
                         onDragEnd={() => { setDraggedMedia(null); setDragOverId(null); }}
                         onDragOver={(e) => {
                            e.preventDefault();
                            if (draggedMedia?.type === 'feature' && draggedMedia.itemId === selectedFeature.id && draggedMedia.index !== i) {
                               if (dragOverId !== `feature-media-${i}`) setDragOverId(`feature-media-${i}`);
                            }
                         }}
                         onDragLeave={() => { if (dragOverId === `feature-media-${i}`) setDragOverId(null); }}
                         onDrop={(e) => {
                            e.preventDefault();
                            setDragOverId(null);
                            if (draggedMedia?.type === 'feature' && draggedMedia.itemId === selectedFeature.id) {
                               reorderFeatureMedia(selectedFeature.id, draggedMedia.index, i);
                            }
                            setDraggedMedia(null);
                         }}>
                      <div className="h-24 w-24 relative overflow-hidden rounded-xl border border-border shadow-sm cursor-move" onClick={() => setEditingMedia({ type: 'feature', itemId: selectedFeature.id, mediaIndex: i })}>
                        <img src={m.url} alt={m.caption || ''} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 pointer-events-none" />
                      </div>
                      <button onClick={() => {
                        const newMedia = [...selectedFeature.media!];
                        newMedia.splice(i, 1);
                        updateFeature(selectedFeature.id, { media: newMedia });
                      }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-all opacity-0 group-hover:opacity-100 shadow-sm cursor-pointer z-10"><Icon name="X" size={12}/></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedFeature.type === 'state' && (
              <div className="flex flex-col gap-4 mt-4 border border-border p-5 rounded-2xl bg-panel-bg shadow-sm">
                <div className="flex justify-between items-center border-b border-border pb-3 mb-1">
                  <span className="text-lg font-bold text-text">{t('kbStates')}</span>
                  <button onClick={() => addState(selectedFeature.id)} className="text-accent hover:bg-accent/10 px-3 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-1 cursor-pointer border border-transparent hover:border-accent/30"><Icon name="Plus" size={14}/> {t('kbAddState')}</button>
                </div>
                <div className="flex flex-col gap-2">
                  {selectedFeature.states.map(s => (
                    <div key={s.id} className="flex flex-col gap-2 bg-bg p-3 rounded-xl border border-border shadow-sm focus-within:ring-2 focus-within:ring-accent/20 focus-within:border-accent transition-all">
                      <div className="flex gap-2 items-center">
                        <input type="text" value={s.name} onChange={e => updateState(selectedFeature.id, s.id, e.target.value)} className="flex-1 p-2 bg-transparent border-none focus:outline-none text-text font-medium" placeholder="State Name" />
                        <label className="text-gray-500 hover:text-accent p-2 rounded-lg transition-colors cursor-pointer" title="Add Image">
                          <Icon name="Image" size={18}/>
                          <input type="file" accept="image/*" className="hidden" onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) processAndSetImage(file, url => {
                              updateDraftKey(prev => ({
                                ...prev,
                                features: prev.features.map(f => f.id === selectedFeature.id ? {
                                  ...f, states: f.states.map(st => st.id === s.id ? { ...st, media: [...(st.media || []), { url }] } : st)
                                } : f)
                              }))
                            });
                            e.target.value = '';
                          }} />
                        </label>
                        <button onClick={() => setDeleteTarget({ type: 'state', id: s.id, parentId: selectedFeature.id })} className="p-2 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-colors cursor-pointer"><Icon name="X" size={18}/></button>
                      </div>
                      {(s.media?.length || 0) > 0 && (
                        <div className="flex gap-3 overflow-x-auto pb-1 mt-1 pt-2 pr-2">
                          {s.media?.map((m, i) => (
                             <div key={i} className={`relative shrink-0 group rounded-lg transition-all ${dragOverId === `state-media-${s.id}-${i}` ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg scale-[1.02]' : ''}`} 
                                 draggable 
                                 onDragStart={() => setDraggedMedia({ type: 'state', itemId: selectedFeature.id, stateId: s.id, index: i })} 
                                 onDragEnd={() => { setDraggedMedia(null); setDragOverId(null); }}
                                 onDragOver={(e) => { 
                                    e.preventDefault(); 
                                    if (draggedMedia?.type === 'state' && draggedMedia.itemId === selectedFeature.id && draggedMedia.stateId === s.id && draggedMedia.index !== i) { 
                                       if (dragOverId !== `state-media-${s.id}-${i}`) setDragOverId(`state-media-${s.id}-${i}`);
                                    } 
                                 }} 
                                 onDragLeave={() => { if (dragOverId === `state-media-${s.id}-${i}`) setDragOverId(null); }}
                                 onDrop={(e) => { 
                                    e.preventDefault(); 
                                    setDragOverId(null);
                                    if (draggedMedia?.type === 'state' && draggedMedia.itemId === selectedFeature.id && draggedMedia.stateId === s.id) { 
                                       reorderStateMedia(selectedFeature.id, s.id, draggedMedia.index, i); 
                                    } 
                                    setDraggedMedia(null); 
                                 }}>
                               <div className="h-16 w-16 relative overflow-hidden rounded-lg border border-border shadow-sm cursor-move" onClick={() => setEditingMedia({ type: 'state', itemId: selectedFeature.id, stateId: s.id, mediaIndex: i })}>
                                  <img src={m.url} alt={m.caption || ''} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 pointer-events-none" />
                               </div>
                               <button onClick={() => {
                                 updateDraftKey(prev => ({ ...prev, features: prev.features.map(f => f.id === selectedFeature.id ? { ...f, states: f.states.map(st => st.id === s.id ? { ...st, media: st.media!.filter((_, idx) => idx !== i) } : st) } : f) }));
                               }} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition-all opacity-0 group-hover:opacity-100 shadow-sm cursor-pointer z-10"><Icon name="X" size={10}/></button>
                             </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {selectedFeature.states.length === 0 && <div className="p-6 text-center text-sm opacity-50 border-2 border-dashed border-border rounded-xl">{t('kbStates')} (Empty)</div>}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center opacity-40 text-lg font-medium flex-col gap-4">
             <Icon name="MousePointerClick" size={48} className="opacity-50" />
             Select or create a feature
          </div>
        )}
      </div>
    </div>
  );
};