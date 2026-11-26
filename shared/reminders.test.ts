import { describe, expect, it } from 'vitest';
import { pickDueReminder, remindersForSeasons } from './reminders';
import { seasons } from './season';

const day = (iso: string) => new Date(`${iso}T12:00:00Z`);
// The 2026 season keeps the results reminders off, so the picking tests below use it with the flag switched on.
const resultsOn = seasons.map((season) => ({ ...season, resultsRemindersEnabled: true }));
const reminders = remindersForSeasons(resultsOn);

describe('remindersForSeasons', () => {
  it('creates only the intake reminder for 2026 while the results flag is off', () => {
    expect(remindersForSeasons(seasons).map((reminder) => [reminder.key, reminder.dueOn])).toEqual([
      ['2026:intake_open', '2026-03-31'],
    ]);
    const flagAbsent = seasons.map(({ resultsRemindersEnabled: _flag, ...season }) => season);
    expect(remindersForSeasons(flagAbsent).map((reminder) => reminder.key)).toEqual(['2026:intake_open']);
  });

  it('returns both results reminders with the same dates once the flag is on, and skips seasons without dates', () => {
    expect(reminders.map((reminder) => [reminder.key, reminder.dueOn])).toEqual([
      ['2026:intake_open', '2026-03-31'],
      ['2026:results_soon', '2026-09-27'],
      ['2026:results_out', '2026-10-01'],
    ]);
  });

  it('yields nothing for a season without dates, even with the flag on', () => {
    const tba = { year: 2027, documentsFrom: null, documentsTo: null, resultsBy: null, resultsRemindersEnabled: true };
    expect(remindersForSeasons([tba])).toEqual([]);
  });

  it('lets the results reminder expire after 90 days', () => {
    expect(reminders.find((reminder) => reminder.key === '2026:results_out')?.expiresOn).toBe('2026-12-30');
  });
});

describe('pickDueReminder', () => {
  it('sends nothing before a reminder is due', () => {
    expect(pickDueReminder(day('2026-03-30'), null, reminders)).toBeNull();
  });

  it('sends the latest due reminder once and then stays quiet', () => {
    const first = pickDueReminder(day('2026-10-02'), null, reminders);
    expect(first?.key).toBe('2026:results_out');
    expect(pickDueReminder(day('2026-10-03'), first!.key, reminders)).toBeNull();
  });

  it('never replays a backlog to a late subscriber', () => {
    expect(pickDueReminder(day('2026-11-19'), null, reminders)?.key).toBe('2026:results_out');
  });

  it('does not send an older reminder after a later one', () => {
    expect(pickDueReminder(day('2026-09-28'), '2026:results_out', reminders)).toBeNull();
  });

  it('sends the earlier reminder first when it is the latest due one', () => {
    expect(pickDueReminder(day('2026-09-28'), '2026:intake_open', reminders)?.key).toBe('2026:results_soon');
  });

  it('stops reminding once everything has expired', () => {
    expect(pickDueReminder(day('2027-02-01'), null, reminders)).toBeNull();
  });

  it('treats an unknown stored key as never sent', () => {
    expect(pickDueReminder(day('2026-10-02'), '2025:results_out', reminders)?.key).toBe('2026:results_out');
  });
});
