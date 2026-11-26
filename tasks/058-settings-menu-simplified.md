# 058 — Settings: a shorter menu with the right order

**Status:** Ready

## Goal

Cut the Settings menu down to what people use and put the growth actions where they can be found
(the maintainer approved this on 2026-11-26). Today the sheet has nine rows in three groups, two of which sound the same
(`Изменить анкету`, `Посмотреть сохранённые данные`), and `Оформление` offers only a manual light/dark switch although the
app already follows Telegram's theme when nothing is stored.

Intended menu (ru; the other locales follow the glossaries), one list of seven rows in this order:

1. `Мои данные` — closes the sheet and opens the Profile page ([task 046](046-dashboard-hub-and-page-shell.md)); for a user with no survey the row is absent.
2. `Позвать друзей` — the invite row, label from [task 048](048-invite-friends-main-button.md); absent with no survey.
3. `Напоминания в боте` — as today (opens the bot's subscribe link, event `reminders_link_opened`).
4. `Язык` — with the current language as its value, as today.
5. `Конфиденциальность` — the privacy view, as today.
6. `Помощь` — as today.
7. `О NAWAmeter` — as today.

Removed: the row `Посмотреть сохранённые данные` and its `data` sub-view (the Profile page replaces it), and `Оформление` with the
light/dark switcher. The app keeps following Telegram's colour scheme; any `nawa-theme` value already stored is ignored and removed.
The delete-my-data control moves with the privacy view as it is today (its place does not change in this task).

## Context

- Relevant code and docs: `src/components/settings/MainMenu.tsx`, `src/components/settings/settings-view.ts` (`SettingsView`),
  `src/components/SettingsSheet.tsx`, `src/components/ThemeSwitcher.tsx`, `src/lib/theme.ts` (`getStoredThemePreference`,
  `setThemePreference`, `applyTelegramTheme`, `initializeTheme`), `src/components/settings/*View.tsx`, `src/components/DeleteProfileZone.tsx`.
- ADRs this task follows: [0020](../docs/adr/0020-dashboard-hub-and-pages.md). Replaces none.
- Dependencies and decisions already made: tasks 046 (the Profile page) and 048 (the invite label) are `Done`. Without a stored
  preference `resolveBaseTheme` already uses Telegram's colour scheme, so removing the manual switch loses no automatic
  behavior. Outside Telegram (browser) the theme follows the browser's `prefers-color-scheme` if the code does that today; otherwise
  light, as it does without a preference now (the implementer states which in the handoff).

## Scope

- In scope: the menu, the removal of two sub-views, the theme preference storage handling, i18n keys no longer used, tests,
  `docs/product-flow.md` and `README.md` if they mention the theme switch.
- Out of scope: the content of the privacy, help, about and language views, the delete flow, the reminders link, the invite action.
- Files or directories assigned to this task: `src/components/settings/MainMenu.tsx`, `src/components/settings/settings-view.ts`,
  `src/components/settings/settings-view.test.ts`, `src/components/SettingsSheet.tsx`, `src/components/SettingsSheet.test.tsx`,
  `src/components/ThemeSwitcher.tsx` (delete), `src/lib/theme.ts` and `src/lib/theme.test.ts`, `src/i18n/*`, `docs/product-flow.md`, `README.md`.

## Acceptance scenarios

| ID | Given / when | Expected result | Planned verification |
| --- | --- | --- | --- |
| A1 | A user with a survey opens Settings | Seven rows in the order above; no `Посмотреть сохранённые данные`, no `Оформление` | `SettingsSheet.test.tsx` |
| A2 | A first-time user (no survey) opens Settings | `Мои данные` and `Позвать друзей` are absent; the other five rows show | `SettingsSheet.test.tsx` |
| A3 | `Мои данные` is tapped | The sheet closes and the Profile page opens | `ProfileDashboard.test.tsx` / `SettingsSheet.test.tsx` |
| A4 | `Позвать друзей` is tapped | `invite_link_opened` is sent and the share link opens, as before | Existing test passes |
| A5 | `localStorage` has `nawa-theme=dark` from an older version | The value is ignored and removed; the theme follows Telegram's | `src/lib/theme.test.ts` |
| A6 | Telegram reports a dark scheme / light scheme | The app renders the matching palette with no manual control | `src/lib/theme.test.ts` |
| A7 | Search `src` for `ThemeSwitcher`, `appearance`, `viewData`, `'data'` as a settings view | No match; `SettingsView` has `menu`, `privacy`, `language`, `help`, `about` | `grep` output in the handoff |
| A8 | Five locales | The removed keys are gone from all five; key sets match | `src/i18n/locales.test.ts` |

## Must stay unchanged

- Behavior, contracts, or user-facing copy this task must not alter: the privacy, help, about and language views; the reminders
  link and its event; deleting the survey and its confirmation; the language switch.
- Existing checks that already cover it: `src/components/SettingsSheet.test.tsx`, `src/components/settings/settings-view.test.ts`,
  `src/lib/theme.test.ts`, `src/i18n/locales.test.ts`.

## Open decisions

- None.

## Verification

- `npm test -- src/components src/lib/theme src/features src/i18n` → A1–A8
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
| A7 | | |
| A8 | | |

- Changed files:
- Checks not run, blockers, or open questions:
- LLM contributions: Claude Sonnet 5.5 (Claude Code): specification. Implementation and review: not yet done.
