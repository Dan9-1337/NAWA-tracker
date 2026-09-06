import { describe, expect, it } from 'vitest';
import { en } from '../i18n/en';
import { formatAllocationConfidenceExplanation } from './allocation-confidence-explanation';

describe('formatAllocationConfidenceExplanation', () => {
  it('formats small_sample in the active locale', () => {
    expect(
      formatAllocationConfidenceExplanation(en.dashboard.allocation.confidence, 'en', {
        kind: 'small_sample',
        applications: 18,
        countries: 5,
      }),
    ).toBe('The overall NAWAmeter sample is still small (18 applications from 5 countries).');
  });
});
