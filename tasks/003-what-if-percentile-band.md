# 003 — What-if shows an approximate percentile band

**Status:** In review

## Goal

On the landing, dragging the demo ruler changes the score *and* the percentile. On the dashboard, the same what-if (ruler, ± buttons and the "Средний балл для примерки" field in `ScoreScreen`) changes only the score and the threshold chip. The landing's promise breaks at the moment it matters. During a what-if, also show where that score would land in the user's own cohort, as an approximate band computed from the distribution the client already receives.

Intended behavior:

- **Applies only when** the what-if is active (`average !== current.averageGrade`) **and** the statistics are `success` with a detailed cohort: `groupResponseCount >= MIN_COHORT_SIZE` and `canShowScoreDistribution(groupSize, scoreBuckets)` is true. In every other state (loading, error, suppressed, small cohort, no buckets) nothing new is shown.
- **Computation:** `percentileInBuckets(whatIfScore, scoreBuckets, origin, step)` on the axis from `scoreAxisForTrack(current.scholarshipTrack)` (60–100, step 2.5 for Director). The band is the decile `low = min(floor(p / 10) * 10, 90)`, shown as `low–low+10`, the same rule as `ResultPreviewCard`.
- **What-if score ≥ the axis origin (60):** a line inside the what-if block, next to `Сохранённый балл: …`. ru: `≈ выше, чем у 70–80% группы`.
- **What-if score below the origin:** show `Ниже порога 60 — вне распределения группы` instead of a band, never `0–10%`.
- The rank (`N из M`), the exact saved percentile line, the median line and the density strips in `StatisticsPanel` keep showing the **saved** result and do not move during the what-if.
- "Вернуть сохранённое" (or typing the saved average) ends the what-if and removes the line.
- The band line is plain text, not an `aria-live` region, so dragging does not flood screen readers.

Only the 16 bucket counts the server already returns are used. `cohortScores` (exact scores) is **not** used, and no new data leaves the server.

## Context

- Relevant code and docs: `src/features/score/ScoreScreen.tsx` (what-if state, `isWhatIf`), `src/features/ProfileDashboard.tsx` (renders `ScoreScreen` and `StatisticsPanel` side by side; `ScoreScreen` does not receive statistics yet), `src/lib/score-buckets.ts` (`percentileInBuckets`, `scoreAxisForTrack`, `canShowScoreDistribution`), `src/components/ResultPreviewCard.tsx` (decile rule), `shared/product-rules.ts` (`MIN_COHORT_SIZE`), `src/i18n/*.ts` (`scoreScreen`).
- ADRs this task follows: [0003](../docs/adr/0003-cohort-ladder.md) (the cohort used is whatever tier the server picked), [0008](../docs/adr/0008-refocus-on-score-comparison.md) (the what-if is never saved). Replaces none.
- Dependencies and decisions already made: the maintainer chose "approximate percentile band from buckets, no exact rank" (2026-11-22). Bucket 0 also holds every score below 60 (see the SQL comment in `202611250001`), so the band is approximate near the threshold. This is accepted.

## Scope

- In scope:
  - pass the statistics state (or the derived buckets, group size and track) from `ProfileDashboard` into `ScoreScreen`;
  - a small pure helper for the band (e.g. `percentileBand(score, buckets, track)` in `src/lib/score-buckets.ts` → `{ kind: 'band', from, to } | { kind: 'belowAxis' }`);
  - two new `scoreScreen` locale keys in all five locales;
  - unit tests for the helper and component tests for `ScoreScreen`.
- Out of scope: moving the rank or median, a marker on the density strip, saving the what-if, changes to the API, SQL, disclosure thresholds or `cohortScores`, the dashboard layout order.
- Files or directories assigned to this task: `src/features/score/ScoreScreen.tsx` (+ new test file), `src/features/ProfileDashboard.tsx`, `src/lib/score-buckets.ts`, `src/lib/score-buckets.test.ts`, `src/i18n/*.ts`.

## Acceptance scenarios

| ID | Given / when | Expected result | Planned verification |
| --- | --- | --- | --- |
| B1 | Detailed cohort with buckets; the user drags or steps the average so the what-if score is ≥ 60 | A line `≈ выше, чем у {from}–{to}% группы` appears in the what-if block, with the decile from `percentileInBuckets` | `ScoreScreen` test with fixture buckets: assert the text for a known score |
| B2 | Same, what-if score < 60 | Line `Ниже порога 60 — вне распределения группы`; no percentage | `ScoreScreen` test |
| B3 | No what-if (saved average) | No band line | `ScoreScreen` test |
| B4 | Statistics loading, error, suppressed, group < 10, or buckets missing; what-if active | No band line; the rest of the what-if works as before | `ScoreScreen` tests for each state |
| B5 | What-if active | Rank, saved percentile line, median line and strips in `StatisticsPanel` are unchanged | Test in `ProfileDashboard` or `statistics-panel` scope asserting the saved values remain while the what-if is set |
| B6 | User presses "Вернуть сохранённое" | The band line disappears | `ScoreScreen` test |
| B7 | Band helper edges | p = 0 at the origin → `0–10`; p = 100 → `90–100`; score below the origin → `belowAxis`; empty buckets → no band | `score-buckets.test.ts` |
| B8 | All locales | Keys present and in sync | `src/i18n/locales.test.ts` |

