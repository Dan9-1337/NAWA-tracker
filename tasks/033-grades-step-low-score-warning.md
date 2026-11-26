# 033 — Grades step: a soft warning when the average gives less than 60

**Status:** In review

## Goal

The audience of NAWAmeter is people above the threshold of 60 (assumption P5 in `docs/assumptions.md`). A grades score
below 60 without the Polish-school bonus means an average below two thirds of the scale, and is most often a scale
mistake: for example "3,2" typed for a 12-point country, or a 5-point average typed while the maximum is 12. Such a survey
is saved and moves the statistics of the whole country.

Intended behavior: on the Grades step (new survey and edit), when the **grades score without the bonus**
(`average / maximum × 90`, the `gradesScore` part of `getScoreBreakdown` in `shared/nawa-score.ts`) is below 60, a soft
warning is shown under the grade inputs:

- ru: `Проверьте среднюю: по шкале до {max} это {score} балла из 90, ниже порога 60. Возможно, оценка введена по другой шкале.`
- en: `Check your average: on a scale up to {max} it gives {score} of 90 points, below the threshold of 60. It may have been entered on a different scale.`
- pl, uk and be: the same meaning, written by the implementation agent with the terms of each locale's glossary
  ([ADR 0010](../docs/adr/0010-locale-glossary-and-english-api-errors.md)); `{max}` and `{score}` formatted with the
  locale's decimal separator, like the rest of the step; the plural form of "балл" follows the existing `points()` helper
  where the locale has one.

The warning **does not block** saving and is not an error: it uses the existing neutral notice style (the `Notice` used for the
Belarus bonus notice), not the destructive colour and not `role="alert"`. It is shown with the same timing as the
"average required" error after task 028: once the average field has been blurred, or on a restored draft. It is not shown:

- while the average is empty, invalid, or above the maximum (the existing error covers that case);
- for `student_in_poland` (scored 100, ADR rule S4);
- when the grades score is 60 or more, even if the bonus would be needed to reach it.

## Context

- Relevant code and docs: `src/features/wizard/GradesStep.tsx`, `src/components/GradeInputs.tsx`, `src/lib/draft-rules.ts`
  (`previewOrientationScore`), `shared/nawa-score.ts` (`getScoreBreakdown`), `src/i18n/*.ts` (`wizard.*`),
  task [028](028-grades-step-bonus-stickers-and-inputs.md) (preview and error timing, in review), `docs/ux-review.md`
  ("Данные и доверие").
- ADRs this task follows: [0010](../docs/adr/0010-locale-glossary-and-english-api-errors.md). Replaces none.
- Dependencies and decisions already made: the maintainer chose a warning that does not block saving (2026-11-26).
  Task 028's changes are in the working tree; build on them.

## Scope

- In scope: the warning, its condition as a pure helper with a unit test, copy in five locales, component tests.
- Out of scope: server-side validation, the score formula, the threshold value, the preview box, analytics (task 039
  adds an event for this warning).
- Files or directories assigned to this task: `src/features/wizard/GradesStep.tsx`, `src/lib/draft-rules.ts` (or a new helper
  beside it), `src/i18n/{pl,en,ru,uk,be}.ts` (one new key under `wizard`), `src/features/wizard/grades-step.test.tsx`,
  `src/lib/draft-rules.test.ts`.

## Acceptance scenarios

| ID | Given / when | Expected result | Planned verification |
| --- | --- | --- | --- |
| A1 | ru, `school_leaver`, maximum 12, the user types `3,2` and leaves the field | The warning is shown with `12` and `24` (3.2 / 12 × 90 = 24); the Save button stays enabled | `grades-step.test.tsx` |
| A2 | Maximum 12, average `10,5` (78,75) | No warning | `grades-step.test.tsx` |
| A3 | Maximum 5, average `3,3` (59,4) and Polish secondary school chosen (+10 → 69,4) | The warning is shown (the bonus is not counted) | Unit test of the helper |
| A4 | Maximum 5, average `3,34` (60,12) | No warning | Unit test of the helper |
| A5 | `student_in_poland`, average 4,8 on 2–5 | No warning | Unit test of the helper |
| A6 | Maximum 12, average `13` | Only the "above maximum" error, no warning | `grades-step.test.tsx` |
| A7 | The user types `3,2` but has not left the field yet, on a fresh step | No warning yet | `grades-step.test.tsx` |
| A8 | Edit wizard opened for a saved survey with average 3,2 of 12 | The warning is shown on the Grades step without a blur | `grades-step.test.tsx` or `ProfileDashboard.test.tsx` |
| A9 | Any locale | The new key exists in all five locales | `src/i18n/locales.test.ts` (existing key-parity check) |

