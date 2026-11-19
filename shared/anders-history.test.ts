import { describe, expect, it } from 'vitest';
import { andersHistory, awardedShare, namedCountriesShare } from './anders-history';

describe('andersHistory', () => {
  it('never claims more awards than applications', () => {
    for (const entry of andersHistory) {
      expect(entry.awarded).toBeLessThanOrEqual(entry.applications);
    }
  });

  it('keeps named country counts within the awarded total', () => {
    for (const entry of andersHistory) {
      const named = entry.awardedByCountry?.reduce((sum, [, awarded]) => sum + awarded, 0) ?? 0;
      expect(named).toBeLessThanOrEqual(entry.awarded);
    }
  });

  it('computes the awarded share', () => {
    const entry2024 = andersHistory.find((entry) => entry.year === 2024)!;
    expect(awardedShare(entry2024)).toBeCloseTo(619 / 1131, 5);
  });

  it('shows BY, UA and KZ as 85% of the 2021 first-cycle awards', () => {
    const entry2021 = andersHistory.find((entry) => entry.year === 2021 && entry.level === 'first_cycle')!;
    expect(namedCountriesShare(entry2021)).toBeCloseTo(401 / 471, 5);
    expect(namedCountriesShare(andersHistory.find((entry) => entry.year === 2024)!)).toBeNull();
  });

  it('only links https sources', () => {
    for (const entry of andersHistory) {
      expect(entry.sourceUrl.startsWith('https://')).toBe(true);
    }
  });
});
