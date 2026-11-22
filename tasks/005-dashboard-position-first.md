# 005 — Dashboard: position first, what-if second

**Status:** In review

## Goal

The product exists to answer "where does my score stand among other applicants" ([ADR 0003](../docs/adr/0003-cohort-ladder.md), [ADR 0008](../docs/adr/0008-refocus-on-score-comparison.md)). On the dashboard that answer comes last. A returning user scrolls past the giant score, the tape, the what-if field, the profile rows and the formula before they reach rank, percentile and distribution. The score itself they already saw in the wizard preview.

Reorder the single dashboard screen so that the saved result **and** the position in the cohort open the screen. The what-if comes next, then the details. Remove the blocks that repeat each other.

### Current order (`ProfileDashboard` → `ScoreScreen` + `StatisticsPanel`)

1. Saved confirmation (`✓ Сохранено`, temporary)
2. `ScoreScreen`:
   - label + season label;
   - score at 88–132px;
   - threshold chip;
   - `ScoreTape` + hint;
   - what-if input block;
   - profile rows (citizenship, average, scale, Polish school);
   - formula line + disclaimer.
3. `StatisticsPanel` → `ResultHeroCard`:
   - title "Ваш результат" + `DataSourceBadge`s;
   - "Разбор балла" `<details>`;
   - then either `DetailedPosition` (median line, rank line, pooled note, percentile, mini `DensityStrip`, cohort meta) or `SmallCohortNotice`.
4. `DistributionDetailsSection`: "Показать полное распределение".

### Proposed order

1. Saved confirmation (unchanged).
2. **Result card**: everything about the saved result in one card.
   - Season label.
   - Saved score (size per D1) + threshold chip.
   - Detailed cohort: rank line (`N из M · flag country`), percentile line, median line, pooled note, mini strip, cohort meta.
   - Small cohort: the `SmallCohortNotice` content.
   - Statistics loading or error: the existing status text inside the card, below the score.
3. **What-if block**: tape + hint + what-if input, laid out per D2. Task 003's percentile band lives here.
4. **Full distribution** disclosure (unchanged behavior, detailed cohorts only).
5. **Profile block**: profile rows (unchanged edit links) + formula line + disclaimer.

Duplicates are removed as decided below (D3, D4).

## Context

- Relevant code and docs:
  - `src/features/ProfileDashboard.tsx`
  - `src/features/score/ScoreScreen.tsx`
  - `src/features/statistics/StatisticsPanel.tsx`
  - `src/features/dashboard/ResultHeroCard.tsx`
  - `src/features/dashboard/DistributionDetailsSection.tsx`
  - `src/components/DashboardCard.tsx`, `DataSourceBadge.tsx`, `DensityStrip.tsx`, `ScoreTape.tsx`
  - `docs/product-flow.md` ("Dashboard (authenticated)")
- ADRs this task follows: [0003](../docs/adr/0003-cohort-ladder.md), [0008](../docs/adr/0008-refocus-on-score-comparison.md). The dashboard stays a single screen with no tabs, so 0008 is not changed. Replaces none.
- Dependencies and decisions already made:
  - Implement **after** [003](003-what-if-percentile-band.md) and [004](004-remove-confirm-screen.md); all three touch `ProfileDashboard.tsx` / `ScoreScreen.tsx`.
  - The what-if is never saved (0008).

## Scope

- In scope: the order and grouping of the dashboard blocks, the score size, the removal of duplicate blocks, the locale keys that become unused, updated tests, the dashboard paragraph in `docs/product-flow.md`.
- Out of scope:
  - new data or API fields;
  - disclosure thresholds and the cohort ladder;
  - invite or reminder CTAs (separate task);
  - header subtitle "Обновлено …";
  - Settings;
  - the landing;
  - visual redesign beyond moving and resizing existing elements.
- Files or directories assigned to this task: `src/features/ProfileDashboard.tsx`, `src/features/score/`, `src/features/statistics/`, `src/features/dashboard/`, `src/i18n/*.ts`, `src/pages/home-page.test.tsx`, `docs/product-flow.md`.

## Acceptance scenarios

