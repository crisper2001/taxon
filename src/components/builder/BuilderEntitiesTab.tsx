import React, { useRef, useState, useEffect } from 'react';
import { Icon } from '../common/Icon';
import type { DraftKeyData, DraftEntity } from '../../types';
import { processImage } from '../../utils/imageUtils';
import { useTreeDragAndDrop, useSearchAutoScroll } from '../../hooks';
import { BuilderEntityModal } from '../modals';

const generateId = () => Math.random().toString(36).substr(2, 9);

const MemoizedEntityItem = React.memo(({
  e, depth, hasChildren, isSelected, isCollapsed, isDragOver, isDragged, anyDragged, isSearchDimmed, isSearchMatch,
  t, setSelectedEntityId, toggleEntityCollapse, duplicateEntity, setDeleteTarget, treeDnd
}: any) => {
  return (
    <div
      data-search-match={isSearchMatch ? "true" : undefined}
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
        if (anyDragged) ev.stopPropagation();
        treeDnd.onTouchMove(ev, e.id);
      }}
      onTouchEnd={(ev) => {
        if (anyDragged) ev.stopPropagation();
        treeDnd.onTouchEnd(ev, e.id);
      }}
      onTouchCancel={treeDnd.onTouchCancel}
      onClick={() => setSelectedEntityId(e.id)}
      className={`builder-list-item entity-item flex items-center gap-2 p-1.5 rounded-xl transition-all duration-300 relative group/item cursor-pointer hover:bg-hover-bg/80 hover:shadow-md hover:backdrop-blur-sm ${isSelected ? 'bg-accent/20 shadow-inner ring-2 ring-accent' : 'border border-transparent'} ${isDragOver ? 'ring-2 ring-accent ring-inset bg-accent/10 scale-[1.02] z-20' : ''} ${isDragged ? 'opacity-50' : ''} ${isSearchDimmed ? 'opacity-30' : ''} ${isSearchMatch ? 'bg-accent/20 shadow-inner' : ''} data-[search-active=true]:ring-2 data-[search-active=true]:ring-accent`}
      style={{ paddingLeft: `calc(${1.5 + depth * 1.5}rem + 0.5rem)`, touchAction: anyDragged ? 'none' : 'auto' }}
    >
      {hasChildren && (
        <button
          onClick={(ev) => { ev.stopPropagation(); toggleEntityCollapse(e.id); }}
          className={`w-7 h-7 flex items-center justify-center rounded-md cursor-pointer absolute z-20 transition-colors ${isSelected ? 'text-accent hover:bg-accent/10' : 'text-gray-500 hover:bg-black/10 dark:hover:bg-white/10'}`}
          style={{ left: `calc(${depth * 1.5}rem)` }}
        >
          <Icon name="ChevronRight" size={16} className={`transition-transform duration-200 ${!isCollapsed ? 'rotate-90' : ''}`} />
        </button>
      )}

      {e.media && e.media.length > 0 ? (
        <img src={e.media[0].url} alt={e.name} className="w-10 h-10 object-cover rounded-lg shadow-sm shrink-0" />
      ) : (
        <div className="w-10 h-10 bg-header-bg/80 rounded-lg shadow-sm shrink-0 flex items-center justify-center text-gray-400">
          <Icon name="Leaf" size={20} className={`shrink-0 ${isSelected ? 'opacity-100 text-accent' : 'opacity-60'}`} />
        </div>
      )}
      <span className="truncate flex-1 text-sm font-medium">{e.name || t('kbUnnamedEntity')}</span>

      <div className="max-md:hidden opacity-0 group-hover/item:opacity-100 flex items-center gap-0.5 transition-opacity z-20 shrink-0 pr-1">
        <button onClick={(ev) => { ev.stopPropagation(); duplicateEntity(e.id); }} className={`p-1.5 rounded-md cursor-pointer transition-colors ${isSelected ? 'text-accent hover:bg-accent/10' : 'text-gray-400 hover:text-accent hover:bg-black/10 dark:hover:bg-white/10'}`} title={t('kbDuplicate')}>
          <Icon name="Copy" size={14} />
        </button>
        <button onClick={(ev) => { ev.stopPropagation(); setDeleteTarget({ type: 'entity', id: e.id }); }} className={`p-1.5 rounded-md cursor-pointer transition-colors ${isSelected ? 'text-red-500 hover:bg-red-500/10' : 'text-red-400 hover:text-red-500 hover:bg-red-500/10'}`} title={t('kbDelete')}>
          <Icon name="Trash2" size={14} />
        </button>
      </div>
    </div>
  );
}, (prev, next) => {
  return prev.e === next.e && prev.depth === next.depth && prev.hasChildren === next.hasChildren && prev.isSelected === next.isSelected && prev.isCollapsed === next.isCollapsed && prev.isDragOver === next.isDragOver && prev.isDragged === next.isDragged && prev.anyDragged === next.anyDragged && prev.isSearchDimmed === next.isSearchDimmed && prev.isSearchMatch === next.isSearchMatch && prev.t === next.t;
});

