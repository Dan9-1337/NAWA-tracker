# 004 — Save from the grades step; remove the confirm screen

**Status:** In review

## Goal

The wizard has two steps (countries, grades), followed by a separate confirm screen that repeats the same three or four values. The user has just chosen each of them, so the extra screen adds a tap and no information. Save directly from the grades step, both when creating and when editing a profile. The one job the confirm screen still does, the warning that a country change moves the user into another comparison group, moves onto the grades step.

Intended behavior:

- **Create:** on the grades step the Telegram MainButton reads `t.form.submitCreate` ("Сохранить ответ") instead of "Далее". Pressing it validates and sends `POST`, as the confirm screen does today. It shows the loading state while pending and is enabled only when `canAdvanceWizardStep('grades', draft)` is true and no request is pending.
- **Create, save error:** the user stays on the grades step with all values intact. `t.form.saveError` and `t.form.saveErrorDraft` appear below the step (`role="alert"`), and the button can be pressed again.
- **Edit, no cohort change:** on the grades step the MainButton reads `t.form.submitUpdate`. Pressing it sends `PUT`, returns to the dashboard and shows "Сохранено", as today.
- **Edit, cohort change** (`cohortFieldsChanged(current, next).length > 0`): the first press sends nothing. Instead it shows the existing warning block (`cohortChangeTitle`, `cohortChangeBody`) on the grades step, below the fields. The MainButton becomes `cohortChangeConfirm` and a SecondaryButton `cohortChangeCancel` appears. Confirming sends `PUT`.
  - The warning disappears, and the next press checks again, after Cancel, after Telegram Back, or after any change to the draft.
- **Navigation:** Back on grades → education. Back on education → start screen (create) or dashboard (edit). Editing from a dashboard profile row still opens the chosen step; "Далее" on education still leads to grades.
- **Restored drafts:** a session saved earlier with `screen: 'confirm'` resumes on the grades step with its draft intact. New sessions are never written with `'confirm'`.
- **Settings → "Посмотреть сохранённые данные"** keeps showing the read-only `ConfirmSummary`, so the component stays.

## Context

- Relevant code and docs: `src/features/CreateProfileFlow.tsx` (screen `'confirm'`, `handleSubmit`, MainButton config), `src/features/ProfileDashboard.tsx` (views `edit-wizard` / `edit-confirm`, `cohortWarning`, `submitEdit`, `leaveConfirmStep`), `src/features/useWizardSteps.ts` (`goNext` → `onReachEnd`), `src/lib/draft.ts` (`WizardScreen`, `hasRestoredWizardSession`), `src/features/ConfirmSummary.tsx` (still used by `SettingsSheet`), `src/lib/cohort-fields.ts`, `docs/product-flow.md` ("Confirm" section).
- ADRs this task follows: [0008](../docs/adr/0008-refocus-on-score-comparison.md). The confirm screen is not an ADR decision; this is a routine flow change. Replaces none.
- Dependencies and decisions already made: the maintainer chose to remove the confirm screen and to show the cohort-change warning inline on the grades step, keeping the two-press confirmation (2026-11-22).

## Scope

- In scope:
  - the save action on the last wizard step for create and edit;
  - the inline cohort warning;
  - mapping restored `'confirm'` sessions;
  - removing the `'confirm'` / `'edit-confirm'` states and locale keys that become unused (for example `wizard.editStep`), in all five locales and `src/i18n/types.ts`;
  - updating tests;
  - updating the wizard and confirm parts of `docs/product-flow.md` and its changelog.
- Out of scope: wizard field changes, adding a cohort summary line to the grades step, the dashboard layout, the validation-hint bug in `GradesStep` (a separate task), `ConfirmSummary` visuals in Settings.
- Files or directories assigned to this task: `src/features/CreateProfileFlow.tsx`, `src/features/ProfileDashboard.tsx`, `src/features/ResponseWizardSteps.tsx`, `src/features/useWizardSteps.ts`, `src/lib/draft.ts` (+ test if present), `src/pages/home-page.test.tsx`, new or updated tests under `src/features/`, `src/i18n/*.ts`, `docs/product-flow.md`.

## Acceptance scenarios

