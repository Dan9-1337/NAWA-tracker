import { describe, expect, it } from 'vitest';
import {
  getUniversityById,
  isUniversityAllowedForTrack,
  isUniversityId,
  universities,
  universitiesForScholarshipTrack,
} from './universities';

describe('universities', () => {
  it('has unique ids and the expected list sizes', () => {
    const ids = universities.map((university) => university.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(universities.filter((u) => u.ministry === 'science')).toHaveLength(113);
    expect(universities.filter((u) => u.ministry === 'culture')).toHaveLength(19);
    expect(universities.filter((u) => u.ministry === 'health')).toHaveLength(9);
  });

  it('filters partner universities by scholarship track', () => {
    expect(universitiesForScholarshipTrack('nawa_director').every((u) => u.ministry === 'science')).toBe(true);
    expect(universitiesForScholarshipTrack('culture_minister').every((u) => u.ministry === 'culture')).toBe(true);
    expect(universitiesForScholarshipTrack('health_minister').every((u) => u.ministry === 'health')).toBe(true);
  });

  it('looks up universities and validates track membership', () => {
    expect(isUniversityId('science-096')).toBe(true);
    expect(getUniversityById('science-096')?.name).toBe('Uniwersytet Warszawski');
    expect(isUniversityAllowedForTrack('science-096', 'nawa_director')).toBe(true);
    expect(isUniversityAllowedForTrack('science-096', 'culture_minister')).toBe(false);
    expect(isUniversityAllowedForTrack('culture-013', 'culture_minister')).toBe(true);
    expect(isUniversityAllowedForTrack('health-009', 'health_minister')).toBe(true);
  });
});
