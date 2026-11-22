# 002 — Real response counter on the landing screen

**Status:** In review

## Goal

The start screen shows `48 заявок · +7 за неделю` (`start.previewLive`) with a "live" dot inside the sample-result card. The number is hard-coded in all five locales, so a first-time visitor reads invented data as real statistics. Replace it with the real number of responses collected for the active intake year.

Intended behavior:

- The landing shows one line, e.g. `312 ответов за набор 2026`: the count of valid (not `is_suspicious`) responses of the active intake year, across all tracks. This is the same population as `totalValidResponses` in `get_current_statistics`.
- There is no weekly delta. The 2026 intake is closed, so a "this week" figure would almost always be `+0`.
- When the count is below the cohort floor (`min_cohort_size()` = 10, `MIN_COHORT_SIZE`), the server returns no number and the line is not rendered.
- The line sits **outside** the sample card, directly below it and above the start button, so real data is not mixed into the "Пример результата" demo. It keeps the accent dot (`●`).
- While the count is loading, or when the request fails, the line is not rendered. No placeholder number, no error message, and the start button works as before.
- The count is fetched once when the start screen mounts. No polling.

## Context

- Relevant code and docs: `src/features/StartScreen.tsx`, `src/components/ResultPreviewCard.tsx:82`, `src/i18n/*.ts` (`start.previewLive`), `src/lib/api-client.ts`, `api/statistics.ts` (handler pattern: same-origin check, `requireTelegramIdentity`, RPC, schema parse), `supabase/migrations/202611250001_cleanup_and_thresholds.sql` (`get_current_statistics`, `min_cohort_size()`, `active_intake_year()`), `docs/architecture.md` (changelog), `docs/product-flow.md`.
- ADRs this task follows: [0001](../docs/adr/0001-telegram-mini-app-on-vercel-and-supabase.md), [0002](../docs/adr/0002-pseudonymous-identity.md), [0008](../docs/adr/0008-refocus-on-score-comparison.md). Replaces none.
- Dependencies and decisions already made:
  - The maintainer chose "total only, hidden below 10" (2026-11-22).
  - The old `get_public_statistics` RPC was dropped in `202611250001`. A new RPC is needed.
  - The start screen renders only in `create` mode. By then the user has verified Telegram `initData` but no profile, so the endpoint requires a verified identity but **not** an existing response. Outside Telegram (`gate` mode) nothing is fetched.

## Scope

- In scope:
  - A new migration that adds an RPC (suggested name `get_intake_summary()`). It returns `{ intakeYear, responseCount }` for `active_intake_year()`, with `responseCount = null` when the count is below `min_cohort_size()`. Grants match `get_current_statistics` (service role only).
  - A new handler `POST /api/intake-summary`. It checks same-origin, requires a verified Telegram identity, calls the RPC and validates the result with a shared zod schema in `shared/validation.ts` and `shared/contracts.ts`.
  - An API client function `getIntakeSummary()`.
  - Rendering of the line on the start screen. Remove `start.previewLive` from `ResultPreviewCard` and from all locales. Add a pluralised key, for example `start.responseCount(count, year)`:
    - ru: `${count} ${ответ|ответа|ответов} за набор ${year}`
    - en: `${count} responses in the ${year} intake`
    - pl, uk and be: equivalent translations.
  - SQL test, API handler test, StartScreen test.
  - Architecture changelog entry for the migration; one line in the product-flow changelog.
- Out of scope: weekly or daily deltas, per-country counts on the landing, any change to `get_current_statistics`, the dashboard, other landing copy, the TelegramGate screen.
- Files or directories assigned to this task: `supabase/migrations/<new file sorted after 202611260001>`, `supabase/tests/`, `api/intake-summary.ts` (+ test), `shared/contracts.ts`, `shared/validation.ts`, `src/lib/api-client.ts`, `src/features/StartScreen.tsx` (+ test), `src/components/ResultPreviewCard.tsx`, `src/i18n/*.ts`, `docs/architecture.md`, `docs/product-flow.md`.

## Acceptance scenarios

