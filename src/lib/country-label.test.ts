import { describe, expect, it } from 'vitest';
import { formatCountryLabel, getCountrySearchNames } from './country-label';

describe('formatCountryLabel', () => {
  it('localizes ISO country codes', () => {
    expect(formatCountryLabel('UA', 'pl')).toBe('Ukraina');
    expect(formatCountryLabel('UA', 'ru')).toBe('Украина');
    expect(formatCountryLabel('UA', 'be')).toBe('Украіна');
  });

  it('falls back for unknown values', () => {
    expect(formatCountryLabel('Ukraina', 'pl')).toBe('—');
    expect(formatCountryLabel('Atlantis', 'pl')).toBe('—');
    expect(formatCountryLabel('OTHER', 'pl')).toBe('—');
    expect(formatCountryLabel('PL', 'pl')).toBe('—');
    expect(formatCountryLabel(null, 'pl')).toBe('—');
  });

  it('lists the ISO code and the names in all five languages for search', () => {
    const names = getCountrySearchNames('UA');

    expect(names).toEqual(expect.arrayContaining(['UA', 'Ukraina', 'Ukraine', 'Украина', 'Україна', 'Украіна']));
    expect(new Set(names).size).toBe(names.length);
  });
});
