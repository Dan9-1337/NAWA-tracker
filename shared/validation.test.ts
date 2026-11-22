import { describe, expect, it } from 'vitest';
import { applicationStatuses, polishSchoolLevels, scholarshipTracks, studyRoutes } from './contracts';
import { fineBuckets, makeStatisticsResult } from './test-statistics';
import {
  createResponseRequestSchema,
  responseFormInputSchema,
  scholarshipReportInputSchema,
  scholarshipReportSchema,
  scholarshipReportSummarySchema,
  statisticsRequestSchema,
  statisticsResultSchema,
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
};

describe('responseFormInputSchema', () => {
  it('uses only the active questionnaire scope enums', () => {
    expect(scholarshipTracks).toEqual(['nawa_director', 'health_minister', 'culture_minister']);
    expect(studyRoutes).toEqual(['preparatory_course', 'direct_studies']);
    expect(polishSchoolLevels).toEqual(['none', 'primary', 'secondary']);
    expect(applicationStatuses).toEqual([
      'submitted',
      'formal_review_positive',
      'merit_review_positive',
      'merit_review_negative',
      'scholarship_awarded',
      'scholarship_not_awarded',
    ]);
  });

  it.each([
    ['scholarshipTrack', 'nawa_mnisw'],
    ['studyRoute', 'second_cycle'],
    ['polishSchoolLevel', 'university'],
    ['currentStatus', 'positive_decision'],
  ] as const)('rejects former %s value %s', (field, value) => {
    expect(responseFormInputSchema.safeParse({ ...validForm, [field]: value }).success).toBe(false);
  });

  it('accepts a valid request', () => {
    expect(responseFormInputSchema.parse(validForm)).toEqual(validForm);
  });

  it('rejects unknown keys', () => {
    expect(() => responseFormInputSchema.parse({ ...validForm, extra: true })).toThrow();
  });

  it('rejects invalid enums', () => {
    expect(() => responseFormInputSchema.parse({ ...validForm, scholarshipTrack: 'invalid' })).toThrow();
  });

  it('rejects too-long country text', () => {
    expect(() => responseFormInputSchema.parse({ ...validForm, rankingCountry: 'a'.repeat(101) })).toThrow();
  });

  it('rejects averageGrade above maximumGrade', () => {
    expect(() =>
      responseFormInputSchema.parse({ ...validForm, averageGrade: 101, maximumGrade: 100 }),
    ).toThrow();
  });

  it('requires polishSchoolLevel only for nawa_director', () => {
    expect(() =>
      responseFormInputSchema.parse({ ...validForm, scholarshipTrack: 'nawa_director', polishSchoolLevel: undefined }),
    ).toThrow();
    expect(() =>
      responseFormInputSchema.parse({
        ...validForm,
        scholarshipTrack: 'health_minister',
        polishSchoolLevel: undefined,
        studyRoute: 'preparatory_course',
        targetUniversity: undefined,
      }),
    ).toThrow();
    expect(() =>
      responseFormInputSchema.parse({
        ...validForm,
        scholarshipTrack: 'health_minister',
        polishSchoolLevel: 'none',
        studyRoute: 'preparatory_course',
        targetUniversity: undefined,
      }),
    ).toThrow();
  });

  it('rejects polishSchoolLevel bonus for Belarus citizenship', () => {
    expect(() =>
      responseFormInputSchema.parse({
        ...validForm,
        rankingCountry: 'BY',
        polishSchoolLevel: 'secondary',
      }),
    ).toThrow();
    expect(
      responseFormInputSchema.parse({
        ...validForm,
        rankingCountry: 'BY',
        polishSchoolLevel: 'none',
      }),
    ).toBeTruthy();
  });

  it('treats targetUniversity as optional but rejects a university from another track', () => {
    const { targetUniversity: _ignored, ...withoutUniversity } = validForm;
    expect(() => responseFormInputSchema.parse(withoutUniversity)).not.toThrow();
    expect(() => responseFormInputSchema.parse({ ...withoutUniversity, studyRoute: 'preparatory_course' })).not.toThrow();
    expect(() =>
      responseFormInputSchema.parse({ ...validForm, targetUniversity: 'culture-013' }),
    ).toThrow();
    expect(() =>
      responseFormInputSchema.parse({
        ...validForm,
        studyRoute: 'preparatory_course',
        targetUniversity: 'science-096',
      }),
    ).not.toThrow();
  });

  it('accepts students in Poland only with an average of at least 4.75 on the 2-5 scale', () => {
    const student = { ...validForm, applicantKind: 'student_in_poland', maximumGrade: 5, polishSchoolLevel: 'none' };
    expect(() => responseFormInputSchema.parse({ ...student, averageGrade: 4.75 })).not.toThrow();
    expect(() => responseFormInputSchema.parse({ ...student, averageGrade: 4.7 })).toThrow();
    expect(() => responseFormInputSchema.parse({ ...student, averageGrade: 9, maximumGrade: 10 })).toThrow();
  });

  it('only accepts the known grade bases and applicant kinds', () => {
    expect(() => responseFormInputSchema.parse({ ...validForm, gradeBasis: 'half_year' })).not.toThrow();
    expect(() => responseFormInputSchema.parse({ ...validForm, gradeBasis: 'semester' })).toThrow();
    expect(() => responseFormInputSchema.parse({ ...validForm, applicantKind: 'graduate' })).toThrow();
  });

  it('forces the preparatory course route for health_minister', () => {
    expect(() =>
      responseFormInputSchema.parse({
        ...validForm,
        scholarshipTrack: 'health_minister',
        studyRoute: 'direct_studies',
        polishSchoolLevel: undefined,
      }),
    ).toThrow();
  });

  it('limits dual Polish citizenship to the nawa_director track', () => {
    expect(() =>
      responseFormInputSchema.parse({
        ...validForm,
        hasPolishCitizenship: true,
        scholarshipTrack: 'health_minister',
        studyRoute: 'preparatory_course',
        polishSchoolLevel: undefined,
        targetUniversity: undefined,
      }),
    ).toThrow();
    expect(
      responseFormInputSchema.safeParse({ ...validForm, hasPolishCitizenship: true, scholarshipTrack: 'nawa_director' })
        .success,
    ).toBe(true);
  });

  it('rejects polishSchoolLevel bonus for Belarus citizenship', () => {
    expect(
      responseFormInputSchema.safeParse({
        ...validForm,
        rankingCountry: 'BY',
        polishSchoolLevel: 'secondary',
      }).success,
    ).toBe(false);
    expect(
      responseFormInputSchema.safeParse({
        ...validForm,
        rankingCountry: 'BY',
        polishSchoolLevel: 'none',
      }).success,
    ).toBe(true);
    expect(
      responseFormInputSchema.safeParse({
        ...validForm,
        rankingCountry: 'UA',
        polishSchoolLevel: 'secondary',
      }).success,
    ).toBe(true);
  });

  it('rejects a malformed statusChangedAt date', () => {
    expect(() => responseFormInputSchema.parse({ ...validForm, statusChangedAt: 'not-a-date' })).toThrow();
  });

  it('rejects non-ISO country names', () => {
    expect(responseFormInputSchema.safeParse({ ...validForm, rankingCountry: 'Ukraina' }).success).toBe(false);
    expect(responseFormInputSchema.safeParse({ ...validForm, schoolCountry: 'Polska' }).success).toBe(false);
  });
});