## Must stay unchanged

- Behavior, contracts, or user-facing copy this task must not alter: saving (never blocked by the warning), the score
  formula and preview, the "above maximum" and "required" errors and their timing, the API contract.
- Existing checks that already cover it: `src/lib/draft-rules.test.ts`, `src/features/wizard/grades-step.test.tsx`,
  `src/components/grade-inputs.test.tsx`, `shared/nawa-score.test.ts`.

## Open decisions

- None.

## Verification

- `npm test -- src/features/wizard src/lib/draft-rules src/i18n` → A1–A9
- `make check`
- Manual (optional) in Chrome with the dev server already running on ports 3000/3001 (do not run `make dev` if it is):
  new survey, Ukraine, average `3,2` → warning shown, Save works → A1

## Handoff

| Scenario | Evidence (command, test assertion, or manual check) | Result |
| --- | --- | --- |
| A1 | `grades-step.test.tsx` > "shows a neutral notice with the scale and the score after leaving the field (A1)": ru, `3,2` + Tab, exact text with 12 and 24, `role=status`, no `role=alert`. Save button lives outside `GradesStep` (no navigation code changed), so it is not asserted here; the `home-page.test.tsx` save-button tests still pass | Pass |
| A2 | `grades-step.test.tsx` > "does not warn for an average that gives 60 or more (A2)" (10,5 of 12) | Pass |
| A3 | `draft-rules.test.ts` > "does not count the Polish-school bonus (A3)" (preview 69.4, `lowGradesScore` 59.4); also `grades-step.test.tsx` > "does not count the Polish-school bonus" | Pass |
| A4 | `draft-rules.test.ts` > "is empty once the grades score reaches 60 (A4)" (3,34 of 5 = 60.12) | Pass |
| A5 | `draft-rules.test.ts` > "is empty for students in Poland (A5)"; `grades-step.test.tsx` > "is not shown for students in Poland" | Pass |
| A6 | `grades-step.test.tsx` > "shows only the 'above maximum' error ... (A6)"; helper case in `draft-rules.test.ts` | Pass |
| A7 | `grades-step.test.tsx` > "waits for the field to be left (A7)" (none while typing, shown after Tab); "is not triggered by leaving the maximum field" | Pass |
| A8 | `grades-step.test.tsx` > "shows at once for a restored draft or a saved survey in edit (A8)" (initial `averageGrade` 3.2, no blur) | Pass |
| A9 | `npm test -- src/i18n`: `locales.test.ts` key parity passes (type `Messages` also enforces the key in `pl`-derived shape; `tsc` clean); `grades-step.test.tsx` per-locale copy test | Pass |

- Changed files: `src/features/wizard/GradesStep.tsx` (notice + blur tracking via a wrapper `div` around `GradeInputs`, because `GradeInputs` is outside the assigned scope; restored/edit drafts count as already left), `src/lib/draft-rules.ts` (new `lowGradesScore`), `src/lib/draft-rules.test.ts`, `src/features/wizard/grades-step.test.tsx`, `src/i18n/{pl,en,ru,uk,be}.ts` (new `wizard.averageBelowThreshold(max, score)`, numbers formatted with `formatGrade`; plural of "балл"/"бал" via the locale's existing helper). Results: `npm test -- src/features/wizard src/lib/draft-rules src/i18n` 132 passed; `make check` exit 0 (typecheck, 67 test files / 662 tests).
- Checks not run, blockers, or open questions: manual Chrome check not run (optional). No blockers. Note: the warning is not restricted to the NAWA Director track (the brief does not restrict it); say so if it should be.
- LLM contributions: Opus 5.5 (Claude Code): specification. Sonnet 5.5 (Claude Code subagent): implementation.
