# 027 — After saving, the app returns to the dashboard; no stale draft; the save error is visible

**Status:** In review

## Goal

Four related problems in the save flow were seen on 2026-11-26 in Chrome with `make dev-new` (user 900000002):

1. **After "Обновить анкету" the wizard opens again on step 1.** The `PUT /api/responses` answered 200 and the data was
   saved, but the user stays in the edit wizard: there is no "✓ Сохранено" and no dashboard until they press Back.
2. **The same after delete → create in one session.** After deleting the survey in Settings and filling the wizard again,
   `POST /api/responses` answered 201 but the app showed wizard step 1 instead of the new dashboard.
3. **A stale draft survives.** After the survey was deleted (and the local database reset), the start screen still showed
   "Есть сохранённый прогресс". The edit wizard writes its draft under the same `nawa-wizard-draft:<id>` key as the create
   wizard and nothing clears it when the edit ends.
4. **A save error is easy to miss.** On the fourth score-changing save in 24 hours the server answers 429
   `EDIT_LIMIT_REACHED` and the text
   "Балл можно менять не больше трёх раз за сутки. Следующее изменение — после …" is rendered at the very end of the form,
   below the score preview, outside the visible area. The user sees nothing happen. Also, after the first create the
   dashboard opens still scrolled to the bottom.

Cause of 1 and 2 (confirmed by reading the code on 2026-11-26; still reproduce it with a failing test before changing
anything): `ProfileDashboard` has `useEffect(() => { if (editRequestNonce > 0) startEdit(); }, [editRequestNonce, startEdit])`
(`src/features/ProfileDashboard.tsx:191-193`). `HomePage` only ever increments `editRequestNonce`
(`src/pages/HomePage.tsx:75`, `:287`), and `startEdit` (`:184-189`) depends on `current`. `update` and `create` in
`HomePage` set a new `current` object, so after a save the effect runs again and `startEdit()` overrides the
`setView('dashboard')` from `submitEdit`; after a delete → create the dashboard remounts with the old nonce, and the effect
runs on mount. Both only happen once Settings → "Изменить анкету" was used in the session; editing from a section of
"Ваши данные" (`openEditAt`) does not touch the nonce.

Cause of 3: the effect at `ProfileDashboard.tsx:261-265` calls `saveWizardDraft(editDraft)` while `view === 'edit-wizard'`
and nothing clears it. Only `CreateProfileFlow` reads that key (`loadWizardSession`), and `saveWizardDraft` stores
`screen: 'wizard'`, so the create flow offers the edit values as "Есть сохранённый прогресс". The Settings delete already
calls `clearWizardDraft()` (`HomePage.tsx:200`), so the prompt appears when the survey disappears another way: the
`make db-reset` seen here, or a deletion from another device.

The "dashboard still scrolled to the bottom after the first create" in 4 is **not** explained by the code:
`useScrollToTopOnChange(view, editStepIndex)` (`ProfileDashboard.tsx:100`) already calls `scrollAppToTop()` when the
dashboard mounts. Reproduce it after the nonce fix; if it no longer happens, report that in the handoff and add no extra
scroll code.

Intended behavior:

- A successful update closes the edit wizard, shows the dashboard at its top with the temporary "✓ Сохранено" line, and
  shows the new score.
- A successful create opens the dashboard at its top, also when Settings → "Изменить анкету" was used earlier in the same
  session or the survey was deleted and created again.
- Opening "Изменить анкету" again afterwards still works (one request opens the wizard once).
- The edit flow never leaves a `nawa-wizard-draft:*` entry that the create flow could offer: not after an edit ends
  (saved, or left with Back), and not after an edit was interrupted by closing or reloading the app. Nothing reads the
  edit draft back, so not writing it at all is an acceptable fix. A draft written by an interrupted **create** flow is
  still offered for resume, as before, and a failed create still keeps its draft on the device.
