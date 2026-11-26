# 047 — Hub result card: plain position, people dots or position bar, official context

**Status:** Ready

## Goal

Make the hub's result card answer "where am I among people from my country" in plain words and without the density strip
([ADR 0020](../docs/adr/0020-dashboard-hub-and-pages.md), [ADR 0021](../docs/adr/0021-official-award-counts-as-context.md)).
The card keeps the score and the threshold chip, and its body becomes, top to bottom, for a country with two or more valid
surveys (`detailsAvailable`):

1. the rank line, as today (`1 из 4 · Казахстан`, with the flag);
2. the **position visual** and its caption:
   - **15 surveys or fewer** (`groupResponseCount ≤ smallCohortLimit`): one dot per survey, left to right by rank. The first
     `rankPosition − 1` dots are "above you" (solid), then the user's dot (larger, ringed), then the rest (light). The caption
     says how many are above: `Выше вас: 2 из 4`. Ties use the API's `rankPosition` only: "above you" never counts a person
     with an equal score.
   - **16 or more**: one horizontal position bar filled to `(rankTotal − rankPosition + 1) / rankTotal` (rank 1 fills it) and the tier word as the
     caption: `Верхняя четверть среди анкет в приложении`. Tiers by `rankPosition / rankTotal`: ≤ 0.10 `Лучшие 10%`;
     ≤ 0.25 `Верхняя четверть`; ≤ 0.50 `Верхняя половина`; otherwise `Нижняя половина`. Wording is descriptive and
     never speaks of chances;
3. the `ориентир 2026` line, as today (`OrientationMarkLine`, including the holder invitation when no holder has answered);
4. the **official context line** from task 045 when `officialAwardContext(country)` has a row:
   `Казахстан: в 2024 NAWA выдало 16 стипендий Директора (отчёт NAWA за 2024)`. The country name stays in the nominative
   in all five locales, so no locale has to inflect it (the example sentence in ADR 0021 is illustrative); no row, no line;
5. the **small-cohort reason**, only while `groupResponseCount ≤ smallCohortLimit` (the whole card body for 0–1 surveys
   included): `Пока 4 анкеты из Казахстана. Чем больше друзей, тем точнее сравнение.` For 0–1 surveys the existing
   `onlyYou` sentence stays and the reason is `Позовите друзей из вашей страны — тогда появится сравнение.`;
6. one disclosure `Как это читать` (collapsed, not persisted): two sentences that say these are surveys of people from the
   country in the app, an unofficial sample and not a NAWA ranking, and that `ориентир 2026` is the lowest score among
   holders who answered here, so the real cut-off may be lower;
7. the unofficial-sample caption, as today.

Removed from the hub card: the percentile line (`Выше, чем у 75% группы`), the median lines (`Выше медианы на …`,
`Близко к медиане группы`), the `В выборке: … · медиана …` line, the `Распределение баллов в вашей группе` hint and the mini
`DensityStrip`. A statistics **error** shows its message with a `Повторить` button that loads the statistics again; while
loading, the score and the chip are already visible and a skeleton stands where the position will be (as today).

## Context

- Relevant code and docs: `src/features/dashboard/ResultHeroCard.tsx` (`ResultCard`, `DetailedPosition`, `OnlyYouNotice`,
  `OrientationMarkLine`), `src/features/statistics/StatisticsPanel.tsx`, `src/pages/HomePage.tsx` (`loadStatistics`),
  `src/lib/cohort-label.ts`, `src/i18n/plural.ts`, `shared/nawa-award-counts.ts` (task 045), [Product flow](../docs/product-flow.md).
- ADRs this task follows: [0020](../docs/adr/0020-dashboard-hub-and-pages.md), [0021](../docs/adr/0021-official-award-counts-as-context.md),
  [0015](../docs/adr/0015-compare-within-citizenship-country-without-minimum.md), [0017](../docs/adr/0017-orientation-mark-from-holder-scores.md),
  [0019](../docs/adr/0019-minimum-text-size-14px.md). Replaces none.
- Dependencies and decisions already made: tasks 045 (the lookup), 046 (the hub shell), 053 (no intake-closed label), 054
  (the quiet threshold status) and 055 (no "updated" stamp; it also edits `HomePage.tsx` and `ProfileDashboard.tsx`) are `Done`; this task
  edits the same card and the same files after them. The switch at 15
  surveys is a drawing and wording rule, not a disclosure threshold (assumption D15); the position still appears from two
  surveys (D4). The ru strings above are the intended copy; write uk, be, pl and en from the locale glossaries (ADR 0010).
  The saved score keeps the largest type on the screen; it may shrink by one size step if the hub needs it to fit, never
  below 40px.

## Scope