| ID | Given / when | Expected result | Planned verification |
| --- | --- | --- | --- |
| A1 | Active intake year has 312 valid responses; the user opens the start screen | A line `312 ответов за набор 2026` (ru) appears below the sample card, above the start button | StartScreen test with a mocked `getIntakeSummary` resolving `{ intakeYear: 2026, responseCount: 312 }` |
| A2 | The RPC counts responses | Excludes `is_suspicious` rows and rows of other intake years; equals `totalValidResponses` for the same data | SQL test on PGlite/pgTAP with mixed fixtures |
| A3 | Fewer than 10 valid responses | RPC returns `responseCount: null`; the landing renders no count line | SQL test (9 rows → null, 10 rows → 10) + StartScreen test with `null` |
| A4 | The request is pending or fails (network error, 5xx, invalid payload) | No count line, no error text; the start button is enabled and starts the wizard | StartScreen tests for pending and rejected promise |
| A5 | `POST /api/intake-summary` without valid `initData`, cross-origin, or with another method | 401 / 403 / 405 through the existing error helpers; the RPC is not called | Handler test with fake dependencies |
| A6 | Hard-coded figure | `previewLive` exists in no locale and `48` no longer renders on the landing | `grep -rn previewLive src` is empty; `src/i18n/locales.test.ts` passes |
| A7 | Plural forms | ru renders `1 ответ`, `3 ответа`, `25 ответов` (and correct uk/be/pl forms) | Locale unit test calling `start.responseCount` |

## Must stay unchanged

- Behavior, contracts, or user-facing copy this task must not alter:
  - the demo ruler, its sample percentile and the "Пример результата" badge;
  - `get_current_statistics` and `/api/statistics`;
  - the cohort floor value (10) and its single definition per side;
  - `gate` mode (no request outside Telegram);
  - server-side `initData` verification on every protected route.
- Existing checks that already cover it: `src/features/StartScreen.test.tsx`, `src/features/statistics/statistics-panel.test.tsx`, `supabase/tests/migration-contracts.test.ts`, `api/_lib/api-stack.test.ts`.

## Open decisions

- None.

## Verification

- `npm test -- src/features/StartScreen.test.tsx api/intake-summary.test.ts src/i18n` → A1, A3 (UI), A4, A5, A6, A7
- `npm run test:db:pglite` → A2, A3 (SQL); CI also runs pgTAP
- `make check`
- Manual (local fixtures, `make dev` after checking ports 3000/3001 and `.env.local`): open the app as a user without a profile. With the seed's response count, check that the line shows the real number. With an empty database, check that no line is shown. → A1, A3

## Handoff

| Scenario | Evidence (command, test assertion, or manual check) | Result |
| --- | --- | --- |
| A1 | `npm test -- src/features/StartScreen.test.tsx` → `shows the real response count outside the sample card, above the start button`: `getIntakeSummary` mocked to `{ intakeYear: 2026, responseCount: 312 }`; asserts the line reads `312 odpowiedzi w naborze 2026` (pl), the line is not inside the sample card, card → line → start button document order, and one call. `npm test -- src/i18n` → `src/i18n/response-count.test.ts` asserts the ru text `312 ответов за набор 2026`. | pass |
| A2 | `npm run test:db:pglite` → `supabase/tests/intake_summary.sql` (6/6): `suspicious responses and other intake years are excluded` (3 suspicious 2026 rows + 4 valid 2025 rows leave the count at 10) and `the landing count equals totalValidResponses for the same data` (`get_intake_summary()` = `get_current_statistics(h, 2026)->>'totalValidResponses'`). | pass |
| A3 | `npm run test:db:pglite` → `supabase/tests/intake_summary.sql`: `a count below the cohort floor is suppressed instead of disclosed` (9 valid rows → `responseCount` null) and `the count is disclosed at the cohort floor` (10 rows → 10). `npm test -- src/features/StartScreen.test.tsx` → `renders no count line when the intake is below the cohort floor` (`responseCount: null` → no count element) and `npm test -- api/intake-summary.test.ts` → `passes a count suppressed by the cohort floor through as null`, `never forwards a count below the cohort floor` (a 9-count payload becomes a 500, so it can never reach the UI). | pass |
| A4 | `npm test -- src/features/StartScreen.test.tsx` → `renders no count line and keeps the start button usable while the request is pending` and `renders no count line and no error when the request fails`: no count element, no `alert`, button enabled, `onStart` called once on click. Invalid payload / 5xx: `npm test -- api/intake-summary.test.ts` → `turns an RPC failure into a generic 500` and `never forwards a count below the cohort floor` (schema-validated response); the client rejects on those, so the UI takes the same no-line path. | pass |
| A5 | `npm test -- api/intake-summary.test.ts` → `rejects a method other than POST with 405 and never calls the RPC` (`Allow: POST`), `rejects a cross-origin request with 403 and never calls the RPC` (real `assertSameOrigin`, `INVALID_ORIGIN`), `rejects a missing Telegram identity with 401 and never calls the RPC` (real `requireTelegramIdentity`, `UNAUTHORIZED`); each asserts `rpc` was not called. | pass |
| A6 | `grep -rn previewLive src` → no matches. `npm test -- src/i18n` → `locales.test.ts` key parity/arity for all five locales. `npm test -- src/features/StartScreen.test.tsx` → `no longer prints the hard-coded "48 responses this week" figure` (`/48/` and `w tym tygodniu` absent). | pass |
| A7 | `npm test -- src/i18n` → `src/i18n/response-count.test.ts`: ru `1 ответ` / `3 ответа` / `25 ответов`, uk `1 відповідь` / `3 відповіді` / `25 відповідей`, be `1 адказ` / `3 адказы` / `25 адказаў`, pl `1 odpowiedź` / `3 odpowiedzi` / `25 odpowiedzi`, en `1 response` / `312 responses`. | pass |

