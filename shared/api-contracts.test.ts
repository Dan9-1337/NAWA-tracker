import { describe, expect, it } from 'vitest';
import { fineBuckets } from './test-statistics';
import {
  apiErrorSchema,
  createResponseRequestSchema,
  createResponseResultSchema,
  currentResponseRequestSchema,
  currentResponseResultSchema,
  publicStatisticsRequestSchema,
  publicStatisticsResultSchema,
  statisticsRequestSchema,
  statisticsResultSchema,
  updateResponseRequestSchema,
  updateResponseResultSchema,
} from './validation';

const validForm = {
  hasPolishCitizenship: false,
  rankingCountry: 'UA',
  schoolCountry: 'UA',
  scholarshipTrack: 'nawa_director',
  studyRoute: 'direct_studies',
  targetUniversity: 'science-096',
  averageGrade: 85,
  maximumGrade: 100,
  polishSchoolLevel: 'none',
  currentStatus: 'submitted',
  statusChangedAt: '2026-07-13',
} as const;

const validStatistics = {
  detailsAvailable: true,
  totalValidResponses: 20,
  sameTrackCount: 18,
  sameCountryCount: 10,
  groupResponseCount: 10,
  medianScore: 82.5,
  lowerScorePercentage: 40,
  scoreBuckets: fineBuckets([1, 2, 3, 2, 2]),
  growth7d: null,
  history: [],
} as const;

describe('API request contracts', () => {
  it('accepts only questionnaire data for create', () => {
    const request = { response: validForm };

    expect(createResponseRequestSchema.parse(request)).toEqual(request);
    expect(() => createResponseRequestSchema.parse({ ...request, anonymousToken: crypto.randomUUID() })).toThrow();
    expect(() => createResponseRequestSchema.parse({ ...request, responseId: crypto.randomUUID() })).toThrow();
  });

  it('accepts questionnaire-only update payloads', () => {
    const request = { response: validForm };
    expect(updateResponseRequestSchema.parse(request)).toEqual(request);
  });

  it('accepts empty current and statistics request bodies', () => {
    expect(currentResponseRequestSchema.parse({})).toEqual({});
    expect(statisticsRequestSchema.parse({})).toEqual({});
  });

  it('accepts public statistics preview payloads', () => {
    const request = {
      scholarshipTrack: 'nawa_director',
      rankingCountry: 'UA',
      averageGrade: 4.5,
      maximumGrade: 5,
      polishSchoolLevel: 'secondary',
    } as const;

    expect(publicStatisticsRequestSchema.parse(request)).toEqual(request);
  });
});

describe('API response contracts', () => {
  it('accepts create and update mutation envelopes with statistics only', () => {
    expect(createResponseResultSchema.parse({ created: true, statistics: validStatistics })).toEqual({
      created: true,
      statistics: validStatistics,
    });
    expect(updateResponseResultSchema.parse({ updated: true, statistics: validStatistics })).toEqual({
      updated: true,
      statistics: validStatistics,
    });
  });

  it('accepts current response and statistics envelopes', () => {
    expect(currentResponseResultSchema.parse({ response: validForm })).toEqual({ response: validForm });
    expect(statisticsResultSchema.parse(validStatistics)).toEqual(validStatistics);
    expect(publicStatisticsResultSchema.parse(validStatistics)).toEqual(validStatistics);
  });

  it('accepts normalized API errors', () => {
    expect(apiErrorSchema.parse({ error: { code: 'UNAUTHORIZED', message: 'Sesja jest nieprawidłowa lub wygasła.' } }))
      .toEqual({ error: { code: 'UNAUTHORIZED', message: 'Sesja jest nieprawidłowa lub wygasła.' } });
  });
});
