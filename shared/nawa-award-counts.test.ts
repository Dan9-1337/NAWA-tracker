import { describe, expect, it } from 'vitest';
import { isCountryCode } from './countries';
import {
  lookupOfficialAwardContext,
  nawaAwardCounts,
  nawaAwardReportYears,
  officialAwardContext,
  type NawaAwardReport,
} from './nawa-award-counts';

describe('officialAwardContext', () => {
  it('returns the 2024 figures for Belarus, Ukraine and Kazakhstan with the 2024 report as source', () => {
    for (const [code, count] of [
      ['BY', 302],
      ['UA', 104],
      ['KZ', 14],
    ] as const) {
      const context = officialAwardContext(code);
      expect(context?.year).toBe(2024);
      expect(context?.count).toBe(count);
      expect(context?.sourceUrl.endsWith('Sprawozdanie-z-dzialalnosci-NAWA-za-rok-2024.pdf')).toBe(true);
      expect(context?.page).toBeTruthy();
    }
  });

  it('falls back to the latest earlier year that has a row for the country', () => {
    const report = (year: number, counts: NawaAwardReport['counts']): NawaAwardReport => ({
      sourceUrl: `https://example.test/${year}.pdf`,
      page: '1',
      reportTotal: 0,
      counts,
    });
    const table = {
      2024: report(2024, { BY: 10 }),
      2023: report(2023, { BY: 9, FR: 1 }),
      2022: report(2022, { BY: 8, FR: 5, HU: 2 }),
    };
    expect(lookupOfficialAwardContext(table, [2024, 2023, 2022], 'FR')).toEqual({
      year: 2023,
      count: 1,
      sourceUrl: 'https://example.test/2023.pdf',
      page: '1',
    });
    expect(lookupOfficialAwardContext(table, [2024, 2023, 2022], 'HU')?.year).toBe(2022);
    expect(lookupOfficialAwardContext(table, [2024, 2023, 2022], 'BY')?.year).toBe(2024);
  });

  it('returns null for a country with no row in 2022-2024 and for a code that is not a country', () => {
    expect(officialAwardContext('NG')).toBeNull();
    expect(officialAwardContext('PL')).toBeNull();
    expect(officialAwardContext('OTHER')).toBeNull();
    expect(officialAwardContext('')).toBeNull();
    expect(officialAwardContext('ua')).toBeNull();
  });

  it('does not use zero rows: Canada and Venezuela had a row in 2023 with nobody granted funding', () => {
    expect(officialAwardContext('CA')).toBeNull();
    expect(officialAwardContext('VE')).toBeNull();
  });
});

describe('nawaAwardCounts data', () => {
  it('covers 2024, 2023 and 2022, latest first', () => {
    expect([...nawaAwardReportYears]).toEqual([2024, 2023, 2022]);
    expect(Object.keys(nawaAwardCounts).sort()).toEqual(['2022', '2023', '2024']);
  });

  it('uses valid country codes, positive integer counts, a source URL and a page for each year', () => {
    for (const year of nawaAwardReportYears) {
      const report = nawaAwardCounts[year];
      expect(report.sourceUrl).toMatch(/^https:\/\/nawa\.gov\.pl\/images\/.+\.pdf$/);
      expect(report.sourceUrl).toContain(`za-rok-${year}.pdf`);
      expect(report.page.length).toBeGreaterThan(0);
      const entries = Object.entries(report.counts);
      expect(entries.length).toBeGreaterThan(0);
      for (const [code, count] of entries) {
        expect(isCountryCode(code), `${year} ${code}`).toBe(true);
        expect(Number.isInteger(count) && (count as number) > 0, `${year} ${code}`).toBe(true);
      }
    }
  });

  it("sums to the report's own total for the table", () => {
    const sums = nawaAwardReportYears.map((year) =>
      Object.values(nawaAwardCounts[year].counts).reduce((total, count) => total + (count ?? 0), 0),
    );
    expect(sums).toEqual([502, 525, 472]);
    for (const year of nawaAwardReportYears) {
      expect(nawaAwardCounts[year].reportTotal).toBe(
        Object.values(nawaAwardCounts[year].counts).reduce((total, count) => total + (count ?? 0), 0),
      );
    }
  });
});
