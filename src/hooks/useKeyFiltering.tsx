import { useMemo } from 'react';
import type { KeyData, ChosenFeature, StateScore, NumericScore, EntityNode } from '../types';
import { getFeatureParentNode } from '../utils/FeatureUtils';

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

    // Group chosen features by their parent feature to evaluate AND/OR matching types
    const choicesByParent = new Map<string, { id: string, choice: ChosenFeature, stateNode: any }[]>();
    
    for (const [featureId, choice] of chosenFeatures.entries()) {
      const feature = keyData.allFeatures.get(featureId);
      if (!feature) continue;

      if (feature.isState) {
        const parent = getFeatureParentNode(featureId, keyData.featureTree);
        if (parent) {
          if (!choicesByParent.has(parent.id)) choicesByParent.set(parent.id, []);
          choicesByParent.get(parent.id)!.push({ id: featureId, choice, stateNode: feature });
        } else {
          if (!choicesByParent.has(featureId)) choicesByParent.set(featureId, []);
          choicesByParent.get(featureId)!.push({ id: featureId, choice, stateNode: feature });
        }
      } else {
        if (!choicesByParent.has(featureId)) choicesByParent.set(featureId, []);
        choicesByParent.get(featureId)!.push({ id: featureId, choice, stateNode: feature });
      }
    }

    // 1. Determine which entities are directly discarded by a feature mismatch.
    for (const entityId of allEntityIds) {
      let isMismatch = false;
      let hasUncertainty = false;
      let hasMisinterpretation = false;

      for (const [parentId, choices] of choicesByParent.entries()) {
        const parentFeatureData = keyData.allFeatures.get(parentId);

        if (choices[0].stateNode.isState) {
          const matchType = parentFeatureData?.matchType === 'AND' ? 'AND' : 'OR';
          let anyStateMatched = false;
          let allStatesMatched = true;

          for (const stateChoice of choices) {
            const score = keyData.entityScores.get(entityId)?.get(stateChoice.id);
            let stateMatched = false;

            if (score) {
              const val = (score as StateScore).value;
              if (val !== '0') {
                if (val === '3') {
                  if (allowUncertainties) { stateMatched = true; hasUncertainty = true; }
                } else if (val === '4' || val === '5') {
                  if (allowMisinterpretations) { stateMatched = true; hasMisinterpretation = true; }
                } else {
                  stateMatched = true;
                }
              }
            }
            if (stateMatched) anyStateMatched = true;
            else allStatesMatched = false;
          }

          if (matchType === 'OR' && !anyStateMatched) { isMismatch = true; break; }
          if (matchType === 'AND' && !allStatesMatched) { isMismatch = true; break; }
        } else {
          // Numeric feature evaluation
          const choice = choices[0];
          const score = keyData.entityScores.get(entityId)?.get(choice.id);
          if (!score) { isMismatch = true; break; }
          const numVal = parseFloat(String(choice.choice.value));
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
