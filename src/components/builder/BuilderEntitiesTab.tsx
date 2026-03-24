import React, { useRef } from 'react';
import { Icon } from '../Icon';
import type { DraftKeyData, DraftEntity } from '../../types';
import { processImage } from '../../utils/imageUtils';
import { useTreeDragAndDrop } from '../../hooks/useTreeDragAndDrop';
import { BuilderEntityModal } from '../modals';

const generateId = () => Math.random().toString(36).substr(2, 9);

interface BuilderEntitiesTabProps {
  draftKey: DraftKeyData;
  updateDraftKey: (updater: (prev: DraftKeyData) => DraftKeyData) => void;
  t: (key: string) => string;
  selectedEntityId: string | null;
  setSelectedEntityId: (id: string | null) => void;
  collapsedEntities: Set<string>;
  toggleEntityCollapse: (id: string) => void;
  draggedItem: { type: 'feature' | 'entity' | 'state', id: string, parentId?: string } | null;
  setDraggedItem: (item: { type: 'feature' | 'entity' | 'state', id: string, parentId?: string } | null) => void;
  dragOverId: string | null;
  setDragOverId: (id: string | null) => void;
  draggedMedia: { type: 'feature' | 'entity' | 'state', itemId: string, stateId?: string, index: number } | null;
  setDraggedMedia: (media: { type: 'feature' | 'entity' | 'state', itemId: string, stateId?: string, index: number } | null) => void;
  setEditingMedia: (media: { type: 'feature' | 'entity' | 'state', itemId: string, stateId?: string, mediaIndex: number } | null) => void;
  setDeleteTarget: (target: { type: 'feature' | 'state' | 'entity' | 'featureMedia' | 'stateMedia' | 'entityMedia', id: string, parentId?: string, mediaIndex?: number } | null) => void;
}

