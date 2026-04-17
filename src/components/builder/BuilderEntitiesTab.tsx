import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Icon } from '../common/Icon';
import type { DraftKeyData, DraftEntity } from '../../types';
import { processImage } from '../../utils/imageUtils';
import { useTreeDragAndDrop, useSearchAutoScroll } from '../../hooks';
import { BuilderEntityModal } from '../modals';
import { BuilderListHeader } from './BuilderListHeader';
import { BuilderListItem } from './BuilderListItem';

const generateId = () => Math.random().toString(36).substr(2, 9);

const MemoizedEntityItem = React.memo(({
  e, depth, hasChildren, isFirst, isLast, isSelected, isCollapsed, dragOverId, isDragged, anyDragged, isSearchDimmed, isSearchMatch,
  t, setSelectedEntityId, toggleEntityCollapse, duplicateEntity, setDeleteTarget, treeDnd,
  moveEntity, reorderEntities, updateEntity, draggedItem, setDragOverId, setDraggedItem,
  dragStateRef, collapsedEntitiesRef, ghostRef
}: any) => {
  const checkEntityCycle = (draggedId: string, targetId: string) => {
    let current: string | undefined = targetId;
    const entities = dragStateRef.current.draftKey.entities;
    while (current) {
      if (current === draggedId) return true;
      current = entities.find((x: any) => x.id === current)?.parentId;
    }
    return false;
  };

  const isDragOverCenter = dragOverId === e.id;
  const isDragOverTop = dragOverId === `before-${e.id}`;
  const isDragOverBottom = dragOverId === `after-${e.id}` && (isCollapsed || !hasChildren);

  return (
    <BuilderListItem
      id={e.id} name={e.name || t('kbUnnamedEntity')} depth={depth}
      isFirst={isFirst} isLast={isLast} isSelected={isSelected}
      isCollapsed={isCollapsed} hasChildren={hasChildren}
      isDragOverCenter={isDragOverCenter} isDragOverTop={isDragOverTop} isDragOverBottom={isDragOverBottom}
      isDragged={isDragged} anyDragged={anyDragged}
      isSearchDimmed={isSearchDimmed} isSearchMatch={isSearchMatch}
      iconName="Box" imageUrl={e.media?.[0]?.url} className="entity-item"
      onClick={() => setSelectedEntityId(e.id)}
      onToggleCollapse={(ev) => { ev.stopPropagation(); toggleEntityCollapse(e.id); }}
      actions={
        <>
          {!isFirst && <button onClick={(ev) => { ev.stopPropagation(); moveEntity(e.id, 'up'); }} className={`p-1.5 rounded-md cursor-pointer transition-colors ${isSelected ? 'text-accent hover:bg-accent/10' : 'text-gray-400 hover:text-accent hover:bg-black/10 dark:hover:bg-white/10'}`} title={t('moveUp' as any) || 'Move Up'}><Icon name="ArrowUp" size={14} /></button>}
          {!isLast && <button onClick={(ev) => { ev.stopPropagation(); moveEntity(e.id, 'down'); }} className={`p-1.5 rounded-md cursor-pointer transition-colors ${isSelected ? 'text-accent hover:bg-accent/10' : 'text-gray-400 hover:text-accent hover:bg-black/10 dark:hover:bg-white/10'}`} title={t('moveDown' as any) || 'Move Down'}><Icon name="ArrowDown" size={14} /></button>}
          <button onClick={(ev) => { ev.stopPropagation(); duplicateEntity(e.id); }} className={`p-1.5 rounded-md cursor-pointer transition-colors ${isSelected ? 'text-accent hover:bg-accent/10' : 'text-gray-400 hover:text-accent hover:bg-black/10 dark:hover:bg-white/10'}`} title={t('kbDuplicate')}><Icon name="Copy" size={14} /></button>
          <button onClick={(ev) => { ev.stopPropagation(); setDeleteTarget({ type: 'entity', id: e.id }); }} className={`p-1.5 rounded-md cursor-pointer transition-colors ${isSelected ? 'text-red-500 hover:bg-red-500/10' : 'text-red-400 hover:text-red-500 hover:bg-red-500/10'}`} title={t('kbDelete')}><Icon name="Trash2" size={14} /></button>
        </>
      }
      draggable
      data-entity-id={e.id}
      onContextMenu={(ev) => ev.preventDefault()}
      onDragStart={(ev) => { ev.stopPropagation(); setDraggedItem({ type: 'entity', id: e.id, parentId: e.parentId }); }}
      onDragEnd={() => { setDraggedItem(null); setDragOverId(null); }}
      onDragOver={(ev) => {
        ev.preventDefault(); ev.stopPropagation();
        if (draggedItem?.type === 'entity' && draggedItem.id !== e.id) {
          if (checkEntityCycle(draggedItem.id, e.id)) { setDragOverId(null); return; }
          const rect = ev.currentTarget.getBoundingClientRect();
          const y = ev.clientY - rect.top;
          const isExpanded = !isCollapsed && hasChildren;
          if (y < rect.height * 0.25) { if (dragOverId !== `before-${e.id}`) setDragOverId(`before-${e.id}`); }
          else if (y > rect.height * 0.75 && !isExpanded) { if (dragOverId !== `after-${e.id}`) setDragOverId(`after-${e.id}`); }
          else { if (dragOverId !== e.id) setDragOverId(e.id); }
        }
      }}
      onDragLeave={() => setDragOverId(null)}
      onDrop={(ev) => {
        ev.preventDefault(); ev.stopPropagation(); setDragOverId(null);
        if (draggedItem?.type === 'entity' && draggedItem.id !== e.id) {
          if (checkEntityCycle(draggedItem.id, e.id)) { setDraggedItem(null); return; }
          const rect = ev.currentTarget.getBoundingClientRect();
          const y = ev.clientY - rect.top;
          const isExpanded = !isCollapsed && hasChildren;
          if (y < rect.height * 0.25) reorderEntities(draggedItem.id, e.id, 'before');
          else if (y > rect.height * 0.75 && !isExpanded) reorderEntities(draggedItem.id, e.id, 'after');
          else updateEntity(draggedItem.id, { parentId: e.id });
        }
        setDraggedItem(null);
      }}
      onTouchStart={(ev) => treeDnd.onTouchStart(ev, e.id)}
      onTouchMove={(ev) => {
        if (anyDragged) {
          ev.stopPropagation();
          if (ev.cancelable) ev.preventDefault();
        }
        const touch = ev.touches[0];
        if (!anyDragged) {
          const dx = touch.clientX - treeDnd.initialTouchPos.current.x;
          const dy = touch.clientY - treeDnd.initialTouchPos.current.y;
          if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
            treeDnd.cancelTouchTimeout();
          }
          return;
        }
        treeDnd.lastTouchPos.current = { x: touch.clientX, y: touch.clientY };
        if (ghostRef.current) {
          ghostRef.current.style.left = `${touch.clientX}px`;
          ghostRef.current.style.top = `${touch.clientY}px`;
        }
        const el = document.elementFromPoint(touch.clientX, touch.clientY);
        const targetEntity = el?.closest('[data-entity-id]');
        if (draggedItem?.type === 'entity') {
          if (targetEntity) {
            const targetId = targetEntity.getAttribute('data-entity-id');
            if (targetId && targetId !== e.id) {
              if (checkEntityCycle(draggedItem.id, targetId)) {
                setDragOverId(null);
              } else {
                const rect = targetEntity.getBoundingClientRect();
                const y = touch.clientY - rect.top;
                const targetDraftEnt = dragStateRef.current.draftKey.entities.find((x: any) => x.id === targetId);
                const targetHasChildren = dragStateRef.current.draftKey.entities.some((x: any) => x.parentId === targetId);
                const isExpanded = !collapsedEntitiesRef.current.has(targetId) && targetHasChildren;
                if (y < rect.height * 0.25) setDragOverId(`before-${targetId}`);
                else if (y > rect.height * 0.75 && !isExpanded) setDragOverId(`after-${targetId}`);
                else setDragOverId(targetId);
              }
            }
          } else setDragOverId(null);
        } else setDragOverId(null);
      }}
      onTouchEnd={(ev) => {
        if (anyDragged) ev.stopPropagation();
        if (draggedItem?.type === 'entity') {
          if (ev.cancelable) ev.preventDefault();
          if (dragOverId) {
            const targetRawId = dragOverId.replace('before-', '').replace('after-', '');
            if (!checkEntityCycle(draggedItem.id, targetRawId)) {
              if (dragOverId.startsWith('before-')) reorderEntities(draggedItem.id, targetRawId, 'before');
              else if (dragOverId.startsWith('after-')) reorderEntities(draggedItem.id, targetRawId, 'after');
              else if (dragOverId !== draggedItem.id) updateEntity(draggedItem.id, { parentId: dragOverId });
            }
          }
          setDraggedItem(null); setDragOverId(null);
        }
      if (treeDnd.onTouchCancel) {
        treeDnd.onTouchCancel(ev);
      }
      }}
      onTouchCancel={treeDnd.onTouchCancel}
    />
  );
}, (prev, next) => {
  return prev.e === next.e && prev.depth === next.depth && prev.hasChildren === next.hasChildren && prev.isFirst === next.isFirst && prev.isLast === next.isLast && prev.isSelected === next.isSelected && prev.isCollapsed === next.isCollapsed && prev.dragOverId === next.dragOverId && prev.isDragged === next.isDragged && prev.anyDragged === next.anyDragged && prev.isSearchDimmed === next.isSearchDimmed && prev.isSearchMatch === next.isSearchMatch && prev.t === next.t && prev.dragStateRef === next.dragStateRef && prev.collapsedEntitiesRef === next.collapsedEntitiesRef && prev.ghostRef === next.ghostRef;
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
  isSwiping?: boolean;
}