describe('request schemas', () => {
  it('accepts a valid create request', () => {
    expect(
      createResponseRequestSchema.parse({
        response: validForm,
      }),
    ).toEqual({
      response: validForm,
    });
  });

  it('accepts an empty statistics request', () => {
    expect(statisticsRequestSchema.parse({})).toEqual({});
  });
});

describe('study field and prep-course city', () => {
  it('requires a known study field', () => {
    expect(() => responseFormInputSchema.parse({ ...validForm, studyField: '0613' })).not.toThrow();
    expect(() => responseFormInputSchema.parse({ ...validForm, studyField: 'other' })).not.toThrow();
    expect(() => responseFormInputSchema.parse({ ...validForm, studyField: '0912' })).toThrow();
    expect(() => responseFormInputSchema.parse({ ...validForm, studyField: '' })).toThrow();
    const { studyField: _omitted, ...withoutField } = validForm;
    expect(() => responseFormInputSchema.parse(withoutField)).toThrow();
  });

  const awarded = {
    ...validForm,
    studyRoute: 'preparatory_course',
    currentStatus: 'scholarship_awarded',
  };

  it('accepts a prep-course city only for awarded preparatory-course applicants', () => {
    expect(() => responseFormInputSchema.parse({ ...awarded, prepCourseCity: 'Łódź' })).not.toThrow();
    expect(() => responseFormInputSchema.parse({ ...awarded, prepCourseCity: 'other' })).not.toThrow();
    expect(() => responseFormInputSchema.parse({ ...awarded, prepCourseCity: 'Atlantis' })).toThrow();
    expect(() => responseFormInputSchema.parse({ ...awarded, studyRoute: 'direct_studies', prepCourseCity: 'Łódź' })).toThrow();
    expect(() => responseFormInputSchema.parse({ ...awarded, currentStatus: 'submitted', prepCourseCity: 'Łódź' })).toThrow();
    expect(() => responseFormInputSchema.parse({ ...awarded, currentStatus: 'scholarship_not_awarded', prepCourseCity: 'Łódź' })).toThrow();
  });

  it('keeps the city optional when reporting an award', () => {
    expect(() => responseFormInputSchema.parse(awarded)).not.toThrow();
  });
});

