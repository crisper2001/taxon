import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Panel } from './Panel';
import { Icon, type IconName } from '../Icon';
import type { Entity, Media, EntityNode } from '../../types';

// --- EntitiesPanel ---
interface EntitiesPanelProps {
  title: string;
  icon: IconName;
  count?: number;
  entityTree: EntityNode[];
  directMatches: Set<string>;
  indirectMatches: Set<string>;
  mediaMap: Map<string, Media[]>;
  onEntityClick: (id: string) => void;
  t: (key: string) => string;
  expandedNodes: Set<string>;
  setExpandedNodes: (nodes: Set<string>) => void;
}
export const EntitiesPanel: React.FC<EntitiesPanelProps> = ({ title, icon, count, entityTree, directMatches, indirectMatches, mediaMap, onEntityClick, t, expandedNodes, setExpandedNodes }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [isFooterVisible, setIsFooterVisible] = useState(false);
  const [matchingIds, setMatchingIds] = useState<Set<string> | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout>();

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
    if (!searchTerm) {
      setMatchingIds(null);
      // Only clear expansion if there was a search term before.
      // This prevents clearing on initial render or when entities change.
      if (matchingIds !== null) setExpandedNodes(new Set());
      return;
    }

    const newMatching = new Set<string>();
    const newExpanded = new Set<string>();
    const lowerCaseSearchTerm = searchTerm.toLowerCase();

    const findMatches = (nodes: EntityNode[], parents: string[]): boolean => {
      let subtreeHasMatch = false;
      for (const node of nodes) {
        const selfMatches = node.name.toLowerCase().includes(lowerCaseSearchTerm);
        const childrenMatch = node.isGroup ? findMatches(node.children, selfMatches ? [...parents, node.id] : parents) : false;

        if (selfMatches) newMatching.add(node.id);
        if (selfMatches || childrenMatch) {
          subtreeHasMatch = true;
          parents.forEach(p => newExpanded.add(p));
        }
      }
      return subtreeHasMatch;
    };

    findMatches(entityTree, []);
    setMatchingIds(newMatching);
    setExpandedNodes(newExpanded);
  }, [searchTerm, entityTree, setExpandedNodes]);

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
    return count;
  };

  const viewControls = (
    <div
      onMouseEnter={showFooter}
      onMouseLeave={hideFooter}
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
    >
      <div
        onMouseEnter={showFooter}
        onMouseLeave={hideFooter}
        className={`panel-content-inner ${view === 'grid' ? 'grid gap-2' : 'flex flex-col'}`}
        style={view === 'grid' ? { gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' } : {}}
      >
        {entityTree.map(node => (
          <RenderEntityNode
            key={node.id}
            node={node}
            mediaMap={mediaMap}
            onEntityClick={onEntityClick}
            view={view}
            t={t}
            expandedNodes={expandedNodes}
            onToggleNode={handleToggleNode}
            matchingIds={matchingIds}
            directMatches={directMatches}
            indirectMatches={indirectMatches}
          />
        ))}
      </div>
    </Panel>
  );
};

const RenderEntityNode: React.FC<{
  node: EntityNode,
  mediaMap: Map<string, Media[]>,
  onEntityClick: (id: string) => void,
  view: 'list' | 'grid',
  t: (key: string) => string,
  expandedNodes: Set<string>,
  onToggleNode: (id: string) => void,
  matchingIds: Set<string> | null,
  directMatches: Set<string>,
  indirectMatches: Set<string>,
}> = ({ node, mediaMap, onEntityClick, view, t, expandedNodes, onToggleNode, matchingIds, directMatches, indirectMatches }) => {
  const isSearching = matchingIds !== null;
  const isSearchMatch = isSearching && matchingIds.has(node.id);
  const isSearchDimmed = isSearching && !isSearchMatch;

  // Dim if it's an indirect match in the "Remaining" panel, or if it's an indirectly discarded group.
  const isFilterDimmed = !isSearching && (
    (indirectMatches.has(node.id) && !directMatches.has(node.id)) || (node as any).isDimmed
  );

  if (node.isGroup) {
    const isList = view === 'list';
    const isExpanded = expandedNodes.has(node.id);
    const media = mediaMap.get(node.id);
    const hasMedia = media && media.length > 0;
    const thumbUrl = hasMedia ? media[0].url : '';
    return (
      <div className={`entity-group transition-opacity duration-200 ${isList ? '' : 'col-span-full'} ${isSearchDimmed ? 'opacity-30' : ''}`}>
        <div className={`flex items-center gap-2 p-1.5 rounded transition-colors duration-200 ${isSearchMatch ? 'bg-accent/20' : ''} ${isFilterDimmed ? 'opacity-50' : ''} hover:bg-hover-bg`}>          
          <div className="w-6 h-6 shrink-0 flex items-center justify-center">
            {node.children.length > 0 && (
              <div onClick={() => onToggleNode(node.id)} className="p-1 cursor-pointer rounded hover:bg-black/10 dark:hover:bg-white/10">
                <Icon name="ChevronRight" className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
              </div>
            )}
          </div>
          <div onClick={() => onEntityClick(node.id)} className="flex items-center gap-2 grow cursor-pointer min-w-0">
            {hasMedia ? (
              <img src={thumbUrl} alt={node.name} className="w-32 h-32 object-cover rounded shrink-0" />
            ) : (
              <div className="w-32 h-32 bg-header-bg rounded shrink-0 object-cover flex items-center justify-center text-gray-400">
                <Icon name="ImageOff" size="32" />
              </div>
            )}
            <span className="text-md">{node.name}</span>
          </div>
        </div>
        {isExpanded && (
          <div className={`${isList ? 'pl-8' : 'pl-16 grid gap-2 col-span-full'}`}
            style={isList ? {} : { gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}>
            {node.children.map(child => {
              const childProps = { node: child, mediaMap, onEntityClick, view, t, expandedNodes, onToggleNode, matchingIds, directMatches, indirectMatches };
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
  }

  // It's a regular entity
  const media = mediaMap.get(node.id);
  const hasMedia = media && media.length > 0;
  const thumbUrl = hasMedia ? media[0].url : '';

  const isList = view === 'list';
  const imageClasses = `bg-header-bg rounded shrink-0 object-cover ${isList ? 'w-32 h-32' : 'w-32 aspect-square'}`;

  return (
    <div
      key={node.id}
      onClick={() => onEntityClick(node.id)}
      className={`entity-item flex gap-2 p-1.5 rounded cursor-pointer hover:bg-hover-bg transition-all duration-200 ${isList ? 'items-center ml-8' : 'flex-col items-center text-center'} ${isSearchDimmed ? 'opacity-30' : ''} ${isSearchMatch ? 'bg-accent/20' : ''} ${isFilterDimmed ? 'opacity-50' : ''}`}
    >
      {hasMedia ? (
        <img src={thumbUrl} alt={node.name} className={imageClasses} />
      ) : (
        <div className={`${imageClasses} flex items-center justify-center text-gray-400`}>
          <Icon name="ImageOff" size="32" />
        </div>
      )}
      <span className="text-md">{node.name}</span>
    </div>
  );
};
