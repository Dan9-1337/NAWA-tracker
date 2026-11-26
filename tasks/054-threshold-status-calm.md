# 054 — Threshold status: a quiet line, not a black pill

**Status:** Ready

## Goal

Replace the black pill "На 40,00 балла выше порога 60" with a calm status line. Everyone who fills in the survey is at or
above 60 in practice (a lower score cannot compete, assumption P5), so "40,00 points above" tells nobody anything, and a black
pill with yellow text looks like a button that does nothing. It also repeats the loudest style of the real buttons.

Intended behavior of `ThresholdChip` (same component, same test ids `saved-score-chip` and `what-if-threshold-chip`, on the
result card and the What-if score row):

- **Score above 60:** a quiet status, no fill and no border, a check icon and the text `Порог 60 пройден` in the positive
  text token, `text-sm` weight 600.
- **Exactly 60:** `Ровно на пороге 60`, same quiet style (the existing `atThreshold` text).
- **Below 60:** `На 4,5 балла ниже порога 60` (the existing `belowThreshold` text) in the warning text token, with the
  down-arrow icon, still without a filled pill. It keeps the number because the distance is the useful part here.
- Nothing about the status is clickable; it does not receive hover or active styles.
- Colour is never the only signal: the icon and the words carry the meaning.

The what-if page still crosses the threshold live when the ruler moves (haptics on crossing are unchanged).

## Context

- Relevant code and docs: `src/features/score/ThresholdChip.tsx`, `src/features/score/ScoreScreen.tsx` (the score row),
  `src/features/dashboard/ResultHeroCard.tsx`, `src/i18n/ru.ts` (`scoreScreen.aboveThreshold`, `belowThreshold`, `atThreshold`),
  `docs/ux-review.md` (P0.4), `docs/assumptions.md` (P5, S2), [Product flow](../docs/product-flow.md).
- ADRs this task follows: [0019](../docs/adr/0019-minimum-text-size-14px.md). Replaces none.
- Dependencies and decisions already made: the maintainer approved the quiet status (2026-11-26). Tasks 029, 033 and 046 are `Done`;
  do this task after 053 and before 047 so the card is edited one task at a time. The positive and warning text tokens already
  used by the median lines in `ResultHeroCard` (`--color-positive`, `--color-warning`) are the colours; no new tokens. The
  other four locales get the same shape of copy, written from the glossaries (ADR 0010).

## Scope

- In scope: the component's look and the one new text `scoreScreen.thresholdPassed`; removing `aboveThreshold` from the type
  and the five locales if nothing else uses it; tests; `docs/product-flow.md` (the threshold chip sentence).
- Out of scope: the red `порог 60` flag on the ruler, the score maths, the threshold value, haptics, the what-if distance to
  the `ориентир` (task 049), the hub layout.
- Files or directories assigned to this task: `src/features/score/ThresholdChip.tsx`, `src/features/score/score-screen.test.tsx`,
  `src/features/statistics/statistics-panel.test.tsx`, `src/features/ProfileDashboard.test.tsx` where it asserts the chip text,
  `src/i18n/*`, `docs/product-flow.md`.

## Acceptance scenarios

| ID | Given / when | Expected result | Planned verification |
| --- | --- | --- | --- |
| A1 | Saved score 100 | The element `saved-score-chip` reads `Порог 60 пройден`, has no background fill, no border radius pill and no `button` role; no number | `statistics-panel.test.tsx` |
| A2 | Saved score exactly 60 | `Ровно на пороге 60` in the same style | `score-screen.test.tsx` |
| A3 | The what-if score is 55,5 (ruler moved) | `what-if-threshold-chip` reads `На 4,5 балла ниже порога 60`, warning colour class, down-arrow icon | `score-screen.test.tsx` |
| A4 | The ruler crosses 60 in both directions | The text switches between A1 and A3; haptic behavior unchanged | `score-screen.test.tsx` |
| A5 | Search for `aboveThreshold` | Removed from `types.ts` and the five locales if unused; the key sets still match | `src/i18n/locales.test.ts` |
| A6 | Light and dark theme | The text has sufficient contrast against the card background (4.5:1) with the existing positive and warning tokens | Manual (optional) |

## Must stay unchanged

- Behavior, contracts, or user-facing copy this task must not alter: the score and threshold values, the test ids, the ruler
  flag and its text, the what-if note, the `belowThreshold` and `atThreshold` texts.
- Existing checks that already cover it: `src/features/score/score-screen.test.tsx`, `src/features/statistics/statistics-panel.test.tsx`,
  `src/features/ProfileDashboard.test.tsx`.

## Open decisions

- None.

## Verification

- `npm test -- src/features src/i18n` → A1–A5
- `make check`
- Manual (optional): `make dev`, both themes → A6

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
- LLM contributions: Claude Sonnet 5.5 (Claude Code): specification. Implementation and review: not yet done.
