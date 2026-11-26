# 066 — Spike: can the app render a share-card image on the free tier?

**Status:** Ready

## Goal

Answer, with a working prototype and measurements, whether NAWAmeter can generate a shareable result card (1080×1920 PNG) on its
current hosting (Vercel Hobby, Node functions, 2 function slots left of 12) before the share feature ([task 067](067-share-result-card.md))
is built. The maintainer wants a share card for Telegram stories and chats (2026-11-26); the research found real unknowns that
only a prototype can settle. The deliverable is a report with a go or no-go and the prototype code, not a user-visible feature.

The card (decided with the maintainer): the saved **score** large, the **country** name with its flag, the status `Порог 60 пройден`
(the same words as [task 054](054-threshold-status-calm.md)), the line `NAWAmeter · неофициально`, and the bot's `@username` as text at the
bottom. No name, no Telegram id, no rank, no percentile, no holder data.

Questions the spike must answer:

1. Does `@vercel/og` (or `satori` + `@resvg/resvg-js`) run as one Node function in this repo's `api/` setup (TypeScript, JSX, ESM,
   `vercel.json`), and what is the compiled function size against the Hobby limits? (Vercel's documents disagree on the OG bundle limit:
   500 KB on one page, 250 MB uncompressed on another.)
2. Do the glyphs render correctly in ru, uk, be, pl and en: `і ї є ґ ў` and `ł ą ę ś ź ż`? Polish letters live in the `latin-ext`
   font subset, not `latin`; the card needs `latin`, `latin-ext` and `cyrillic` for the display font and the body font.
3. Can the image URL be made safe? Use a **signed, stateless URL**: the query carries the display values (`s` score, `c` country,
   `l` locale) and an HMAC-SHA256 tag over them with a server secret `SHARE_CARD_SECRET`. A tampered URL returns 403; the URL carries no
   Telegram id and nothing derivable from it; the response has an immutable cache header. Which existing handler can issue the URL without
   using the last free function slot?
4. What are the cold-start time and the first-byte time, measured locally and, **only with the maintainer's explicit authorization**, on
   the staging deployment ([ADR 0009](../docs/adr/0009-staging-environment-on-free-tiers.md))?
5. Does a Telegram client accept the PNG URL in `shareToStory`, and is JPEG needed for sharing into chats (`InlineQueryResultPhoto` takes JPEG
   up to 5 MB)? These are manual checks for the maintainer on real clients and are listed in the report as steps, not claimed as done.

## Context

- Relevant code and docs: `api/` (function list), `vercel.json`, `package.json`, `scripts/local-api-routes.ts` (every handler file needs a route
  there, and `scripts/local-api-routes.test.ts` checks it), `api/_lib/env.ts` and `.env.example` (add `SHARE_CARD_SECRET`; never commit a
  value), `src/fonts.ts` and `@fontsource` packages (the existing fonts: Oswald for the display face, Golos Text for the body),
  [Architecture](../docs/architecture.md) (hosting, limits), the Telegram docs <https://core.telegram.org/bots/webapps> (`shareToStory`, `shareMessage`,
  `downloadFile`).
- ADRs this task follows: [0001](../docs/adr/0001-telegram-mini-app-on-vercel-and-supabase.md), [0002](../docs/adr/0002-pseudonymous-identity.md), [0009](../docs/adr/0009-staging-environment-on-free-tiers.md). Replaces none.
- Dependencies and decisions already made: image sizes and what is on the card are decided above. The route is a prototype: it
  must not be exposed with real data, and it is not wired into the UI. Do not deploy, call a remote database or send a Telegram
  message without explicit authorization. Prefer woff or ttf for fonts in satori; verify that a `woff2` file does or does not work and report it.

## Scope

- In scope: one prototype function `api/share-card.ts` (single route, one image size), the font set bundled with it, the sign and
  verify helpers in `api/_lib/share-card-signature.ts` with unit tests, its local route and the new env variable documented, a
  report `docs/research/share-card-spike.md` with measurements, five locale sample images attached (committed under `docs/research/img/`) and a go
  or no-go.
- Out of scope: any UI, the share sheet, product events, issuing URLs from the live handlers, JPEG conversion (only measured as an
  option), the story-format variants other than 1080×1920.
- Files or directories assigned to this task: `api/share-card.ts`, `api/share-card.test.ts`, `api/_lib/share-card-signature.ts` and its test,
  `scripts/local-api-routes.ts` and its test, `.env.example`, `api/_lib/env.ts`, `package.json` and `package-lock.json` (new dependency),
  `vercel.json` (only if the function needs `includeFiles` for the fonts), `docs/research/share-card-spike.md`, `docs/research/img/`.

## Acceptance scenarios

| ID | Given / when | Expected result | Planned verification |
| --- | --- | --- | --- |
| A1 | The local server is running and a valid signed URL is requested (score 83.25, KZ, ru) | The response is `200`, `image/png`, 1080×1920 | `api/share-card.test.ts` (reads PNG dimensions) and a saved sample |
| A2 | The URL is tampered (score changed, tag removed, locale changed) | `403` and no image | `api/share-card.test.ts` |
| A3 | Samples in ru, uk, be, pl, en with the glyph set `і ї є ґ ў ł ą ę ś ź ż` placed in the card text for the test | Every glyph is drawn (no tofu boxes) | Images in `docs/research/img/` read by the reviewer |
| A4 | The request and the URL | No Telegram id, identity hash or survey id appears in the URL, the logs or the response headers; `Cache-Control` is `public, immutable, max-age=31536000` | `api/share-card.test.ts` |
| A5 | `npm run build` and the function's compiled size | The report states the size and the Hobby limit it was compared with, and the document it came from | Report |
| A6 | The function count after the change | `api/` has at most 11 function files (one slot stays free); the report says how a signed URL is issued without a new one | `scripts/local-api-routes.test.ts`; report |
| A7 | Local cold start (first request after the process starts) and a warm request, five runs each | The report lists the timings and the machine | Report |
| A8 | The report | States go or no-go, the risks (including the contradictory limit documents), and a numbered manual checklist for real Telegram clients: `shareToStory` accepts the PNG on iOS, Android, Desktop and Web, caption lengths, `downloadFile` headers, and whether a JPEG is needed for chats | Reviewer read |
| A9 | Secrets | `.env.example` has `SHARE_CARD_SECRET=` empty; no real value is committed; tests use a fixed fake value | Reviewer read |

## Must stay unchanged

- Behavior, contracts, or user-facing copy this task must not alter: every existing API route, handler and contract; every screen and
  string; the CSP; the existing fonts and how the app loads them.
- Existing checks that already cover it: `scripts/local-api-routes.test.ts`, `vercel-config.test.ts`, `api/_lib/api-stack.test.ts`,
  `docs-consistency.test.ts`.

## Open decisions

- None.

## Verification

- `npm test -- api/share-card api/_lib/share-card-signature scripts/local-api-routes` → A1, A2, A4, A6
- `npm run build` and the compiled size measurement → A5
- `make check`
- Reviewer read of `docs/research/share-card-spike.md` and the sample images → A3, A7, A8, A9

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

- Changed files:
- Checks not run, blockers, or open questions:
- LLM contributions: Claude Sonnet 5.5 (Claude Code): specification; the Telegram and Vercel research behind it was done by Claude research subagents from primary documents. Implementation and review: not yet done.
