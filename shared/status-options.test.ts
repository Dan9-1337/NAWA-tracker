import { describe, expect, it } from 'vitest';
import { getSequentialStatusOptions } from './status-options';

describe('getSequentialStatusOptions', () => {
  it('from submitted offers formal review positive', () => {
    expect(getSequentialStatusOptions('submitted')).toEqual(['submitted', 'formal_review_positive']);
  });

  it('from formal review offers merit outcomes', () => {
    expect(getSequentialStatusOptions('formal_review_positive')).toEqual([
      'formal_review_positive',
      'merit_review_positive',
      'merit_review_negative',
    ]);
  });

  it('from positive merit offers scholarship awarded', () => {
    expect(getSequentialStatusOptions('merit_review_positive')).toEqual([
      'merit_review_positive',
      'scholarship_awarded',
    ]);
  });

  it('keeps terminal statuses as current-only', () => {
    expect(getSequentialStatusOptions('scholarship_awarded')).toEqual(['scholarship_awarded']);
    expect(getSequentialStatusOptions('merit_review_negative')).toEqual(['merit_review_negative']);
  });
});
