import { describe, expect, it } from 'vitest';
import { computeHistoryTrend } from './position-history';

describe('position-history', () => {
  it('builds a sparkline trend from history points', () => {
    const trend = computeHistoryTrend([
      { recordedAt: '2026-07-01T10:00:00Z', lowerScorePercentage: 90, groupResponseCount: 20, rankPosition: 2 },
      { recordedAt: '2026-07-02T10:00:00Z', lowerScorePercentage: 80, groupResponseCount: 22, rankPosition: 4 },
      { recordedAt: '2026-07-03T10:00:00Z', lowerScorePercentage: 65, groupResponseCount: 24, rankPosition: 8 },
    ]);

    expect(trend).toEqual({
      from: 90,
      to: 65,
      delta: -25,
      sparkline: [90, 80, 65],
    });
  });

  it('returns null when fewer than two valid points exist', () => {
    expect(
      computeHistoryTrend([
        { recordedAt: '2026-07-01T10:00:00Z', lowerScorePercentage: null, groupResponseCount: 20, rankPosition: null },
      ]),
    ).toBeNull();
  });
});
