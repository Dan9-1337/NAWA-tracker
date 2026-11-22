import { describe, expect, it } from 'vitest';
import { cohortLabel } from './cohort-label';

describe('cohortLabel', () => {
  it('names the applicant’s country of citizenship', () => {
    expect(cohortLabel('en', 'UA')).toBe('Ukraine');
    expect(cohortLabel('en', 'GE')).toBe('Georgia');
  });

  it('falls back to a dash for an unknown country code', () => {
    expect(cohortLabel('en', 'XX')).toBe('—');
    expect(cohortLabel('en', '')).toBe('—');
  });
});
