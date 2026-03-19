import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Icon } from '../Icon';
import { ConfirmModal, Modal } from '../modals';
import Spot from '../Spot';
import type { DraftFeature, DraftEntity, DraftKeyData, Media } from '../../types';
import { BuilderMetadataTab } from './BuilderMetadataTab';
import { BuilderFeaturesTab } from './BuilderFeaturesTab';
import { BuilderEntitiesTab } from './BuilderEntitiesTab';

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
  const [activeTab, setActiveTab] = useState<'metadata' | 'features' | 'entities'>('metadata');

  const getInitialDraft = () => {
    if (initialData) return initialData;
    const saved = localStorage.getItem('taxon_draft_key');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return { title: 'New Identification Key', authors: '', description: '', features: [], entities: [] };
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
      setActiveTab('metadata');
      setSelectedFeatureId(null);
      setSelectedEntityId(null);
    }
  }, [initialData]);

  const draftKey = history[historyIndex] || { title: '', authors: '', description: '', features: [], entities: [] };

  useEffect(() => {
    onChange?.(draftKey);
    localStorage.setItem('taxon_draft_key', JSON.stringify(draftKey));
    
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

  useEffect(() => {
    const handleAddFeature = (e: any) => {
      const f = e.detail;
      const id = generateId();
      updateDraftKey(prev => ({
        ...prev,
        features: [
          ...prev.features,
          { id, name: f.name, description: f.description, type: f.type, states: f.type === 'state' && f.states ? f.states.map((s: string) => ({ id: generateId(), name: s })) : [] }
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
          states: f.type === 'state' && f.states ? f.states.map((s: string) => ({ id: generateId(), name: s })) : []
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
  }, [draftKey]);

  const undo = () => { if (historyIndex > 0) setHistoryIndex(prev => prev - 1); };
  const redo = () => { if (historyIndex < history.length - 1) setHistoryIndex(prev => prev + 1); };

  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [draggedMedia, setDraggedMedia] = useState<{ type: 'feature' | 'entity' | 'state', itemId: string, stateId?: string, index: number } | null>(null);
  const [editingMedia, setEditingMedia] = useState<{ type: 'feature' | 'entity' | 'state', itemId: string, stateId?: string, mediaIndex: number } | null>(null);
  const [draggedItem, setDraggedItem] = useState<{ type: 'feature' | 'entity', id: string } | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'feature' | 'state' | 'entity', id: string, parentId?: string } | null>(null);
  const [collapsedFeatures, setCollapsedFeatures] = useState<Set<string>>(new Set());
  const [collapsedEntities, setCollapsedEntities] = useState<Set<string>>(new Set());

  const processAndSetImage = (file: File, callback: (url: string) => void) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    
    img.onload = () => {
      let { width, height } = img;
      const MAX_DIM = 1024;
      
      if (width > MAX_DIM || height > MAX_DIM) {
        const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        callback(canvas.toDataURL('image/jpeg', 0.85));
      } else {
        const reader = new FileReader();
        reader.onloadend = () => callback(reader.result as string);
        reader.readAsDataURL(file);
      }
      URL.revokeObjectURL(objectUrl);
    };
    img.onerror = () => {
      const reader = new FileReader();
      reader.onloadend = () => callback(reader.result as string);
      reader.readAsDataURL(file);
      URL.revokeObjectURL(objectUrl);
    };
    img.src = objectUrl;
  };

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
    setHistory([{ title: 'New Identification Key', authors: '', description: '', features: [], entities: [] }]);
    setHistoryIndex(0);
    setActiveTab('metadata');
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
    setDeleteTarget(null);
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

  return (
    <div className="flex flex-col h-full w-full bg-bg">
      {/* Standalone Application Header */}
      <div className="flex justify-between items-center px-4 py-2.5 bg-panel-bg/95 backdrop-blur-md border-b border-border shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <button onClick={onExit} className="p-2 rounded-full hover:bg-hover-bg cursor-pointer transition-colors text-text opacity-80 hover:opacity-100" title={t('back')}><Icon name="ArrowLeft" size={22} /></button>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-accent tracking-tight">{t('builderMode')}</h2>
            <span className={`text-xs font-bold text-green-500 dark:text-green-400 flex items-center gap-1 transition-opacity duration-500 ${isSaved ? 'opacity-100' : 'opacity-0'}`}>
              <Icon name="Check" size={14} /> {t('saved' as any)}
            </span>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center bg-bg border border-border rounded-full shadow-sm overflow-hidden mr-2">
            <button onClick={undo} disabled={historyIndex <= 0} className="p-1.5 px-3 hover:bg-hover-bg disabled:opacity-30 disabled:cursor-not-allowed transition-colors border-r border-border" title={t('kbUndo')}><Icon name="Undo" size={16} /></button>
            <button onClick={redo} disabled={historyIndex >= history.length - 1} className="p-1.5 px-3 hover:bg-hover-bg disabled:opacity-30 disabled:cursor-not-allowed transition-colors" title={t('kbRedo')}><Icon name="Redo" size={16} /></button>
          </div>
          <button onClick={() => setShowNewKeyModal(true)} className="flex items-center gap-2 px-4 py-1.5 bg-bg border border-border rounded-full hover:bg-hover-bg transition-colors text-sm font-bold cursor-pointer shadow-sm">
            <Icon name="FilePlus" size={16} /> {t('kbNewKey' as any)}
          </button>
          <button onClick={triggerOpenNativeKey} className="flex items-center gap-2 px-4 py-1.5 bg-bg border border-border rounded-full hover:bg-hover-bg transition-colors text-sm font-bold cursor-pointer shadow-sm">
            <Icon name="FolderOpen" size={16} /> {t('openNativeKey')}
          </button>
          <button onClick={exportJson} className="flex items-center gap-2 px-4 py-1.5 bg-bg border border-border rounded-full hover:bg-hover-bg transition-colors text-sm font-bold shadow-sm cursor-pointer">
            <Icon name="FileJson" size={16} /> {t('exportJson')}
          </button>
          <button onClick={() => onTestKey?.(draftKey)} className="flex items-center gap-2 px-4 py-1.5 bg-accent text-white rounded-full hover:bg-accent-hover transition-colors text-sm font-bold shadow-sm cursor-pointer">
            <Icon name="Play" size={16} /> {t('kbTestKey' as any)}
          </button>
          <button onClick={openPreferences} title={t('preferences')} className="p-1.5 ml-1 rounded-full transition-all duration-300 opacity-90 hover:opacity-100 hover:bg-hover-bg hover:scale-105 cursor-pointer shadow-sm border border-transparent hover:border-border hover:shadow-md text-gray-500 hover:text-accent">
            <Icon name="Settings2" size={20} />
          </button>
          {!hideAi && (
            <button onClick={() => setAiPanelVisible(true)} disabled={isAiPanelVisible} title={isAiPanelVisible ? undefined : t('assistant')} aria-hidden={isAiPanelVisible} className={`p-1.5 ml-1 rounded-full transition-all duration-300 ${isAiPanelVisible ? 'opacity-0 scale-90 pointer-events-none' : 'opacity-90 hover:opacity-100 hover:bg-hover-bg hover:scale-105 cursor-pointer shadow-sm border border-transparent hover:border-border hover:shadow-md'}`}>
              <Spot primaryColor="currentColor" secondaryColor="#f8fafb" mode="head" className="w-5 h-5 text-accent" />
            </button>
          )}
        </div>
      </div>
      
      <div className="flex grow overflow-hidden p-4 gap-4">
        {/* Builder Sidebar Tabs */}
        <div className="w-60 shrink-0 flex flex-col gap-2 bg-panel-bg border border-border p-4 rounded-2xl shadow-sm">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Builder Menu</h3>
          <button 
            onClick={() => setActiveTab('metadata')}
            className={`flex items-center gap-3 text-left px-3 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${activeTab === 'metadata' ? 'bg-accent text-white shadow-md' : 'hover:bg-hover-bg text-text'}`}
          >
            <Icon name="FileText" size={18} className={activeTab === 'metadata' ? 'opacity-100' : 'opacity-70'} />
            {t('kbMetadata')}
          </button>
          <button 
            onClick={() => setActiveTab('features')}
            className={`flex items-center justify-between text-left px-3 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${activeTab === 'features' ? 'bg-accent text-white shadow-md' : 'hover:bg-hover-bg text-text'}`}
          >
            <div className="flex items-center gap-3"><Icon name="ListTree" size={18} className={activeTab === 'features' ? 'opacity-100' : 'opacity-70'} /> {t('kbFeatures')}</div>
            <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'features' ? 'bg-white/20' : 'bg-bg border border-border'}`}>{draftKey.features.length}</span>
          </button>
          <button 
            onClick={() => setActiveTab('entities')}
            className={`flex items-center justify-between text-left px-3 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${activeTab === 'entities' ? 'bg-accent text-white shadow-md' : 'hover:bg-hover-bg text-text'}`}
          >
            <div className="flex items-center gap-3"><Icon name="List" size={18} className={activeTab === 'entities' ? 'opacity-100' : 'opacity-70'} /> {t('kbEntities')}</div>
            <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'entities' ? 'bg-white/20' : 'bg-bg border border-border'}`}>{draftKey.entities.length}</span>
          </button>
        </div>

        {/* Builder Main Content */}
        <div className="flex grow flex-col bg-panel-bg border border-border rounded-2xl overflow-hidden shadow-sm">
          {activeTab === 'metadata' && (
            <BuilderMetadataTab draftKey={draftKey} updateDraftKey={updateDraftKey} t={t as any} />
          )}

          {activeTab === 'features' && (
            <BuilderFeaturesTab 
              draftKey={draftKey} updateDraftKey={updateDraftKey} t={t as any}
              selectedFeatureId={selectedFeatureId} setSelectedFeatureId={setSelectedFeatureId}
              collapsedFeatures={collapsedFeatures} toggleFeatureCollapse={toggleFeatureCollapse}
              draggedItem={draggedItem} setDraggedItem={setDraggedItem}
              dragOverId={dragOverId} setDragOverId={setDragOverId}
              draggedMedia={draggedMedia} setDraggedMedia={setDraggedMedia}
              setEditingMedia={setEditingMedia} setDeleteTarget={setDeleteTarget}
              processAndSetImage={processAndSetImage}
            />
          )}

          {activeTab === 'entities' && (
            <BuilderEntitiesTab
              draftKey={draftKey} updateDraftKey={updateDraftKey} t={t as any}
              selectedEntityId={selectedEntityId} setSelectedEntityId={setSelectedEntityId}
              collapsedEntities={collapsedEntities} toggleEntityCollapse={toggleEntityCollapse}
              draggedItem={draggedItem} setDraggedItem={setDraggedItem}
              dragOverId={dragOverId} setDragOverId={setDragOverId}
              draggedMedia={draggedMedia} setDraggedMedia={setDraggedMedia}
              setEditingMedia={setEditingMedia} setDeleteTarget={setDeleteTarget}
              processAndSetImage={processAndSetImage}
            />
          )}
        </div>
      </div>

      {/* Media Edit Modal */}
      {editingMedia && activeEditingMedia && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-panel-bg rounded-3xl shadow-2xl w-full max-w-4xl flex flex-col md:flex-row overflow-hidden max-h-[90vh] animate-fade-in-up">
            <div className="w-full md:w-1/2 bg-black/5 dark:bg-white/5 flex items-center justify-center p-6 relative">
                <img src={activeEditingMedia.url} alt="Preview" className="max-w-full max-h-full object-contain drop-shadow-md rounded-lg" />
            </div>
            <div className="w-full md:w-1/2 p-8 flex flex-col gap-6 overflow-y-auto bg-panel-bg">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-2xl font-bold text-accent">{t('kbEditMedia')}</h3>
                  <button onClick={() => setEditingMedia(null)} className="p-2 -mr-2 rounded-full hover:bg-hover-bg text-gray-500 hover:text-red-500 transition-colors cursor-pointer"><Icon name="X" size={24}/></button>
                </div>
                
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold opacity-80">{t('kbCaption')}</span>
                  <textarea rows={4} value={activeEditingMedia.caption || ''} onChange={e => {
                    if (editingMedia.type === 'feature') updateFeatureMedia(editingMedia.itemId, editingMedia.mediaIndex, { caption: e.target.value });
                    else if (editingMedia.type === 'entity') updateEntityMedia(editingMedia.itemId, editingMedia.mediaIndex, { caption: e.target.value });
                    else if (editingMedia.type === 'state') updateStateMedia(editingMedia.itemId, editingMedia.stateId!, editingMedia.mediaIndex, { caption: e.target.value });
                  }} className="p-3 bg-bg border border-border rounded-xl focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent text-text text-sm resize-none shadow-sm transition-all" />
                </label>
                
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold opacity-80">{t('kbCopyright')}</span>
                  <input type="text" value={activeEditingMedia.copyright || ''} onChange={e => {
                    if (editingMedia.type === 'feature') updateFeatureMedia(editingMedia.itemId, editingMedia.mediaIndex, { copyright: e.target.value });
                    else if (editingMedia.type === 'entity') updateEntityMedia(editingMedia.itemId, editingMedia.mediaIndex, { copyright: e.target.value });
                    else if (editingMedia.type === 'state') updateStateMedia(editingMedia.itemId, editingMedia.stateId!, editingMedia.mediaIndex, { copyright: e.target.value });
                  }} className="p-3 bg-bg border border-border rounded-xl focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent text-text text-sm shadow-sm transition-all" />
                </label>
                
                <div className="mt-auto flex justify-end gap-3 pt-6">
                  <button onClick={() => setEditingMedia(null)} className="px-6 py-2.5 bg-accent text-white font-bold rounded-xl hover:bg-accent-hover transition-colors shadow-sm cursor-pointer">{t('save')}</button>
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
          message={t('kbConfirmDelete' as any)}
          confirmText={t('kbDelete')}
          cancelText={t('cancel')}
          isDestructive={true}
        />

        <Modal isOpen={showNewKeyModal} onClose={() => setShowNewKeyModal(false)} title={t('kbNewKey' as any)}>
          <div className="p-6 text-text">
            <p className="mb-6 opacity-90">{t('kbNewKeyPrompt' as any)}</p>
            <div className="flex justify-end gap-3 flex-wrap">
              <button onClick={() => setShowNewKeyModal(false)} className="px-4 py-2 hover:bg-hover-bg rounded-lg font-medium transition-colors cursor-pointer">{t('cancel')}</button>
              <button onClick={() => { exportJson(); handleCreateNew(); }} className="px-4 py-2 bg-bg border border-border rounded-lg hover:bg-hover-bg transition-colors shadow-sm font-medium flex items-center gap-2 cursor-pointer"><Icon name="FileJson" size={16}/> {t('exportJson')}</button>
              <button onClick={handleCreateNew} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-sm font-bold cursor-pointer">{t('kbDiscardAndCreate' as any)}</button>
            </div>
          </div>
        </Modal>
    </div>
  );
};