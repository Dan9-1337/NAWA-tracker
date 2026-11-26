# 028 — Grades step: bonus stickers on the Polish-school choices, grade formatting, preview and error timing

**Status:** In review

## Goal

The "Оценки" step (create wizard and the same step in the edit wizard) has four problems found on 2026-11-26.

1. **The bonus is not visible where the choice is made.** The question "Окончили ли вы польскую школу?" offers
   "Нет", "Да, начальную школу" and "Да, среднюю школу". The bonus (+5 and +10 points, `polishSchoolBonus` in
   `shared/nawa-score.ts`) appears only in the preview box below. The maintainer asked for a **sticker in the corner**
   of the two "Да" cards: "+5 баллов" and "+10 баллов".
2. **The grade is formatted with a dot in the edit wizard.** `GradeInputs` renders `String(value)`, so a saved 10,5 shows
   as "10.5" and a typed "11,5" turns into "11.5" when the field loses focus, while the rest of the app (dashboard,
   saved data) writes "10,5".
3. **A preview score is shown for an impossible grade.** With a maximum of 12, an average of 13 shows the error "Ого,
   выше максимума шкалы!" and, right below it, "Ориентировочный балл: 97,50 балла".
4. **The "required" error is shown before the user has typed anything.** The empty average field is red with
   "Укажите средний балл, чтобы продолжить" as soon as the step opens.

Intended behavior:

