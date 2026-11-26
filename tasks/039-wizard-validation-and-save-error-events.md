# 039 — Product events for where the new-survey wizard goes wrong

**Status:** In review

## Goal

The funnel today is `wizard_started` → `wizard_education_completed` → `wizard_completed`. When people drop off on the
Grades step, the events cannot say why: an average above the scale maximum, the low-score warning (task 033), or a save that
failed. Following [ADR 0011](../docs/adr/0011-documented-product-events-deleted-with-survey.md) (a distinct moment gets a
distinct name, no payload), add three events to the **new-survey** wizard:

| Event | Recorded when | At most |
| --- | --- | --- |
| `wizard_average_above_maximum_shown` | The "average above the maximum" error first becomes visible on the Grades step | Once per mount of the create flow |
| `wizard_low_score_warning_shown` | The low-score warning of task 033 first becomes visible on the Grades step | Once per mount of the create flow |
| `wizard_save_failed` | Saving the new survey fails and the error is shown to the user (any error code, including the score-change limit) | Once per failed save |

Each is added to `productEventNames` and to the catalogue table in `docs/architecture.md` (name, moment, frequency, file)
in the same change. Events are fire-and-forget through the existing `trackProductEvent`; a failed event never affects the
wizard. The edit wizard on the dashboard records none of them.

## Context

- Relevant code and docs: `src/features/CreateProfileFlow.tsx` (existing wizard events, the save), `src/features/wizard/GradesStep.tsx`,
  `src/components/GradeInputs.tsx` (above-maximum error), `src/lib/product-events.ts`, `shared/validation.ts`
  (`productEventNames`), `docs/architecture.md` ("Product events").
- ADRs this task follows: [0011](../docs/adr/0011-documented-product-events-deleted-with-survey.md). Replaces none.
- Dependencies and decisions already made: **after task 033** (the low-score warning must exist) and task 036 (also edits
  `productEventNames` and the catalogue). Task 027 made the save error visible; build on it.

## Scope

- In scope: the three events, their catalogue rows, tests.
- Out of scope: events in the edit wizard or the holder flow, any payload, dashboards or queries over the events.
- Files or directories assigned to this task: `src/features/CreateProfileFlow.tsx`, `src/features/wizard/GradesStep.tsx` (only to
  report visibility upward, if needed), `shared/validation.ts`, `docs/architecture.md`, `src/pages/home-page.test.tsx` or a
  create-flow test, `shared/api-contracts.test.ts` if it lists names.

## Acceptance scenarios

| ID | Given / when | Expected result | Planned verification |
| --- | --- | --- | --- |
| A1 | New survey, maximum 12, the user types `13` | `wizard_average_above_maximum_shown` is sent once; typing `14` then `15` sends nothing more | Create-flow test with a mocked `trackProductEvent` |
| A2 | New survey, the low-score warning becomes visible twice (fixed, then broken again) | `wizard_low_score_warning_shown` is sent once | Create-flow test |
| A3 | New survey, the save returns 500, then the user retries and it returns 429 `SCORE_CHANGE_LIMIT` | `wizard_save_failed` is sent twice; `wizard_completed` is not sent | Create-flow test |
| A4 | Edit wizard on the dashboard, above-maximum and a failed save | None of the three events is sent | `ProfileDashboard.test.tsx` |
| A5 | `POST /api/product-events` with each new name | Accepted; each name has a catalogue row | `api/product-events.test.ts` / contract test; reviewer read |

## Must stay unchanged

- Behavior, contracts, or user-facing copy this task must not alter: existing event names and moments; the wizard's behavior
  when the events request fails; no payload on any event.
- Existing checks that already cover it: `src/pages/home-page.test.tsx`, `src/features/ProfileDashboard.test.tsx`,
  `api/product-events.test.ts`.

## Open decisions

- None.

## Verification

- `npm test -- src/pages src/features api/product-events shared` → A1–A5
- `make check`

## Handoff

| Scenario | Evidence (command, test assertion, or manual check) | Result |
| --- | --- | --- |
| A1 | `src/pages/home-page.test.tsx` > "records the average-above-maximum error once however often it reappears (A1)": typing `13` sends `wizard_average_above_maximum_shown` once; clear + `14`, clear + `15` leave the count at 1; low-score event stays 0 | Pass |
| A2 | `src/pages/home-page.test.tsx` > "records the low-score warning once when it becomes visible twice (A2)": nothing before blur, 1 after blur, warning hidden at `10`, shown again at `3,2`, count still 1 | Pass |
| A3 | `src/pages/home-page.test.tsx` > "records wizard_save_failed once per failed save and wizard_completed on none of them (A3)": `createResponse` rejects with 500, then 429 `SCORE_CHANGE_LIMIT`; `wizard_save_failed` counted 1 after the first and 2 after the retry; `wizard_completed` 0 | Pass |
| A4 | `src/features/ProfileDashboard.test.tsx` > "ProfileDashboard edit wizard records no new-survey wizard events (A4)": above-maximum alert shown, low-score notice shown, `onSubmit` rejects; all three counts are 0 (the edit wizard renders `GradesStep` without a provider, so the context default is a no-op) | Pass |
| A5 | `api/product-events.test.ts` `it.each([...productEventNames])` (accepted) and "documents every accepted event name in the architecture catalogue" now cover the three names; three rows added to the catalogue in `docs/architecture.md` | Pass (reviewer read of the catalogue rows pending) |

- Changed files: `src/features/CreateProfileFlow.tsx` (once-per-mount guards, `wizard_save_failed` on a rejected `onSubmit`, provider), `src/features/wizard/GradesStep.tsx` (exports `GradesStepVisibilityContext`, a no-op by default; reports when the above-maximum error and the low-score warning are visible), `shared/validation.ts` (three names), `docs/architecture.md` (three catalogue rows), `src/pages/home-page.test.tsx` (A1-A3), `src/features/ProfileDashboard.test.tsx` (A4). `src/features/ResponseWizardSteps.tsx` is outside the assigned scope and untouched: the context lets the create flow hear `GradesStep` without passing props through it, and keeps the edit wizard silent.
- Checks not run, blockers, or open questions: `npm test -- src/pages src/features api/product-events shared` (25 files, 295 tests) and `make check` (67 files, 674 tests, typecheck) pass. No ESLint config in the repo, so no lint run. Not tested in a real browser/Telegram. Note: `GradesStep` repeats the above-maximum condition of `GradeInputs` (kept in sync by hand; `GradeInputs` is outside this task's scope). If a failed save is not shown (the page ignored a stale request), `wizard_save_failed` is still sent.
- LLM contributions: Opus 5.5 (Claude Code): specification. Sonnet 5.5 (Claude Code subagent): implementation.