describe('scholarshipReportInputSchema', () => {
  const direct = {
    studyRoute: 'direct_studies' as const,
    programmeId: 'informatyka',
    universityId: 'science-096',
  };

  it('accepts the preparatory path with a centre and a catalogue programme', () => {
    expect(
      scholarshipReportInputSchema.parse({
        studyRoute: 'preparatory_course',
        prepCentreId: 'umcs-lublin',
        programmeId: 'prawo',
        universityId: 'science-078',
      }),
    ).toEqual({
      studyRoute: 'preparatory_course',
      prepCentreId: 'umcs-lublin',
      programmeId: 'prawo',
      universityId: 'science-078',
    });
  });

  it('accepts the direct path without a centre', () => {
    expect(scholarshipReportInputSchema.parse(direct)).toEqual(direct);
    expect(
      scholarshipReportInputSchema.parse({
        studyRoute: 'direct_studies',
        prepCentreId: undefined,
        programmeId: 'informatyka',
        universityId: 'science-096',
      }),
    ).toEqual(direct);
  });

  it('accepts 1 to 80 characters of typed text, trimmed, and rejects 81, empty or multiline text', () => {
    const typed = (customProgramme: string) => ({
      studyRoute: 'direct_studies' as const,
      customProgramme,
      universityId: 'science-096',
    });

    expect(scholarshipReportInputSchema.parse(typed('  Moje studia  '))).toEqual({
      studyRoute: 'direct_studies',
      customProgramme: 'Moje studia',
      universityId: 'science-096',
    });
    expect(scholarshipReportInputSchema.parse(typed('a')).customProgramme).toBe('a');
    expect(scholarshipReportInputSchema.parse(typed('a'.repeat(80))).customProgramme).toHaveLength(80);
    expect(() => scholarshipReportInputSchema.parse(typed('a'.repeat(81)))).toThrow();
    expect(() => scholarshipReportInputSchema.parse(typed('   '))).toThrow();
    expect(() => scholarshipReportInputSchema.parse(typed('one\ntwo'))).toThrow();
    expect(() => scholarshipReportInputSchema.parse(typed('one\r\ntwo'))).toThrow();
  });

  it('requires exactly one of a catalogue programme and typed text', () => {
    expect(() =>
      scholarshipReportInputSchema.parse({ ...direct, customProgramme: 'Moje studia' }),
    ).toThrow();
    expect(() =>
      scholarshipReportInputSchema.parse({ studyRoute: 'direct_studies', universityId: 'science-096' }),
    ).toThrow();
  });

  it('keeps the centre exactly on the preparatory path', () => {
    expect(() =>
      scholarshipReportInputSchema.parse({ ...direct, prepCentreId: 'umcs-lublin' }),
    ).toThrow();
    expect(() =>
      scholarshipReportInputSchema.parse({
        studyRoute: 'preparatory_course',
        programmeId: 'prawo',
        universityId: 'science-078',
      }),
    ).toThrow();
    expect(() =>
      scholarshipReportInputSchema.parse({
        studyRoute: 'preparatory_course',
        prepCentreId: 'unknown-centre',
        programmeId: 'prawo',
        universityId: 'science-078',
      }),
    ).toThrow();
  });

  it('accepts only a Director-track university and rejects unknown keys', () => {
    expect(() =>
      scholarshipReportInputSchema.parse({ ...direct, universityId: 'culture-013' }),
    ).toThrow();
    expect(() =>
      scholarshipReportInputSchema.parse({ ...direct, universityId: 'health-001' }),
    ).toThrow();
    expect(() => scholarshipReportInputSchema.parse({ ...direct, telegramUserId: 1 })).toThrow();
  });
});

