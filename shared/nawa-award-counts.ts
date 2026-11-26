import { isCountryCode, type CountryCode } from './countries';

/**
 * Official context for the hub (docs/adr/0021): how many Director's scholarships for first-cycle and long-cycle
 * studies ("studia I stopnia i jednolite studia magisterskie") NAWA awarded to citizens of a country, from the
 * annual activity reports (Sprawozdanie z działalności NAWA), Anders NAWA programme.
 *
 * The count is the number of persons on the ranking list who were granted funding ("przyznane finansowanie";
 * in the 2022 report the column "liczba wniosków zakwalifikowanych do finansowania"), before resignations. It is
 * not the number of holders after resignations and not the number of applications. Ministry of Health and Ministry
 * of Culture scholarships are not part of these figures, and second-cycle tables are not used.
 *
 * Transcribed by hand from the report tables; updated once a year. Nothing is fetched at runtime. Rules for rows:
 * - A country with a row but zero persons granted funding (Romania 2022; Canada and Venezuela 2023) is left out.
 * - The "Pozostałe kraje" row (applicants who failed the formal check) is not a country and is left out.
 * - Dual Polish-and-other citizens are not a separate row: the reports count them inside their other country's row.
 */

export type NawaAwardReportYear = 2022 | 2023 | 2024;

export interface NawaAwardReport {
  /** Link to the report PDF on nawa.gov.pl. */
  sourceUrl: string;
  /** Printed page(s) of the first-cycle and long-cycle table by citizenship. */
  page: string;
  /** Total in the report's own RAZEM row of that table, to check the transcription against. */
  reportTotal: number;
  /** Persons granted funding, by country of citizenship. */
  counts: Partial<Record<CountryCode, number>>;
}

export interface OfficialAwardContext {
  year: NawaAwardReportYear;
  count: number;
  sourceUrl: string;
  page: string;
}

/** Latest year first: the lookup stops at the first year in which a country has a row. */
export const nawaAwardReportYears = [2024, 2023, 2022] as const satisfies readonly NawaAwardReportYear[];

export const nawaAwardCounts: Record<NawaAwardReportYear, NawaAwardReport> = {
  // Tabela 54, "Kraje wnioskodawców – Anders NAWA – studia I stopnia i jednolite studia magisterskie".
  2024: {
    sourceUrl: 'https://nawa.gov.pl/images/2025/Sprawozdanie-z-dzialalnosci-NAWA-za-rok-2024.pdf',
    page: '48–49',
    reportTotal: 502,
    counts: {
      BY: 302,
      UA: 104,
      LT: 23,
      CZ: 16,
      KZ: 14,
      RU: 11,
      LV: 10,
      GE: 5,
      US: 4,
      MD: 2,
      TM: 2,
      UZ: 1,
      ES: 1,
      IT: 1,
      BE: 1,
      BR: 1,
      EC: 1,
      MK: 1,
      RO: 1,
      GB: 1,
    },
  },
  // Tabela 49, same title.
  2023: {
    sourceUrl: 'https://nawa.gov.pl/images/2024/Sprawozdanie-z-dzialalnosci-NAWA-za-rok-2023.pdf',
    page: '53–54',
    reportTotal: 525,
    counts: {
      BY: 329,
      UA: 106,
      LT: 29,
      CZ: 19,
      KZ: 11,
      RU: 11,
      MD: 3,
      GE: 3,
      US: 2,
      GB: 2,
      IT: 2,
      MK: 1,
      BR: 1,
      FR: 1,
      CO: 1,
      DE: 1,
      RO: 1,
      TM: 1,
      UZ: 1,
    },
  },
  // Tabela 49, same title. Column "liczba wniosków zakwalifikowanych do finansowania".
  2022: {
    sourceUrl: 'https://nawa.gov.pl/images/BIP/Sprawozdanie-z-dzialalnosci-NAWA-za-rok-2022.pdf',
    page: '50',
    reportTotal: 472,
    counts: {
      BY: 263,
      UA: 105,
      LT: 25,
      KZ: 16,
      RU: 15,
      CZ: 14,
      UZ: 6,
      LV: 6,
      MD: 5,
      GE: 3,
      JO: 3,
      DE: 2,
      IT: 2,
      BR: 1,
      FR: 1,
      HR: 1,
      CY: 1,
      US: 1,
      TM: 1,
      HU: 1,
    },
  },
};

/** Lookup over a given table; the real table is used by `officialAwardContext`. */
export function lookupOfficialAwardContext(
  table: Record<number, NawaAwardReport>,
  years: readonly number[],
  country: string,
): OfficialAwardContext | null {
  if (!isCountryCode(country)) return null;
  for (const year of years) {
    const report = table[year];
    const count = report?.counts[country];
    if (report && count !== undefined) {
      return { year: year as NawaAwardReportYear, count, sourceUrl: report.sourceUrl, page: report.page };
    }
  }
  return null;
}

/**
 * Persons granted a Director's scholarship for first-cycle or long-cycle studies, from the latest report (2024,
 * then 2023, then 2022) that lists the country, or `null`. Past official data only: never a chance, a cut-off or a
 * forecast (ADR 0021).
 */
export function officialAwardContext(country: string): OfficialAwardContext | null {
  return lookupOfficialAwardContext(nawaAwardCounts, nawaAwardReportYears, country);
}