| ID | Given / when | Expected result | Planned verification |
| --- | --- | --- | --- |
| C1 | New user fills in education, then grades with valid values, and presses the MainButton | The button reads `submitCreate`; one `POST /api/responses` is sent; the dashboard opens; no summary screen appears at any point | `home-page.test.tsx` with a fake API: assert the button text on grades, one create call, no `summaryTitle` heading |
| C2 | Grades step with invalid or empty average | MainButton disabled; no request | Component test |
| C3 | Create request fails | Stays on grades; inputs keep their values; `saveError` + `saveErrorDraft` shown; a second press retries | `home-page.test.tsx` with a rejecting fake |
| C4 | `localStorage` holds a v2 session with `screen: 'confirm'` | Resume opens the grades step with that draft | `draft` / `CreateProfileFlow` test seeding storage |
| C5 | Returning user edits only the average | Grades MainButton reads `submitUpdate`; one `PUT`; dashboard with "Сохранено" | `home-page.test.tsx` |
| C6 | Returning user changes citizenship and presses save on grades | First press: warning block visible, no request, MainButton `cohortChangeConfirm`, SecondaryButton `cohortChangeCancel`. Second press: one `PUT` | `home-page.test.tsx` / `ProfileDashboard` test |
| C7 | Warning shown; user presses Cancel, presses Back, or edits a field | Warning hidden; still on grades (Back from the warning hides it and does not navigate); the next save press checks the cohort change again | Component tests for each path |
| C8 | Back navigation | Grades → education → start (create) / dashboard (edit) | Component tests |
| C9 | Settings → "Посмотреть сохранённые данные" | Read-only summary still rendered; delete zone still works | `src/components/SettingsSheet.test.tsx` passes unchanged |
| C10 | Locales and docs | Removed keys gone from all locales and types; `locales.test.ts` passes; product-flow describes a two-step wizard with save on the grades step | `npm test -- src/i18n`; reviewer reads the doc diff |

## Must stay unchanged

- Behavior, contracts, or user-facing copy this task must not alter:
  - the request payloads (`toResponseInput`, neutral defaults) and API contracts;
  - validation rules in `canAdvanceWizardStep`;
  - the `wizard_started` / `wizard_completed` events (fired once per successful create);
  - the closing confirmation while a wizard is dirty;
  - draft clearing after a successful create;
  - the cohort warning texts.
- Existing checks that already cover it: `src/pages/home-page.test.tsx`, `src/components/SettingsSheet.test.tsx`, `src/features/StartScreen.test.tsx`, `src/i18n/locales.test.ts`.

## Open decisions

- None.

## Verification

- `npm test -- src/pages src/features src/lib src/components/SettingsSheet.test.tsx src/i18n` → C1–C10
- `make check`
- Manual (local fixtures, `make dev-new` / `make dev` after checking ports and `.env.local`):
  - first-time user: create a profile without any summary screen;
  - returning user: edit the average, then change citizenship and check the two-press warning and Cancel;
  - reload mid-wizard and resume.
  - → C1, C5–C8

## Handoff