export const BuilderEntitiesTab: React.FC<BuilderEntitiesTabProps> = React.memo(({
  draftKey, updateDraftKey, t, selectedEntityId, setSelectedEntityId, collapsedEntities, toggleEntityCollapse,
  setCollapsedEntities,
  draggedItem, setDraggedItem, dragOverId, setDragOverId, draggedMedia, setDraggedMedia, setEditingMedia, setDeleteTarget, isSwiping
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
  const dragStateRef = useRef({ dragOverId, draggedItem, draftKey });
  dragStateRef.current = { dragOverId, draggedItem, draftKey };
  const collapsedEntitiesRef = useRef(collapsedEntities);
  collapsedEntitiesRef.current = collapsedEntities;

  const [isFooterVisible, setIsFooterVisible] = useState(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showFooter = useCallback(() => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    setIsFooterVisible(true);
  }, []);

  const hideFooter = useCallback(() => {
    hideTimeoutRef.current = setTimeout(() => {
      setIsFooterVisible(false);
    }, 300);
  }, []);

  useEffect(() => {
    return () => {
      if (touchTimeout.current) clearTimeout(touchTimeout.current);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

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

  const scrollAnimRef = useRef<number | null>(null);

  useEffect(() => {
    if (!draggedItem && !draggedMedia) {
      if (scrollAnimRef.current) cancelAnimationFrame(scrollAnimRef.current);
      return;
    }

    const scrollContainer = containerRef.current;
    if (!scrollContainer) return;

    const scrollStep = () => {
      const y = draggedItem ? treeDnd.lastTouchPos.current.y : lastTouchPos.current.y;
      const rect = scrollContainer.getBoundingClientRect();
      const threshold = 60;
      const maxSpeed = 15;

      if (y > 0) {
        if (y < rect.top + threshold) {
          const speed = maxSpeed * (1 - Math.max(0, y - rect.top) / threshold);
          scrollContainer.scrollTop -= speed;
        } else if (y > rect.bottom - threshold) {
          const speed = maxSpeed * (1 - Math.max(0, rect.bottom - y) / threshold);
          scrollContainer.scrollTop += speed;
        }
      }
      scrollAnimRef.current = requestAnimationFrame(scrollStep);
    };
    scrollAnimRef.current = requestAnimationFrame(scrollStep);
    return () => { if (scrollAnimRef.current) cancelAnimationFrame(scrollAnimRef.current); };
  }, [draggedItem, draggedMedia]);

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

  const moveEntity = useCallback((id: string, direction: 'up' | 'down') => {
    updateDraftKey(prev => {
      const newEntities = [...prev.entities];
      const idx = newEntities.findIndex(e => e.id === id);
      if (idx === -1) return prev;
      const entity = newEntities[idx];
      const siblings = newEntities.filter(e => e.parentId === entity.parentId);
      const siblingIdx = siblings.findIndex(e => e.id === id);
      if (direction === 'up' && siblingIdx > 0) {
        const prevIdx = newEntities.findIndex(e => e.id === siblings[siblingIdx - 1].id);
        const temp = newEntities[idx];
        newEntities[idx] = newEntities[prevIdx];
        newEntities[prevIdx] = temp;
      } else if (direction === 'down' && siblingIdx < siblings.length - 1) {
        const nextIdx = newEntities.findIndex(e => e.id === siblings[siblingIdx + 1].id);
        const temp = newEntities[idx];
        newEntities[idx] = newEntities[nextIdx];
        newEntities[nextIdx] = temp;
      }
      return { ...prev, entities: newEntities };
    });
  }, [updateDraftKey]);

  const reorderEntities = useCallback((draggedId: string, targetId: string, position: 'before' | 'after') => {
    updateDraftKey(prev => {
      const newEntities = [...prev.entities];
      const draggedIdx = newEntities.findIndex(e => e.id === draggedId);
      const targetIdx = newEntities.findIndex(e => e.id === targetId);
      if (draggedIdx === -1 || targetIdx === -1) return prev;
      
      const draggedEntity = { ...newEntities[draggedIdx], parentId: newEntities[targetIdx].parentId };
      newEntities[draggedIdx] = draggedEntity;
      
      const [moved] = newEntities.splice(draggedIdx, 1);
      const newTargetIdx = newEntities.findIndex(e => e.id === targetId);
      const insertIdx = position === 'before' ? newTargetIdx : newTargetIdx + 1;
      newEntities.splice(insertIdx, 0, moved);
      
      return { ...prev, entities: newEntities };
    });
  }, [updateDraftKey]);

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
    const result: { e: DraftEntity, depth: number, hasChildren: boolean, isFirst: boolean, isLast: boolean }[] = [];
    const traverse = (e: DraftEntity, depth: number, index: number, total: number) => {
      const children = entityChildrenMap.get(e.id) || [];
      result.push({ e, depth, hasChildren: children.length > 0, isFirst: index === 0, isLast: index === total - 1 });
      if (!collapsedEntities.has(e.id)) {
        children.forEach((c, i) => traverse(c, depth + 1, i, children.length));
      }
    };
    rootEntities.forEach((e, i) => traverse(e, 0, i, rootEntities.length));
    return result;
  }, [draftKey.entities, collapsedEntities]);

  const renderEntityList = () => {
    return visibleEntities.map(({ e, depth, hasChildren, isFirst, isLast }) => {
      const isSearchDimmed = matchingIds !== null && !matchingIds.has(e.id);
      const isSearchMatch = matchingIds !== null && matchingIds.has(e.id);
      return (
        <MemoizedEntityItem
          key={e.id} e={e} depth={depth} hasChildren={hasChildren} isFirst={isFirst} isLast={isLast}
          isSelected={selectedEntityId === e.id} isCollapsed={collapsedEntities.has(e.id)}
          dragOverId={dragOverId} isDragged={draggedItem?.id === e.id}
          anyDragged={!!draggedItem} t={t} setSelectedEntityId={setSelectedEntityId}
          toggleEntityCollapse={toggleEntityCollapse} duplicateEntity={duplicateEntity}
          setDeleteTarget={setDeleteTarget} treeDnd={treeDnd}
          isSearchDimmed={isSearchDimmed} isSearchMatch={isSearchMatch}
          moveEntity={moveEntity} reorderEntities={reorderEntities} updateEntity={updateEntity}
          draggedItem={draggedItem} setDragOverId={setDragOverId} setDraggedItem={setDraggedItem}
          dragStateRef={dragStateRef} collapsedEntitiesRef={collapsedEntitiesRef}
          ghostRef={ghostRef}
        />
      );
    });
  };

  return (
    <div className="flex flex-col w-full h-full animate-fade-in min-w-0 min-h-0 relative" style={{ willChange: 'auto' }}>
      <BuilderListHeader
        title={t('kbEntities')}
        icon="Boxes"
        count1={draftKey.entities.length}
        searchTerm={searchTerm} setSearchTerm={setSearchTerm} searchInputRef={searchInputRef}
        matchCount={matchCount} currentMatchIndex={currentMatchIndex} setCurrentMatchIndex={setCurrentMatchIndex}
        t={t as any}
      />
      <div
        ref={containerRef}
        className={`panel-content grow p-3 flex flex-col transition-colors ${draggedItem || draggedMedia || isSwiping ? 'overflow-hidden touch-none' : 'overflow-y-auto'}`}
        onMouseEnter={showFooter} onMouseLeave={hideFooter}
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
            willChange: 'auto'
          }}
        >
          {draggedItem ? (
            <div className="bg-panel-bg/95 backdrop-blur-xl border border-accent/50 shadow-2xl rounded-xl px-4 py-2 flex items-center gap-2 font-bold text-accent text-sm">
              <Icon name="Box" size={16} />
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

      {/* Floating Add Button */}
      <div
        className={`absolute bottom-6 right-6 md:bottom-4 md:right-4 z-50 transition-opacity duration-300 ${isFooterVisible ? 'opacity-100 pointer-events-auto' : 'max-md:opacity-100 max-md:pointer-events-auto opacity-0 pointer-events-none'}`}
      >
        <button
          onClick={addEntity}
          className="size-14 bg-accent/95 backdrop-blur-md border border-white/20 text-white rounded-xl shadow-lg flex items-center justify-center hover:bg-accent-hover active:scale-95 transition-all cursor-pointer"
          title={t('kbAddEntity')}
        >
          <Icon name="Plus" className="size-6" />
        </button>
      </div>
    </div>
  );
});
