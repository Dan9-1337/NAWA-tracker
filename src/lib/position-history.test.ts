import { describe, expect, it } from 'vitest';
import { computeHistoryTrend } from './position-history';
import { getStatusOutcomeTone, getStatusPhase, getStatusPhaseIndex } from './status-phases';

describe('status-phases', () => {
  it('maps statuses to macro phases', () => {
    expect(getStatusPhase('submitted')).toBe('submitted');
    expect(getStatusPhase('correction_requested')).toBe('formal');
    expect(getStatusPhase('merit_review_in_progress')).toBe('merit');
    expect(getStatusPhase('awaiting_decision')).toBe('outcome');
  });

  it('orders phases for the stepper', () => {
    expect(getStatusPhaseIndex('submitted')).toBe(0);
    expect(getStatusPhaseIndex('formal_review_completed')).toBe(1);
    expect(getStatusPhaseIndex('merit_review_positive')).toBe(2);
    expect(getStatusPhaseIndex('scholarship_awarded')).toBe(3);
  });

  it('detects positive and negative outcomes', () => {
    expect(getStatusOutcomeTone('scholarship_awarded')).toBe('positive');
    expect(getStatusOutcomeTone('merit_review_negative')).toBe('negative');
    expect(getStatusOutcomeTone('formal_review_in_progress')).toBe('neutral');
  });
});

describe('position-history', () => {
  it('builds a sparkline trend from history points', () => {
    const trend = computeHistoryTrend([
      { recordedAt: '2026-07-01T10:00:00Z', lowerScorePercentage: 90, groupResponseCount: 20 },
      { recordedAt: '2026-07-02T10:00:00Z', lowerScorePercentage: 80, groupResponseCount: 22 },
      { recordedAt: '2026-07-03T10:00:00Z', lowerScorePercentage: 65, groupResponseCount: 24 },
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
        { recordedAt: '2026-07-01T10:00:00Z', lowerScorePercentage: null, groupResponseCount: 20 },
      ]),
    ).toBeNull();
  });
});
