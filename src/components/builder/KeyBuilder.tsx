import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Icon } from '../common/Icon';
import { ConfirmModal, Modal } from '../modals';
import type { DraftKeyData, Media } from '../../types';
import { BuilderMetadataTab } from './BuilderMetadataTab';
import { BuilderFeaturesTab } from './BuilderFeaturesTab';
import { BuilderEntitiesTab } from './BuilderEntitiesTab';
import { BuilderScoringTab } from './BuilderScoringTab';
import { Header } from '../layout';
import { useSwipe } from '../../hooks';
import { Sidebar, type SidebarAction } from '../layout';

interface KeyBuilderProps {
  onExit: () => void;
  initialData?: DraftKeyData;
  onChange?: (draft: DraftKeyData) => void;
  onTestKey?: (draft: DraftKeyData) => void;
  onNewKey?: () => void;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

export const KeyBuilder: React.FC<KeyBuilderProps> = ({ onExit, initialData, onChange, onTestKey, onNewKey }) => {
  const appContext = useAppContext();
  const { t, triggerOpenNativeKey, isAiPanelVisible, setAiPanelVisible, openPreferences } = appContext;
  const hideAi = (appContext as any).hideAi;
  const [activeTab, setActiveTab] = useState<'features' | 'entities' | 'scoring'>('features');
  const [showMetadataModal, setShowMetadataModal] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  const tabBgRef = useRef<HTMLDivElement>(null);
  const featuresBtnRef = useRef<HTMLButtonElement>(null);
  const scoringBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getInitialDraft = () => {
    if (initialData) return initialData;
    const saved = localStorage.getItem('draftKeyData');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { }
    }
    return { title: t('kbNewIdentKey' as any) || 'New Identification Key', authors: '', description: '', features: [], entities: [] };
  };

