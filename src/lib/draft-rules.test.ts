import { describe, expect, it } from 'vitest';
import type { WizardDraft } from './draft';
import {
  isMaximumGradeLocked,
  isPolishSchoolBonusApplicable,
  normalizeDraft,
  previewOrientationScore,
  withSchoolCountry,
} from './draft-rules';

const base: WizardDraft = {
  hasPolishCitizenship: false,
  rankingCountry: 'UA',
  schoolCountry: 'UA',
  scholarshipTrack: 'nawa_director',
  studyRoute: 'direct_studies',
  targetUniversity: 'science-096',
  studyField: '0613',
  prepCourseCity: '',
  gradeBasis: 'final_certificate',
  applicantKind: 'school_leaver',
  averageGrade: 4.5,
  maximumGrade: 5,
  polishSchoolLevel: 'secondary',
  currentStatus: 'submitted',
  statusChangedAt: '2026-07-01',
};

describe('normalizeDraft', () => {
  it('leaves a consistent draft untouched and never mutates its input', () => {
    const copy = { ...base };
    expect(normalizeDraft(base)).toEqual(base);
    expect(base).toEqual(copy);
  });

  it('removes the Polish-school bonus for Belarus citizens', () => {
    expect(normalizeDraft({ ...base, rankingCountry: 'BY' }).polishSchoolLevel).toBe('none');
  });

  it('fixes the scale to 5 and drops the bonus for students in Poland', () => {
    const next = normalizeDraft({ ...base, applicantKind: 'student_in_poland', maximumGrade: 10 });
    expect(next.maximumGrade).toBe(5);
    expect(next.polishSchoolLevel).toBe('none');
  });

  it('drops a university that is not a partner of the track', () => {
    expect(normalizeDraft({ ...base, targetUniversity: 'culture-013' }).targetUniversity).toBe('');
    expect(normalizeDraft({ ...base, targetUniversity: '' }).targetUniversity).toBe('');
  });
});

describe('withSchoolCountry', () => {
  it('resets the scale to the default of the new school country', () => {
    expect(withSchoolCountry({ ...base, maximumGrade: 5 }, 'UA').maximumGrade).toBe(12);
    expect(withSchoolCountry(base, 'KZ').maximumGrade).toBe(5);
  });

  it('asks for the scale again when the country has no default', () => {
    expect(withSchoolCountry(base, '').maximumGrade).toBeNull();
  });

  it('keeps the 2-5 scale for students in Poland', () => {
    const student = { ...base, applicantKind: 'student_in_poland' as const, maximumGrade: 5 };
    expect(withSchoolCountry(student, 'UA').maximumGrade).toBe(5);
  });
});

describe('derived flags', () => {
  it('locks the scale for known school countries and students in Poland', () => {
    expect(isMaximumGradeLocked(base)).toBe(true);
    expect(isMaximumGradeLocked({ ...base, schoolCountry: '' })).toBe(false);
    expect(isMaximumGradeLocked({ ...base, schoolCountry: '', applicantKind: 'student_in_poland' })).toBe(true);
  });

  it('asks about the Polish school only when it can matter', () => {
    expect(isPolishSchoolBonusApplicable(base)).toBe(true);
    expect(isPolishSchoolBonusApplicable({ ...base, rankingCountry: 'BY' })).toBe(false);
    expect(isPolishSchoolBonusApplicable({ ...base, applicantKind: 'student_in_poland' })).toBe(false);
    expect(isPolishSchoolBonusApplicable({ ...base, scholarshipTrack: 'health_minister' })).toBe(false);
  });
});

describe('previewOrientationScore', () => {
  it('previews the official formula once the grades are known', () => {
    expect(previewOrientationScore({ ...base, schoolCountry: 'KZ' })).toBe(91);
    expect(previewOrientationScore({ ...base, polishSchoolLevel: 'none' })).toBe(81);
  });

  it('is empty until both grades are entered', () => {
    expect(previewOrientationScore({ ...base, averageGrade: null })).toBeNull();
    expect(previewOrientationScore({ ...base, maximumGrade: null })).toBeNull();
    expect(previewOrientationScore({ ...base, maximumGrade: 0 })).toBeNull();
  });

  it('gives students in Poland the maximum', () => {
    expect(previewOrientationScore({ ...base, applicantKind: 'student_in_poland', averageGrade: 4.8 })).toBe(100);
  });
});
