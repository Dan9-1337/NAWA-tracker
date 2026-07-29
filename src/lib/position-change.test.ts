import { describe, expect, it } from 'vitest';
import { fineBuckets, makeStatisticsResult } from '../../shared/test-statistics';
import { explainPositionChange, hasGrowthActivity, hasPositionChanged, hasReturningVisitChanges } from './position-change';
import type { StatsSnapshot } from './stats-snapshot';

const previous: StatsSnapshot = {
  groupResponseCount: 14,
  lowerScorePercentage: 90,
  medianScore: 76,
  sameTrackCount: 20,
  sameCountryCount: 14,
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
  scoreBuckets: Array.from({ length: 16 }, () => 1),
});

describe('position-change', () => {
  it('detects percentile movement', () => {
    expect(hasPositionChanged(previous, current)).toBe(true);
  });

  it('explains movement with new responses and median shift', () => {
    expect(explainPositionChange(previous, current)).toEqual([
      { kind: 'new_responses', count: 13 },
      { kind: 'median_shift', delta: 2.1, direction: 'up' },
    ]);
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
      }),
    ).toBe(true);
  });

  it('detects returning visit changes from snapshot deltas', () => {
    expect(hasReturningVisitChanges(previous, current)).toBe(true);
    expect(
      hasReturningVisitChanges(previous, {
        ...current,
        groupResponseCount: previous.groupResponseCount,
        lowerScorePercentage: previous.lowerScorePercentage,
        medianScore: previous.medianScore,
        growth7d: null,
      }),
    ).toBe(false);
  });
});
