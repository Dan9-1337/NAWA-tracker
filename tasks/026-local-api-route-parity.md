# 026 — The local API serves every handler in `api/`

**Status:** In review

## Goal

`make dev` and `make dev-new` run `scripts/local-api-server.ts`, which lists its routes by hand. On Vercel every file in
`api/` is a route on its own, so a new handler works in production but returns `404 NOT_FOUND` locally until someone
adds it to that list. That happened to `api/orientation-mark.ts` (task 014, [ADR 0017](../docs/adr/0017-orientation-mark-from-holder-scores.md)):
on the local dashboard `GET /api/orientation-mark` and `GET /api/orientation-mark?distribution=1` answer 404 (seen on
2026-11-26 while testing the dashboard in Chrome), so the country mark and its holder distribution cannot be checked
locally. `api/cron/keep-alive.ts` is missing from the list for the same reason. Today the table
(`scripts/local-api-server.ts:26-40`) has 13 entries for 8 of the 10 handler files; every handler file exports a
`create…Handler` factory and a default export built from it.

Intended behavior:

- `GET /api/orientation-mark` (with and without `?distribution=1`) and `GET /api/cron/keep-alive` are served by the local
  API with the same handlers Vercel uses.
- A new handler file in `api/` cannot be forgotten silently again: a test compares the files in `api/` with the local
  route table and fails when one is missing.

## Context

- Relevant code and docs: `scripts/local-api-server.ts` (the route table and the server start in one file; the server
  calls `server.listen` at module level, line 166, so importing it opens port 3001), `api/orientation-mark.ts`
  (`createOrientationMarkHandler`, GET only), `api/cron/keep-alive.ts` (`createKeepAliveHandler`, GET only, rejects with
  500 `INTERNAL_ERROR` when `CRON_SECRET` is missing or shorter than 32 characters, see `api/_lib/cron-auth.ts`),
  `vercel.json`, [Testing](../docs/testing.md). `tsconfig.json` lists only `scripts/local-api-server.ts` from `scripts/`;
  a new module imported from it is type-checked through that import, so `tsconfig.json` does not need to change.
- ADRs this task follows: [0017](../docs/adr/0017-orientation-mark-from-holder-scores.md). Replaces none.
- Dependencies and decisions already made: none. The route table has to be importable by a test without opening a port,
  so move it into its own module (for example `scripts/local-api-routes.ts`) and import it from the server file.

## Scope

- In scope: registering the two missing handlers; extracting the route table so a test can import it; the parity test.
- Out of scope: changing any handler, any HTTP status, the Origin or `initData` checks, `vercel.json`, or the cron
  schedule. Do not add `CRON_SECRET` to `scripts/write-local-env.mjs`: the cron routes keep answering as they do now
  when the secret is not set.
- Files or directories assigned to this task: `scripts/local-api-server.ts`, a new route-table module and its test under
  `scripts/`.

## Acceptance scenarios

| ID | Given / when | Expected result | Planned verification |
| --- | --- | --- | --- |
| A1 | The local API is running and `GET /api/orientation-mark` is sent without a valid `initData` | The response is `401 UNAUTHORIZED` from the handler, not the local server's `404 NOT_FOUND` | Manual: `curl -i -H 'Origin: http://localhost:3000' http://localhost:3000/api/orientation-mark` |
| A2 | `make dev` (returning demo user 900000001), the dashboard is opened | The browser's network log shows `GET /api/orientation-mark` and `?distribution=1` answered with 200, no 404 | Manual, Chrome network panel |
| A3 | Every handler file in `api/` (all `api/**/*.ts` except `api/_lib/**` and `*.test.ts`; today 10 files, including `api/responses/current.ts` and `api/cron/*.ts`) | The route table has at least one route whose path is the file's Vercel path (`api/cron/keep-alive.ts` → `/api/cron/keep-alive`, `api/responses/current.ts` → `/api/responses/current`) | New test under `scripts/` that lists the files from disk and compares them with the exported route table, without opening a port |
| A4 | A handler file is added to `api/` without a local route | The parity test fails and its message names the file | The same test, checked once by temporarily removing a route (report the failure message in the handoff) |
| A5 | The 13 routes that exist today (`scripts/local-api-server.ts:26-40`: `/api/responses` POST/PUT/DELETE, `/api/responses/current` POST, `/api/statistics` POST, `/api/intake-summary` POST, `/api/product-events` POST, `/api/scholarship-report` GET/POST/PUT/DELETE, `/api/bot` POST, `/api/cron/reminders` GET) | The same method and path pairs exist after the change, each served by the same factory, and the only additions are `GET /api/orientation-mark` and `GET /api/cron/keep-alive` | The new test asserts the full list of method and path pairs; the factories by code read in review |
| A6 | The local API is running without `CRON_SECRET` (as `scripts/write-local-env.mjs` writes it) and `GET /api/cron/keep-alive` is sent | `500 INTERNAL_ERROR` from the handler, the same answer as `/api/cron/reminders`, not `404 NOT_FOUND` | Manual: `curl -i http://localhost:3000/api/cron/keep-alive` |
| A7 | The new test runs | No port is opened (importing the route table does not import `scripts/local-api-server.ts`) | Code read in review; `npm test -- scripts/` passes while `make dev` holds port 3001 |

