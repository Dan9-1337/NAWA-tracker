/**
 * Valid responses of the active intake before the landing response counter is shown. The score comparison has
 * no floor any more (ADR 0015): the client reads `detailsAvailable` from the statistics payload instead.
 */
export const MIN_COHORT_SIZE = 10;

/**
 * The retired competition-neighbourhood view is only meaningful with a sample this large. The saved result card
 * and the what-if band do not use this floor (ADR 0015).
 */
export function canShowCompetitionNeighbourhood(
  countrySampleSize: number | null | undefined,
  cohortScores: number[] | null | undefined,
): boolean {
  return countrySampleSize != null && countrySampleSize >= MIN_COHORT_SIZE && cohortScores != null && cohortScores.length > 0;
}
