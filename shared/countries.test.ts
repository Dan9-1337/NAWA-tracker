import { describe, expect, it } from 'vitest';
import {
  countryCodes,
  countryMaximumGrades,
  defaultMaximumGradeForSchoolCountry,
  isCountryCode,
  popularCountryCodes,
} from './countries';

describe('countries', () => {
  it('maps known school countries to a default maximum grade', () => {
    expect(defaultMaximumGradeForSchoolCountry('UA')).toBe(12);
    expect(defaultMaximumGradeForSchoolCountry('BY')).toBe(10);
    expect(defaultMaximumGradeForSchoolCountry('KZ')).toBe(5);
    expect(defaultMaximumGradeForSchoolCountry('US')).toBeNull();
  });

  it('rejects non-ISO and excluded country values', () => {
    expect(defaultMaximumGradeForSchoolCountry('Ukraina')).toBeNull();
    expect(isCountryCode('UA')).toBe(true);
    expect(isCountryCode('US')).toBe(true);
    expect(isCountryCode('PL')).toBe(false);
    expect(isCountryCode('OTHER')).toBe(false);
    expect(isCountryCode('Ukraina')).toBe(false);
  });

  it('excludes Poland from the selectable list', () => {
    expect(countryCodes.includes('PL' as (typeof countryCodes)[number])).toBe(false);
    expect(popularCountryCodes.includes('PL' as never)).toBe(false);
  });

  it('offers a full ISO set without OTHER', () => {
    expect(countryCodes.length).toBeGreaterThan(200);
    expect(countryCodes.includes('OTHER' as (typeof countryCodes)[number])).toBe(false);
  });

  it('defines maximum grades only for known school systems', () => {
    for (const code of Object.keys(countryMaximumGrades)) {
      expect(isCountryCode(code)).toBe(true);
    }
  });
});