export const BuilderEntitiesTab: React.FC<BuilderEntitiesTabProps> = React.memo(({
  draftKey, updateDraftKey, t, selectedEntityId, setSelectedEntityId, collapsedEntities, toggleEntityCollapse,
  draggedItem, setDraggedItem, dragOverId, setDragOverId, draggedMedia, setDraggedMedia, setEditingMedia, setDeleteTarget
}) => {
  const touchTimeout = useRef<NodeJS.Timeout | null>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const lastTouchPos = useRef({ x: 0, y: 0 });

  const treeDnd = useTreeDragAndDrop({
    items: draftKey.entities,
    draggedItem, setDraggedItem, dragOverId, setDragOverId,
    itemType: 'entity',
    dataAttribute: 'data-entity-id',
    onMoveItem: (id, parentId) => updateEntity(id, { parentId }),
    ghostRef
  });

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

  const reorderEntityMedia = (entityId: string, from: number, to: number) => {
    if (from === to) return;
    updateDraftKey(prev => ({
      ...prev,
      entities: prev.entities.map(e => {
        if (e.id === entityId && e.media) {
           const newMedia = [...e.media];
           const [moved] = newMedia.splice(from, 1);
           newMedia.splice(to, 0, moved);
           return { ...e, media: newMedia };
        }
        return e;
      })
    }));
  };

  const handleAddImages = async (fileList: FileList | File[] | null, id: string) => {
    if (!fileList) return;
    const files = Array.from(fileList).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) return;
    const processed = await Promise.all(files.map(f => processImage(f)));
    const newMedia = processed.map(p => ({ url: `data:${p.mimeType};base64,${p.base64}` }));
    
    const entity = draftKey.entities.find(e => e.id === id);
    updateEntity(id, { media: [...(entity?.media || []), ...newMedia] });
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
                    onDragStart={(ev) => treeDnd.onDragStart(ev, e.id)}
                    onDragEnd={treeDnd.onDragEnd}
                    onDragOver={(ev) => treeDnd.onDragOver(ev, e.id)}
                    onDragLeave={() => treeDnd.onDragLeave(e.id)}
                    onDrop={(ev) => treeDnd.onDrop(ev, e.id)}
                    onTouchStart={(ev) => treeDnd.onTouchStart(ev, e.id)}
                    onTouchMove={(ev) => {
                        if (draggedItem) ev.stopPropagation();
                        treeDnd.onTouchMove(ev, e.id);
                    }}
                    onTouchEnd={(ev) => {
                        if (draggedItem) ev.stopPropagation();
                        treeDnd.onTouchEnd(ev, e.id);
                    }}
                    onTouchCancel={treeDnd.onTouchCancel}
                    onClick={() => setSelectedEntityId(e.id)}
                    className={`rounded-xl transition-all relative group/item flex items-center gap-2 py-2 pr-2 border cursor-pointer ${selectedEntityId === e.id ? 'bg-accent/95 backdrop-blur-md text-white shadow-md border-white/20 z-10' : 'hover:bg-hover-bg/80 hover:shadow-sm text-text border-transparent hover:border-white/10 dark:hover:border-white/5'} ${dragOverId === e.id ? 'ring-2 ring-accent ring-inset bg-accent/10 scale-[1.02] z-20' : ''} ${draggedItem?.id === e.id ? 'opacity-50' : ''}`}
                    style={{ paddingLeft: `calc(${1.5 + depth * 1.5}rem + 0.5rem)`, touchAction: draggedItem ? 'none' : 'auto' }}
                >
                    {children.length > 0 && (
                        <button 
                            onClick={(ev) => { ev.stopPropagation(); toggleEntityCollapse(e.id); }} 
                            className={`w-7 h-7 flex items-center justify-center rounded-md cursor-pointer absolute z-20 transition-colors ${selectedEntityId === e.id ? 'text-white/80 hover:text-white hover:bg-white/20' : 'text-gray-500 hover:bg-black/10 dark:hover:bg-white/10'}`}
                            style={{ left: `calc(${depth * 1.5}rem)` }}
                        >
                            <Icon name="ChevronDown" size={16} className={`transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`} />
                        </button>
                    )}

                    <Icon name="Leaf" size={14} className={`shrink-0 ${selectedEntityId === e.id ? 'opacity-100' : 'opacity-60'}`} />
                    <span className="truncate flex-1 text-sm font-medium">{e.name || t('kbUnnamedEntity' as any)}</span>
                    
                    <div className="max-md:hidden opacity-0 group-hover/item:opacity-100 flex items-center gap-0.5 transition-opacity z-20 shrink-0">
                        <button onClick={(ev) => { ev.stopPropagation(); duplicateEntity(e.id); }} className={`p-1.5 rounded-md cursor-pointer transition-colors ${selectedEntityId === e.id ? 'text-white/70 hover:text-white hover:bg-white/20' : 'text-gray-400 hover:text-accent hover:bg-black/10 dark:hover:bg-white/10'}`} title={t('kbDuplicate')}>
                            <Icon name="Copy" size={14} />
                        </button>
                        <button onClick={(ev) => { ev.stopPropagation(); setDeleteTarget({ type: 'entity', id: e.id }); }} className={`p-1.5 rounded-md cursor-pointer transition-colors ${selectedEntityId === e.id ? 'text-white/70 hover:text-white hover:bg-red-500/80' : 'text-red-400 hover:text-red-500 hover:bg-red-500/10'}`} title={t('kbDelete')}>
                            <Icon name="Trash2" size={14} />
                        </button>
                    </div>
                </div>
                {children.length > 0 && !isCollapsed && (
                    <div className="relative">
                        {children.map(c => renderNode(c.id, depth + 1))}
                    </div>
                )}
            </React.Fragment>
        );
    };
    return draftKey.entities.filter(e => !e.parentId).map(e => renderNode(e.id, 0));
  };

  return (
    <div className="flex flex-col w-full h-full animate-fade-in">
      <div className="w-full h-full border-white/10 dark:border-white/5 flex flex-col bg-panel-bg/50 backdrop-blur-sm z-10 shrink-0">
        <div className="p-4 border-b border-white/10 dark:border-white/5 flex justify-between items-center bg-header-bg/85 backdrop-blur-md shadow-sm rounded-tl-3xl md:rounded-tr-3xl">
          <div className="flex items-center gap-2 font-bold text-text">
            <Icon name="List" size={18} className="opacity-70"/> 
            {t('kbEntities')}
            <span className="bg-accent text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm shrink-0">
              {draftKey.entities.length}
            </span>
          </div>
          <button onClick={addEntity} className="px-3 py-1.5 bg-accent/95 backdrop-blur-md border border-white/20 text-white rounded-lg hover:bg-accent-hover transition-all duration-300 text-sm font-bold shadow-md hover:shadow-lg flex items-center gap-1 cursor-pointer" title={t('kbAddEntity')}><Icon name="Plus" size={14} /> {t('kbAdd' as any)}</button>
        </div>
        <div 
          className={`overflow-y-auto flex-1 p-3 space-y-0.5 rounded-b-xl transition-colors ${dragOverId === 'root' ? 'bg-accent/5 ring-2 ring-inset ring-accent' : ''}`}
          data-root-drop="true"
          onDragOver={(e) => {
              e.preventDefault();
              if (draggedItem?.type === 'entity' && dragOverId !== 'root') setDragOverId('root');
          }}
          onDragLeave={() => {
              if (dragOverId === 'root') setDragOverId(null);
          }}
          onDrop={treeDnd.onRootDrop}
        >
          {renderEntityList()}
        </div>
      </div>

      <BuilderEntityModal
        isOpen={!!selectedEntityId && !!selectedEntity}
        onClose={() => setSelectedEntityId(null)}
        selectedEntity={selectedEntity}
        t={t as any}
        updateEntity={updateEntity}
        duplicateEntity={duplicateEntity}
        setDeleteTarget={setDeleteTarget}
        dragOverId={dragOverId}
        setDragOverId={setDragOverId}
        draggedMedia={draggedMedia}
        setDraggedMedia={setDraggedMedia}
        reorderEntityMedia={reorderEntityMedia}
        handleAddImages={handleAddImages}
        setEditingMedia={setEditingMedia}
        ghostRef={ghostRef}
        lastTouchPos={lastTouchPos}
        touchTimeout={touchTimeout}
      />

      {/* Touch Drag Ghost */}
      {(draggedItem || draggedMedia) && (
        <div 
          ref={ghostRef}
          className="fixed pointer-events-none z-9999 opacity-90 scale-105"
          style={{
            left: draggedItem ? treeDnd.lastTouchPos.current.x : lastTouchPos.current.x,
            top: draggedItem ? treeDnd.lastTouchPos.current.y : lastTouchPos.current.y,
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
});