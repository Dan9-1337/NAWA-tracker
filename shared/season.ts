export type SeasonPhaseId = 'documents' | 'evaluation' | 'results' | 'university';

/** Official dates for the Anders NAWA intake 13/2026 (Dyrektor NAWA track). */
export const season2026 = {
  year: 2026,
  documentsFrom: '2026-03-31',
  documentsTo: '2026-07-09',
  resultsBy: '2026-09-30',
} as const;

/** Official dates of one intake; null while NAWA has not announced them. */
export type SeasonCalendar = {
  year: number;
  documentsFrom: string | null;
  documentsTo: string | null;
  resultsBy: string | null;
};

/** Known intakes, oldest first. The next intake is added with its dates once NAWA publishes the call. */
export const seasons: readonly SeasonCalendar[] = [
  { ...season2026 },
  { year: 2027, documentsFrom: null, documentsTo: null, resultsBy: null },
];

/**
 * The intake the app records against. Records are keyed by (account, intake year) and statistics are scoped
 * to `season_config.active_intake_year`, so rolling over to a new intake means changing this constant and that
 * row together (see docs/architecture.md, "Season rollover").
 */
export const currentIntakeYear: number = season2026.year;

function isoToday(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/** True while applications can be submitted. A season whose dates are not announced yet is never open. */
export function isIntakeOpen(now: Date = new Date(), season: SeasonCalendar = season2026): boolean {
  if (!season.documentsFrom || !season.documentsTo) return false;
  const today = isoToday(now);
  return today >= season.documentsFrom && today <= season.documentsTo;
}

/** The real application system; NAWAmeter is an unofficial companion. */
export const nawaSystemUrl = 'https://programs.nawa.gov.pl';
