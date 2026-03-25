import React, { useRef, useState } from 'react';
import { Icon } from '../common/Icon';
import type { DraftKeyData, DraftFeature } from '../../types';
import { ConfirmModal, BuilderFeatureModal } from '../modals';
import { processImage } from '../../utils/imageUtils';
import { useTreeDragAndDrop } from '../../hooks';

const generateId = () => Math.random().toString(36).substr(2, 9);

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
}

export const BuilderFeaturesTab: React.FC<BuilderFeaturesTabProps> = React.memo(({
  draftKey, updateDraftKey, t, selectedFeatureId, setSelectedFeatureId, collapsedFeatures, toggleFeatureCollapse,
  draggedItem, setDraggedItem, dragOverId, setDragOverId, draggedMedia, setDraggedMedia, setEditingMedia, setDeleteTarget
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

  const [typeChangeConfirm, setTypeChangeConfirm] = useState<{ featureId: string, newType: 'numeric' | 'state' } | null>(null);

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
      features: prev.features.map(f => {
        if (f.id === featureId && f.media) {
          const newMedia = [...f.media];
          const [moved] = newMedia.splice(from, 1);
          newMedia.splice(to, 0, moved);
          return { ...f, media: newMedia };
        }
        return f;
      })
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
            states: f.states.map(s => {
              if (s.id === stateId && s.media) {
                const newMedia = [...s.media];
                const [moved] = newMedia.splice(from, 1);
                newMedia.splice(to, 0, moved);
                return { ...s, media: newMedia };
              }
              return s;
            })
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
            className={`feature-item flex items-center gap-2 p-1.5 rounded-xl transition-all duration-300 relative group/item cursor-pointer hover:bg-hover-bg/80 hover:shadow-md hover:backdrop-blur-sm ${selectedFeatureId === f.id ? 'bg-accent/20 shadow-inner ring-2 ring-accent' : 'border border-transparent'} ${dragOverId === f.id ? 'ring-2 ring-accent ring-inset bg-accent/10 scale-[1.02] z-20' : ''} ${draggedItem?.id === f.id ? 'opacity-50' : ''}`}
            style={{ paddingLeft: `calc(${1.5 + depth * 1.5}rem + 0.5rem)`, touchAction: draggedItem ? 'none' : 'auto' }}
          >
            {hasChildren && (
              <button
                onClick={(e) => { e.stopPropagation(); toggleFeatureCollapse(f.id); }}
                className={`w-7 h-7 flex items-center justify-center rounded-md cursor-pointer absolute z-20 transition-colors ${selectedFeatureId === f.id ? 'text-accent hover:bg-accent/10' : 'text-gray-500 hover:bg-black/10 dark:hover:bg-white/10'}`}
                style={{ left: `calc(${depth * 1.5}rem)` }}
              >
                <Icon name="ChevronRight" size={16} className={`transition-transform duration-200 ${!isCollapsed ? 'rotate-90' : ''}`} />
              </button>
            )}

            {f.media && f.media.length > 0 ? (
              <img src={f.media[0].url} alt={f.name} className="w-10 h-10 object-cover rounded-lg shadow-sm shrink-0" />
            ) : (
              <div className="w-10 h-10 bg-header-bg/80 rounded-lg shadow-sm shrink-0 flex items-center justify-center text-gray-400">
                <Icon name={iconName} size={20} className={`shrink-0 ${selectedFeatureId === f.id ? 'opacity-100 text-accent' : 'opacity-60'}`} />
              </div>
            )}
            <span className="truncate flex-1 text-sm font-medium">{f.name || t('kbUnnamedFeature')}</span>

            <div className="max-md:hidden opacity-0 group-hover/item:opacity-100 flex items-center gap-0.5 transition-opacity z-20 shrink-0 pr-1">
              {f.type === 'state' && (
                <button onClick={(e) => { e.stopPropagation(); addState(f.id); if (collapsedFeatures.has(f.id)) toggleFeatureCollapse(f.id); }} className={`p-1.5 rounded-md cursor-pointer transition-colors ${selectedFeatureId === f.id ? 'text-accent hover:bg-accent/10' : 'text-gray-400 hover:text-accent hover:bg-black/10 dark:hover:bg-white/10'}`} title={t('kbAddState')}>
                  <Icon name="Plus" size={14} />
                </button>
              )}
              <button onClick={(e) => { e.stopPropagation(); duplicateFeature(f.id); }} className={`p-1.5 rounded-md cursor-pointer transition-colors ${selectedFeatureId === f.id ? 'text-accent hover:bg-accent/10' : 'text-gray-400 hover:text-accent hover:bg-black/10 dark:hover:bg-white/10'}`} title={t('kbDuplicate')}>
                <Icon name="Copy" size={14} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: 'feature', id: f.id }); }} className={`p-1.5 rounded-md cursor-pointer transition-colors ${selectedFeatureId === f.id ? 'text-red-500 hover:bg-red-500/10' : 'text-red-400 hover:text-red-500 hover:bg-red-500/10'}`} title={t('kbDelete')}>
                <Icon name="Trash2" size={14} />
              </button>
            </div>
          </div>
          {hasChildren && !isCollapsed && (
            <div className="relative">
              {children.map(c => renderNode(c.id, depth + 1))}
              {f.type === 'state' && f.states.map(s => (
                <div key={s.id}
                  className={`state-item flex items-center gap-2 p-1.5 rounded-xl transition-all duration-300 relative group/state cursor-pointer hover:bg-hover-bg/80 hover:shadow-md hover:backdrop-blur-sm ${selectedFeatureId === s.id ? 'bg-accent/20 shadow-inner ring-2 ring-accent' : 'border border-transparent opacity-80 hover:opacity-100'} ${dragOverId === s.id ? 'ring-2 ring-accent ring-inset bg-accent/10 scale-[1.02] z-20' : ''} ${draggedItem?.id === s.id ? 'opacity-50' : ''}`}
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
                                const newStates = [...feat.states];
                                const [moved] = newStates.splice(fromIdx, 1);
                                newStates.splice(toIdx, 0, moved);
                                return { ...feat, states: newStates };
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
                                    const newStates = [...feat.states];
                                    const [moved] = newStates.splice(fromIdx, 1);
                                    newStates.splice(toIdx, 0, moved);
                                    return { ...feat, states: newStates };
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
                  {s.media && s.media.length > 0 ? (
                    <img src={s.media[0].url} alt={s.name} className="w-8 h-8 object-cover rounded-lg shadow-sm shrink-0" />
                  ) : (
                    <div className="w-8 h-8 bg-header-bg/80 rounded-lg shadow-sm shrink-0 flex items-center justify-center text-gray-400">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${selectedFeatureId === s.id ? 'bg-accent' : 'bg-text opacity-50'}`}></span>
                    </div>
                  )}
                  <span className="truncate flex-1 text-sm font-medium">{s.name || t('kbStateName' as any) || 'Unnamed State'}</span>

                  <div className="max-md:hidden opacity-0 group-hover/state:opacity-100 flex items-center gap-0.5 transition-opacity z-20 shrink-0 pr-1">
                    <button onClick={(e) => { e.stopPropagation(); duplicateState(f.id, s.id); }} className={`p-1.5 rounded-md cursor-pointer transition-colors ${selectedFeatureId === s.id ? 'text-accent hover:bg-accent/10' : 'text-gray-400 hover:text-accent hover:bg-black/10 dark:hover:bg-white/10'}`} title={t('kbDuplicate')}>
                      <Icon name="Copy" size={14} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: 'state', id: s.id, parentId: f.id }); }} className={`p-1.5 rounded-md cursor-pointer transition-colors ${selectedFeatureId === s.id ? 'text-red-500 hover:bg-red-500/10' : 'text-red-400 hover:text-red-500 hover:bg-red-500/10'}`} title={t('kbDelete')}>
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
    <div className="flex flex-col w-full h-full animate-fade-in">
      <div className="p-3.5 border-b border-black/5 dark:border-white/5 flex justify-between items-center bg-header-bg/85 backdrop-blur-md shadow-sm shrink-0 z-10">
        <div className="panel-title font-bold flex items-center gap-2 text-lg tracking-tight min-w-0 pr-2">
          <Icon name="ListTree" size={20} className="shrink-0 text-accent" />
          <span className="truncate text-accent">{t('kbFeatures')}</span>
          <div className="flex items-center gap-1 shrink-0">
            <span className="bg-accent text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm" title={t('kbFeatures')}>
              {draftKey.features.length}
            </span>
            <span className="bg-accent/20 text-accent text-xs font-bold px-2 py-0.5 rounded-full shadow-sm" title={t('kbStates')}>
              {draftKey.features.reduce((acc, f) => acc + (f.type === 'state' ? f.states.length : 0), 0)}
            </span>
          </div>
        </div>
        <button onClick={addFeature} className="shrink-0 px-3 py-1.5 bg-accent/95 backdrop-blur-md border border-white/20 text-white rounded-lg hover:bg-accent-hover transition-all duration-300 text-sm font-bold shadow-md hover:shadow-lg flex items-center gap-1 cursor-pointer" title={t('kbAddFeature')}><Icon name="Plus" size={14} /> <span className="hidden sm:inline">{t('kbAdd' as any)}</span></button>
      </div>
      <div
        className={`panel-content grow p-3 space-y-0.5 overflow-y-auto transition-colors ${dragOverId === 'root' ? 'bg-accent/5 ring-2 ring-inset ring-accent' : ''}`}
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

      <BuilderFeatureModal
        isOpen={!!selectedFeatureId && (!!selectedFeature || !!selectedState)}
        onClose={() => setSelectedFeatureId(null)}
        selectedFeature={selectedFeature}
        selectedState={selectedState}
        selectedStateParent={selectedStateParent}
        setSelectedFeatureId={setSelectedFeatureId}
        t={t as any}
        updateFeature={updateFeature}
        duplicateFeature={duplicateFeature}
        setDeleteTarget={setDeleteTarget}
        requestTypeChange={requestTypeChange}
        addState={addState}
        collapsedFeatures={collapsedFeatures}
        toggleFeatureCollapse={toggleFeatureCollapse}
        duplicateState={duplicateState}
        updateState={updateState}
        addStateValue={addStateValue}
        updateStateValue={updateStateValue}
        deleteStateValue={deleteStateValue}
        dragOverId={dragOverId}
        setDragOverId={setDragOverId}
        draggedMedia={draggedMedia}
        setDraggedMedia={setDraggedMedia}
        reorderFeatureMedia={reorderFeatureMedia}
        reorderStateMedia={reorderStateMedia}
        handleAddImages={handleAddImages}
        setEditingMedia={setEditingMedia}
        ghostRef={ghostRef}
        lastTouchPos={lastTouchPos}
        touchTimeout={touchTimeout}
        draggedValue={draggedValue}
        setDraggedValue={setDraggedValue}
        getDefaultStateValues={getDefaultStateValues}
        updateDraftKey={updateDraftKey}
      />

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
