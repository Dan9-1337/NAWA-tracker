# 072 — The two "results" reminders wait for the maintainer's flag

**Status:** In review

## Goal

Stop the bot from announcing results the app cannot confirm. `remindersForSeasons` creates `results_soon` (3 days before
`resultsBy`) and `results_out` (1 day after it, valid 90 days) purely from the calendar date 30 September. The maintainer's
position (2026-11-26, assumption D17) is that decisions are still being published, so `Результаты набора 2026 уже известны` can be false for
subscribers who are still waiting. The subscription reply also promises results reminders.

Intended behavior:

1. A season carries an explicit **`resultsRemindersEnabled`** flag (default `false` / absent). `remindersForSeasons` creates the
   `results_soon` and `results_out` reminders only for seasons where it is `true`. The `intake_open` reminder is not affected.
2. For the 2026 season the flag is `false`. The maintainer sets it to `true` in `shared/season.ts` (and deploys) when the results are
   really out or the publication date is confirmed; nothing else changes then.
3. The subscription reply and any text that promises results reminders is reworded so it promises only what the bot sends:
   ru `Напомню, когда начнётся приём заявок. Выключить — /stop.` (keep the shorter note about the stored Telegram id after it); the other
   four locales follow the glossaries.
4. A subscriber whose last sent reminder key is already `2026:results_out` is not affected (no new send). If a reminder was already
   sent before this change, the implementer says so in the handoff only if the code or logs show it; it cannot be undone.

## Context

- Relevant code and docs: `shared/reminders.ts` (`remindersForSeasons`, `pickDueReminder`), `shared/season.ts` (`SeasonCalendar`, `seasons`),
  `shared/bot-messages.ts` (`subscribed`, `alreadySubscribed`, `results_soon`, `results_out`, `intake_open`), `api/cron/reminders.ts`,
  `shared/reminders.test.ts`, [ADR 0006](../docs/adr/0006-opt-in-bot-reminders.md), `docs/assumptions.md` (D17).
- ADRs this task follows: [0006](../docs/adr/0006-opt-in-bot-reminders.md) (reminders are calendar-driven; this adds the maintainer's gate). Replaces none.
- Dependencies and decisions already made: the maintainer approved disabling the two reminders until they enable them (2026-11-26).
  Tasks 053 and 070 are `Done` (they edit the same locale files and bot messages). The cron's schedule and delivery do not change.

## Scope

- In scope: the `resultsRemindersEnabled` flag on `SeasonCalendar`; the filter in `remindersForSeasons`; the reworded `subscribed` text;
  tests; `docs/architecture.md` (reminders paragraph) and `docs/product-flow.md` if they describe results reminders.
- Out of scope: the reminder texts themselves, the cron, the subscription store, a UI for the flag, the `intake_open` reminder.
- Files or directories assigned to this task: `shared/reminders.ts`, `shared/reminders.test.ts`, `shared/season.ts` and `shared/season.test.ts`,
  `shared/bot-messages.ts`, `api/bot.test.ts`, `api/cron/reminders.test.ts`, `docs/architecture.md`, `docs/product-flow.md`.

## Acceptance scenarios

| ID | Given / when | Expected result | Planned verification |
| --- | --- | --- | --- |
| A1 | The 2026 season (`resultsBy` set, flag absent) | `remindersForSeasons` returns only `2026:intake_open`; no `results_soon` or `results_out` | `shared/reminders.test.ts` |
| A2 | The same season with `resultsRemindersEnabled: true` | Both results reminders return with the same dates as today | `shared/reminders.test.ts` |
| A3 | The cron on 2026-10-01 or later with the flag off | No results reminder is picked for any subscriber | `api/cron/reminders.test.ts` |
| A4 | A season without dates | Yields nothing, as today | Existing test passes |
| A5 | `/subscribe` in five locales (fake sender) | The reply promises only the application-start reminder and the `/stop` way out | `api/bot.test.ts` |
| A6 | Search the bot texts for a promise of results reminders | None remain while the flag exists as the only trigger; the texts of `results_soon` and `results_out` stay for when the flag is on | `grep` output in the handoff |
| A7 | Docs | The architecture and product-flow reminders sections say the results reminders need the flag | Reviewer read |

## Must stay unchanged

- Behavior, contracts, or user-facing copy this task must not alter: the cron schedule and endpoint, the subscription store and
  its removal rules, the `intake_open` reminder and its texts, no reminder is sent from tests (fake sender).
- Existing checks that already cover it: `shared/reminders.test.ts`, `api/cron/reminders.test.ts`, `api/bot.test.ts`, `shared/season.test.ts`.

## Open decisions

- None.

## Verification

- `npm test -- shared api src/i18n` → A1–A6
- `make check`
- Reviewer read of the docs → A7

## Handoff

| Scenario | Evidence (command, test assertion, or manual check) | Result |
| --- | --- | --- |
| A1 | `shared/reminders.test.ts` "creates only the intake reminder for 2026 while the results flag is off" (flag false and flag absent both give only `2026:intake_open`) | Pass |
| A2 | `shared/reminders.test.ts` "returns both results reminders with the same dates once the flag is on" (09-27 and 10-01 as before) | Pass |
| A3 | `api/cron/reminders.test.ts` "sends no results reminder while the season flag is off" (2026-09-28, 2026-10-01, 2026-11-19: nothing sent or marked) | Pass |
| A4 | `shared/reminders.test.ts` "yields nothing for a season without dates" plus existing 2027 season in `seasons`; "stops reminding once everything has expired" | Pass |
| A5 | `api/bot.test.ts` `it.each` over pl/en/ru/uk/be: reply contains the application-start promise, `/stop` and "Telegram ID", and no "results" word | Pass |
| A6 | `grep -n -i "result\|wynik\|результат\|вынік" shared/bot-messages.ts`: results words remain only in the `results_soon`/`results_out` texts and the welcome "see your score"; no `subscribed`/`alreadySubscribed`/`help` text promises results reminders. `src/i18n/*.ts` mentions only generic "Reminders in the bot" (not in this task's files, unchanged) | Pass |
| A7 | `docs/architecture.md` (endpoint table, new-intake steps, changelog bullet) and `docs/product-flow.md` (bot section) now say the results reminders need `resultsRemindersEnabled` | Reviewer read |

- Changed files: `shared/season.ts` (flag on `SeasonCalendar`, explicit `false` in `season2026`), `shared/reminders.ts`, `shared/reminders.test.ts`, `shared/bot-messages.ts` (`subscribed` in 5 locales), `api/bot.test.ts`, `api/cron/reminders.test.ts` (existing cases moved to `intake_open` on 2026-05-15 because the cron uses the real `seasons`), `docs/architecture.md`, `docs/product-flow.md`.
- Checks not run, blockers, or open questions: `npm test -- shared api src/i18n` (33 files, 380 tests) and `npm run typecheck` pass; `make check` not run (orchestrator runs it). The `shared/season.test.ts` file was not changed (existing tests still pass). Nothing in the code or logs shows whether a results reminder was already sent.
- LLM contributions: Claude Sonnet 5.5 (Claude Code): specification; the finding came from a read-only copy audit by a Claude research subagent. Claude Sonnet 5.5 (implementation).
