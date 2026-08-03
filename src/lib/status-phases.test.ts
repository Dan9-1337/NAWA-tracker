import { describe, expect, it } from 'vitest';
import { getStatusOutcomeTone, getStatusPhase, getStatusPhaseIndex } from './status-phases';

describe('status-phases', () => {
  it('maps statuses to macro phases', () => {
    expect(getStatusPhase('submitted')).toBe('submitted');
    expect(getStatusPhase('formal_review_positive')).toBe('formal');
    expect(getStatusPhase('merit_review_positive')).toBe('merit');
    expect(getStatusPhase('scholarship_awarded')).toBe('outcome');
  });

  it('orders phases for the stepper', () => {
    expect(getStatusPhaseIndex('submitted')).toBe(0);
    expect(getStatusPhaseIndex('formal_review_positive')).toBe(1);
    expect(getStatusPhaseIndex('merit_review_positive')).toBe(2);
    expect(getStatusPhaseIndex('scholarship_awarded')).toBe(3);
    expect(getStatusPhaseIndex('merit_review_negative')).toBe(2);
  });

  it('detects positive and negative outcomes', () => {
    expect(getStatusOutcomeTone('scholarship_awarded')).toBe('positive');
    expect(getStatusOutcomeTone('merit_review_negative')).toBe('negative');
    expect(getStatusOutcomeTone('formal_review_positive')).toBe('neutral');
  });
});
