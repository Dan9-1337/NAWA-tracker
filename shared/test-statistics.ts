import type { StatisticsResult } from './contracts';

/** Pads leading bucket counts to sixteen elements for contract tests. */
export function fineBuckets(counts: number[]): number[] {
  const padded = [...counts];
  while (padded.length < 16) padded.push(0);
  return padded.slice(0, 16);
}

export const emptyStatisticsExtensions = {
  growth7d: null,
  history: [],
} as const;

export function makeStatisticsResult(overrides: Partial<StatisticsResult> & Pick<StatisticsResult, 'detailsAvailable'>): StatisticsResult {
  const base: StatisticsResult = {
    detailsAvailable: overrides.detailsAvailable,
    totalValidResponses: 0,
    sameTrackCount: 0,
    sameCountryCount: null,
    groupResponseCount: 0,
    medianScore: null,
    lowerScorePercentage: null,
    scoreBuckets: null,
    growth7d: null,
    history: [],
  };

  return { ...base, ...overrides };
}
