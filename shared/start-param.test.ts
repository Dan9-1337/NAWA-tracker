import { describe, expect, it } from 'vitest';
import { countryStartParam, parseStartCountry } from './start-param';

describe('start param', () => {
  it('reads a country from the prefixed and bare forms', () => {
    expect(parseStartCountry('c_UA')).toBe('UA');
    expect(parseStartCountry('c_ua')).toBe('UA');
    expect(parseStartCountry('KZ')).toBe('KZ');
  });

  it('ignores anything that is not a known country code', () => {
    expect(parseStartCountry('c_XXX')).toBeNull();
    expect(parseStartCountry('subscribe')).toBeNull();
    expect(parseStartCountry('c_PL')).toBeNull();
    expect(parseStartCountry('')).toBeNull();
    expect(parseStartCountry(null)).toBeNull();
  });

  it('round-trips through countryStartParam', () => {
    expect(parseStartCountry(countryStartParam('by'))).toBe('BY');
  });
});
