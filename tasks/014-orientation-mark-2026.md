# 014 — "Ориентир 2026": lowest reported holder score per country, for every user

**Status:** In review

## Goal

Implement [ADR 0017](../docs/adr/0017-orientation-mark-from-holder-scores.md). Every user with a 2026 Director survey sees, for their own country of citizenship, the lowest score with which a reporting scholarship holder of that country received the scholarship in 2026. It is shown as a line on the result card, a mark on the what-if ruler, and holder dots in the full distribution.

Intended behavior:

- **Data.** For the user's `ranking_country`, take the scholarship reports (task 012) of the 2026 intake on the `nawa_director` track whose survey is not `is_suspicious`. The mark is the lowest `score_snapshot` and `n` is their number. The user's own report, if any, counts like any other. There is no minimum: `n` can be 1.
- **Who sees it.** Every user whose survey is of intake year 2026 on the Director track, whether or not they have a report. Other intake years show nothing of this feature.
- **Result card.** One line under the position in the country:
  - `n ≥ 1`: ru `Беларусь: самый низкий балл среди стипендиатов 2026, ответивших в NAWAmeter (14). Не данные NAWA.`
  - `n = 0`: ru `Беларусь: ориентира 2026 пока нет.` If the user's survey scores at least 60, the line goes on: ` Получили стипендию? Расскажите — и он появится.` Tapping it opens the scholarship-holder flow of task 012. Below 60 the second sentence is not shown, consistent with task 012, which shows no invitation then.
  - The line is shown on the full card and on the "only you" card of task 013.
  - Country names are never declined (ADR 0010). Other locales follow the glossary.
- **What-if ruler.** When `n ≥ 1`, a mark at the mark's value labelled ru `ориентир 2026`, styled like the existing threshold-60 mark and next to it. It stays fixed while the user drags. When `n = 0` there is no mark. The ruler is never saved, as before.
- **Full distribution** (`Показать полное распределение`, which exists only when the country has ≥ 2 surveys, task 013). Holder scores are drawn as dots over the distribution of the country's 2026 surveys, and the lowest dot is labelled `ориентир 2026`. The small distribution on the card itself does not change.
- **Payload.** The server returns the mark value, `n` and, for the dots, the list of holder score snapshots of the country. It returns only numbers, never identities, survey ids or report fields other than the score. The holder-score list is returned only together with the full distribution data.
- **Privacy copy** (`privacyNotice` and FAQ, five locales). A point says that the scores of scholarship holders who answered the survey are shown to all users as their country's ориентир, without names, and that with few holders acquaintances may recognise a score.

## Context

- Relevant docs: [ADR 0017](../docs/adr/0017-orientation-mark-from-holder-scores.md), [ADR 0016](../docs/adr/0016-scholarship-holder-results-page-without-minimum.md), [ADR 0015](../docs/adr/0015-compare-within-citizenship-country-without-minimum.md), [ADR 0010](../docs/adr/0010-locale-glossary-and-english-api-errors.md), [`docs/assumptions.md`](../docs/assumptions.md) (P1, D12, D13, R8).
- Dependencies and decisions already made:
  - **Depends on task 012**, which adds `score_snapshot` and the rule that blocks reports below 60, and on **task 013** (country-only statistics, the "only you" card). Start after both are merged.
  - Maintainer decisions (2026-11-22): name `ориентир 2026`, never "проходной"; formats E (ruler mark) and G (dots over the distribution); shown to everyone; no minimum, the count always shown; the `n = 0` line with the invitation; 2026 only.
  - No product events in this task.

## Scope

