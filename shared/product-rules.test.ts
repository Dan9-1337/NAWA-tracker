import { describe, expect, it } from 'vitest';
import { MIN_COHORT_SIZE, canShowCompetitionNeighbourhood } from './product-rules';

describe('product-rules', () => {
  it('keeps the landing response counter behind an intake of ten', () => {
    expect(MIN_COHORT_SIZE).toBe(10);
  });

  it('shows the competition neighbourhood only for a detailed cohort with scores', () => {
    expect(canShowCompetitionNeighbourhood(9, [80])).toBe(false);
    expect(canShowCompetitionNeighbourhood(null, [80])).toBe(false);
    expect(canShowCompetitionNeighbourhood(12, [])).toBe(false);
    expect(canShowCompetitionNeighbourhood(12, null)).toBe(false);
    expect(canShowCompetitionNeighbourhood(12, [80, 81])).toBe(true);
  });
});
