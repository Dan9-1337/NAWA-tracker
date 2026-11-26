# 065 — The bot greets with a country name, not "UA:"

**Status:** In review

## Goal

Fix the bot's first message for an invitation link. With `/start c_UA` the bot passes the raw ISO code to `welcomeCountry`
(`api/bot.ts`: `copy.welcomeCountry(country)` with `country = payload.slice(2).toUpperCase()`), so a teenager reads `UA: страна
уже выбрана.` The invitation path is the app's main growth loop, so its first message must read like a person wrote it.

Intended behavior: the message names the country in the user's language (`Украина`), through the same country-name source the
app uses, and keeps the rest of the text as it is. Only the interpolated value changes; the wording of the welcome texts is not
part of this task.

## Context

- Relevant code and docs: `api/bot.ts` (the `/start` branch), `shared/bot-messages.ts` (`welcomeCountry` in the five locales),
  `shared/countries.ts` and the localised names (`shared/country-names-be.ts`, `src/lib/country-label.ts`), `api/bot.test.ts`.
- ADRs this task follows: [0006](../docs/adr/0006-opt-in-bot-reminders.md), [0010](../docs/adr/0010-locale-glossary-and-english-api-errors.md). Replaces none.
- Dependencies and decisions already made: none outstanding. If the app's country labels live in `src/` and are not importable
  from `api/`, the implementer moves the pure label function to `shared/` and keeps `src/lib/country-label.ts` as a thin wrapper;
  that is in scope.

## Scope

- In scope: passing the localised country name; making the label function reachable from `api/`; tests in five locales; no real
  Telegram message is sent in tests (fake sender).
- Out of scope: rewording the welcome and reminder texts, the `/subscribe` flow, the locale fallback, the bot's commands.
- Files or directories assigned to this task: `api/bot.ts`, `api/bot.test.ts`, `shared/bot-messages.ts`, `shared/country-label.ts` (new, if
  needed), `src/lib/country-label.ts` and its test.

## Acceptance scenarios

| ID | Given / when | Expected result | Planned verification |
| --- | --- | --- | --- |
| A1 | `/start c_UA` from a user with `language_code` `ru` | The sent text contains `Украина` and not `UA:` | `api/bot.test.ts` |
| A2 | The same for `uk`, `be`, `pl`, `en` | The country name is in that language (`Україна`, `Украіна`, `Ukraina`, `Ukraine`) | `api/bot.test.ts` |
| A3 | `/start c_XX` with an unknown code, `/start` with no payload | The plain `welcome` text, as today | Existing tests pass |
| A4 | The open-app button | Its URL is still `<app>/?c=UA` | Existing test passes |
| A5 | The app's own country labels | Unchanged for all five locales | `src/lib/country-label.test.ts` |

## Must stay unchanged

- Behavior, contracts, or user-facing copy this task must not alter: every bot text except the interpolated country, the
  button URLs, the subscription logic and its events, no real message is sent by tests.
- Existing checks that already cover it: `api/bot.test.ts`, `src/lib/country-label.test.ts`, `shared/countries.test.ts`.

## Open decisions

- None.

## Verification

- `npm test -- api/bot shared src/lib/country-label` → A1–A5
- `make check`

## Handoff

| Scenario | Evidence (command, test assertion, or manual check) | Result |
| --- | --- | --- |
| A1 | `api/bot.test.ts` "turns a country deep link into an app URL...": ru text equals `welcomeCountry('Украина')`, contains `Украина`, not `UA:` | Pass |
| A2 | `api/bot.test.ts` "names the invited country in %s" for uk `Україна`, be `Украіна`, pl `Ukraina`, en `Ukraine` | Pass |
| A3 | `api/bot.test.ts` "sends the plain welcome for an unknown country code or no payload" and the existing "ignores unknown start payloads" | Pass |
| A4 | `api/bot.test.ts` asserts `webApp.url` is `<app>/?c=UA` (ru test and each locale case) | Pass |
| A5 | `src/lib/country-label.test.ts` unchanged and passing; the label function was not touched | Pass |

- Changed files: `api/bot.ts` (uses `getCountryDisplayName(country, locale)` from `shared/countries`, which `api/` can already import; no move to `shared/country-label.ts` was needed), `api/bot.test.ts`. If a name cannot be resolved, the bot falls back to the plain `welcome` text (the button URL still carries `?c=`).
- Checks not run, blockers, or open questions: `npm test -- api/bot shared src/lib/country-label` (17 files, 167 tests) and `npm run typecheck` pass; `make check` not run (orchestrator runs it).
- LLM contributions: Claude Sonnet 5.5 (Claude Code): specification; the defect was found by a read-only audit by a Claude research subagent. Claude Sonnet 5.5 (implementation).
