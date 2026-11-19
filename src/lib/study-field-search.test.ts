import { describe, expect, it } from 'vitest';
import { searchStudyFields } from './study-field-search';

const codes = (query: string) => searchStudyFields(query).map((field) => field.code);

describe('searchStudyFields', () => {
  it('returns every field for an empty query', () => {
    expect(searchStudyFields('').length).toBeGreaterThan(50);
    expect(searchStudyFields('   ').length).toBe(searchStudyFields('').length);
  });

  it('finds fields by the words people actually type', () => {
    expect(codes('informatyka')).toEqual(expect.arrayContaining(['0612', '0613']));
    expect(codes('prawo')).toContain('0421');
    expect(codes('mechatronika')).toContain('0715');
    expect(codes('bhp')).toContain('1022');
  });

  it('ignores case and Polish diacritics', () => {
    expect(codes('PIELEGNIARSTWO')).toContain('0913');
    expect(codes('mlodziez')).toContain('0922');
    expect(codes('Gospodarka')).toEqual(codes('gospodarka'));
  });

  it('matches names in the other interface languages', () => {
    expect(codes('psychology')).toContain('0313');
    expect(codes('психология')).toContain('0313');
    expect(codes('психологія')).toContain('0313');
    expect(codes('псіхалогія')).toContain('0313');
  });

  it('requires every word of the query', () => {
    expect(codes('informatyka sieci')).toEqual(['0612']);
    expect(codes('prawo kosmos')).toEqual([]);
  });

  it('does not offer the fields that were left out', () => {
    expect(codes('medycyna')).not.toContain('0912');
    expect(codes('stomatologia')).toEqual([]);
  });
});
