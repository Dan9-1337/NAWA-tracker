import { describe, expect, it } from 'vitest';
import {
  MIN_K_ANONYMITY,
  assertNoForbiddenGlobalMetrics,
  canShowCompetitionNeighbourhood,
  canShowCompetitiveRank,
  canShowCountryDetailedStats,
  canShowGlobalMedian,
  canShowGlobalPercentile,
  isGlobalCopySafe,
} from './product-rules';

describe('product-rules', () => {
  it('enforces k-anonymity threshold', () => {
    expect(MIN_K_ANONYMITY).toBe(10);
    expect(canShowCountryDetailedStats(9)).toBe(false);
    expect(canShowCountryDetailedStats(10)).toBe(true);
    expect(canShowGlobalMedian(9)).toBe(false);
    expect(canShowGlobalMedian(10)).toBe(true);
  });

  it('allows competitive rank only in country scope', () => {
    expect(canShowCompetitiveRank('country')).toBe(true);
    expect(canShowCompetitiveRank('global')).toBe(false);
  });

  it('allows global percentile only as secondary benchmark', () => {
    expect(canShowGlobalPercentile({ secondary: false })).toBe(false);
    expect(canShowGlobalPercentile({ secondary: true })).toBe(true);
  });

  it('gates competition neighbourhood on cohort size and scores', () => {
    expect(canShowCompetitionNeighbourhood(10, [80, 85])).toBe(true);
    expect(canShowCompetitionNeighbourhood(9, [80, 85])).toBe(false);
    expect(canShowCompetitionNeighbourhood(10, null)).toBe(false);
    expect(canShowCompetitionNeighbourhood(10, [])).toBe(false);
  });

  it('rejects rank fields in global scope payloads', () => {
    expect(() =>
      assertNoForbiddenGlobalMetrics({ rankPosition: 5, rankTotal: 100 }, 'global'),
    ).toThrow('forbidden_global_metric:rankPosition');

    expect(() =>
      assertNoForbiddenGlobalMetrics({ rankPosition: 5, rankTotal: 100 }, 'country'),
    ).not.toThrow();
  });

  it('flags forbidden global copy patterns', () => {
    expect(isGlobalCopySafe('Ваш результат выше 64% всей выборки NAWAmeter.')).toBe(true);
    expect(isGlobalCopySafe('Вы 143-й из 476')).toBe(false);
    expect(isGlobalCopySafe('You are 143rd of 476')).toBe(false);
    expect(isGlobalCopySafe('Казахстан слабее Беларуси')).toBe(false);
    expect(isGlobalCopySafe('Медиана Казахстана: 81,4')).toBe(true);
  });
});
