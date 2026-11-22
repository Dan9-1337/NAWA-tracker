# 013 — Compare only within the country of citizenship, with no minimum number of responses

**Status:** Ready

## Goal

Implement [ADR 0015](../docs/adr/0015-compare-within-citizenship-country-without-minimum.md). The applicant's position (rank, percentile, median, distribution, what-if band) is computed only among valid surveys of their own country of citizenship on the same track and intake year, with no floor of 10. Country groups and the whole-track tier no longer appear anywhere in the score comparison.

Intended behavior:

- **Cohort.** Non-suspicious (`not is_suspicious`) surveys with the same `ranking_country`, `scholarship_track` and active intake year. Nothing else: no country group, no whole track.
- **Full card** when that cohort has **at least 2** valid surveys: everything the card shows today for a cohort of ten or more. That means rank line `N из M · <country>` with the flag, percentile line, median meta, mini distribution, full-distribution disclosure, and the what-if percentile band (task 003). The response count stays visible as it is now (`В выборке: M`). Percentile rounding (`formatPercentileValue`) and distribution bin counts (`displayBinCount`) stay as they are.
- **"Only you" card** when the cohort has **0 or 1** valid surveys. The score and the threshold-60 chip as today, then one line and nothing else: no percentile, no median, no distribution, no what-if band, no comparison with all countries. Russian copy (other locales follow the [ADR 0010](../docs/adr/0010-locale-glossary-and-english-api-errors.md) glossary; no case declension of the country name, no gendered form):
  - ru `Беларусь: пока только ваша анкета в наборе 2026.`: country display name, then the intake year of the survey.
  - The unofficial-sample caption is not shown on this card. Today it is shown only when the body is about a cohort.
- **Known limitation, accepted:** a flagged (`is_suspicious`) owner whose country has exactly one other valid survey sees the "only you" card, because their own survey is not in the cohort. They are not told about the flag ([ADR 0014](../docs/adr/0014-flag-per-country-spikes-for-manual-review.md)).
- **Statistics payload** (same 14 keys, so old and new clients and servers keep parsing each other during a deploy):
  - `sameCountryCount`: the cohort size, always a number ≥ 0 (no floor, never `null`).
  - `detailsAvailable`: `true` exactly when the cohort has ≥ 2 surveys.
  - `groupResponseCount`, `rankTotal`: the cohort size when `detailsAvailable`, otherwise `0` / `null` as today.
  - `cohortScope`: `'country'` when `detailsAvailable`, otherwise `null`; `'group'` and `'track'` are never sent.
  - `cohortGroupId`, `trackWideMedian`: always `null`.
  - The SQL assertion `assert_statistics_result` and the zod `statisticsResultSchema` enforce exactly this: details from 2 surveys, scope only `'country'`, no group id, no track median, `sameCountryCount` non-negative without a floor.
- **Copy that would become untrue** is rewritten in all five locales (ru given; others per glossary):
  - `privacyNotice` point at ru line ~167 keeps the meaning without "по группам": `Ваши отдельные ответы никому не видны — только числа по вашей стране. Аккаунт хранится как код, вычисленный из Telegram ID, а не как сам ID.`
  - Point ~172 (`Небольшие страны объединяются в группы, а баллы получивших стипендию показываются интервалами по 5 баллов.`) is replaced by: `Имён и Telegram-аккаунтов в статистике нет, но в стране, где ответов немного, знакомые могут догадаться, чей это балл.`
  - FAQ/about at ru ~212: drop `или группы стран`. At ~221: drop `Небольшие страны объединяются в группы, поэтому выделить отдельную анкету невозможно.` and add the same sentence as the new point ~172. At ~224: `Ваша позиция и процентиль считаются только среди ответов из вашей страны гражданства.`
  - `cohort.groupNote`, `cohort.trackNote`, `cohort.trackWide`, `cohort.groups`, and the whole `dashboard.smallCountry` block are removed when nothing uses them any more. A new key holds the "only you" line.
  - Generic words such as `группа` in `Место в группе` and `Медиана группы` stay. Rewording them is out of scope.

