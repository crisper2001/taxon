import React from 'react';
import { Icon } from '../Icon';
import type { KeyData, ChosenFeature, FeatureNode } from '../../types';
import { getUnitSymbol } from '../../utils/FeatureUtils';

interface RenderFeatureNodeProps {
  node: FeatureNode;
  keyData: KeyData;
  chosenFeatures: Map<string, ChosenFeature>;
  onFeatureChange: (id: string, value: string | boolean | number, isNumeric: boolean) => void;
  onImageClick: (id: string) => void;
  t: (key: string) => string;
  expandedNodes: Set<string>;
  onToggleNode: (id: string) => void;
  matchingIds: Set<string> | null;
}

export const RenderFeatureNode: React.FC<RenderFeatureNodeProps> = (props) => {
  if (props.node.isState || props.node.type === 'numeric') {
    return <FeatureLeafNode {...props} />;
  }
  return <FeatureGroupNode {...props} />;
};

const FeatureGroupNode: React.FC<RenderFeatureNodeProps> = ({
  node, keyData, chosenFeatures, onFeatureChange, onImageClick, t, expandedNodes, onToggleNode, matchingIds
}) => {
  const isSearching = matchingIds !== null;
  const isMatch = isSearching && matchingIds.has(node.id);
  const isDimmed = isSearching && !isMatch;

  const isExpanded = expandedNodes.has(node.id);
  const media = keyData.featureMedia.get(node.id);
  const hasMedia = media && media.length > 0;

  return (
    <div className={`feature-node relative transition-opacity duration-200`}>
      <div data-search-match={isMatch ? "true" : undefined} onClick={() => onToggleNode(node.id)} className={`feature-node-header group flex items-center gap-3 cursor-pointer p-1.5 select-none hover:bg-hover-bg/80 rounded-xl transition-all duration-300 hover:shadow-sm ${isDimmed ? 'opacity-30' : ''} ${isMatch ? 'bg-accent/20 shadow-inner' : ''} data-[search-active=true]:ring-2 data-[search-active=true]:ring-accent`}>
        <Icon name="ChevronRight" className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        {hasMedia && <img src={media![0].url} alt={node.name} loading="lazy" onClick={(e) => { e.stopPropagation(); onImageClick(node.id); }} className="w-24 h-24 object-cover rounded-lg shadow-sm cursor-pointer shrink-0" />}
        <span className="grow">{node.name}</span>
        <button onClick={(e) => { e.stopPropagation(); onImageClick(node.id); }} className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-1 text-gray-400 hover:text-accent rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-all shrink-0 cursor-pointer" title={t('kbMetadata')}>
          <Icon name="Info" size={16} />
        </button>
      </div>
      {isExpanded && (
        <div className="feature-node-children pl-8">
          {node.children.map(child => <RenderFeatureNode key={child.id} {...{ node: child, keyData, chosenFeatures, onFeatureChange, onImageClick, t, expandedNodes, onToggleNode, matchingIds }} />)}
        </div>
      )}
    </div>
  );
};

const FeatureLeafNode = React.memo<RenderFeatureNodeProps>(({
  node, keyData, chosenFeatures, onFeatureChange, onImageClick, t, expandedNodes, onToggleNode, matchingIds
}) => {
  const isSearching = matchingIds !== null;
  const isMatch = isSearching && matchingIds.has(node.id);
  const isDimmed = isSearching && !isMatch;
  const isSelected = chosenFeatures.has(node.id);
  const media = keyData.featureMedia.get(node.id);
  const hasMedia = media && media.length > 0;

  return (
    <div data-search-match={isMatch ? "true" : undefined} className={`feature-item group relative pl-8 py-1.5 pr-2 flex items-center gap-3 hover:bg-hover-bg/80 rounded-xl transition-all duration-300 hover:shadow-sm ${isDimmed ? 'opacity-30' : ''} ${isMatch ? 'bg-accent/20 shadow-inner' : ''} data-[search-active=true]:ring-2 data-[search-active=true]:ring-accent`}>
      {hasMedia && <img src={media![0].url} alt={node.name} loading="lazy" onClick={() => onImageClick(node.id)} className="w-24 h-24 object-cover rounded-lg shadow-sm cursor-pointer shrink-0" />}
      {node.type === 'state' ? (
        <label className="flex items-center gap-2 cursor-pointer grow">
          <input type="checkbox" checked={isSelected} onChange={() => onFeatureChange(node.id, !isSelected, false)} className="form-checkbox h-4 w-4 rounded text-accent focus:ring-accent" />
          <span>{node.name}</span>
        </label>
      ) : (
        <>
          <label className="grow">{node.name}</label>
          <div className="numeric-input-group flex items-center gap-2 pr-2">
            <input
              type="number"
              value={isSelected ? chosenFeatures.get(node.id)?.value || '' : ''}
              onChange={(e) => onFeatureChange(node.id, e.target.value, true)}
              onKeyDown={(e) => { if (e.key.length === 1 && !/^[0-9.,]$/.test(e.key)) e.preventDefault(); }}
              placeholder={t('value')}
              className="w-20 p-1 border border-white/20 dark:border-white/10 rounded-lg bg-bg/80 backdrop-blur-sm shadow-inner focus:ring-2 focus:ring-accent/50 focus:outline-none transition-all"
            />
            <span className="text-sm text-gray-500">{getUnitSymbol(keyData.allFeatures.get(node.id))}</span>
          </div>
        </>
      )}
      <button onClick={(e) => { e.stopPropagation(); onImageClick(node.id); }} className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-1 text-gray-400 hover:text-accent rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-all shrink-0 cursor-pointer" title={t('kbMetadata')}>
        <Icon name="Info" size={16} />
      </button>
    </div>
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