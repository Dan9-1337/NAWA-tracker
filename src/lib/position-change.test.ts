import { describe, expect, it } from 'vitest';
import { makeStatisticsResult } from '../../shared/test-statistics';
import {
  explainPositionChange,
  hasGrowthActivity,
  hasPositionChanged,
  hasReturningVisitChanges,
} from './position-change';
import type { StatsSnapshot } from './stats-snapshot';

const previous: StatsSnapshot = {
  groupResponseCount: 14,
  lowerScorePercentage: 90,
  medianScore: 76,
  rankPosition: 4,
  sameTrackCount: 20,
  sameCountryCount: 14,
  cohortScores: [92, 88, 85, 80, 78, 76, 74, 70],
  fetchedAt: '2026-07-20T10:00:00.000Z',
};

const current = makeStatisticsResult({
  detailsAvailable: true,
  totalValidResponses: 30,
  sameTrackCount: 28,
  sameCountryCount: 27,
  groupResponseCount: 27,
  medianScore: 78.1,
  lowerScorePercentage: 65,
  rankPosition: 8,
  scoreBuckets: Array.from({ length: 16 }, () => 1),
  cohortScores: [95, 93, 92, 88, 85, 80, 78, 76, 74, 70],
});

describe('position-change', () => {
  it('detects percentile and rank movement', () => {
    expect(hasPositionChanged(previous, current)).toBe(true);
  });

  it('explains movement with typed reasons from cohort scores', () => {
    const reasons = explainPositionChange(previous, current, 80);
    expect(reasons).toContainEqual({ kind: 'cohort_size_changed', count: 13 });
    expect(reasons).toContainEqual({ kind: 'new_higher_scores', count: 2 });
    expect(reasons).toContainEqual({ kind: 'median_changed', delta: 2.1, direction: 'up' });
  });

  it('detects growth card activity', () => {
    expect(
      hasGrowthActivity({
        newResponsesTotal: 34,
        newResponsesInGroup: 12,
        medianThen: 76,
        medianNow: 77.4,
        percentileThen: 72,
        percentileNow: 65,
        trackNewResponses: 20,
        trackMedianThen: 75,
        trackMedianNow: 76,
        statusUpdatesInGroup: 2,
      }),
    ).toBe(true);
  });

  it('detects returning visit changes from meaningful snapshot deltas only', () => {
    expect(hasReturningVisitChanges(previous, current)).toBe(true);
    expect(
      hasReturningVisitChanges(previous, {
        ...current,
        groupResponseCount: previous.groupResponseCount,
        lowerScorePercentage: previous.lowerScorePercentage,
        rankPosition: previous.rankPosition,
        medianScore: previous.medianScore,
        sameCountryCount: previous.sameCountryCount,
        growth7d: {
          newResponsesTotal: 10,
          newResponsesInGroup: 0,
          medianThen: 76,
          medianNow: 76,
          percentileThen: 90,
          percentileNow: 90,
          trackNewResponses: 10,
          trackMedianThen: 75,
          trackMedianNow: 75,
          statusUpdatesInGroup: 0,
        },
      }),
    ).toBe(false);
  });
});
