import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Icon } from '../common/Icon';
import type { DraftKeyData, DraftFeature } from '../../types';
import { ConfirmModal, BuilderFeatureModal } from '../modals';
import { processImage } from '../../utils/imageUtils';
import { useTreeDragAndDrop, useSearchAutoScroll } from '../../hooks';

const generateId = () => Math.random().toString(36).substr(2, 9);

const MemoizedFeatureItem = React.memo(({
  f, depth, hasChildren, isFirst, isLast, isSelected, isCollapsed, dragOverId, isDragged, anyDragged, draggedItemType, draggedItemParentId, draggedItemId, isSearchDimmed, isSearchMatch,
  t, setSelectedFeatureId, toggleFeatureCollapse, duplicateFeature, setDeleteTarget, addState,
  featureTreeDnd, setDragOverId, setDraggedItem, moveStateToFeature, moveFeature, reorderFeatures, updateFeature
}: any) => {
  const iconName = f.type === 'state' ? 'ListTree' : 'Hash';
  const isDragOverCenter = dragOverId === f.id;
  const isDragOverTop = dragOverId === `before-${f.id}`;
  const isDragOverBottom = dragOverId === `after-${f.id}` && (isCollapsed || f.type !== 'state' || !f.states || f.states.length === 0);

  return (
    <div
      data-search-match={isSearchMatch ? "true" : undefined}
      draggable
      data-feature-id={f.id}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => featureTreeDnd.onDragStart(e, f.id)}
      onDragEnd={featureTreeDnd.onDragEnd}
      onDragOver={(e) => {
        if (draggedItemType === 'state') {
          e.preventDefault(); e.stopPropagation();
          if (draggedItemParentId !== f.id && f.type === 'state') {
            if (dragOverId !== f.id) setDragOverId(f.id);
          }
        } else if (draggedItemType === 'feature' && draggedItemId !== f.id) {
          e.preventDefault(); e.stopPropagation();
          const rect = e.currentTarget.getBoundingClientRect();
          const y = e.clientY - rect.top;
          if (y < rect.height * 0.25) {
            if (dragOverId !== `before-${f.id}`) setDragOverId(`before-${f.id}`);
          } else if (y > rect.height * 0.75) {
            if (dragOverId !== `after-${f.id}`) setDragOverId(`after-${f.id}`);
          } else {
            if (dragOverId !== f.id) setDragOverId(f.id);
          }
        }
      }}
      onDragLeave={() => featureTreeDnd.onDragLeave(f.id)}
      onDrop={(e) => {
        if (draggedItemType === 'state') {
          e.preventDefault(); e.stopPropagation();
          setDragOverId(null);
          if (draggedItemParentId !== f.id && f.type === 'state') {
            moveStateToFeature(draggedItemId, draggedItemParentId, f.id);
          }
        } else if (draggedItemType === 'feature' && draggedItemId !== f.id) {
          e.preventDefault(); e.stopPropagation();
          const rect = e.currentTarget.getBoundingClientRect();
          const y = e.clientY - rect.top;
          if (y < rect.height * 0.25 || y > rect.height * 0.75) {
            reorderFeatures(draggedItemId, f.id, y < rect.height * 0.25 ? 'before' : 'after');
          } else {
            updateFeature(draggedItemId, { parentId: f.id });
          }
        }
        setDraggedItem(null);
      }}
      onTouchStart={(e) => featureTreeDnd.onTouchStart(e, f.id)}
      onTouchMove={(e) => {
        if (anyDragged) e.stopPropagation();
        const touch = e.touches[0];
        featureTreeDnd.lastTouchPos.current = { x: touch.clientX, y: touch.clientY };
        if (featureTreeDnd.ghostRef.current) {
          featureTreeDnd.ghostRef.current.style.left = `${touch.clientX}px`;
          featureTreeDnd.ghostRef.current.style.top = `${touch.clientY}px`;
        }
        if (!anyDragged) return;
        const el = document.elementFromPoint(touch.clientX, touch.clientY);
        const targetFeature = el?.closest('[data-feature-id]');
        const targetState = el?.closest('[data-state-id]');
        if (draggedItemType === 'feature') {
          if (targetState) {
            const targetId = targetState.getAttribute('data-parent-id');
            if (targetId && targetId !== draggedItemId) {
              setDragOverId(`after-${targetId}`);
            }
          } else if (targetFeature) {
            const targetId = targetFeature.getAttribute('data-feature-id');
            if (targetId && targetId !== draggedItemId) {
              const rect = targetFeature.getBoundingClientRect();
              const y = touch.clientY - rect.top;
              if (y < rect.height * 0.25) setDragOverId(`before-${targetId}`);
              else if (y > rect.height * 0.75) setDragOverId(`after-${targetId}`);
              else setDragOverId(targetId);
            }
          } else setDragOverId(null);
        } else setDragOverId(null);
      }}
      onTouchEnd={(e) => {
        if (anyDragged) e.stopPropagation();
        if (draggedItemType === 'feature') {
          if (e.cancelable) e.preventDefault();
          if (dragOverId) {
            if (dragOverId.startsWith('before-')) reorderFeatures(draggedItemId, dragOverId.replace('before-', ''), 'before');
            else if (dragOverId.startsWith('after-')) reorderFeatures(draggedItemId, dragOverId.replace('after-', ''), 'after');
            else if (dragOverId !== draggedItemId) updateFeature(draggedItemId, { parentId: dragOverId });
          }
          setDraggedItem(null); setDragOverId(null);
        }
      }}
      onTouchCancel={featureTreeDnd.onTouchCancel}
      onClick={() => setSelectedFeatureId(f.id)}
      className={`builder-list-item feature-item flex items-center gap-2 p-1.5 rounded-xl transition-all duration-300 relative group/item cursor-pointer hover:bg-hover-bg/80 hover:shadow-md hover:backdrop-blur-sm ${isSelected ? 'bg-accent/20 shadow-inner ring-2 ring-accent' : 'border border-transparent'} ${isDragOverCenter ? 'ring-2 ring-accent ring-inset bg-accent/10 scale-[1.02] z-20' : ''} ${isDragOverTop || isDragOverBottom ? 'z-20' : ''} ${isDragged ? 'opacity-50' : ''} ${isSearchDimmed ? 'opacity-30' : ''} ${isSearchMatch ? 'bg-accent/20 shadow-inner' : ''} data-[search-active=true]:ring-2 data-[search-active=true]:ring-accent`}
      style={{ paddingLeft: `calc(${1.5 + depth * 1.5}rem + 0.5rem)`, touchAction: anyDragged ? 'none' : 'auto', contentVisibility: (isDragOverTop || isDragOverBottom) ? 'visible' : 'auto' } as React.CSSProperties}
    >
      <div className={`absolute -top-[3px] left-0 right-0 h-[2px] bg-accent z-30 pointer-events-none transition-opacity duration-200 ${isDragOverTop ? 'opacity-100' : 'opacity-0'}`} />
      <div className={`absolute -bottom-[3px] left-0 right-0 h-[2px] bg-accent z-30 pointer-events-none transition-opacity duration-200 ${isDragOverBottom ? 'opacity-100' : 'opacity-0'}`} />
      {hasChildren && (
        <button
          onClick={(e) => { e.stopPropagation(); toggleFeatureCollapse(f.id); }}
          className={`w-7 h-7 flex items-center justify-center rounded-md cursor-pointer absolute z-20 transition-colors ${isSelected ? 'text-accent hover:bg-accent/10' : 'text-gray-500 hover:bg-black/10 dark:hover:bg-white/10'}`}
          style={{ left: `calc(${depth * 1.5}rem)` }}
        >
          <Icon name="ChevronRight" size={16} className={`transition-transform duration-200 ${!isCollapsed ? 'rotate-90' : ''}`} />
        </button>
      )}
      {f.media && f.media.length > 0 ? (
        <img src={f.media[0].url} alt={f.name} className="w-10 h-10 object-cover rounded-lg shadow-sm shrink-0" />
      ) : (
        <div className="w-10 h-10 bg-header-bg/80 rounded-lg shadow-sm shrink-0 flex items-center justify-center text-gray-400">
          <Icon name={iconName} size={20} className={`shrink-0 ${isSelected ? 'opacity-100 text-accent' : 'opacity-60'}`} />
        </div>
      )}
      <span className="truncate flex-1 text-sm font-medium">
        {f.name || t('kbUnnamedFeature')}
        {f.matchType === 'AND' && <span className="ml-2 text-[10px] bg-accent/20 text-accent px-1.5 py-0.5 rounded font-bold">AND</span>}
        {f.matchType === 'SINGLE' && <span className="ml-2 text-[10px] bg-accent/20 text-accent px-1.5 py-0.5 rounded font-bold">SINGLE</span>}
      </span>
      <div className="max-md:hidden opacity-0 group-hover/item:opacity-100 flex items-center gap-0.5 transition-opacity z-20 shrink-0 pr-1">
        {f.type === 'state' && (
          <button onClick={(e) => { e.stopPropagation(); addState(f.id); if (isCollapsed) toggleFeatureCollapse(f.id); }} className={`p-1.5 rounded-md cursor-pointer transition-colors ${isSelected ? 'text-accent hover:bg-accent/10' : 'text-gray-400 hover:text-accent hover:bg-black/10 dark:hover:bg-white/10'}`} title={t('kbAddState')}>
            <Icon name="Plus" size={14} />
          </button>
        )}
        {!isFirst && (
          <button onClick={(e) => { e.stopPropagation(); moveFeature(f.id, 'up'); }} className={`p-1.5 rounded-md cursor-pointer transition-colors ${isSelected ? 'text-accent hover:bg-accent/10' : 'text-gray-400 hover:text-accent hover:bg-black/10 dark:hover:bg-white/10'}`} title={t('moveUp' as any) || 'Move Up'}>
            <Icon name="ArrowUp" size={14} />
          </button>
        )}
        {!isLast && (
          <button onClick={(e) => { e.stopPropagation(); moveFeature(f.id, 'down'); }} className={`p-1.5 rounded-md cursor-pointer transition-colors ${isSelected ? 'text-accent hover:bg-accent/10' : 'text-gray-400 hover:text-accent hover:bg-black/10 dark:hover:bg-white/10'}`} title={t('moveDown' as any) || 'Move Down'}>
            <Icon name="ArrowDown" size={14} />
          </button>
        )}
        <button onClick={(e) => { e.stopPropagation(); duplicateFeature(f.id); }} className={`p-1.5 rounded-md cursor-pointer transition-colors ${isSelected ? 'text-accent hover:bg-accent/10' : 'text-gray-400 hover:text-accent hover:bg-black/10 dark:hover:bg-white/10'}`} title={t('kbDuplicate')}>
          <Icon name="Copy" size={14} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: 'feature', id: f.id }); }} className={`p-1.5 rounded-md cursor-pointer transition-colors ${isSelected ? 'text-red-500 hover:bg-red-500/10' : 'text-red-400 hover:text-red-500 hover:bg-red-500/10'}`} title={t('kbDelete')}>
          <Icon name="Trash2" size={14} />
        </button>
      </div>
    </div>
  );
}, (prev, next) => {
  return prev.f === next.f && prev.depth === next.depth && prev.hasChildren === next.hasChildren && prev.isFirst === next.isFirst && prev.isLast === next.isLast && prev.isSelected === next.isSelected && prev.isCollapsed === next.isCollapsed && prev.dragOverId === next.dragOverId && prev.isDragged === next.isDragged && prev.anyDragged === next.anyDragged && prev.draggedItemType === next.draggedItemType && prev.draggedItemParentId === next.draggedItemParentId && prev.draggedItemId === next.draggedItemId && prev.isSearchDimmed === next.isSearchDimmed && prev.isSearchMatch === next.isSearchMatch && prev.t === next.t;
});

