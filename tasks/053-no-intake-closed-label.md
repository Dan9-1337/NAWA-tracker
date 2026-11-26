# 053 — The app no longer says the intake is closed

**Status:** Ready

## Goal

Remove the claim "Набор 2026 закрыт" from the result card. The maintainer decided (2026-11-26) that the 2026 intake is not
closed: applicants are still receiving NAWA's decisions, so the process continues. The app has no data on the phase of the
process after the application window, and it must not guess one.

Intended behavior:

- The result card's header shows the application-window label (`Приём заявок до 9 июля`) **only while the window is open**
  (`isIntakeOpen(now, season)` with a season that has dates). At every other time, and for an intake year without dates in
  `seasons` (for example 2027), it shows **no label at all**: nothing replaces it.
- No other screen, locale or document in the repository says that the 2026 intake is closed or over. The wording of the
  decisions about the status ladder ([ADR 0008](../docs/adr/0008-refocus-on-score-comparison.md)) is history and stays; the
  product documents must not repeat "the intake is over" as a present fact.

## Context

- Relevant code and docs: `src/features/statistics/StatisticsPanel.tsx` (`seasonLabel`), `src/features/dashboard/ResultHeroCard.tsx`
  (`ResultCard`, the `badge` of `CardHeader`), `shared/season.ts` (`isIntakeOpen`, `seasonForYear`, the comment on
  `seasonForYear`), `src/i18n/{ru,uk,be,pl,en}.ts` (`scoreScreen.seasonClosed`, `scoreScreen.seasonOpen`),
  `docs/product-flow.md` (the lines that say the 2026 intake is over or closed), `docs/assumptions.md` (D17).
- ADRs this task follows: [0008](../docs/adr/0008-refocus-on-score-comparison.md) (its context said the intake was over; the decision, no
  status ladder, is unaffected), [0018](../docs/adr/0018-intake-year-from-the-database.md). Replaces none. It supersedes the
  "intake closed" expectation of [task 034](034-intake-year-from-the-database.md) scenario A5, which this task's A3 replaces.
- Dependencies and decisions already made: the maintainer's statement above. Tasks 034 and 046 are `Done`. This task comes
  before 047, which edits the same card.

## Scope

- In scope: the label logic in `StatisticsPanel`; `ResultCard`'s `seasonLabel` becoming optional with no empty badge or gap;
  removing `seasonClosed` from the five locales and its type; the comment in `shared/season.ts`; the tests that assert the closed
  text; the product-flow lines; checking the README, landing FAQ and privacy copy for the same claim.
- Out of scope: a replacement phase label ("decisions are being published"), `calendarPhase`, the season calendar, the bot's
  calendar reminders, the start screen's kicker, any change to ADR 0008's text.
- Files or directories assigned to this task: `src/features/statistics/StatisticsPanel.tsx`, `src/features/dashboard/ResultHeroCard.tsx`,
  `src/features/statistics/statistics-panel.test.tsx`, `src/features/ProfileDashboard.test.tsx` and `src/pages/home-page.test.tsx`
  where they assert the text, `shared/season.ts` and `shared/season.test.ts`, `src/i18n/*`, `docs/product-flow.md`.

## Acceptance scenarios

| ID | Given / when | Expected result | Planned verification |
| --- | --- | --- | --- |
| A1 | A returning user with a 2026 survey, on a date after 9 July 2026 | The result card header shows the title and no season text; no "закрыт" / "closed" appears on the card | `statistics-panel.test.tsx` |
| A2 | The same user on a date inside the window (fake clock, for example 2026-05-01) | The header shows `Приём заявок до 9 июля` (locale-formatted date) | `statistics-panel.test.tsx` |
| A3 | The server reports intake year 2027, which has no dates in `seasons` | No label, no crash; the card renders as in A1 | `statistics-panel.test.tsx` |
| A4 | The five locale files and `types.ts` | `seasonClosed` is gone from all; `seasonOpen` stays; key sets still equal | `src/i18n/locales.test.ts` |
| A5 | Search `src`, `docs/product-flow.md`, `README.md` for the intake being closed or over (`закрыт`, `завершен`, `zakończony`, `intake closed`, `is over`) | No present-tense claim remains; any match is a historical statement about the status ladder and is listed in the handoff | `grep` output in the handoff |
| A6 | `ResultCard` with no label | No empty badge element and no extra vertical gap in the header | Component test or reviewer read |

## Must stay unchanged

- Behavior, contracts, or user-facing copy this task must not alter: the `seasonOpen` text and its condition, `calendarPhase`,
  the season calendar data, the statistics and position rules, the bot's reminders, the start screen.
- Existing checks that already cover it: `src/features/statistics/statistics-panel.test.tsx`, `shared/season.test.ts`,
  `src/i18n/locales.test.ts`, `docs-consistency.test.ts`.

## Open decisions

- None.

## Verification

- `npm test -- src/features src/pages shared/season src/i18n` → A1–A4, A6
- `grep -rniE "закрыт|завершен|zakończon|intake closed|is over" src docs/product-flow.md README.md` → A5
- `make check`

## Handoff

| Scenario | Evidence (command, test assertion, or manual check) | Result |
| --- | --- | --- |
| A1 | | |
| A2 | | |
| A3 | | |
| A4 | | |
| A5 | | |
| A6 | | |

- Changed files:
- Checks not run, blockers, or open questions:
- LLM contributions: Claude Sonnet 5.5 (Claude Code): specification; the maintainer's decision recorded in `docs/assumptions.md` (D17). Implementation and review: not yet done.
