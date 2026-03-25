import React, { useRef } from 'react';
import { Icon } from '../common/Icon';
import type { DraftKeyData, DraftEntity } from '../../types';
import { processImage } from '../../utils/imageUtils';
import { useTreeDragAndDrop } from '../../hooks';
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
            className={`entity-item flex items-center gap-2 p-1.5 rounded-xl transition-all duration-300 relative group/item cursor-pointer hover:bg-hover-bg/80 hover:shadow-md hover:backdrop-blur-sm ${selectedEntityId === e.id ? 'bg-accent/20 shadow-inner ring-2 ring-accent' : 'border border-transparent'} ${dragOverId === e.id ? 'ring-2 ring-accent ring-inset bg-accent/10 scale-[1.02] z-20' : ''} ${draggedItem?.id === e.id ? 'opacity-50' : ''}`}
            style={{ paddingLeft: `calc(${1.5 + depth * 1.5}rem + 0.5rem)`, touchAction: draggedItem ? 'none' : 'auto' }}
          >
            {children.length > 0 && (
              <button
                onClick={(ev) => { ev.stopPropagation(); toggleEntityCollapse(e.id); }}
                className={`w-7 h-7 flex items-center justify-center rounded-md cursor-pointer absolute z-20 transition-colors ${selectedEntityId === e.id ? 'text-accent hover:bg-accent/10' : 'text-gray-500 hover:bg-black/10 dark:hover:bg-white/10'}`}
                style={{ left: `calc(${depth * 1.5}rem)` }}
              >
                <Icon name="ChevronRight" size={16} className={`transition-transform duration-200 ${!isCollapsed ? 'rotate-90' : ''}`} />
              </button>
            )}

            {e.media && e.media.length > 0 ? (
              <img src={e.media[0].url} alt={e.name} className="w-10 h-10 object-cover rounded-lg shadow-sm shrink-0" />
            ) : (
              <div className="w-10 h-10 bg-header-bg/80 rounded-lg shadow-sm shrink-0 flex items-center justify-center text-gray-400">
                <Icon name="Leaf" size={20} className={`shrink-0 ${selectedEntityId === e.id ? 'opacity-100 text-accent' : 'opacity-60'}`} />
              </div>
            )}
            <span className="truncate flex-1 text-sm font-medium">{e.name || t('kbUnnamedEntity' as any)}</span>

            <div className="max-md:hidden opacity-0 group-hover/item:opacity-100 flex items-center gap-0.5 transition-opacity z-20 shrink-0 pr-1">
              <button onClick={(ev) => { ev.stopPropagation(); duplicateEntity(e.id); }} className={`p-1.5 rounded-md cursor-pointer transition-colors ${selectedEntityId === e.id ? 'text-accent hover:bg-accent/10' : 'text-gray-400 hover:text-accent hover:bg-black/10 dark:hover:bg-white/10'}`} title={t('kbDuplicate')}>
                <Icon name="Copy" size={14} />
              </button>
              <button onClick={(ev) => { ev.stopPropagation(); setDeleteTarget({ type: 'entity', id: e.id }); }} className={`p-1.5 rounded-md cursor-pointer transition-colors ${selectedEntityId === e.id ? 'text-red-500 hover:bg-red-500/10' : 'text-red-400 hover:text-red-500 hover:bg-red-500/10'}`} title={t('kbDelete')}>
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
      <div className="p-3.5 border-b border-black/5 dark:border-white/5 flex justify-between items-center bg-header-bg/85 backdrop-blur-md shadow-sm shrink-0 z-10">
        <div className="panel-title font-bold flex items-center gap-2 text-lg tracking-tight min-w-0 pr-2">
          <Icon name="List" size={20} className="shrink-0 text-accent" />
          <span className="truncate text-accent">{t('kbEntities')}</span>
          <span className="bg-accent text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm shrink-0">
            {draftKey.entities.length}
          </span>
        </div>
        <button onClick={addEntity} className="shrink-0 px-3 py-1.5 bg-accent/95 backdrop-blur-md border border-white/20 text-white rounded-lg hover:bg-accent-hover transition-all duration-300 text-sm font-bold shadow-md hover:shadow-lg flex items-center gap-1 cursor-pointer" title={t('kbAddEntity')}><Icon name="Plus" size={14} /> <span className="hidden sm:inline">{t('kbAdd' as any)}</span></button>
      </div>
      <div
        className={`panel-content grow p-3 space-y-0.5 overflow-y-auto transition-colors ${dragOverId === 'root' ? 'bg-accent/5 ring-2 ring-inset ring-accent' : ''}`}
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
