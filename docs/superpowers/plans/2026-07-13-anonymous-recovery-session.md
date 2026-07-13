# Anonymous Recovery And Session Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace UUID/localStorage ownership with one-time recovery credentials and revocable HttpOnly-cookie sessions while wiring the existing questionnaire UI to secure persistence.

**Architecture:** Vercel Node handlers generate 32-byte opaque recovery and session tokens, store only separate HMAC-SHA256 hashes in Supabase, and authenticate normal requests with a database-backed HttpOnly cookie. Private PostgreSQL functions provide atomic create, restore, rotation, logout, and privacy-safe statistics operations; the React SPA keeps raw recovery credentials only in temporary component state.

**Tech Stack:** React 18, TypeScript 5, Vite 7, Tailwind CSS 3, Zod 3, Supabase PostgreSQL, Supabase JavaScript SDK, Vercel Node functions, Cloudflare Turnstile, `qrcode`, Vitest, React Testing Library.

## Global Constraints

- Recovery and session tokens contain at least 256 bits of entropy and use canonical base64url encoding.
- Raw credentials and raw IP addresses are never stored or logged.
- Recovery, session, and IP hashes use separate server-only secrets.
- No authentication data is stored in `localStorage` or `sessionStorage`.
- All database access goes through Vercel handlers and the service-role client.
- RLS is enabled with no public raw-table policies or public private-function grants.
- Create and restore require Turnstile; ordinary authenticated updates do not.
- State-changing endpoints validate `Origin` against `APP_PUBLIC_URL` and do not enable CORS.
- Existing questionnaire, suspicious-response, group-fallback, and minimum-10 statistics behavior remains intact.
- All user-visible copy remains in `src/i18n/pl.ts`.
- Do not introduce Supabase Auth, OAuth, email, passwords, queues, WebSockets, or microservices.
- Do not create git commits unless explicitly requested.

---

### Task 1: Replace Identity Contracts And Validation

**Files:**
- Modify: `shared/contracts.ts`
- Modify: `shared/validation.ts`
- Modify: `shared/validation.test.ts`
- Create: `shared/api-contracts.test.ts`

**Interfaces:**
- Produces: `CreateResponseRequest`, `UpdateResponseRequest`, `RestoreSessionRequest`, `RecoveryCredential`, `CurrentResponseResult`, `ApiError`, and runtime schemas for every API payload.
- Consumes: Existing `ResponseFormInput` and `StatisticsResult`.

- [ ] Add failing tests proving create accepts `{ response, turnstileToken }`, update accepts only `{ response }`, current/statistics/logout/rotate accept empty strict bodies, and restore accepts only canonical recovery and Turnstile tokens.
- [ ] Add failing tests proving UUIDs, response IDs, recovery tokens, and session tokens are rejected from authenticated request bodies.
- [ ] Add a failing test proving custom `gradeValue` cannot exceed `customGradeScale`.
- [ ] Run `npm test -- shared/validation.test.ts shared/api-contracts.test.ts` and confirm the new assertions fail.
- [ ] Replace UUID schemas with strict session-based request schemas and add strict success/error response schemas.
- [ ] Add canonical opaque-token validation with `/^[A-Za-z0-9_-]{43}$/`.
- [ ] Fix custom-scale grade bounds in `responseFormInputSchema`.
- [ ] Run the focused tests and `npm run typecheck`; expect success.

### Task 2: Add Database Schema, Session Functions, And Statistics

**Files:**
- Create: `supabase/migrations/202607130001_initial_schema.sql`
- Create: `supabase/tests/recovery_sessions.sql`
- Create: `supabase/tests/statistics.sql`

**Interfaces:**
- Produces RPCs: `create_response_with_session`, `restore_anonymous_session`, `resolve_anonymous_session`, `get_current_response`, `update_current_response`, `rotate_recovery_token`, `revoke_anonymous_session`, `get_current_statistics`.
- Consumes only HMAC hashes, normalized questionnaire values, session expiry, and rate-limit metadata from server handlers.

- [ ] Write SQL assertions for response constraints, recovery uniqueness, session expiry/revocation, RLS, privilege revocations, rate categories, and group suppression.
- [ ] Create `responses`, `anonymous_sessions`, and `submission_limits` with the approved fields, checks, indexes, and `updated_at` trigger.
- [ ] Implement atomic create with an advisory IP lock, stale-limit cleanup, three-per-24-hour create limit, response insert, and first-session insert.
- [ ] Implement restore so every attempt is recorded, ten-per-15-minute throttling is enforced, unknown hashes return a generic false result without rolling back the attempt, and valid hashes create a session.
- [ ] Implement session resolution requiring `revoked_at is null` and `expires_at > now()`.
- [ ] Implement current/update/rotation/logout functions scoped through the resolved response, preserving sticky suspicious status and leaving other sessions valid during rotation.
- [ ] Implement aggregate statistics with suspicious exclusion, required fallback order, strict-lower percentile, median percentage, and detailed metric suppression below 10.
- [ ] Enable RLS, create no public policies, revoke table/sequence/function privileges from `public`, `anon`, and `authenticated`, and grant required execution only to `service_role`.
- [ ] Run SQL tests against the configured Supabase database; expect all assertions to pass.