interface BuilderEntitiesTabProps {
  draftKey: DraftKeyData;
  updateDraftKey: (updater: (prev: DraftKeyData) => DraftKeyData) => void;
  t: (key: string) => string;
  selectedEntityId: string | null;
  setSelectedEntityId: (id: string | null) => void;
  collapsedEntities: Set<string>;
  setCollapsedEntities?: React.Dispatch<React.SetStateAction<Set<string>>>;
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
  setCollapsedEntities,
  draggedItem, setDraggedItem, dragOverId, setDragOverId, draggedMedia, setDraggedMedia, setEditingMedia, setDeleteTarget
}) => {
  const touchTimeout = useRef<NodeJS.Timeout | null>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const lastTouchPos = useRef({ x: 0, y: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [matchingIds, setMatchingIds] = useState<Set<string> | null>(null);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [matchCount, setMatchCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!searchTerm) {
      setMatchingIds(null);
      return;
    }
    const newMatching = new Set<string>();
    const newExpanded = new Set<string>();
    const lowerCaseSearchTerm = searchTerm.toLowerCase();

    const entityChildrenMap = new Map<string, DraftEntity[]>();
    const rootEntities: DraftEntity[] = [];
    draftKey.entities.forEach(e => {
      if (e.parentId) {
        if (!entityChildrenMap.has(e.parentId)) entityChildrenMap.set(e.parentId, []);
        entityChildrenMap.get(e.parentId)!.push(e);
      } else {
        rootEntities.push(e);
      }
    });

    const findMatches = (nodes: DraftEntity[], parents: string[]): boolean => {
      let subtreeHasMatch = false;
      for (const node of nodes) {
        const selfMatches = node.name.toLowerCase().includes(lowerCaseSearchTerm);
        let childrenMatch = false;
        const children = entityChildrenMap.get(node.id) || [];
        if (children.length > 0) {
          parents.push(node.id);
          childrenMatch = findMatches(children, parents);
          parents.pop();
        }
        if (selfMatches) newMatching.add(node.id);
        if (selfMatches || childrenMatch) {
          subtreeHasMatch = true;
          parents.forEach(p => newExpanded.add(p));
        }
      }
      return subtreeHasMatch;
    };

    findMatches(rootEntities, []);
    setMatchingIds(newMatching);
    if (newExpanded.size > 0 && setCollapsedEntities) {
      setCollapsedEntities(prev => {
        const next = new Set(prev);
        let changed = false;
        newExpanded.forEach(id => {
          if (next.has(id)) {
            next.delete(id);
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }
  }, [searchTerm, draftKey.entities, setCollapsedEntities]);

  useEffect(() => {
    setCurrentMatchIndex(0);
  }, [searchTerm, matchingIds]);

  useSearchAutoScroll(containerRef, searchTerm, matchingIds, currentMatchIndex, setCurrentMatchIndex, setMatchCount);

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

  const visibleEntities = React.useMemo(() => {
    const entityChildrenMap = new Map<string, DraftEntity[]>();
    const rootEntities: DraftEntity[] = [];
    draftKey.entities.forEach(e => {
      if (e.parentId) {
        if (!entityChildrenMap.has(e.parentId)) entityChildrenMap.set(e.parentId, []);
        entityChildrenMap.get(e.parentId)!.push(e);
      } else {
        rootEntities.push(e);
      }
    });
    const result: { e: DraftEntity, depth: number, hasChildren: boolean }[] = [];
    const traverse = (e: DraftEntity, depth: number) => {
      const children = entityChildrenMap.get(e.id) || [];
      result.push({ e, depth, hasChildren: children.length > 0 });
      if (!collapsedEntities.has(e.id)) {
        children.forEach(c => traverse(c, depth + 1));
      }
    };
    rootEntities.forEach(e => traverse(e, 0));
    return result;
  }, [draftKey.entities, collapsedEntities]);

  const renderEntityList = () => {
    return visibleEntities.map(({ e, depth, hasChildren }) => {
      const isSearchDimmed = matchingIds !== null && !matchingIds.has(e.id);
      const isSearchMatch = matchingIds !== null && matchingIds.has(e.id);
      return (
        <MemoizedEntityItem
          key={e.id} e={e} depth={depth} hasChildren={hasChildren}
          isSelected={selectedEntityId === e.id} isCollapsed={collapsedEntities.has(e.id)}
          isDragOver={dragOverId === e.id} isDragged={draggedItem?.id === e.id}
          anyDragged={!!draggedItem} t={t} setSelectedEntityId={setSelectedEntityId}
          toggleEntityCollapse={toggleEntityCollapse} duplicateEntity={duplicateEntity}
          setDeleteTarget={setDeleteTarget} treeDnd={treeDnd}
          isSearchDimmed={isSearchDimmed} isSearchMatch={isSearchMatch}
        />
      );
    });
  };

  return (
    <div className="flex flex-col w-full h-full animate-fade-in">
      <div className="p-3.5 border-b border-black/5 dark:border-white/5 flex flex-wrap justify-between items-center bg-header-bg/85 backdrop-blur-md shadow-sm shrink-0 z-10 gap-2">
        <div className="panel-title font-bold flex items-center gap-2 text-lg tracking-tight min-w-0 pr-2">
          <Icon name="List" size={20} className="shrink-0 text-accent" />
          <span className="truncate text-accent">{t('kbEntities')}</span>
          <span className="bg-accent text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm shrink-0">
            {draftKey.entities.length}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className={`search-container group flex items-center gap-1 py-1.5 px-3 rounded-full relative transition-all duration-300 focus-within:bg-bg/80 focus-within:shadow-inner focus-within:backdrop-blur-md border border-transparent focus-within:border-white/10 cursor-text shrink-0 ${matchCount > 0 || searchTerm ? 'bg-bg/80 shadow-inner backdrop-blur-md border-white/10' : 'hover:bg-bg/50 cursor-pointer'}`}
            onClick={() => searchInputRef.current?.focus()}
          >
            <Icon name="Search" className="shrink-0 text-gray-500" />
            <input
              ref={searchInputRef}
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('search')}
              className={`transition-all duration-300 ease-in-out border-none bg-transparent outline-none text-sm p-0 ${matchCount > 0 || searchTerm ? 'w-24 sm:w-32 opacity-100' : 'w-0 opacity-0 group-hover:w-32 group-hover:opacity-100 focus:w-32 focus:opacity-100'}`}
            />
            {searchTerm && (
              <button type="button" onClick={(e) => { e.stopPropagation(); setSearchTerm(''); searchInputRef.current?.focus(); }} className="p-0.5 hover:bg-accent/20 rounded cursor-pointer flex items-center justify-center text-gray-500 hover:text-accent transition-colors shrink-0" title={t('clearSearch')}>
                <Icon name="X" size={14} />
              </button>
            )}
            {matchCount > 0 && (
              <div className="flex items-center gap-0.5 transition-opacity opacity-100 text-accent">
                <span className="text-xs font-medium whitespace-nowrap px-1">{currentMatchIndex + 1} / {matchCount}</span>
                <button type="button" onClick={(e) => { e.stopPropagation(); setCurrentMatchIndex(prev => prev > 0 ? prev - 1 : matchCount - 1); }} className="p-0.5 hover:bg-accent/20 rounded cursor-pointer flex items-center justify-center" title={t('prevMatch')}><Icon name="ChevronUp" size={14} /></button>
                <button type="button" onClick={(e) => { e.stopPropagation(); setCurrentMatchIndex(prev => prev < matchCount - 1 ? prev + 1 : 0); }} className="p-0.5 hover:bg-accent/20 rounded cursor-pointer flex items-center justify-center" title={t('nextMatch')}><Icon name="ChevronDown" size={14} /></button>
              </div>
            )}
          </div>
          <button onClick={addEntity} className="shrink-0 px-3 py-1.5 bg-accent/95 backdrop-blur-md border border-white/20 text-white rounded-lg hover:bg-accent-hover transition-all duration-300 text-sm font-bold shadow-md hover:shadow-lg flex items-center gap-1 cursor-pointer" title={t('kbAddEntity')}><Icon name="Plus" size={14} /> <span className="hidden sm:inline">{t('kbAdd' as any)}</span></button>
        </div>
      </div>
      <div
        ref={containerRef}
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
