import { describe, expect, it } from 'vitest';
import {
  calculateAllocationRange,
  calculateCountryAllocation,
  calculateCountryGroupAllocation,
  getAllocationDisplayMode,
  getConfidenceExplanation,
  shouldShowAllocationEstimate,
} from './allocation-calculator';
import { computeSampleCompositionQuality } from './sample-composition';

function matureComposition() {
  return computeSampleCompositionQuality({
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
}

function immatureComposition() {
  return computeSampleCompositionQuality({
    countryCounts: [
      { country: 'BY', applicationCount: 80 },
      { country: 'UA', applicationCount: 5 },
      { country: 'KZ', applicationCount: 4 },
      { country: 'OTHER', applicationCount: 3 },
    ],
  });
}

describe('calculateAllocationRange', () => {
  it('returns a range around the proportional seat estimate', () => {
    const range = calculateAllocationRange(0.048, 500);
    expect(range.min).toBeLessThanOrEqual(24);
    expect(range.max).toBeGreaterThanOrEqual(24);
    expect(range.min).toBeLessThan(range.max);
  });

  it('returns zero range for zero share', () => {
    expect(calculateAllocationRange(0, 500)).toEqual({ min: 0, max: 0 });
  });
});

describe('calculateCountryAllocation', () => {
  it('computes share and range for a country scope', () => {
    const estimate = calculateCountryAllocation({
      country: 'KZ',
      applicationCountInScope: 37,
      totalApplicationCount: 460,
      totalSeatScenario: 500,
      userRankInScope: 9,
    });

    expect(estimate.scope).toBe('country');
    expect(estimate.scopeId).toBe('KZ');
    expect(estimate.applicationShare).toBeCloseTo(37 / 460, 5);
    expect(estimate.estimatedSeatRange.min).toBeGreaterThan(0);
    expect(estimate.userRankInScope).toBe(9);
    expect(estimate.isOfficial).toBe(false);
  });

  it('increases the range when country share grows', () => {
    const lowerShare = calculateCountryAllocation({
      country: 'KZ',
      applicationCountInScope: 20,
      totalApplicationCount: 500,
      totalSeatScenario: 500,
    });
    const higherShare = calculateCountryAllocation({
      country: 'KZ',
      applicationCountInScope: 50,
      totalApplicationCount: 500,
      totalSeatScenario: 500,
    });

    expect(higherShare.estimatedSeatRange.max).toBeGreaterThan(lowerShare.estimatedSeatRange.max);
  });
});

describe('calculateCountryGroupAllocation', () => {
  it('computes share for a group scope', () => {
    const estimate = calculateCountryGroupAllocation({
      groupId: 'region-iv-2019',
      applicationCountInScope: 120,
      totalApplicationCount: 460,
      totalSeatScenario: 500,
    });

    expect(estimate.scope).toBe('country_group');
    expect(estimate.scopeId).toBe('region-iv-2019');
    expect(estimate.applicationShare).toBeCloseTo(120 / 460, 5);
  });
});

describe('shouldShowAllocationEstimate', () => {
  it('returns true for a mature multi-country sample even with two dominant countries', () => {
    const sampleComposition = matureComposition();

    expect(
      shouldShowAllocationEstimate({
        totalApplicationCount: sampleComposition.totalApplicationCount,
        applicationCountInScope: 35,
        scopeShareStability: 'stable',
        sampleComposition,
      }),
    ).toBe(true);
  });

  it('returns false for an immature sample dominated by one channel', () => {
    const sampleComposition = immatureComposition();

    expect(
      shouldShowAllocationEstimate({
        totalApplicationCount: sampleComposition.totalApplicationCount,
        applicationCountInScope: 80,
        scopeShareStability: 'stable',
        sampleComposition,
      }),
    ).toBe(false);
    expect(sampleComposition.level).toBe('insufficient');
  });

  it('returns false when scope share is volatile', () => {
    const sampleComposition = matureComposition();

    expect(
      shouldShowAllocationEstimate({
        totalApplicationCount: sampleComposition.totalApplicationCount,
        applicationCountInScope: 35,
        scopeShareStability: 'volatile',
        sampleComposition,
      }),
    ).toBe(false);
  });

  it('returns false when country scope is too small', () => {
    const sampleComposition = matureComposition();

    expect(
      shouldShowAllocationEstimate({
        totalApplicationCount: sampleComposition.totalApplicationCount,
        applicationCountInScope: 5,
        scopeShareStability: 'stable',
        sampleComposition,
      }),
    ).toBe(false);
  });
});

describe('getAllocationDisplayMode', () => {
  it('returns country_estimate for a large represented country', () => {
    const sampleComposition = matureComposition();

    expect(
      getAllocationDisplayMode({
        country: 'KZ',
        applicationCountInScope: 35,
        totalApplicationCount: 460,
        scopeShareStability: 'stable',
        sampleComposition,
      }),
    ).toBe('country_estimate');
  });

  it('returns country_and_group_estimate for a small country with a historical group', () => {
    const sampleComposition = matureComposition();

    expect(
      getAllocationDisplayMode({
        country: 'GE',
        applicationCountInScope: 12,
        totalApplicationCount: 460,
        scopeShareStability: 'stable',
        sampleComposition,
      }),
    ).toBe('country_and_group_estimate');
  });

  it('returns insufficient_data when gating fails', () => {
    const sampleComposition = immatureComposition();

    expect(
      getAllocationDisplayMode({
        country: 'BY',
        applicationCountInScope: 80,
        totalApplicationCount: 92,
        scopeShareStability: 'stable',
        sampleComposition,
      }),
    ).toBe('insufficient_data');
  });
});

describe('getConfidenceExplanation', () => {
  it('returns a full sentence instead of a bare confidence label', () => {
    const sampleComposition = matureComposition();
    const estimate = calculateCountryAllocation({
      country: 'KZ',
      applicationCountInScope: 35,
      totalApplicationCount: 460,
      totalSeatScenario: 500,
    });

    const explanation = getConfidenceExplanation(estimate, sampleComposition);

    expect(explanation.length).toBeGreaterThan(20);
    expect(explanation.toLowerCase()).not.toBe(estimate.confidence);
    expect(['low', 'medium', 'higher', 'insufficient']).not.toContain(explanation);
  });
});