describe('scholarshipReportSchema', () => {
  it('accepts a stored report at or above the 60 snapshot and rejects a lower one', () => {
    const stored = {
      studyRoute: 'direct_studies' as const,
      programmeId: 'informatyka',
      programmeName: 'Informatyka',
      universityId: 'science-096',
      scoreSnapshot: 72,
    };

    expect(scholarshipReportSchema.parse(stored)).toEqual(stored);
    expect(() => scholarshipReportSchema.parse({ ...stored, scoreSnapshot: 59.9 })).toThrow();
  });
});

describe('scholarshipReportSummarySchema', () => {
  const summary = {
    total: 3,
    countries: [
      { country: 'UA', count: 2 },
      { country: 'BY', count: 1 },
    ],
    paths: [
      { route: 'preparatory_course' as const, count: 1 },
      { route: 'direct_studies' as const, count: 2 },
    ],
    centres: [{ centreId: 'umcs-lublin', count: 1 }],
    fields: [
      {
        group: '06',
        count: 1,
        programmes: [{ programmeId: 'informatyka', programmeName: 'Informatyka', count: 1 }],
      },
    ],
    typedProgrammeCount: 2,
    universities: [
      { universityId: 'science-096', count: 2 },
      { universityId: 'science-078', count: 1 },
    ],
  };

  it('accepts a summary whose lists agree with its total', () => {
    expect(scholarshipReportSummarySchema.parse(summary)).toEqual(summary);
  });

  it('accepts a filtered selection whose country list is larger than the total', () => {
    const filtered = {
      ...summary,
      total: 1,
      countries: [
        { country: 'UA', count: 3 },
        { country: 'BY', count: 1 },
      ],
      paths: [
        { route: 'preparatory_course' as const, count: 1 },
        { route: 'direct_studies' as const, count: 0 },
      ],
      fields: [
        {
          group: '04',
          count: 1,
          programmes: [{ programmeId: 'prawo', programmeName: 'Prawo', count: 1 }],
        },
      ],
      typedProgrammeCount: 0,
      universities: [{ universityId: 'science-078', count: 1 }],
    };

    expect(scholarshipReportSummarySchema.parse(filtered)).toEqual(filtered);
  });

  it('rejects counts that disagree with the total and cells below one', () => {
    expect(() =>
      scholarshipReportSummarySchema.parse({ ...summary, total: 4 }),
    ).toThrow();
    expect(() =>
      scholarshipReportSummarySchema.parse({
        ...summary,
        countries: [{ country: 'UA', count: 2 }],
      }),
    ).toThrow();
    expect(() =>
      scholarshipReportSummarySchema.parse({
        ...summary,
        fields: [{ ...summary.fields[0], count: 2 }],
      }),
    ).toThrow();
    expect(() =>
      scholarshipReportSummarySchema.parse({
        ...summary,
        centres: [{ centreId: 'umcs-lublin', count: 0 }],
      }),
    ).toThrow();
    expect(() =>
      scholarshipReportSummarySchema.parse({
        ...summary,
        countries: [{ country: 'Ukraine', count: 3 }],
      }),
    ).toThrow();
  });
});

