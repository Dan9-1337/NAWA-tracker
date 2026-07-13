import { describe, expect, it } from 'vitest';
import { scholarshipTracks, studyRoutes, studyTypes } from './contracts';
import {
  createResponseRequestSchema,
  responseFormInputSchema,
  statisticsRequestSchema,
} from './validation';

const validForm = {
  scholarshipTrack: 'nawa_mnisw',
  studyRoute: 'direct_studies',
  studyType: 'first_cycle',
  country: 'Polska',
  gradeScale: 5,
  gradeValue: 4,
  university: 'Uniwersytet Warszawski',
  studyField: 'Informatyka',
  choicePriority: 'first_choice',
  applicationStatus: 'submitted',
};

describe('responseFormInputSchema', () => {
  it('uses only the active questionnaire scope enums', () => {
    expect(scholarshipTracks).toEqual(['nawa_mnisw', 'minister_health', 'minister_culture']);
    expect(studyRoutes).toEqual(['preparatory_course', 'direct_studies']);
    expect(studyTypes).toEqual(['first_cycle', 'uniform_masters']);
  });

  it.each([
    ['scholarshipTrack', 'scholarship'],
    ['studyRoute', 'second_cycle'],
    ['studyType', 'full_time'],
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

  it('rejects too-long text', () => {
    expect(() => responseFormInputSchema.parse({ ...validForm, country: 'a'.repeat(101) })).toThrow();
  });

  it('rejects universities outside the canonical suggestion set', () => {
    expect(
      responseFormInputSchema.safeParse({ ...validForm, university: 'Uczelnia spoza listy' }).success,
    ).toBe(false);
  });

  it('requires custom scale bounds', () => {
    expect(() => responseFormInputSchema.parse({ ...validForm, gradeScale: 'custom', customGradeScale: 0 })).toThrow();
    expect(() => responseFormInputSchema.parse({ ...validForm, gradeScale: 'custom', customGradeScale: 1001 })).toThrow();
  });

  it('rejects grades above fixed scale maximum', () => {
    expect(() => responseFormInputSchema.parse({ ...validForm, gradeValue: 6 })).toThrow();
  });

  it('rejects grades above a custom scale maximum', () => {
    expect(() =>
      responseFormInputSchema.parse({
        ...validForm,
        gradeScale: 'custom',
        customGradeScale: 7,
        gradeValue: 8,
      }),
    ).toThrow();
  });

  it('rejects decision dates for non-final statuses', () => {
    expect(() => responseFormInputSchema.parse({ ...validForm, decisionDate: '2026-07-13' })).toThrow();
  });
});

describe('request schemas', () => {
  it('accepts a valid create request', () => {
    expect(
      createResponseRequestSchema.parse({
        turnstileToken: 'token',
        response: validForm,
      }),
    ).toEqual({
      turnstileToken: 'token',
      response: validForm,
    });
  });

  it('accepts an empty statistics request', () => {
    expect(statisticsRequestSchema.parse({})).toEqual({});
  });
});
