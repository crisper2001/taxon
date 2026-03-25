import type { KeyData, GeminiFeatureMatch, Entity, StateScore, NumericScore } from '../../types';

export const findMatchingEntities = (features: GeminiFeatureMatch[], keyData: KeyData): Entity[] => {
  if (!features || features.length === 0) {
    return Array.from(keyData.allEntities.values());
  }

  const matchingEntityIds = new Set<string>(keyData.allEntities.keys());

  for (const featureMatch of features) {
    const featureInfo = keyData.allFeatures.get(featureMatch.id);
    if (!featureInfo) continue;

    for (const entityId of matchingEntityIds) {
      const scores = keyData.entityScores.get(entityId);
      if (!scores || !scores.has(featureMatch.id)) {
        matchingEntityIds.delete(entityId);
        continue;
      }

      const score = scores.get(featureMatch.id)!;

      if (featureInfo.type === 'state') {
        if ((score as StateScore).value === '0') {
          matchingEntityIds.delete(entityId);
        }
      } else if (featureInfo.type === 'numeric' && featureMatch.value) {
        const userValue = parseFloat(featureMatch.value);
        const numericScore = score as NumericScore;
        if (isNaN(userValue) || userValue < numericScore.min || userValue > numericScore.max) {
          matchingEntityIds.delete(entityId);
        }
      }
    }
  }

  return Array.from(matchingEntityIds).map(id => keyData.allEntities.get(id)!);
};
