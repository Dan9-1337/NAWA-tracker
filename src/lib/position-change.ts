import type { StatisticsResult } from '../../shared/contracts';
import type { StatsSnapshot } from './stats-snapshot';

const MEDIAN_STABLE_THRESHOLD = 0.5;

export type PositionChangeReason =
  | { kind: 'new_responses'; count: number }
  | { kind: 'median_shift'; delta: number; direction: 'up' | 'down' }
  | { kind: 'median_stable' }
  | { kind: 'no_change' };

export function hasPositionChanged(previous: StatsSnapshot, current: StatisticsResult): boolean {
  if (previous.lowerScorePercentage == null || current.lowerScorePercentage == null) {
    return false;
  }

  return Math.round(previous.lowerScorePercentage) !== Math.round(current.lowerScorePercentage);
}

export function explainPositionChange(
  previous: StatsSnapshot,
  current: StatisticsResult,
): PositionChangeReason[] {
  if (!hasPositionChanged(previous, current)) {
    return [{ kind: 'no_change' }];
  }

  const reasons: PositionChangeReason[] = [];
  const groupDelta = current.groupResponseCount - previous.groupResponseCount;

  if (groupDelta > 0) {
    reasons.push({ kind: 'new_responses', count: groupDelta });
  }

  if (previous.medianScore != null && current.medianScore != null) {
    const delta = current.medianScore - previous.medianScore;
    if (Math.abs(delta) < MEDIAN_STABLE_THRESHOLD) {
      reasons.push({ kind: 'median_stable' });
    } else {
      reasons.push({
        kind: 'median_shift',
        delta: Math.round(Math.abs(delta) * 10) / 10,
        direction: delta > 0 ? 'up' : 'down',
      });
    }
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
    (growth.medianThen != null &&
      growth.medianNow != null &&
      Math.abs(growth.medianNow - growth.medianThen) >= MEDIAN_STABLE_THRESHOLD) ||
    (growth.percentileThen != null &&
      growth.percentileNow != null &&
      Math.round(growth.percentileThen) !== Math.round(growth.percentileNow))
  );
}

export function hasReturningVisitChanges(
  previous: StatsSnapshot | null,
  current: StatisticsResult,
): boolean {
  if (!previous) return false;

  if (hasGrowthActivity(current.growth7d)) return true;
  if (previous.groupResponseCount !== current.groupResponseCount) return true;
  if (hasPositionChanged(previous, current)) return true;

  if (
    previous.medianScore != null &&
    current.medianScore != null &&
    Math.abs(current.medianScore - previous.medianScore) >= MEDIAN_STABLE_THRESHOLD
  ) {
    return true;
  }

  return false;
}
