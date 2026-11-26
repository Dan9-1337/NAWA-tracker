import { describe, expect, it } from 'vitest';
import {
  calculateNawaOrientationScore,
  getScoreBreakdown,
  isPolishSchoolBonusEligible,
  nawaOrientationThreshold,
} from './nawa-score';

describe('isPolishSchoolBonusEligible', () => {
  it('returns false for Belarus citizenship', () => {
    expect(isPolishSchoolBonusEligible('BY')).toBe(false);
  });

  it('returns true for other countries', () => {
    expect(isPolishSchoolBonusEligible('UA')).toBe(true);
    expect(isPolishSchoolBonusEligible('KZ')).toBe(true);
  });
});

describe('calculateNawaOrientationScore', () => {
  it('applies the published formula with no bonus', () => {
    expect(calculateNawaOrientationScore(90, 100, 'none', 'UA')).toBeCloseTo(81, 2);
  });

  it('adds the primary and secondary Polish-school bonuses', () => {
    expect(calculateNawaOrientationScore(90, 100, 'primary', 'UA')).toBeCloseTo(86, 2);
    expect(calculateNawaOrientationScore(90, 100, 'secondary', 'UA')).toBeCloseTo(91, 2);
  });

  it('denies Polish-school bonus for Belarus citizenship', () => {
    expect(getScoreBreakdown(90, 100, 'secondary', 'BY').polishSchoolBonus).toBe(0);
    expect(calculateNawaOrientationScore(90, 100, 'secondary', 'BY')).toBeCloseTo(81, 2);
    expect(calculateNawaOrientationScore(90, 100, 'secondary', 'UA')).toBeCloseTo(91, 2);
  });

  it('rounds to two decimals', () => {
    expect(calculateNawaOrientationScore(1, 3, 'none', 'UA')).toBeCloseTo(30, 2);
  });

  it('returns zero for a non-positive maximum grade', () => {
    expect(calculateNawaOrientationScore(10, 0, 'none', 'UA')).toBe(0);
  });

  it('exposes the published positive-review threshold', () => {
    expect(nawaOrientationThreshold).toBe(60);
  });
});

describe('parity with public.compute_orientation_score (supabase/tests/season_model.sql)', () => {
  it.each([
    [4.5, 5, 'secondary', 'UA', 'school_leaver', 91],
    [4.5, 5, 'secondary', 'BY', 'school_leaver', 81],
    [3.0, 5, 'primary', 'UA', 'school_leaver', 59],
    [4.75, 5, 'none', 'UA', 'student_in_poland', 100],
  ] as const)('%s/%s %s %s %s -> %s', (avg, max, level, country, kind, expected) => {
    expect(calculateNawaOrientationScore(avg, max, level, country, kind)).toBe(expected);
  });
});