| ID | Given / when | Expected result | Planned verification |
| --- | --- | --- | --- |
| D-A1 | Returning user, detailed country cohort | Top to bottom: result card (score, chip, rank, percentile, median, mini strip, meta) → what-if → distribution disclosure → profile block | Component test asserting DOM order of headings/test ids |
| D-A2 | Same, 375×667 viewport inside Telegram (≈ 560px content height) | Score, chip, rank line and percentile line are visible without scrolling | Manual check in Telegram (iOS or desktop with that window size) |
| D-A3 | Small cohort (< 10) | Result card shows score, chip and the small-cohort text (participants, remaining, track median) | `statistics-panel.test.tsx` / new test |
| D-A4 | Statistics loading / error | Score and chip render immediately; the loading or error text appears inside the result card; the what-if works | Component tests |
| D-A5 | What-if active | Result card keeps the **saved** score, chip, rank and percentile; the what-if block shows the what-if score, its chip and the 003 band | Component test |
| D-A6 | Duplicates | No "Разбор балла" disclosure and no source badges. The formula line (with the bonus when present) is in the profile block. The caption reads `Неофициально · выборка NAWAmeter по стране` for a country cohort and `Неофициально · выборка NAWAmeter` for group/track | Component tests for country and pooled cohorts and for a profile with the Polish-school bonus |
| D-A10 | No what-if | The what-if block shows tape, hint and input, but no what-if score or chip; the result card's score is at the reduced size (D1) | Component test; manual visual check |
| D-A7 | Profile rows | Each row opens the same wizard step as today | Existing / updated test |
| D-A8 | Events | `score_viewed` and `position_or_fallback_viewed` fire once each, as today | Existing test in `statistics-panel.test.tsx` |
| D-A9 | Locales and docs | Unused keys removed in all five locales; `locales.test.ts` passes; product-flow describes the new order | `npm test -- src/i18n`; doc diff |

## Must stay unchanged

- Behavior, contracts, or user-facing copy this task must not alter:
  - the API payloads and what each state shows (detailed / small / loading / error / suppressed);
  - the cohort label and pooled notes;
  - the disclosure floor;
  - the what-if rules and haptics;
  - edit links;
  - analytics events;
  - the closing confirmation;
  - Settings.
- Existing checks that already cover it: `src/features/statistics/statistics-panel.test.tsx`, `src/pages/home-page.test.tsx`, `src/lib/score-tape.test.ts`.

## Open decisions