  const [history, setHistory] = useState<DraftKeyData[]>(() => [getInitialDraft()]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const isFirstRender = useRef(true);
  const [keyPromptMode, setKeyPromptMode] = useState<'new' | 'open' | null>(null);

  useEffect(() => {
    if (initialData) {
      setHistory([initialData]);
      setHistoryIndex(0);
      setActiveTab('features');
      setSelectedFeatureId(null);
      setSelectedEntityId(null);
    }
  }, [initialData]);

  const draftKey = history[historyIndex] || { title: '', authors: '', description: '', features: [], entities: [] };

  useEffect(() => {
    onChange?.(draftKey);
    localStorage.setItem('draftKeyData', JSON.stringify(draftKey));

    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setIsSaved(true);
    const timer = setTimeout(() => setIsSaved(false), 2000);
    return () => clearTimeout(timer);
  }, [draftKey, onChange]);

  const updateDraftKey = useCallback((updater: (prev: DraftKeyData) => DraftKeyData) => {
    setHistory(prevHistory => {
      const currentDraft = prevHistory[historyIndex] || { title: '', authors: '', description: '', features: [], entities: [] };
      const nextState = updater(currentDraft);
      const newHistory = prevHistory.slice(0, historyIndex + 1);
      newHistory.push(nextState);
      if (newHistory.length > 50) newHistory.shift();
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex]);

  useEffect(() => {
    const handleUndoHistory = () => {
      setHistoryIndex(prev => Math.max(0, prev - 1));
    };
    const handleRestoreSnapshot = (e: any) => {
      const snapshot = e.detail;
      updateDraftKey(() => snapshot);
    };
    window.addEventListener('undo-builder-history', handleUndoHistory);
    window.addEventListener('restore-builder-snapshot', handleRestoreSnapshot);
    return () => {
      window.removeEventListener('undo-builder-history', handleUndoHistory);
      window.removeEventListener('restore-builder-snapshot', handleRestoreSnapshot);
    };
  }, [updateDraftKey]);

  const getDefaultStateValues = (t: any) => [
    { id: '1', name: t('kbScoreCommon') || 'Common' },
    { id: '2', name: t('kbScoreRare') || 'Rare' },
    { id: '3', name: t('scoreUncertain') || 'Uncertain' },
    { id: '4', name: t('scoreCommonMisinterpret') || 'Common (misinterpreted)' },
    { id: '5', name: t('scoreRareMisinterpret') || 'Rare (misinterpreted)' }
  ];

  useEffect(() => {
    const updateSlider = () => {
      const activeBtn = ['features', 'entities'].includes(activeTab) ? featuresBtnRef.current : scoringBtnRef.current;
      if (activeBtn && tabBgRef.current) {
        tabBgRef.current.style.width = `${activeBtn.offsetWidth}px`;
        tabBgRef.current.style.transform = `translateX(${activeBtn.offsetLeft}px)`;
      }
    };
    updateSlider();
    const timer = setTimeout(updateSlider, 100);
    window.addEventListener('resize', updateSlider);
    return () => { clearTimeout(timer); window.removeEventListener('resize', updateSlider); };
  }, [activeTab, t]);

  useEffect(() => {
    const parseScoreValue = (valStr: string) => {
      const lower = String(valStr).toLowerCase();
      if (lower.includes('rare') || lower.includes('raro')) return '2';
      if (lower.includes('uncertain') || lower.includes('incerto') || lower.includes('duvidoso') || lower.includes('unknown')) return '3';
      if (lower.includes('-')) {
        const parts = lower.split('-');
        if (parts.length === 2) {
          const min = parseFloat(parts[0]);
          const max = parseFloat(parts[1]);
          if (!isNaN(min) && !isNaN(max)) return { min, max };
        }
      }
      return '1'; // Default Common
    };

    const processFeatureMerge = (prevFeatures: any[], f: any) => {
      let nextFeatures = [...prevFeatures];
      if (f.action === 'delete' && f.id) {
        return nextFeatures.filter(xf => xf.id !== f.id).map(xf => xf.parentId === f.id ? { ...xf, parentId: undefined } : xf);
      }
      const featureId = f.id || generateId();
      const existingIdx = nextFeatures.findIndex(xf => xf.id === featureId);

      if (existingIdx >= 0) {
        const oldF = nextFeatures[existingIdx];
        let mergedStates = [...(oldF.states || [])];

        if (f.type === 'state' && f.states) {
          f.states.forEach((s: any) => {
            if (s.action === 'delete') {
              if (s.id) mergedStates = mergedStates.filter(st => st.id !== s.id);
            } else {
              const sName = typeof s === 'string' ? s : s.name;
              const sId = s.id || generateId();
              const existingStateIdx = mergedStates.findIndex(st => st.id === s.id || st.name === sName);

              let mergedValues = existingStateIdx >= 0 && (mergedStates[existingStateIdx] as any).values ? [...(mergedStates[existingStateIdx] as any).values] : getDefaultStateValues(t);

              if (s.values) {
                s.values.forEach((v: any) => {
                  if (v.action === 'delete') {
                    if (v.id) mergedValues = mergedValues.filter((mv: any) => mv.id !== v.id);
                  } else {
                    const vId = v.id || generateId();
                    const existingValIdx = mergedValues.findIndex((mv: any) => mv.id === v.id || mv.name === v.name);
                    if (existingValIdx >= 0) {
                      mergedValues[existingValIdx] = { ...mergedValues[existingValIdx], name: v.name };
                    } else {
                      mergedValues.push({ id: vId, name: v.name });
                    }
                  }
                });
              }

              if (existingStateIdx >= 0) {
                mergedStates[existingStateIdx] = { ...mergedStates[existingStateIdx], name: sName, description: typeof s === 'string' ? undefined : s.description, values: mergedValues };
              } else {
                mergedStates.push({ id: sId, name: sName, description: typeof s === 'string' ? undefined : s.description, values: mergedValues });
              }
            }
          });
        }
        nextFeatures[existingIdx] = {
          ...oldF,
          name: f.name || oldF.name,
          description: f.description !== undefined ? f.description : oldF.description,
          type: f.type || oldF.type,
          base_unit: f.base_unit !== undefined ? f.base_unit : oldF.base_unit,
          unit_prefix: f.unit_prefix !== undefined ? f.unit_prefix : oldF.unit_prefix,
          states: mergedStates
        };
      } else {
        const newStates = f.type === 'state' && f.states ? f.states.filter((s: any) => s.action !== 'delete').map((s: any) => {
          const sName = typeof s === 'string' ? s : s.name;
          let mergedValues = getDefaultStateValues(t);
          if (s.values) {
            s.values.forEach((v: any) => {
              if (v.action === 'delete') {
                if (v.id) mergedValues = mergedValues.filter((mv: any) => mv.id !== v.id);
              } else {
                const vId = v.id || generateId();
                const existingValIdx = mergedValues.findIndex((mv: any) => mv.id === v.id || mv.name === v.name);
                if (existingValIdx >= 0) {
                  mergedValues[existingValIdx] = { ...mergedValues[existingValIdx], name: v.name };
                } else {
                  mergedValues.push({ id: vId, name: v.name });
                }
              }
            });
          }
          return { id: s.id || generateId(), name: sName, description: typeof s === 'string' ? undefined : s.description, values: mergedValues };
        }) : [];
        nextFeatures.push({
          id: featureId, name: f.name, description: f.description, type: f.type, base_unit: f.base_unit, unit_prefix: f.unit_prefix, states: newStates
        });
      }
      return nextFeatures;
    };

    const processEntityMerge = (prevEntities: any[], ent: any, nameToIdMap: Record<string, string>, featuresList: any[]) => {
      let nextEntities = [...prevEntities];
      if (ent.action === 'delete' && ent.id) {
        return nextEntities.filter(xe => xe.id !== ent.id).map(xe => xe.parentId === ent.id ? { ...xe, parentId: undefined } : xe);
      }
      const existingIdx = nextEntities.findIndex(xe => xe.id === ent.id);
      const oldE = existingIdx >= 0 ? nextEntities[existingIdx] : null;

      let finalScores: Record<string, any> = oldE && ent.action !== 'clear_scores' && !ent.clear_scores ? { ...oldE.scores } : {};

      if (ent.scores && Array.isArray(ent.scores)) {
        ent.scores.forEach((sc: any) => {
          const fName = sc.feature_name?.toLowerCase();
          const sName = sc.state_name?.toLowerCase();
          let targetId = null;
          if (sName) {
            targetId = nameToIdMap[`${fName}::${sName}`] || nameToIdMap[sName];
          } else if (fName) {
            targetId = nameToIdMap[fName];
          }
          if (targetId) {
            if (sc.action === 'delete') {
              delete finalScores[targetId];
              const feat = featuresList.find(f => f.id === targetId);
              if (feat && feat.type === 'state' && feat.states) {
                feat.states.forEach((st: any) => {
                  delete finalScores[st.id];
                });
              }
            } else {
              finalScores[targetId] = parseScoreValue(sc.score_value !== undefined ? sc.score_value : 'Common');
            }
          }
        });
      }

      if (existingIdx >= 0) {
        nextEntities[existingIdx] = { ...oldE, name: ent.name || oldE.name, description: ent.description !== undefined ? ent.description : oldE.description, scores: finalScores };
      } else {
        nextEntities.push({ id: ent.id || generateId(), name: ent.name, description: ent.description, scores: finalScores });
      }
      return nextEntities;
    };

    const handleAddFeature = (e: any) => {
      const f = e.detail;
      updateDraftKey(prev => ({ ...prev, features: processFeatureMerge(prev.features, f) }));
    };

    const handleAddEntity = (e: any) => {
      const ent = e.detail;
      updateDraftKey(prev => {
        const nameToIdMap: Record<string, string> = {};
        prev.features.forEach(f => {
          if (f.name) nameToIdMap[f.name.toLowerCase()] = f.id;
          if (f.type === 'state' && f.states) {
            f.states.forEach(s => {
              if (s.name) {
                if (f.name) nameToIdMap[`${f.name.toLowerCase()}::${s.name.toLowerCase()}`] = s.id;
                nameToIdMap[s.name.toLowerCase()] = s.id;
              }
            });
          }
        });
        return { ...prev, entities: processEntityMerge(prev.entities, ent, nameToIdMap, prev.features) };
      });
    };

    const handleAddAllItems = (e: any) => {
      const { features = [], entities = [] } = e.detail;
      updateDraftKey(prev => {
        let nextFeatures = [...prev.features];
        features.forEach((f: any) => {
          nextFeatures = processFeatureMerge(nextFeatures, f);
        });

        const nameToIdMap: Record<string, string> = {};
        nextFeatures.forEach(f => {
          if (f.name) nameToIdMap[f.name.toLowerCase()] = f.id;
          if (f.type === 'state' && f.states) {
            f.states.forEach(s => {
              if (s.name) {
                if (f.name) nameToIdMap[`${f.name.toLowerCase()}::${s.name.toLowerCase()}`] = s.id;
                nameToIdMap[s.name.toLowerCase()] = s.id;
              }
            });
          }
        });

        let nextEntities = [...prev.entities];
        entities.forEach((ent: any) => {
          nextEntities = processEntityMerge(nextEntities, ent, nameToIdMap, nextFeatures);
        });

        return { ...prev, features: nextFeatures, entities: nextEntities };
      });
    };
    window.addEventListener('add-draft-feature', handleAddFeature);
    window.addEventListener('add-draft-entity', handleAddEntity);
    window.addEventListener('add-all-draft-items', handleAddAllItems);
    return () => {
      window.removeEventListener('add-draft-feature', handleAddFeature);
      window.removeEventListener('add-draft-entity', handleAddEntity);
      window.removeEventListener('add-all-draft-items', handleAddAllItems);
    };
  }, [t, updateDraftKey]);

  const undo = () => { if (historyIndex > 0) setHistoryIndex(prev => prev - 1); };
  const redo = () => { if (historyIndex < history.length - 1) setHistoryIndex(prev => prev + 1); };

  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [draggedMedia, setDraggedMedia] = useState<{ type: 'feature' | 'entity' | 'state', itemId: string, stateId?: string, index: number } | null>(null);
  const [editingMedia, setEditingMedia] = useState<{ type: 'feature' | 'entity' | 'state', itemId: string, stateId?: string, mediaIndex: number } | null>(null);
  const [draggedItem, setDraggedItem] = useState<{ type: 'feature' | 'entity' | 'state', id: string, parentId?: string } | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'feature' | 'state' | 'entity' | 'featureMedia' | 'stateMedia' | 'entityMedia', id: string, parentId?: string, mediaIndex?: number } | null>(null);
  const [collapsedFeatures, setCollapsedFeatures] = useState<Set<string>>(new Set());
  const [collapsedEntities, setCollapsedEntities] = useState<Set<string>>(new Set());

  const offsetIndex = isMobile ? (activeTab === 'features' ? 0 : activeTab === 'entities' ? 1 : 2) : (activeTab === 'scoring' ? 1 : 0);

  const { swipeOffset, isSwiping, handleTouchStart, handleTouchMove, handleTouchEnd } = useSwipe(
    () => {
      if (activeTab === 'features') setActiveTab('entities');
      else if (activeTab === 'entities') setActiveTab('scoring');
    },
    () => {
      if (activeTab === 'scoring') setActiveTab('entities');
      else if (activeTab === 'entities') setActiveTab('features');
    },
    activeTab === 'features',
    activeTab === 'scoring'
  );

  const exportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(draftKey, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${draftKey.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'draft_key'}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const updateFeatureMedia = (featureId: string, index: number, updates: Partial<Media>) => {
    updateDraftKey(prev => ({
      ...prev,
      features: prev.features.map(f => {
        if (f.id === featureId && f.media) {
          const newMedia = [...f.media];
          newMedia[index] = { ...newMedia[index], ...updates };
          return { ...f, media: newMedia };
        }
        return f;
      })
    }));
  };

  const updateEntityMedia = (entityId: string, index: number, updates: Partial<Media>) => {
    updateDraftKey(prev => ({
      ...prev,
      entities: prev.entities.map(e => {
        if (e.id === entityId && e.media) {
          const newMedia = [...e.media];
          newMedia[index] = { ...newMedia[index], ...updates };
          return { ...e, media: newMedia };
        }
        return e;
      })
    }));
  };

  const updateStateMedia = (featureId: string, stateId: string, index: number, updates: Partial<Media>) => {
    updateDraftKey(prev => ({
      ...prev,
      features: prev.features.map(f => {
        if (f.id === featureId) {
          return {
            ...f,
            states: f.states.map(s => {
              if (s.id === stateId && s.media) {
                const newMedia = [...s.media];
                newMedia[index] = { ...newMedia[index], ...updates };
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

  const handleCreateNew = () => {
    setHistory([{ title: t('kbNewIdentKey' as any) || 'New Identification Key', authors: '', description: '', features: [], entities: [] }]);
    setHistoryIndex(0);
    setActiveTab('features');
    setSelectedFeatureId(null);
    setSelectedEntityId(null);
    onNewKey?.();
  };

  const handleConfirmPrompt = () => {
    if (keyPromptMode === 'new') {
      handleCreateNew();
    } else if (keyPromptMode === 'open') {
      triggerOpenNativeKey();
    }
    setKeyPromptMode(null);
  };

  const toggleFeatureCollapse = useCallback((id: string) => {
    setCollapsedFeatures(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleEntityCollapse = useCallback((id: string) => {
    setCollapsedEntities(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const confirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'feature') deleteFeature(deleteTarget.id);
    else if (deleteTarget.type === 'state') deleteState(deleteTarget.parentId!, deleteTarget.id);
    else if (deleteTarget.type === 'entity') deleteEntity(deleteTarget.id);
    else if (deleteTarget.type === 'featureMedia') deleteFeatureMedia(deleteTarget.id, deleteTarget.mediaIndex!);
    else if (deleteTarget.type === 'stateMedia') deleteStateMedia(deleteTarget.parentId!, deleteTarget.id, deleteTarget.mediaIndex!);
    else if (deleteTarget.type === 'entityMedia') deleteEntityMedia(deleteTarget.id, deleteTarget.mediaIndex!);
    setDeleteTarget(null);
  };

  const deleteFeatureMedia = (featureId: string, index: number) => {
    updateDraftKey(prev => ({
      ...prev,
      features: prev.features.map(f => f.id === featureId && f.media ? { ...f, media: f.media.filter((_, i) => i !== index) } : f)
    }));
  };

  const deleteStateMedia = (featureId: string, stateId: string, index: number) => {
    updateDraftKey(prev => ({
      ...prev,
      features: prev.features.map(f => f.id === featureId ? {
        ...f, states: f.states.map(s => s.id === stateId && s.media ? { ...s, media: s.media.filter((_, i) => i !== index) } : s)
      } : f)
    }));
  };

  const deleteEntityMedia = (entityId: string, index: number) => {
    updateDraftKey(prev => ({
      ...prev,
      entities: prev.entities.map(e => e.id === entityId && e.media ? { ...e, media: e.media.filter((_, i) => i !== index) } : e)
    }));
  };

  const deleteFeature = (id: string) => {
    updateDraftKey(prev => {
      const newFeatures = prev.features.filter(f => f.id !== id).map(f => f.parentId === id ? { ...f, parentId: undefined } : f);
      return {
        ...prev,
        features: newFeatures,
        entities: prev.entities.map(e => {
          const newScores = { ...e.scores };
          const feature = prev.features.find(f => f.id === id);
          if (feature) {
            delete newScores[feature.id];
            feature.states.forEach(s => delete newScores[s.id]);
          }
          return { ...e, scores: newScores };
        })
      };
    });
    if (selectedFeatureId === id) setSelectedFeatureId(null);
  };

  const deleteState = (featureId: string, stateId: string) => {
    updateDraftKey(prev => ({
      ...prev,
      features: prev.features.map(f => {
        if (f.id === featureId) {
          return { ...f, states: f.states.filter(s => s.id !== stateId) };
        }
        return f;
      }),
      entities: prev.entities.map(e => {
        const newScores = { ...e.scores };
        delete newScores[stateId];
        return { ...e, scores: newScores };
      })
    }));
  };

  const deleteEntity = (id: string) => {
    updateDraftKey(prev => ({
      ...prev,
      entities: prev.entities.filter(e => e.id !== id).map(e => e.parentId === id ? { ...e, parentId: undefined } : e)
    }));
    if (selectedEntityId === id) setSelectedEntityId(null);
  };

  const activeEditingMedia = editingMedia ? (
    editingMedia.type === 'feature' ? draftKey.features.find(f => f.id === editingMedia.itemId)?.media?.[editingMedia.mediaIndex] :
      editingMedia.type === 'entity' ? draftKey.entities.find(e => e.id === editingMedia.itemId)?.media?.[editingMedia.mediaIndex] :
        draftKey.features.find(f => f.id === editingMedia.itemId)?.states.find(s => s.id === editingMedia.stateId)?.media?.[editingMedia.mediaIndex]
  ) : null;

  const ActionButton = ({ onClick, disabled, title, icon, iconClass = '' }: any) => (
    <button onClick={onClick} disabled={disabled} title={title} className="p-2 rounded-full transition-all duration-300 opacity-90 hover:opacity-100 hover:bg-hover-bg/80 cursor-pointer shadow-sm border border-transparent dark:border-white/10 hover:border-black/10 dark:hover:border-white/20 hover:shadow-md flex items-center justify-center shrink-0 disabled:opacity-30 disabled:cursor-not-allowed">
      <Icon name={icon} size={24} className={`opacity-80 ${iconClass}`} />
    </button>
  );

  const builderLeftActions = (
    <>
      <ActionButton onClick={() => setKeyPromptMode('new')} title={t('kbNewKey' as any)} icon="FilePlus" />
      <ActionButton onClick={() => setKeyPromptMode('open')} title={t('openNativeKey')} icon="FolderOpen" />
      <ActionButton onClick={exportJson} title={t('exportJson')} icon="Download" />
      <ActionButton onClick={() => setShowMetadataModal(true)} title={t('kbMetadata')} icon="Info" />
      <ActionButton onClick={() => onTestKey?.(draftKey)} title={t('kbTestKey' as any)} icon="Play" iconClass="text-accent" />
      <ActionButton onClick={openPreferences} title={t('preferences')} icon="Settings2" />
      <div className="w-px h-6 bg-border mx-1 opacity-50" />
      <ActionButton onClick={undo} disabled={historyIndex <= 0} title={t('kbUndo')} icon="Undo" />
      <ActionButton onClick={redo} disabled={historyIndex >= history.length - 1} title={t('kbRedo')} icon="Redo" />
    </>
  );

  const builderCenterContent = (
    <div
      className="absolute flex items-center gap-2 z-10 transition-all duration-300"
      style={{ left: '50%', transform: 'translateX(-50%)' }}
    >
      <div className="hidden md:flex relative items-center bg-black/5 dark:bg-white/5 p-1 rounded-full border border-black/5 dark:border-white/5 shadow-inner">
        <div ref={tabBgRef} className="absolute left-0 top-1 bottom-1 bg-panel-bg rounded-full shadow-sm transition-all duration-300 ease-out pointer-events-none" />
        <button
          ref={featuresBtnRef}
          onClick={() => setActiveTab('features')}
          title={`${t('kbFeatures')} & ${t('kbEntities')}`}
          className={`relative z-10 flex items-center justify-center w-14 py-1.5 rounded-full transition-colors duration-300 cursor-pointer shrink-0 ${['features', 'entities'].includes(activeTab) ? 'text-accent' : 'text-gray-500 hover:text-text'}`}
        >
          <Icon name="ListTree" size={20} />
        </button>
        <button
          ref={scoringBtnRef}
          onClick={() => setActiveTab('scoring')}
          title={t('kbScoring')}
          className={`relative z-10 flex items-center justify-center w-14 py-1.5 rounded-full transition-colors duration-300 cursor-pointer shrink-0 ${activeTab === 'scoring' ? 'text-accent' : 'text-gray-500 hover:text-text'}`}
        >
          <Icon name="Target" size={20} />
        </button>
      </div>
      <div className="flex md:hidden items-center gap-1">
        <ActionButton onClick={undo} disabled={historyIndex <= 0} title={t('kbUndo')} icon="Undo" />
        <ActionButton onClick={redo} disabled={historyIndex >= history.length - 1} title={t('kbRedo')} icon="Redo" />
      </div>
      <span className={`absolute left-full ml-3 text-xs font-bold text-green-500 dark:text-green-400 flex items-center gap-1 transition-opacity duration-500 whitespace-nowrap pointer-events-none ${isSaved ? 'opacity-100' : 'opacity-0'}`}>
        <Icon name="Check" size={14} /> <span className="hidden md:inline">{t('saved' as any)}</span>
      </span>
    </div>
  );

  const sidebarActions: SidebarAction[] = [
    { icon: 'FilePlus', label: t('kbNewKey' as any), onClick: () => setKeyPromptMode('new') },
    { icon: 'FolderOpen', label: t('openNativeKey'), onClick: () => setKeyPromptMode('open') },
    { icon: 'Download', label: t('exportJson'), onClick: exportJson },
    { icon: 'Info', label: t('kbMetadata'), onClick: () => setShowMetadataModal(true) },
    { icon: 'Play', label: t('kbTestKey' as any), onClick: () => onTestKey?.(draftKey), iconClass: 'text-accent' }
  ];

  return (
    <div className="flex flex-col h-full w-full bg-bg">
      {/* Mobile Sidebar - wrapped to control visibility and prevent shadow bleed */}
      <div className={`transition-all duration-300 ${isSidebarOpen ? 'visible' : 'invisible'}`}>
        <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} onExit={onExit} actions={sidebarActions} />
      </div>

      <Header
        isSidebarOpen={isSidebarOpen}
        setSidebarOpen={setSidebarOpen}
        leftActions={builderLeftActions}
        centerContent={builderCenterContent}
        onLogoClick={onExit}
      />

      <div className="flex flex-col grow overflow-hidden">
        <div className="flex flex-row grow overflow-hidden p-0 md:p-4 gap-0 md:gap-4">

          {/* Builder Main Content */}
          <div
            className="flex grow flex-col relative min-w-0 min-h-0"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className={`builder-mobile-view ${isSwiping ? 'is-swiping' : ''}`} style={{ '--mobile-tab-offset': `-${offsetIndex * 100}%`, '--swipe-offset': `${swipeOffset}px` } as React.CSSProperties}>

              {!isMobile ? (
                <div className={`builder-panel ${['features', 'entities'].includes(activeTab) ? 'active' : ''}`}>
                  {/* Desktop Combined Features & Entities */}
                  <div className="w-full h-full flex flex-row gap-4">
                    <div className="w-1/2 h-full flex flex-col bg-panel-bg/90 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-3xl shadow-lg overflow-hidden">
                      <BuilderFeaturesTab
                        draftKey={draftKey} updateDraftKey={updateDraftKey} t={t as any}
                        selectedFeatureId={selectedFeatureId} setSelectedFeatureId={setSelectedFeatureId}
                        collapsedFeatures={collapsedFeatures} toggleFeatureCollapse={toggleFeatureCollapse}
                        draggedItem={draggedItem} setDraggedItem={setDraggedItem}
                        dragOverId={dragOverId} setDragOverId={setDragOverId}
                        draggedMedia={draggedMedia} setDraggedMedia={setDraggedMedia}
                        setEditingMedia={setEditingMedia} setDeleteTarget={setDeleteTarget}
                      />
                    </div>
                    <div className="w-1/2 h-full flex flex-col bg-panel-bg/90 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-3xl shadow-lg overflow-hidden">
                      <BuilderEntitiesTab
                        draftKey={draftKey} updateDraftKey={updateDraftKey} t={t as any}
                        selectedEntityId={selectedEntityId} setSelectedEntityId={setSelectedEntityId}
                        collapsedEntities={collapsedEntities} toggleEntityCollapse={toggleEntityCollapse}
                        draggedItem={draggedItem} setDraggedItem={setDraggedItem}
                        dragOverId={dragOverId} setDragOverId={setDragOverId}
                        draggedMedia={draggedMedia} setDraggedMedia={setDraggedMedia}
                        setEditingMedia={setEditingMedia} setDeleteTarget={setDeleteTarget}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Mobile Separated Features */}
                  <div className={`builder-panel ${activeTab === 'features' ? 'active' : ''}`}>
                    <div className="w-full h-full flex flex-col overflow-hidden bg-panel-bg/90 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-3xl shadow-lg">
                      <BuilderFeaturesTab
                        draftKey={draftKey} updateDraftKey={updateDraftKey} t={t as any}
                        selectedFeatureId={selectedFeatureId} setSelectedFeatureId={setSelectedFeatureId}
                        collapsedFeatures={collapsedFeatures} toggleFeatureCollapse={toggleFeatureCollapse}
                        draggedItem={draggedItem} setDraggedItem={setDraggedItem}
                        dragOverId={dragOverId} setDragOverId={setDragOverId}
                        draggedMedia={draggedMedia} setDraggedMedia={setDraggedMedia}
                        setEditingMedia={setEditingMedia} setDeleteTarget={setDeleteTarget}
                      />
                    </div>
                  </div>

                  {/* Mobile Separated Entities */}
                  <div className={`builder-panel ${activeTab === 'entities' ? 'active' : ''}`}>
                    <div className="w-full h-full flex flex-col overflow-hidden bg-panel-bg/90 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-3xl shadow-lg">
                      <BuilderEntitiesTab
                        draftKey={draftKey} updateDraftKey={updateDraftKey} t={t as any}
                        selectedEntityId={selectedEntityId} setSelectedEntityId={setSelectedEntityId}
                        collapsedEntities={collapsedEntities} toggleEntityCollapse={toggleEntityCollapse}
                        draggedItem={draggedItem} setDraggedItem={setDraggedItem}
                        dragOverId={dragOverId} setDragOverId={setDragOverId}
                        draggedMedia={draggedMedia} setDraggedMedia={setDraggedMedia}
                        setEditingMedia={setEditingMedia} setDeleteTarget={setDeleteTarget}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className={`builder-panel ${activeTab === 'scoring' ? 'active' : ''} min-w-0`}>
                <div className="w-full h-full flex flex-col overflow-hidden bg-panel-bg/90 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-3xl shadow-lg min-w-0">
                  <BuilderScoringTab draftKey={draftKey} updateDraftKey={updateDraftKey} t={t as any} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Bar */}
      <div className="flex md:hidden items-center justify-around bg-panel-bg/85 backdrop-blur-xl border border-white/20 dark:border-white/10 p-2 shrink-0 z-20 shadow-lg rounded-3xl m-2" style={{ marginBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}>
        <button onClick={() => setActiveTab('features')} className={`flex flex-col items-center gap-1 p-2 min-w-[70px] rounded-2xl transition-all duration-300 relative ${activeTab === 'features' ? 'text-accent bg-accent/10 shadow-inner scale-105' : 'text-gray-500 hover:text-accent hover:bg-hover-bg/50'}`}>
          <Icon name="ListTree" size={22} className={activeTab === 'features' ? 'drop-shadow-sm' : ''} />
          <span className="text-[10px] font-bold text-center leading-none tracking-tight">{t('kbFeatures')}</span>
          {draftKey.features.length > 0 && <span className="absolute -top-1 -right-1 bg-accent/95 backdrop-blur-sm border border-white/20 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-md animate-fade-in-up">{draftKey.features.length > 99 ? '99+' : draftKey.features.length}</span>}
        </button>
        <button onClick={() => setActiveTab('entities')} className={`flex flex-col items-center gap-1 p-2 min-w-[70px] rounded-2xl transition-all duration-300 relative ${activeTab === 'entities' ? 'text-accent bg-accent/10 shadow-inner scale-105' : 'text-gray-500 hover:text-accent hover:bg-hover-bg/50'}`}>
          <Icon name="List" size={22} className={activeTab === 'entities' ? 'drop-shadow-sm' : ''} />
          <span className="text-[10px] font-bold text-center leading-none tracking-tight">{t('kbEntities')}</span>
          {draftKey.entities.length > 0 && <span className="absolute -top-1 -right-1 bg-accent/95 backdrop-blur-sm border border-white/20 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-md animate-fade-in-up">{draftKey.entities.length > 99 ? '99+' : draftKey.entities.length}</span>}
        </button>
        <button onClick={() => setActiveTab('scoring')} className={`flex flex-col items-center gap-1 p-2 min-w-[70px] rounded-2xl transition-all duration-300 relative ${activeTab === 'scoring' ? 'text-accent bg-accent/10 shadow-inner scale-105' : 'text-gray-500 hover:text-accent hover:bg-hover-bg/50'}`}>
          <Icon name="Target" size={22} className={activeTab === 'scoring' ? 'drop-shadow-sm' : ''} />
          <span className="text-[10px] font-bold text-center leading-none tracking-tight">{t('kbScoring')}</span>
        </button>
      </div>

      {/* Media Edit Modal */}
      {editingMedia && activeEditingMedia && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-60 flex items-center justify-center p-4">
          <div className="bg-panel-bg/95 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-3xl shadow-[0_16px_40px_rgba(0,0,0,0.2)] w-full max-w-4xl flex flex-col md:flex-row overflow-hidden max-h-[90vh] animate-fade-in-up">
            <div className="w-full md:w-1/2 bg-black/5 dark:bg-white/5 flex items-center justify-center p-6 relative">
              <img src={activeEditingMedia.url} alt={t('preview')} className="max-w-full max-h-full object-contain drop-shadow-md rounded-lg" />
            </div>
            <div className="w-full md:w-1/2 p-8 flex flex-col gap-6 overflow-y-auto bg-panel-bg/50">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-2xl font-bold text-accent">{t('kbEditMedia')}</h3>
                <button onClick={() => setEditingMedia(null)} className="p-2 -mr-2 rounded-full hover:bg-hover-bg text-gray-500 hover:text-red-500 transition-colors cursor-pointer"><Icon name="X" size={24} /></button>
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold opacity-80">{t('kbCaption')}</span>
                <textarea rows={4} value={activeEditingMedia.caption || ''} className="input-base text-sm resize-none" onChange={e => {
                  if (editingMedia.type === 'feature') updateFeatureMedia(editingMedia.itemId, editingMedia.mediaIndex, { caption: e.target.value });
                  else if (editingMedia.type === 'entity') updateEntityMedia(editingMedia.itemId, editingMedia.mediaIndex, { caption: e.target.value });
                  else if (editingMedia.type === 'state') updateStateMedia(editingMedia.itemId, editingMedia.stateId!, editingMedia.mediaIndex, { caption: e.target.value });
                }} />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold opacity-80">{t('kbCopyright')}</span>
                <input type="text" value={activeEditingMedia.copyright || ''} className="input-base text-sm" onChange={e => {
                  if (editingMedia.type === 'feature') updateFeatureMedia(editingMedia.itemId, editingMedia.mediaIndex, { copyright: e.target.value });
                  else if (editingMedia.type === 'entity') updateEntityMedia(editingMedia.itemId, editingMedia.mediaIndex, { copyright: e.target.value });
                  else if (editingMedia.type === 'state') updateStateMedia(editingMedia.itemId, editingMedia.stateId!, editingMedia.mediaIndex, { copyright: e.target.value });
                }} />
              </label>

              <div className="mt-auto flex flex-col md:flex-row justify-end gap-3 pt-6">
                <button onClick={() => setEditingMedia(null)} className="w-full md:w-auto px-6 py-2.5 bg-accent/95 backdrop-blur-md border border-white/20 text-white font-bold rounded-xl hover:bg-accent-hover transition-all duration-300 shadow-md hover:shadow-lg cursor-pointer">{t('save')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title={t('kbDelete')}
        message={
          <div className="flex items-start gap-3 text-red-500 bg-red-500/10 p-4 rounded-xl border border-red-500/20">
            <Icon name="TriangleAlert" size={24} className="shrink-0 mt-0.5" />
            <p className="text-sm font-medium leading-relaxed">{t('kbConfirmDelete' as any)}</p>
          </div>
        }
        confirmText={t('kbDelete')}
        cancelText={t('cancel')}
        isDestructive={true}
      />

      <Modal isOpen={keyPromptMode !== null} onClose={() => setKeyPromptMode(null)} title={keyPromptMode === 'new' ? t('kbNewKey' as any) : t('openNativeKey')}>
        <div className="p-7 text-text">
          <div className="flex items-start gap-3 text-yellow-500 bg-yellow-500/10 p-4 rounded-xl border border-yellow-500/20 mb-8">
            <Icon name="TriangleAlert" size={24} className="shrink-0 mt-0.5" />
            <p className="text-sm font-medium leading-relaxed">{keyPromptMode === 'new' ? t('kbNewKeyPrompt' as any) : t('kbOpenKeyPrompt' as any)}</p>
          </div>
          <div className="flex flex-col-reverse md:flex-row justify-end gap-3 mt-2">
            <button onClick={() => setKeyPromptMode(null)} className="w-full md:w-auto px-5 py-2.5 hover:bg-hover-bg/80 rounded-xl font-bold text-gray-500 transition-all duration-300 cursor-pointer">{t('cancel')}</button>
            <button onClick={() => { exportJson(); handleConfirmPrompt(); }} className="w-full md:w-auto justify-center px-5 py-2.5 bg-panel-bg border border-white/20 dark:border-white/10 rounded-xl hover:bg-hover-bg/80 hover:shadow-md transition-all duration-300 shadow-sm font-bold flex items-center gap-2 cursor-pointer"><Icon name="FileJson" size={16} /> {t('exportJson')}</button>
            <button onClick={handleConfirmPrompt} className="w-full md:w-auto justify-center px-5 py-2.5 bg-red-500/95 backdrop-blur-md border border-white/20 text-white rounded-xl hover:bg-red-600 transition-all duration-300 shadow-md hover:shadow-lg font-bold cursor-pointer">{keyPromptMode === 'new' ? t('kbDiscardAndCreate' as any) : t('kbDiscardAndOpen' as any)}</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showMetadataModal} onClose={() => setShowMetadataModal(false)} title={t('kbMetadata')}>
        <BuilderMetadataTab draftKey={draftKey} updateDraftKey={updateDraftKey} t={t as any} />
      </Modal>
    </div>
  );
};
