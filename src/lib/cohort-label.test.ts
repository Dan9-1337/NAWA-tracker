import { describe, expect, it } from 'vitest';
import { en } from '../i18n/en';
import { cohortLabel } from './cohort-label';

describe('cohortLabel', () => {
  it('names the country, the pooled group, or all countries', () => {
    expect(cohortLabel(en, 'en', 'country', 'UA', null)).toBe('Ukraine');
    expect(cohortLabel(en, 'en', 'group', 'GE', 'east')).toBe('Eastern Europe and Central Asia');
    expect(cohortLabel(en, 'en', 'track', 'GE', null)).toBe('all countries');
    expect(cohortLabel(en, 'en', null, 'GE', null)).toBe('Georgia');
  });

  it('falls back to the raw group id for a group the copy does not know yet', () => {
    expect(cohortLabel(en, 'en', 'group', 'GE', 'new-group')).toBe('new-group');
  });
});