- None. Resolved by the maintainer on 2026-11-22:
  - **D1 — Score size:** shrink the saved score in the result card to about 56–64px (a display size in that range), so that D-A2 holds.
  - **D2 — What-if number:** the result card always shows the **saved** score, chip, rank and percentile. The what-if block has its own score (smaller than the card's), its own threshold chip and the 003 band. The what-if number and chip appear only while a what-if is active; otherwise the block shows the tape, the hint and the input. Dragging the tape never changes anything in the result card.
  - **D3 — Breakdown:** remove the "Разбор балла" `<details>` (`ScoreBreakdown` in `ResultHeroCard.tsx`). Keep the formula line + disclaimer in the profile block; it must still show the Polish-school bonus when there is one.
  - **D4 — Source badges:** remove the `DataSourceBadge`s from the card header. Add one small caption at the end of the result card: ru `Неофициально · выборка NAWAmeter по стране` when the cohort is the user's country, `Неофициально · выборка NAWAmeter` otherwise (group or track). It appears in every state where the card shows a cohort, small-cohort notice included.
  - **ADR:** not needed; this is a layout change, documented in `docs/product-flow.md`.

## Verification

- `npm test -- src/features src/pages src/i18n` → D-A1, D-A3–D-A10
- `make check`
- Manual (local fixtures, `make dev` after checking ports and `.env.local`): a returning user in a detailed cohort, in a small cohort, and with statistics failing (stop the API). Repeat at 375×667 in Telegram. → D-A2, D-A4, D-A5

## Handoff

| Scenario | Evidence (command, test assertion, or manual check) | Result |
| --- | --- | --- |
| D-A1 | `npm test -- src/features/score/score-screen.test.tsx` → "dashboard layout > orders the saved result card, what-if, distribution and profile block top to bottom": `compareDocumentPosition` card → what-if block → distribution disclosure → profile block, and inside the card score → chip → rank → percentile → median | pass |
| D-A2 | Manual check not run — requires the local dev stack and a Telegram WebView at 375×667; left to the orchestrator/manual pass | not run |
| D-A3 | `npm test -- src/features/statistics/statistics-panel.test.tsx` → "renders suppressed state with the score, chip and small-cohort text": `saved-score-value` = 81,00, `saved-score-chip` present, "Do rankingu krajowego potrzeba jeszcze 1 ankiet", base caption | pass |
| D-A4 | `npm test -- src/features/statistics/statistics-panel.test.tsx` → "renders unavailable, loading, and error states inside the result card" (score 81,00 + chip, status/alert is a descendant of the card section); `npm test -- src/features/score/score-screen.test.tsx` → "keeps the what-if usable while statistics load and shows the status inside the card" (increase → what-if 81,90, saved 81,00) | pass |
| D-A5 | `npm test -- src/features/score/score-screen.test.tsx` → "keeps the saved score, chip, rank and percentile while the what-if changes the score": saved score/chip/rank/percentile/median/strip unchanged (81,00; "O 21,00 pkt powyżej progu 60"; "6. z 30"; "Wyżej niż 65% grupy"), what-if score 81,90, chip "O 21,90…", band present | pass |
| D-A6 | `npm test -- src/features/statistics/statistics-panel.test.tsx` → "renders the position and the country caption for detailed cohorts" (`Nieoficjalnie · próba NAWAmeter w Twoim kraju`), "names the pooled country group when the own country is too small" and "says so when the comparison falls back to all countries" (base caption, country variant absent), "keeps the score breakdown and the source badges out" (`details` and `.stat-badge` null), "writes the D4 caption in Russian…" (`Неофициально · выборка NAWAmeter по стране` / `Неофициально · выборка NAWAmeter`); `npm test -- src/features/score/profile-details.test.tsx` → "includes the Polish-school bonus in the saved formula" (`4,50 × 90 ÷ 5 + 10 = 91,00`) and "builds the formula from the saved values without a bonus" | pass |
| D-A10 | `npm test -- src/features/score/score-screen.test.tsx` → "shows only the tape, hint and input when no what-if is active": slider, hint and input inside `what-if-block`, no `what-if-score-value` / `what-if-threshold-chip`, saved score has `text-[clamp(56px,16vw,64px)]` | pass |
| D-A7 | `npm test -- src/features/score/profile-details.test.tsx` → "opens the same wizard step from each profile row": citizenship → `education`, average/scale/polish → `grades`; `npm test -- src/pages/home-page.test.tsx` → "updates the average from the grades step of the edit wizard" | pass |
| D-A8 | `npm test -- src/features/statistics/statistics-panel.test.tsx` → "fires score_viewed and position_or_fallback_viewed exactly once each": one call per event name, plus no calls while loading | pass |
| D-A9 | `npm test -- src/i18n` → `locales.test.ts` "has exactly the keys of pl" for en/ru/uk/be and the Ukrainian/Belarusian letter checks; removed `dataSource`, `scoreScreen.scoreLabel`, `dashboard.score` and `dashboard.hero.scoreBreakdown` in all five locales; `docs/product-flow.md` dashboard paragraph and changelog bullet updated | pass |

- Changed files: `src/features/ProfileDashboard.tsx`; `src/features/dashboard/ResultHeroCard.tsx`; `src/features/statistics/StatisticsPanel.tsx`; `src/features/score/ScoreScreen.tsx`; `src/features/score/ThresholdChip.tsx` (new); `src/features/score/ProfileDetails.tsx` (new); `src/features/score/score-screen.test.tsx`; `src/features/score/profile-details.test.tsx` (new); `src/features/statistics/statistics-panel.test.tsx`; `src/features/ProfileDashboard.test.tsx` (test ids only); `src/pages/home-page.test.tsx`; `src/i18n/{pl,en,ru,uk,be}.ts`; `src/components/DataSourceBadge.tsx` (deleted — only `ResultHeroCard` used it and its `dataSource` copy is removed); `docs/product-flow.md`.
- Checks not run, blockers, or open questions: `make check` not run (orchestrator). The 375×667 Telegram viewport check (D-A2) not run — no local dev stack/WebView in this session. No blockers. Deviation to confirm in review: the deleted `DataSourceBadge` component has no remaining user; `shared/data-source-labels.ts` and its test were left in place (outside the assigned scope).
- LLM contributions: Opus 5.5 — specification; DeepSeek V4.1 Flash 1017 — implementation.