## Must stay unchanged

- Behavior, contracts, or user-facing copy this task must not alter: every handler and its responses; the local
  server's 404 body for unknown paths; the port (`LOCAL_API_PORT`, default 3001) and the Vite proxy.
- Existing checks that already cover it: `npm test -- api/` (handler tests with injected dependencies).

## Open decisions

- None.

## Verification

- `npm test -- scripts/` (the new test) → A3, A4, A5, A7
- `npm test -- api/` and `make check` → nothing else changed
- Manual: `make dev` (it overwrites `.env.local` and stops processes on ports 3000/3001; see AGENTS.md), then the two
  `curl` commands above → A1, A6; dashboard in Chrome → A2

## Handoff

| Scenario | Evidence (command, test assertion, or manual check) | Result |
| --- | --- | --- |
| A1 | not run: needs maintainer manual check. `curl -i -H 'Origin: http://localhost:3000' http://localhost:3000/api/orientation-mark` should answer `401 UNAUTHORIZED`, not `404 NOT_FOUND` (needs the maintainer's dev server restarted so it loads the new route table) | not run |
| A2 | not run: needs maintainer manual check. `make dev` (returning demo user 900000001), open the dashboard, Chrome network panel: `GET /api/orientation-mark` and `?distribution=1` answer 200, no 404 | not run |
| A3 | `npm test -- scripts/local-api-routes` -> `local API route table > has a route for every handler file in api/` (lists `api/**/*.ts` from disk minus `_lib` and `*.test.ts`, asserts each Vercel path has a route) | pass |
| A4 | Temporarily removed the `/api/orientation-mark` route, ran the same test: `AssertionError: api/ handlers without a local route in scripts/local-api-routes.ts: /api/orientation-mark: expected [ '/api/orientation-mark' ] to deeply equal []`; route restored, test green again | pass |
| A5 | `npm test -- scripts/local-api-routes` -> `serves the expected method and path pairs` asserts the 15 pairs (13 old + `GET /api/cron/keep-alive`, `GET /api/orientation-mark`). Factories are unchanged from the old table (code read in review) | pass |
| A6 | not run: needs maintainer manual check. `curl -i http://localhost:3000/api/cron/keep-alive` without `CRON_SECRET` should answer `500 INTERNAL_ERROR` | not run |
| A7 | Code read: `scripts/local-api-routes.ts` does not import `scripts/local-api-server.ts`; the test imports only the routes module. `npm test -- scripts/` passed (it did not start a server). Not checked while `make dev` held port 3001 | pass (code read) |

- Changed files: `scripts/local-api-server.ts` (route table and request type moved out, imports `routes` and `ApiRequest`), new `scripts/local-api-routes.ts` (route table with the two new routes, exports `routes`, `ApiHandler`, `ApiRequest`), new `scripts/local-api-routes.test.ts`, this brief (Status and Handoff only).
- Checks not run, blockers, or open questions: A1, A2, A6 need the running app (see above); the maintainer's local API server must be restarted to pick up the new routes. `npm test -- api/` was covered by `make check` (all `api/` tests passed). `make check` currently fails only in files owned by other agents: typecheck error in `src/components/SearchableSelect.tsx` (`rankSearchMatches`, task 031, cleared on retry), and tests in `src/features/ProfileDashboard.test.tsx` and `src/pages/home-page.test.tsx` (task 027, in flight), plus one `SearchableSelect.test.tsx` failure on an earlier run. Failing names (last run): ProfileDashboard edit requests (4 tests), HomePage save flow returns to the dashboard (4 tests). Typecheck passes on the last run.
- LLM contributions: Sonnet 5.5 (Claude Code) wrote this specification. Implementation and review: not yet done. Opus 5.5 (Claude Code subagent): specification review. Sonnet 5.5 (Claude Code subagent): implementation.
