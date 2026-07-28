import { describe, expect, it } from 'vitest';
import {
  countryCodes,
  countryMaximumGrades,
  defaultMaximumGradeForSchoolCountry,
  isCountryCode,
} from './countries';

describe('countries', () => {
  it('maps known school countries to a default maximum grade', () => {
    expect(defaultMaximumGradeForSchoolCountry('UA')).toBe(12);
    expect(defaultMaximumGradeForSchoolCountry('BY')).toBe(10);
    expect(defaultMaximumGradeForSchoolCountry('KZ')).toBe(5);
    expect(defaultMaximumGradeForSchoolCountry('OTHER')).toBeNull();
  });

  it('rejects non-ISO country values', () => {
    expect(defaultMaximumGradeForSchoolCountry('Ukraina')).toBeNull();
    expect(isCountryCode('UA')).toBe(true);
    expect(isCountryCode('Ukraina')).toBe(false);
  });

  it('defines a maximum grade entry for every country code', () => {
    for (const code of countryCodes) {
      expect(code in countryMaximumGrades).toBe(true);
    }
  });
});
