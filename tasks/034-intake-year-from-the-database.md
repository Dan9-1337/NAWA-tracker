# 034 — Read the active intake year from the database everywhere

**Status:** In review

## Goal

Implement [ADR 0018](../docs/adr/0018-intake-year-from-the-database.md): `season_config.active_intake_year` becomes the
only source of the active intake year. Today the year also lives in `currentIntakeYear` (`shared/season.ts`), which the
client puts into saved surveys and the API uses in `api/responses.ts` (create and update checks),
`api/responses/current.ts` and `api/statistics.ts`. The rollover procedure asks for the constant and the row to be changed
together; after this task it is one database `update`.

Intended behavior:

1. **API.** Every handler that today uses `currentIntakeYear` reads the active year from the database instead. The
   internal `public.active_intake_year()` is revoked from `service_role` (`202611210001_cohort_ladder.sql`), so a new
   migration exposes it to the API (for example a `get_active_intake_year()` RPC granted to `service_role` only), or the
   year comes back from an RPC the handler already calls. Choose one, keep it consistent across handlers, and document it.
   A save whose `intakeYear` differs from the active year is rejected with `INVALID_INTAKE_YEAR`, as today.
2. **Client.** The client gets the year from the server, never from `currentIntakeYear`: for a new survey and an edit the
   draft's `intakeYear` is the year the server reported. `GET /api/intake-summary` already returns `intakeYear` and is
   called on the start screen; a returning user's current response carries its own `intakeYear`. Use these or add the
   year to an existing response; do not add a new endpoint unless neither works. The save must not go out before the
   year is known (the wizard can only be finished after the start screen has loaded).
3. **Season copy.** `StatisticsPanel` (and any other place using `season2026` for the active season) looks up the
   calendar in `seasons` by the server's year. If the year has no entry with dates, the copy falls back to the existing
   "intake closed" text with the year and no dates.
4. `currentIntakeYear` is removed, or kept only for code that has no server (fixtures, tests) with a comment saying so.
   No API handler or production client path imports it.
5. `docs/architecture.md` "Season rollover" is updated: step 3 becomes a single `update public.season_config set
   active_intake_year = <year>`; add a changelog entry for the migration as AGENTS.md requires.

## Context

- Relevant code and docs: `shared/season.ts`, `api/responses.ts`, `api/responses/current.ts`, `api/statistics.ts`,
  `api/intake-summary.ts`, `src/features/ResponseWizardSteps.tsx` (draft `intakeYear`), `src/features/statistics/StatisticsPanel.tsx`,
  `src/lib/api-client.ts`, `scripts/local-api-server.ts` and local fixtures, `supabase/migrations/202611210001_cohort_ladder.sql`
  (`season_config`, `active_intake_year()`), `supabase/migrations/202611270001_intake_summary.sql`, `docs/architecture.md`
  ("Season rollover").
- ADRs this task follows: [0018](../docs/adr/0018-intake-year-from-the-database.md). Replaces none.
- Dependencies and decisions already made: decided by the maintainer 2026-11-26 (ADR 0018). The reminder cron keeps
  deriving its phases from `seasons`; it is not part of this task unless it reads `currentIntakeYear`.

## Scope

- In scope: API handlers, one new migration if needed with its pgTAP/PGlite tests, the client's source of the year, the
  season copy lookup, docs.
- Out of scope: adding the 2027 dates, changing `season_config` contents, the reminder schedule, any rollover itself.
- Files or directories assigned to this task: `shared/season.ts`, `shared/contracts.ts` and `shared/validation.ts` (only if a
  response gains the year), `api/responses.ts`, `api/responses/current.ts`, `api/statistics.ts`, `api/_lib/`,
  `src/features/ResponseWizardSteps.tsx`, `src/features/statistics/StatisticsPanel.tsx`, `src/lib/api-client.ts`,
  `src/pages/HomePage.tsx` and `src/features/CreateProfileFlow.tsx` (only to pass the year), `scripts/local-api-server.ts`,
  a new file in `supabase/migrations/`, `supabase/tests/`, related tests, `docs/architecture.md`. Added by the task author
  after the first run (2026-11-26): `src/features/ProfileDashboard.tsx` (only to pass the survey's `intakeYear` to
  `toResponseInput` for an edit), `shared/university-search/search.test.ts` (only the `toResponseInput` call), and
  `docs/product-flow.md` (only to drop the mention of `currentIntakeYear`).

