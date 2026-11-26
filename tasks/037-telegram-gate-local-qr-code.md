# 037 — "Open in Telegram" screen: generate the QR code locally

**Status:** In review

## Goal

Outside Telegram the app shows a gate screen with a QR code to the bot (`src/components/TelegramGate.tsx`). The QR image is
loaded from `https://api.qrserver.com/v1/create-qr-code/?…&data=<bot URL>`: every visitor's browser sends the bot URL and its
IP address to a third party, and the QR disappears when that service is slow, blocked, or gone.

Intended behavior: the QR code is generated in the browser from `https://t.me/<bot username>`, with no network request,
and rendered as inline SVG (or a canvas) at the same 180×180 size, with dark modules on a light background in both themes so
phone cameras read it. The `alt` text / accessible name stays as today. No other request to `api.qrserver.com` remains in
the codebase.

A QR encoder may be added as one runtime dependency if it is small (under ~15 kB minified), MIT/BSD/ISC licensed, has no
dependencies of its own, and is maintained; record its name and size in the handoff. Writing an encoder by hand is not
in scope.

## Context

- Relevant code and docs: `src/components/TelegramGate.tsx`, `package.json`, `package-lock.json`, `docs/architecture.md` (if it
  lists third-party calls).
- ADRs this task follows: [0001](../docs/adr/0001-telegram-mini-app-on-vercel-and-supabase.md). Replaces none.
- Dependencies and decisions already made: from the UX review P2 list, approved by the maintainer 2026-11-26.

## Scope

- In scope: local QR generation, one dependency if needed, a component test.
- Out of scope: the gate copy, the "copy username" button, the link itself.
- Added by the task author after the first run (2026-11-26): `vercel.json`, only to remove `https://api.qrserver.com` from
  the CSP `img-src`; nothing else in the header changes. Updated A3 check: `grep -rn qrserver src vercel.json` finds nothing.
- Files or directories assigned to this task: `src/components/TelegramGate.tsx`, `package.json`, `package-lock.json`, a new test
  `src/components/telegram-gate.test.tsx`, `docs/architecture.md` only if it mentions the QR service.

## Acceptance scenarios

| ID | Given / when | Expected result | Planned verification |
| --- | --- | --- | --- |
| A1 | The gate renders for bot `nawa_tracker_bot` | A QR graphic is in the DOM without any `img` pointing to an external host | `telegram-gate.test.tsx` |
| A2 | Decoding the rendered QR | Yields `https://t.me/nawa_tracker_bot` | Unit test using the encoder's matrix, or manual scan with a phone |
| A3 | Codebase search | `grep -rn qrserver src` finds nothing | Command in the handoff |
| A4 | Dark theme, outside Telegram | The QR is dark on light and scannable | Manual in Chrome with the dev server already running |
| A5 | A dependency was added | Its licence, size and zero-dependency status are recorded | Handoff |

## Must stay unchanged

- Behavior, contracts, or user-facing copy this task must not alter: the gate text, the open-in-Telegram link, the copy button.
- Existing checks that already cover it: `src/bootstrap.test.tsx` (gate shown outside Telegram).

## Open decisions

- None.

## Verification

- `npm ci` if a dependency was added, then `npm test -- src/components/telegram-gate src/bootstrap` → A1, A2
- `grep -rn qrserver src` → A3
- `make check`
- Manual (optional) → A4

## Handoff

| Scenario | Evidence (command, test assertion, or manual check) | Result |
| --- | --- | --- |
| A1 | `src/components/telegram-gate.test.tsx` "renders the QR as inline SVG without any external image": role `img` element is an `svg`, 180x180, accessible name = `pl.telegram.qrAlt`, no `img`, no `[src]`/`image` elements, white `rect` + black `path`. `npm test -- src/components/telegram-gate src/bootstrap`: 2 files, 4 tests pass | Pass |
| A2 | Tests "encodes https://t.me/<bot username>" and "strips a leading @": the rendered path `d` equals `toSvgPath(generate('https://t.me/nawa_tracker_bot'))` and differs from another bot's. This compares against the encoder matrix (no decoder dependency); no phone scan done | Pass (matrix-level; not scanned) |
| A3 | `grep -rn qrserver src vercel.json` returns no matches (exit 1). `vercel.json` CSP `img-src` changed from `'self' data: blob: https://api.qrserver.com` to `'self' data: blob:`; single-line diff, file still parses with `JSON.parse` | Pass |
| A4 | Not run in a browser. By construction the SVG uses a fixed `#ffffff` background rect with a 4-module quiet zone and `#000000` modules, independent of theme CSS variables | Not run (optional) |
| A5 | `lean-qr@2.7.4`, MIT, zero dependencies (npm `dependencies` empty; lockfile adds only this package), published by maintainer with latest release 2026-09-07; `index.mjs` 6.9 kB minified (about 3.5 kB gzip), plus `extras/svg` helper (`toSvgPath`) tiny. Installed with `npm install lean-qr@2.7.4 --save-exact` | Done |

- Changed files: `src/components/TelegramGate.tsx`, `src/components/telegram-gate.test.tsx` (new), `package.json`, `package-lock.json`, `vercel.json` (CSP `img-src` only).
- Checks not run, blockers, or open questions: `make check` passes (68 files, 689 tests, typecheck). A4 manual browser check and a phone scan not run. The gate image is now exactly 180x180 px (previously a 176 px `h-44` box with padding). `docs/architecture.md` does not mention the QR service, so it is unchanged.
- LLM contributions: Opus 5.5 (Claude Code): specification. Sonnet 5.5 (Claude Code subagent): implementation.
