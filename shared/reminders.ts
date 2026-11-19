import type { SeasonCalendar } from './season';

export type ReminderKind = 'results_soon' | 'results_out' | 'intake_open';

export type Reminder = {
  /** Stable id such as "2026:results_out"; stored per subscriber to avoid repeats. */
  key: string;
  kind: ReminderKind;
  year: number;
  dueOn: string;
  /** Last day the reminder is still worth sending. */
  expiresOn: string;
};

const RESULTS_SOON_DAYS_BEFORE = 3;
const RESULTS_OUT_DAYS_AFTER = 1;
const RESULTS_OUT_VALID_DAYS = 90;

function shiftDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function toIsoDay(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/** Every reminder the calendar implies, in the order they fall due. Seasons without dates yield nothing. */
export function remindersForSeasons(seasons: readonly SeasonCalendar[]): Reminder[] {
  const reminders: Reminder[] = [];

  for (const season of seasons) {
    if (season.documentsFrom && season.documentsTo) {
      reminders.push({
        key: `${season.year}:intake_open`,
        kind: 'intake_open',
        year: season.year,
        dueOn: season.documentsFrom,
        expiresOn: season.documentsTo,
      });
    }
    if (season.resultsBy) {
      reminders.push({
        key: `${season.year}:results_soon`,
        kind: 'results_soon',
        year: season.year,
        dueOn: shiftDays(season.resultsBy, -RESULTS_SOON_DAYS_BEFORE),
        expiresOn: season.resultsBy,
      });
      const outOn = shiftDays(season.resultsBy, RESULTS_OUT_DAYS_AFTER);
      reminders.push({
        key: `${season.year}:results_out`,
        kind: 'results_out',
        year: season.year,
        dueOn: outOn,
        expiresOn: shiftDays(outOn, RESULTS_OUT_VALID_DAYS),
      });
    }
  }

  return reminders.sort((a, b) => a.dueOn.localeCompare(b.dueOn) || a.key.localeCompare(b.key));
}

/**
 * The one reminder a subscriber should receive today: the latest that is due and not expired, unless they
 * already got it (or a later one). A subscriber who joins late never receives a backlog.
 */
export function pickDueReminder(
  now: Date,
  lastReminderKey: string | null,
  reminders: readonly Reminder[],
): Reminder | null {
  const today = toIsoDay(now);
  const due = reminders.filter((reminder) => reminder.dueOn <= today && today <= reminder.expiresOn);
  const latest = due[due.length - 1];
  if (!latest) return null;

  const latestIndex = reminders.indexOf(latest);
  const lastIndex = lastReminderKey ? reminders.findIndex((reminder) => reminder.key === lastReminderKey) : -1;
  return lastIndex >= latestIndex ? null : latest;
}
