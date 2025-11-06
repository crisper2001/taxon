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

export const RenderFeatureNode: React.FC<RenderFeatureNodeProps> = ({
  node,
  keyData,
  chosenFeatures,
  onFeatureChange,
  onImageClick,
  t,
  expandedNodes,
  onToggleNode,
  matchingIds,
}) => {
  const isSearching = matchingIds !== null;
  const isMatch = isSearching && matchingIds.has(node.id);
  const isDimmed = isSearching && !isMatch;

  if (node.isState || node.type === 'numeric') {
    const isSelected = chosenFeatures.has(node.id);
    const media = keyData.featureMedia.get(node.id);
    const hasMedia = media && media.length > 0;

    return (
      <div className={`feature-item relative pl-4 py-1 flex items-center gap-3 hover:bg-hover-bg rounded transition-all duration-200 ${isDimmed ? 'opacity-30' : ''} ${isMatch ? 'bg-accent/20' : ''}`}>
        {hasMedia && <img src={media![0].url} alt={node.name} onClick={() => onImageClick(node.id)} className="w-24 h-24 object-cover rounded cursor-pointer shrink-0" />}
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
                placeholder={t('value')}
                className="w-20 p-1 border border-border rounded bg-panel-bg"
              />
              <span className="text-sm text-gray-500">{getUnitSymbol(keyData.allFeatures.get(node.id))}</span>
            </div>
          </>
        )}
      </div>
    );
  }

  const isExpanded = expandedNodes.has(node.id);
  return (
    <div className={`feature-node relative transition-opacity duration-200 ${isDimmed ? 'opacity-30' : ''}`}>
      <div onClick={() => onToggleNode(node.id)} className={`feature-node-header flex items-center gap-1 cursor-pointer py-1 select-none hover:bg-hover-bg rounded transition-colors duration-200 ${isMatch ? 'bg-accent/20' : ''}`}>
        <Icon name="ChevronRight" className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        <span>{node.name}</span>
      </div>
      {isExpanded && (
        <div className="feature-node-children pl-4">
          {node.children.map(child => <RenderFeatureNode key={child.id} {...{ node: child, keyData, chosenFeatures, onFeatureChange, onImageClick, t, expandedNodes, onToggleNode, matchingIds }} />)}
        </div>
      )}
    </div>
  );
};