/** Responses in the comparison cohort before percentile, median and distribution are shown. */
export const MIN_COHORT_SIZE = 10;

/** Awarded responses a cohort needs before its outcomes are disclosed. */
export const OUTCOME_MIN_AWARDED = 3;

/** Disclosed outcome scores are rounded outward to bands of this many points. */
export const OUTCOME_BAND_WIDTH = 5;

export function canShowCohortDetails(cohortSize: number | null | undefined): boolean {
  return cohortSize != null && cohortSize >= MIN_COHORT_SIZE;
}

export function canShowCompetitionNeighbourhood(
  countrySampleSize: number | null | undefined,
  cohortScores: number[] | null | undefined,
): boolean {
  return canShowCohortDetails(countrySampleSize) && cohortScores != null && cohortScores.length > 0;
}
