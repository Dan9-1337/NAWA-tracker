# 064 — A calm start: no phantom "unsaved changes" and no "saved progress" for an empty form

**Status:** Ready

## Goal

Remove two prompts that fire when there is nothing to save. Found by reading the code (not yet reproduced in a Telegram client):

- `closingConfirmation` is on for the whole create wizard and the whole edit wizard from the moment they open
  (`CreateProfileFlow.tsx`, `ProfileDashboard.tsx`). Closing the app on an empty form shows Telegram's "changes you made may not
  be saved" popup, although the draft autosaves.
- `hasRestoredWizardSession` (`src/lib/draft.ts`) checks only that the user left the start screen. Anyone who tapped the start
  button once and left sees `Есть сохранённый прогресс` above the pitch, with `Продолжить` and `Начать заново`, even though the
  draft is empty. Two black buttons then compete with the real start button.

Intended behavior:

1. The closing confirmation is enabled only while the draft differs from the state it was opened with (create: from an empty
   draft; edit: from the saved survey). It is off after a successful save and in the dashboard.
2. The `Есть сохранённый прогресс` box shows only when the restored draft has at least one filled field (a country, an average or any
   choice that is not the default). An empty or default draft shows the plain start screen.

## Context

- Relevant code and docs: `src/features/CreateProfileFlow.tsx` (`dirty`, the chrome config), `src/features/ProfileDashboard.tsx`
  (`chromeConfig`, edit wizard), `src/lib/draft.ts` (`hasRestoredWizardSession`, `saveWizardSession`, `draftsEqual` if present),
  `src/features/StartScreen.tsx` (`showResumePrompt`), `src/lib/useMiniAppChrome.ts`.
- ADRs this task follows: none. Replaces none.
- Dependencies and decisions already made: tasks 027, 033 and 046 are `Done`. The draft format does not change.

## Scope

- In scope: the dirty check for the closing confirmation in both wizards; the non-empty check for the resume box; tests.
- Out of scope: the draft storage format, autosave timing, the start screen layout, the holder flow's confirmation (it keeps its own).
- Files or directories assigned to this task: `src/features/CreateProfileFlow.tsx`, `src/features/ProfileDashboard.tsx`, `src/lib/draft.ts`,
  `src/lib/draft.test.ts`, `src/features/StartScreen.test.tsx`, `src/features/ProfileDashboard.test.tsx`.

## Acceptance scenarios

| ID | Given / when | Expected result | Planned verification |
| --- | --- | --- | --- |
| A1 | The create wizard opens with an empty draft | Closing confirmation is off | `home-page.test.tsx` or a new `CreateProfileFlow` test (fake WebApp) |
| A2 | A country is chosen | Closing confirmation turns on; clearing it again turns it off | Same |
| A3 | The edit wizard opens on the saved survey, nothing changed | Closing confirmation is off; changing the average turns it on; saving turns it off | `ProfileDashboard.test.tsx` |
| A4 | The user opened the wizard, changed nothing, left, and returns | The start screen shows no `Есть сохранённый прогресс` box | `StartScreen.test.tsx`, `draft.test.ts` |
| A5 | The user chose a country, left and returns | The box shows with `Продолжить` and `Начать заново` | `StartScreen.test.tsx`, `draft.test.ts` |
| A6 | `Начать заново` | The draft is cleared and the box disappears (as today) | Existing test passes |

## Must stay unchanged

- Behavior, contracts, or user-facing copy this task must not alter: the draft contents and autosave, the cohort-change warning,
  the holder flow, the wording of the resume box.
- Existing checks that already cover it: `src/lib/draft.test.ts`, `src/features/StartScreen.test.tsx`,
  `src/features/ProfileDashboard.test.tsx`, `src/pages/home-page.test.tsx`.

## Open decisions

- None.

## Verification

- `npm test -- src/lib src/features src/pages` → A1–A6
- `make check`

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
- LLM contributions: Claude Sonnet 5.5 (Claude Code): specification; the findings came from a read-only audit by a Claude research subagent. Implementation and review: not yet done.