## Acceptance scenarios

| ID | Given / when | Expected result | Planned verification |
| --- | --- | --- | --- |
| A1 | The database's active year is 2027 (test fixture), the code unchanged | `POST /api/responses` with `intakeYear: 2027` is accepted; with 2026 it is rejected with `INVALID_INTAKE_YEAR` | API handler tests with a fake client returning 2027 |
| A2 | Same | `current` and `statistics` handlers query with 2027 | API handler tests (assert the RPC argument) |
| A3 | Active year 2026 (today's data) | Behavior is identical to today for create, edit, current, statistics | Existing API and page tests pass unchanged in meaning |
| A4 | `src/pages/home-page.test.tsx`: "saves a new survey with the intake year the server reported" (`getIntakeSummary` -> 2027, `createResponse` receives `intakeYear: 2027`) and "never sends a save before the year is known" (failed lookup -> save error shown, no `createResponse`; retry fetches 2027 and saves). Edit path: `src/features/ProfileDashboard.test.tsx` "saves an edit with the intake year of the saved survey" (survey with `intakeYear: 2027` -> `onSubmit` receives `intakeYear: 2027`) | Pass |
| A5 | The server reports 2027, which has no dates in `seasons` | The statistics panel shows the "intake closed" text for 2027 without dates and does not crash | `StatisticsPanel` test |
| A6 | Codebase search | No file under `api/` or production code under `src/` imports `currentIntakeYear` | `grep -rn currentIntakeYear api src` in the handoff |
| A7 | New migration | The API can read the active year with the service role; `anon` and `authenticated` cannot | `npm run test:db:pglite` (new assertions) |
| A8 | Docs | "Season rollover" describes one `update` for the year; the architecture changelog lists the migration | Reviewer read |

## Must stay unchanged

- Behavior, contracts, or user-facing copy this task must not alter: one survey per account and intake year; the
  `INVALID_INTAKE_YEAR` code and status; statistics scoping and disclosure; the season copy for 2026; the reminder cron.
- Existing checks that already cover it: `api/responses.test.ts`, `api/intake-summary.test.ts`, `src/pages/home-page.test.tsx`,
  `shared/season.test.ts`, the PGlite and pgTAP suites.

## Open decisions

- None. The mechanism (new RPC or year returned with an existing query) is the implementation agent's choice within the
  rules above.

## Verification

- `npm test -- api shared/season src/features/statistics src/pages` → A1–A5
- `npm run test:db:pglite` → A7
- `make check`
- `grep -rn currentIntakeYear api src` → A6
- Reviewer reads the docs diff → A8

## Handoff

| Scenario | Evidence (command, test assertion, or manual check) | Result |
| --- | --- | --- |
| A1 | `api/responses.test.ts`: "accepts the year the database holds..." (fake client answers `get_active_intake_year` with 2027; POST with 2027 -> 201 and `p_intake_year: 2027`), "rejects a create for a year other than the active one" (2026 -> 400 `INVALID_INTAKE_YEAR`, no create RPC), and the PUT test "checks an edit against the year the database holds". `npx vitest run api` 149 passed | Pass |
| A2 | `api/responses.test.ts`: "queries the year the database holds" (`get_current_response` called with `p_intake_year: 2027`) and "scopes statistics to the year the database holds" (`get_current_statistics` with `p_intake_year: 2027`) | Pass |
| A3 | Default fake year is 2026 and all existing create, edit, current and statistics tests keep their assertions (the fake now answers `get_active_intake_year`); `npm test` 67 files / 685 tests passed | Pass |
| A4 | `src/pages/home-page.test.tsx`: "saves a new survey with the intake year the server reported" (`getIntakeSummary` -> 2027, `createResponse` receives `intakeYear: 2027`) and "never sends a save before the year is known" (failed lookup -> save error shown, no `createResponse`; retry fetches 2027 and saves). New-survey path only; the edit path needs the blocked one-line change below | Pass (create); edit blocked |
| A5 | `src/features/statistics/statistics-panel.test.tsx`: profile with `intakeYear` 2027 (listed in `seasons` without dates) and 2031 (not listed) both show `seasonClosed(year)` and do not crash; 2026 label unchanged. `shared/season.test.ts` covers `seasonForYear` | Pass |
| A6 | `grep -rn currentIntakeYear api src shared scripts` prints nothing (constant removed from `shared/season.ts`) | Pass |
| A7 | `npm run test:db:pglite`: `supabase/tests/intake_summary.sql` 9 assertions (3 new: returns the active year, follows `update season_config set active_intake_year = 2027`, `anon`/`authenticated` cannot execute and `service_role` can); all other files pass | Pass |
| A8 | `docs/architecture.md`: "Season rollover" step 3 is a single `update public.season_config set active_intake_year = <year>`; changelog entry `2026-12-04` for migration `202612040001`; API table row for `/api/intake-summary` mentions the year | Ready for reviewer read |

**Mechanism chosen.** New RPC `public.get_active_intake_year()` (migration `202612040001_active_intake_year_rpc.sql`, security definer, granted to `service_role` only), read by `readActiveIntakeYear(client)` in `api/_lib/questionnaire.ts` and used by `api/responses.ts` (POST and PUT), `api/responses/current.ts` and `api/statistics.ts`. Why: the three handlers already hold an RPC client, one small stable read keeps the year in one place, and changing `get_current_response`, `get_current_statistics` and the two mutation RPCs to default their year would be a much larger migration. The client reads the year from `POST /api/intake-summary` (no new endpoint): `CreateProfileFlow` asks for it when it opens, `getIntakeSummary` shares one in-flight request with the start screen, and the save is built only after the year is known (a failed lookup is retried on the save button and shown as the existing save error). The season copy uses `profile.intakeYear` (the year of the saved response, which the server returns for the active year) with the new `seasonForYear(year)` in `shared/season.ts`.

**Scope extension (applied).** `toResponseInput(draft, intakeYear)` requires the year; the call sites were updated once the brief assigned them: `src/features/ProfileDashboard.tsx` (`toResponseInput(editDraft, current.intakeYear)`), `shared/university-search/search.test.ts` (second argument 2026) and `docs/product-flow.md` (the `currentIntakeYear` mention now points to ADR 0018).

- Changed files: `supabase/migrations/202612040001_active_intake_year_rpc.sql` (new), `supabase/tests/intake_summary.sql`, `api/_lib/questionnaire.ts`, `api/responses.ts`, `api/responses/current.ts`, `api/statistics.ts`, `api/responses.test.ts`, `shared/season.ts`, `shared/season.test.ts`, `src/lib/api-client.ts`, `src/features/ResponseWizardSteps.tsx`, `src/features/CreateProfileFlow.tsx`, `src/features/ProfileDashboard.tsx`, `src/features/ProfileDashboard.test.tsx`, `src/features/statistics/StatisticsPanel.tsx`, `src/features/statistics/statistics-panel.test.tsx`, `src/pages/home-page.test.tsx`, `shared/university-search/search.test.ts`, `docs/architecture.md`, `docs/product-flow.md`, this brief. `scripts/local-api-server.ts`, `shared/contracts.ts`, `shared/validation.ts` and `src/pages/HomePage.tsx` needed no change (the local server runs the real handlers against the local database, which needs the new migration applied).
- Checks not run, blockers, or open questions: `npm run typecheck`, `npm test` (67 files, 686 tests), `npm run test:db:pglite` and `make check` all pass. Not run: the PostgreSQL/pgTAP suite (no Docker) and any browser check. No open questions.
- LLM contributions: Opus 5.5 (Claude Code): specification and ADR 0018. Sonnet 5.5 (Claude Code subagent): implementation.
