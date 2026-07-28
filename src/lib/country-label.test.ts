import { describe, expect, it } from 'vitest';
import { formatCountryLabel } from './country-label';

describe('formatCountryLabel', () => {
  it('localizes ISO country codes', () => {
    expect(formatCountryLabel('UA', 'pl')).toBe('Ukraina');
    expect(formatCountryLabel('UA', 'ru')).toBe('Украина');
  });

  it('falls back for unknown values', () => {
    expect(formatCountryLabel('Ukraina', 'pl')).toBe('—');
    expect(formatCountryLabel('Atlantis', 'pl')).toBe('—');
    expect(formatCountryLabel('OTHER', 'pl')).toBe('—');
    expect(formatCountryLabel('PL', 'pl')).toBe('—');
    expect(formatCountryLabel(null, 'pl')).toBe('—');
  });
});
