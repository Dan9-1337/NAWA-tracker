import type { StatisticsResult } from '../../shared/contracts';
import type { StatsSnapshot } from './stats-snapshot';

const MEDIAN_STABLE_THRESHOLD = 0.5;

export type PositionChangeReason =
  | { kind: 'new_higher_scores'; count: number }
  | { kind: 'new_lower_scores'; count: number }
  | { kind: 'existing_scores_updated' }
  | { kind: 'cohort_size_changed'; count: number }
  | { kind: 'median_changed'; delta: number; direction: 'up' | 'down' }
  | { kind: 'tie_changed' }
  | { kind: 'status_data_changed'; count: number }
  | { kind: 'no_change' };

function countScoresAbove(scores: number[], userScore: number): number {
  return scores.filter((score) => score > userScore + 0.05).length;
}

function countScoresAt(scores: number[], userScore: number): number {
  return scores.filter((score) => Math.abs(score - userScore) < 0.05).length;
}

export function hasPositionChanged(previous: StatsSnapshot, current: StatisticsResult): boolean {
  if (
    previous.rankPosition != null &&
    current.rankPosition != null &&
    previous.rankPosition !== current.rankPosition
  ) {
    return true;
  }

  if (previous.lowerScorePercentage == null || current.lowerScorePercentage == null) {
    return false;
  }

  return Math.round(previous.lowerScorePercentage) !== Math.round(current.lowerScorePercentage);
}

export function explainPositionChange(
  previous: StatsSnapshot,
  current: StatisticsResult,
  userScore?: number | null,
): PositionChangeReason[] {
  const reasons: PositionChangeReason[] = [];
  const groupDelta = current.groupResponseCount - previous.groupResponseCount;

  if (groupDelta !== 0) {
    reasons.push({ kind: 'cohort_size_changed', count: Math.abs(groupDelta) });
  }

  if (
    previous.cohortScores &&
    current.cohortScores &&
    userScore != null
  ) {
    const previousHigher = countScoresAbove(previous.cohortScores, userScore);
    const currentHigher = countScoresAbove(current.cohortScores, userScore);
    const higherDelta = currentHigher - previousHigher;

    if (higherDelta > 0) {
      reasons.push({ kind: 'new_higher_scores', count: higherDelta });
    } else if (higherDelta < 0) {
      reasons.push({ kind: 'new_lower_scores', count: Math.abs(higherDelta) });
    }

    const previousTies = countScoresAt(previous.cohortScores, userScore);
    const currentTies = countScoresAt(current.cohortScores, userScore);
    if (previousTies !== currentTies) {
      reasons.push({ kind: 'tie_changed' });
    }
  } else if (groupDelta > 0 && hasPositionChanged(previous, current)) {
    // Heuristic when cohort score lists are unavailable.
    const percentileDropped =
      previous.lowerScorePercentage != null &&
      current.lowerScorePercentage != null &&
      Math.round(current.lowerScorePercentage) < Math.round(previous.lowerScorePercentage);
    const rankWorsened =
      previous.rankPosition != null &&
      current.rankPosition != null &&
      current.rankPosition > previous.rankPosition;

    if (percentileDropped || rankWorsened) {
      reasons.push({ kind: 'new_higher_scores', count: groupDelta });
    } else {
      reasons.push({ kind: 'new_lower_scores', count: groupDelta });
    }
  } else if (
    groupDelta === 0 &&
    hasPositionChanged(previous, current) &&
    previous.cohortScores &&
    current.cohortScores
  ) {
    reasons.push({ kind: 'existing_scores_updated' });
  }

  if (previous.medianScore != null && current.medianScore != null) {
    const delta = current.medianScore - previous.medianScore;
    if (Math.abs(delta) >= MEDIAN_STABLE_THRESHOLD) {
      reasons.push({
        kind: 'median_changed',
        delta: Math.round(Math.abs(delta) * 10) / 10,
        direction: delta > 0 ? 'up' : 'down',
      });
    }
  }

  const statusUpdates = current.growth7d?.statusUpdatesInGroup ?? 0;
  if (statusUpdates > 0) {
    reasons.push({ kind: 'status_data_changed', count: statusUpdates });
  }

  if (!hasPositionChanged(previous, current) && reasons.length === 0) {
    return [{ kind: 'no_change' }];
  }

  return reasons.length > 0 ? reasons : [{ kind: 'no_change' }];
}

export function hasGrowthActivity(
  growth: StatisticsResult['growth7d'],
): growth is NonNullable<StatisticsResult['growth7d']> {
  if (!growth) return false;

  return (
    growth.newResponsesTotal > 0 ||
    growth.newResponsesInGroup > 0 ||
    growth.trackNewResponses > 0 ||
    growth.statusUpdatesInGroup > 0 ||
    (growth.medianThen != null &&
      growth.medianNow != null &&
      Math.abs(growth.medianNow - growth.medianThen) >= MEDIAN_STABLE_THRESHOLD) ||
    (growth.percentileThen != null &&
      growth.percentileNow != null &&
      Math.round(growth.percentileThen) !== Math.round(growth.percentileNow))
  );
}

/** Meaningful personal changes since the last visit — not merely having a snapshot. */
export function hasReturningVisitChanges(
  previous: StatsSnapshot | null,
  current: StatisticsResult,
): boolean {
  if (!previous) return false;

  if (hasPositionChanged(previous, current)) return true;

  if (previous.groupResponseCount !== current.groupResponseCount) return true;

  if (
    previous.medianScore != null &&
    current.medianScore != null &&
    Math.abs(current.medianScore - previous.medianScore) >= MEDIAN_STABLE_THRESHOLD
  ) {
    return true;
  }

  if (
    previous.sameCountryCount != null &&
    current.sameCountryCount != null &&
    previous.sameCountryCount !== current.sameCountryCount
  ) {
    return true;
  }

  // Growth activity alone is for CohortPulse — only treat status updates as personal
  // "what changed" when they occurred in the user's group.
  if ((current.growth7d?.statusUpdatesInGroup ?? 0) > 0) return true;
  if ((current.growth7d?.newResponsesInGroup ?? 0) > 0) return true;

  return false;
}
