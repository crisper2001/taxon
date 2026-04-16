import React from 'react';
import { Icon } from '../common/Icon';
import type { KeyData, ChosenFeature, FeatureNode } from '../../types';
import { getUnitSymbol } from '../../utils/FeatureUtils';

interface RenderFeatureNodeProps {
  node: FeatureNode;
  keyData: KeyData;
  chosenFeatures: Map<string, ChosenFeature>;
  onFeatureChange: (id: string, value: string | boolean | number, isNumeric: boolean, parentId?: string) => void;
  onImageClick: (id: string) => void;
  t: (key: string) => string;
  expandedNodes: Set<string>;
  onToggleNode: (id: string) => void;
  matchingIds: Set<string> | null;
  parentFeature?: FeatureNode;
  depth?: number;
}

export const RenderFeatureNode: React.FC<RenderFeatureNodeProps> = (props) => {
  if (props.node.isState || props.node.type === 'numeric') {
    return <FeatureLeafNode {...props} />;
  }
  return <FeatureGroupNode {...props} />;
};

const FeatureGroupNode: React.FC<RenderFeatureNodeProps> = ({
  node, keyData, chosenFeatures, onFeatureChange, onImageClick, t, expandedNodes, onToggleNode, matchingIds, depth = 0
}) => {
  const isSearching = matchingIds !== null;
  const isMatch = isSearching && matchingIds.has(node.id);
  const isDimmed = isSearching && !isMatch;

  const isExpanded = expandedNodes.has(node.id);
  const media = keyData.featureMedia.get(node.id);
  const hasMedia = media && media.length > 0;
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className={`feature-node relative transition-opacity duration-200`}>
      <div data-search-match={isMatch ? "true" : undefined} onClick={() => hasChildren ? onToggleNode(node.id) : onImageClick(node.id)} className={`feature-node-header group/item relative flex items-center gap-2 p-1.5 rounded-xl transition-all duration-300 border border-transparent hover:bg-hover-bg/80 hover:shadow-md hover:backdrop-blur-sm cursor-pointer ${isDimmed ? 'opacity-30' : ''} ${isMatch ? 'bg-accent/20 shadow-inner' : ''} data-[search-active=true]:ring-2 data-[search-active=true]:ring-accent`} style={{ paddingLeft: `calc(${1.5 + depth * 1.5}rem + 0.5rem)` }}>
        {hasChildren && (
          <button onClick={(e) => { e.stopPropagation(); onToggleNode(node.id); }} className={`w-7 h-7 flex items-center justify-center rounded-md cursor-pointer absolute z-20 transition-colors text-gray-500 hover:bg-black/10 dark:hover:bg-white/10 top-1/2 -translate-y-1/2`} style={{ left: `calc(${depth * 1.5}rem)` }}>
            <Icon name="ChevronRight" size={16} className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
          </button>
        )}
        {hasMedia ? (
          <img src={media![0].url} alt={node.name} loading="lazy" onClick={(e) => { e.stopPropagation(); onImageClick(node.id); }} className={`w-10 h-10 object-cover rounded-lg shadow-sm cursor-pointer shrink-0 transition-transform duration-200 ${hasChildren ? 'hover:scale-105' : 'group-hover/item:scale-105'}`} />
        ) : (
          <div className={`bg-header-bg/80 rounded-lg shadow-sm shrink-0 flex items-center justify-center text-gray-400 w-10 h-10 cursor-pointer transition-transform duration-200 ${hasChildren ? 'hover:scale-105' : 'group-hover/item:scale-105'}`} onClick={(e) => { e.stopPropagation(); onImageClick(node.id); }}>
            <Icon name={node.type === 'state' ? "Tag" : "Hash"} size={20} className="shrink-0 opacity-60" />
          </div>
        )}
        <span className="truncate flex-1 text-md">{node.name}</span>
      </div>
      {isExpanded && (
        <div className="feature-node-children flex flex-col">
          {node.children.map(child => <RenderFeatureNode key={child.id} {...{ node: child, keyData, chosenFeatures, onFeatureChange, onImageClick, t, expandedNodes, onToggleNode, matchingIds, parentFeature: node, depth: depth + 1 }} />)}
        </div>
      )}
    </div>
  );
};

