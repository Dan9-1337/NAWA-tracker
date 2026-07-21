export const MIN_DETAILED_COHORT = 10;
export const QUALITATIVE_COHORT_MAX = 29;

export type VerdictKind = 'above' | 'around' | 'below' | 'unknown';

export type MedianBand = 'below' | 'around' | 'above';

export type ReliabilityLevel = 'low' | 'medium' | 'high';

/** Relative to median — shared by hero copy and the position scale. */
export function getMedianBand(lowerScorePercentage: number | null): MedianBand | 'unknown' {
  if (lowerScorePercentage == null) return 'unknown';
  if (lowerScorePercentage >= 55) return 'above';
  if (lowerScorePercentage <= 45) return 'below';
  return 'around';
}

export function getVerdictKind(lowerScorePercentage: number | null): VerdictKind {
  const band = getMedianBand(lowerScorePercentage);
  return band === 'unknown' ? 'unknown' : band;
}

export function getReliabilityLevel(groupSize: number): ReliabilityLevel {
  if (groupSize < MIN_DETAILED_COHORT) return 'low';
  if (groupSize <= QUALITATIVE_COHORT_MAX) return 'medium';
  return 'high';
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

/** @deprecated Prefer getMedianBand — kept for call sites during migration. */
export function getQualitativeBand(lowerScorePercentage: number): 'upper' | 'middle' | 'lower' {
  const band = getMedianBand(lowerScorePercentage);
  if (band === 'above') return 'upper';
  if (band === 'below') return 'lower';
  return 'middle';
}

export function isDetailedCohort(groupSize: number): boolean {
  return groupSize > QUALITATIVE_COHORT_MAX;
}
