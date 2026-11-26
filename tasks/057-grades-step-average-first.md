# 057 — Grades step: the average first, the rare cases folded, the score always in sight

**Status:** Ready

## Goal

Make the grade step answer one question first: "what is your average?". Today (seen live at 390px) the screen opens with two radio
groups about rare situations, then the scale field, and the average, the only thing everyone types, is the last field. Its placeholder
says `напр. 4,82` even on a 12-point scale. The live score sits below everything, so the user types without seeing the result.
The maintainer approved these three changes (2026-11-26, following `docs/ux-review.md` P1.2).

Intended behavior of the step (create and edit wizard):

1. **Top:** the **average** field, with a placeholder that fits the scale (an example inside the scale: 12 → `напр. 10,5`, 5 → `напр. 4,5`,
   100 → `напр. 85`, other scales → half-way example), and under it the scale as plain text (`Шкала до 12 · по стране школы`, not an
   input) when the country fixes it. A country without a fixed scale keeps the scale input, as today.
2. **Then** the Polish-school question (`Нет` / `Да, начальную` / `Да, среднюю`), as today.
3. **Then** a collapsed row `Другой случай`, which holds the two rarely needed groups: `Я студент в Польше` (the existing
   `student_in_poland` choice, shown as a single toggle; off = school leaver) and the grade basis (final certificate or half-year
   grades). The row opens by itself when the draft already has a non-default value in it, so nothing set is ever hidden.
4. **A sticky score bar** always visible above the bottom action area while the step is open: `Ориентировочный балл: 83,25`
   (empty-state text until an average is valid) with the one-line note from task 056. It never sits under the keyboard.
5. The validation texts, warnings (above the scale, below 60, Belarus bonus notice) and the disabled-button hint stay and appear
   next to the field that causes them.

## Context

- Relevant code and docs: `src/features/wizard/GradesStep.tsx`, `src/components/GradeInputs.tsx` (the locked scale is a read-only input
  that looks editable; placeholder), `src/components/NawaScorePreview.tsx`, `src/components/RadioOption.tsx`, `src/features/ResponseWizardSteps.tsx`,
  `shared/validation.ts`, `docs/ux-review.md` (P1.2, P1.3, P1.4), [Product flow](../docs/product-flow.md).
- ADRs this task follows: [0019](../docs/adr/0019-minimum-text-size-14px.md). Replaces none.
- Dependencies and decisions already made: tasks 028, 033 and 056 are `Done` (they edit the same step and the same copy). Wizard
  choices and validation rules do not change; only the arrangement does. Write uk, be, pl and en copy for the new keys from the
  glossaries (ADR 0010).

## Scope

- In scope: the arrangement above in `GradesStep`; the scale as text; the scale-aware placeholder; the folded `Другой случай` row;
  the sticky score bar; tests; `docs/product-flow.md` (the grades step paragraph); new keys `otherCase`, `studentInPolandToggle`,
  placeholder examples.
- Out of scope: the education step (country selects), score maths, validation thresholds, the edit wizard's Back handling, the
  dashboard.
- Files or directories assigned to this task: `src/features/wizard/GradesStep.tsx`, `src/features/wizard/grades-step.test.tsx`,
  `src/components/GradeInputs.tsx`, `src/components/grade-inputs.test.tsx`, `src/components/NawaScorePreview.tsx`,
  `src/components/RadioOption.tsx`, `src/i18n/*`, `docs/product-flow.md`.

## Acceptance scenarios

| ID | Given / when | Expected result | Planned verification |
| --- | --- | --- | --- |
| A1 | First-time user, school country Ukraine (scale 12), opens the grade step | The average field is the first field and its placeholder is `напр. 10,5`; the scale reads as text `Шкала до 12`; no radio group sits above the field | `grades-step.test.tsx` |
| A2 | School country Kazakhstan (scale 5) | Placeholder `напр. 4,5`; a country with a free scale still shows a scale input | `grade-inputs.test.tsx` |
| A3 | Default draft | `Другой случай` is collapsed and the two rare groups are not in the document | `grades-step.test.tsx` |
| A4 | A draft with `student_in_poland` or `half_year` set (edit wizard, restored draft) | `Другой случай` starts open with the values shown | `grades-step.test.tsx` |
| A5 | The user turns on `Я студент в Польше` | The same behavior as selecting `student_in_poland` today (scale 5, the 4.75 rule, score 100 note) | Existing tests pass |
| A6 | A valid average is typed | The sticky bar shows `Ориентировочный балл: <score>` at once, and it stays visible while scrolling the step | `grades-step.test.tsx` |
| A7 | Average above the scale, below 60, and a Belarusian citizen | The existing warnings and notice appear next to the average field | Existing tests pass |
| A8 | Browser 390×700, then with the on-screen keyboard (manual, real device or devtools) | The sticky bar and the field are not hidden by the keyboard or the bottom bar | Manual (optional) |
| A9 | Five locales | New keys in all five; glossary tests pass | `src/i18n/locales.test.ts`, `src/i18n/glossary.test.ts` |

## Must stay unchanged

- Behavior, contracts, or user-facing copy this task must not alter: validation and the warnings' conditions, the score
  maths, the Polish-school bonus values, what is saved (`ResponseFormInput`), the education step, the dashboard.
- Existing checks that already cover it: `src/features/wizard/grades-step.test.tsx`, `src/components/grade-inputs.test.tsx`,
  `shared/validation` tests, `src/features/ProfileDashboard.test.tsx`.

## Open decisions

- None.

## Verification

- `npm test -- src/features src/components src/i18n shared` → A1–A7, A9
- `make check`
- Manual (optional): `make dev-new`, the grade step at 390×700 and with the keyboard → A8

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

- Changed files:
- Checks not run, blockers, or open questions:
- LLM contributions: Claude Sonnet 5.5 (Claude Code): specification. Implementation and review: not yet done.
