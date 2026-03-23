import React, { useRef, useState } from 'react';
import { Icon } from '../Icon';
import type { DraftKeyData, DraftFeature } from '../../types';
import { CustomSelect } from '../common/CustomSelect';
import { MarkdownInput } from '../common/MarkdownInput';
import { ConfirmModal, Modal } from '../modals';
import { processImage } from '../../utils/imageUtils';
import { useTreeDragAndDrop } from '../../hooks/useTreeDragAndDrop';

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
  draggedItem: { type: 'feature' | 'entity' | 'state', id: string, parentId?: string } | null;
  setDraggedItem: (item: { type: 'feature' | 'entity' | 'state', id: string, parentId?: string } | null) => void;
  dragOverId: string | null;
  setDragOverId: (id: string | null) => void;
  draggedMedia: { type: 'feature' | 'entity' | 'state', itemId: string, stateId?: string, index: number } | null;
  setDraggedMedia: (media: { type: 'feature' | 'entity' | 'state', itemId: string, stateId?: string, index: number } | null) => void;
  setEditingMedia: (media: { type: 'feature' | 'entity' | 'state', itemId: string, stateId?: string, mediaIndex: number } | null) => void;
  setDeleteTarget: (target: { type: 'feature' | 'state' | 'entity' | 'featureMedia' | 'stateMedia' | 'entityMedia', id: string, parentId?: string, mediaIndex?: number } | null) => void;
  layoutMode?: 'list' | 'edit' | 'both';
}

