import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Panel } from './Panel';
import type { KeyData, ChosenFeature, FeatureNode } from '../../types';
import { RenderFeatureNode } from './FeatureNodeRenderer';
import { useAppContext } from '../../context/AppContext';
import { Icon } from '../Icon';
import { useSearchAutoScroll } from '../../hooks/useSearchAutoScroll';

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
  const [isFooterVisible, setIsFooterVisible] = useState(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleToggleNode = (id: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const showFooter = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    setIsFooterVisible(true);
  };

  const hideFooter = () => {
    hideTimeoutRef.current = setTimeout(() => {
      setIsFooterVisible(false);
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

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
          parents.push(node.id);
          childrenMatch = findMatches(node.children, parents);
          parents.pop();
        }

        if (selfMatches) {
          newMatching.add(node.id);
        }
        if (selfMatches || childrenMatch) {
          subtreeHasMatch = true;
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

  useSearchAutoScroll(containerRef, searchTerm, matchingIds, currentMatchIndex, setCurrentMatchIndex, setMatchCount);

  // 2. Calculate the count of unique features (not states)
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

  const clearButton = chosenFeatures.size > 0 ? (
    <div 
      onMouseEnter={showFooter} 
      onMouseLeave={hideFooter}
      className={`transition-opacity duration-300 ${isFooterVisible ? 'opacity-100 pointer-events-auto' : 'max-md:opacity-100 max-md:pointer-events-auto opacity-0 pointer-events-none'}`}
    >
      <div className="view-controls flex items-center bg-header-bg/85 backdrop-blur-md rounded-xl p-1 shadow-md border border-white/20 dark:border-white/10">
        <button onClick={resetKey} title={t('clearFeatures')} className="p-1.5 rounded-lg transition-all duration-300 hover:bg-red-500 hover:text-white hover:shadow-sm hover:-translate-y-0.5 text-gray-500 cursor-pointer flex items-center justify-center">
          <Icon name="Trash2" size={16} />
        </button>
      </div>
    </div>
  ) : undefined;

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
      footer={clearButton}
    >
      <div ref={containerRef} onMouseEnter={showFooter} onMouseLeave={hideFooter} className="h-full min-h-[50px]">
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
