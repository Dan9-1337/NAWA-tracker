import { describe, expect, it } from 'vitest';
import { pl } from '../i18n/pl';
import { ru } from '../i18n/ru';
import { formatCountryLabel } from './country-label';

describe('formatCountryLabel', () => {
  it('localizes ISO country codes', () => {
    expect(formatCountryLabel('UA', pl.countries)).toBe('Ukraina');
    expect(formatCountryLabel('UA', ru.countries)).toBe('Украина');
  });

  it('falls back to OTHER for unknown values', () => {
    expect(formatCountryLabel('Ukraina', pl.countries)).toBe('Inny kraj');
    expect(formatCountryLabel('Atlantis', pl.countries)).toBe('Inny kraj');
  });
});