## Context

- Relevant code and docs: `supabase/migrations/202611250001_cleanup_and_thresholds.sql` (`assert_statistics_result`, `compute_country_statistics`), `supabase/migrations/202611210001_cohort_ladder.sql` (callers at lines ~419, ~488), `shared/contracts.ts` (`StatisticsResult`, `cohortScopes`), `shared/validation.ts` (`statisticsResultSchema`), `shared/product-rules.ts`, `shared/test-statistics.ts`, `api/_lib/questionnaire.ts` (`statisticsFields`), `src/features/statistics/StatisticsPanel.tsx`, `src/features/dashboard/ResultHeroCard.tsx` (`DetailedPosition`, `SmallCohortNotice`, `trackBenchmarkCopy`), `src/features/score/ScoreScreen.tsx` (what-if gate at line ~70), `src/lib/score-buckets.ts` (`canShowScoreDistribution`), `src/lib/stats-verdict.ts`, `src/lib/cohort-label.ts`, `src/i18n/*.ts`, `docs/architecture.md` (line ~71 and changelog), `docs/product-flow.md` (Dashboard section), `README.md` (cohort ladder paragraph and "Privacy And Limits").
- ADRs this task follows or replaces: follows [0015](../docs/adr/0015-compare-within-citizenship-country-without-minimum.md), which supersedes [0003](../docs/adr/0003-cohort-ladder.md). Also [0010](../docs/adr/0010-locale-glossary-and-english-api-errors.md), [0014](../docs/adr/0014-flag-per-country-spikes-for-manual-review.md).
- Dependencies and decisions already made:
  - Maintainer decisions (2026-11-22): country of citizenship only; no floor; the "only you" line approved in the form `<Страна>: пока только ваша анкета в наборе 2026`.
  - `MIN_COHORT_SIZE` / `min_cohort_size()` stay: the landing counter (`intake_summary`) still uses them. `country_groups` and `country_group_id()` stay in the database, unused by the score statistics.
  - **Do not run in parallel with tasks 009 or 012.** All three edit `shared/contracts.ts`, `shared/validation.ts` and `src/i18n/*.ts`. Start after task 009 is merged; the order with 012 does not matter. The migration name below sorts after those of tasks 009, 010 and 012.

## Scope

- In scope:
  - Migration `supabase/migrations/202612010001_country_only_statistics.sql`: `create or replace` of `compute_country_statistics` and `assert_statistics_result` with the rules above. Same signatures and grants.
  - Contract, zod schema, test fixture (`shared/test-statistics.ts`) and API projection updates.
  - UI: full card from 2 surveys, the "only you" card, the what-if band and distribution gated on `detailsAvailable` instead of `MIN_COHORT_SIZE`. Group and track notes and the all-countries benchmark removed.
  - Five-locale copy changes listed above.
  - Docs: `docs/architecture.md` (statistics paragraph, changelog entry for the migration), `docs/product-flow.md`, `README.md`.
- Out of scope: the landing counter and its floor; the scholarship-holder survey (task 012); `get_cohort_outcomes` and other retired RPCs; dropping `country_groups` or `cohortGroupId` / `trackWideMedian` keys; renaming "группа" in other copy; the spike rule and the edit limit.
- Files or directories assigned to this task: the new migration, `supabase/tests/statistics.sql`, `supabase/tests/cohort_ladder.sql` (rewrite to the new rule or replace with `country_only_statistics.sql`, and register it in `supabase/tests/test-files.mjs` if needed), `supabase/tests/migration-contracts.test.ts`, `shared/contracts.ts`, `shared/validation.ts` (+ tests), `shared/product-rules.ts` (+ test), `shared/test-statistics.ts`, `api/_lib/questionnaire.ts`, `src/features/statistics/*`, `src/features/dashboard/ResultHeroCard.tsx`, `src/features/score/ScoreScreen.tsx` (+ test), `src/lib/score-buckets.ts`, `src/lib/stats-verdict.ts`, `src/lib/cohort-label.ts` (+ tests), `src/i18n/*.ts`, `docs/architecture.md`, `docs/product-flow.md`, `README.md`.

