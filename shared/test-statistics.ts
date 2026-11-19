import type { StatisticsResult } from './contracts';

/** Pads leading bucket counts to sixteen elements for contract tests. */
export function fineBuckets(counts: number[]): number[] {
  const padded = [...counts];
  while (padded.length < 16) padded.push(0);
  return padded.slice(0, 16);
}

export function makeStatisticsResult(overrides: Partial<StatisticsResult> & Pick<StatisticsResult, 'detailsAvailable'>): StatisticsResult {
  const base: StatisticsResult = {
    detailsAvailable: overrides.detailsAvailable,
    totalValidResponses: 0,
    sameTrackCount: 0,
    sameCountryCount: null,
    groupResponseCount: 0,
    medianScore: null,
    lowerScorePercentage: null,
    rankPosition: null,
    rankTotal: null,
    trackWideMedian: null,
    scoreBuckets: null,
    cohortScope: null,
    cohortGroupId: null,
  };

  return { ...base, ...overrides };
}
