# 071 — Language fallback: Russian for the region, English for the rest, never Polish by accident

**Status:** Ready

## Goal

Stop showing Polish to a user whose Telegram language the app does not support. Today `resolveInitialLocale()` ends in `'pl'`, and the bot's
`resolveBotLocale()` returns `'pl'` for any unknown `language_code`; a Kazakh, Georgian, Azerbaijani, Armenian or Uzbek speaker (the
audience) lands in Polish. The maintainer approved the change (2026-11-26).

Intended behavior (app and bot use one shared pure function):

1. A stored choice wins, then a supported Telegram or browser language (`pl`, `en`, `ru`, `uk`, `be`), as today.
2. Otherwise, a language code in the **region set** maps to **Russian**: `kk, ky, uz, tg, tk, az, hy, ka, ro, mo, lt, lv, et, tt, ba, ce`.
3. Otherwise, and when there is no language information at all, **English**.

## Context

- Relevant code and docs: `src/i18n/index.ts` (`resolveInitialLocale`, `localeFromLanguageTag`), `shared/bot-messages.ts` (`resolveBotLocale`),
  `src/i18n/context.tsx`, `src/lib/telegram.ts` (`getTelegramLanguageCode`), `src/i18n/locales.test.ts`, `api/bot.test.ts`,
  [ADR 0010](../docs/adr/0010-locale-glossary-and-english-api-errors.md).
- ADRs this task follows: [0010](../docs/adr/0010-locale-glossary-and-english-api-errors.md). Replaces none.
- Dependencies and decisions already made: the maintainer approved Russian for the region and English elsewhere. The region list is the
  task author's proposal of post-Soviet and neighbouring languages; the implementer keeps it as a named constant.

## Scope

- In scope: `shared/locale-fallback.ts` (new, pure) used by both the app and the bot; its tests; the changed fallbacks.
- Out of scope: adding locales, the language switcher, the stored-preference logic, translation of any text.
- Files or directories assigned to this task: `shared/locale-fallback.ts` and its test, `src/i18n/index.ts`, `src/i18n/locales.test.ts`,
  `shared/bot-messages.ts`, `api/bot.test.ts`.

## Acceptance scenarios

| ID | Given / when | Expected result | Planned verification |
| --- | --- | --- | --- |
| A1 | Telegram `language_code` `kk`, `ka`, `az`, `hy`, `uz`, `ro` | App locale `ru`; bot locale `ru` | `locale-fallback.test.ts`, `api/bot.test.ts` |
| A2 | `de`, `fr`, `ja`, `tr`, an empty string, null | `en` | Same |
| A3 | `ru`, `uk-UA`, `be`, `pl-PL`, `en-GB` | `ru`, `uk`, `be`, `pl`, `en` as today | Same |
| A4 | A stored locale and a different Telegram language | The stored locale wins | `src/i18n` test |
| A5 | No Telegram data and `navigator.language` `de-DE` | `en` | `src/i18n` test |

## Must stay unchanged

- Behavior, contracts, or user-facing copy this task must not alter: every string, the language switcher, API error messages
  (English by ADR 0010), the stored preference key.
- Existing checks that already cover it: `src/i18n/locales.test.ts`, `api/bot.test.ts`, `src/i18n/plural.test.ts`.

## Open decisions

- None.

## Verification

- `npm test -- shared src/i18n api/bot` → A1–A5
- `make check`

## Handoff

| Scenario | Evidence (command, test assertion, or manual check) | Result |
| --- | --- | --- |
| A1 | | |
| A2 | | |
| A3 | | |
| A4 | | |
| A5 | | |

- Changed files:
- Checks not run, blockers, or open questions:
- LLM contributions: Claude Sonnet 5.5 (Claude Code): specification; the finding came from a read-only audit by a Claude research subagent. Implementation and review: not yet done.
