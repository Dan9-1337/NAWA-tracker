import type { CohortOutcomesResult } from '../../shared/contracts';
import { nawaOrientationThreshold } from '../../shared/nawa-score';

export const OUTCOME_AXIS_MAX = 100;
/** The axis starts at the merit threshold: awards below it are not expected. */
export const OUTCOME_AXIS_MIN = nawaOrientationThreshold;

/** Position of a score on the outcomes axis as a fraction in [0, 1]. */
export function outcomeAxisPosition(score: number): number {
  const clamped = Math.min(Math.max(score, OUTCOME_AXIS_MIN), OUTCOME_AXIS_MAX);
  return (clamped - OUTCOME_AXIS_MIN) / (OUTCOME_AXIS_MAX - OUTCOME_AXIS_MIN);
}

export type OutcomeRelation = 'inside' | 'below' | 'above';

export function relateToOutcome(
  userScore: number,
  band: { low: number; high: number },
): OutcomeRelation {
  if (userScore < band.low) return 'below';
  if (userScore > band.high) return 'above';
  return 'inside';
}

/** The awarded band of a disclosed cohort, or null while the cohort is undisclosed. */
export function awardedBand(outcome: Pick<CohortOutcomesResult, 'awardedBandLow' | 'awardedBandHigh'>) {
  if (outcome.awardedBandLow == null || outcome.awardedBandHigh == null) return null;
  return { low: outcome.awardedBandLow, high: outcome.awardedBandHigh };
}

export const outcomeAxisTicks: readonly number[] = [60, 70, 80, 90, 100];