- A save error (429 `EDIT_LIMIT_REACHED`, a network failure, any `actionError`) is brought into view when it appears, in
  both the create and the edit wizard. The message text stays as it is.

## Context

- Relevant code and docs: `src/features/ProfileDashboard.tsx` (`startEdit`, `submitEdit`, the `editRequestNonce` and
  `saveWizardDraft` effects, `saved` and `scrollAppToTop`), `src/pages/HomePage.tsx` (`editRequestNonce`,
  `setEditRequestNonce`, `update`, `create`, `removeProfile`), `src/features/CreateProfileFlow.tsx` (`handleSubmit`,
  `clearWizardDraft`, the `actionError` block at lines 214-221), `src/lib/draft.ts`, `src/lib/useScrollToTop.ts`,
  [Product flow](../docs/product-flow.md),
  [ADR 0013](../docs/adr/0013-limit-on-score-changing-edits.md) (the limit itself is not changed).
- ADRs this task follows: 0013 for the limit message. Replaces none.
- Dependencies and decisions already made: none. Task 004 removed the confirm screen; the wizard is two steps.

## Scope

- In scope: the nonce handling so one Settings request opens the wizard once; clearing the edit draft when the edit ends;
  scrolling the dashboard to the top after a create, only if A8 still reproduces after the nonce fix; bringing
  `actionError` into view; tests for each.
- Out of scope: the score-change limit and its server logic, the cohort-change warning, the closing confirmation, the
  resume prompt copy, and the wizard's steps and validation (task 028).
- Files or directories assigned to this task: `src/features/ProfileDashboard.tsx`, `src/pages/HomePage.tsx`,
  `src/features/CreateProfileFlow.tsx`, `src/lib/draft.ts`, `src/lib/useScrollToTop.ts` and their tests
  (`src/features/ProfileDashboard.test.tsx`, `src/pages/home-page.test.tsx`, `src/lib/draft.test.ts`).
- Test notes: jsdom has no `Element.prototype.scrollIntoView`, so A7 stubs it; jsdom keeps an assigned `scrollTop`, so
  "at its top" can be checked by setting the `[data-app-scroll]` container's `scrollTop` before the action and reading it
  after. A test that renders `ProfileDashboard` alone reproduces 1 only if it re-renders with `editRequestNonce > 0` and a
  **new** `current` object, as `HomePage` does; prefer driving A1–A3 through `HomePage` and Settings.

## Acceptance scenarios

| ID | Given / when | Expected result | Planned verification |
| --- | --- | --- | --- |
| A1 | A returning user opens Settings → "Изменить анкету", changes the grade and saves (`updateResponse` resolves) | The dashboard is shown at its top with "✓ Сохранено" and the new score; the wizard is not shown, also after the next render | `home-page.test.tsx`: open Settings → "Изменить анкету" through the UI, save, assert the saved line and the absence of the wizard's main button text; manual in Chrome (`make dev`) |
| A2 | The same user then opens "Изменить анкету" from Settings a second time | The wizard opens on step 1 and stays open until saved or left with Back | `home-page.test.tsx`, continuing A1 |
| A3 | After Settings → "Изменить анкету" was used at least once in the session, the user deletes the survey in Settings, fills the create wizard and saves | The dashboard of the new survey is shown at its top, not the wizard | `home-page.test.tsx` with fake API calls; manual |
| A4 | An edit session ends by saving, and another ends by Back | `localStorage` has no `nawa-wizard-draft:*` entry afterwards | `home-page.test.tsx` or `ProfileDashboard.test.tsx` reading `localStorage` |
| A5 | An edit session ended by saving (or was left open), then the app is loaded again and `getCurrentResponse` rejects with 401 (the survey is gone, as after `make db-reset`) | The start screen shows no "Есть сохранённый прогресс" prompt | `home-page.test.tsx`: unmount, render `HomePage` again with `getCurrentResponse` rejecting 401, assert no `resumeTitle` |
| A6 | A create wizard is interrupted on step 2 (page reload); a create that fails with 429 | The resume prompt appears, as before; the failed create keeps its draft | Existing `home-page.test.tsx` tests "resumes on grades without wizard_education_completed…" and "shows the score-change limit when a re-create is blocked and keeps the draft on the device" stay green |
| A7 | A save fails with an `actionError`, in the edit wizard and in the create wizard | `scrollIntoView` is called on the new `role="alert"` element, once per error shown | Component tests with a stubbed `Element.prototype.scrollIntoView`; manual with a fourth score-changing edit (the message is visible without scrolling) |
| A8 | A first-time user (`make dev-new`) creates a survey, Settings never opened | The dashboard opens at its top | Manual in Chrome; the handoff says whether the "scrolled to the bottom" observation reproduced and what fixed it |