const MemoizedStateItem = React.memo(({
  s, f, depth, isFirst, isLast, isSelected, dragOverId, isDragged, anyDragged, draggedItemType, draggedItemParentId, draggedItemId, isSearchDimmed, isSearchMatch,
  t, setSelectedFeatureId, duplicateState, setDeleteTarget,
  setDraggedItem, setDragOverId, dragStateRef, reorderStates, moveStateToFeature,
  lastTouchPos, touchTimeout, ghostRef, moveState, reorderFeatures
}: any) => {
  const isDragOverCenter = dragOverId === s.id;
  const isDragOverTop = dragOverId === `before-${s.id}`;
  const isDragOverBottom = dragOverId === `after-${s.id}`;
  const isDragOverParentBottom = dragOverId === `after-${f.id}` && isLast;

  return (
    <div
      className={`builder-list-item state-item flex items-center gap-2 p-1.5 rounded-xl transition-all duration-300 relative group/state cursor-pointer hover:bg-hover-bg/80 hover:shadow-md hover:backdrop-blur-sm ${isSelected ? 'bg-accent/20 shadow-inner ring-2 ring-accent' : 'border border-transparent opacity-80 hover:opacity-100'} ${isDragOverCenter ? 'ring-2 ring-accent ring-inset bg-accent/10 scale-[1.02] z-20' : ''} ${isDragOverTop || isDragOverBottom || isDragOverParentBottom ? 'z-20' : ''} ${isDragged ? 'opacity-50' : ''} ${isSearchDimmed ? 'opacity-30' : ''} ${isSearchMatch ? 'bg-accent/20 shadow-inner' : ''} data-[search-active=true]:ring-2 data-[search-active=true]:ring-accent`}
      onClick={(e) => { e.stopPropagation(); setSelectedFeatureId(s.id); }}
      style={{ paddingLeft: `calc(${1.5 + depth * 1.5}rem + 0.5rem)`, touchAction: anyDragged ? 'none' : 'auto', contentVisibility: (isDragOverTop || isDragOverBottom || isDragOverParentBottom) ? 'visible' : 'auto' } as React.CSSProperties}
      draggable data-state-id={s.id} data-parent-id={f.id}
      onDragStart={(e) => { e.stopPropagation(); setDraggedItem({ type: 'state', id: s.id, parentId: f.id }); }}
      onDragEnd={() => { setDraggedItem(null); setDragOverId(null); }}
      onDragOver={(e) => {
        e.preventDefault(); e.stopPropagation();
        if (draggedItemType === 'state' && draggedItemId !== s.id) {
          const rect = e.currentTarget.getBoundingClientRect();
          const y = e.clientY - rect.top;
          if (y < rect.height * 0.5) { if (dragOverId !== `before-${s.id}`) setDragOverId(`before-${s.id}`); }
          else { if (dragOverId !== `after-${s.id}`) setDragOverId(`after-${s.id}`); }
        } else if (draggedItemType === 'feature' && draggedItemId !== f.id) {
          if (dragOverId !== `after-${f.id}`) setDragOverId(`after-${f.id}`);
        }
      }}
      onDragLeave={() => { setDragOverId(null); }}
      onDrop={(e) => {
        e.preventDefault(); e.stopPropagation(); setDragOverId(null);
        if (draggedItemType === 'state' && draggedItemId !== s.id) {
          const rect = e.currentTarget.getBoundingClientRect();
          const position = (e.clientY - rect.top) < rect.height * 0.5 ? 'before' : 'after';
          reorderStates(draggedItemParentId, f.id, draggedItemId, s.id, position);
        } else if (draggedItemType === 'feature' && draggedItemId !== f.id) {
          reorderFeatures(draggedItemId, f.id, 'after');
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
        if (anyDragged) e.stopPropagation();
        const touch = e.touches[0];
        lastTouchPos.current = { x: touch.clientX, y: touch.clientY };
        if (ghostRef.current) { ghostRef.current.style.left = `${touch.clientX}px`; ghostRef.current.style.top = `${touch.clientY}px`; }
        if (!anyDragged) { if (touchTimeout.current) clearTimeout(touchTimeout.current); return; }
        const el = document.elementFromPoint(touch.clientX, touch.clientY);
        const targetState = el?.closest('[data-state-id]');
        const targetFeature = el?.closest('[data-feature-id]');
        if (targetState) {
          const id = targetState.getAttribute('data-state-id');
          if (id && id !== s.id && draggedItemType === 'state') {
             const rect = targetState.getBoundingClientRect();
             if (touch.clientY - rect.top < rect.height * 0.5) setDragOverId(`before-${id}`);
             else setDragOverId(`after-${id}`);
          }
        } else if (targetFeature) {
          const fid = targetFeature.getAttribute('data-feature-id');
          const isStateFeat = dragStateRef.current.draftKey.features.find((x: any) => x.id === fid)?.type === 'state';
          if (fid && isStateFeat && fid !== f.id && draggedItemType === 'state') setDragOverId(fid);
        } else setDragOverId(null);
      }}
      onTouchEnd={(e) => {
        if (anyDragged) e.stopPropagation();
        if (touchTimeout.current) clearTimeout(touchTimeout.current);
        if (draggedItemType === 'state') {
          if (e.cancelable) e.preventDefault();
          const { dragOverId: latestDragOverId, draggedItem: latestDraggedItem, draftKey: latestDraftKey } = dragStateRef.current;
          if (latestDragOverId && latestDraggedItem) {
            if (latestDragOverId.startsWith('before-')) {
              const targetId = latestDragOverId.replace('before-', '');
              const parentFeat = latestDraftKey.features.find((x: any) => x.states?.some((st: any) => st.id === targetId));
              if (parentFeat) reorderStates(latestDraggedItem.parentId!, parentFeat.id, latestDraggedItem.id, targetId, 'before');
            } else if (latestDragOverId.startsWith('after-')) {
              const targetId = latestDragOverId.replace('after-', '');
              const parentFeat = latestDraftKey.features.find((x: any) => x.states?.some((st: any) => st.id === targetId));
              if (parentFeat) reorderStates(latestDraggedItem.parentId!, parentFeat.id, latestDraggedItem.id, targetId, 'after');
            } else {
              const targetFeature = latestDraftKey.features.find((x: any) => x.id === latestDragOverId);
              if (targetFeature && targetFeature.type === 'state') moveStateToFeature(latestDraggedItem.id, latestDraggedItem.parentId!, latestDragOverId);
            }
          }
          setDraggedItem(null); setDragOverId(null);
        }
      }}
      onTouchCancel={() => { if (touchTimeout.current) clearTimeout(touchTimeout.current); setDraggedItem(null); setDragOverId(null); }}
    >
      <div className={`absolute -top-[3px] left-0 right-0 h-[2px] bg-accent z-30 pointer-events-none transition-opacity duration-200 ${isDragOverTop ? 'opacity-100' : 'opacity-0'}`} />
      <div className={`absolute -bottom-[3px] left-0 right-0 h-[2px] bg-accent z-30 pointer-events-none transition-opacity duration-200 ${isDragOverBottom || isDragOverParentBottom ? 'opacity-100' : 'opacity-0'}`} />
      {s.media && s.media.length > 0 ? (
        <img src={s.media[0].url} alt={s.name} className="w-8 h-8 object-cover rounded-lg shadow-sm shrink-0" />
      ) : (
        <div className="w-8 h-8 bg-header-bg/80 rounded-lg shadow-sm shrink-0 flex items-center justify-center text-gray-400">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSelected ? 'bg-accent' : 'bg-text opacity-50'}`}></span>
        </div>
      )}
      <span className="truncate flex-1 text-sm font-medium">{s.name || t('kbStateName') || 'Unnamed State'}</span>
      <div className="max-md:hidden opacity-0 group-hover/state:opacity-100 flex items-center gap-0.5 transition-opacity z-20 shrink-0 pr-1">
        {!isFirst && <button onClick={(e) => { e.stopPropagation(); moveState(f.id, s.id, 'up'); }} className={`p-1.5 rounded-md cursor-pointer transition-colors ${isSelected ? 'text-accent hover:bg-accent/10' : 'text-gray-400 hover:text-accent hover:bg-black/10 dark:hover:bg-white/10'}`} title={t('moveUp' as any) || 'Move Up'}><Icon name="ArrowUp" size={14} /></button>}
        {!isLast && <button onClick={(e) => { e.stopPropagation(); moveState(f.id, s.id, 'down'); }} className={`p-1.5 rounded-md cursor-pointer transition-colors ${isSelected ? 'text-accent hover:bg-accent/10' : 'text-gray-400 hover:text-accent hover:bg-black/10 dark:hover:bg-white/10'}`} title={t('moveDown' as any) || 'Move Down'}><Icon name="ArrowDown" size={14} /></button>}
        <button onClick={(e) => { e.stopPropagation(); duplicateState(f.id, s.id); }} className={`p-1.5 rounded-md cursor-pointer transition-colors ${isSelected ? 'text-accent hover:bg-accent/10' : 'text-gray-400 hover:text-accent hover:bg-black/10 dark:hover:bg-white/10'}`} title={t('kbDuplicate')}><Icon name="Copy" size={14} /></button>
        <button onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: 'state', id: s.id, parentId: f.id }); }} className={`p-1.5 rounded-md cursor-pointer transition-colors ${isSelected ? 'text-red-500 hover:bg-red-500/10' : 'text-red-400 hover:text-red-500 hover:bg-red-500/10'}`} title={t('kbDelete')}><Icon name="Trash2" size={14} /></button>
      </div>
    </div>
  );
}, (prev, next) => {
  return prev.s === next.s && prev.f === next.f && prev.depth === next.depth && prev.isFirst === next.isFirst && prev.isLast === next.isLast && prev.isSelected === next.isSelected && prev.dragOverId === next.dragOverId && prev.isDragged === next.isDragged && prev.anyDragged === next.anyDragged && prev.draggedItemType === next.draggedItemType && prev.draggedItemParentId === next.draggedItemParentId && prev.draggedItemId === next.draggedItemId && prev.isSearchDimmed === next.isSearchDimmed && prev.isSearchMatch === next.isSearchMatch && prev.t === next.t;
});

interface BuilderFeaturesTabProps {
  draftKey: DraftKeyData;
  updateDraftKey: (updater: (prev: DraftKeyData) => DraftKeyData) => void;
  t: (key: string) => string;
  selectedFeatureId: string | null;
  setSelectedFeatureId: (id: string | null) => void;
  collapsedFeatures: Set<string>;
  setCollapsedFeatures?: React.Dispatch<React.SetStateAction<Set<string>>>;
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
  setCollapsedFeatures,
  draggedItem, setDraggedItem, dragOverId, setDragOverId, draggedMedia, setDraggedMedia, setEditingMedia, setDeleteTarget
}) => {
  const touchTimeout = useRef<NodeJS.Timeout | null>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const lastTouchPos = useRef({ x: 0, y: 0 });
  const [draggedValue, setDraggedValue] = useState<{ stateId: string, index: number } | null>(null);
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

    const featureChildrenMap = new Map<string, DraftFeature[]>();
    const rootFeatures: DraftFeature[] = [];
    draftKey.features.forEach(f => {
      if (f.parentId) {
        if (!featureChildrenMap.has(f.parentId)) featureChildrenMap.set(f.parentId, []);
        featureChildrenMap.get(f.parentId)!.push(f);
      } else {
        rootFeatures.push(f);
      }
    });

    const findMatches = (nodes: DraftFeature[], parents: string[]): boolean => {
      let subtreeHasMatch = false;
      for (const node of nodes) {
        const selfMatches = node.name.toLowerCase().includes(lowerCaseSearchTerm);
        let childrenMatch = false;
        let statesMatch = false;

        if (node.type === 'state') {
          node.states.forEach(s => {
            if (s.name.toLowerCase().includes(lowerCaseSearchTerm)) {
              newMatching.add(s.id);
              statesMatch = true;
            }
          });
        }

        const children = featureChildrenMap.get(node.id) || [];
        if (children.length > 0) {
          parents.push(node.id);
          childrenMatch = findMatches(children, parents);
          parents.pop();
        }

        if (selfMatches) newMatching.add(node.id);
        if (selfMatches || childrenMatch || statesMatch) {
          subtreeHasMatch = true;
          parents.forEach(p => newExpanded.add(p));
          newExpanded.add(node.id);
        }
      }
      return subtreeHasMatch;
    };

    findMatches(rootFeatures, []);
    setMatchingIds(newMatching);

    if (newExpanded.size > 0 && setCollapsedFeatures) {
      setCollapsedFeatures(prev => {
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
  }, [searchTerm, draftKey.features, setCollapsedFeatures]);

  useEffect(() => {
    setCurrentMatchIndex(0);
  }, [searchTerm, matchingIds]);

  useSearchAutoScroll(containerRef, searchTerm, matchingIds, currentMatchIndex, setCurrentMatchIndex, setMatchCount);
  
  const dragStateRef = useRef({ dragOverId, draggedItem, draftKey });
  dragStateRef.current = { dragOverId, draggedItem, draftKey };

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

  const moveFeature = useCallback((id: string, direction: 'up' | 'down') => {
    updateDraftKey(prev => {
      const newFeatures = [...prev.features];
      const idx = newFeatures.findIndex(f => f.id === id);
      if (idx === -1) return prev;
      const feature = newFeatures[idx];
      const siblings = newFeatures.filter(f => f.parentId === feature.parentId);
      const siblingIdx = siblings.findIndex(f => f.id === id);
      if (direction === 'up' && siblingIdx > 0) {
        const prevIdx = newFeatures.findIndex(f => f.id === siblings[siblingIdx - 1].id);
        const temp = newFeatures[idx];
        newFeatures[idx] = newFeatures[prevIdx];
        newFeatures[prevIdx] = temp;
      } else if (direction === 'down' && siblingIdx < siblings.length - 1) {
        const nextIdx = newFeatures.findIndex(f => f.id === siblings[siblingIdx + 1].id);
        const temp = newFeatures[idx];
        newFeatures[idx] = newFeatures[nextIdx];
        newFeatures[nextIdx] = temp;
      }
      return { ...prev, features: newFeatures };
    });
  }, [updateDraftKey]);

  const reorderFeatures = useCallback((draggedId: string, targetId: string, position: 'before' | 'after') => {
    updateDraftKey(prev => {
      const newFeatures = [...prev.features];
      const draggedIdx = newFeatures.findIndex(f => f.id === draggedId);
      const targetIdx = newFeatures.findIndex(f => f.id === targetId);
      if (draggedIdx === -1 || targetIdx === -1) return prev;
      
      const draggedFeature = { ...newFeatures[draggedIdx], parentId: newFeatures[targetIdx].parentId };
      newFeatures[draggedIdx] = draggedFeature;
      
      const [moved] = newFeatures.splice(draggedIdx, 1);
      const newTargetIdx = newFeatures.findIndex(f => f.id === targetId);
      const insertIdx = position === 'before' ? newTargetIdx : newTargetIdx + 1;
      newFeatures.splice(insertIdx, 0, moved);
      
      return { ...prev, features: newFeatures };
    });
  }, [updateDraftKey]);

  const reorderStates = React.useCallback((sourceFeatureId: string, targetFeatureId: string, draggedStateId: string, targetStateId: string, position: 'before' | 'after') => {
    updateDraftKey(prev => ({
      ...prev,
      features: prev.features.map(feat => {
        if (feat.id === sourceFeatureId) {
          const idx = feat.states.findIndex(st => st.id === draggedStateId);
          if (idx !== -1) {
            const newStates = [...feat.states];
            const [moved] = newStates.splice(idx, 1);
            return { ...feat, states: newStates };
          }
        }
        return feat;
      }).map((feat, _, tempFeatures) => {
        if (feat.id === targetFeatureId) {
          const sourceFeat = prev.features.find(f => f.id === sourceFeatureId);
          const stateToMove = sourceFeat?.states.find(s => s.id === draggedStateId);
          if (stateToMove) {
            const newStates = [...feat.states];
            const targetIdx = newStates.findIndex(st => st.id === targetStateId);
            if (targetIdx !== -1) {
              const insertIdx = position === 'before' ? targetIdx : targetIdx + 1;
              newStates.splice(insertIdx, 0, stateToMove);
            } else {
              newStates.push(stateToMove);
            }
            return { ...feat, states: newStates };
          }
        }
        return feat;
      }) 
    }));
  }, [updateDraftKey]);

  const moveState = useCallback((featureId: string, stateId: string, direction: 'up' | 'down') => {
    updateDraftKey(prev => {
      const newFeatures = [...prev.features];
      const fIdx = newFeatures.findIndex(f => f.id === featureId);
      if (fIdx === -1) return prev;
      const feature = { ...newFeatures[fIdx] };
      const newStates = [...feature.states];
      const sIdx = newStates.findIndex(s => s.id === stateId);
      if (direction === 'up' && sIdx > 0) {
        const temp = newStates[sIdx];
        newStates[sIdx] = newStates[sIdx - 1];
        newStates[sIdx - 1] = temp;
      } else if (direction === 'down' && sIdx < newStates.length - 1) {
        const temp = newStates[sIdx];
        newStates[sIdx] = newStates[sIdx + 1];
        newStates[sIdx + 1] = temp;
      }
      feature.states = newStates;
      newFeatures[fIdx] = feature;
      return { ...prev, features: newFeatures };
    });
  }, [updateDraftKey]);

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

  const visibleItems = React.useMemo(() => {
    const featureChildrenMap = new Map<string, DraftFeature[]>();
    const rootFeatures: DraftFeature[] = [];
    draftKey.features.forEach(f => {
      if (f.parentId) {
        if (!featureChildrenMap.has(f.parentId)) featureChildrenMap.set(f.parentId, []);
        featureChildrenMap.get(f.parentId)!.push(f);
      } else {
        rootFeatures.push(f);
      }
    });
    const result: any[] = [];
    const traverse = (f: DraftFeature, depth: number, index: number, total: number) => {
      const children = featureChildrenMap.get(f.id) || [];
      const hasChildren = children.length > 0 || (f.type === 'state' && f.states.length > 0);
      result.push({ isFeature: true, f, depth, hasChildren, isFirst: index === 0, isLast: index === total - 1 });
      if (!collapsedFeatures.has(f.id)) {
        children.forEach((c, i) => traverse(c, depth + 1, i, children.length));
        if (f.type === 'state') {
          f.states.forEach((s, i) => result.push({ isFeature: false, s, f, depth: depth + 1, isFirst: i === 0, isLast: i === f.states.length - 1 }));
        }
      }
    };
    rootFeatures.forEach((f, i) => traverse(f, 0, i, rootFeatures.length));
    return result;
  }, [draftKey.features, collapsedFeatures]);

  const renderFeatureList = () => {
    return visibleItems.map((item) => {
      if (item.isFeature) {
        const { f, depth, hasChildren, isFirst, isLast } = item;
        const isSearchDimmed = matchingIds !== null && !matchingIds.has(f.id);
        const isSearchMatch = matchingIds !== null && matchingIds.has(f.id);
        return (
          <MemoizedFeatureItem
            key={`f-${f.id}`} f={f} depth={depth} hasChildren={hasChildren} isFirst={isFirst} isLast={isLast}
            isSelected={selectedFeatureId === f.id} isCollapsed={collapsedFeatures.has(f.id)}
            dragOverId={dragOverId} isDragged={draggedItem?.id === f.id}
            anyDragged={!!draggedItem} draggedItemType={draggedItem?.type}
            draggedItemParentId={draggedItem?.parentId} draggedItemId={draggedItem?.id}
            t={t} setSelectedFeatureId={setSelectedFeatureId}
            toggleFeatureCollapse={toggleFeatureCollapse} duplicateFeature={duplicateFeature}
            setDeleteTarget={setDeleteTarget} addState={addState}
            featureTreeDnd={featureTreeDnd} setDragOverId={setDragOverId}
            setDraggedItem={setDraggedItem} moveStateToFeature={moveStateToFeature}
            isSearchDimmed={isSearchDimmed} isSearchMatch={isSearchMatch} moveFeature={moveFeature}
            reorderFeatures={reorderFeatures} updateFeature={updateFeature}
          />
        );
      } else {
        const { s, f, depth, isFirst, isLast } = item;
        const isSearchDimmed = matchingIds !== null && !matchingIds.has(s.id);
        const isSearchMatch = matchingIds !== null && matchingIds.has(s.id);
        return (
          <MemoizedStateItem
            key={`s-${s.id}`} s={s} f={f} depth={depth} isFirst={isFirst} isLast={isLast}
            isSelected={selectedFeatureId === s.id} dragOverId={dragOverId}
            isDragged={draggedItem?.id === s.id} anyDragged={!!draggedItem}
            draggedItemType={draggedItem?.type} draggedItemParentId={draggedItem?.parentId}
            draggedItemId={draggedItem?.id} t={t} setSelectedFeatureId={setSelectedFeatureId}
            duplicateState={duplicateState} setDeleteTarget={setDeleteTarget}
            setDraggedItem={setDraggedItem} setDragOverId={setDragOverId}
            dragStateRef={dragStateRef} reorderStates={reorderStates}
            moveStateToFeature={moveStateToFeature}
            lastTouchPos={lastTouchPos} touchTimeout={touchTimeout} ghostRef={ghostRef}
            isSearchDimmed={isSearchDimmed} isSearchMatch={isSearchMatch} moveState={moveState}
            reorderFeatures={reorderFeatures}
          />
        );
      }
    });
  };

  return (
    <div className="flex flex-col w-full h-full animate-fade-in">
      <div className="p-3.5 border-b border-black/5 dark:border-white/5 flex flex-wrap justify-between items-center bg-header-bg/85 backdrop-blur-md shadow-sm shrink-0 z-10 gap-2">
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
          <button onClick={addFeature} className="shrink-0 px-3 py-1.5 bg-accent/95 backdrop-blur-md border border-white/20 text-white rounded-lg hover:bg-accent-hover transition-all duration-300 text-sm font-bold shadow-md hover:shadow-lg flex items-center gap-1 cursor-pointer" title={t('kbAddFeature')}><Icon name="Plus" size={14} /> <span className="hidden sm:inline">{t('kbAdd' as any)}</span></button>
        </div>
      </div>
      <div
        ref={containerRef}
        className={`panel-content grow p-3 space-y-1 overflow-y-auto transition-colors ${dragOverId === 'root-feature' ? 'bg-accent/5 ring-2 ring-inset ring-accent' : ''}`}
        data-root-drop="true"
        onDragOver={(e) => {
          e.preventDefault();
          if (draggedItem?.type === 'feature' && dragOverId !== 'root-feature') setDragOverId('root-feature');
        }}
        onDragLeave={() => {
          if (dragOverId === 'root-feature') setDragOverId(null);
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (dragOverId === 'root-feature' && draggedItem?.type === 'feature') {
            updateFeature(draggedItem.id, { parentId: undefined });
          }
          setDragOverId(null);
          setDraggedItem(null);
        }}
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
