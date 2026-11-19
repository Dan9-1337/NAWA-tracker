import { describe, expect, it } from 'vitest';
import { getStatusOutcomeTone, getStatusPhase } from './status-phases';

describe('status-phases', () => {
  it('maps statuses to macro phases', () => {
    expect(getStatusPhase('submitted')).toBe('submitted');
    expect(getStatusPhase('formal_review_positive')).toBe('formal');
    expect(getStatusPhase('merit_review_positive')).toBe('merit');
    expect(getStatusPhase('scholarship_awarded')).toBe('outcome');
  });

  it('detects positive and negative outcomes', () => {
    expect(getStatusOutcomeTone('scholarship_awarded')).toBe('positive');
    expect(getStatusOutcomeTone('merit_review_negative')).toBe('negative');
    expect(getStatusOutcomeTone('formal_review_positive')).toBe('neutral');
  });
});
