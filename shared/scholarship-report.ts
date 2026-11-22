import { nawaOrientationThreshold } from './nawa-score';

/**
 * The scholarship-holder survey (docs/adr/0012) is open only for holders of the Dyrektor NAWA scholarship in the
 * 2026 intake. Reports are kept per intake year like the surveys, and the dashboard card is shown only for a
 * survey of this year on the `nawa_director` track.
 */
export const scholarshipReportIntakeYear = 2026;

/** A kierunek typed by hand is private to its author and 1-80 characters long on one line (ADR 0012). */
export const scholarshipReportMaxCustomProgrammeLength = 80;

/**
 * The lowest survey score that can have received a scholarship (Ogłoszenie 13/2026 §2.7): no invitation and no
 * report below it ([ADR 0017](../../docs/adr/0017-orientation-mark-from-holder-scores.md)).
 */
export const scholarshipReportMinimumScore = nawaOrientationThreshold;

/** Trimmed, 1-80 characters, never empty and never more than one line. */
export function isCustomProgrammeTextValid(value: string): boolean {
  const trimmed = value.trim();
  return (
    trimmed.length >= 1 &&
    trimmed.length <= scholarshipReportMaxCustomProgrammeLength &&
    !/[\r\n]/.test(trimmed)
  );
}
