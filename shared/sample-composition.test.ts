import { describe, expect, it } from 'vitest';
import {
  computeEffectiveCountryCount,
  computeSampleCompositionQuality,
} from './sample-composition';

describe('computeEffectiveCountryCount', () => {
  it('distinguishes 200 applications from 2 countries vs 10 countries', () => {
    const twoCountries = computeEffectiveCountryCount([0.5, 0.5]);
    const tenCountries = computeEffectiveCountryCount(Array(10).fill(0.1));

    expect(twoCountries).toBeCloseTo(2, 5);
    expect(tenCountries).toBeCloseTo(10, 5);
    expect(tenCountries).toBeGreaterThan(twoCountries);
  });
});

describe('computeSampleCompositionQuality', () => {
  it('marks a mature multi-country sample as broad', () => {
    const quality = computeSampleCompositionQuality({
      countryCounts: [
        { country: 'BY', applicationCount: 240 },
        { country: 'UA', applicationCount: 110 },
        { country: 'KZ', applicationCount: 35 },
        { country: 'LT', applicationCount: 28 },
        { country: 'CZ', applicationCount: 14 },
        { country: 'OTHER', applicationCount: 33 },
      ],
      shareStability: 'stable',
      largestCohortsStable: true,
    });

    expect(quality.totalApplicationCount).toBe(460);
    expect(quality.representedCountryCount).toBe(6);
    expect(quality.effectiveCountryCount).toBeGreaterThan(2.5);
    expect(quality.sufficientCrossCountryCoverage).toBe(true);
    expect(quality.level).toBe('broad');
  });

  it('marks a single-channel dominated sample as insufficient', () => {
    const quality = computeSampleCompositionQuality({
      countryCounts: [
        { country: 'BY', applicationCount: 80 },
        { country: 'UA', applicationCount: 5 },
        { country: 'KZ', applicationCount: 4 },
        { country: 'OTHER', applicationCount: 3 },
      ],
    });

    expect(quality.totalApplicationCount).toBe(92);
    expect(quality.effectiveCountryCount).toBeLessThan(2);
    expect(quality.level).toBe('insufficient');
  });

  it('does not equate effectiveCountryCount with representedCountryCount', () => {
    const concentrated = computeSampleCompositionQuality({
      countryCounts: [
        { country: 'BY', applicationCount: 100 },
        { country: 'UA', applicationCount: 100 },
      ],
    });
    const spread = computeSampleCompositionQuality({
      countryCounts: Array.from({ length: 10 }, (_, index) => ({
        country: `C${index}`,
        applicationCount: 20,
      })),
    });

    expect(concentrated.representedCountryCount).toBe(2);
    expect(spread.representedCountryCount).toBe(10);
    expect(spread.effectiveCountryCount).toBeGreaterThan(concentrated.effectiveCountryCount);
  });

  it('sorts country shares by application count descending', () => {
    const quality = computeSampleCompositionQuality({
      countryCounts: [
        { country: 'LT', applicationCount: 10 },
        { country: 'BY', applicationCount: 50 },
        { country: 'UA', applicationCount: 30 },
      ],
    });

    expect(quality.countryShares[0]?.country).toBe('BY');
    expect(quality.countryShares[1]?.country).toBe('UA');
    expect(quality.countryShares[2]?.country).toBe('LT');
  });
});
