import { describe, expect, it } from 'vitest';
import { isIntakeOpen, seasonForYear, seasons } from './season';

describe('season calendar', () => {
  it('is open between the document dates, inclusive', () => {
    expect(isIntakeOpen(new Date('2026-03-31T10:00:00Z'))).toBe(true);
    expect(isIntakeOpen(new Date('2026-07-09T10:00:00Z'))).toBe(true);
    expect(isIntakeOpen(new Date('2026-07-10T10:00:00Z'))).toBe(false);
    expect(isIntakeOpen(new Date('2026-03-30T10:00:00Z'))).toBe(false);
  });

  it('is never open for a season whose dates are not announced', () => {
    const tba = { year: 2027, documentsFrom: null, documentsTo: null, resultsBy: null };
    expect(isIntakeOpen(new Date('2027-04-01T00:00:00Z'), tba)).toBe(false);
  });

  it('follows another season once its dates are known', () => {
    const next = { year: 2027, documentsFrom: '2027-03-30', documentsTo: '2027-07-08', resultsBy: '2027-09-30' };
    expect(isIntakeOpen(new Date('2027-05-01T00:00:00Z'), next)).toBe(true);
    expect(isIntakeOpen(new Date('2027-07-09T00:00:00Z'), next)).toBe(false);
  });
});

describe('seasons', () => {
  it('lists intakes oldest first', () => {
    const years = seasons.map((season) => season.year);
    expect(years).toEqual([...years].sort());
  });

  it('has dates for the 2026 intake, which is the active year in the database today', () => {
    expect(seasonForYear(2026)?.documentsTo).toBeTruthy();
  });

  it('lists a known intake whose dates are not announced, and nothing for an unknown year', () => {
    expect(seasonForYear(2027)).toEqual({ year: 2027, documentsFrom: null, documentsTo: null, resultsBy: null });
    expect(seasonForYear(2099)).toBeUndefined();
  });
});