## Acceptance scenarios

| ID | Given / when | Expected result | Planned verification |
| --- | --- | --- | --- |
| A1 | Country BY has 3 valid surveys (the user's included); its group and the track have many more | `detailsAvailable: true`, `cohortScope: 'country'`, `groupResponseCount = rankTotal = sameCountryCount = 3`; median and percentile from those 3 only; buckets sum to 3 | SQL test |
| A2 | The user is the only valid survey of their country | `detailsAvailable: false`, `sameCountryCount: 1`, every detail field `null`/0; the card shows the score, the chip and `<Страна>: пока только ваша анкета в наборе 2026.` with no percentile, median, distribution, what-if band or caption | SQL test + statistics-panel test |
| A3 | Country has exactly 2 valid surveys | Full card: rank `N из 2 · <country>`, percentile, median, distribution; what-if band shown when a what-if is active | SQL test + statistics-panel / score-screen tests |
| A4 | Country has 9 valid surveys | Full card, same as for 10+ (no "не хватает анкет", no group or track note) | statistics-panel test |
| A5 | A suspicious survey in the user's country | Excluded from every count | SQL test |
| A6 | Any statistics result | `cohortScope` is never `'group'` or `'track'`, `cohortGroupId` and `trackWideMedian` are `null`; the SQL assertion and the zod schema reject a payload that breaks the rules above | SQL test + `shared/validation` test |
| A7 | Copy | The privacy and FAQ points no longer say small countries are pooled or that a survey cannot be singled out; the new sentence is present; removed keys are gone in all five locales; locale parity passes | `npm test -- src/i18n` + reviewer read |
| A8 | Landing page | The response counter still appears only from 10 responses | existing `intake_summary.sql` and landing tests unchanged and passing |

## Must stay unchanged

- Behavior, contracts, or user-facing copy this task must not alter:
  - the score formula and threshold 60; the 14 keys of the statistics payload;
  - the landing counter, `MIN_COHORT_SIZE` and `min_cohort_size()` and their contract test;
  - `/api/responses` create/update/delete behavior, the edit limit (task 009), the spike flagging (task 010);
  - percentile rounding and bin counts; the edit-wizard cohort-change warning;
  - server-side `initData` verification.
- Existing checks that already cover it: `supabase/tests/intake_summary.sql`, `supabase/tests/migration-contracts.test.ts`, `shared/product-rules.test.ts`, `api/responses.test.ts`, `src/lib/score-buckets.test.ts`, `src/pages/home-page.test.tsx`.

## Open decisions

- None.

## Verification

- `npm run test:db:pglite` → A1–A3, A5, A6 (SQL), A8; CI runs pgTAP
- `npm test -- shared/validation.test.ts shared/product-rules.test.ts api/` → A6, A8
- `npm test -- src/features/statistics src/features/score src/lib src/i18n` → A2–A4, A7
- `make check`
- Manual (local fixtures, `make dev` after checking ports 3000/3001 and `.env.local`): seed 1, 2 and 9 surveys in one country and open the dashboard as a returning user for each; check a first-time user's result screen in the same three cases → A2–A4

## Handoff

| Scenario | Evidence (command, test assertion, or manual check) | Result |
| --- | --- | --- |
| A1 | | |
| A2 | | |
| A3 | | |
| A4 | | |
| A5 | | |
| A6 | | |
| A7 | | |
| A8 | | |

- Changed files:
- Checks not run, blockers, or open questions:
- LLM contributions: Claude Opus 5.5 (Claude Code) — specification of this brief and [ADR 0015](../docs/adr/0015-compare-within-citizenship-country-without-minimum.md).
