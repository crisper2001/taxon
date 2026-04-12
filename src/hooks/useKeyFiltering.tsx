import { useMemo } from 'react';
import type { KeyData, ChosenFeature, StateScore, NumericScore, EntityNode } from '../types';

export const useKeyFiltering = (keyData: KeyData | null, chosenFeatures: Map<string, ChosenFeature>, allowMisinterpretations: boolean = true, allowUncertainties: boolean = true) => {
  return useMemo(() => {
    if (!keyData) {
      return { directMatches: new Set<string>(), indirectMatches: new Set<string>(), discardedEntityIds: new Set<string>(), directlyDiscarded: new Set<string>(), uncertainMatchIds: new Set<string>(), misinterpretedMatchIds: new Set<string>() };
    }

    const allEntityIds = new Set(keyData.allEntities.keys());

    if (chosenFeatures.size === 0) {
      // Nothing is discarded when no features are chosen
      return { directMatches: allEntityIds, indirectMatches: new Set<string>(), discardedEntityIds: new Set<string>(), directlyDiscarded: new Set<string>(), uncertainMatchIds: new Set<string>(), misinterpretedMatchIds: new Set<string>() };
    }

    const directlyDiscarded = new Set<string>();
    const uncertainMatchIds = new Set<string>();
    const misinterpretedMatchIds = new Set<string>();

    // 1. Determine which entities are directly discarded by a feature mismatch.
    for (const entityId of allEntityIds) {
      let isMismatch = false;
      let hasUncertainty = false;
      let hasMisinterpretation = false;

      for (const [featureId, choice] of chosenFeatures.entries()) {
        const feature = keyData.allFeatures.get(featureId);
        if (!feature) continue;

        const scores = keyData.entityScores.get(entityId);
        const score = scores?.get(featureId);

        if (!score) {
          isMismatch = true;
          break;
        }

        if (feature.type === 'state') {
          const val = (score as StateScore).value;
          if (val === '0') {
            isMismatch = true;
            break;
          } else if (val === '3') {
            if (!allowUncertainties) { isMismatch = true; break; }
            hasUncertainty = true;
          } else if (val === '4' || val === '5') {
            if (!allowMisinterpretations) { isMismatch = true; break; }
            hasMisinterpretation = true;
          }
        } else if (feature.type === 'numeric') {
          const numVal = parseFloat(String(choice.value));
          if (isNaN(numVal) || numVal < (score as NumericScore).min || numVal > (score as NumericScore).max) {
            isMismatch = true;
            break;
          }
        }
      }

      if (isMismatch) {
        // This entity has a direct mismatch. Mark it and move to the next entity.
        directlyDiscarded.add(entityId as string);
      } else {
        // It matched safely. Keep track of any interpretive tolerances
        if (hasMisinterpretation) misinterpretedMatchIds.add(entityId as string);
        if (hasUncertainty) uncertainMatchIds.add(entityId as string);
      }
    }

    // 2. Direct matches are all entities that are NOT directly discarded.
    const directMatches = new Set([...allEntityIds].filter(id => !directlyDiscarded.has(id as string)));

    // 3. Calculate indirect matches (parents of remaining entities).
    const indirectMatches = new Set<string>();
    const remainingIds = new Set(directMatches);

    const buildIndirectHierarchy = (nodes: EntityNode[]): boolean => {
      let subtreeHasMatch = false;
      for (const node of nodes) {
        let nodeHasMatch = remainingIds.has(node.id);
        if (node.isGroup) {
          const childrenMatch = buildIndirectHierarchy(node.children);
          if (childrenMatch) {
            indirectMatches.add(node.id);
            remainingIds.add(node.id);
            nodeHasMatch = true;
          }
        }
        if (nodeHasMatch) subtreeHasMatch = true;
      }
      return subtreeHasMatch;
    };

    buildIndirectHierarchy(keyData.entityTree);

    // 4. Total discarded entities are everyone not in the final remaining set.
    const discardedEntityIds = new Set([...allEntityIds].filter(id => !remainingIds.has(id)));

    return { directMatches, indirectMatches, discardedEntityIds, directlyDiscarded, uncertainMatchIds, misinterpretedMatchIds };
  }, [keyData, chosenFeatures, allowMisinterpretations, allowUncertainties]);
};