const FeatureLeafNode = React.memo<RenderFeatureNodeProps>(({
  node, keyData, chosenFeatures, onFeatureChange, onImageClick, t, expandedNodes, onToggleNode, matchingIds, parentFeature, depth = 0
}) => {
  const isSearching = matchingIds !== null;
  const isMatch = isSearching && matchingIds.has(node.id);
  const isDimmed = isSearching && !isMatch;
  const isSelected = chosenFeatures.has(node.id);
  const media = keyData.featureMedia.get(node.id);
  const hasMedia = media && media.length > 0;
  const isSingleSelection = parentFeature ? keyData.allFeatures.get(parentFeature.id)?.matchType === 'SINGLE' : false;
  const isState = !!node.isState;
  const Wrapper = isState ? 'label' : 'div';

  return (
    <Wrapper data-search-match={isMatch ? "true" : undefined} onClick={!isState ? () => onImageClick(node.id) : undefined} className={`feature-item group/item relative flex items-center gap-2 p-1.5 rounded-xl transition-all duration-300 hover:bg-hover-bg/80 hover:shadow-md hover:backdrop-blur-sm cursor-pointer ${isSelected && !isState ? 'bg-accent/20 shadow-inner ring-2 ring-accent' : 'border border-transparent'} ${isDimmed ? 'opacity-30' : ''} ${isMatch ? 'bg-accent/20 shadow-inner' : ''} data-[search-active=true]:ring-2 data-[search-active=true]:ring-accent`} style={{ paddingLeft: `calc(${1.5 + depth * 1.5}rem + 0.5rem)` }}>
      {hasMedia ? (
        <img src={media![0].url} alt={node.name} loading="lazy" onClick={(e) => { if (isState) e.preventDefault(); e.stopPropagation(); onImageClick(node.id); }} className={`object-cover rounded-lg shadow-sm cursor-pointer shrink-0 transition-transform duration-200 w-10 h-10 ${isState ? 'hover:scale-105' : 'group-hover/item:scale-105'}`} />
      ) : (
        <div className={`bg-header-bg/80 rounded-lg shadow-sm shrink-0 flex items-center justify-center text-gray-400 cursor-pointer transition-transform duration-200 w-10 h-10 ${isState ? 'hover:scale-105' : 'group-hover/item:scale-105'}`} onClick={(e) => { if (isState) e.preventDefault(); e.stopPropagation(); onImageClick(node.id); }}>
          <Icon name={isState ? "CircleCheck" : "Hash"} size={20} className={`shrink-0 ${isSelected && !isState ? 'opacity-100 text-accent' : 'opacity-60'}`} />
        </div>
      )}
      {isState ? (
        <div className="flex items-center gap-2 flex-1 min-w-0 py-2">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onFeatureChange(node.id, !isSelected, false, parentFeature?.id)}
            className={`form-checkbox h-4 w-4 shrink-0 ${isSingleSelection ? 'rounded-full' : 'rounded'} text-accent focus:ring-accent`}
          />
          <span className="truncate flex-1 text-md">{node.name}</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
          <label className="truncate flex-1 text-md cursor-pointer">{node.name}</label>
          <div className="numeric-input-group flex items-center gap-2 pr-2 shrink-0 cursor-default" onClick={(e) => e.stopPropagation()}>
            <input
              type="number"
              value={isSelected ? chosenFeatures.get(node.id)?.value || '' : ''}
              onChange={(e) => onFeatureChange(node.id, e.target.value, true)}
              onKeyDown={(e) => { if (e.key.length === 1 && !/^[0-9.,]$/.test(e.key)) e.preventDefault(); }}
              placeholder={t('value')}
              className="w-20 p-1 border border-white/20 dark:border-white/10 rounded-lg bg-bg/80 backdrop-blur-sm shadow-inner focus:ring-2 focus:ring-accent/50 focus:outline-none transition-all text-sm"
            />
            <span className="text-sm text-gray-500">{getUnitSymbol(keyData.allFeatures.get(node.id))}</span>
          </div>
        </div>
      )}
    </Wrapper>
  );
}, (prev, next) => {
  if (prev.node !== next.node) return false;

  const wasSelected = prev.chosenFeatures.has(prev.node.id);
  const isSelected = next.chosenFeatures.has(next.node.id);
  if (wasSelected !== isSelected) return false;

  if (prev.node.type === 'numeric' && wasSelected) {
    if (prev.chosenFeatures.get(prev.node.id)?.value !== next.chosenFeatures.get(next.node.id)?.value) {
      return false;
    }
  }

  const wasSearching = prev.matchingIds !== null;
  const isSearching = next.matchingIds !== null;
  if (wasSearching !== isSearching) return false;

  if (isSearching) {
    const wasMatch = prev.matchingIds!.has(prev.node.id);
    const isMatch = next.matchingIds!.has(next.node.id);
    if (wasMatch !== isMatch) return false;
  }

  return true;
});