### Task 3: Build Server Security Utilities

**Files:**
- Create: `api/_lib/env.ts`
- Create: `api/_lib/tokens.ts`
- Create: `api/_lib/cookies.ts`
- Create: `api/_lib/origin.ts`
- Create: `api/_lib/http.ts`
- Create: `api/_lib/errors.ts`
- Create: `api/_lib/ip.ts`
- Create: `api/_lib/turnstile.ts`
- Create: `api/_lib/supabase-admin.ts`
- Create: `api/_lib/session.ts`
- Create: `api/_lib/security.test.ts`

**Interfaces:**
- Produces: `generateOpaqueToken()`, `hashRecoveryToken()`, `hashSessionToken()`, `hashIp()`, `setSessionCookie()`, `clearSessionCookie()`, `assertSameOrigin()`, `verifyTurnstile()`, `requireSession()`.

- [ ] Write failing tests that tokens decode to exactly 32 bytes, hashes differ by credential domain, and malformed canonical tokens are rejected.
- [ ] Write failing tests for development/production cookie flags, cookie clearing, exact-origin validation, generic errors, and expired/revoked session rejection.
- [ ] Run `npm test -- api/_lib/security.test.ts`; expect module-not-found failures.
- [ ] Implement strict server environment parsing for Supabase, Turnstile, HMAC, cookie, lifetime, IP salt, and public URL values.
- [ ] Implement cryptographic token generation and HMAC helpers with Node `crypto`.
- [ ] Implement cookie parsing/serialization without exposing session values to JSON.
- [ ] Implement same-origin enforcement with no permissive CORS response.
- [ ] Implement transient client-IP extraction, Turnstile verification, service-role client creation, normalized API errors, and session resolution.
- [ ] Run the focused test, typecheck, and verify no server secret is imported by `src/`.

### Task 4: Implement Response And Statistics APIs

**Files:**
- Create: `api/responses.ts`
- Create: `api/responses/current.ts`
- Create: `api/statistics.ts`
- Create: `api/responses.test.ts`

**Interfaces:**
- `POST /api/responses`: create, set cookie, return one-time recovery credential and statistics.
- `PUT /api/responses`: session-authenticated update without Turnstile.
- `POST /api/responses/current`: session-authenticated owned questionnaire.
- `POST /api/statistics`: session-authenticated aggregate statistics with no client identity selector.

- [ ] Write failing handler tests for allowed methods, strict schemas, Origin checks, Turnstile create-only behavior, server-side grade normalization, cookie issuance, 401 current/update/statistics, and response-field privacy.
- [ ] Run `npm test -- api/responses.test.ts`; expect failures because handlers do not exist.
- [ ] Implement method guards and shared JSON body parsing.
- [ ] Implement create with Origin, Turnstile, independent token generation/HMAC, IP HMAC, transactional RPC, session cookie, recovery fragment URL, and aggregate response.
- [ ] Implement update with Origin, session ownership, no Turnstile, grade recomputation, suspicious transition handling, and fresh statistics.
- [ ] Implement current and statistics using the authenticated response resolved from the cookie only.
- [ ] Validate outgoing RPC data with shared response schemas and strip all hashes/IDs/timestamps.
- [ ] Run handler tests and typecheck; expect success.

### Task 5: Implement Restore, Rotation, And Logout APIs

**Files:**
- Create: `api/session/restore.ts`
- Create: `api/session/logout.ts`
- Create: `api/recovery/rotate.ts`
- Create: `api/session/session-api.test.ts`

**Interfaces:**
- `POST /api/session/restore`: Turnstile and IP-limited recovery that creates a cookie session.
- `POST /api/recovery/rotate`: authenticated one-time replacement recovery credential.
- `POST /api/session/logout`: idempotent current-session revocation and cookie clearing.

- [ ] Write failing tests for generic invalid recovery responses, rate-limit propagation, cookie issuance, old-token rotation invalidation, retained sessions, and idempotent logout.
- [ ] Run `npm test -- api/session/session-api.test.ts`; expect failures because handlers do not exist.
- [ ] Implement restore with strict token validation, same-origin enforcement, Turnstile, hashed-IP limit, recovery HMAC, fresh session, generic lookup errors, and owned questionnaire return.
- [ ] Implement rotation with session ownership, new token/HMAC, atomic replacement, unchanged sessions, and a one-time fragment URL response.
- [ ] Implement logout to revoke only the presented session hash and always clear the cookie.
- [ ] Run focused API tests and typecheck; expect success.