export const BuilderFeaturesTab: React.FC<BuilderFeaturesTabProps> = React.memo(({
  draftKey, updateDraftKey, t, selectedFeatureId, setSelectedFeatureId, collapsedFeatures, toggleFeatureCollapse,
  draggedItem, setDraggedItem, dragOverId, setDragOverId, draggedMedia, setDraggedMedia, setEditingMedia, setDeleteTarget,
  layoutMode = 'both'
}) => {
  const touchTimeout = useRef<NodeJS.Timeout | null>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const lastTouchPos = useRef({ x: 0, y: 0 });
  const [draggedValue, setDraggedValue] = useState<{ stateId: string, index: number } | null>(null);

  const featureTreeDnd = useTreeDragAndDrop({
    items: draftKey.features,
    draggedItem, setDraggedItem, dragOverId, setDragOverId,
    itemType: 'feature',
    dataAttribute: 'data-feature-id',
    onMoveItem: (id, parentId) => updateFeature(id, { parentId }),
    ghostRef
  });

  const getDefaultStateValues = (t: any) => [
    { id: '1', name: t('kbScoreCommon') || 'Common' },
    { id: '2', name: t('kbScoreRare') || 'Rare' },
    { id: '3', name: t('scoreUncertain') || 'Uncertain' },
    { id: '4', name: t('scoreCommonMisinterpret') || 'Common (misinterpreted)' },
    { id: '5', name: t('scoreRareMisinterpret') || 'Rare (misinterpreted)' }
  ];

  const [typeChangeConfirm, setTypeChangeConfirm] = useState<{featureId: string, newType: 'numeric' | 'state'} | null>(null);

  const requestTypeChange = (featureId: string, newType: 'numeric' | 'state') => {
    const feature = draftKey.features.find(f => f.id === featureId);
    if (feature && feature.type !== newType) {
      setTypeChangeConfirm({ featureId, newType });
    }
  };

  const confirmTypeChange = () => {
    if (typeChangeConfirm) {
      updateDraftKey(prev => {
        const newFeatures = prev.features.map(f => {
          if (f.id === typeChangeConfirm.featureId) {
            return { ...f, type: typeChangeConfirm.newType, states: [] };
          }
          return f;
        });
        const newEntities = prev.entities.map(e => {
          const newScores = { ...e.scores };
          delete newScores[typeChangeConfirm.featureId];
          const feature = prev.features.find(f => f.id === typeChangeConfirm.featureId);
          if (feature && feature.states) {
            feature.states.forEach(s => delete newScores[s.id]);
          }
          return { ...e, scores: newScores };
        });
        return { ...prev, features: newFeatures, entities: newEntities };
      });
      setTypeChangeConfirm(null);
    }
  };

  const addFeature = () => {
    const id = generateId();
    updateDraftKey(prev => ({
      ...prev,
      features: [...prev.features, { id, name: t('kbNewFeature'), type: 'state', states: [] }]
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
        name: `${featureToCopy.name} (${t('copy')})`,
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

  const duplicateState = (featureId: string, stateId: string) => {
    updateDraftKey(prev => ({
      ...prev,
      features: prev.features.map(f => {
        if (f.id === featureId) {
          const stateToCopy = f.states.find(s => s.id === stateId);
          if (!stateToCopy) return f;
          const newState = {
            ...stateToCopy,
            id: generateId(),
            name: `${stateToCopy.name} (${t('copy')})`,
            media: stateToCopy.media ? [...stateToCopy.media] : undefined,
            values: (stateToCopy as any).values ? [...(stateToCopy as any).values] : getDefaultStateValues(t)
          };
          return { ...f, states: [...f.states, newState] };
        }
        return f;
      })
    }));
  };

  const addState = (featureId: string) => {
    updateDraftKey(prev => ({
      ...prev,
      features: prev.features.map(f => {
        if (f.id === featureId) {
          return { ...f, states: [...f.states, { id: generateId(), name: t('kbNewState'), values: getDefaultStateValues(t) } as any] };
        }
        return f;
      })
    }));
  };

  const addStateValue = (featureId: string, stateId: string) => {
    updateDraftKey(prev => ({
      ...prev,
      features: prev.features.map(f => {
        if (f.id === featureId) {
          return {
            ...f,
            states: f.states.map(s => {
              if (s.id === stateId) {
                const vals = (s as any).values || getDefaultStateValues(t);
                return { ...s, values: [...vals, { id: generateId(), name: t('value' as any) || 'Value' }] };
              }
              return s;
            })
          };
        }
        return f;
      })
    }));
  };

  const updateStateValue = (featureId: string, stateId: string, valueId: string, updates: any) => {
    updateDraftKey(prev => ({
      ...prev,
      features: prev.features.map(f => {
        if (f.id === featureId) {
          return {
            ...f,
            states: f.states.map(s => {
              if (s.id === stateId) {
                const vals = (s as any).values || getDefaultStateValues(t);
                return { ...s, values: vals.map((v: any) => v.id === valueId ? { ...v, ...updates } : v) };
              }
              return s;
            })
          };
        }
        return f;
      })
    }));
  };

  const deleteStateValue = (featureId: string, stateId: string, valueId: string) => {
    updateDraftKey(prev => ({
      ...prev,
      features: prev.features.map(f => {
        if (f.id === featureId) {
          return {
            ...f,
            states: f.states.map(s => {
              if (s.id === stateId) {
                const vals = (s as any).values || getDefaultStateValues(t);
                return { ...s, values: vals.filter((v: any) => v.id !== valueId) };
              }
              return s;
            })
          };
        }
        return f;
      }),
      entities: prev.entities.map(e => {
        const newScores = { ...e.scores };
        if (newScores[stateId] === valueId) delete newScores[stateId];
        return { ...e, scores: newScores };
      })
    }));
  };

  const updateState = (featureId: string, stateId: string, updates: any) => {
    updateDraftKey(prev => ({
      ...prev,
      features: prev.features.map(f => {
        if (f.id === featureId) {
          return { ...f, states: f.states.map(s => s.id === stateId ? { ...s, ...updates } : s) };
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

  const moveStateToFeature = (stateId: string, fromFeatureId: string, toFeatureId: string) => {
    updateDraftKey(prev => {
      let stateToMove: any = null;
      let newFeatures = prev.features.map(f => {
        if (f.id === fromFeatureId) {
          stateToMove = f.states.find(s => s.id === stateId);
          return { ...f, states: f.states.filter(s => s.id !== stateId) };
        }
        return f;
      });

      if (stateToMove) {
        newFeatures = newFeatures.map(f => {
          if (f.id === toFeatureId && f.type === 'state') {
            return { ...f, states: [...f.states, stateToMove] };
          }
          return f;
        });
      }
      return { ...prev, features: newFeatures };
    });
  };

  const handleAddImages = async (fileList: FileList | File[] | null, targetType: 'feature' | 'state', id: string, parentId?: string) => {
    if (!fileList) return;
    const files = Array.from(fileList).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) return;
    const processed = await Promise.all(files.map(f => processImage(f)));
    const newMedia = processed.map(p => ({ url: `data:${p.mimeType};base64,${p.base64}` }));
    
    if (targetType === 'feature') {
      const feature = draftKey.features.find(f => f.id === id);
      updateFeature(id, { media: [...(feature?.media || []), ...newMedia] });
    } else if (targetType === 'state' && parentId) {
      const feature = draftKey.features.find(f => f.id === parentId);
      const state = feature?.states.find(s => s.id === id);
      updateState(parentId, id, { media: [...(state?.media || []), ...newMedia] });
    }
  };

  const selectedFeature = draftKey.features.find(f => f.id === selectedFeatureId);
  const selectedStateParent = !selectedFeature ? draftKey.features.find(f => f.states?.some(s => s.id === selectedFeatureId)) : undefined;
  const selectedState = selectedStateParent?.states.find(s => s.id === selectedFeatureId);

  const renderFeatureList = () => {
    const renderNode = (id: string, depth: number) => {
      const f = draftKey.features.find(x => x.id === id);
      if (!f) return null;
      const children = draftKey.features.filter(x => x.parentId === id);
      const hasChildren = children.length > 0 || (f.type === 'state' && f.states.length > 0);
      const iconName = f.type === 'state' ? 'ListTree' : 'Hash';
      const isCollapsed = collapsedFeatures.has(f.id);
      return (
        <React.Fragment key={f.id}>
          <div
            draggable
            data-feature-id={f.id}
            onContextMenu={(e) => e.preventDefault()}
            onDragStart={(e) => featureTreeDnd.onDragStart(e, f.id)}
            onDragEnd={featureTreeDnd.onDragEnd}
            onDragOver={(e) => {
              if (draggedItem?.type === 'state') {
                e.preventDefault();
                e.stopPropagation();
                if (draggedItem.parentId !== f.id && f.type === 'state') {
                  if (dragOverId !== f.id) setDragOverId(f.id);
                }
              } else {
                featureTreeDnd.onDragOver(e, f.id);
              }
            }}
            onDragLeave={() => featureTreeDnd.onDragLeave(f.id)}
            onDrop={(e) => {
              if (draggedItem?.type === 'state') {
                e.preventDefault();
                e.stopPropagation();
                setDragOverId(null);
                if (draggedItem.parentId !== f.id && f.type === 'state') {
                  moveStateToFeature(draggedItem.id, draggedItem.parentId!, f.id);
                }
                setDraggedItem(null);
              } else {
                featureTreeDnd.onDrop(e, f.id);
              }
            }}
            onTouchStart={(e) => featureTreeDnd.onTouchStart(e, f.id)}
            onTouchMove={(e) => {
              if (draggedItem) e.stopPropagation();
              featureTreeDnd.onTouchMove(e, f.id);
            }}
            onTouchEnd={(e) => {
              if (draggedItem) e.stopPropagation();
              featureTreeDnd.onTouchEnd(e, f.id);
            }}
            onTouchCancel={featureTreeDnd.onTouchCancel}
            onClick={() => setSelectedFeatureId(f.id)}
            className={`rounded-xl transition-all relative group/item flex items-center gap-2 py-2 pr-2 border cursor-pointer ${selectedFeatureId === f.id ? 'bg-accent/95 backdrop-blur-md text-white shadow-md shadow-accent/30 border-white/20 z-10' : 'hover:bg-hover-bg/80 hover:shadow-sm text-text border-transparent hover:border-white/10 dark:hover:border-white/5'} ${dragOverId === f.id ? 'ring-2 ring-accent ring-inset bg-accent/10 scale-[1.02] z-20' : ''} ${draggedItem?.id === f.id ? 'opacity-50' : ''}`}
            style={{ paddingLeft: `calc(${1.5 + depth * 1.5}rem + 0.5rem)`, touchAction: draggedItem ? 'none' : 'auto' }}
          >
            {hasChildren && (
              <button
                onClick={(e) => { e.stopPropagation(); toggleFeatureCollapse(f.id); }}
                className={`w-7 h-7 flex items-center justify-center rounded-md cursor-pointer absolute z-20 transition-colors ${selectedFeatureId === f.id ? 'text-white/80 hover:text-white hover:bg-white/20' : 'text-gray-500 hover:bg-black/10 dark:hover:bg-white/10'}`}
                style={{ left: `calc(${depth * 1.5}rem)` }}
              >
                <Icon name="ChevronDown" size={16} className={`transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`} />
              </button>
            )}

            <Icon name={iconName} size={14} className={`shrink-0 ${selectedFeatureId === f.id ? 'opacity-100' : 'opacity-60'}`} />
            <span className="truncate flex-1 text-sm font-medium">{f.name || t('kbUnnamedFeature')}</span>
            
            <div className="max-md:hidden opacity-0 group-hover/item:opacity-100 flex items-center gap-0.5 transition-opacity z-20 shrink-0">
              {f.type === 'state' && (
                <button onClick={(e) => { e.stopPropagation(); addState(f.id); if (collapsedFeatures.has(f.id)) toggleFeatureCollapse(f.id); }} className={`p-1.5 rounded-md cursor-pointer transition-colors ${selectedFeatureId === f.id ? 'text-white/70 hover:text-white hover:bg-white/20' : 'text-gray-400 hover:text-accent hover:bg-black/10 dark:hover:bg-white/10'}`} title={t('kbAddState')}>
                  <Icon name="Plus" size={14} />
                </button>
              )}
              <button onClick={(e) => { e.stopPropagation(); duplicateFeature(f.id); }} className={`p-1.5 rounded-md cursor-pointer transition-colors ${selectedFeatureId === f.id ? 'text-white/70 hover:text-white hover:bg-white/20' : 'text-gray-400 hover:text-accent hover:bg-black/10 dark:hover:bg-white/10'}`} title={t('kbDuplicate')}>
                <Icon name="Copy" size={14} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: 'feature', id: f.id }); }} className={`p-1.5 rounded-md cursor-pointer transition-colors ${selectedFeatureId === f.id ? 'text-white/70 hover:text-white hover:bg-red-500/80' : 'text-red-400 hover:text-red-500 hover:bg-red-500/10'}`} title={t('kbDelete')}>
                <Icon name="Trash2" size={14} />
              </button>
            </div>
          </div>
          {hasChildren && !isCollapsed && (
            <div className="relative">
              {children.map(c => renderNode(c.id, depth + 1))}
              {f.type === 'state' && f.states.map(s => (
                <div key={s.id} 
                  className={`rounded-xl transition-all relative group/state flex items-center gap-2 py-1.5 pr-2 border cursor-pointer ${selectedFeatureId === s.id ? 'bg-accent/95 backdrop-blur-md text-white shadow-md border-white/20 z-10' : 'hover:bg-hover-bg/80 text-text opacity-70 hover:opacity-100 border-transparent'} ${dragOverId === s.id ? 'ring-2 ring-accent ring-inset bg-accent/10 scale-[1.02] z-20' : ''} ${draggedItem?.id === s.id ? 'opacity-50' : ''}`} 
                  onClick={(e) => { e.stopPropagation(); setSelectedFeatureId(s.id); }} 
                  style={{ paddingLeft: `calc(${1.5 + (depth + 1) * 1.5}rem + 0.5rem)`, touchAction: draggedItem ? 'none' : 'auto' }}
                  draggable
                  data-state-id={s.id}
                  data-parent-id={f.id}
                  onDragStart={(e) => {
                    e.stopPropagation();
                    setDraggedItem({ type: 'state', id: s.id, parentId: f.id });
                  }}
                  onDragEnd={() => {
                    setDraggedItem(null);
                    setDragOverId(null);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (draggedItem?.type === 'state' && draggedItem.id !== s.id && draggedItem.parentId === f.id) {
                      if (dragOverId !== s.id) setDragOverId(s.id);
                    }
                  }}
                  onDragLeave={() => {
                    if (dragOverId === s.id) setDragOverId(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragOverId(null);
                    if (draggedItem?.type === 'state' && draggedItem.id !== s.id) {
                      if (draggedItem.parentId === f.id) {
                        updateDraftKey(prev => ({
                          ...prev,
                          features: prev.features.map(feat => {
                            if (feat.id === f.id) {
                              const fromIdx = feat.states.findIndex(st => st.id === draggedItem.id);
                              const toIdx = feat.states.findIndex(st => st.id === s.id);
                              if (fromIdx !== -1 && toIdx !== -1) {
                                return { ...feat, states: reorderArray(feat.states, fromIdx, toIdx) };
                              }
                            }
                            return feat;
                          })
                        }));
                      } else {
                        moveStateToFeature(draggedItem.id, draggedItem.parentId!, f.id);
                      }
                    }
                    setDraggedItem(null);
                  }}
                  onTouchStart={(e) => {
                    lastTouchPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                    touchTimeout.current = setTimeout(() => {
                      setDraggedItem({ type: 'state', id: s.id, parentId: f.id });
                      if (navigator.vibrate) navigator.vibrate(50);
                    }, 300);
                  }}
                  onTouchMove={(e) => {
                    if (draggedItem) e.stopPropagation();
                    const touch = e.touches[0];
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
                    const targetState = el?.closest('[data-state-id]');
                    const targetFeature = el?.closest('[data-feature-id]');
                    
                    if (targetState) {
                      const id = targetState.getAttribute('data-state-id');
                      const parentId = targetState.getAttribute('data-parent-id');
                      if (id && id !== s.id && draggedItem.type === 'state') {
                        if (dragOverId !== id) setDragOverId(id);
                      } else if (targetFeature) {
                        const fid = targetFeature.getAttribute('data-feature-id');
                        const targetFeatType = draftKey.features.find(x => x.id === fid)?.type;
                        if (fid && targetFeatType === 'state' && fid !== f.id && draggedItem.type === 'state') {
                           if (dragOverId !== fid) setDragOverId(fid);
                        }
                      }
                    } else if (targetFeature) {
                      const fid = targetFeature.getAttribute('data-feature-id');
                      const targetFeatType = draftKey.features.find(x => x.id === fid)?.type;
                      if (fid && targetFeatType === 'state' && fid !== f.id && draggedItem.type === 'state') {
                        if (dragOverId !== fid) setDragOverId(fid);
                      }
                    } else {
                      if (dragOverId) setDragOverId(null);
                    }
                  }}
                  onTouchEnd={(e) => {
                    if (draggedItem) e.stopPropagation();
                    if (touchTimeout.current) clearTimeout(touchTimeout.current);
                    if (draggedItem && draggedItem.type === 'state') {
                      if (e.cancelable) e.preventDefault();
                      if (dragOverId) {
                         const targetFeature = draftKey.features.find(x => x.id === dragOverId);
                         if (targetFeature && targetFeature.type === 'state') {
                            moveStateToFeature(draggedItem.id, draggedItem.parentId!, dragOverId);
                         } else if (dragOverId !== s.id) {
                            const targetParentFeat = draftKey.features.find(x => x.states?.some(st => st.id === dragOverId));
                            if (targetParentFeat && targetParentFeat.id === f.id && draggedItem.parentId === f.id) {
                              updateDraftKey(prev => ({
                                ...prev,
                                features: prev.features.map(feat => {
                                  if (feat.id === f.id) {
                                    const fromIdx = feat.states.findIndex(st => st.id === draggedItem.id);
                                    const toIdx = feat.states.findIndex(st => st.id === dragOverId);
                                    if (fromIdx !== -1 && toIdx !== -1) {
                                      return { ...feat, states: reorderArray(feat.states, fromIdx, toIdx) };
                                    }
                                  }
                                  return feat;
                                })
                              }));
                            } else if (targetParentFeat && targetParentFeat.id !== draggedItem.parentId) {
                               moveStateToFeature(draggedItem.id, draggedItem.parentId!, targetParentFeat.id);
                            }
                         }
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
                >
                  <span className={`w-1 h-1 rounded-full shrink-0 ${selectedFeatureId === s.id ? 'bg-white' : 'bg-text opacity-50'}`}></span>
                  <span className="truncate flex-1 text-sm font-medium">{s.name || t('kbStateName' as any) || 'Unnamed State'}</span>
                  
                  <div className="max-md:hidden opacity-0 group-hover/state:opacity-100 flex items-center gap-0.5 transition-opacity z-20 shrink-0">
                     <button onClick={(e) => { e.stopPropagation(); duplicateState(f.id, s.id); }} className={`p-1.5 rounded-md cursor-pointer transition-colors ${selectedFeatureId === s.id ? 'text-white/70 hover:text-white hover:bg-white/20' : 'text-gray-400 hover:text-accent hover:bg-black/10 dark:hover:bg-white/10'}`} title={t('kbDuplicate')}>
                        <Icon name="Copy" size={14} />
                     </button>
                     <button onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: 'state', id: s.id, parentId: f.id }); }} className={`p-1.5 rounded-md cursor-pointer transition-colors ${selectedFeatureId === s.id ? 'text-white/70 hover:text-white hover:bg-red-500/80' : 'text-red-400 hover:text-red-500 hover:bg-red-500/10'}`} title={t('kbDelete')}>
                        <Icon name="Trash2" size={14} />
                     </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </React.Fragment>
      );
    };
    return draftKey.features.filter(f => !f.parentId).map(f => renderNode(f.id, 0));
  };

  return (
    <div className={`flex flex-col ${layoutMode === 'both' ? 'md:flex-row' : ''} w-full h-full animate-fade-in`}>
      {layoutMode !== 'edit' && (
        <div className={`w-full ${layoutMode === 'both' ? 'h-full md:w-2/5 md:min-w-[220px] border-b md:border-b-0 md:border-r shadow-[4px_0_24px_-4px_rgba(0,0,0,0.1)]' : 'h-full flex-1'} border-white/10 dark:border-white/5 flex flex-col bg-panel-bg/50 backdrop-blur-sm z-10 shrink-0`}>
          <div className="p-4 border-b border-white/10 dark:border-white/5 flex justify-between items-center bg-header-bg/85 backdrop-blur-md shadow-sm rounded-tl-3xl">
            <div className="flex items-center gap-2 font-bold text-text">
              <Icon name="ListTree" size={18} className="opacity-70" />
              {t('kbFeatures')}
              <div className="flex items-center gap-1">
                <span className="bg-accent text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm shrink-0" title={t('kbFeatures')}>
                  {draftKey.features.length}
                </span>
                <span className="bg-accent/20 text-accent text-xs font-bold px-2 py-0.5 rounded-full shadow-sm shrink-0" title={t('kbStates')}>
                  {draftKey.features.reduce((acc, f) => acc + (f.type === 'state' ? f.states.length : 0), 0)}
                </span>
              </div>
            </div>
            <button onClick={addFeature} className="px-3 py-1.5 bg-accent/95 backdrop-blur-md border border-white/20 text-white rounded-lg hover:bg-accent-hover transition-all duration-300 text-sm font-bold shadow-md hover:shadow-lg shadow-accent/30 flex items-center gap-1 cursor-pointer" title={t('kbAddFeature')}><Icon name="Plus" size={14} /> {t('kbAdd' as any)}</button>
          </div>
          <div
            className={`overflow-y-auto flex-1 p-3 space-y-0.5 rounded-b-xl transition-colors ${dragOverId === 'root' ? 'bg-accent/5 ring-2 ring-inset ring-accent' : ''}`}
            data-root-drop="true"
            onDragOver={(e) => {
              e.preventDefault();
              if (draggedItem?.type === 'feature' && dragOverId !== 'root') setDragOverId('root');
            }}
            onDragLeave={() => {
              if (dragOverId === 'root') setDragOverId(null);
            }}
            onDrop={featureTreeDnd.onRootDrop}
          >
            {renderFeatureList()}
          </div>
        </div>
      )}
      {layoutMode !== 'list' && (
        <div className={`flex-1 flex flex-col min-h-0 bg-bg/50 relative max-md:fixed max-md:inset-0 max-md:z-50 max-md:bg-bg max-md:transition-transform max-md:duration-300 ${!selectedFeatureId ? 'max-md:translate-y-full max-md:opacity-0 max-md:pointer-events-none' : 'max-md:translate-y-0 max-md:opacity-100'}`}>
          <div className="md:hidden flex justify-between items-center p-4 border-b border-black/5 dark:border-white/5 bg-header-bg/95 backdrop-blur-md shrink-0 z-10">
             <h3 className="text-lg font-bold text-accent truncate pr-4">
               {selectedState ? (selectedState.name || t('kbStateName' as any) || 'Unnamed State') : (selectedFeature?.name || t('kbUnnamedFeature'))}
             </h3>
             <button onClick={() => setSelectedFeatureId(null)} className="p-2 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer shrink-0 transition-colors">
               <Icon name="X" size={20} />
             </button>
          </div>
          <div className="flex-1 p-5 md:p-8 overflow-y-auto relative min-h-0">
          {selectedFeature ? (
            <div className="max-w-xl flex flex-col gap-6 animate-fade-in-up">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <Icon name={selectedFeature.type === 'state' ? 'ListTree' : 'Hash'} size={24} className="text-accent" />
                  <h3 className="text-2xl font-bold text-accent">{selectedFeature.name || t('kbUnnamedFeature')}</h3>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => duplicateFeature(selectedFeature.id)} className="p-2 text-gray-500 hover:text-accent hover:bg-panel-bg rounded-xl shadow-sm border border-transparent hover:border-border transition-all cursor-pointer" title={t('kbDuplicate')}><Icon name="Copy" size={18} /></button>
                  <button onClick={() => setDeleteTarget({ type: 'feature', id: selectedFeature.id })} className="p-2 text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl shadow-sm border border-transparent hover:border-red-500/20 transition-all cursor-pointer" title={t('kbDelete')}><Icon name="Trash2" size={18} /></button>
                </div>
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold opacity-80">{t('kbName')}</span>
                <input type="text" value={selectedFeature.name} onChange={e => updateFeature(selectedFeature.id, { name: e.target.value })} className="input-base text-lg font-medium" />
              </label>

              <MarkdownInput label={t('kbDescription')} value={selectedFeature.description || ''} onChange={val => updateFeature(selectedFeature.id, { description: val })} rows={3} />

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold opacity-80">{t('kbType')}</span>
                <CustomSelect
                  value={selectedFeature.type}
                  onChange={val => requestTypeChange(selectedFeature.id, val as 'numeric' | 'state')}
                  options={[{ value: 'state', label: t('kbTypeState') }, { value: 'numeric', label: t('kbTypeNumeric') }]}
                  className="input-base cursor-pointer"
                />
              </label>

              {selectedFeature.type === 'numeric' && (
                <div className="flex gap-4">
                  <label className="flex flex-col gap-1.5 flex-1">
                    <span className="text-sm font-semibold opacity-80">{t('kbUnitPrefix' as any) || 'Unit Prefix'}</span>
                    <CustomSelect
                      value={selectedFeature.unit_prefix || 'none'}
                      onChange={val => updateFeature(selectedFeature.id, { unit_prefix: val })}
                      options={[
                        { value: 'none', label: t('unitNone' as any) },
                        { value: 'kilo', label: t('unitKilo' as any) },
                        { value: 'hecto', label: t('unitHecto' as any) },
                        { value: 'deca', label: t('unitDeca' as any) },
                        { value: 'deci', label: t('unitDeci' as any) },
                        { value: 'centi', label: t('unitCenti' as any) },
                        { value: 'milli', label: t('unitMilli' as any) },
                        { value: 'micro', label: t('unitMicro' as any) },
                      ]}
                      className="input-base cursor-pointer"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 flex-1">
                    <span className="text-sm font-semibold opacity-80">{t('kbBaseUnit' as any) || 'Base Unit'}</span>
                    <CustomSelect
                      value={selectedFeature.base_unit || 'none'}
                      onChange={val => updateFeature(selectedFeature.id, { base_unit: val })}
                      options={[
                        { value: 'none', label: t('unitNone' as any) },
                        { value: 'metre', label: t('unitMetre' as any) },
                        { value: 'square metre', label: t('unitSquareMetre' as any) },
                        { value: 'cubic metre', label: t('unitCubicMetre' as any) },
                        { value: 'litre', label: t('unitLitre' as any) },
                        { value: 'degrees celcius', label: t('unitCelsius' as any) },
                        { value: 'degrees planar', label: t('unitDegree' as any) },
                      ]}
                      className="input-base cursor-pointer"
                    />
                  </label>
                </div>
              )}

              {selectedFeature.type === 'state' && (
                <div className="flex flex-col gap-3 mt-2 border border-white/20 dark:border-white/10 p-5 rounded-3xl bg-panel-bg/50 backdrop-blur-sm shadow-md">
                  <div className="flex justify-between items-center border-b border-black/5 dark:border-white/5 pb-3 mb-1">
                    <span className="text-lg font-bold text-text">{t('kbStates')}</span>
                    <button onClick={() => { addState(selectedFeature.id); if (collapsedFeatures.has(selectedFeature.id)) toggleFeatureCollapse(selectedFeature.id); }} className="text-accent hover:bg-accent/10 px-3 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-1 cursor-pointer border border-transparent hover:border-accent/30">
                      <Icon name="Plus" size={14} /> {t('kbAdd' as any)}
                    </button>
                  </div>
                  <div className="flex flex-col gap-2">
                    {selectedFeature.states.length === 0 ? (
                      <span className="text-sm opacity-50 italic">{t('kbNoStatesDefined' as any)}</span>
                    ) : (
                      selectedFeature.states.map(s => (
                        <div key={s.id} onClick={() => setSelectedFeatureId(s.id)} className="flex items-center justify-between p-3 rounded-xl bg-bg border border-border hover:border-accent/50 cursor-pointer transition-colors group/editstate shadow-sm hover:shadow-md">
                          <span className="text-sm font-medium truncate flex-1">{s.name || t('kbStateName' as any) || 'Unnamed State'}</span>
                          <Icon name="ChevronRight" size={16} className="opacity-40 group-hover/editstate:opacity-100 group-hover/editstate:text-accent transition-all" />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5 mt-2">
                <span className="text-sm font-semibold opacity-80">{t('kbImages' as any) || 'Images'}</span>
                <div 
                  className={`flex gap-3 overflow-x-auto pb-2 pt-2 px-2 -mx-2 rounded-xl transition-all min-h-[116px] ${dragOverId === 'feature-images' ? 'bg-accent/10 ring-2 ring-accent ring-inset' : ''}`}
                  onDragEnter={(e) => {
                    if (e.dataTransfer.types.includes('Files')) {
                      e.preventDefault();
                      e.stopPropagation();
                    }
                  }}
                  onDragOver={(e) => {
                    if (e.dataTransfer.types.includes('Files')) {
                      e.preventDefault();
                      e.stopPropagation();
                      if (dragOverId !== 'feature-images') setDragOverId('feature-images');
                    }
                  }}
                  onDragLeave={(e) => {
                    e.stopPropagation();
                    if (dragOverId === 'feature-images') setDragOverId(null);
                  }}
                  onDrop={(e) => {
                    if (dragOverId === 'feature-images') {
                      e.preventDefault();
                      e.stopPropagation();
                      setDragOverId(null);
                      handleAddImages(e.dataTransfer.files, 'feature', selectedFeature.id);
                    }
                  }}
                >
                  {selectedFeature.media?.map((m, i) => (
                    <div key={i} className={`relative shrink-0 group rounded-xl transition-all ${dragOverId === `feature-media-${i}` ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg scale-[1.02]' : ''} ${draggedMedia?.index === i && draggedMedia.itemId === selectedFeature.id ? 'opacity-50' : ''}`}
                      draggable
                      data-feature-media-idx={i}
                      onContextMenu={(e) => e.preventDefault()}
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
                      }}
                      onTouchStart={(e) => {
                        lastTouchPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                        touchTimeout.current = setTimeout(() => {
                          setDraggedMedia({ type: 'feature', itemId: selectedFeature.id, index: i });
                          if (navigator.vibrate) navigator.vibrate(50);
                        }, 300);
                      }}
                      onTouchMove={(e) => {
                        if (draggedMedia) e.stopPropagation();
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
                        const targetMedia = el?.closest('[data-feature-media-idx]');
                        if (targetMedia) {
                          const targetIdx = parseInt(targetMedia.getAttribute('data-feature-media-idx') || '-1');
                          if (targetIdx !== -1 && targetIdx !== i && dragOverId !== `feature-media-${targetIdx}`) setDragOverId(`feature-media-${targetIdx}`);
                        } else {
                          if (dragOverId) setDragOverId(null);
                        }
                      }}
                      onTouchEnd={(e) => {
                        if (draggedMedia) e.stopPropagation();
                        if (touchTimeout.current) clearTimeout(touchTimeout.current);
                        if (draggedMedia) {
                          if (e.cancelable) e.preventDefault();
                          if (dragOverId && dragOverId.startsWith('feature-media-')) {
                            const targetIdx = parseInt(dragOverId.replace('feature-media-', ''));
                            if (!isNaN(targetIdx) && targetIdx !== i) reorderFeatureMedia(selectedFeature.id, i, targetIdx);
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
                      <div className="h-24 w-24 relative overflow-hidden rounded-xl border border-white/20 dark:border-white/10 shadow-md cursor-move group-hover:shadow-lg transition-all" onClick={() => setEditingMedia({ type: 'feature', itemId: selectedFeature.id, mediaIndex: i })}>
                        <img src={m.url} alt={m.caption || ''} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 pointer-events-none" />
                      </div>

                      <button onClick={() => {
                        setDeleteTarget({ type: 'featureMedia', id: selectedFeature.id, mediaIndex: i });
                      }} className="absolute -top-2 -right-2 bg-red-500/95 backdrop-blur-md border border-white/20 text-white rounded-full p-1 hover:bg-red-600 transition-all opacity-0 group-hover:opacity-100 shadow-md hover:shadow-lg cursor-pointer z-10"><Icon name="X" size={12} /></button>
                    </div>
                  ))}
                  <label className="w-24 h-24 shrink-0 flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-accent hover:bg-accent/5 rounded-xl cursor-pointer transition-colors text-gray-400 hover:text-accent group">
                    <Icon name="Plus" size={24} className="mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider">{t('kbAdd' as any)}</span>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={e => {
                      handleAddImages(e.target.files, 'feature', selectedFeature.id);
                      e.target.value = '';
                    }} />
                  </label>
                </div>
              </div>
            </div>
          ) : selectedState && selectedStateParent ? (
            <div className="max-w-xl flex flex-col gap-6 animate-fade-in-up">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <button onClick={() => setSelectedFeatureId(selectedStateParent.id)} className="p-2 text-gray-500 hover:text-accent hover:bg-panel-bg rounded-xl shadow-sm border border-transparent hover:border-border transition-all cursor-pointer" title={t('back')}>
                    <Icon name="ArrowLeft" size={20} />
                  </button>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">{selectedStateParent.name || t('kbUnnamedFeature')}</span>
                    <h3 className="text-2xl font-bold text-accent leading-none">{selectedState.name || t('kbStateName' as any) || 'Unnamed State'}</h3>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => duplicateState(selectedStateParent.id, selectedState.id)} className="p-2 text-gray-500 hover:text-accent hover:bg-panel-bg rounded-xl shadow-sm border border-transparent hover:border-border transition-all cursor-pointer" title={t('kbDuplicate')}><Icon name="Copy" size={18} /></button>
                  <button onClick={() => setDeleteTarget({ type: 'state', id: selectedState.id, parentId: selectedStateParent.id })} className="p-2 text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl shadow-sm border border-transparent hover:border-red-500/20 transition-all cursor-pointer" title={t('kbDelete')}><Icon name="Trash2" size={18} /></button>
                </div>
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold opacity-80">{t('kbName')}</span>
                <input type="text" value={selectedState.name} onChange={e => updateState(selectedStateParent.id, selectedState.id, { name: e.target.value })} className="input-base text-lg font-medium" />
              </label>

              <MarkdownInput label={t('kbDescription')} value={(selectedState as any).description || ''} onChange={val => updateState(selectedStateParent.id, selectedState.id, { description: val })} rows={3} />

              {/* State Media Section */}
              <div className="flex flex-col gap-1.5 mt-2">
                <span className="text-sm font-semibold opacity-80">{t('kbImages' as any) || 'Images'}</span>
                <div 
                  className={`flex gap-3 overflow-x-auto pb-2 pt-2 px-2 -mx-2 rounded-xl transition-all min-h-[116px] ${dragOverId === `state-images-${selectedState.id}` ? 'bg-accent/10 ring-2 ring-accent ring-inset' : ''}`}
                  onDragEnter={(e) => {
                    if (e.dataTransfer.types.includes('Files')) {
                      e.preventDefault();
                      e.stopPropagation();
                    }
                  }}
                  onDragOver={(e) => {
                    if (e.dataTransfer.types.includes('Files')) {
                      e.preventDefault();
                      e.stopPropagation();
                      if (dragOverId !== `state-images-${selectedState.id}`) setDragOverId(`state-images-${selectedState.id}`);
                    }
                  }}
                  onDragLeave={(e) => {
                    e.stopPropagation();
                    if (dragOverId === `state-images-${selectedState.id}`) setDragOverId(null);
                  }}
                  onDrop={(e) => {
                    if (dragOverId === `state-images-${selectedState.id}`) {
                      e.preventDefault();
                      e.stopPropagation();
                      setDragOverId(null);
                      handleAddImages(e.dataTransfer.files, 'state', selectedState.id, selectedStateParent.id);
                    }
                  }}
                >
                  {selectedState.media?.map((m, i) => (
                    <div key={i} className={`relative shrink-0 group rounded-xl transition-all ${dragOverId === `state-media-${selectedState.id}-${i}` ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg scale-[1.02]' : ''} ${draggedMedia?.index === i && draggedMedia.stateId === selectedState.id ? 'opacity-50' : ''}`}
                      draggable
                      data-state-media-idx={i}
                      onContextMenu={(e) => e.preventDefault()}
                      onDragStart={() => setDraggedMedia({ type: 'state', itemId: selectedStateParent.id, stateId: selectedState.id, index: i })}
                      onDragEnd={() => { setDraggedMedia(null); setDragOverId(null); }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (draggedMedia?.type === 'state' && draggedMedia.itemId === selectedStateParent.id && draggedMedia.stateId === selectedState.id && draggedMedia.index !== i) {
                          if (dragOverId !== `state-media-${selectedState.id}-${i}`) setDragOverId(`state-media-${selectedState.id}-${i}`);
                        }
                      }}
                      onDragLeave={() => { if (dragOverId === `state-media-${selectedState.id}-${i}`) setDragOverId(null); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOverId(null);
                        if (draggedMedia?.type === 'state' && draggedMedia.itemId === selectedStateParent.id && draggedMedia.stateId === selectedState.id) {
                          reorderStateMedia(selectedStateParent.id, selectedState.id, draggedMedia.index, i);
                        }
                        setDraggedMedia(null);
                      }}
                      onTouchStart={(e) => {
                        lastTouchPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                        touchTimeout.current = setTimeout(() => {
                          setDraggedMedia({ type: 'state', itemId: selectedStateParent.id, stateId: selectedState.id, index: i });
                          if (navigator.vibrate) navigator.vibrate(50);
                        }, 300);
                      }}
                      onTouchMove={(e) => {
                        if (draggedMedia) e.stopPropagation();
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
                        const targetMedia = el?.closest('[data-state-media-idx]');
                        if (targetMedia) {
                          const targetIdx = parseInt(targetMedia.getAttribute('data-state-media-idx') || '-1');
                          if (targetIdx !== -1 && targetIdx !== i && dragOverId !== `state-media-${selectedState.id}-${targetIdx}`) setDragOverId(`state-media-${selectedState.id}-${targetIdx}`);
                        } else {
                          if (dragOverId) setDragOverId(null);
                        }
                      }}
                      onTouchEnd={(e) => {
                        if (draggedMedia) e.stopPropagation();
                        if (touchTimeout.current) clearTimeout(touchTimeout.current);
                        if (draggedMedia) {
                          if (e.cancelable) e.preventDefault();
                          if (dragOverId && dragOverId.startsWith(`state-media-${selectedState.id}-`)) {
                            const targetIdx = parseInt(dragOverId.replace(`state-media-${selectedState.id}-`, ''));
                            if (!isNaN(targetIdx) && targetIdx !== i) reorderStateMedia(selectedStateParent.id, selectedState.id, i, targetIdx);
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
                      <div className="h-24 w-24 relative overflow-hidden rounded-xl border border-white/20 dark:border-white/10 shadow-md cursor-move group-hover:shadow-lg transition-all" onClick={() => setEditingMedia({ type: 'state', itemId: selectedStateParent.id, stateId: selectedState.id, mediaIndex: i })}>
                        <img src={m.url} alt={m.caption || ''} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 pointer-events-none" />
                      </div>
                      <button onClick={() => {
                        setDeleteTarget({ type: 'stateMedia', id: selectedState.id, parentId: selectedStateParent.id, mediaIndex: i });
                      }} className="absolute -top-2 -right-2 bg-red-500/95 backdrop-blur-md border border-white/20 text-white rounded-full p-1 hover:bg-red-600 transition-all opacity-0 group-hover:opacity-100 shadow-md hover:shadow-lg cursor-pointer z-10"><Icon name="X" size={12} /></button>
                    </div>
                  ))}
                  <label className="w-24 h-24 shrink-0 flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-accent hover:bg-accent/5 rounded-xl cursor-pointer transition-colors text-gray-400 hover:text-accent group" title={t('kbAddImage' as any)}>
                    <Icon name="Plus" size={24} className="mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider">{t('kbAdd' as any)}</span>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={e => {
                      handleAddImages(e.target.files, 'state', selectedState.id, selectedStateParent.id);
                      e.target.value = '';
                    }} />
                  </label>
                </div>
              </div>

              {/* State Values Section */}
              <div className="flex flex-col gap-3 mt-4 border border-white/20 dark:border-white/10 p-5 rounded-3xl bg-panel-bg/50 backdrop-blur-sm shadow-md">
                <div className="flex justify-between items-center border-b border-black/5 dark:border-white/5 pb-3 mb-1">
                  <span className="text-lg font-bold text-text">{t('value' as any) || 'Values'}</span>
                  <button onClick={() => addStateValue(selectedStateParent.id, selectedState.id)} className="text-accent hover:bg-accent/10 px-3 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-1 cursor-pointer border border-transparent hover:border-accent/30"><Icon name="Plus" size={14} /> {t('kbAdd' as any)}</button>
                </div>
                <div className="flex flex-col gap-2">
                  {((selectedState as any).values || getDefaultStateValues(t)).map((v: any, vIndex: number) => {
                    const isDefault = ['1', '2', '3', '4', '5'].includes(v.id);

                    const getSymbolBg = (id: string) => {
                      switch (id) {
                        case '1': return 'bg-blue-500/10 text-blue-500';
                        case '2': return 'bg-green-500/10 text-green-500';
                        case '3': return 'bg-gray-500/10 text-text';
                        case '4': return 'bg-red-500/10 text-red-500';
                        case '5': return 'bg-yellow-500/10 text-yellow-500';
                        default: return '';
                      }
                    };
                    const cycleIcon = (current: string) => {
                      if (current === 'question') return 'exclamation';
                      if (current === 'exclamation') return 'check';
                      return 'question';
                    };
                    const renderCustomIcon = (iconType: string, color: string) => {
                      if (iconType === 'question') return <span className="font-bold text-[14px] leading-none" style={{ color }}>?</span>;
                      if (iconType === 'exclamation') return <span className="font-bold text-[14px] leading-none" style={{ color }}>!</span>;
                      return <Icon name="Check" size={14} style={{ color }} />;
                    };

                    return (
                      <div
                        key={v.id}
                        draggable
                        data-state-value-idx={vIndex}
                        data-state-id={selectedState.id}
                        onContextMenu={(e) => e.preventDefault()}
                        onDragStart={(e) => { if (isDefault) return e.preventDefault(); e.stopPropagation(); setDraggedValue({ stateId: selectedState.id, index: vIndex }); }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (isDefault) return;
                          if (draggedValue?.stateId === selectedState.id && draggedValue.index !== vIndex) {
                            if (dragOverId !== `value-${selectedState.id}-${vIndex}`) setDragOverId(`value-${selectedState.id}-${vIndex}`);
                          }
                        }}
                        onDragLeave={() => { if (!isDefault && dragOverId === `value-${selectedState.id}-${vIndex}`) setDragOverId(null); }}
                        onDrop={(e) => {
                          e.preventDefault();
                          setDragOverId(null);
                          if (!isDefault && draggedValue?.stateId === selectedState.id) {
                            updateDraftKey(prev => ({
                              ...prev,
                              features: prev.features.map(f => f.id === selectedStateParent.id ? {
                                ...f, states: f.states.map(st => st.id === selectedState.id ? {
                                  ...st, values: reorderArray((st as any).values || getDefaultStateValues(t), draggedValue.index, vIndex)
                                } : st)
                              } : f)
                            }));
                          }
                          setDraggedValue(null);
                        }}
                        onDragEnd={() => { setDraggedValue(null); setDragOverId(null); }}
                        onTouchStart={(e) => {
                          if (isDefault) return;
                          lastTouchPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                          touchTimeout.current = setTimeout(() => {
                            setDraggedValue({ stateId: selectedState.id, index: vIndex });
                            if (navigator.vibrate) navigator.vibrate(50);
                          }, 300);
                        }}
                        onTouchMove={(e) => {
                          if (draggedValue) e.stopPropagation();
                          const touch = e.touches[0];
                          lastTouchPos.current = { x: touch.clientX, y: touch.clientY };
                          if (ghostRef.current) {
                            ghostRef.current.style.left = `${touch.clientX}px`;
                            ghostRef.current.style.top = `${touch.clientY}px`;
                          }
                          if (!draggedValue) {
                            if (touchTimeout.current) clearTimeout(touchTimeout.current);
                            return;
                          }
                          const el = document.elementFromPoint(touch.clientX, touch.clientY);
                          const targetVal = el?.closest('[data-state-value-idx]');
                          if (targetVal) {
                            const targetIdx = parseInt(targetVal.getAttribute('data-state-value-idx') || '-1');
                            const targetStateId = targetVal.getAttribute('data-state-id');
                            if (targetIdx >= 5 && targetStateId === selectedState.id && targetIdx !== -1 && targetIdx !== vIndex && dragOverId !== `value-${selectedState.id}-${targetIdx}`) setDragOverId(`value-${selectedState.id}-${targetIdx}`);
                          } else {
                            if (dragOverId) setDragOverId(null);
                          }
                        }}
                        onTouchEnd={(e) => {
                          if (draggedValue) e.stopPropagation();
                          if (touchTimeout.current) clearTimeout(touchTimeout.current);
                          if (draggedValue) {
                            if (e.cancelable) e.preventDefault();
                            if (dragOverId && dragOverId.startsWith(`value-${selectedState.id}-`)) {
                              let targetIdx = parseInt(dragOverId.replace(`value-${selectedState.id}-`, ''));
                              if (targetIdx < 5) targetIdx = 5;
                              if (!isNaN(targetIdx) && targetIdx !== vIndex) {
                                updateDraftKey(prev => ({
                                  ...prev,
                                  features: prev.features.map(f => f.id === selectedStateParent.id ? {
                                    ...f, states: f.states.map(st => st.id === selectedState.id ? {
                                      ...st, values: reorderArray((st as any).values || getDefaultStateValues(t), draggedValue.index, targetIdx)
                                    } : st)
                                  } : f)
                                }));
                              }
                            }
                            setDraggedValue(null);
                            setDragOverId(null);
                          }
                        }}
                        onTouchCancel={() => {
                          if (touchTimeout.current) clearTimeout(touchTimeout.current);
                          setDraggedValue(null);
                          setDragOverId(null);
                        }}
                        style={{ touchAction: (draggedValue || isDefault) ? 'none' : 'auto' }}
                        className={`flex gap-3 items-center group/val ${!isDefault ? 'cursor-grab hover:bg-black/5 dark:hover:bg-white/5' : ''} rounded-xl px-3 py-2 -mx-3 transition-all ${dragOverId === `value-${selectedState.id}-${vIndex}` ? 'ring-2 ring-accent scale-[1.02] bg-accent/5' : ''} ${draggedValue?.index === vIndex && draggedValue?.stateId === selectedState.id ? 'opacity-50' : ''}`}
                      >
                        <Icon name="GripVertical" size={16} className={`opacity-30 shrink-0 transition-opacity ${!isDefault ? 'group-hover/val:opacity-100 cursor-grab' : 'invisible'}`} />
                        {isDefault ? (
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${getSymbolBg(v.id)}`}>
                            {v.id === '1' ? <Icon name="Check" size={16} /> : v.id === '2' ? <Icon name="Check" size={16} /> : v.id === '3' ? <span className="font-bold text-[17px] leading-none">?</span> : v.id === '4' ? <Icon name="Check" size={16} /> : <Icon name="Check" size={16} />}
                          </div>
                        ) : (
                          <button onClick={() => updateStateValue(selectedStateParent.id, selectedState.id, v.id, { iconType: cycleIcon(v.iconType || 'check') })} title={t('edit' as any)} className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 cursor-pointer hover:opacity-80 transition-opacity border border-border" style={{ backgroundColor: `color-mix(in srgb, ${v.color || 'var(--color-accent)'} 15%, transparent)` }}>
                            {renderCustomIcon(v.iconType || 'check', v.color || 'var(--color-accent)')}
                          </button>
                        )}

                        {isDefault ? (
                          <span className="flex-1 text-sm px-2 py-1.5 font-medium opacity-80">{v.name}</span>
                        ) : (
                          <input type="text" value={v.name} onChange={e => updateStateValue(selectedStateParent.id, selectedState.id, v.id, { name: e.target.value })} className="flex-1 text-sm p-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg focus:border-accent hover:border-black/20 dark:hover:border-white/20 focus:outline-none transition-colors" placeholder={t('value' as any)} />
                        )}

                        {!isDefault && <input type="color" value={v.color || '#3b82f6'} onChange={e => updateStateValue(selectedStateParent.id, selectedState.id, v.id, { color: e.target.value })} className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0 bg-transparent shrink-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch]:rounded-lg" title="Select color" />}
                        {!isDefault && <button onClick={() => deleteStateValue(selectedStateParent.id, selectedState.id, v.id)} className="opacity-0 group-hover/val:opacity-100 text-red-400 hover:text-red-600 transition-opacity p-2 bg-red-400/10 rounded-lg hover:bg-red-400/20"><Icon name="X" size={16} /></button>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center opacity-40 text-lg font-medium flex-col gap-4 pointer-events-none">
              <Icon name="MousePointerClick" size={48} className="opacity-50" />
              {t('kbSelectFeature' as any)}
            </div>
          )}
          </div>
        </div>
      )}

      {/* Touch Drag Ghost */}
      {(draggedItem || draggedMedia || draggedValue) && (
        <div
          ref={ghostRef}
          className="fixed pointer-events-none z-9999 opacity-90 scale-105"
          style={{
            left: draggedItem?.type === 'feature' ? featureTreeDnd.lastTouchPos.current.x : lastTouchPos.current.x,
            top: draggedItem?.type === 'feature' ? featureTreeDnd.lastTouchPos.current.y : lastTouchPos.current.y,
            transform: 'translate(-50%, -120%)',
            willChange: 'left, top'
          }}
        >
          {draggedItem ? (
            <div className="bg-panel-bg/95 backdrop-blur-xl border border-accent/50 shadow-2xl rounded-xl px-4 py-2 flex items-center gap-2 font-bold text-accent text-sm">
              <Icon name={draggedItem.type === 'state' ? 'List' : (draftKey.features.find(f => f.id === draggedItem.id)?.type === 'state' ? 'ListTree' : 'Hash')} size={16} />
              <span className="truncate max-w-[150px]">
                {draggedItem.type === 'state' ? 
                  (draftKey.features.find(f => f.id === draggedItem.parentId)?.states.find(s => s.id === draggedItem.id)?.name || t('kbStateName' as any) || 'Unnamed State')
                : (draftKey.features.find(f => f.id === draggedItem.id)?.name || t('kbUnnamedFeature'))}
              </span>
            </div>
          ) : draggedMedia ? (
            <div className="h-24 w-24 rounded-xl border-2 border-accent shadow-2xl overflow-hidden bg-panel-bg/90 backdrop-blur-sm">
              <img
                src={
                  draggedMedia.type === 'feature'
                    ? draftKey.features.find(f => f.id === draggedMedia.itemId)?.media?.[draggedMedia.index]?.url
                    : draftKey.features.find(f => f.id === draggedMedia.itemId)?.states.find(s => s.id === draggedMedia.stateId)?.media?.[draggedMedia.index]?.url
                }
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          ) : draggedValue ? (
            <div className="bg-panel-bg/95 backdrop-blur-xl border border-accent/50 shadow-2xl rounded-xl px-4 py-2 flex items-center gap-2 font-bold text-accent text-sm">
              <Icon name="List" size={16} />
              <span>{t('value' as any) || 'Value'}</span>
            </div>
          ) : null}
        </div>
      )}

      <ConfirmModal
        isOpen={typeChangeConfirm !== null}
        onClose={() => setTypeChangeConfirm(null)}
        onConfirm={confirmTypeChange}
        title={t('kbChangeType' as any)}
        message={
          <div className="flex items-start gap-3 text-red-500 bg-red-500/10 p-4 rounded-xl border border-red-500/20">
            <Icon name="TriangleAlert" size={24} className="shrink-0 mt-0.5" />
            <p className="text-sm font-medium leading-relaxed">{t('kbTypeChangeWarning' as any)}</p>
          </div>
        }
        confirmText={t('confirm' as any)}
        cancelText={t('cancel')}
        isDestructive={true}
      />
    </div>
  );
});