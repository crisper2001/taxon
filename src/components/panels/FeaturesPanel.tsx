import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Panel } from './Panel';
import type { KeyData, ChosenFeature, FeatureNode } from '../../types';
import { RenderFeatureNode } from './FeatureNodeRenderer';
import { Icon } from '../Icon';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [matchCount, setMatchCount] = useState(0);
  // Note: we require `FeatureNodeRenderer.tsx` to bind data-search-match="true" for full support.

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
      if (matchingIds !== null) {
        setExpandedNodes(prev => prev.size > 0 ? new Set() : prev);
      }
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

  // Reset match index when search changes
  useEffect(() => {
    setCurrentMatchIndex(0);
  }, [searchTerm, matchingIds]);

  // Auto-scroll to current match
  useEffect(() => {
    if (searchTerm && matchingIds && matchingIds.size > 0) {
      const timeoutId = setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.querySelectorAll('[data-search-active="true"]').forEach(el => el.removeAttribute('data-search-active'));
          const matches = containerRef.current.querySelectorAll('[data-search-match="true"]');
          setMatchCount(matches.length);
          if (matches.length > 0) {
            let safeIndex = currentMatchIndex;
            if (safeIndex >= matches.length) safeIndex = 0;
            if (safeIndex < 0) safeIndex = matches.length - 1;
            
            if (safeIndex !== currentMatchIndex) {
              setCurrentMatchIndex(safeIndex);
            } else {
              matches[safeIndex].setAttribute('data-search-active', 'true');
              matches[safeIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }
        }
      }, 100);
      return () => clearTimeout(timeoutId);
    } else {
      setMatchCount(0);
      if (containerRef.current) {
        containerRef.current.querySelectorAll('[data-search-active="true"]').forEach(el => el.removeAttribute('data-search-active'));
      }
    }
  }, [matchingIds, searchTerm, currentMatchIndex]);

  return (
    <Panel 
      title={t('features')} 
      icon="ListFilter" 
      count={keyData.totalFeaturesCount} 
      onSearch={setSearchTerm}
      currentMatchIndex={currentMatchIndex}
      matchCount={matchCount}
      onPrevMatch={() => setCurrentMatchIndex(prev => prev - 1)}
      onNextMatch={() => setCurrentMatchIndex(prev => prev + 1)}
    >
      <div ref={containerRef}>
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
      </div>
    </Panel>
  );
};
