import { MIN_COHORT_SIZE } from '../../shared/product-rules';

export const QUALITATIVE_COHORT_MAX = 29;

export function formatPercentileValue(lowerScorePercentage: number, groupSize: number): number {
  if (groupSize > QUALITATIVE_COHORT_MAX) {
    return Math.round(lowerScorePercentage);
  }
  if (groupSize >= MIN_COHORT_SIZE) {
    return Math.round(lowerScorePercentage / 5) * 5;
  }
  return Math.round(lowerScorePercentage);
}
