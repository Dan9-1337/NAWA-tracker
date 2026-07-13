# Final Review Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve every final-review blocker and finding with focused red-green tests and release verification.

**Architecture:** Keep credential serialization inside PostgreSQL, keep browser session reconciliation in `HomePage`, and preserve shared questionnaire contracts as the single TypeScript source of truth. Static deployment policy remains in `vercel.json`, while local suggestions remain inert JSON data consumed through datalists.

**Tech Stack:** PostgreSQL/pgTAP, Node `pg`, React 18, TypeScript, Zod, Vitest, Vite, Vercel configuration.

## Global Constraints

- Write each reproduction before its implementation and observe the expected failure.
- Use a nonblocking per-response PostgreSQL advisory transaction lock for restore and recovery rotation.
- Sequential restore/rotation operations must remain valid.
- Do not migrate legacy enum values because no deployed legacy data exists.
- Preserve custom university and study-field values.
- Never log credentials or secret values.
- Do not commit.

---

### Task 1: Linearizable Credential Rotation

**Files:**
- Modify: `supabase/tests/concurrent-rate-limits.mjs`
- Modify: `supabase/tests/recovery_sessions.sql`
- Modify: `supabase/migrations/202607130001_initial_schema.sql`
- Modify: `package.json`

**Interfaces:**
- Consumes: `restore_anonymous_session(text, text, timestamptz, text)` and `rotate_recovery_token(text, text)`.
- Produces: both RPCs acquire the same `pg_try_advisory_xact_lock` key derived from the response UUID and return their existing false result when the lock is busy.

- [ ] Add SQL-client concurrency cases proving restore versus rotate and rotate versus rotate cannot both succeed while one transaction holds the response lock.
- [ ] Add pgTAP cases proving sequential rotate/restore invariants continue to work.
- [ ] Run `npm run test:db` and confirm the new cases fail for concurrent success before SQL changes.
- [ ] Add the shared nonblocking response lock to both RPCs after resolving and row-locking the response.
- [ ] Run `npm run test:db` and confirm all database cases pass, or record missing `DATABASE_URL`/PostgreSQL tooling as an environmental gap.

### Task 2: Form Decision-Date State

**Files:**
- Modify: `src/features/response-form/response-form.test.tsx`
- Modify: `src/features/response-form/ResponseForm.tsx`

**Interfaces:**
- Produces: changing `applicationStatus` to a non-final status atomically sets `decisionDate` to `null` in component state and `onDraftChange` output.

- [ ] Add a UI test selecting a final status/date and then a non-final status, asserting the date disappears and the emitted draft is cleared.
- [ ] Run the focused test and observe the stale `decisionDate` failure.
- [ ] Update the status transition as one state operation.
- [ ] Re-run the focused test and response-form suite.

### Task 3: Restore-to-Session Reconciliation

**Files:**
- Modify: `src/pages/home-page.test.tsx`
- Modify: `src/pages/HomePage.tsx`

**Interfaces:**
- Consumes: `getCurrentResponse()`.
- Produces: one serialized reconciliation transition used after restore failure and cancellation; valid cookie sessions become authenticated, only 401 becomes create, and other errors remain retryable.

- [ ] Add tests for failed fragment restore with an existing session and cancellation with an existing session.
- [ ] Run focused tests and observe create/restore mode without current-session lookup.
- [ ] Route restore settlement and cancellation through a serialized current-session check.
- [ ] Re-run focused home-page and bootstrap/recovery tests.

### Task 4: Secret Domain Separation

**Files:**
- Modify: `api/_lib/security.test.ts`
- Modify: `api/_lib/env.ts`

**Interfaces:**
- Produces: `loadServerEnv` rejects any equality among `SESSION_HMAC_SECRET`, `RECOVERY_HMAC_SECRET`, and `IP_HASH_SALT` with the existing generic error.

- [ ] Add pairwise-equality startup rejection cases.
- [ ] Run the focused environment tests and observe acceptance.
- [ ] Add one schema-level pairwise-distinct refinement.
- [ ] Re-run the focused security tests.

### Task 5: Browser Security Headers

**Files:**
- Create: `vercel-config.test.ts`
- Modify: `vercel.json`
- Modify: `README.md`

**Interfaces:**
- Produces: Vercel serves CSP allowing same-origin Vite assets and Cloudflare Turnstile, `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, strict referrer policy, and restrained permissions policy.

- [ ] Add static JSON assertions for every required policy and Turnstile host.
- [ ] Run the focused config test and observe missing headers.
- [ ] Add global Vercel response headers and deployment documentation.
- [ ] Re-run the config test and parse `vercel.json` through the build/static checks.

### Task 6: Local Suggestions

**Files:**
- Create: `shared/universities.ts`
- Create: `src/data/study-fields.json`
- Modify: `shared/validation.ts`
- Modify: `src/features/response-form/response-form.test.tsx`
- Modify: `src/features/response-form/ResponseForm.tsx`

**Interfaces:**
- Produces: the university input and server validation share a canonical allowlist; study-field suggestions remain custom-capable.

- [ ] Add tests for university allowlist enforcement, list associations, and custom study-field text.
- [ ] Run focused tests and observe absent datalists.
- [ ] Add a small shared university module, local study-field JSON, and render their options.
- [ ] Re-run focused tests and typecheck.

### Task 7: Questionnaire Scope Enums

**Files:**
- Modify: `shared/contracts.ts`
- Modify: `shared/validation.test.ts`
- Modify: `shared/api-contracts.test.ts`
- Modify: `src/features/response-form/ResponseForm.tsx`
- Modify: UI/API test fixtures using old values
- Modify: `src/i18n/pl.ts`
- Modify: `supabase/migrations/202607130001_initial_schema.sql`
- Modify: `supabase/tests/recovery_sessions.sql`
- Modify: `supabase/tests/statistics.sql`
- Modify: `supabase/tests/concurrent-rate-limits.mjs`
- Modify: `README.md`

**Interfaces:**
- Produces: `scholarship_track = nawa_mnisw|minister_health|minister_culture`, `study_route = preparatory_course|direct_studies`, and `study_type = first_cycle|uniform_masters` consistently in TypeScript, Zod, SQL, UI, tests, and docs.

- [ ] Add contract and static migration tests accepting only the required values and rejecting all former values.
- [ ] Run focused validation/migration tests and observe old-enum failures.
- [ ] Replace enum definitions, defaults, Polish labels, SQL constraints, fixtures, and docs without compatibility aliases.
- [ ] Re-run shared, API, UI, migration, and database suites.

### Task 8: Statistics Localization

**Files:**
- Modify: `src/features/statistics/statistics-panel.test.tsx`
- Modify: `src/features/statistics/StatisticsPanel.tsx`
- Modify: `src/i18n/pl.ts`

**Interfaces:**
- Produces: all user-facing StatisticsPanel copy from `pl.ts`, including exact percentile sentence `Twój wynik jest wyższy niż wynik X% uczestników tej grupy.`.

- [ ] Add exact-copy and static no-inline-copy tests.
- [ ] Run focused tests and observe the fragmented sentence and inline labels.
- [ ] Move remaining strings and expose a localized percentile formatter.
- [ ] Re-run focused statistics tests.

### Task 9: Release Verification and Report

**Files:**
- Create or append: `.superpowers/sdd/final-fixes-report.md`

**Interfaces:**
- Produces: final evidence by finding and explicit environmental gaps.

- [ ] Run `npm test`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run build`.
- [ ] Run database/static SQL/config checks.
- [ ] Append commands, outcomes, and remaining environmental gaps to the final-fixes report without secret values.
