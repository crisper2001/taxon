import React, { useState, useEffect, useRef } from 'react';
import { Panel } from './Panel';
import { Icon, type IconName } from '../common/Icon';
import type { Media, EntityNode } from '../../types';
import { useSearchAutoScroll } from '../../hooks';

// --- EntitiesPanel ---
interface EntitiesPanelProps {
  title: string;
  icon: IconName;
  count?: number;
  entityTree: EntityNode[];
  directMatches: Set<string>;
  indirectMatches: Set<string>;
  uncertainMatchIds?: Set<string>;
  misinterpretMatchIds?: Set<string>;
  mediaMap: Map<string, Media[]>;
  onEntityClick: (id: string) => void;
  t: (key: string) => string;
  expandedNodes: Set<string>;
  setExpandedNodes: React.Dispatch<React.SetStateAction<Set<string>>>;
}
export const EntitiesPanel: React.FC<EntitiesPanelProps> = ({ title, icon, count, entityTree, directMatches, indirectMatches, uncertainMatchIds, misinterpretMatchIds, mediaMap, onEntityClick, t, expandedNodes, setExpandedNodes }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<'list' | 'grid'>(() => {
    return (localStorage.getItem('entitiesViewMode') as 'list' | 'grid') || 'grid';
  });
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [isFooterVisible, setIsFooterVisible] = useState(false);
  const [matchingIds, setMatchingIds] = useState<Set<string> | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [matchCount, setMatchCount] = useState(0);

  const showFooter = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    setIsFooterVisible(true);
  };

  const hideFooter = () => {
    // Delay hiding to allow the cursor to move between the content and the footer
    hideTimeoutRef.current = setTimeout(() => {
      setIsFooterVisible(false);
    }, 300);
  };

  useEffect(() => {
    // Clean up the timeout when the component unmounts
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('entitiesViewMode', view);
  }, [view]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!searchTerm) {
      setMatchingIds(null);
      // Only clear expansion if there was a search term before.
      // This prevents clearing on initial render or when entities change.
      if (matchingIds !== null) {
        setExpandedNodes(prev => prev.size > 0 ? new Set() : prev);
      }
      return;
    }

    const newMatching = new Set<string>();
    const newExpanded = new Set<string>();
    const lowerCaseSearchTerm = searchTerm.toLowerCase();

    const findMatches = (nodes: EntityNode[], parents: string[]): boolean => {
      let subtreeHasMatch = false;
      for (const node of nodes) {
        const selfMatches = node.name.toLowerCase().includes(lowerCaseSearchTerm);
        let childrenMatch = false;
        if (node.isGroup) {
          parents.push(node.id);
          childrenMatch = findMatches(node.children, parents);
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

    findMatches(entityTree, []);
    setMatchingIds(prev => {
      if (prev && prev.size === newMatching.size && [...prev].every(id => newMatching.has(id))) return prev;
      return newMatching;
    });
    setExpandedNodes(prev => {
      if (prev.size === newExpanded.size && [...prev].every(id => newExpanded.has(id))) return prev;
      return newExpanded;
    });
  }, [searchTerm, entityTree, setExpandedNodes]);

  // Reset match index when search changes
  useEffect(() => {
    setCurrentMatchIndex(0);
  }, [searchTerm, matchingIds]);

  useSearchAutoScroll(containerRef, searchTerm, matchingIds, currentMatchIndex, setCurrentMatchIndex, setMatchCount);

  const handleToggleNode = (id: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const countEntities = (nodes: EntityNode[]): number => {
    let entityCount = 0;
    for (const node of nodes) entityCount += node.isGroup ? countEntities(node.children) : 1;
    return entityCount;
  };

  const effectiveView = isMobile ? 'list' : view;

  const viewControls = (
    <div
      className={`hidden md:block transition-opacity duration-300 ${isFooterVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
    >
      <div className="view-controls flex items-center bg-header-bg rounded-md p-0.5">
        <button onClick={() => setView('list')} title={t('listView')} className={`p-1 rounded transition-colors duration-200 ${view === 'list' ? 'bg-accent text-white' : 'hover:bg-hover-bg'} cursor-pointer`}><Icon name="List" size={16} /></button>
        <button onClick={() => setView('grid')} title={t('gridView')} className={`p-1 rounded transition-colors duration-200 ${view === 'grid' ? 'bg-accent text-white' : 'hover:bg-hover-bg'} cursor-pointer`}><Icon name="LayoutGrid" size={16} /></button>
      </div>
    </div>
  );

  return (
    <Panel
      title={title}
      icon={icon}
      count={count ?? countEntities(entityTree)}
      onSearch={setSearchTerm}
      footer={viewControls}
      currentMatchIndex={currentMatchIndex}
      matchCount={matchCount}
      onPrevMatch={() => setCurrentMatchIndex(prev => prev - 1)}
      onNextMatch={() => setCurrentMatchIndex(prev => prev + 1)}
      onMouseEnter={showFooter}
      onMouseLeave={hideFooter}
    >
      <div
        ref={containerRef}
        className={`panel-content-inner p-3 ${effectiveView === 'grid' ? 'grid gap-4' : 'flex flex-col space-y-0.5'}`}
        style={effectiveView === 'grid' ? { gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' } : {}}
      >
        {entityTree.map(node => (
          <RenderEntityNode
            key={node.id}
            node={node}
            mediaMap={mediaMap}
            onEntityClick={onEntityClick}
            view={effectiveView}
            t={t}
            expandedNodes={expandedNodes}
            onToggleNode={handleToggleNode}
            matchingIds={matchingIds}
            directMatches={directMatches}
            indirectMatches={indirectMatches}
            uncertainMatchIds={uncertainMatchIds}
            misinterpretedMatchIds={misinterpretMatchIds}
          />
        ))}
      </div>
    </Panel>
  );
};

interface RenderEntityNodeProps {
  node: EntityNode;
  mediaMap: Map<string, Media[]>;
  onEntityClick: (id: string) => void;
  view: 'list' | 'grid';
  t: (key: string) => string;
  expandedNodes: Set<string>;
  onToggleNode: (id: string) => void;
  matchingIds: Set<string> | null;
  directMatches: Set<string>;
  indirectMatches: Set<string>;
  uncertainMatchIds?: Set<string>;
  misinterpretedMatchIds?: Set<string>;
}

const RenderEntityNode: React.FC<RenderEntityNodeProps> = (props) => {
  if (props.node.isGroup) {
    return <EntityGroupNode {...props} />;
  }
  return <EntityLeafNode {...props} />;
};

const EntityGroupNode: React.FC<RenderEntityNodeProps> = ({ node, mediaMap, onEntityClick, view, t, expandedNodes, onToggleNode, matchingIds, directMatches, indirectMatches, uncertainMatchIds, misinterpretedMatchIds }) => {
  const isSearching = matchingIds !== null;
  const isSearchMatch = isSearching && matchingIds.has(node.id);
  const isSearchDimmed = isSearching && !isSearchMatch;

  // Dim if it's an indirect match in the "Remaining" panel, or if it's an indirectly discarded group.
  const isFilterDimmed = !isSearching && (
    (indirectMatches.has(node.id) && !directMatches.has(node.id)) || (node as any).isDimmed
  );

  const isList = view === 'list';
  const isExpanded = expandedNodes.has(node.id);
  const media = mediaMap.get(node.id);
  const hasMedia = media && media.length > 0;
  const thumbUrl = hasMedia ? media[0].url : '';

  const isMisinterpreted = misinterpretedMatchIds?.has(node.id);
  const isUncertain = uncertainMatchIds?.has(node.id);

  return (
    <div className={`entity-group transition-opacity duration-200 ${isList ? '' : 'col-span-full'}`}>
      <div data-search-match={isSearchMatch ? "true" : undefined} className={`flex items-center gap-2 p-1.5 rounded-xl transition-all duration-300 ${isSearchDimmed ? 'opacity-30' : ''} ${isSearchMatch ? 'bg-accent/20 shadow-inner' : ''} ${isFilterDimmed ? 'opacity-50' : ''} hover:bg-hover-bg/80 hover:shadow-md hover:backdrop-blur-sm data-[search-active=true]:ring-2 data-[search-active=true]:ring-accent`}>
        <div className="w-6 h-6 shrink-0 flex items-center justify-center">
          {node.children.length > 0 && (
            <div onClick={() => onToggleNode(node.id)} className="p-1 cursor-pointer rounded hover:bg-black/10 dark:hover:bg-white/10">
              <Icon name="ChevronRight" className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            </div>
          )}
        </div>
        <div onClick={() => onEntityClick(node.id)} className="flex items-center gap-2 grow cursor-pointer min-w-0">
          {hasMedia ? (
            <img src={thumbUrl} alt={node.name} loading="lazy" className="w-10 h-10 object-cover rounded-lg shadow-sm shrink-0" />
          ) : (
            <div className="w-10 h-10 bg-header-bg/80 rounded-lg shadow-sm shrink-0 object-cover flex items-center justify-center text-gray-400">
              <Icon name="ImageOff" size="20" />
            </div>
          )}
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={`text-md truncate ${isList ? 'font-medium' : ''}`}>{node.name}</span>
            {isMisinterpreted && (
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-yellow-500/10 text-yellow-500 shrink-0" title={t('badgeMisinterpreted' as any) || 'Misinterpreted match'}>
                <Icon name="TriangleAlert" size={12} />
              </span>
            )}
            {isUncertain && (
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-500/10 text-gray-500 shrink-0 border border-gray-500/20" title={t('badgeUncertain' as any) || 'Uncertain match'}>
                <span className="font-bold text-[12px] leading-none">?</span>
              </span>
            )}
          </div>
        </div>
      </div>
      {isExpanded && (
        <div className={`${isList ? 'pl-8' : 'pl-16 grid gap-4 col-span-full'}`}
          style={isList ? {} : { gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
          {node.children.map(child => {
            const childProps = { node: child, mediaMap, onEntityClick, view, t, expandedNodes, onToggleNode, matchingIds, directMatches, indirectMatches, uncertainMatchIds, misinterpretedMatchIds };
            if (view === 'grid' && child.isGroup) {
              // In grid mode, wrap child groups to apply a smaller padding via negative margin.
              // The wrapper becomes the grid item, taking over the col-span-full responsibility.
              return (
                <div key={child.id} className="-ml-8 col-span-full">
                  <RenderEntityNode {...childProps} />
                </div>
              );
            }
            // Render leaves in grid mode, and all nodes in list mode, as before.
            return <RenderEntityNode key={child.id} {...childProps} />;
          })}
        </div>
      )}
    </div>
  );
};

const EntityLeafNode = React.memo<RenderEntityNodeProps>(({ node, mediaMap, onEntityClick, view, t, expandedNodes, onToggleNode, matchingIds, directMatches, indirectMatches, uncertainMatchIds, misinterpretedMatchIds }) => {
  const isSearching = matchingIds !== null;
  const isSearchMatch = isSearching && matchingIds.has(node.id);
  const isSearchDimmed = isSearching && !isSearchMatch;

  const isFilterDimmed = !isSearching && (
    (indirectMatches.has(node.id) && !directMatches.has(node.id)) || (node as any).isDimmed
  );

  const media = mediaMap.get(node.id);
  const hasMedia = media && media.length > 0;
  const thumbUrl = hasMedia ? media[0].url : '';

  const isList = view === 'list';
  const imageClasses = `bg-header-bg/80 shadow-sm rounded-lg shrink-0 object-cover ${isList ? 'w-10 h-10' : 'w-full aspect-square'}`;

  const isMisinterpreted = misinterpretedMatchIds?.has(node.id);
  const isUncertain = uncertainMatchIds?.has(node.id);

  return (
    <div
      key={node.id}
      onClick={() => onEntityClick(node.id)}
      data-search-match={isSearchMatch ? "true" : undefined}
      className={`entity-item flex gap-2 p-1.5 rounded-xl cursor-pointer hover:bg-hover-bg/80 hover:shadow-md hover:backdrop-blur-sm transition-all duration-300 ${isList ? 'items-center ml-8' : 'flex-col items-center text-center'} ${isSearchDimmed ? 'opacity-30' : ''} ${isSearchMatch ? 'bg-accent/20 shadow-inner' : ''} ${isFilterDimmed ? 'opacity-50' : ''} data-[search-active=true]:ring-2 data-[search-active=true]:ring-accent`}
    >
      {hasMedia ? (
        <img src={thumbUrl} alt={node.name} loading="lazy" className={imageClasses} />
      ) : (
        <div className={`${imageClasses} flex items-center justify-center text-gray-400`}>
          <Icon name="ImageOff" size={isList ? 20 : 32} />
        </div>
      )}
      <div className={`flex items-center gap-1.5 min-w-0 ${isList ? '' : 'justify-center w-full mt-1'}`}>
        <span className="text-md truncate leading-tight">{node.name}</span>
        {isMisinterpreted && (
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-yellow-500/10 text-yellow-500 shrink-0" title={t('badgeMisinterpreted' as any) || 'Misinterpreted match'}>
            <Icon name="TriangleAlert" size={12} />
          </span>
        )}
        {isUncertain && (
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-500/10 text-gray-500 shrink-0 border border-gray-500/20" title={t('badgeUncertain' as any) || 'Uncertain match'}>
            <span className="font-bold text-[12px] leading-none">?</span>
          </span>
        )}
      </div>
    </div>
  );
}, (prev, next) => {
  if (prev.node !== next.node) return false;
  if (prev.view !== next.view) return false;

  const wasSearching = prev.matchingIds !== null;
  const isSearching = next.matchingIds !== null;
  if (wasSearching !== isSearching) return false;

  if (isSearching) {
    const wasMatch = prev.matchingIds!.has(prev.node.id);
    const isMatch = next.matchingIds!.has(next.node.id);
    if (wasMatch !== isMatch) return false;
  }

  const wasIndirect = prev.indirectMatches.has(prev.node.id);
  const isIndirect = next.indirectMatches.has(next.node.id);
  if (wasIndirect !== isIndirect) return false;

  const wasDirect = prev.directMatches.has(prev.node.id);
  const isDirect = next.directMatches.has(next.node.id);
  if (wasDirect !== isDirect) return false;

  const wasDimmed = (prev.node as any).isDimmed;
  const isDimmed = (next.node as any).isDimmed;
  if (wasDimmed !== isDimmed) return false;

  const wasUncertain = prev.uncertainMatchIds?.has(prev.node.id);
  const isUncertain = next.uncertainMatchIds?.has(next.node.id);
  if (wasUncertain !== isUncertain) return false;

  const wasMisinterpreted = prev.misinterpretedMatchIds?.has(prev.node.id);
  const isMisinterpreted = next.misinterpretedMatchIds?.has(next.node.id);
  if (wasMisinterpreted !== isMisinterpreted) return false;

  return true;
});
