# 074 — Real-device UI check (no code, a checklist for a person)

**Status:** Ready

## Goal

Close what reading the code could not. The audit of 2026-11-26 read the whole UI and walked it in a desktop browser at 390px, but could not
see real Telegram clients. This task is a structured manual check on real devices and in Telegram's own themes. It produces a findings list;
every finding that needs a change becomes its own task. No code is changed here.

The checker is the maintainer or an assigned reviewer, not an implementation agent. Use the **staging** deployment
([ADR 0009](../docs/adr/0009-staging-environment-on-free-tiers.md)) and a test Telegram account. Do not use production data and do not message real users.

## Context

- Relevant code and docs: [Testing](../docs/testing.md), [Architecture](../docs/architecture.md) (staging), `docs/ux-review.md`, the briefs 046–073.
- ADRs this task follows: [0009](../docs/adr/0009-staging-environment-on-free-tiers.md), [0019](../docs/adr/0019-minimum-text-size-14px.md). Replaces none.
- Dependencies and decisions already made: run this after the hub tasks (046–054) and the tasks 057, 061, 068 and 069 are on staging, and again
  before launch. The checklist covers both first-time and returning users.

## Scope

- In scope: the checks below, on at least these clients: **iOS** (Telegram iOS), **Android** (Telegram Android, a mid-range phone with a small
  screen, 360×640 if available), **Desktop** (Telegram Desktop), **Web** (web.telegram.org). Themes: Day, Night, and one custom theme.
- Out of scope: fixing anything, performance profiling, load testing.
- Files or directories assigned to this task: `docs/research/real-device-ui-check.md` (the filled checklist and screenshots).

## Acceptance scenarios

| ID | Given / when | Expected result | Planned verification |
| --- | --- | --- | --- |
| A1 | Open the Mini App from the bot's `/start` and from `t.me/<bot>?startapp=c_UA` | The app opens; with `c_UA` the country is preselected; note extra taps from the bot's open button | Manual, per client |
| A2 | First-time flow end to end in ru, uk, be, pl, en at the smallest phone | No clipped, overlapping or unreadable text; no text below 14px except ruler labels and badges; buttons do not wrap to three lines | Manual, screenshots |
| A3 | Education step: open the country sheet (task 069), type, choose; open the keyboard | The list stays visible above the keyboard and the bottom controls; the main button hides while the sheet is open; Back closes the sheet | Manual, per client |
| A4 | Grades step: focus the average field with the keyboard open | The field and the sticky score bar (task 057) are not hidden by the keyboard | Manual, iOS and Android |
| A5 | What-if page: drag the ruler; swipe down at the top; try to minimize the app by swiping | Dragging the ruler does not minimize the app or scroll the page; the nudge (task 060) shows once | Manual, iOS and Android |
| A6 | Safe areas: the app in fullscreen and in landscape, on a phone with a notch | Header and bottom controls are not under the notch or the home indicator | Manual |
| A7 | Day, Night and a custom theme | Cards, borders, the position visual (task 047), buttons and flags stay visible and readable; note any white-on-white card | Manual, screenshots |
| A8 | Flags (task 061) on the production-like CSP | Flags show in the picker, on the result card and in the holder results; no console errors | Manual (browser dev tools on Web/Desktop) |
| A9 | Fonts | No large layout jump when the score font loads; Cyrillic `ґ є і ї ў` and Polish `ł ą ę` display | Manual |
| A10 | Offline and slow network: airplane mode on the create and edit screens, then a throttled connection | The offline message and disabled main button (task 063) show; a retry works; nothing hangs forever | Manual |
| A11 | Expired session: leave the app open for over 24 hours (or use a test account with an old `initData`) | The session-expired screen with `Открыть заново` (task 062) shows instead of the start screen | Manual |
| A12 | Bot: `/start`, `/start c_UA`, `/subscribe`, `/stop` in five languages | The texts read correctly (tasks 065, 070, 072); the open-app button works | Manual |
| A13 | Share (when task 067 exists) | The story editor opens with the card; `Сохранить картинку` downloads it; behavior on each client is recorded | Manual, per client |

## Must stay unchanged

- Behavior, contracts, or user-facing copy this task must not alter: everything; no code is changed.
- Existing checks that already cover it: none; this check exists because tests cannot cover it.

## Open decisions

- None.

## Verification

- The filled checklist and screenshots in `docs/research/real-device-ui-check.md`; every failing row has a one-line description and, where it needs a change, a proposal for the task author.

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
| A10 | | |
| A11 | | |
| A12 | | |
| A13 | | |

- Changed files:
- Checks not run, blockers, or open questions:
- LLM contributions: Claude Sonnet 5.5 (Claude Code): specification. The check itself: not yet done.
