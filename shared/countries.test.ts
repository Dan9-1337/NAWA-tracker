import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  countryCodes,
  countryMaximumGrades,
  defaultMaximumGradeForSchoolCountry,
  getCountryDisplayName,
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

  describe('getCountryDisplayName', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('returns Belarusian names even when Intl.DisplayNames answers in English (A1)', () => {
      class EnglishDisplayNames {
        of(code: string) {
          return code === 'UA' ? 'Ukraine' : code;
        }
      }
      vi.stubGlobal('Intl', { ...Intl, DisplayNames: EnglishDisplayNames });

      expect(getCountryDisplayName('UA', 'be')).toBe('Украіна');
    });

    it('has a Cyrillic Belarusian name for every offered country (A2)', () => {
      for (const code of countryCodes) {
        const name = getCountryDisplayName(code, 'be');
        expect(name, code).toBeTruthy();
        expect(name, code).not.toBe(code);
        expect(name, code).toMatch(/\p{Script=Cyrillic}/u);
      }
      expect(getCountryDisplayName('BY', 'be')).toBe('Беларусь');
    });

    it('falls back to Intl.DisplayNames, then null, for a code missing from the Belarusian table (A4)', () => {
      expect(getCountryDisplayName('Atlantis', 'be')).toBeNull();
      expect(getCountryDisplayName('', 'be')).toBeNull();

      class FakeDisplayNames {
        of() {
          return 'Fake land';
        }
      }
      vi.stubGlobal('Intl', { ...Intl, DisplayNames: FakeDisplayNames });
      expect(getCountryDisplayName('QQ', 'be')).toBe('Fake land');
    });

    it('keeps using Intl.DisplayNames for other locales (A8)', () => {
      expect(getCountryDisplayName('UA', 'pl')).toBe('Ukraina');
      expect(getCountryDisplayName('UA', 'ru')).toBe('Украина');
      expect(getCountryDisplayName('UA', 'uk')).toBe('Україна');
      expect(getCountryDisplayName('UA', 'en')).toBe('Ukraine');
    });
  });
});
