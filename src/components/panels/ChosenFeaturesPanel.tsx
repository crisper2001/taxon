import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Panel } from './Panel';
import type { KeyData, ChosenFeature, FeatureNode } from '../../types';
import { RenderFeatureNode } from './FeatureNodeRenderer';
import { useAppContext } from '../../context/AppContext';
import { Icon } from '../Icon';

// --- ChosenFeaturesPanel ---
interface ChosenFeaturesPanelProps {
  chosenFeatures: Map<string, ChosenFeature>;
  keyData: KeyData;
  onFeatureChange: (id: string, value: boolean | string, isNumeric: boolean) => void;
  onImageClick: (featureId: string) => void;
  t: (key: string) => string;
}

export const ChosenFeaturesPanel: React.FC<ChosenFeaturesPanelProps> = ({ chosenFeatures, keyData, onFeatureChange, onImageClick, t }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedNodes, setExpandedNodes] = useState(new Set<string>());
  const [matchingIds, setMatchingIds] = useState<Set<string> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [matchCount, setMatchCount] = useState(0);
  const { resetKey } = useAppContext();

  const handleToggleNode = (id: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  // 1. Create a new tree containing only chosen features and their ancestors
  const chosenTree = useMemo(() => {
    const filterTree = (nodes: FeatureNode[]): FeatureNode[] => {
      return nodes.map(node => {
        // Recursively filter children first
        const newChildren = node.children ? filterTree(node.children) : [];

        // Keep the node if it's chosen OR if it's an ancestor of a chosen node
        if (chosenFeatures.has(node.id) || newChildren.length > 0) {
          return { ...node, children: newChildren };
        }
        return null;
      }).filter((node): node is FeatureNode => node !== null);
    };
    return filterTree(keyData.featureTree);
  }, [keyData.featureTree, chosenFeatures]);

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

    findMatches(chosenTree, []);
    setMatchingIds(newMatching);
    setExpandedNodes(newExpanded);
  }, [searchTerm, chosenTree]);

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

  // 3. Calculate the count of unique features (not states)
  const featureCount = useMemo(() => {
    const uniqueFeatures = new Set<string>();
    for (const id of chosenFeatures.keys()) {
      const feature = keyData.allFeatures.get(id);
      if (!feature) continue;
      if (feature.isState && feature.parentName) {
        uniqueFeatures.add(feature.parentName);
      } else {
        uniqueFeatures.add(feature.id);
      }
    }
    return uniqueFeatures.size;
  }, [chosenFeatures, keyData.allFeatures]);

  return (
    <Panel 
      title={t('featuresChosen')} 
      icon="ListChecks" 
      count={featureCount} 
      onSearch={setSearchTerm}
      currentMatchIndex={currentMatchIndex}
      matchCount={matchCount}
      onPrevMatch={() => setCurrentMatchIndex(prev => prev - 1)}
      onNextMatch={() => setCurrentMatchIndex(prev => prev + 1)}
      actionButton={
        chosenFeatures.size > 0 ? (
          <button type="button" onClick={resetKey} title={t('clearFeatures')} className="p-1.5 hover:bg-accent/20 text-gray-500 hover:text-accent rounded cursor-pointer transition-colors flex items-center justify-center shrink-0">
            <Icon name="Trash2" size={16} />
          </button>
        ) : undefined
      }
    >
      <div ref={containerRef}>
        {chosenTree.map(node => (
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
