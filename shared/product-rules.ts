/** Responses in the comparison cohort before percentile, median and distribution are shown. */
export const MIN_COHORT_SIZE = 10;

export function canShowCohortDetails(cohortSize: number | null | undefined): boolean {
  return cohortSize != null && cohortSize >= MIN_COHORT_SIZE;
}

export function canShowCompetitionNeighbourhood(
  countrySampleSize: number | null | undefined,
  cohortScores: number[] | null | undefined,
): boolean {
  return canShowCohortDetails(countrySampleSize) && cohortScores != null && cohortScores.length > 0;
}
