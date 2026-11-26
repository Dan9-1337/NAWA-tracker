# 036 — Dashboard: the Telegram main button invites people from my country

**Status:** In review

## Goal

On the dashboard the Telegram main button is not used: `chromeConfig()` in `src/features/ProfileDashboard.tsx` returns `{}`
for `view === 'dashboard'`. The action that grows the comparison for the user's own country, "Invite people from my
country", is hidden in Settings (`src/components/settings/MainMenu.tsx`). Every comparison is within the country of
citizenship ([ADR 0015](../docs/adr/0015-compare-within-citizenship-country-without-minimum.md)), so more answers from the same
country directly improve what the user sees.

Intended behavior: while the dashboard is shown (not the edit wizard, not the holder flow or results), the native main
button is visible with the existing label `settings.invite` ("Пригласить людей из моей страны" in ru) and, when pressed,
opens the same Telegram share sheet as the Settings row: `telegramShareLink(botCountryLink(rankingCountry),
t.settings.inviteText(<country label>))` through `openTelegramUrl`. The share logic is shared by both places, not copied.

The press is recorded as a new product event `invite_main_button_opened`, once per press, so it can be told apart from the
Settings row (`invite_link_opened`, unchanged). Per [ADR 0011](../docs/adr/0011-documented-product-events-deleted-with-survey.md)
the event is added to `productEventNames` and to the catalogue in `docs/architecture.md` in the same change.

The button is not shown when there is no saved survey, and it hides while Settings or any other sheet is open in the same way
other chrome is suspended today (`chromeSuspended`). The Settings row stays.

## Context

- Relevant code and docs: `src/features/ProfileDashboard.tsx` (`chromeConfig`, `chromeSuspended`), `src/components/MiniAppShell.tsx`
  (`useMiniAppChrome`, the browser-only `DevActionBar`), `src/components/settings/MainMenu.tsx`, `src/lib/bot-links.ts`,
  `shared/validation.ts` (`productEventNames`), `docs/architecture.md` (event catalogue).
- ADRs this task follows: [0011](../docs/adr/0011-documented-product-events-deleted-with-survey.md), [0015](../docs/adr/0015-compare-within-citizenship-country-without-minimum.md). Replaces none.
- Dependencies and decisions already made: the maintainer chose the invite action for the main button (2026-11-26).
  Task 027 (save returns to the dashboard) is in the working tree; build on it.

## Scope

- In scope: main button config for the dashboard view, a shared invite helper used by Settings and the dashboard, the new
  event and its catalogue row, tests.
- Out of scope: the invite text, the bot's start-param handling, the secondary button, the holder flow's chrome.
- Files or directories assigned to this task: `src/features/ProfileDashboard.tsx`, `src/components/settings/MainMenu.tsx`,
  `src/lib/bot-links.ts` (or a small helper beside it), `shared/validation.ts`, `api/product-events.test.ts` if it lists names,
  `src/features/ProfileDashboard.test.tsx`, `src/components/SettingsSheet.test.tsx`, `docs/architecture.md`.

## Acceptance scenarios

| ID | Given / when | Expected result | Planned verification |
| --- | --- | --- | --- |
| A1 | A returning user with a Ukrainian survey opens the dashboard | The main button is visible with the `settings.invite` text | `ProfileDashboard.test.tsx` (chrome config / fake WebApp) |
| A2 | The user presses it | `openTelegramUrl` receives the same share URL the Settings row builds for Ukraine; `invite_main_button_opened` is sent once | `ProfileDashboard.test.tsx` |
| A3 | The user opens the edit wizard or the holder flow | The main button shows that view's action, as today | Existing tests still pass |
| A4 | Settings is opened over the dashboard | The dashboard's main button is not shown while it is open | `ProfileDashboard.test.tsx` |
| A5 | Settings → "Invite people from my country" | Still sends `invite_link_opened` and opens the same URL | `SettingsSheet.test.tsx` |
| A6 | `POST /api/product-events` with `invite_main_button_opened` | Accepted; the catalogue in `docs/architecture.md` has its row | `api/product-events.test.ts` or `shared/api-contracts.test.ts`; reviewer read |
| A7 | Outside Telegram (browser) | The dev action bar shows the invite action on the dashboard | Manual or `mini-app-shell.test.tsx` |

## Must stay unchanged

- Behavior, contracts, or user-facing copy this task must not alter: the Settings invite row and its event; the edit
  wizard's and holder flow's buttons and back handling; the invite text and link.
- Existing checks that already cover it: `src/features/ProfileDashboard.test.tsx`, `src/components/SettingsSheet.test.tsx`,
  `src/lib/bot-links.test.ts`, `src/components/mini-app-shell.test.tsx`.

## Open decisions

- None.

## Verification

- `npm test -- src/features/ProfileDashboard src/components src/lib/bot-links api/product-events shared` → A1–A6
- `make check`
- Manual (optional), dev server already running: the returning demo user's dashboard in the browser shows the invite action in
  the dev bar → A7

## Handoff

| Scenario | Evidence (command, test assertion, or manual check) | Result |
| --- | --- | --- |
| A1 | `ProfileDashboard.test.tsx` > "Dashboard main button invites people from my country" > "shows the invite text on the main button of the dashboard (A1)": dev chrome `mainVisible`, `mainEnabled`, `mainText === pl.settings.invite` | Pass |
| A2 | Same describe, "opens the same share sheet as the Settings row and records the event once per press (A2)": `openTelegramUrl` called with `telegramShareLink(botCountryLink('UA'), pl.settings.inviteText('Ukraina'))`; `invite_main_button_opened` counted 1 per press (2 after two presses), `invite_link_opened` 0 | Pass |
| A3 | New test "swaps the invite for the edit wizard action and back (A3)" plus the existing edit-wizard, holder-flow and `home-page.test.tsx` tests unchanged and passing | Pass |
| A4 | Same describe, "hides the main button while Settings or another sheet suspends the chrome (A4)": `chromeSuspended` true hides it, false shows the invite again | Pass |
| A5 | `SettingsSheet.test.tsx` "records the settings link events..." now asserts the exact URL equals `telegramShareLink(botCountryLink('UA'), pl.settings.inviteText('Ukraina'))` and `invite_link_opened` once | Pass |
| A6 | `api/product-events.test.ts` `it.each([...productEventNames])` now includes `invite_main_button_opened` (accepted, 200); row added to the event catalogue in `docs/architecture.md` | Pass (reviewer read of the catalogue row pending) |
| A7 | Not run in a browser. `DevActionBar` in `MiniAppShell.tsx` is unchanged and renders any visible main button from the dev bridge state; A1 asserts that state (`mainVisible`, `mainText`) on the dashboard | Covered by A1 state; manual check not run |

- Changed files: `src/lib/country-invite.ts` (new shared helper `openCountryInvite`), `src/features/ProfileDashboard.tsx`, `src/components/settings/MainMenu.tsx`, `shared/validation.ts`, `docs/architecture.md`, `src/features/ProfileDashboard.test.tsx`, `src/components/SettingsSheet.test.tsx`. `api/product-events.test.ts` needed no change (it iterates `productEventNames`).
- Checks run: `npm test -- src/features/ProfileDashboard src/components src/lib/bot-links api/product-events shared` (25 files, 222 tests pass); `make check` exits 0 (typecheck, 67 test files, 667 tests).
- Checks not run, blockers, or open questions: manual browser check of the dev action bar (A7) not run; no blockers.
- LLM contributions: Opus 5.5 (Claude Code): specification. Sonnet 5.5 (Claude Code subagent): implementation.
