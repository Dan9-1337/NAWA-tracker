import { describe, expect, it } from 'vitest';
import { calculateNawaOrientationScore, nawaOrientationThreshold } from './nawa-score';

describe('calculateNawaOrientationScore', () => {
  it('applies the published formula with no bonus', () => {
    expect(calculateNawaOrientationScore(90, 100, 'none')).toBeCloseTo(81, 2);
  });

  it('adds the primary and secondary Polish-school bonuses', () => {
    expect(calculateNawaOrientationScore(90, 100, 'primary')).toBeCloseTo(86, 2);
    expect(calculateNawaOrientationScore(90, 100, 'secondary')).toBeCloseTo(91, 2);
  });

  it('rounds to two decimals', () => {
    expect(calculateNawaOrientationScore(1, 3, 'none')).toBeCloseTo(30, 2);
  });

  it('returns zero for a non-positive maximum grade', () => {
    expect(calculateNawaOrientationScore(10, 0, 'none')).toBe(0);
  });

  it('exposes the published positive-review threshold', () => {
    expect(nawaOrientationThreshold).toBe(60);
  });
});