describe('statisticsResultSchema', () => {
  /** Two valid surveys in the country: the smallest full position (ADR 0015). */
  const countryCohort = makeStatisticsResult({ detailsAvailable: true });
  const nineSurveys = {
    ...countryCohort,
    totalValidResponses: 9,
    sameTrackCount: 9,
    sameCountryCount: 9,
    groupResponseCount: 9,
    rankPosition: 3,
    rankTotal: 9,
    scoreBuckets: fineBuckets([9]),
  };

  it('accepts the full position from two surveys in the country', () => {
    expect(statisticsResultSchema.parse(countryCohort)).toEqual(countryCohort);
    expect(statisticsResultSchema.parse(nineSurveys)).toEqual(nineSurveys);
  });

  it('accepts the "only you" payload: one survey, every detail field empty', () => {
    const onlyYou = makeStatisticsResult({
      detailsAvailable: false,
      totalValidResponses: 1,
      sameTrackCount: 1,
      sameCountryCount: 1,
    });

    expect(statisticsResultSchema.parse(onlyYou)).toEqual(onlyYou);
  });

  it('rejects details when the country has fewer than two surveys', () => {
    expect(() =>
      statisticsResultSchema.parse({ ...countryCohort, sameCountryCount: 1, groupResponseCount: 1, rankTotal: 1, scoreBuckets: fineBuckets([1]) }),
    ).toThrow();

    expect(() =>
      statisticsResultSchema.parse({
        ...makeStatisticsResult({ detailsAvailable: false, totalValidResponses: 2, sameTrackCount: 2, sameCountryCount: 2 }),
      }),
    ).toThrow();
  });

  it('rejects group and track scopes and the retired group and track fields', () => {
    expect(() => statisticsResultSchema.parse({ ...countryCohort, cohortScope: 'group' })).toThrow();
    expect(() => statisticsResultSchema.parse({ ...countryCohort, cohortScope: 'track' })).toThrow();
    expect(() => statisticsResultSchema.parse({ ...countryCohort, cohortGroupId: 'east' })).toThrow();
    expect(() => statisticsResultSchema.parse({ ...countryCohort, trackWideMedian: 80 })).toThrow();
  });

  it('rejects a country count that is null, negative, or disagrees with the cohort', () => {
    expect(() => statisticsResultSchema.parse({ ...countryCohort, sameCountryCount: null })).toThrow();
    expect(() => statisticsResultSchema.parse({ ...countryCohort, sameCountryCount: -1 })).toThrow();
    expect(() => statisticsResultSchema.parse({ ...countryCohort, sameCountryCount: 3 })).toThrow();
    expect(() => statisticsResultSchema.parse({ ...countryCohort, rankTotal: 3 })).toThrow();
    expect(() => statisticsResultSchema.parse({ ...nineSurveys, scoreBuckets: fineBuckets([2]) })).toThrow();
  });

  it('rejects detailed values on a payload without details', () => {
    const onlyYou = makeStatisticsResult({
      detailsAvailable: false,
      totalValidResponses: 1,
      sameTrackCount: 1,
      sameCountryCount: 1,
    });

    expect(() => statisticsResultSchema.parse({ ...onlyYou, medianScore: 80 })).toThrow();
    expect(() => statisticsResultSchema.parse({ ...onlyYou, rankPosition: 1 })).toThrow();
    expect(() => statisticsResultSchema.parse({ ...onlyYou, rankTotal: 1 })).toThrow();
    expect(() => statisticsResultSchema.parse({ ...onlyYou, cohortScope: 'country' })).toThrow();
  });
});
