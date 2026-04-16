import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  misinterpretedMatchIds?: Set<string>;
  mediaMap: Map<string, Media[]>;
  onEntityClick: (id: string) => void;
  t: (key: string) => string;
  expandedNodes: Set<string>;
  setExpandedNodes: React.Dispatch<React.SetStateAction<Set<string>>>;
}
export const EntitiesPanel: React.FC<EntitiesPanelProps> = React.memo(({ title, icon, count, entityTree, directMatches, indirectMatches, uncertainMatchIds, misinterpretedMatchIds, mediaMap, onEntityClick, t, expandedNodes, setExpandedNodes }) => {
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
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

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

  const folderPath = useMemo(() => {
    if (!currentFolderId) return [];
    const path: EntityNode[] = [];
    const findPath = (nodes: EntityNode[], target: string, currentPath: EntityNode[]): boolean => {
      for (const node of nodes) {
        const newPath = [...currentPath, node];
        if (node.id === target) {
          path.push(...newPath);
          return true;
        }
        if (node.children && findPath(node.children, target, newPath)) return true;
      }
      return false;
    };
    findPath(entityTree, currentFolderId, []);
    return path;
  }, [currentFolderId, entityTree]);

  useEffect(() => {
    if (currentFolderId && folderPath.length === 0) {
      setCurrentFolderId(null);
    }
  }, [currentFolderId, folderPath]);

  const nodesToRender = useMemo(() => {
    if (effectiveView === 'list') return entityTree;
    if (matchingIds !== null) {
      const matches: EntityNode[] = [];
      const traverse = (nodes: EntityNode[]) => {
        for (const n of nodes) {
          if (matchingIds.has(n.id)) matches.push(n);
          if (n.children) traverse(n.children);
        }
      };
      traverse(entityTree);
      return matches;
    }
    const currentFolderNode = folderPath.length > 0 ? folderPath[folderPath.length - 1] : null;
    return currentFolderNode ? currentFolderNode.children : entityTree;
  }, [effectiveView, entityTree, matchingIds, folderPath]);

  const viewControls = (
    <div
      className={`hidden md:block transition-opacity duration-300 p-2 ${isFooterVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
    >
      <div className="view-controls flex items-center bg-header-bg rounded-md p-0.5 shadow-lg">
        <button onClick={() => setView('list')} title={t('listView')} className={`p-1.5 rounded transition-colors duration-200 ${view === 'list' ? 'bg-accent text-white' : 'hover:bg-hover-bg'} cursor-pointer`}><Icon name="List" size={16} /></button>
        <button onClick={() => setView('grid')} title={t('gridView')} className={`p-1.5 rounded transition-colors duration-200 ${view === 'grid' ? 'bg-accent text-white' : 'hover:bg-hover-bg'} cursor-pointer`}><Icon name="LayoutGrid" className="w-4 h-4" /></button>
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
        className={`panel-content-inner p-1 flex flex-col h-full`}
      >
        {effectiveView === 'grid' && currentFolderId && matchingIds === null && folderPath.length > 0 && (
          <div className="flex items-center gap-4 shrink-0 overflow-x-auto no-scrollbar animate-fade-in p-1 pl-2">
            <div className="flex items-center text-sm text-text opacity-90 whitespace-nowrap min-w-0">
              <button onClick={() => setCurrentFolderId(null)} className="hover:underline hover:text-accent focus:outline-none focus:ring-2 focus:ring-accent/50 rounded-sm cursor-pointer shrink-0 flex items-center justify-center">
                <Icon name="House" size={16} />
              </button>
              <Icon name="ChevronRight" size={16} className="mx-1 opacity-50 shrink-0" />
              {folderPath.map((node, i) => {
                const isLast = i === folderPath.length - 1;
                return (
                  <React.Fragment key={node.id}>
                    {isLast ? (
                      <span className="font-bold text-text truncate max-w-[150px]">{node.name}</span>
                    ) : (
                      <button onClick={() => setCurrentFolderId(node.id)} className="hover:underline hover:text-accent focus:outline-none focus:ring-2 focus:ring-accent/50 rounded-sm cursor-pointer truncate max-w-[120px]">
                        {node.name}
                      </button>
                    )}
                    {!isLast && <Icon name="ChevronRight" size={16} className="mx-1 opacity-50 shrink-0" />}
                  </React.Fragment>
                );
              })}
            </div>
            <button onClick={() => onEntityClick(currentFolderId)} className="ml-auto p-1.5 text-gray-400 hover:text-accent hover:bg-hover-bg rounded-full transition-colors cursor-pointer shrink-0 border border-transparent hover:border-border hover:shadow-sm" title={t('info' as any) || 'Info'}>
              <Icon name="Info" size={18} />
            </button>
          </div>
        )}
        <div key={effectiveView === 'grid' ? (currentFolderId || 'root') : 'list'} className={`animate-fade-in ${effectiveView === 'grid' ? 'grid gap-3 gap-y-2 content-start' : 'flex flex-col'}`} style={effectiveView === 'grid' ? { gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', willChange: 'auto' } : { willChange: 'auto' }}>
          {nodesToRender.map(node => (
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
              misinterpretedMatchIds={misinterpretedMatchIds}
              onNavigateInto={setCurrentFolderId}
            />
          ))}
        </div>
      </div>
    </Panel>
  );
});

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
  depth?: number;
  onNavigateInto?: (id: string) => void;
}

const RenderEntityNode: React.FC<RenderEntityNodeProps> = (props) => {
  if (props.node.isGroup) {
    return <EntityGroupNode {...props} />;
  }
  return <EntityLeafNode {...props} />;
};

const EntityGroupNode: React.FC<RenderEntityNodeProps> = ({ node, mediaMap, onEntityClick, view, t, expandedNodes, onToggleNode, matchingIds, directMatches, indirectMatches, uncertainMatchIds, misinterpretedMatchIds, depth = 0, onNavigateInto }) => {
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

  const hasChildren = node.children && node.children.length > 0;

  const imageClasses = `bg-header-bg/80 shadow-sm rounded-lg shrink-0 object-cover transition-transform duration-200 ${isList ? 'w-10 h-10 cursor-pointer hover:scale-105' : 'w-full aspect-square'}`;

  const handleRowClick = () => {
    if (isList) {
      if (hasChildren) onToggleNode(node.id);
    } else { // grid mode
      if (hasChildren && matchingIds === null) {
        onNavigateInto?.(node.id);
      } else {
        onEntityClick(node.id);
      }
    }
  };

  const handleIconClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEntityClick(node.id);
  };

  return (
    <div className={`entity-group transition-opacity duration-200 ${isList ? '' : 'h-full'}`}>
      <div data-search-match={isSearchMatch ? "true" : undefined} onClick={handleRowClick} className={`flex gap-2 p-1.5 rounded-xl transition-all duration-300 group/item border border-transparent relative ${isList ? 'items-center' : 'flex-col items-center text-center h-full'} ${isSearchDimmed ? 'opacity-30' : ''} ${isSearchMatch ? 'bg-accent/20 shadow-inner' : ''} ${isFilterDimmed ? 'opacity-50' : ''} ${!isList || hasChildren ? 'cursor-pointer hover:bg-hover-bg/80 hover:shadow-md hover:backdrop-blur-sm' : ''} data-[search-active=true]:ring-2 data-[search-active=true]:ring-accent`} style={isList ? { paddingLeft: `calc(${1.5 + depth * 1.5}rem + 0.5rem)` } : {}}>
        {isList && node.children && node.children.length > 0 && (
          <button onClick={(e) => { e.stopPropagation(); onToggleNode(node.id); }} className={`flex items-center justify-center rounded-md cursor-pointer absolute z-20 transition-colors w-7 h-7 text-gray-500 hover:bg-black/10 dark:hover:bg-white/10 top-1/2 -translate-y-1/2`} style={{ left: `calc(${depth * 1.5}rem)` }}>
            <Icon name="ChevronRight" size={isList ? 16 : 20} className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
          </button>
        )}
        {!isList && matchingIds === null && (
          <button onClick={handleIconClick} className={`w-8 h-8 flex items-center justify-center rounded-md cursor-pointer absolute z-20 transition-all opacity-0 group-hover/item:opacity-100 top-2 right-2 bg-panel-bg text-gray-500 hover:text-accent shadow-sm`} title={t('info' as any) || 'Info'}>
            <Icon name="Info" size={16} />
          </button>
        )}
        {hasMedia ? (
          <img src={thumbUrl} alt={node.name} loading="lazy" className={imageClasses} onClick={isList ? handleIconClick : undefined} />
        ) : (
          <div className={`${imageClasses} flex items-center justify-center text-gray-400`} onClick={isList ? handleIconClick : undefined}>
            <Icon name="Box" size={isList ? 20 : 32} className="opacity-60 shrink-0" />
          </div>
        )}
        <div className={`flex items-center gap-1.5 min-w-0 ${isList ? 'flex-1' : 'justify-center w-full mt-1'}`}>
          <span className={`truncate leading-tight text-md ${isList ? 'flex-1' : ''}`}>{node.name}</span>
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
      {isExpanded && isList && (
        <div className="flex flex-col">
          {node.children.map(child => {
            const childProps = { node: child, mediaMap, onEntityClick, view, t, expandedNodes, onToggleNode, matchingIds, directMatches, indirectMatches, uncertainMatchIds, misinterpretedMatchIds, depth: depth + 1, onNavigateInto };
            return <RenderEntityNode key={child.id} {...childProps} />;
          })}
        </div>
      )}
    </div>
  );
};

const EntityLeafNode = React.memo<RenderEntityNodeProps>(({ node, mediaMap, onEntityClick, view, t, expandedNodes, onToggleNode, matchingIds, directMatches, indirectMatches, uncertainMatchIds, misinterpretedMatchIds, depth = 0, onNavigateInto }) => {
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
  const imageClasses = `bg-header-bg/80 shadow-sm rounded-lg shrink-0 object-cover transition-transform duration-200 ${isList ? 'w-10 h-10 group-hover/item:scale-105' : 'w-full aspect-square'}`;

  const isMisinterpreted = misinterpretedMatchIds?.has(node.id);
  const isUncertain = uncertainMatchIds?.has(node.id);

  return (
    <div
      key={node.id}
      onClick={() => onEntityClick(node.id)}
      data-search-match={isSearchMatch ? "true" : undefined}
      className={`entity-item flex gap-2 p-1.5 rounded-xl cursor-pointer hover:bg-hover-bg/80 hover:shadow-md hover:backdrop-blur-sm transition-all duration-300 group/item border border-transparent relative ${isList ? 'items-center' : 'flex-col items-center text-center h-full'} ${isSearchDimmed ? 'opacity-30' : ''} ${isSearchMatch ? 'bg-accent/20 shadow-inner' : ''} ${isFilterDimmed ? 'opacity-50' : ''} data-[search-active=true]:ring-2 data-[search-active=true]:ring-accent`}
      style={isList ? { paddingLeft: `calc(${1.5 + depth * 1.5}rem + 0.5rem)` } : {}}
    >
      {hasMedia ? (
        <img src={thumbUrl} alt={node.name} loading="lazy" className={imageClasses} />
      ) : (
        <div className={`${imageClasses} flex items-center justify-center text-gray-400`}>
          <Icon name="Box" size={isList ? 20 : 32} className="opacity-60 shrink-0" />
        </div>
      )}
      <div className={`flex items-center gap-1.5 min-w-0 ${isList ? 'flex-1' : 'justify-center w-full mt-1'}`}>
        <span className={`truncate leading-tight text-md ${isList ? 'flex-1' : ''}`}>{node.name}</span>
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
