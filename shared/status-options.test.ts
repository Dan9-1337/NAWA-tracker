import { describe, expect, it } from 'vitest';
import { getStatusOptions } from './status-options';

describe('getStatusOptions', () => {
  it('from submitted offers every later stage, so late joiners can report the final outcome at once', () => {
    expect(getStatusOptions('submitted')).toEqual([
      'submitted',
      'formal_review_positive',
      'merit_review_positive',
      'merit_review_negative',
      'scholarship_awarded',
      'scholarship_not_awarded',
    ]);
  });

  it('from formal review offers the merit and seat outcomes', () => {
    expect(getStatusOptions('formal_review_positive')).toEqual([
      'formal_review_positive',
      'merit_review_positive',
      'merit_review_negative',
      'scholarship_awarded',
      'scholarship_not_awarded',
    ]);
  });

  it('never offers an earlier stage', () => {
    expect(getStatusOptions('merit_review_positive')).not.toContain('submitted');
    expect(getStatusOptions('merit_review_positive')).not.toContain('formal_review_positive');
  });

  it('from positive merit offers awarded or not awarded', () => {
    expect(getStatusOptions('merit_review_positive')).toEqual([
      'merit_review_positive',
      'scholarship_awarded',
      'scholarship_not_awarded',
    ]);
  });

  it('keeps a negative merit review as current-only', () => {
    expect(getStatusOptions('merit_review_negative')).toEqual(['merit_review_negative']);
  });

  it('lets the two seat decisions be corrected into each other', () => {
    expect(getStatusOptions('scholarship_awarded')).toEqual([
      'scholarship_awarded',
      'scholarship_not_awarded',
    ]);
    expect(getStatusOptions('scholarship_not_awarded')).toEqual([
      'scholarship_not_awarded',
      'scholarship_awarded',
    ]);
  });
});
