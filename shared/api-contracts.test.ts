import { describe, expect, it } from 'vitest';
import { fineBuckets } from './test-statistics';
import {
  apiErrorSchema,
  createResponseRequestSchema,
  createResponseResultSchema,
  createScholarshipReportRequestSchema,
  currentResponseRequestSchema,
  currentResponseResultSchema,
  deleteScholarshipReportResultSchema,
  orientationMarkResultSchema,
  scholarshipReportMutationResultSchema,
  scholarshipReportResultSchema,
  statisticsRequestSchema,
  statisticsResultSchema,
  updateResponseRequestSchema,
  updateResponseResultSchema,
  updateScholarshipReportRequestSchema,
} from './validation';

const validForm = {
  intakeYear: 2026,
  hasPolishCitizenship: false,
  rankingCountry: 'UA',
  schoolCountry: 'UA',
  scholarshipTrack: 'nawa_director',
  studyRoute: 'direct_studies',
  targetUniversity: 'science-096',
  studyField: '0613',
  gradeBasis: 'final_certificate',
  applicantKind: 'school_leaver',
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
  rankPosition: 6,
  rankTotal: 10,
  trackWideMedian: null,
  scoreBuckets: fineBuckets([1, 2, 3, 2, 2]),
  cohortScope: 'country',
  cohortGroupId: null,
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
  });

  it('accepts normalized API errors', () => {
    expect(apiErrorSchema.parse({ error: { code: 'UNAUTHORIZED', message: 'Session is invalid or has expired.' } }))
      .toEqual({ error: { code: 'UNAUTHORIZED', message: 'Session is invalid or has expired.' } });
  });

  it('accepts the score-change limit error with an optional ISO retry time', () => {
    const limited = {
      error: {
        code: 'EDIT_LIMIT_REACHED',
        message: 'Too many score changes in the last 24 hours. Try again later.',
        retryAt: '2026-11-23T14:05:00Z',
      },
    };
    expect(apiErrorSchema.parse(limited)).toEqual(limited);
    expect(apiErrorSchema.parse({ error: { code: 'PROFILE_EXISTS', message: 'Already exists.' } }))
      .toEqual({ error: { code: 'PROFILE_EXISTS', message: 'Already exists.' } });
    expect(() =>
      apiErrorSchema.parse({ error: { ...limited.error, retryAt: 'in a while' } }),
    ).toThrow();
  });
});

describe('orientation mark contracts', () => {
  it('accepts the mark with n and only numbers', () => {
    expect(orientationMarkResultSchema.parse({ mark: 72, n: 3 })).toEqual({ mark: 72, n: 3 });
    expect(orientationMarkResultSchema.parse({ mark: 72, n: 3, scores: [72, 80, 95] })).toEqual({
      mark: 72,
      n: 3,
      scores: [72, 80, 95],
    });
    expect(orientationMarkResultSchema.parse({ mark: null, n: 0 })).toEqual({ mark: null, n: 0 });
  });

  it('rejects any field that is not the mark, n or the score list', () => {
    for (const extra of [
      { identityHash: 'a'.repeat(64) },
      { surveyId: crypto.randomUUID() },
      { reportId: crypto.randomUUID() },
      { programmeId: 'informatyka' },
      { scoreSnapshot: 72 },
    ]) {
      expect(() => orientationMarkResultSchema.parse({ mark: 72, n: 3, ...extra })).toThrow();
    }
  });

  it('keeps the mark, n and the score list consistent', () => {
    expect(() => orientationMarkResultSchema.parse({ mark: null, n: 1 })).toThrow();
    expect(() => orientationMarkResultSchema.parse({ mark: 72, n: 0 })).toThrow();
    expect(() => orientationMarkResultSchema.parse({ mark: 72, n: 2, scores: [72] })).toThrow();
    expect(() => orientationMarkResultSchema.parse({ mark: 72, n: 2, scores: [72, 80, 95] })).toThrow();
    expect(() => orientationMarkResultSchema.parse({ mark: 80, n: 2, scores: [72, 95] })).toThrow();
    expect(() => orientationMarkResultSchema.parse({ mark: 72, n: 2, scores: [95, 72] })).toThrow();
    expect(() => orientationMarkResultSchema.parse({ mark: 72, n: 1, scores: [] })).toThrow();
    expect(() => orientationMarkResultSchema.parse({ mark: 72, n: 1, scores: [72, 72] })).toThrow();
  });
});

describe('scholarship report contracts', () => {
  const report = {
    studyRoute: 'preparatory_course' as const,
    prepCentreId: 'umcs-lublin',
    programmeId: 'prawo',
    programmeName: 'Prawo',
    universityId: 'science-078',
    scoreSnapshot: 72,
  };

  it('accepts and updates only the answer fields', () => {
    const request = {
      report: {
        studyRoute: 'preparatory_course',
        prepCentreId: 'umcs-lublin',
        programmeId: 'prawo',
        universityId: 'science-078',
      },
    };

    expect(createScholarshipReportRequestSchema.parse(request)).toEqual(request);
    expect(updateScholarshipReportRequestSchema.parse(request)).toEqual(request);
    expect(() =>
      createScholarshipReportRequestSchema.parse({ ...request, intakeYear: 2026 }),
    ).toThrow();
    expect(() =>
      updateScholarshipReportRequestSchema.parse({
        report: { ...request.report, scoreSnapshot: 99 },
      }),
    ).toThrow();
  });

  it('accepts the own-report envelope with and without a report', () => {
    expect(scholarshipReportResultSchema.parse({ report })).toEqual({ report });
    expect(scholarshipReportResultSchema.parse({ report: null })).toEqual({ report: null });
    expect(scholarshipReportMutationResultSchema.parse({ report })).toEqual({ report });
    expect(deleteScholarshipReportResultSchema.parse({ deleted: true })).toEqual({ deleted: true });
  });

  it('rejects a mutation result without a report or with a low snapshot', () => {
    expect(() => scholarshipReportMutationResultSchema.parse({ report: null })).toThrow();
    expect(() =>
      scholarshipReportMutationResultSchema.parse({ report: { ...report, scoreSnapshot: 58 } }),
    ).toThrow();
  });
});
