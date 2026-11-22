import type { StatisticsResult } from './contracts';

/** Pads leading bucket counts to sixteen elements for contract tests. */
export function fineBuckets(counts: number[]): number[] {
  const padded = [...counts];
  while (padded.length < 16) padded.push(0);
  return padded.slice(0, 16);
}

/**
 * A statistics payload that satisfies `statisticsResultSchema`: a full country cohort from two surveys, or the
 * "only you" payload with every detail suppressed. Overrides can move it anywhere in between.
 */
export function makeStatisticsResult(overrides: Partial<StatisticsResult> & Pick<StatisticsResult, 'detailsAvailable'>): StatisticsResult {
  const base: StatisticsResult = overrides.detailsAvailable
    ? {
        detailsAvailable: true,
        totalValidResponses: 2,
        sameTrackCount: 2,
        sameCountryCount: 2,
        groupResponseCount: 2,
        medianScore: 60,
        lowerScorePercentage: 0,
        rankPosition: 1,
        rankTotal: 2,
        trackWideMedian: null,
        scoreBuckets: fineBuckets([2]),
        cohortScope: 'country',
        cohortGroupId: null,
      }
    : {
        detailsAvailable: false,
        totalValidResponses: 1,
        sameTrackCount: 1,
        sameCountryCount: 1,
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
