import { describe, expect, it } from 'vitest';
import { isPrepCourseCity, OTHER_CITY, prepCourseCities } from './prep-course-cities';
import {
  broadGroupOf,
  broadGroups,
  fieldLevelName,
  getStudyField,
  isStudyFieldCode,
  narrowGroupOf,
  narrowGroups,
  OTHER_STUDY_FIELD,
  requiresPhilologyNote,
  studyFields,
  type FieldLocale,
} from './study-fields';

const locales: FieldLocale[] = ['pl', 'en', 'ru', 'uk', 'be'];

describe('studyFields', () => {
  it('has unique four-digit ISCED-F codes in order', () => {
    const codes = studyFields.map((field) => field.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes.every((code) => /^\d{4}$/.test(code))).toBe(true);
    expect([...codes].sort()).toEqual(codes);
    expect(codes.length).toBeGreaterThanOrEqual(55);
    expect(codes.length).toBeLessThanOrEqual(70);
  });

  it('names every field in all five languages', () => {
    for (const field of studyFields) {
      for (const locale of locales) expect(field.name[locale].trim(), `${field.code}/${locale}`).not.toBe('');
    }
    for (const group of [...Object.values(broadGroups), ...Object.values(narrowGroups)]) {
      for (const locale of locales) expect(group[locale].trim()).not.toBe('');
    }
  });

  it('places every field under a known narrow and broad group', () => {
    for (const field of studyFields) {
      expect(narrowGroups[narrowGroupOf(field.code)], field.code).toBeDefined();
      expect(broadGroups[broadGroupOf(field.code)], field.code).toBeDefined();
    }
  });

  it('leaves out what the Director scholarship cannot fund and the Health track', () => {
    const codes = studyFields.map((field) => field.code);
    for (const excluded of ['0011', '0021', '0031', '0214', '0415', '0416', '0417', '0911', '0912', '0917']) {
      expect(codes, excluded).not.toContain(excluded);
    }
    expect(codes).toEqual(expect.arrayContaining(['0613', '0421', '0913', '0916', '0213', '0215']));
  });

  it('keeps the Ukrainian and Belarusian names free of Russian-only letters', () => {
    const uk = studyFields.map((field) => field.name.uk).join(' ');
    const be = studyFields.map((field) => field.name.be).join(' ');
    expect(uk).not.toMatch(/[ыэъё]/i);
    expect(be).not.toMatch(/[иъїєґ]/i);
  });

  it('looks fields up, accepts "other", and rejects unknown codes', () => {
    expect(getStudyField('0613')?.name.pl).toContain('informatyka');
    expect(isStudyFieldCode('0613')).toBe(true);
    expect(isStudyFieldCode(OTHER_STUDY_FIELD)).toBe(true);
    expect(isStudyFieldCode('0912')).toBe(false);
    expect(isStudyFieldCode('061')).toBe(false);
  });

  it('flags only the language and philology fields for the NAWA exclusion note', () => {
    expect(requiresPhilologyNote('0231')).toBe(true);
    expect(requiresPhilologyNote('0232')).toBe(true);
    expect(requiresPhilologyNote('0613')).toBe(false);
  });

  it('names a field at each level of the ladder', () => {
    expect(fieldLevelName('0613', 'detailed', 'en')).toBe('Software and applications development and analysis');
    expect(fieldLevelName('0613', 'narrow', 'en')).toBe('Information and communication technologies');
    expect(fieldLevelName('0613', 'broad', 'en')).toBe('Information and communication technologies');
    expect(fieldLevelName('0613', 'all', 'en')).toBeNull();
    expect(fieldLevelName('other', 'detailed', 'en')).toBeNull();
  });
});

describe('prepCourseCities', () => {
  it('has unique non-empty city names', () => {
    expect(new Set(prepCourseCities).size).toBe(prepCourseCities.length);
    expect(prepCourseCities.every((city) => city.trim() === city && city.length > 0 && city.length <= 64)).toBe(true);
  });

  it('accepts listed cities and "other" only', () => {
    expect(isPrepCourseCity('Łódź')).toBe(true);
    expect(isPrepCourseCity(OTHER_CITY)).toBe(true);
    expect(isPrepCourseCity('Atlantis')).toBe(false);
    expect(isPrepCourseCity('')).toBe(false);
  });
});
