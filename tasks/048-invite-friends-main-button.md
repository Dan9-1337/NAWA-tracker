# 048 — "Позвать друзей": the invite no longer claims a country, and shows where people look

**Status:** Ready

## Goal

Make the invite action honest and easy to find ([ADR 0020](../docs/adr/0020-dashboard-hub-and-pages.md), point 6). The button
"Пригласить людей из моей страны" promises something the share link does not enforce: `startapp=c_UA` only preselects the
country in the invitee's form, and they can change it. The action is renamed and shown on more screens.

Intended behavior:

- The label `settings.invite` becomes **`Позвать друзей`** (uk `Запросити друзів`, be `Запрасіць сяброў`, pl `Zaproś znajomych`,
  en `Invite friends`) everywhere it appears: the Telegram main button, the browser dev action bar and the Settings row.
- The Telegram main button with this label is visible on **the hub, the What-if page and the holder results page**, and hidden
  on the Profile page, in the edit wizard, in the holder flow, and while Settings or another sheet is open (`chromeSuspended`).
- Pressing it does what it does today: `openCountryInvite(rankingCountry, locale, t.settings.inviteText)` and one
  `invite_main_button_opened` event per press. The text that goes to the chat still names the country
  (`settings.inviteText(<country>)`), and the link still preselects it.
- The reason line under the position ("Пока 4 анкеты из Казахстана…") belongs to task 047, not here.

## Context

- Relevant code and docs: `src/features/ProfileDashboard.tsx` (`chromeConfig`, `scholarship.mode === 'results'` branch),
  `src/components/settings/MainMenu.tsx`, `src/lib/country-invite.ts`, `src/lib/bot-links.ts`, `src/components/MiniAppShell.tsx`
  (`DevActionBar`), `docs/architecture.md` (product event catalogue), [Product flow](../docs/product-flow.md).
- ADRs this task follows: [0020](../docs/adr/0020-dashboard-hub-and-pages.md), [0011](../docs/adr/0011-documented-product-events-deleted-with-survey.md),
  [0010](../docs/adr/0010-locale-glossary-and-english-api-errors.md). Replaces none. It refines [task 036](036-dashboard-main-button-invites-country.md):
  036 put the invite on the dashboard main button; this task changes its label and the screens that show it.
- Dependencies and decisions already made: the maintainer chose to keep a prominent invite and to rename it (2026-11-26).
  Tasks 036 and 046 are `Done` first. Where "invite" appears in other copy (the Settings row text, `docs/product-flow.md`,
  the README, the landing FAQ), the implementer finds every use of the old label with a search and changes only the
  label, not unrelated sentences; if a sentence elsewhere depends on the country promise, list it in the handoff instead
  of rewriting it.

## Scope

- In scope: the label in five locales; the main button on the three screens; the Settings row label; the dev action bar
  inherits the main button config; tests; the catalogue row of `invite_main_button_opened` (describe it as the invite main
  button on the hub, What-if page and holder results); `docs/product-flow.md` lines that name the old label.
- Out of scope: the invite text sent to the chat, the bot's start-param handling, the event names, the secondary button, the
  holder flow's chrome, a post-save invite prompt (not wanted: the hub's button is already visible after saving), an invite
  for holders only ("Позвать других стипендиатов").
- Files or directories assigned to this task: `src/features/ProfileDashboard.tsx`, `src/components/settings/MainMenu.tsx`,
  `src/i18n/{ru,uk,be,pl,en}.ts`, `src/features/ProfileDashboard.test.tsx`, `src/components/SettingsSheet.test.tsx`,
  `src/components/mini-app-shell.test.tsx` if it names the label, `docs/architecture.md`, `docs/product-flow.md`.

## Acceptance scenarios

| ID | Given / when | Expected result | Planned verification |
| --- | --- | --- | --- |
| A1 | A returning user with a Ukrainian survey opens the hub in each locale | The main button is visible with the locale's new label (`Позвать друзей` in ru) | `ProfileDashboard.test.tsx` (fake WebApp) |
| A2 | The user opens the What-if page | The main button is visible with the same label | `ProfileDashboard.test.tsx` |
| A3 | The user opens the holder results page | The main button is visible with the same label and Back still returns to the hub | `ProfileDashboard.test.tsx` |
| A4 | The Profile page, the edit wizard and the holder flow | No invite on the main button; the wizard and the flow show their own actions as before | `ProfileDashboard.test.tsx` |
| A5 | Settings (or any sheet) is open over the hub | The invite is not shown | `ProfileDashboard.test.tsx` (`chromeSuspended`) |
| A6 | The invite is pressed on each of the three screens | `openTelegramUrl` receives `telegramShareLink(botCountryLink('UA'), pl.settings.inviteText('Ukraina'))`; `invite_main_button_opened` is sent once per press and `invite_link_opened` is not sent | `ProfileDashboard.test.tsx` |
| A7 | Settings → the invite row | Shows the new label; still sends `invite_link_opened` and opens the same URL | `SettingsSheet.test.tsx` |
| A8 | Search the locale files and docs for the old label | No remaining use of `Пригласить людей из моей страны` or its translations as a button label; any other mention is listed in the handoff | `grep` result in the handoff |
| A9 | Five locales | Same key set in all five; glossary tests pass | `src/i18n/locales.test.ts`, `src/i18n/glossary.test.ts` |
| A10 | `docs/architecture.md` | The catalogue row of `invite_main_button_opened` describes the three screens | Reviewer read |

## Must stay unchanged

- Behavior, contracts, or user-facing copy this task must not alter: the invite text and link, the bot's handling of
  `c_<CODE>`, the product event names and their `productEventNames` list, the Settings row's event, the edit wizard's and the
  holder flow's buttons and Back handling.
- Existing checks that already cover it: `src/features/ProfileDashboard.test.tsx`, `src/components/SettingsSheet.test.tsx`,
  `src/lib/bot-links.test.ts`, `api/product-events.test.ts`.

## Open decisions

- None.

## Verification

- `npm test -- src/features src/components src/lib/bot-links src/i18n api/product-events` → A1–A7, A9
- `make check`
- `grep -rn "Пригласить людей" src docs README.md` (and the uk, be, pl, en equivalents) → A8
- Reviewer read of `docs/architecture.md` → A10

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

- Changed files:
- Checks not run, blockers, or open questions:
- LLM contributions: Claude Sonnet 5.5 (Claude Code): specification; ADR 0020. Implementation and review: not yet done.
