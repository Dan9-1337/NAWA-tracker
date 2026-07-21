import { describe, expect, it } from 'vitest';
import { getInitialStatusOptions, getSequentialStatusOptions } from './status-options';

describe('getSequentialStatusOptions', () => {
  it('from submitted only offers nearby formal-review steps', () => {
    expect(getSequentialStatusOptions('submitted')).toEqual([
      'submitted',
      'formal_review_in_progress',
      'correction_requested',
      'formal_review_completed',
    ]);
  });

  it('does not offer award outcomes until awaiting_decision', () => {
    expect(getSequentialStatusOptions('submitted')).not.toContain('scholarship_awarded');
    expect(getSequentialStatusOptions('formal_review_completed')).not.toContain('scholarship_awarded');
    expect(getSequentialStatusOptions('awaiting_decision')).toEqual([
      'awaiting_decision',
      'scholarship_awarded',
      'scholarship_not_awarded',
    ]);
  });

  it('keeps terminal statuses as current-only', () => {
    expect(getSequentialStatusOptions('scholarship_awarded')).toEqual(['scholarship_awarded']);
    expect(getSequentialStatusOptions('merit_review_negative')).toEqual(['merit_review_negative']);
  });
});

describe('getInitialStatusOptions', () => {
  it('exposes the full status list for first declaration', () => {
    expect(getInitialStatusOptions().length).toBe(10);
    expect(getInitialStatusOptions()[0]).toBe('submitted');
  });
});