- Changed files:
  - `supabase/migrations/202611270001_intake_summary.sql` (new): `get_intake_summary()` returns `{ intakeYear, responseCount }` for `active_intake_year()`, counting valid responses across tracks and returning `null` below `public.min_cohort_size()`; service-role only.
  - `supabase/tests/intake_summary.sql` (new) and `supabase/tests/test-files.mjs` (registered in both pgTAP runners).
  - `shared/contracts.ts`, `shared/validation.ts`: `IntakeSummaryResult`, `intakeSummaryResultSchema` (count must be `null` or ≥ `MIN_COHORT_SIZE`), `intakeSummaryRequestSchema`.
  - `api/intake-summary.ts` (new) + `api/intake-summary.test.ts` (new): same-origin, verified identity, RPC, schema parse, generic errors.
  - `src/lib/api-client.ts`: `getIntakeSummary()`.
  - `src/features/StartScreen.tsx` (+ `src/features/StartScreen.test.tsx`): one fetch on mount, line below the sample card and above the start button, nothing rendered while pending/failed/suppressed.
  - `src/components/ResultPreviewCard.tsx`: removed the hard-coded `start.previewLive` footer.
  - `src/i18n/{pl,en,ru,uk,be}.ts`: removed `start.previewLive`, added pluralised `start.responseCount(count, year)`; `src/i18n/response-count.test.ts` (new).
  - `scripts/local-api-server.ts`: registered `POST /api/intake-summary` so the local dev stack serves the endpoint (needed for the manual check; one route line next to `/api/statistics`).
  - `docs/architecture.md` (API table row + `2026-11-27` changelog entry), `docs/product-flow.md` (Start bullet + one changelog line after the sample-ruler bullet).
- Checks not run, blockers, or open questions:
  - `make check` not run (the orchestrator runs it after the parallel wave).
  - Manual `make dev` check not run — requires the local dev stack (ports 3000/3001, `.env.local`); left to the orchestrator or a manual pass. `scripts/local-api-server.ts` now routes the endpoint.
  - Not verified locally: the PostgreSQL/pgTAP CI suite (`npm run test:db`); only PGlite ran here.
  - `src/pages/home-page.test.tsx` fails 3/10 in this working tree (`getByRole('button', { name: pl.form.submitUpdate })` not found). That file belongs to parallel task 004 and the failing flow is its removed confirm screen; it is not caused by this task (the start-screen tests and `src/bootstrap.test.tsx` pass).
  - Environment note: local Node is 22.8.0 while `package.json` requires `>=22.12.0`; typecheck and the focused suites ran on 22.8.0.
- LLM contributions: Opus 5.5 — specification; DeepSeek V4.1 Flash 1017 — implementation.
