import { describe, expect, it } from 'vitest';
import { awardedBand, outcomeAxisPosition, relateToOutcome } from './country-outcomes';

describe('outcome axis', () => {
  it('maps 60..100 onto 0..1 and clamps outside it', () => {
    expect(outcomeAxisPosition(60)).toBe(0);
    expect(outcomeAxisPosition(80)).toBe(0.5);
    expect(outcomeAxisPosition(100)).toBe(1);
    expect(outcomeAxisPosition(40)).toBe(0);
    expect(outcomeAxisPosition(130)).toBe(1);
  });

  it('relates a score to the awarded range, edges included', () => {
    const range = { low: 80, high: 95 };
    expect(relateToOutcome(80, range)).toBe('inside');
    expect(relateToOutcome(95, range)).toBe('inside');
    expect(relateToOutcome(79.9, range)).toBe('below');
    expect(relateToOutcome(95.1, range)).toBe('above');
  });
});

describe('awardedBand', () => {
  it('is null until the cohort is disclosed', () => {
    expect(awardedBand({ awardedBandLow: null, awardedBandHigh: null })).toBeNull();
    expect(awardedBand({ awardedBandLow: 70, awardedBandHigh: 90 })).toEqual({ low: 70, high: 90 });
  });
});
