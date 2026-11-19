import { describe, expect, it } from 'vitest';
import {
  MIN_COHORT_SIZE,
  canShowCohortDetails,
  canShowCompetitionNeighbourhood,
} from './product-rules';

describe('product-rules', () => {
  it('keeps percentile details behind a cohort of ten', () => {
    expect(MIN_COHORT_SIZE).toBe(10);
    expect(canShowCohortDetails(9)).toBe(false);
    expect(canShowCohortDetails(10)).toBe(true);
    expect(canShowCohortDetails(null)).toBe(false);
  });

  it('shows the competition neighbourhood only for a detailed cohort with scores', () => {
    expect(canShowCompetitionNeighbourhood(9, [80])).toBe(false);
    expect(canShowCompetitionNeighbourhood(12, [])).toBe(false);
    expect(canShowCompetitionNeighbourhood(12, null)).toBe(false);
    expect(canShowCompetitionNeighbourhood(12, [80, 81])).toBe(true);
  });
});