### Task 6: Build Recovery UI And Typed API Client

**Files:**
- Add dependency: `qrcode` and `@types/qrcode`
- Create: `src/lib/api-client.ts`
- Create: `src/lib/recovery-fragment.ts`
- Create: `src/features/recovery/RecoveryCard.tsx`
- Create: `src/features/recovery/RestoreAccess.tsx`
- Create: `src/features/recovery/recovery.test.tsx`
- Modify: `src/i18n/pl.ts`
- Modify: `src/components/PrivacyNotice.tsx`

**Interfaces:**
- Produces typed same-origin client methods `createResponse`, `updateResponse`, `getCurrentResponse`, `getStatistics`, `restoreSession`, `rotateRecovery`, and `logoutSession`.
- Produces `takeRecoveryTokenFromFragment()` which removes the fragment synchronously and returns the token only in memory.

- [ ] Install `qrcode` and its TypeScript definitions.
- [ ] Write failing tests proving fragment removal occurs before restore, storage APIs are never used, QR content contains only the fragment URL, confirmation clears the credential, and generic restore errors are Polish.
- [ ] Run `npm test -- src/features/recovery/recovery.test.tsx`; expect failures because components do not exist.
- [ ] Implement a schema-validating API client using same-origin credentials.
- [ ] Implement exact fragment extraction and immediate `history.replaceState` cleanup.
- [ ] Implement the one-time recovery card with QR, copy, downloadable image/print action, required warning, confirmation, and memory clearing.
- [ ] Implement fragment and manual-code restore UI with Turnstile and no persistence.
- [ ] Add all strings to `pl.ts` and update privacy copy from local-storage UUID wording to cookie/recovery wording.
- [ ] Run focused tests and typecheck; expect success.

### Task 7: Wire Startup, Create, Update, Rotation, And Logout

**Files:**
- Modify: `src/features/response-form/ResponseForm.tsx`
- Modify: `src/components/TurnstileWidget.tsx`
- Modify: `src/pages/HomePage.tsx`
- Modify: `src/pages/home-page.test.tsx`
- Modify: `src/features/response-form/response-form.test.tsx`

**Interfaces:**
- Consumes the Task 6 API client and recovery components.
- Produces the complete SPA state machine: `loading`, `create`, `restore`, `recovery`, and `authenticated`.

- [ ] Write failing tests for startup fragment precedence, 401 create mode, cookie-backed update mode, create recovery screen, refresh, update without Turnstile, rotation, and logout.
- [ ] Run HomePage and form tests; confirm failures against demo-state behavior.
- [ ] Add `initialValue`, async submit, loading, server-error, and create-only Turnstile support to `ResponseForm`.
- [ ] Remove demo statistics and manual create/update mode toggling from `HomePage`.
- [ ] Implement startup fragment restore before current-session lookup.
- [ ] Wire real create/update/statistics responses, one-time credential confirmation, rotation, and logout.
- [ ] Ensure raw recovery state is cleared on confirmation, restore completion, errors, and unmount.
- [ ] Run all frontend tests and typecheck; expect success.

### Task 8: Configuration, Documentation, And Verification

**Files:**
- Create: `.env.example`
- Create: `README.md`
- Create: `vercel.json`
- Modify: `package.json`
- Modify: `docs/superpowers/specs/2026-07-13-anonymous-scholarship-tracker-design.md`
- Modify: `docs/superpowers/plans/2026-07-13-anonymous-scholarship-tracker.md`

**Interfaces:**
- Documents Supabase migration, Turnstile, local Vercel development, production deployment, cookie behavior, recovery limitations, and required secrets.

- [ ] Add the exact approved environment variables and explain that only `VITE_TURNSTILE_SITE_KEY` is frontend-visible.
- [ ] Document Supabase migration application, RLS verification, Vercel secret setup, `APP_PUBLIC_URL`, Turnstile domains, local testing, and deployment.
- [ ] Mark UUID/localStorage sections in the original design and plan as superseded by the focused recovery documents.
- [ ] Run `npm test`; expect every test to pass.
- [ ] Run `npm run typecheck`; expect no diagnostics.
- [ ] Run `npm run build`; expect a successful Vite production build.
- [ ] Search `dist/` for service-role keys, HMAC variable names, and server module code; expect no secret values or server implementation in the browser bundle.
- [ ] Inspect `git diff` to confirm no raw credential fixture, environment secret, or unrelated change was introduced.
