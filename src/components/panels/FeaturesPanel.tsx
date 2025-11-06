import React, { useState, useMemo, useEffect } from 'react';
import { Panel } from './Panel';
import type { KeyData, ChosenFeature, FeatureNode } from '../../types';
import { RenderFeatureNode } from './FeatureNodeRenderer';

// --- FeaturesPanel ---
interface FeaturesPanelProps {
  keyData: KeyData;
  chosenFeatures: Map<string, ChosenFeature>;
  onFeatureChange: (id: string, value: string | boolean | number, isNumeric: boolean) => void;
  onImageClick: (featureId: string) => void;
  t: (key: string) => string;
}
export const FeaturesPanel: React.FC<FeaturesPanelProps> = ({ keyData, chosenFeatures, onFeatureChange, onImageClick, t }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedNodes, setExpandedNodes] = useState(new Set<string>());
  const [matchingIds, setMatchingIds] = useState<Set<string> | null>(null);

  const handleToggleNode = (id: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  useEffect(() => {
    if (!searchTerm) {
      setMatchingIds(null);
      setExpandedNodes(new Set());
      return;
    }

    const newMatching = new Set<string>();
    const newExpanded = new Set<string>();
    const lowerCaseSearchTerm = searchTerm.toLowerCase();

    const findMatches = (nodes: FeatureNode[], parents: string[]): boolean => {
      let subtreeHasMatch = false;
      for (const node of nodes) {
        const selfMatches = node.name.toLowerCase().includes(lowerCaseSearchTerm);
        let childrenMatch = false;
        if (node.isState || node.type === 'numeric') {
          if (selfMatches) subtreeHasMatch = true;
        } else {
          childrenMatch = findMatches(node.children, [...parents, node.id]);
        }

        if (selfMatches || childrenMatch) {
          subtreeHasMatch = true;
          newMatching.add(node.id);
          parents.forEach(p => newExpanded.add(p));
        }
      }
      return subtreeHasMatch;
    };

    findMatches(keyData.featureTree, []);
    setMatchingIds(newMatching);
    setExpandedNodes(newExpanded);
  }, [searchTerm, keyData.featureTree]);

  return (
    <Panel title={t('features')} icon="ListFilter" count={keyData.totalFeaturesCount} onSearch={setSearchTerm}>
      {keyData.featureTree.map(node => (
        <RenderFeatureNode
          key={node.id}
          node={node}
          keyData={keyData}
          chosenFeatures={chosenFeatures}
          onFeatureChange={onFeatureChange}
          onImageClick={onImageClick}
          t={t}
          expandedNodes={expandedNodes}
          onToggleNode={handleToggleNode}
          matchingIds={matchingIds}
        />
      ))}
    </Panel>
  );
};
