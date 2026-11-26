# 055 — Remove the "Обновлено сегодня в 21:43" stamp

**Status:** Ready

## Goal

Remove the line under the app title that says `Обновлено сегодня в 21:43`. It is not the time the data was updated: it is the
moment the browser received the statistics (`new Date()` in `ProfileDashboard`), so it always reads "just now", and it implies
a live feed that does not exist. The maintainer decided to remove it (2026-11-26).

Intended behavior: the header shows the title and the Settings button, and no subtitle line, on every screen and in every
locale. The header does not change height while the page loads (the subtitle's late arrival used to move the page).

## Context

- Relevant code and docs: `src/pages/HomePage.tsx` (`statsUpdatedAt`, `statsSubtitle`, the `subtitle` prop, `onStatsUpdatedAt`),
  `src/features/ProfileDashboard.tsx` (`statsUpdatedAt`, `onStatsUpdatedAt`, the effects that stamp it), `src/components/MiniAppShell.tsx`
  (`subtitle`), `src/lib/format.ts` (`updatedStampKind`, `formatShortDayTime`, `formatClockTime`), `src/i18n/*` (`delta.updatedToday`,
  `updatedYesterday`, `updatedQuiet`), [Product flow](../docs/product-flow.md).
- ADRs this task follows: none. Replaces none. `formatClockTime` and `updatedStampKind` are also used by the edit-limit message in
  `HomePage.tsx`; they stay if still used there.
- Dependencies and decisions already made: the maintainer's decision above. Tasks 029, 033 and 041 that touch `HomePage` are `Done`, and so is
  [task 046](046-dashboard-hub-and-page-shell.md): it restructures `ProfileDashboard.tsx`, which holds half of the stamp chain, so this task
  builds on its result instead of competing with it.

## Scope

- In scope: removing the stamp chain end to end (state, prop, effect, subtitle, i18n keys, unused helpers and their tests);
  keeping `MiniAppShell`'s optional `subtitle` prop only if something else uses it, otherwise removing it; reserving the header's
  height so it does not shift; `docs/product-flow.md` if it mentions the stamp.
- Out of scope: any other header content; the Settings button; the statistics loading logic.
- Files or directories assigned to this task: `src/pages/HomePage.tsx`, `src/pages/home-page.test.tsx`, `src/features/ProfileDashboard.tsx`,
  `src/features/ProfileDashboard.test.tsx`, `src/components/MiniAppShell.tsx`, `src/components/mini-app-shell.test.tsx`, `src/lib/format.ts`
  and its test, `src/i18n/*`, `docs/product-flow.md`.

## Acceptance scenarios

| ID | Given / when | Expected result | Planned verification |
| --- | --- | --- | --- |
| A1 | A returning user's statistics load successfully | The header contains the title and the Settings button and no `Обновлено…` text | `home-page.test.tsx` |
| A2 | Loading, error and first-time screens | No subtitle on any of them; the header height is the same on all (no jump when the page changes state) | `mini-app-shell.test.tsx` or a layout assertion on a fixed min height |
| A3 | Search `src` for `updatedToday`, `updatedYesterday`, `updatedQuiet`, `statsUpdatedAt`, `onStatsUpdatedAt` | No match | `grep` output in the handoff |
| A4 | The edit-limit message (`EDIT_LIMIT_REACHED` with a retry time) | Still shows the local time or date as before | Existing test passes |
| A5 | Five locales | The removed keys are gone from all and `types.ts`; key sets still match | `src/i18n/locales.test.ts` |

## Must stay unchanged

- Behavior, contracts, or user-facing copy this task must not alter: the statistics requests and states, the edit-limit message,
  the Settings button, the title.
- Existing checks that already cover it: `src/pages/home-page.test.tsx`, `src/features/ProfileDashboard.test.tsx`,
  `src/components/mini-app-shell.test.tsx`, `src/i18n/locales.test.ts`.

## Open decisions

- None.

## Verification

- `npm test -- src/pages src/features src/components/mini-app-shell src/lib/format src/i18n` → A1–A5
- `make check`

## Handoff

| Scenario | Evidence (command, test assertion, or manual check) | Result |
| --- | --- | --- |
| A1 | | |
| A2 | | |
| A3 | | |
| A4 | | |
| A5 | | |

- Changed files:
- Checks not run, blockers, or open questions:
- LLM contributions: Claude Sonnet 5.5 (Claude Code): specification. Implementation and review: not yet done.
