# 029 — Dashboard: the ruler row is always shown, spacing fixes, amber "below the median"

**Status:** In review

## Goal

Four dashboard problems found on 2026-11-26 (the maintainer's notes plus a Chrome pass); the first and third are
decided by the maintainer.

1. **The row under the ruler appears only after the ruler is moved.** Under the measuring tape, `ScoreScreen` renders the
   large number with "/ 100" and the threshold chip ("На 29,10 балла выше порога 60") only while
   `average !== current.averageGrade` (`isWhatIf`). With the ruler untouched the area under the tape is empty.
   **Decision (maintainer, 2026-11-26): show the row always.** Untouched, it shows the saved score and its chip; when the
   ruler moves, it shows the what-if score and chip, as now.
2. **That row sits too close to the "Средний балл для симуляции" card** (the number, for example "84,70 / 100" or even
   "0,00 / 100", and its chip nearly touch the card below; the number's tight line height makes the gap look smaller than
   it is). The row also sits right under the "Перетащите линейку…" caption. Today the row has `mt-3` (12 px below the
   caption) and the card `mt-4` (16 px below the row).
3. **"Ниже медианы на 23,5 балла" is green**, the same positive colour as "Выше медианы…". `ResultHeroCard` hardcodes
   `text-[var(--color-positive)]` for every median line (`ResultHeroCard.tsx:183`). **Decision (maintainer, 2026-11-26):
   below the median uses a warning (amber) colour.** No token is named for it; `--color-accent` (#ffc72c) is a brand
   fill and does not read as text on the light card. The only amber text token, `--color-reliability` (#8a5a00 light,
   #ffc72c dark), belongs to the `.stat-badge--reliability` style; its values give 5.9:1 on #ffffff and 10.6:1 on
   #1d1f24 and may be reused as the values of the new token.
4. **"Показать полное распределение" is too close to the edge of its card.** `.disclosure-row` in `src/index.css`
   pulls the button out by `margin: 0 -0.75rem` and pads it back by `padding: 0.625rem 0.75rem`; the button's
   `!px-0 !py-0` (`DistributionDetailsSection.tsx:33`) removes the padding but keeps the negative margins, so the label
   and the chevron sit about 2 px from the card's edges instead of at the card's 14 px content inset
   (`DashboardCard`, `px-3.5`).

Intended behavior:

- The row (`data-testid="what-if-result"`) is rendered whether or not the ruler was moved. Everything that belongs only
  to an active what-if (the "Сохранённый балл: …" line, "Вернуть сохранённое", the percentile band, the note) still appears
  only while `isWhatIf`.
- The row keeps its test ids (`what-if-result`, `what-if-score-value`, `what-if-threshold-chip`).
- Measured on the rendered page with `getBoundingClientRect` (not from class names), at 360 and 390 px: the gap between
  the bottom of `what-if-result` and the top of the "Средний балл для симуляции" card is at least 24 px (today 16 px), and
  the gap between the bottom of the "Перетащите линейку…" caption and the top of `what-if-result` is at least 16 px
  (today 12 px).
- A new colour token `--color-warning` is defined for the light and the dark theme next to `--color-positive`. The theme
  is applied at runtime by `src/lib/theme.ts` (`LIGHT_THEME`, `DARK_THEME`, `setCssVar`), which sets `data-theme`, so the
  token goes there and into the FOUC defaults of `src/index.css` (`:root` and the dark block), which must match
  `theme.ts`. Its text contrast is at least 4.5:1 against the result card background (`--tg-theme-secondary-bg-color`:
  #ffffff light, #1d1f24 dark) in both themes, and it reads as amber, not as green, red or the plain text colour. The
  implementer picks the values (the `--color-reliability` values above qualify), reports the contrast in the handoff, and
  uses the token for the below-median line only.
- "Выше медианы…" keeps `--color-positive`. "Близко к медиане группы" (`aroundMedian`) keeps the colour it has now.
- The disclosure button's label and chevron are inset from the card's border by the card's own content inset (14 px,
  the `px-3.5` of `DashboardCard`, ±1 px), its touch target is at least 44 px tall, and its hover/active background
  stays inside the card. `.disclosure-row` is used only by this button.

## Context

- Relevant code and docs: `src/features/score/ScoreScreen.tsx` (`isWhatIf`, the `what-if-result` block, the card below it),
  `src/features/dashboard/ResultHeroCard.tsx` (`medianPositionLine`, the line at about 183),
  `src/features/dashboard/DistributionDetailsSection.tsx` (the `disclosure-row` button), `src/index.css` (`--color-positive`,
  the dark-theme block and `.disclosure-row`), `src/lib/theme.ts` (the runtime palette), `src/components/DashboardCard.tsx`
  (read only: the card padding), `docs/product-flow.md` ("the what-if block … and only while a what-if is active its own
  score, chip and percentile band", in "Dashboard (authenticated)").
- ADRs this task follows: none pins the old behavior. The "only while a what-if is active" wording is in
  [Product flow](../docs/product-flow.md) and tasks 003 and 005; this task updates that sentence. Replaces none.
- Dependencies and decisions already made: the two decisions above. Tests written for tasks 003 and 005 assert that the row
  is absent when the ruler is untouched; they must be updated to the new behavior, not deleted. They are:
  - `src/features/score/score-screen.test.tsx`: line 110 (`shows the decile band…`, before the click), lines 150–151
    (`shows neither a what-if score nor a band for the saved average`: keep the band assertion at 152, assert the row with
    the saved score), line 214 (`removes the band when the saved average is restored`: the row shows `81,00` again), lines
    322–323 (`shows only the tape, hint and input when no what-if is active`: rename, assert the row with the saved score
    and chip).
  - `src/pages/home-page.test.tsx`: lines 304 and 312 (`previews a different average on the tape…`): the row shows
    `81,00` before the click and after "Wróć do zapisanej". Task 027 also edits this file; merge 029 after 027 and touch
    only this test.
  The assertions that the band is absent (lines 109, 152, 199, 213) stay. `src/features/ProfileDashboard.test.tsx` and
  `src/features/statistics/statistics-panel.test.tsx` have no assertion on the row and need no change.
- Task 028 adds a yellow sticker but no theme token; this task alone edits `src/index.css` and `src/lib/theme.ts`.

## Scope

- In scope: rendering the row always; its spacing; the new `--color-warning` token (in `src/lib/theme.ts` and the
  `src/index.css` defaults) and its use on the below-median line;
  the disclosure button padding; the `docs/product-flow.md` sentence; tests.
- Out of scope: the ruler itself (`ScoreTape`, its drag and wheel behavior), the hero card's wording, the percentile line,
  the threshold chip's content, the orientation mark, other cards, and any locale string.
- Files or directories assigned to this task: `src/features/score/ScoreScreen.tsx`, `src/features/dashboard/ResultHeroCard.tsx`,
  `src/features/dashboard/DistributionDetailsSection.tsx`, `src/index.css`, `src/lib/theme.ts`, `docs/product-flow.md`, and
  the tests `src/features/score/score-screen.test.tsx`, `src/lib/theme.test.ts` and, only for the test named above,
  `src/pages/home-page.test.tsx` (after task 027 is merged).

## Acceptance scenarios

| ID | Given / when | Expected result | Planned verification |
| --- | --- | --- | --- |
| A1 | A saved survey (average 4,50 → 81,00), the ruler untouched | `what-if-score-value` shows `81,00`, "/ 100" is shown and `what-if-threshold-chip` shows `pl.scoreScreen.aboveThreshold('21,00', '60')`; no saved-score line, reset button, band or note | `score-screen.test.tsx`: the updated tests at lines 147 and 314; manual |
| A2 | The ruler is moved, then "Вернуть сохранённое" is used | The row shows the what-if score (`81,90`), then the saved score (`81,00`) again; the saved-score line, reset button, band and note appear only while moved | `score-screen.test.tsx` (`removes the band when the saved average is restored`) and `src/pages/home-page.test.tsx` (`previews a different average on the tape…`); manual |
| A3 | The saved score is below 60 | The untouched row shows the score and the below-threshold chip (`pl.scoreScreen.belowThreshold(…)`), not an empty area | New case in `score-screen.test.tsx` |
| A4 | Chrome at 360 and 390 px, ruler untouched and moved | Gap `what-if-result` → "Средний балл для симуляции" card ≥ 24 px and caption → `what-if-result` ≥ 16 px, measured | Manual, `getBoundingClientRect` in the console, the four numbers in the handoff |
| A5 | A score below the group median, light and dark theme | "Ниже медианы на N балла" uses `--color-warning`; contrast ≥ 4.5:1 against `--tg-theme-secondary-bg-color` in both themes; `LIGHT_THEME`/`DARK_THEME` and the `src/index.css` defaults carry the same values | `score-screen.test.tsx`: the line `Poniżej mediany o 1,5 pkt` has the `--color-warning` class; `src/lib/theme.test.ts`: both palettes define the warning value and it reaches `--color-warning`; manual with measured contrast |
| A6 | A score above the median, and one close to it | "Выше медианы…" keeps the `--color-positive` class; "Близко к медиане группы" keeps the class it has today | `score-screen.test.tsx` |
| A7 | The dashboard, "Показать полное распределение" | Label and chevron are inset 14 px (±1) from the card's border; the button is at least 44 px tall; it still expands and collapses | Manual, measured with `getBoundingClientRect`; existing expand tests in `score-screen.test.tsx` (line 262) and `src/features/dashboard/orientation-mark.test.tsx` (line 102) |
| A8 | `docs/product-flow.md` | The what-if sentence in "Dashboard (authenticated)" says the row (score, "/ 100", chip) is always shown and the saved-score line, reset, band and note only during a what-if | Reviewer read |

## Must stay unchanged

- Behavior, contracts, or user-facing copy this task must not alter: the what-if never saves; the score formula; the
  percentile band rule from task 003; the hero card's rank, percentile and median wording; the orientation mark on the
  ruler; every locale string.
- Behavior, contracts, or user-facing copy this task must not alter (continued): the saved result card's
  `saved-score-value` and `saved-score-chip`; the other theme tokens and their values.
- Existing checks that already cover it: `src/features/score/score-screen.test.tsx`, `src/features/statistics/statistics-panel.test.tsx`,
  `src/features/dashboard/orientation-mark.test.tsx`, `src/lib/theme.test.ts`, `src/features/ProfileDashboard.test.tsx`
  (what-if block position), `src/pages/home-page.test.tsx`.

## Open decisions

- None.

## Verification

- `npm test -- src/features/score src/features/dashboard src/features/statistics src/features/ProfileDashboard.test.tsx src/lib/theme.test.ts src/pages/home-page.test.tsx` → A1–A3, A5–A7
- `make check`
- Manual in Chrome (`make dev`, 360 and 390 px, light and dark; one user above the median and one below, for example by
  editing the grade) → A1, A2, A4, A5, A7

## Handoff

| Scenario | Evidence (command, test assertion, or manual check) | Result |
| --- | --- | --- |
| A1 | `npm test -- src/features/score` → `shows the saved score and its chip, but no band, for the saved average` (`what-if-score-value` `81,00`, chip `aboveThreshold('21,00','60')`, no band) and `shows the tape, hint, input and the saved score row when no what-if is active` (also no saved-score line, no reset button, no band, no note). Manual part: not run: needs maintainer manual check (Chrome, `make dev`: open the dashboard with a saved survey, ruler untouched, the row with the score, "/ 100" and chip appears under the tape) | pass (tests); manual not run |
| A2 | `score-screen.test.tsx` → `removes the band when the saved average is restored` (row `81,00` after reset, saved-score line gone) and `shows the decile band…` (`81,00` before, `81,90` after the click, saved-score line present); `src/pages/home-page.test.tsx` → `previews a different average on the tape without saving it or moving the saved result` (`81,00` / `81,90` / `81,00`). Manual: not run: needs maintainer manual check (move the ruler, then "Вернуть сохранённое") | pass (tests); manual not run |
| A3 | `score-screen.test.tsx` → new `shows the saved score and the below-threshold chip when the saved score is under 60` (average 3 → `54,00`, `belowThreshold('6,00','60')`) | pass |
| A4 | Not measured. Computed from classes: caption → `what-if-result` is `mt-4` = 16 px (was `mt-3`, 12 px); `what-if-result` → "Средний балл для симуляции" card is `mt-6` = 24 px (was `mt-4`, 16 px); no margin collapsing (`section.space-y-0`, siblings are block-level). not run: needs maintainer manual check (360 and 390 px, untouched and moved; `getBoundingClientRect` of caption, `what-if-result`, card; four numbers) | not run |
| A5 | `score-screen.test.tsx` → `median line colour > uses the warning colour below the median` (`Poniżej mediany o 1,5 pkt` has `text-[var(--color-warning)]`, not `--color-positive`); `src/lib/theme.test.ts` → `keeps canonical light/dark palette…` (`LIGHT_SEMANTIC.warning` `#8a5a00`, `DARK_SEMANTIC.warning` `#ffc72c`) and `applyTelegramTheme` dark/light tests (`--color-warning` set to `#ffc72c` / `#8a5a00`); `src/index.css` `:root` `#8a5a00` and the dark block `#ffc72c` match. Contrast (node script, WCAG): `#8a5a00` on `#ffffff` = 5.93:1; `#ffc72c` on `#1d1f24` = 10.57:1. Visual amber check in both themes: not run: needs maintainer manual check | pass (tests, contrast); manual not run |
| A6 | `score-screen.test.tsx` → `median line colour > keeps the positive colour above the median and close to it` (`Powyżej mediany o 1,5 pkt` and `Blisko mediany grupy` keep `text-[var(--color-positive)]`) | pass |
| A7 | Not measured. Computed from CSS: `.disclosure-row` now `width: 100%`, `padding: 0`, no negative margins, `min-height: 2.75rem` (44 px); the button fills the card content box, so label and chevron sit at the card's `px-3.5` inset = 14 px (+1 px border); hover/active background stays inside the content box. Expand test still passes: `score-screen.test.tsx` → `orders the saved result card, what-if, distribution…` uses the button; `src/features/dashboard/orientation-mark.test.tsx` passes. not run: needs maintainer manual check (`getBoundingClientRect` of label/chevron vs card, button height) | not run (computed only) |
| A8 | `docs/product-flow.md` line 82: the what-if sentence now says the row (score, "/ 100", chip) is always shown, and the saved-score line, reset, band and note only during a what-if | pass (reviewer read) |

- Changed files: `src/features/score/ScoreScreen.tsx`, `src/features/dashboard/ResultHeroCard.tsx`, `src/features/dashboard/DistributionDetailsSection.tsx` (removed `!px-0 !py-0`), `src/index.css`, `src/lib/theme.ts`, `docs/product-flow.md`, `src/features/score/score-screen.test.tsx`, `src/lib/theme.test.ts`, `src/pages/home-page.test.tsx` (only the two assertions of the `previews a different average…` test).
- Checks not run, blockers, or open questions:
  - `npm test -- src/features/score src/features/dashboard src/features/statistics src/features/ProfileDashboard.test.tsx src/lib/theme.test.ts src/pages/home-page.test.tsx`: all pass except 4 tests in `src/pages/home-page.test.tsx` that are not mine and come from task 028's in-progress grade input change (`toHaveValue(4.5)` now receives `"4,5"`): `resumes a session saved on the removed confirm screen on the grades step`, `stays on the grades step with the values intact when the create request fails, then retries`, `shows the localized score-change limit and keeps the edit values when an edit is blocked`, `shows the score-change limit when a re-create is blocked and keeps the draft on the device`. First `make check` run also failed in 028's `src/features/wizard/grades-step.test.tsx` (`Ориентировочный балл: 90,00` matched several elements); it passed on retry.
  - `make check`: external failure (the 4 home-page tests above, 028-owned) on two runs; `make typecheck` passes. `make check` not re-run green.
  - A4 and A7 on-screen measurement and the A1, A2, A5 visual checks: not run: need maintainer manual check (no browser allowed).
  - Note: the disclosure button is now 44 px tall inside the card's `py-3`, so the collapsed card is 24 px taller than the old 20 px button (44 px card height before, 68 px now). The brief asks for a 44 px touch target; negative vertical margins would break the `mt-3` gap when expanded, so none were used.
- LLM contributions: Sonnet 5.5 (Claude Code) wrote this specification. Implementation and review: not yet done. Opus 5.5 (Claude Code subagent): specification review. Sonnet 5.5 (Claude Code subagent): implementation.
