# 042 — Language switcher stays in Settings only

**Status:** In review

## Goal

The language is changed only through the gear → Settings → language. The start screen (`StartScreen`) shows no language
switcher.

Revision 2026-11-26: the first version of this brief put the compact `LanguageSwitcher` (POL / ENG / RUS / UKR / BEL) at the
top of the start screen. The maintainer reviewed it and rejected it: the language buttons belong in the gear menu, not on
the start screen. The uncommitted implementation of that version is still in the working tree and must be taken out.

Intended behavior: the start screen looks as it did before this task, without the switcher row above the title. The Settings
switcher works as before. The switcher's codes keep the 14px (`text-sm`) size required by ADR 0019, so that part of the
earlier change stays.

## Context

- Relevant code and docs: `src/features/StartScreen.tsx` (the `<div className="flex justify-end"><LanguageSwitcher /></div>`
  row and its import, added by the first version of this task), `src/features/StartScreen.test.tsx` (the `language switcher`
  tests added by the first version), `src/components/LanguageSwitcher.tsx`, `src/components/SettingsSheet.tsx`.
- ADRs this task follows: [0019](../docs/adr/0019-minimum-text-size-14px.md): the switcher's codes are buttons, so they stay at
  `text-sm`. Replaces none.
- Dependencies and decisions already made: maintainer decision 2026-11-26: language selection only in the Settings (gear) menu.
  The working tree also holds task 040's `text-xs` → `text-sm` edits in `StartScreen.tsx`; they belong to task 040 and stay.

## Scope

- In scope: removing the switcher row and its import from `StartScreen.tsx`; replacing the start-screen `language switcher`
  tests with one test that the start screen has no language group.
- Out of scope: language detection, the Settings sheet, `LanguageSwitcher`'s size (stays `text-sm`), task 040's text-size
  changes, copy.
- Files or directories assigned to this task: `src/features/StartScreen.tsx`, `src/features/StartScreen.test.tsx`.

## Acceptance scenarios

| ID | Given / when | Expected result | Planned verification |
| --- | --- | --- | --- |
| A1 | A first-time user sees the start screen | No language group and no POL/ENG/RUS/UKR/BEL buttons on the start screen | `StartScreen.test.tsx` |
| A2 | The user opens gear → Settings → language and presses UKR | The app switches to Ukrainian; the choice is stored as before (`localStorage['nawa-locale'] === 'uk'`) | `SettingsSheet.test.tsx` (existing) |
| A3 | `LanguageSwitcher` in Settings | Codes use `text-sm` (ADR 0019) | Code check of `LanguageSwitcher.tsx` |

## Must stay unchanged

- Behavior, contracts, or user-facing copy this task must not alter: the Settings switcher; locale detection for users who
  never choose; the start screen's events (`landing_viewed`), buttons and task 040's text sizes.
- Existing checks that already cover it: `src/features/StartScreen.test.tsx`, `src/components/SettingsSheet.test.tsx`.

## Open decisions

- None.

## Verification

- `npm test -- src/features/StartScreen src/components/SettingsSheet` → A1, A2
- Read `src/components/LanguageSwitcher.tsx` → A3
- `make check`

## Handoff

| Scenario | Evidence (command, test assertion, or manual check) | Result |
| --- | --- | --- |
| A1 | `npm test -- src/features/StartScreen src/components/SettingsSheet`: new test `has no language switcher: the language is chosen only in Settings` in `StartScreen.test.tsx` asserts `queryByRole('group', { name: pl.language.label })` is absent and that no button text is `POL`, `ENG`, `RUS`, `UKR` or `BEL` | Pass (2 files, 18 tests) |
| A2 | `SettingsSheet.test.tsx` passes (6 tests), but it contains no test that presses UKR or checks `localStorage['nawa-locale']`; the only such test was the removed start-screen one. `SettingsSheet.tsx` and `LanguageSwitcher.tsx` are unchanged, so behavior is as before, not asserted by a test | Not covered by an existing test (see blockers) |
| A3 | Read `src/components/LanguageSwitcher.tsx`: the button class string (line 14) uses `text-sm`; no `text-xs` or arbitrary smaller size | Pass |

- Changed files: `src/features/StartScreen.tsx` (removed the switcher row and its import; task 040's `text-sm` edits left in place), `src/features/StartScreen.test.tsx` (replaced the `language switcher` describe with the one no-switcher test; dropped the imports it left unused: `SettingsSheet`, `LOCALE_STORAGE_KEY`, `ru`, `uk`, `within`), and this brief.
- Checks not run, blockers, or open questions: `make check` passed (693 tests in 68 files, typecheck clean). Not run: browser check (`make dev` was off limits). Open: the brief says A2 is covered by an existing `SettingsSheet.test.tsx` test, but none presses a language button there. If A2 needs a test, a follow-up should add one to `SettingsSheet.test.tsx`, which is outside this task's assigned files.
- LLM contributions: Opus 5.5 (Claude Code): specification and its 2026-11-26 revision. Sonnet 5.5 (Claude Code subagent):
  implementation of the first (rejected) version. Sonnet 5.5 (Claude Code subagent): implementation of the 2026-11-26 revision.