- In scope: a server computation (a migration with a new or extended RPC, named to sort after task 012's `202612020001_scholarship_reports.sql`, and its SQL tests), contract and schema, the result-card line, the ruler mark, the dots in the full distribution, copy in five locales, the privacy point, and updates to `docs/architecture.md` (changelog) and `docs/product-flow.md`.
- Out of scope: other intake years; the public "Стипендия NAWA в цифрах" page and the 2026 freeze; asking applicants who were not awarded; showing other holder results (centres, fields, universities) to non-contributors; changing task 012's results page.
- Files or directories assigned to this task: the implementation agent names them from the areas above before starting. It must not touch task 012's report flow or task 013's statistics rules beyond reading their outputs.

## Acceptance scenarios

| ID | Given / when | Expected result | Planned verification |
| --- | --- | --- | --- |
| A1 | BY has holder reports with snapshots 72, 80, 95 | A BY user sees the line with `(3)`, the ruler mark at 72 and three dots in the full distribution; the lowest dot is labelled | SQL test + dashboard tests |
| A2 | BY has one holder report (snapshot 88) | Line with `(1)` and the mark at 88 | SQL test + dashboard test |
| A3 | BY has no holder reports; the user's survey scores 70 / 55 | The line `Беларусь: ориентира 2026 пока нет.` plus the invitation sentence at 70, without it at 55; no ruler mark; no dots | dashboard tests |
| A4 | Tap the invitation sentence | The scholarship-holder flow of task 012 opens | dashboard test |
| A5 | A holder report whose survey is `is_suspicious` | Not counted in the mark, `n` or the dots | SQL test |
| A6 | A holder edits their survey from 72 to 65 without saving the report | The mark stays 72 (the snapshot) | SQL test |
| A7 | A holder deletes their report, or their survey | Their snapshot disappears from the mark, `n` and the dots | SQL test |
| A8 | The user's own country has only their own survey ("only you" card, task 013) and one holder report exists | The line and the ruler mark are shown; no dots (no full distribution) | dashboard test |
| A9 | A user with a survey of another intake year | Nothing of this feature is shown | dashboard test |
| A10 | Payload | Contains only numbers (mark, `n`, score list); no identity, survey or report fields | contract test + SQL test |
| A11 | Copy | New keys in five locales; the privacy point present; locale parity passes; no "проходной" anywhere in the new copy | `npm test -- src/i18n` + reviewer read |

## Must stay unchanged

- Behavior, contracts, or user-facing copy this task must not alter: the score formula and threshold 60; the score comparison of task 013; task 012's flow and results page and their contributors-only rule; the landing counter; the edit limit; server-side `initData` verification.
- Existing checks that already cover it: the SQL and handler tests of tasks 012 and 013, `api/responses.test.ts`, `src/i18n/locales.test.ts`.

## Open decisions

- None.

## Verification

- `npm run test:db:pglite` → A1, A2, A5–A7, A10; CI runs pgTAP
- `npm test` for the dashboard, statistics and score tests the agent touches, and for the contracts → A1–A4, A8–A10
- `npm test -- src/i18n` → A11
- `make check`
- Manual (local fixtures, `make dev` after checking ports 3000/3001 and `.env.local`): seed holder reports in one country and none in another; open the dashboard as users of both countries, scores above and below 60, and drag the ruler → A1, A3, A8

## Handoff

| Scenario | Evidence (command, test assertion, or manual check) | Result |
| --- | --- | --- |
| A1 | `npm run test:db:pglite` → `orientation_mark.sql` passes 28 assertions, including `A1: three BY holder reports are counted, the UA one is not`, `A1: the mark is the lowest snapshot of the country`, `A1: the full-distribution request lists every holder snapshot, ascending`. `npm test -- src/features/dashboard/orientation-mark.test.tsx` → `shows the line with (3), the ruler mark at 72 and three labelled dots` (line `(3)`, `orientation-mark-ruler` label, 3 `orientation-mark-dot`, labelled lowest dot). | pass |
| A2 | `npm run test:db:pglite` → `A2: one counted holder is enough`, `A2: the mark is the single holder snapshot` (88), `A2: the single snapshot is the whole score list`. Dashboard: `shows a single holder with (1) and the mark` (line `(1)`, ruler mark present). | pass |
| A3 | `npm test -- src/features/dashboard/orientation-mark.test.tsx` → `shows no mark when the country has no counted holder` (missing line, no ruler mark, no dots); `adds the invitation at 60 or above…` (invitation sentence present at score 81); `leaves the invitation out below 60` (score 54, no invitation, no ruler mark). | pass |
| A4 | `npm test -- src/features/dashboard/orientation-mark.test.tsx` → `adds the invitation at 60 or above and opens the holder flow`: clicking `orientation-mark-line` opens `data-testid="scholarship-flow"` of task 012. | pass |
| A5 | `npm run test:db:pglite` → `A5: a suspicious holder at 80 does not lower the mark`, `A5: a suspicious holder is not counted` (n = 2), `A5: a suspicious holder has no dot in the list` (`[72, 95]`). | pass |
| A6 | `npm run test:db:pglite` → `A6: the mark starts from the saved snapshot` (81), `A6: the survey now scores 65`, `A6: the mark stays at the 81 snapshot`, `A6: the stored snapshot is unchanged`. | pass |
| A7 | `npm run test:db:pglite` → `A7: deleting the report at 72 moves the mark to 88`, `A7: the deleted report leaves the count`, `A7: deleting the last holder survey leaves no mark`, `A7: no holders remain`, `A7: a country without holders has no score list`. | pass |
| A8 | `npm test -- src/features/dashboard/orientation-mark.test.tsx` → `shows the line and the ruler mark on the "only you" card without a distribution`: `only-you-notice` and the `(1)` line, ruler mark present, no full-distribution disclosure. | pass |
| A9 | `npm test -- src/features/dashboard/orientation-mark.test.tsx` → `shows nothing of the feature for another intake year` (2027 profile: no line, no ruler mark, `getOrientationMark` not called). `npm run test:db:pglite` → `A9 SQL: a 2025 survey sees nothing of the 2026 mark`, `A9 SQL: the mark exists only for the 2026 intake`, `A9 SQL: a caller without any survey gets null`. | pass |
| A10 | `npm test -- shared/api-contracts.test.ts` → `orientation mark contracts`: strict schema accepts only `mark`, `n` and the optional ascending `scores`; rejects identity/survey/report fields and inconsistent values. `npm test -- api/orientation-mark.test.ts` → 7 tests, including `reads the caller’s mark and n without the holder score list` (RPC `p_include_scores: false`), `returns the ascending holder scores only with the full distribution request` and `never forwards a score list without the full distribution request`. `npm run test:db:pglite` → `A10: without the full distribution the score list is not returned`, `A10: the payload carries only mark, n and the score list`, `A10: the score list holds numbers only`. | pass |
| A11 | `npm test -- src/i18n` → 4 files, 85 tests pass (key parity, no-empty and function-arity checks over pl/en/ru/uk/be). New `explains the 2026 holder-score reference and never calls it a pass mark` passes for every locale, and the privacy point matched in each. Reviewer read still needed for tone. | pass |

- Changed files:
  - `supabase/migrations/202612030001_orientation_mark.sql` (new `get_orientation_mark` RPC)
  - `supabase/tests/orientation_mark.sql` (new), `supabase/tests/test-files.mjs`, `supabase/tests/migration-contracts.test.ts`
  - `shared/contracts.ts`, `shared/validation.ts`, `shared/api-contracts.test.ts`
  - `api/orientation-mark.ts` (new), `api/orientation-mark.test.ts` (new)
  - `src/lib/api-client.ts`, `src/lib/api-client.test.ts`
  - `src/features/dashboard/useOrientationMark.ts` (new), `src/features/dashboard/ResultHeroCard.tsx`, `src/features/dashboard/DistributionDetailsSection.tsx`, `src/features/dashboard/orientation-mark.test.tsx` (new)
  - `src/features/statistics/StatisticsPanel.tsx`, `src/features/score/ScoreScreen.tsx`, `src/features/ProfileDashboard.tsx`
  - `src/components/ScoreTape.tsx`, `src/components/DensityStrip.tsx`, `src/index.css`
  - `src/i18n/pl.ts`, `src/i18n/en.ts`, `src/i18n/ru.ts`, `src/i18n/uk.ts`, `src/i18n/be.ts`, `src/i18n/locales.test.ts`
  - `src/features/ProfileDashboard.test.tsx`, `src/features/scholarship-report/scholarship-report.test.tsx`, `src/features/score/score-screen.test.tsx` (mock the new endpoint)
  - `docs/architecture.md`, `docs/product-flow.md`, this brief
- Checks not run, blockers, or open questions:
  - `make check` is left to the orchestrator as instructed.
  - No manual Telegram/browser pass and no local `make dev` run (guardrails: ports, `.env.local`); visual placement of the stacked ruler labels and the dots was not checked on a device.
  - Local runs are PGlite only; the PostgreSQL/pgTAP suite runs in CI. No blockers.
- LLM contributions: Claude Opus 5.5 (Claude Code) — specification of this brief, [ADR 0017](../docs/adr/0017-orientation-mark-from-holder-scores.md), and the matching `docs/assumptions.md` entries. DeepSeek V4.1 Flash — implementation.
