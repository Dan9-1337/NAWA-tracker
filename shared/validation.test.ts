import { describe, expect, it } from 'vitest';
import { applicationStatuses, polishSchoolLevels, scholarshipTracks, studyRoutes } from './contracts';
import {
  createResponseRequestSchema,
  responseFormInputSchema,
  responseFormStoredSchema,
  statisticsRequestSchema,
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

  it('requires targetUniversity for direct_studies and rejects mismatched track universities', () => {
    expect(() =>
      responseFormInputSchema.parse({ ...validForm, targetUniversity: undefined }),
    ).toThrow();
    expect(() =>
      responseFormInputSchema.parse({ ...validForm, targetUniversity: 'culture-013' }),
    ).toThrow();
    expect(() =>
      responseFormInputSchema.parse({
        ...validForm,
        studyRoute: 'preparatory_course',
        targetUniversity: 'science-096',
      }),
    ).toThrow();
    expect(() =>
      responseFormInputSchema.parse({
        ...validForm,
        studyRoute: 'preparatory_course',
        targetUniversity: undefined,
      }),
    ).not.toThrow();
  });

  it('allows stored direct_studies profiles without targetUniversity until the user saves again', () => {
    const { targetUniversity: _ignored, ...legacyProfile } = validForm;
    expect(responseFormStoredSchema.parse(legacyProfile)).toEqual(legacyProfile);
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
