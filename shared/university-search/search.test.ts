import { describe, expect, it } from 'vitest';
import { toResponseInput } from '../../src/features/ResponseWizardSteps';
import { universitySelectionCounts } from '../universities-metadata';
import { getUniversitySearchIndex } from './index';
import { normalizeSearchText } from './normalize';
import { searchUniversities } from './search';
import {
  getUniversityById,
  isUniversityAllowedForTrack,
  universities,
  universitiesForScholarshipTrack,
} from '../universities';

function searchScience(query: string) {
  const entries = getUniversitySearchIndex(universitiesForScholarshipTrack('nawa_director'));
  return searchUniversities(entries, query, {
    enableFuzzy: true,
    selectionCounts: universitySelectionCounts,
  });
}

function topId(query: string): string | undefined {
  return searchScience(query)[0]?.university.id;
}

describe('university search normalize', () => {
  it('strips Polish diacritics', () => {
    expect(normalizeSearchText('Wrocław')).toBe('wroclaw');
    expect(normalizeSearchText('Łódź')).toBe('lodz');
  });
});

describe('university search', () => {
  it('matches diacritic-free input', () => {
    expect(topId('wroclaw')).toBe('science-049');
  });

  it('matches common abbreviations', () => {
    expect(topId('PWr')).toBe('science-049');
    expect(topId('UWr')).toBe('science-097');
    expect(topId('UAM')).toBe('science-070');
    expect(topId('AGH')).toBe('science-003');
    expect(topId('SGGW')).toBe('science-053');
  });

  it('matches English brands', () => {
    expect(topId('Wroclaw Tech')).toBe('science-049');
    expect(topId('PUEB')).toBe('science-064');
    const healthEntries = getUniversitySearchIndex(universitiesForScholarshipTrack('health_minister'));
    const pums = searchUniversities(healthEntries, 'PUMS', {
      enableFuzzy: true,
      selectionCounts: universitySelectionCounts,
    });
    expect(pums[0]?.university.id).toBe('health-001');
  });

  it('matches former names', () => {
    expect(topId('PJWSTK')).toBe('science-050');
    expect(topId('UP Kraków')).toBe('science-076');
    const cultureEntries = getUniversitySearchIndex(universitiesForScholarshipTrack('culture_minister'));
    const ath = searchUniversities(cultureEntries, 'ATH', {
      enableFuzzy: true,
      selectionCounts: universitySelectionCounts,
    });
    expect(ath[0]?.university.id).toBe('culture-014');
    const pwsz = searchUniversities(cultureEntries, 'PWSZ', {
      enableFuzzy: true,
      selectionCounts: universitySelectionCounts,
    });
    expect(pwsz[0]?.university.id).toBe('culture-017');
  });

  it('matches polibuda slang with city', () => {
    expect(topId('polibuda wroclaw')).toBe('science-049');
  });

  it('matches Russian type and city aliases', () => {
    expect(topId('экономический katowice')).toBe('science-064');
    expect(topId('политех wroclaw')).toBe('science-049');
  });

  it('returns multiple ASP results for ambiguous abbreviation', () => {
    const cultureEntries = getUniversitySearchIndex(universitiesForScholarshipTrack('culture_minister'));
    const results = searchUniversities(cultureEntries, 'ASP', {
      enableFuzzy: true,
      selectionCounts: universitySelectionCounts,
    });
    expect(results.length).toBeGreaterThan(1);
    expect(results.every((r) => r.university.city)).toBe(true);
  });

  it('isolates results by scholarship track', () => {
    const science = searchScience('ASP');
    expect(science.every((r) => r.university.ministry === 'science')).toBe(true);
    const culture = searchUniversities(
      getUniversitySearchIndex(universitiesForScholarshipTrack('culture_minister')),
      'ASP',
      { enableFuzzy: true, selectionCounts: universitySelectionCounts },
    );
    expect(culture.every((r) => r.university.ministry === 'culture')).toBe(true);
  });

  it('submits stable university ID through wizard mapping', () => {
    const draft = {
      hasPolishCitizenship: false,
      rankingCountry: 'PL',
      schoolCountry: 'PL',
      scholarshipTrack: 'nawa_director' as const,
      studyRoute: 'direct_studies' as const,
      targetUniversity: 'science-049',
      averageGrade: 4,
      maximumGrade: 5,
      polishSchoolLevel: 'secondary' as const,
      currentStatus: 'submitted' as const,
      statusChangedAt: '2026-01-01',
    };
    expect(toResponseInput(draft).targetUniversity).toBe('science-049');
  });

  it('ensures every university has searchable terms', () => {
    const index = getUniversitySearchIndex(universities);
    for (const entry of index) {
      expect(entry.terms.length).toBeGreaterThan(0);
      for (const term of entry.terms) {
        expect(term.normalized.length).toBeGreaterThan(0);
      }
    }
  });

  it('has unique ids and unchanged list sizes', () => {
    const ids = universities.map((u) => u.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(universities.filter((u) => u.ministry === 'science')).toHaveLength(113);
    expect(universities.filter((u) => u.ministry === 'culture')).toHaveLength(19);
    expect(universities.filter((u) => u.ministry === 'health')).toHaveLength(9);
  });

  it('looks up enriched universities and validates track membership', () => {
    expect(getUniversityById('science-096')?.name).toBe('Uniwersytet Warszawski');
    expect(getUniversityById('science-049')?.shortNames).toContain('PWr');
    expect(isUniversityAllowedForTrack('science-096', 'nawa_director')).toBe(true);
    expect(isUniversityAllowedForTrack('culture-013', 'culture_minister')).toBe(true);
  });

  it('uses fuzzy fallback for longer misspelled queries', () => {
    const results = searchScience('wroclw');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.isFuzzy).toBe(true);
  });
});
