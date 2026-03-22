import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Icon } from '../Icon';
import { ConfirmModal, Modal } from '../modals';
import type { DraftKeyData, Media } from '../../types';
import { BuilderMetadataTab } from './BuilderMetadataTab';
import { BuilderFeaturesTab } from './BuilderFeaturesTab';
import { BuilderEntitiesTab } from './BuilderEntitiesTab';
import { BuilderScoringTab } from './BuilderScoringTab';
import { Header } from '../Header';
import { useSwipe } from '../../hooks/useSwipe';

interface KeyBuilderProps {
  onExit: () => void;
  initialData?: DraftKeyData;
  onChange?: (draft: DraftKeyData) => void;
  onTestKey?: (draft: DraftKeyData) => void;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

export const KeyBuilder: React.FC<KeyBuilderProps> = ({ onExit, initialData, onChange, onTestKey }) => {
  const appContext = useAppContext();
  const { t, triggerOpenNativeKey, isAiPanelVisible, setAiPanelVisible, openPreferences } = appContext;
  const hideAi = (appContext as any).hideAi;
  const openAppInfo = (appContext as any).openAppInfo;
  const [activeTab, setActiveTab] = useState<'features' | 'entities' | 'scoring'>('features');
  const [showMetadataModal, setShowMetadataModal] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const getInitialDraft = () => {
    if (initialData) return initialData;
    const saved = localStorage.getItem('draftKeyData');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return { title: t('kbNewIdentKey' as any) || 'New Identification Key', authors: '', description: '', features: [], entities: [] };
  };

  const [history, setHistory] = useState<DraftKeyData[]>(() => [getInitialDraft()]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const isFirstRender = useRef(true);
  const [showNewKeyModal, setShowNewKeyModal] = useState(false);

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

  const updateDraftKey = (updater: (prev: DraftKeyData) => DraftKeyData) => {
    const nextState = updater(draftKey);
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(nextState);
      if (newHistory.length > 50) newHistory.shift();
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  };

  const getDefaultStateValues = (t: any) => [
    { id: '1', name: t('kbScoreCommon') || 'Common' },
    { id: '2', name: t('kbScoreRare') || 'Rare' },
    { id: '3', name: t('scoreUncertain') || 'Uncertain' },
    { id: '4', name: t('scoreCommonMisinterpret') || 'Common (misinterpreted)' },
    { id: '5', name: t('scoreRareMisinterpret') || 'Rare (misinterpreted)' }
  ];

  useEffect(() => {
    const handleAddFeature = (e: any) => {
      const f = e.detail;
      const id = generateId();
      updateDraftKey(prev => ({
        ...prev,
        features: [
          ...prev.features,
          { id, name: f.name, description: f.description, type: f.type, states: f.type === 'state' && f.states ? f.states.map((s: string) => ({ id: generateId(), name: s, values: getDefaultStateValues(t) })) : [] }
        ]
      }));
    };
    const handleAddEntity = (e: any) => {
      const ent = e.detail;
      updateDraftKey(prev => ({
        ...prev,
        entities: [
          ...prev.entities,
          { id: generateId(), name: ent.name, description: ent.description, scores: {} }
        ]
      }));
    };
    const handleAddAllItems = (e: any) => {
      const { features = [], entities = [] } = e.detail;
      updateDraftKey(prev => {
        const newFeatures = features.map((f: any) => ({
          id: generateId(),
          name: f.name,
          description: f.description,
          type: f.type,
          states: f.type === 'state' && f.states ? f.states.map((s: string) => ({ id: generateId(), name: s, values: getDefaultStateValues(t) })) : []
        }));
        const newEntities = entities.map((ent: any) => ({
          id: generateId(),
          name: ent.name,
          description: ent.description,
          scores: {}
        }));
        return { ...prev, features: [...prev.features, ...newFeatures], entities: [...prev.entities, ...newEntities] };
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
  }, [draftKey, t]);

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

  const tabIndex = activeTab === 'features' ? 0 : activeTab === 'entities' ? 1 : 2;

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
    setShowNewKeyModal(false);
  };

  const toggleFeatureCollapse = (id: string) => {
    setCollapsedFeatures(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleEntityCollapse = (id: string) => {
    setCollapsedEntities(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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
      <ActionButton onClick={() => setShowNewKeyModal(true)} title={t('kbNewKey' as any)} icon="FilePlus" />
      <ActionButton onClick={triggerOpenNativeKey} title={t('openNativeKey')} icon="FolderOpen" />
      <ActionButton onClick={exportJson} title={t('exportJson')} icon="Download" />
      <ActionButton onClick={() => onTestKey?.(draftKey)} title={t('kbTestKey' as any)} icon="Play" iconClass="text-accent" />
      <ActionButton onClick={() => setShowMetadataModal(true)} title={t('kbMetadata')} icon="Info" />
      <ActionButton onClick={openPreferences} title={t('preferences')} icon="Settings2" />
      <div className="w-px h-6 bg-border mx-1 opacity-50" />
      <ActionButton onClick={undo} disabled={historyIndex <= 0} title={t('kbUndo')} icon="Undo" />
      <ActionButton onClick={redo} disabled={historyIndex >= history.length - 1} title={t('kbRedo')} icon="Redo" />
    </>
  );

  const builderCenterContent = (
    <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
      <div className="hidden md:flex items-center gap-2">
        <button
          onClick={() => setActiveTab('features')}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-full transition-all duration-300 cursor-pointer shadow-sm border shrink-0 font-bold text-sm ${['features', 'entities'].includes(activeTab) ? 'bg-accent/10 text-accent border-accent/20' : 'opacity-90 hover:opacity-100 hover:bg-hover-bg/80 border-transparent dark:border-white/10 hover:border-black/10 dark:hover:border-white/20 hover:shadow-md text-text'}`}
        >
          <Icon name="ListTree" size={18} /> {t('kbFeatures')} &amp; {t('kbEntities')}
        </button>
        <button
          onClick={() => setActiveTab('scoring')}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-full transition-all duration-300 cursor-pointer shadow-sm border shrink-0 font-bold text-sm ${activeTab === 'scoring' ? 'bg-accent/10 text-accent border-accent/20' : 'opacity-90 hover:opacity-100 hover:bg-hover-bg/80 border-transparent dark:border-white/10 hover:border-black/10 dark:hover:border-white/20 hover:shadow-md text-text'}`}
        >
          <Icon name="Target" size={18} /> {t('kbScoring')}
        </button>
      </div>
      <span className={`absolute left-full ml-3 text-xs font-bold text-green-500 dark:text-green-400 flex items-center gap-1 transition-opacity duration-500 whitespace-nowrap pointer-events-none ${isSaved ? 'opacity-100' : 'opacity-0'}`}>
        <Icon name="Check" size={14} /> <span className="hidden md:inline">{t('saved' as any)}</span>
      </span>
    </div>
  );

  return (
    <div className="flex flex-col h-full w-full bg-bg">
      {/* Mobile Sidebar */}
      <div className={`md:hidden fixed top-0 left-0 h-full z-40 w-60 bg-panel-bg/90 backdrop-blur-2xl border-r border-white/20 dark:border-white/10 p-5 flex flex-col gap-5 shadow-2xl transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div onClick={() => { setSidebarOpen(false); onExit(); }} title={t('closeKey' as any)} className="pb-4 pt-2 flex items-center justify-center border-b border-black/5 dark:border-white/5 cursor-pointer hover:opacity-80 transition-opacity">
          <h2 className="text-2xl font-black flex items-center gap-2 text-accent tracking-tight">
            <Icon name="Leaf" size={28} /> Taxon
          </h2>
        </div>
        <div className="flex flex-col gap-2 text-sm font-semibold">
          <button onClick={() => { setSidebarOpen(false); setShowNewKeyModal(true); }} className="flex items-center gap-3 w-full p-3 text-left rounded-xl hover:bg-hover-bg/80 hover:backdrop-blur-md transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md group">
            <Icon name="FilePlus" className="opacity-80 group-hover:opacity-100" /> {t('kbNewKey' as any)}
          </button>
          <button onClick={() => { setSidebarOpen(false); triggerOpenNativeKey(); }} className="flex items-center gap-3 w-full p-3 text-left rounded-xl hover:bg-hover-bg/80 hover:backdrop-blur-md transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md group">
            <Icon name="FolderOpen" className="opacity-80 group-hover:opacity-100" /> {t('openNativeKey')}
          </button>
          <button onClick={() => { setSidebarOpen(false); exportJson(); }} className="flex items-center gap-3 w-full p-3 text-left rounded-xl hover:bg-hover-bg/80 hover:backdrop-blur-md transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md group">
            <Icon name="Download" className="opacity-80 group-hover:opacity-100" /> {t('exportJson')}
          </button>
          <button onClick={() => { setSidebarOpen(false); onTestKey?.(draftKey); }} className="flex items-center gap-3 w-full p-3 text-left rounded-xl hover:bg-hover-bg/80 hover:backdrop-blur-md transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md group">
            <Icon name="Play" className="opacity-80 group-hover:opacity-100 text-accent" /> {t('kbTestKey' as any)}
          </button>
        </div>
        <div className="mt-auto flex flex-col gap-2 pt-5 border-t border-black/5 dark:border-white/5 text-sm font-semibold">
          <button onClick={() => { setSidebarOpen(false); openPreferences(); }} className="flex items-center gap-3 w-full p-3 text-left rounded-xl hover:bg-hover-bg/80 hover:backdrop-blur-md transition-all duration-300 cursor-pointer hover:shadow-sm">
            <Icon name="Settings2" className="opacity-80" /> {t('preferences')}
          </button>
          <button onClick={() => { setSidebarOpen(false); openAppInfo(); }} className="flex items-center gap-3 w-full p-3 text-left rounded-xl hover:bg-hover-bg/80 hover:backdrop-blur-md transition-all duration-300 cursor-pointer hover:shadow-sm">
            <Icon name="Info" className="opacity-80" /> {t('aboutTaxon' as any)}
          </button>
        </div>
      </div>

      {/* Mobile Sidebar Backdrop */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

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
          <div className={`builder-mobile-view ${isSwiping ? 'is-swiping' : ''}`} style={{ '--mobile-tab-offset': `-${tabIndex * 100}%`, '--swipe-offset': `${swipeOffset}px` } as React.CSSProperties}>

            {/* Desktop Combined Features & Entities */}
            <div className={`max-md:!hidden builder-panel ${['features', 'entities'].includes(activeTab) ? 'active' : ''}`}>
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

            {/* Mobile Separated Features */}
            <div className={`md:!hidden builder-panel ${activeTab === 'features' ? 'active' : ''}`}>
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
            <div className={`md:!hidden builder-panel ${activeTab === 'entities' ? 'active' : ''}`}>
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
        <button onClick={() => setShowMetadataModal(true)} className={`flex flex-col items-center gap-1 p-2 min-w-[70px] rounded-2xl transition-all duration-300 relative text-gray-500 hover:text-accent hover:bg-hover-bg/50`}>
          <Icon name="Info" size={22} />
          <span className="text-[10px] font-bold text-center leading-none tracking-tight">{t('kbMetadata')}</span>
        </button>
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
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
                <button onClick={() => setEditingMedia(null)} className="w-full md:w-auto px-6 py-2.5 bg-accent/95 backdrop-blur-md border border-white/20 text-white font-bold rounded-xl hover:bg-accent-hover transition-all duration-300 shadow-md hover:shadow-lg shadow-accent/30 cursor-pointer">{t('save')}</button>
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

      <Modal isOpen={showNewKeyModal} onClose={() => setShowNewKeyModal(false)} title={t('kbNewKey' as any)}>
        <div className="p-7 text-text">
          <div className="flex items-start gap-3 text-yellow-500 bg-yellow-500/10 p-4 rounded-xl border border-yellow-500/20 mb-8">
            <Icon name="TriangleAlert" size={24} className="shrink-0 mt-0.5" />
            <p className="text-sm font-medium leading-relaxed">{t('kbNewKeyPrompt' as any)}</p>
          </div>
          <div className="flex flex-col-reverse md:flex-row justify-end gap-3 mt-2">
            <button onClick={() => setShowNewKeyModal(false)} className="w-full md:w-auto px-5 py-2.5 hover:bg-hover-bg/80 rounded-xl font-bold text-gray-500 transition-all duration-300 cursor-pointer">{t('cancel')}</button>
            <button onClick={() => { exportJson(); handleCreateNew(); }} className="w-full md:w-auto justify-center px-5 py-2.5 bg-panel-bg border border-white/20 dark:border-white/10 rounded-xl hover:bg-hover-bg/80 hover:shadow-md transition-all duration-300 shadow-sm font-bold flex items-center gap-2 cursor-pointer"><Icon name="FileJson" size={16} /> {t('exportJson')}</button>
            <button onClick={handleCreateNew} className="w-full md:w-auto justify-center px-5 py-2.5 bg-red-500/95 backdrop-blur-md border border-white/20 text-white rounded-xl hover:bg-red-600 transition-all duration-300 shadow-md hover:shadow-lg shadow-red-500/30 font-bold cursor-pointer">{t('kbDiscardAndCreate' as any)}</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showMetadataModal} onClose={() => setShowMetadataModal(false)} title={t('kbMetadata')}>
        <BuilderMetadataTab draftKey={draftKey} updateDraftKey={updateDraftKey} t={t as any} />
      </Modal>
    </div>
  );
};