import { describe, expect, it } from 'vitest';
import { computeCompetitionNeighbourhood } from './competition-neighbourhood';

describe('computeCompetitionNeighbourhood', () => {
  it('returns null when cohort is below privacy threshold', () => {
    expect(computeCompetitionNeighbourhood(84.7, [90, 85, 80], 9)).toBeNull();
    expect(computeCompetitionNeighbourhood(84.7, null, 12)).toBeNull();
  });

  it('computes distances and neighbourhood counts', () => {
    const result = computeCompetitionNeighbourhood(
      84.7,
      [95, 90, 85.2, 84.7, 84.7, 83.5, 80],
      12,
    );

    expect(result).toEqual({
      distanceToHigher: 0.5,
      distanceToLower: 1.2,
      withinOnePointCount: 3,
      tiedCount: 2,
      density: 'moderate',
    });
  });

  it('marks dense neighbourhoods', () => {
    const scores = Array.from({ length: 12 }, (_, index) => 84 + (index % 3) * 0.3);
    const result = computeCompetitionNeighbourhood(84.5, scores, 12);
    expect(result?.density).toBe('dense');
  });
});