## Must stay unchanged

- Behavior, contracts, or user-facing copy this task must not alter: the limit of three score-changing saves in 24 hours
  and its message; the cohort-change warning and its confirm step; `closingConfirmation`; every locale string; editing
  from a "Ваши данные" section opens that section's step (`openEditAt`); a failed edit keeps the edited values in the
  wizard; the create flow's resume prompt and its draft key format (`nawa-wizard-draft:<Telegram id>`).
- Existing checks that already cover it: `src/features/ProfileDashboard.test.tsx`, `src/pages/home-page.test.tsx`
  (including "shows the localized score-change limit and keeps the edit values when an edit is blocked"),
  `src/lib/draft.test.ts`.

## Open decisions

- None. If the confirmed cause differs from the one above, fix the actual cause and say so in the handoff.

## Verification

- `npm test -- src/features/ProfileDashboard.test.tsx src/pages/home-page.test.tsx src/lib/draft.test.ts` → A1–A7
- `make check`
- Manual in Chrome (`make dev-new` and `make dev` overwrite `.env.local` and stop processes on ports 3000/3001; check
  before using them): `make db-reset`, clear the browser draft, `make dev-new`; create → A8; then Settings → "Изменить
  анкету" → save → A1, A2; Settings → "Посмотреть сохранённые данные" → delete → create again → A3; open "Изменить
  анкету", save, `make db-reset`, reload → A5; make four score-changing edits in a row → A7 (the fourth is refused with
  the limit message).

## Handoff