## Must stay unchanged

- Behavior, contracts, or user-facing copy this task must not alter:
  - the what-if is never saved and never sent to the server;
  - the threshold chip and haptics on crossing 60;
  - the `StatisticsPanel` output for the saved score;
  - the API payload and the disclosure floor (10);
  - the landing demo card.
- Existing checks that already cover it: `src/features/statistics/statistics-panel.test.tsx`, `src/lib/score-tape.test.ts`, `src/lib/score-buckets.test.ts`, `src/pages/home-page.test.tsx`.

## Open decisions

- None.

## Verification

- `npm test -- src/lib/score-buckets.test.ts src/features/score src/features/statistics src/i18n` → B1–B8
- `make check`
- Manual (local fixtures, `make dev` after checking ports and `.env.local`): as a returning user in a cohort of ≥ 10, drag the ruler across 60 and back, then press "Вернуть сохранённое". As a user in a cohort below 10, check that no band appears. → B1, B2, B4, B6

## Handoff

| Scenario | Evidence (command, test assertion, or manual check) | Result |
| --- | --- | --- |
| B1 | `npm test -- src/lib/score-buckets.test.ts src/features/score src/features/statistics src/i18n` → `ScoreScreen what-if percentile band › shows the decile band for a what-if score at or above the axis origin`: steps the average to 4.55 (score 81.90) with 16×10 fixture buckets and asserts the line `≈ więcej niż u 50–60% grupy` (`pl.scoreScreen.percentileBand(50, 60)`), i.e. the decile from `percentileInBuckets` (p = 54.75). | pass |
| B2 | Same command → `… › says the score is below the axis instead of showing a band under 60`: types average 3 (score 54.00) and asserts the line is exactly `pl.scoreScreen.belowAxis` and contains no `%`. | pass |
| B3 | Same command → `… › shows no band for the saved average`: renders the saved average 4.50 and asserts `queryByTestId('what-if-percentile-band')` is absent. | pass |
| B4 | Same command → `… › shows no band while statistics are <state>` (six cases: loading, error, suppressed, cohort below the floor, `scoreBuckets: null`, buckets not the fine sixteen): each activates the what-if and asserts no band while `score-value` shows 81,90 and `pl.scoreScreen.savedScore('81,00')` remains. Manual small-cohort check not run (see below). | pass |
| B5 | Same command → `… › keeps the saved rank, percentile, median and strip in StatisticsPanel while the what-if changes the score`: renders `ProfileDashboard` with a detailed cohort, asserts `6. z 30`, `Wyżej niż 65% grupy`, `Poniżej mediany o 1,5 pkt` and the density-strip hint count, then activates the what-if, asserts the band appears and every saved value/count is unchanged. | pass |
| B6 | Same command → `… › removes the band when the saved average is restored`: activates the what-if, presses `pl.scoreScreen.reset`, asserts the band and the saved-score row disappear and the score returns to 81,00. | pass |
| B7 | Same suite → `score-buckets › turns a score into an approximate decile band` (score 60 → `0–10`, score 100 → `90–100`), `reports scores below the axis origin instead of a band` (59.5 and 0 → `belowAxis`), `has no band without a response distribution` (empty and all-zero buckets → `null`). | pass |
| B8 | Same suite → `locales › en/ru/uk/be has exactly the keys of pl` and `locales › <locale> has no empty strings and keeps function arity` cover `scoreScreen.percentileBand` and `scoreScreen.belowAxis` in all five locales; the Ukrainian/Belarusian letter tests also pass. | pass |

- Changed files:
  - `src/lib/score-buckets.ts` — new `percentileBand(score, buckets, track)` (decile band or `belowAxis`, `null` without a distribution).
  - `src/lib/score-buckets.test.ts` — helper edge tests.
  - `src/features/score/ScoreScreen.tsx` — accepts `statistics`, renders the band line in the what-if block only when active and the cohort is detailed.
  - `src/features/score/score-screen.test.tsx` — new component/integration tests for B1–B6.
  - `src/features/ProfileDashboard.tsx` — passes `statistics` to `ScoreScreen`.
  - `src/i18n/pl.ts`, `en.ts`, `ru.ts`, `uk.ts`, `be.ts` — `scoreScreen.percentileBand` and `scoreScreen.belowAxis`.
- Checks not run, blockers, or open questions:
  - `make check` not run — left to the orchestrator per the handoff instructions. The scoped suite and `npm run typecheck` both pass.
  - Manual `make dev` check (drag across 60 and back, reset, small cohort) not run — requires the local dev stack; orchestrator/manual.
  - Full suite (`src/pages/home-page.test.tsx`) not run; only the scoped tests above.
  - Tests ran with the only Node available in this environment, v22.8.0 (Homebrew `node`, not on the default PATH); `package.json` declares `>=22.12.0`. Both the scoped suite and typecheck pass, but CI should confirm on the required Node version.
- LLM contributions: Opus 5.5 — specification; DeepSeek V4.1 Flash 1017 — implementation.
