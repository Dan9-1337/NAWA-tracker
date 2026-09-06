import { describe, expect, it } from 'vitest';
import { makeStatisticsResult, emptyGlobalBenchmark, emptyCountryContext } from '../../shared/test-statistics';
import { fineBuckets } from '../../shared/test-statistics';
import { buildRadarFeed, filterRadarEvents } from './radar-feed';

const rich = makeStatisticsResult({
  detailsAvailable: true,
  totalValidResponses: 200,
  sameTrackCount: 180,
  sameCountryCount: 31,
  groupResponseCount: 31,
  medianScore: 81,
  lowerScorePercentage: 70,
  scoreBuckets: fineBuckets([1, 2, 3, 4, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1, 0]),
  growth7d: {
    newResponsesTotal: 40,
    newResponsesInGroup: 8,
    medianThen: 80,
    medianNow: 81,
    percentileThen: 68,
    percentileNow: 70,
    trackNewResponses: 34,
    trackMedianThen: 79,
    trackMedianNow: 80,
    statusUpdatesInGroup: 12,
  },
  reportedMeritOutcomes: {
    positiveCount: 6,
    negativeCount: 2,
    lowestReportedPositiveScore: 84,
    highestReportedNegativeScore: 79,
    boundaryState: 'interval',
  },
  globalBenchmark: {
    ...emptyGlobalBenchmark,
    sampleSize: 180,
    representedCountryCount: 12,
    median: 80,
    detailedCountriesCount: 7,
  },
  countryContext: {
    ...emptyCountryContext,
    countrySampleSize: 31,
    countryMedian: 81,
  },
});

describe('radar-feed', () => {
  it('builds privacy-safe events without names or exact new scores', () => {
    const events = buildRadarFeed({ data: rich, rankingCountry: 'KZ' });
    const serialized = JSON.stringify(events);
    expect(serialized).not.toMatch(/@/);
    expect(serialized).not.toMatch(/score:\s*\d/);
    expect(events.some((event) => event.kind === 'global_growth')).toBe(true);
    expect(events.some((event) => event.kind === 'status_pulse')).toBe(true);
    expect(events.some((event) => event.kind === 'country_detailed_opened')).toBe(true);
  });

  it('suppresses status/merit pulses for small country cohorts', () => {
    const small = {
      ...rich,
      sameCountryCount: null as number | null,
      detailsAvailable: false,
      groupResponseCount: 0,
      medianScore: null,
      lowerScorePercentage: null,
      scoreBuckets: null,
      countryContext: { ...emptyCountryContext, countrySampleSize: 6 },
      growth7d: {
        ...rich.growth7d!,
        statusUpdatesInGroup: 12,
        newResponsesInGroup: 3,
      },
      reportedMeritOutcomes: {
        positiveCount: 1,
        negativeCount: 0,
        lowestReportedPositiveScore: 90,
        highestReportedNegativeScore: null,
        boundaryState: 'positive_only' as const,
      },
    };

    const events = buildRadarFeed({ data: small, rankingCountry: 'KZ' });
    expect(events.some((event) => event.kind === 'status_pulse')).toBe(false);
    expect(events.some((event) => event.kind === 'merit_pulse')).toBe(false);
    expect(events.some((event) => event.kind === 'country_sample_growth')).toBe(false);
  });

  it('filters my_country vs all', () => {
    const events = buildRadarFeed({ data: rich, rankingCountry: 'KZ' });
    const mine = filterRadarEvents(events, 'my_country', 'KZ');
    const all = filterRadarEvents(events, 'all', 'KZ');
    expect(mine.every((event) => event.country === 'KZ')).toBe(true);
    expect(all.length).toBeGreaterThan(mine.length);
  });
});