| Scenario | Evidence (command, test assertion, or manual check) | Result |
| --- | --- | --- |
| A1 | `npm test -- src/features/ProfileDashboard.test.tsx src/pages/home-page.test.tsx src/lib/draft.test.ts` -> `home-page.test.tsx` "shows the dashboard at its top with the saved line after an edit opened from Settings, then opens the wizard again on request" (saved line, `saved-score-value`, no wizard, `scrollTop` 0). Reproduced before the fix at the component level only: `ProfileDashboard.test.tsx` "opens the wizard once per request and keeps the dashboard when the survey object changes afterwards" failed (dashboard replaced by the wizard after `rerender` with a new `current` and the same nonce), passes now. The HomePage-level A1 test already passed before the fix in jsdom (see open questions). Manual in Chrome: not run: needs maintainer manual check (`make dev`, Settings -> edit survey -> save) | pass (automated); manual not run |
| A2 | Same `home-page.test.tsx` test, second half: opens Settings -> edit again, wizard shows step 1 and stays after pressing Next (grades step) with no `saved-score-value` | pass |
| A3 | `home-page.test.tsx` "shows the new survey dashboard at its top after Settings edit, delete and create in one session" (failed before the fix at `saved-score-value`; asserts dashboard, no wizard, no create button, `scrollTop` 0 after create). Also `ProfileDashboard.test.tsx` "does not replay a request that was already made before the dashboard mounted". Manual: not run: needs maintainer manual check (Settings -> edit survey -> save; Settings -> view saved data -> delete -> create again) | pass (automated); manual not run |
| A4 | `home-page.test.tsx` "leaves no wizard draft after an edit is saved or left with Back" (no `nawa-wizard-draft:*` key after save and after Back; failed before the fix with `nawa-wizard-draft:900000002`); `ProfileDashboard.test.tsx` "writes no wizard draft while the edit wizard is open" | pass |
| A5 | `home-page.test.tsx` "does not offer an interrupted edit as saved progress once the survey is gone" (edit left open, unmount, render again with `getCurrentResponse` 401, no `resumeTitle`; failed before the fix). Manual with `make db-reset`: not run: needs maintainer manual check | pass (automated); manual not run |
| A6 | Existing `home-page.test.tsx` tests "resumes on grades without wizard_education_completed and counts the save as wizard_completed" and "shows the score-change limit when a re-create is blocked and keeps the draft on the device" unchanged and green in the run above | pass |
| A7 | `ProfileDashboard.test.tsx` "brings the save error into view once when it appears in the edit wizard" (stubbed `scrollIntoView` called once, `mock.contexts[0]` is the `role="alert"` element, not again on re-render with the same error); `home-page.test.tsx` "brings the save error into view once when a create fails" (same for the create wizard). Both failed before the fix (0 calls). Manual with a fourth score-changing edit: not run: needs maintainer manual check | pass (automated); manual not run |
| A8 | not run: needs maintainer manual check. Steps: `make db-reset`, clear the browser draft, `make dev-new`, create a survey with Settings never opened, observe whether the dashboard opens at its top. Not reproduced in jsdom: the A3 test sets the scroll container's `scrollTop` to 400 before the create and reads 0 after (existing `useScrollToTopOnChange(view, editStepIndex)` on dashboard mount). No extra scroll code was added | not run |

- Changed files: `src/features/ProfileDashboard.tsx`, `src/features/CreateProfileFlow.tsx`, `src/lib/useScrollToTop.ts`, `src/features/ProfileDashboard.test.tsx`, `src/pages/home-page.test.tsx`. `src/pages/HomePage.tsx`, `src/lib/draft.ts` and `src/lib/draft.test.ts` not changed.
- Checks not run, blockers, or open questions:
  - Confirmed root cause (as in the brief): `startEdit` changes with `current`, and the `editRequestNonce` effect re-ran `startEdit()` whenever `current` changed or the dashboard mounted with a nonce above 0. Fix: `ProfileDashboard` keeps a ref of the last handled nonce (initialised to the nonce at mount) and calls `startEdit()` only when the nonce changes.
  - The HomePage-level A1 test passes even without the fix in jsdom, because there the `update` state change renders and runs the effect before `submitEdit` calls `setView('dashboard')`; in the browser both are batched into one render, so the effect wins. The failing reproduction for A1 is therefore the `ProfileDashboard` test above; the HomePage test stays as the end-to-end behavior check. The delayed `updateResponse` mock in `renderReturningUser` makes the request settle in a later task, like a real one.
  - Draft fix: the edit wizard no longer writes a draft at all (removed the `saveWizardDraft(editDraft)` effect); nothing reads it. `saveWizardDraft` in `src/lib/draft.ts` is now unused but left in place (file not changed, still exported). Drafts already left by an older build in a user's storage are not cleaned up.
  - Error scroll: new hook `useScrollIntoViewWhenShown` (`scrollIntoView({ block: 'center' })`, optional call because jsdom lacks it) used for the alert in both wizards. The alert in the dashboard view is not covered, since a failed save happens in the wizard.
  - `npm test -- src/features/ProfileDashboard.test.tsx src/pages/home-page.test.tsx src/lib/draft.test.ts` all pass (40 tests); `make check` exit 0 (606 tests, typecheck). Manual Chrome checks listed above were not run.
- LLM contributions: Sonnet 5.5 (Claude Code) wrote this specification. Implementation and review: not yet done. Opus 5.5 (Claude Code subagent): specification review. Sonnet 5.5 (Claude Code subagent): implementation.
