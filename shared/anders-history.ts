/**
 * Official, published figures for the Anders NAWA programme (Dyrektor NAWA scholarships).
 * NAWA does not publish per-country limits or cut-off scores, only the totals below.
 * Years not listed (2022, 2025, 2026) had no figures we could verify.
 */
export type AndersHistoryLevel = 'first_cycle' | 'second_cycle' | 'all_levels';

export type AndersHistoryEntry = {
  year: number;
  level: AndersHistoryLevel;
  applications: number;
  awarded: number;
  /** Awarded counts per country where the announcement names them. */
  awardedByCountry?: readonly (readonly [country: string, awarded: number])[];
  /** Largest countries when the announcement names them without counts. */
  largestCountries?: readonly string[];
  sourceUrl: string;
};

export const andersHistory: readonly AndersHistoryEntry[] = [
  {
    year: 2024,
    level: 'all_levels',
    applications: 1131,
    awarded: 619,
    largestCountries: ['BY', 'UA', 'LT', 'CZ', 'KZ'],
    sourceUrl: 'https://nawa.gov.pl/nawa/aktualnosci/znamy-wyniki-naboru-do-tegorocznej-edycji-programu-anders-nawa',
  },
  {
    year: 2023,
    level: 'all_levels',
    applications: 1149,
    awarded: 601,
    largestCountries: ['BY', 'UA', 'LT'],
    sourceUrl: 'https://forumakademickie.pl/ponad-600-stypendystow-w-programie-dla-polonii/',
  },
  {
    year: 2021,
    level: 'first_cycle',
    applications: 1762,
    awarded: 471,
    awardedByCountry: [
      ['BY', 297],
      ['UA', 79],
      ['KZ', 25],
    ],
    sourceUrl: 'https://isttravel.ru/index.pl?act=NEWSSHOW&id=2021082501',
  },
  {
    year: 2021,
    level: 'second_cycle',
    applications: 360,
    awarded: 131,
    awardedByCountry: [
      ['BY', 57],
      ['UA', 55],
    ],
    sourceUrl: 'https://isttravel.ru/index.pl?act=NEWSSHOW&id=2021082501',
  },
];

/** Share of submitted applications that received a Dyrektor NAWA scholarship. */
export function awardedShare(entry: Pick<AndersHistoryEntry, 'applications' | 'awarded'>): number {
  return entry.applications > 0 ? entry.awarded / entry.applications : 0;
}

/** Combined share of the named countries among all awarded in an entry, when counts are published. */
export function namedCountriesShare(entry: AndersHistoryEntry): number | null {
  if (!entry.awardedByCountry || entry.awarded <= 0) return null;
  const named = entry.awardedByCountry.reduce((sum, [, awarded]) => sum + awarded, 0);
  return named / entry.awarded;
}
