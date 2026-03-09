import { useMemo } from 'react';
import type { KeyData, ChosenFeature, StateScore, NumericScore, EntityNode } from '../types';

export const useKeyFiltering = (keyData: KeyData | null, chosenFeatures: Map<string, ChosenFeature>) => {
  return useMemo(() => {
    if (!keyData) {
      return { directMatches: new Set<string>(), indirectMatches: new Set<string>(), discardedEntityIds: new Set<string>(), directlyDiscarded: new Set<string>() };
    }
    
    const allEntityIds = new Set(keyData.allEntities.keys());

    if (chosenFeatures.size === 0) {
      // Nothing is discarded when no features are chosen
      return { directMatches: allEntityIds, indirectMatches: new Set<string>(), discardedEntityIds: new Set<string>(), directlyDiscarded: new Set<string>() };
    }

    const directlyDiscarded = new Set<string>();

    // 1. Determine which entities are directly discarded by a feature mismatch.
    for (const entityId of allEntityIds) {
      for (const [featureId, choice] of chosenFeatures.entries()) {
        const feature = keyData.allFeatures.get(featureId);
        if (!feature) continue;

        const scores = keyData.entityScores.get(entityId);
        const score = scores?.get(featureId);

        // An entity is mismatched if it has no score for the chosen feature,
        // or if the score doesn't align with the choice.
        const isMismatch = !score ||
          (feature.type === 'state' && (score as StateScore).value === '0') ||
          (feature.type === 'numeric' && (
            isNaN(parseFloat(String(choice.value))) || parseFloat(String(choice.value)) < (score as NumericScore).min || parseFloat(String(choice.value)) > (score as NumericScore).max
          ));

        if (isMismatch) {
          // This entity has a direct mismatch. Mark it and move to the next entity.
          directlyDiscarded.add(entityId as string);
          break; // No need to check other features for this entity
        }
      }
    }

    // 2. Direct matches are all entities that are NOT directly discarded.
    const directMatches = new Set([...allEntityIds].filter(id => !directlyDiscarded.has(id as string)));

    // 3. Calculate indirect matches (parents of remaining entities).
    const indirectMatches = new Set<string>();
    const remainingIds = new Set(directMatches);

    const buildIndirectHierarchy = (nodes: EntityNode[]) => {
      let changedInLoop = false;
      nodes.forEach(node => {
        if (node.isGroup && !remainingIds.has(node.id)) {
          const hasMatchingChild = node.children.some(child => remainingIds.has(child.id));
          if (hasMatchingChild) {
            indirectMatches.add(node.id);
            remainingIds.add(node.id);
            changedInLoop = true;
          }
        }
      });
      return changedInLoop;
    };
    
    // Iteratively build up the hierarchy from children to parents
    while(buildIndirectHierarchy(keyData.entityTree));

    // 4. Total discarded entities are everyone not in the final remaining set.
    const discardedEntityIds = new Set([...allEntityIds].filter(id => !remainingIds.has(id)));

    return { directMatches, indirectMatches, discardedEntityIds, directlyDiscarded };
  }, [keyData, chosenFeatures]);
};
