import { describe, expect, it } from 'vitest';
import { applicationStatuses, polishSchoolLevels, scholarshipTracks, studyRoutes } from './contracts';
import {
  createResponseRequestSchema,
  responseFormInputSchema,
  statisticsRequestSchema,
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