- **Sticker.** On the "Да, начальную школу" card a small pill in the top-right corner reads the bonus, on "Да, среднюю
  школу" the other bonus; "Нет" has none. The number comes from `polishSchoolBonus`, so a changed constant changes the
  sticker. Text per locale (unit forms follow [ADR 0010](../docs/adr/0010-locale-glossary-and-english-api-errors.md)):

  | Locale | primary | secondary |
  | --- | --- | --- |
  | ru | `+5 баллов` | `+10 баллов` |
  | pl | `+5 pkt` | `+10 pkt` |
  | en | `+5 pts` | `+10 pts` |
  | uk | `+5 балів` | `+10 балів` |
  | be | `+5 балаў` | `+10 балаў` |

  The locale key is one new function leaf, `choices.polishSchoolBonusBadge: (points: string) => string`, with the same
  arity in all five locales. ru, uk and be pick the unit with the plural helper already at the top of their file (ru
  `points`, uk `pointsWord`, be `forNumber(…, POINTS)`), so `'5'` and `'10'` give the forms in the table and another
  constant still gets the right form; pl and en use the fixed `pkt` and `pts`.

  The sticker has the brand yellow (`--color-accent`, #ffc72c) as its fill and the dark ink #14161a as its text **in both
  themes**. Do not use `--color-accent-ink` for the text: in the dark theme it is #ffc72c, the same as the fill
  (`src/lib/theme.ts`, `DARK_THEME`). Do not add a theme token in this task (task 029 edits `src/index.css` and
  `src/lib/theme.ts`). The sticker sits inside the card's corner and never overlaps the label: the label wraps before it
  reaches the sticker at a 360 px width. The sticker is inside the option's `<label>`, so the radio's accessible name
  contains both the option text and the sticker text (for example "Да, среднюю школу" and "+10 баллов"). The fieldset is
  still shown only when `isPolishSchoolBonusApplicable(draft)` is true (so never for citizens of Belarus).
- **Decimal separator.** The average and maximum grade inputs show the stored value with the locale's decimal separator:
  "10,5" in ru, pl, uk and be, "10.5" in en, on first render, after a restored draft and after blur. Only the separator
  changes: no rounding and no thousands grouping, so "4,825" stays "4,825" and a maximum of 1000 stays "1000" in every
  locale. `formatGrade` as it stands is **not** suitable: it rounds to two decimals ("4,83") and groups thousands ("1,000"
  in en, which `parseLocalizedNumber` would read back as 1). Do not change `formatGrade` (the dashboard and the what-if use
  it); format the input value with its own helper. Typing either "," or "." is still accepted.
- **Preview.** The preview box is not shown while the average is above the maximum. The error text stays.
- **Required error.** The "average required" message and the red border appear only after the field has been focused
  and left, not on first render. The disabled "Сохранить" main button (`canAdvanceWizardStep`) and the grey hint line
  below the form (`wizardStepValidationHint` in `src/features/ResponseWizardSteps.tsx`) stay as they are; neither file is
  changed by this task.

## Context

- Relevant code and docs: `src/components/RadioOption.tsx` (`RadioOption`, `RadioGroup`), `src/features/wizard/GradesStep.tsx`,
  `src/components/GradeInputs.tsx` (`formatInputValue`, `averageMissing`), `src/lib/draft-rules.ts` (`previewOrientationScore`,
  `isPolishSchoolBonusApplicable`), `src/lib/format.ts` (`formatGrade`, `parseLocalizedNumber`), `shared/nawa-score.ts`,
  `src/i18n/*.ts` (`choices.polishSchoolLevel`, the plural helpers), `src/i18n/locales.test.ts` (key parity, function
  arity, no ы/э/ў in uk and no и in be), `src/lib/theme.ts` (read only), [Product flow](../docs/product-flow.md).
  `RadioOption` is also used by `src/features/scholarship-report/ScholarshipReportFlow.tsx`.
- ADRs this task follows: [0010](../docs/adr/0010-locale-glossary-and-english-api-errors.md). Replaces none.
- Dependencies and decisions already made: sticker content and corner placement are the maintainer's request
  (2026-11-26, chat). The uk and be strings are drafts that still need a native-speaker review, as for the rest of those
  locales (README, "Languages"). This task and task 030 both edit the `src/i18n/*.ts` files (different keys); merge them
  one after the other.

## Scope

- In scope: an optional badge on `RadioOption` and its use for the Polish-school options; a new locale key for the badge in
  all five locales; the input formatting; the preview guard; the error timing; tests.
- Out of scope: the score formula, the bonus values, the validation rules, which options exist, the maximum-grade
  locking, any other label or hint, and the dashboard.
- Files or directories assigned to this task: `src/components/RadioOption.tsx`, `src/components/GradeInputs.tsx`,
  `src/features/wizard/GradesStep.tsx`, `src/lib/draft-rules.ts`, `src/i18n/{pl,en,ru,uk,be}.ts` (only the new badge key),
  and their tests: `src/lib/draft-rules.test.ts`, a new `src/features/wizard/grades-step.test.tsx` and a new
  `src/components/grade-inputs.test.tsx`. Added after the first implementation pass: in `src/pages/home-page.test.tsx`
  only the four existing assertions that read the grade input under the pl locale (`toHaveValue('9.5')`, `'4.5'`, `'4.8'`,
  `'4.5'`), which must become the comma forms (`'9,5'`, `'4,5'`, `'4,8'`, `'4,5'`) because the field now shows the locale's
  separator. Do not edit anything else in that file, and do not edit `CreateProfileFlow.tsx` or `ProfileDashboard.tsx`
  (task 027 owns them); if another existing test there breaks, report it as a blocker.

## Acceptance scenarios

| ID | Given / when | Expected result | Planned verification |
| --- | --- | --- | --- |
| A1 | Grades step, ru, a citizen of Ukraine | "Да, начальную школу" shows the sticker `+5 баллов`, "Да, среднюю школу" shows `+10 баллов`, "Нет" shows none; `getByRole('radio', { name: /Да, среднюю школу.*\+10 баллов/ })` finds the option | `src/features/wizard/grades-step.test.tsx`; manual |
| A2 | The five locales | Each shows the sticker text from the table; `choices.polishSchoolBonusBadge` exists in every locale with arity 1 | `src/i18n/locales.test.ts` (key parity, arity, uk/be letter checks) plus a `grades-step.test.tsx` case per locale |
| A3 | `polishSchoolBonus` is mocked to `{ none: 0, primary: 2, secondary: 7 }` | ru stickers read `+2 балла` and `+7 баллов` | `grades-step.test.tsx` with `vi.mock` of `shared/nawa-score` |
| A4 | Width 360 px, light and dark theme | The sticker sits in the card's top-right corner, its dark text is readable on the yellow fill in both themes, and it does not overlap the label text; the card is still fully clickable | Manual, Chrome at 360 and 390 px, both themes |
| A5 | The citizenship is Belarus | The Polish-school fieldset and its stickers are not shown (unchanged) | `grades-step.test.tsx` (`rankingCountry: 'BY'`, no `+5`/`+10` text) |
| A6 | `GradeInputs` mounts with average 10,5 and maximum 12 (as the edit wizard does) | ru shows `10,5`; en shows `10.5` | `src/components/grade-inputs.test.tsx` with each locale |
| A7 | The user types `11,5` and leaves the field | The field still shows `11,5` (ru) | `grade-inputs.test.tsx` |
| A8 | Maximum 12, the user types `13` | The error "Ого, выше максимума шкалы!…" is shown and the preview box is not | `grades-step.test.tsx`; `src/lib/draft-rules.test.ts`: `previewOrientationScore` returns `null` when the average exceeds the maximum and still returns the score when it equals it |
| A9 | The step opens with an empty average | No red border and no "Укажите средний балл…" message (no `role="alert"` in the field) | `grade-inputs.test.tsx`; the disabled main button and the grey hint are unchanged code (manual check in Chrome) |
| A10 | The user focuses the empty average field and leaves it | The red border and the "required" message appear | `grade-inputs.test.tsx` |
| A11 | ru, the user types `4,825` and leaves the field; en, an editable maximum `1000` is blurred | The field shows `4,825` (not `4,83`); the maximum shows `1000` (not `1,000`) and the stored values are 4.825 and 1000 | `grade-inputs.test.tsx` |
| A12 | The create and edit flows in `src/pages/home-page.test.tsx` that read the pl grade input | Those four tests expect the comma forms and pass; no other assertion in the file changed | `npm test -- src/pages/home-page.test.tsx` |

## Must stay unchanged

- Behavior, contracts, or user-facing copy this task must not alter: the orientation score and its SQL parity
  (`shared/nawa-score.ts`, `compute_orientation_score`); the values 0, 5 and 10; what the preview box says when the grades
  are valid; every other string in the five locales; `formatGrade`; `RadioOption` without a badge renders as today (the
  applicant-kind and grade-basis choices and `ScholarshipReportFlow`); when the main button is enabled
  (`canAdvanceWizardStep`).
- Existing checks that already cover it: `shared/nawa-score.test.ts`, `src/lib/draft-rules.test.ts`,
  `src/i18n/locales.test.ts`, `src/i18n/glossary.test.ts`, `src/pages/home-page.test.tsx` (create wizard),
  `src/features/scholarship-report/scholarship-report.test.tsx` (radios by name). There are no existing tests under
  `src/features/wizard/`.

## Open decisions

- None.

## Verification

- `npm test -- src/components src/features/wizard src/lib/draft-rules src/i18n` → A1–A3, A5–A11
- `npm test -- src/pages/home-page.test.tsx src/features/scholarship-report` → unchanged behavior
- `make check`
- Manual in Chrome (`make dev-new`, wizard step 2, then Settings → "Изменить анкету"; ru, pl, en, uk, be, light and dark;
  window at 360 and 390 px) → A1, A2, A4, A6

## Handoff

| Scenario | Evidence (command, test assertion, or manual check) | Result |
| --- | --- | --- |
| A1 | `npm test -- src/features/wizard` → `shows the bonus on both "Да" cards and none on "Нет" (ru)`: `getByRole('radio', { name: /Да, среднюю школу.*\+10 баллов/ })`, the "Нет" label's text is exactly the option text. Manual part not run: needs maintainer manual check | pass (automated) |
| A2 | `npm test -- src/i18n src/features/wizard` → `locales.test.ts` (key parity, arity, uk/be letters) and `shows the %s sticker text` for ru, pl, en, uk, be plus `polishSchoolBonusBadge.length === 1` | pass |
| A3 | `npm test -- src/features/wizard` → `reads the number from polishSchoolBonus` (`vi.mock` of `shared/nawa-score`, `{ none: 0, primary: 2, secondary: 7 }`): `+2 балла`, `+7 баллов` | pass |
| A4 | not run: needs maintainer manual check. Steps: Chrome at 360 and 390 px, light and dark theme, wizard step 2 and Settings → "Изменить анкету"; check the sticker is in the top-right corner of the two "Да" cards, readable dark text on the yellow fill in both themes, no overlap with the label, the whole card still clickable. Implementation: the sticker is a flex item (`shrink-0 self-start`, `bg-[var(--color-accent)] text-[#14161a]`) after the `min-w-0 flex-1` label block, so the label wraps before reaching it | not run |
| A5 | `npm test -- src/features/wizard` → `is not shown for citizens of Belarus` (`rankingCountry: 'BY'`; no legend, no `+5`/`+10` text) | pass |
| A6 | `npm test -- src/components/grade-inputs` → `shows a saved 10.5 as %s "%s" on first render` (ru, pl, uk, be `10,5`; en `10.5`) | pass |
| A7 | `npm test -- src/components/grade-inputs` → `keeps a typed 11,5 after the field loses focus (ru)` | pass |
| A8 | `npm test -- src/features/wizard` → `hides the preview and shows the error while the average is above the maximum` (alert text, no `Ориентировочный балл`); `npm test -- src/lib/draft-rules` → `is empty while the average is above the maximum, and scores it when it equals the maximum` | pass |
| A9 | `npm test -- src/components/grade-inputs` → `is not shown before the field has been focused and left` (no `role="alert"`, no message, no destructive border). Main button and grey hint are untouched code; Chrome check not run: needs maintainer manual check | pass (automated) |
| A10 | `npm test -- src/components/grade-inputs` → `appears after the empty field was focused and left` (alert with the message, destructive border) | pass |
| A11 | `npm test -- src/components/grade-inputs` → `does not round or group: 4,825 stays 4,825 and a maximum of 1000 stays 1000` (ru field `4,825`, stored 4.825) and `keeps an English maximum of 1000 ungrouped after blur and stores 1000` | pass |
| A12 | `npm test -- src/pages/home-page.test.tsx` → 22 passed; the four pl grade-input assertions now expect the comma forms (`'9,5'`, `'4,5'`, `'4,8'`, `'4,5'`) in `resumes a session saved on the removed confirm screen on the grades step`, `stays on the grades step with the values intact when the create request fails, then retries`, `shows the localized score-change limit and keeps the edit values when an edit is blocked`, `shows the score-change limit when a re-create is blocked and keeps the draft on the device`; no other assertion was changed by this task. `make check` → exit 0 (67 files, 631 tests, typecheck) | pass |

- Changed files: `src/components/RadioOption.tsx` (optional `badge`, also on `RadioGroup` options), `src/components/GradeInputs.tsx` (locale decimal separator via a local `formatInputValue`, required error only after blur), `src/features/wizard/GradesStep.tsx` (badge from `polishSchoolBonus`), `src/lib/draft-rules.ts` (`previewOrientationScore` returns `null` when the average exceeds the maximum), `src/i18n/{pl,en,ru,uk,be}.ts` (only `choices.polishSchoolBonusBadge`), `src/lib/draft-rules.test.ts`, new `src/components/grade-inputs.test.tsx`, new `src/features/wizard/grades-step.test.tsx`.
- Checks not run, blockers, or open questions:
  - The earlier blocker (4 failing tests in `src/pages/home-page.test.tsx` that asserted the dot in the pl grade input) was resolved by A12: the four assertions were updated to the comma forms, `npm test -- src/pages/home-page.test.tsx` and `make check` pass.
  - Manual checks A4 and the Chrome parts of A1, A2, A6, A9 were not run (need the running app).
  - Everything in `npm test` passes (631 tests); `src/features/scholarship-report` passes.
- LLM contributions: Sonnet 5.5 (Claude Code) wrote this specification. Implementation and review: not yet done. Opus 5.5 (Claude Code subagent): specification review. Sonnet 5.5 (Claude Code subagent): implementation.