- In scope: the card body above; `PositionVisual` (dots and bar); `positionTier` and the shared constant `smallCohortLimit = 15`
  (task 048 reuses it); the retry on a statistics error (`onRetryStatistics` from `HomePage` through `ProfileDashboard` to
  `StatisticsPanel`); i18n keys and the removal of the keys only the removed lines used; `docs/product-flow.md` (Dashboard
  section) for the new card.
- Out of scope: the invite button and its label (048); the What-if page (049); the holder card (050); deleting
  `DensityStrip` and the distribution disclosure (052; this task only stops using the mini variant); any server change;
  changing the position rules of ADR 0015; new product events (`score_viewed` and `position_or_fallback_viewed` keep their
  triggers).
- Files or directories assigned to this task: `src/features/dashboard/ResultHeroCard.tsx`, `src/features/dashboard/PositionVisual.tsx`
  (new), `src/features/dashboard/position-visual.test.tsx` (new), `src/lib/position-tier.ts` and its test (new),
  `src/features/statistics/StatisticsPanel.tsx`, `src/features/statistics/statistics-panel.test.tsx`,
  `src/features/dashboard/orientation-mark.test.tsx`, `src/features/ProfileDashboard.tsx` (prop pass-through only),
  `src/pages/HomePage.tsx`, `src/pages/home-page.test.tsx`, `src/i18n/*`, `docs/product-flow.md`.

## Acceptance scenarios

| ID | Given / when | Expected result | Planned verification |
| --- | --- | --- | --- |
| A1 | Four surveys in the country, the user is 1st | Rank line `1 из 4 · <country>`; four dots, the first one ringed and larger; caption `Выше вас: 0 из 4`; no percentile, median, `В выборке` or density hint text | `position-visual.test.tsx`, `statistics-panel.test.tsx` |
| A2 | Fifteen surveys, rank 6 | Fifteen dots, five "above", the ringed sixth; the group has `role="img"` with a label that names rank, total and how many are above | `position-visual.test.tsx` |
| A3 | Sixteen surveys, rank 3 (3/16 = 0.19) | No dots; a position bar filled to 87.5% and the caption `Верхняя четверть среди анкет в приложении` | `position-visual.test.tsx` |
| A4 | `positionTier` at 12/240, 60/240, 120/240, 121/240 | `top10`, `topQuarter`, `topHalf`, `lowerHalf` | `position-tier.test.ts` |
| A5 | The country has a row in the 2024 table (for example Kazakhstan) | The official line with year 2024 and the report source appears under the `ориентир` line; a country without a row shows no such line | `statistics-panel.test.tsx` with a mocked `officialAwardContext` |
| A6 | Fifteen surveys or fewer, and also 0 or 1 survey | The small-cohort reason line shows (the count in the 2+ case, the other sentence in the 0–1 case); with 16 or more it does not | `statistics-panel.test.tsx` |
| A7 | The user taps `Как это читать` | The two sentences appear and the control reports `aria-expanded`; it starts collapsed on every visit | `statistics-panel.test.tsx` |
| A8 | Hub at 390×700 for the tallest state: no holder report yet and eligible (holder card shown), 4 surveys, a country with an official row, the reason line | The hub (card, holder card, two link rows and Telegram main button) fits without vertical scroll; if it does not, spacing or copy length is reduced, never text below 14px | Manual (`make dev`), screenshot in the handoff |
| A9 | The statistics request fails | The message and a `Повторить` button show; pressing it shows the skeleton and requests again; success replaces it with the card body | `home-page.test.tsx` |
| A10 | While statistics load | Score and chip visible, skeleton in place of the position | Existing test passes |
| A11 | `ориентир 2026` with no holder and a survey ≥ 60 | The invitation to the holder flow still opens it | `orientation-mark.test.tsx` passes |
| A12 | All five locales | New keys exist in all five; removed keys are gone from all five; glossary tests pass | `src/i18n/locales.test.ts`, `src/i18n/glossary.test.ts` |

## Must stay unchanged

- Behavior, contracts, or user-facing copy this task must not alter: the score, chip, rank and `ориентир` calculations; the
  statistics payload (14 keys); `canShowScoreDistribution`; the position being shown from two surveys; the holder-flow
  invitation; the unofficial caption; the What-if page and everything on it; the invite button.
- Existing checks that already cover it: `src/features/statistics/statistics-panel.test.tsx`,
  `src/features/dashboard/orientation-mark.test.tsx`, `src/features/ProfileDashboard.test.tsx`, `src/pages/home-page.test.tsx`.

## Open decisions

- None.

## Verification

- `npm test -- src/features src/lib/position-tier src/pages src/i18n` → A1–A7, A9–A12
- `make check`
- Manual: `make dev` with the demo users; screenshot of the tallest state at 390×700 → A8

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
| A9 | | |
| A10 | | |
| A11 | | |
| A12 | | |

- Changed files:
- Checks not run, blockers, or open questions:
- LLM contributions: Claude Sonnet 5.5 (Claude Code): specification; ADRs 0020 and 0021. Implementation and review: not yet done.
