export const MIN_DETAILED_COHORT = 10;
export const QUALITATIVE_COHORT_MAX = 29;

export type MedianBand = 'below' | 'around' | 'above';

/** Relative to median — shared by hero copy and the position scale. */
export function getMedianBand(lowerScorePercentage: number | null): MedianBand | 'unknown' {
  if (lowerScorePercentage == null) return 'unknown';
  if (lowerScorePercentage >= 55) return 'above';
  if (lowerScorePercentage <= 45) return 'below';
  return 'around';
}

export function getCohortProgressCount(data: {
  sameCountryCount: number | null;
  sameTrackCount: number;
  totalValidResponses: number;
}): number {
  return data.sameCountryCount ?? data.sameTrackCount ?? data.totalValidResponses;
}

export function formatPercentileValue(lowerScorePercentage: number, groupSize: number): number {
  if (groupSize > QUALITATIVE_COHORT_MAX) {
    return Math.round(lowerScorePercentage);
  }
  if (groupSize >= MIN_DETAILED_COHORT) {
    return Math.round(lowerScorePercentage / 5) * 5;
  }
  return Math.round(lowerScorePercentage);
}