Verification run: `npm test -- src/pages src/features src/lib src/components/SettingsSheet.test.tsx src/i18n` → 22 files, 136 tests, all passing (includes task 002's concurrent landing changes in the shared tree). `npm run typecheck` → clean.

| Scenario | Evidence (command, test assertion, or manual check) | Result |
| --- | --- | --- |
| C1 | `npm test -- src/pages/home-page.test.tsx` → `saves a new profile directly from the grades step without a summary screen`: asserts the grades MainButton is `pl.form.submitCreate` (and `pl.wizard.next` is absent), one `api.createResponse` call, dashboard `score-value`, and no `pl.wizard.summaryTitle` before or after save | pass |
| C2 | `npm test -- src/pages/home-page.test.tsx` → `keeps the save button disabled on grades while the average is empty or above the scale`: `submitCreate` disabled with an empty average and after typing `20` on the 12-point scale; `api.createResponse` not called | pass |
| C3 | `npm test -- src/pages/home-page.test.tsx` → `stays on the grades step with the values intact when the create request fails, then retries`: after a rejecting fake, `role="alert"` contains `saveError` + `saveErrorDraft`, the average input still holds `4.5`, a second press calls create a second time and opens the dashboard | pass |
| C4 | `npm test -- src/lib/draft.test.ts` → `resumes a session saved on the removed confirm screen on the grades step with its draft intact` (v2 `screen: 'confirm'` → `screen: 'wizard'`, `stepIndex: 1`, draft intact) and `never writes the removed confirm screen`; `npm test -- src/pages/home-page.test.tsx` → `resumes a session saved on the removed confirm screen on the grades step` (seeded storage, resume prompt → grades with the seeded average `9.5`, no summary heading) | pass |
| C5 | `npm test -- src/pages/home-page.test.tsx` → `updates the average from the grades step of the edit wizard`: grades MainButton is `pl.form.submitUpdate`, one `api.updateResponse` call with `averageGrade: 4.8`, dashboard and `pl.form.saved` shown | pass |
| C6 | `npm test -- src/features/ProfileDashboard.test.tsx` → `asks for confirmation on the grades step before saving a cohort change`: first press sends nothing, warning texts render, MainButton text `cohortChangeConfirm`, SecondaryButton `cohortChangeCancel`; second press sends one `PUT` with `rankingCountry: 'BY'` and returns to the dashboard with `form.saved` | pass |
| C7 | `npm test -- src/features/ProfileDashboard.test.tsx` → `hides the warning on Cancel…`, `…on Telegram Back without leaving the grades step`, `…after any edit…`: each hides the warning, keeps the grades step (Back does not navigate), and the next save press shows the warning again without a `PUT` | pass |
| C8 | `npm test -- src/features/ProfileDashboard.test.tsx` → `opens the chosen step from the dashboard and walks back to the dashboard`: a dashboard row opens the chosen step, grades → education → dashboard; `npm test -- src/pages/home-page.test.tsx` → `walks back from grades to education and to the start screen` (create) | pass |
| C9 | `npm test -- src/components/SettingsSheet.test.tsx` → 5 tests pass unchanged, including `offers editing and viewing data only when a profile exists` (`viewData` entry); `ConfirmSummary` is still imported by `src/components/SettingsSheet.tsx:126` as `<ConfirmSummary draft={current} />` (no `onEditSection`, so read-only); `SettingsSheet` still passes `onDelete` to the untouched `DeleteProfileZone` | pass |
| C10 | `npm test -- src/i18n` → `locales.test.ts` key-parity tests for en/ru/uk/be vs pl pass; `grep -rn editStep src` returns nothing; the only runtime `'confirm'` left is the documented legacy mapping in `src/lib/draft.ts` (plus the draft test that seeds it); doc diff replaces the "Confirm" section and adds one changelog bullet after the Wizard bullet | pass |
| C1–C8 manual | Not run — requires local dev stack; orchestrator/manual (first-time create without a summary, edit average, citizenship two-press + Cancel, reload mid-wizard and resume) | not run |

- Changed files:
  - `src/features/CreateProfileFlow.tsx` — grades step saves (`submitCreate`, loading, alerts below the step); `'confirm'` screen removed.
  - `src/features/ProfileDashboard.tsx` — `'edit-confirm'` removed; grades step saves (`submitUpdate` / `cohortChangeConfirm` + `cohortChangeCancel`), inline warning, warning cleared on Cancel, Back or any draft change.
  - `src/features/useWizardSteps.ts` — `goNext` no longer takes an `onReachEnd` callback; removed the now-unused `goToLastStep`.
  - `src/lib/draft.ts` — `WizardScreen` is `'start' | 'wizard'`; a stored `screen: 'confirm'` session loads as `wizard` on step 1 (grades).
  - `src/lib/draft.test.ts` (new) — C4 mapping and “never writes `confirm`” coverage.
  - `src/features/ProfileDashboard.test.tsx` (new) — C6–C8 edit-wizard coverage.
  - `src/pages/home-page.test.tsx` — C1–C5, C8 (create) and C4 (resume) coverage; added a `getIntakeSummary` mock so task 002's landing fetch does not hit the network in these tests.
  - `src/i18n/{pl,en,ru,uk,be}.ts` — removed the unused `wizard.editStep`; `src/i18n/types.ts` needed no edit because `Messages` derives from `pl.ts`.
  - `docs/product-flow.md` — replaced the "Confirm" section and added one changelog bullet; task 002's Start section/bullet left as they are.
- Checks not run, blockers, or open questions:
  - `make check` — not run here by agreement; the orchestrator runs it after the wave. `npm run typecheck` was run separately and is clean.
  - Manual dev-stack checks — not run (requires the local stack; `make dev` / `make dev-new` are forbidden for this agent).
  - Wizard tests use generous per-test timeouts because jsdom renders the full country list; under full-suite parallelism the default 5 s is not enough. The suite passes with them.
  - `docs/product-flow.md` "Implementation pointers" still has the row `Create / wizard / confirm`; it sits outside the sections this task owns, so it was left for the reviewer to update.
  - Task 002's files (`StartScreen`, `ResultPreviewCard`, `api-client`, `api/`, `shared/`, `supabase/`, `docs/architecture.md`) were not edited; the required suite passes with their concurrent changes in the tree.
- LLM contributions: Opus 5.5 — specification. DeepSeek V4.1 Flash 1017 — implementation.
