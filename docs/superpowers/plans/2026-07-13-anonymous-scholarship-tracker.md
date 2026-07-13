# Anonymous Scholarship Tracker Implementation Plan

## Superseded Identity And Recovery Tasks

All UUID, `localStorage`, `anonymous_token_hash`, browser-supplied ownership, update-Turnstile, `SUPABASE_ANON_KEY`, `ANONYMOUS_TOKEN_SALT`, and old deployment instructions in this plan are historical and must not be executed. `2026-07-13-anonymous-recovery-session.md` and `../specs/2026-07-13-anonymous-recovery-session-design.md` supersede them with recovery credentials, HttpOnly cookie sessions, session-scoped APIs, and the approved environment. Unrelated questionnaire, statistics, privacy, and UI requirements remain active where they do not conflict with the focused recovery documents.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deployable Polish anonymous scholarship response tracker with secure submissions, updates, abuse controls, and privacy-safe statistics.

**Architecture:** A single Vite React SPA is hosted on Vercel alongside Node API handlers. The handlers validate requests, verify Turnstile, hash sensitive identifiers, and access Supabase exclusively through a service-role client and private transactional SQL functions.

**Tech Stack:** React, TypeScript, Vite, Tailwind CSS, Zod, Supabase PostgreSQL, Supabase JavaScript SDK, Cloudflare Turnstile, Vercel Node functions, Vitest, React Testing Library.

## Global Constraints (Conflicting Identity Bullets Superseded)

- No Supabase key may enter the browser bundle.
- All database access goes through Vercel API handlers.
- Both creates and updates require server-verified Turnstile tokens.
- UUIDs and IP addresses are HMAC-SHA256 hashed server-side.
- Raw IP addresses are never stored.
- Raw response tables use RLS with no public policies.
- Suspicious responses are excluded from statistics.
- Detailed group statistics require at least 10 valid responses.
- All user-facing text lives in `src/i18n/pl.ts`.
- No authentication, admin panel, WebSockets, queues, background jobs, or predictive model.
- Do not commit changes unless explicitly requested.

---

## Target Structure

```text
api/
  _lib/
    env.ts
    errors.ts
    hashing.ts
    http.ts
    supabase-admin.ts
    turnstile.ts
  responses/
    current.ts
  responses.ts
  statistics.ts

src/
  components/
    FieldError.tsx
    FormSection.tsx
    PrivacyNotice.tsx
    TurnstileWidget.tsx
  data/
    study-fields.json
  features/
    response-form/
      ResponseForm.tsx
      response-form.test.tsx
      useResponseForm.ts
    statistics/
      StatisticsPanel.tsx
      statistics-panel.test.tsx
  i18n/
    pl.ts
  lib/
    anonymous-token.ts
    api-client.ts
    grade.ts
  pages/
    HomePage.tsx
    home-page.test.tsx
  types/
    response.ts
  App.tsx
  index.css
  main.tsx

shared/
  contracts.ts
  validation.ts
  validation.test.ts

supabase/
  migrations/
    202607130001_initial_schema.sql
  tests/
    responses.sql
    statistics.sql

.env.example
README.md
package.json
tailwind.config.ts
tsconfig.json
tsconfig.node.json
vercel.json
vite.config.ts
vitest.config.ts
```

## Task 1: Scaffold The Application And Shared Contracts

**Produces:**

```ts
type ResponseFormInput = {
  scholarshipTrack: ScholarshipTrack
  studyRoute: StudyRoute
  studyType: StudyType
  country: string
  gradeScale: 5 | 10 | 12 | 20 | 100 | 'custom'
  customGradeScale?: number
  gradeValue: number
  university: string
  studyField: string
  choicePriority: ChoicePriority
  applicationStatus: ApplicationStatus
  decisionDate?: string | null
}

type ScholarshipTrack = 'nawa_mnisw' | 'minister_health' | 'minister_culture'
type StudyRoute = 'preparatory_course' | 'direct_studies'
type StudyType = 'first_cycle' | 'uniform_masters'

type StatisticsResult = {
  detailsAvailable: boolean
  group: ComparisonGroup | null
  totalValidResponses: number
  sameTrackCount: number
  sameUniversityCount: number
  sameUniversityAndFieldCount: number
  groupResponseCount: number
  medianGradePercentage: number | null
  lowerGradePercentage: number | null
  waitingForDecisionCount: number | null
  positiveDecisionCount: number | null
  negativeDecisionCount: number | null
}
```

- [ ] Create Vite, TypeScript, React, Tailwind, Vitest, and Testing Library configuration.
- [ ] Add runtime dependencies: `react`, `react-dom`, `zod`, `@supabase/supabase-js`, and `@marsidev/react-turnstile`.
- [ ] Add development dependencies for Vite, Tailwind, PostCSS, TypeScript, Vitest, jsdom, React Testing Library, and Vercel types.
- [ ] Define domain enums, request bodies, response envelopes, and aggregate result types in `shared/contracts.ts`.
- [ ] Write failing validation tests for valid requests, unknown keys, invalid enums, text lengths, custom scale bounds, invalid grades, and decision dates.
- [ ] Run `npm test -- shared/validation.test.ts`; expect failures because schemas do not exist.
- [ ] Implement strict Zod schemas in `shared/validation.ts`.
- [ ] Ensure fixed scales allow values from zero through their maximum.
- [ ] Ensure custom scales require a maximum from 1 through 1000.
- [ ] Ensure `decisionDate` is rejected for non-final statuses.
- [ ] Run the validation tests and expect all tests to pass.
- [ ] Run `npm run typecheck` and correct all contract errors.

## Task 2: Create The Secure Database Migration

**Files:** `supabase/migrations/202607130001_initial_schema.sql`, `supabase/tests/*.sql`

- [ ] Write SQL tests that assert enum constraints, lengths, grade bounds, unique token hashes, RLS activation, and lack of public table privileges.
- [ ] Create `responses` with the requested columns, indexes, checks, and automatic `updated_at`.
- [ ] Create `submission_limits` containing only `ip_hash`, `response_fingerprint`, and `created_at`.
- [ ] Index `submission_limits(ip_hash, created_at)`.
- [ ] Enable RLS on both tables and create no public policies.
- [ ] Revoke all table privileges from `anon`, `authenticated`, and `public`.
- [ ] Add a private create function that:
  - acquires a transaction advisory lock derived from the IP hash
  - deletes limit records older than 24 hours
  - rejects a fourth create from that IP
  - rejects duplicate anonymous token hashes
  - detects repeated identical fingerprints
  - inserts the rate-limit event and response atomically
  - marks suspicious duplicate patterns
- [ ] Add a private update function that:
  - selects the token-owned response with `FOR UPDATE`
  - rejects unknown tokens
  - allows ordinary workflow updates
  - marks one positive-to-negative or negative-to-positive correction suspicious
  - keeps `is_suspicious` sticky
- [ ] Add a private current-response function returning only the token-owned form fields.
- [ ] Revoke function execution from public roles and grant it only to `service_role`.
- [ ] Run the SQL tests against a disposable Supabase project or local Supabase instance.
- [ ] Confirm direct `anon` table reads and function calls fail.

## Task 3: Implement Privacy-Safe Statistics

**Produces:**

```ts
get_response_statistics(
  scholarship_track text,
  study_route text,
  study_type text,
  university text,
  study_field text,
  grade_percentage numeric
) returns jsonb
```

- [ ] Seed SQL tests with suspicious and non-suspicious responses covering group sizes 9, 10, and larger.
- [ ] Test fallback from field to university, university to programme, and complete suppression below 10.
- [ ] Test that suspicious rows never affect counts, median, percentile, or fallback selection.
- [ ] Test percentile as `strictly_lower_count / selected_group_count * 100`.
- [ ] Test median using normalized `grade_percentage`.
- [ ] Test waiting counts include `submitted`, `under_review`, `documents_requested`, and `waiting_for_decision`.
- [ ] Implement the private aggregation function.
- [ ] Return `null` for detailed metrics when every candidate group has fewer than 10 valid rows.
- [ ] Return a structured group descriptor rather than pretranslated text.
- [ ] Grant execution only to `service_role`.
- [ ] Run SQL tests and verify that no raw row fields or timestamps appear in returned JSON.

## Task 4: Build Server-Only API Utilities

**Produces:**

```ts
hmacSha256(value: string, salt: string): string
verifyTurnstile(token: string, remoteIp?: string): Promise<void>
getClientIp(request: VercelRequest): string
sendApiError(response: VercelResponse, error: unknown): void
```

- [ ] Write tests for required environment variables and browser-safe error responses.
- [ ] Write deterministic HMAC tests and verify different salts produce different hashes.
- [ ] Write Turnstile tests for success, invalid token, hostname rejection, timeout, and malformed Cloudflare responses.
- [ ] Implement strict environment loading without `VITE_` server secrets.
- [ ] Create the Supabase service-role client only in `api/_lib/supabase-admin.ts`.
- [ ] Implement HMAC-SHA256 with Node’s `crypto.createHmac`.
- [ ] Parse Vercel forwarding headers without persisting or logging the raw IP.
- [ ] Verify Turnstile through Cloudflare’s `siteverify` endpoint.
- [ ] Pass the remote IP only to Cloudflare verification; never save it.
- [ ] Convert known failures into stable codes such as `VALIDATION_ERROR`, `TURNSTILE_FAILED`, `RATE_LIMITED`, `RESPONSE_NOT_FOUND`, and `SERVER_ERROR`.
- [ ] Run utility tests and `npm run typecheck`.

## Task 5: Implement Response API Endpoints (Identity Flow Superseded)

**Endpoints:**

```text
POST /api/responses
PUT  /api/responses
POST /api/responses/current
```

- [ ] Write handler tests with mocked Turnstile and Supabase RPC calls.
- [ ] Test method rejection with `405` and an `Allow` header.
- [ ] Test malformed JSON, missing UUID, invalid form data, and unknown properties.
- [ ] Test that create and update both verify Turnstile before database access.
- [ ] Test HMAC hashing of the anonymous UUID and IP with separate salts.
- [ ] Test server-side grade percentage calculation and normalized custom scale storage.
- [ ] Test that create invokes the transactional create RPC.
- [ ] Test that update invokes only the token-owned update RPC.
- [ ] Test current-response lookup returns only editable fields and never hashes, suspicious flags, IDs, or timestamps.
- [ ] Implement `POST /api/responses`.
- [ ] Implement `PUT /api/responses`.
- [ ] Implement `POST /api/responses/current`.
- [ ] Return fresh aggregate statistics after successful create and update.
- [ ] Reset non-final `decisionDate` to `null`.
- [ ] Avoid logging request bodies, UUIDs, IP addresses, hashes, or service-role errors containing row data.
- [ ] Run endpoint tests and type checking.

## Task 6: Implement The Statistics Endpoint

**Endpoint:** `POST /api/statistics`

- [ ] Write tests for invalid criteria, RPC failures, suppressed groups, and complete aggregate responses.
- [ ] Validate the request with the shared strict Zod schema.
- [ ] Normalize the submitted grade using the same server utility as response writes.
- [ ] Call only the private aggregation RPC.
- [ ] Validate the RPC result against the API response schema before returning it.
- [ ] Return no raw response records under any failure or success path.
- [ ] Run endpoint tests and type checking.

## Task 7: Build Anonymous Identity And API Client (Superseded)

- [ ] Write tests for creating one UUID, reusing it, and recovering when local storage contains an invalid value.
- [ ] Implement `getOrCreateAnonymousToken()` using `crypto.randomUUID()`.
- [ ] Keep the token under one documented local-storage key.
- [ ] Implement typed API methods:
  - `getCurrentResponse(token)`
  - `createResponse(token, turnstileToken, form)`
  - `updateResponse(token, turnstileToken, form)`
  - `getStatistics(form)`
- [ ] Parse every server response with shared Zod schemas.
- [ ] Map stable API error codes to translation keys instead of showing server details.
- [ ] Run client utility tests.

## Task 8: Build The Polish Form (Update-Turnstile Requirement Superseded)

- [ ] Add a small Polish university JSON list and a small common study-field JSON list.
- [ ] Create all Polish labels, descriptions, validation messages, status names, and accessibility text in `src/i18n/pl.ts`.
- [ ] Write component tests for required labels, all enum choices, custom scale behavior, custom autocomplete values, validation errors, and create/update button text.
- [ ] Build reusable field-error and form-section components.
- [ ] Build four form sections:
  - programme
  - education choice
  - grades
  - current application status
- [ ] Use datalists for suggestions while preserving arbitrary university and field input.
- [ ] Show the custom numeric maximum only when `gradeScale === "custom"`.
- [ ] Display the calculated percentage as informational text, but let the server recompute it.
- [ ] Show `decisionDate` only for positive and negative decisions.
- [ ] Integrate an accessible Turnstile widget for both create and update.
- [ ] Disable submission while processing and reset Turnstile after every failed or successful attempt.
- [ ] Run form tests.

## Task 9: Build Results And Revisit Flow (UUID Revisit Flow Superseded)

- [ ] Write tests for percentile wording, median display, decision counts, fallback group labels, and suppressed statistics.
- [ ] Build `StatisticsPanel` with simple responsive cards and no charts.
- [ ] Use the required main text: `Twój wynik jest wyższy niż wynik X% uczestników tej grupy.`
- [ ] Add explicit wording that results are community statistics, not scholarship probability.
- [ ] Write Home page tests for loading, initial create mode, prefilled update mode, submission success, update success, API failure, and current-response failure.
- [ ] On startup, obtain the UUID and call `/api/responses/current`.
- [ ] Treat `RESPONSE_NOT_FOUND` as create mode rather than a visible server error.
- [ ] Prefill owned response data and use `Zaktualizuj dane` when found.
- [ ] Fetch fresh statistics for a returning response.
- [ ] Refresh result cards after every successful create or update.
- [ ] Add the intro and privacy notice using only translated strings.
- [ ] Ensure the layout works at 320px width and desktop widths.
- [ ] Run Home page and statistics tests.

## Task 10: Configuration, Documentation, And Final Verification (Superseded)

- [ ] Historical `.env.example` proposal (superseded by the focused recovery plan and repository `.env.example`):

```env
VITE_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
TURNSTILE_ALLOWED_HOSTNAMES=localhost

SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

ANONYMOUS_TOKEN_SALT=
IP_HASH_SALT=
```

- [ ] Document that `SUPABASE_ANON_KEY` is not consumed by frontend code and may be omitted unless needed by deployment tooling.
- [ ] Configure Vercel rewrites only if Vite SPA fallback requires them without intercepting `/api/*`.
- [ ] Document local installation, environment variables, migration application, Turnstile test keys, and Vercel development.
- [ ] Document Supabase production setup and service-role secret handling.
- [ ] Document Vercel deployment and Turnstile hostname configuration.
- [ ] Document privacy and abuse-control limitations accurately without claiming perfect anonymity.
- [ ] Run `npm test`; expect the full suite to pass.
- [ ] Run `npm run typecheck`; expect no TypeScript diagnostics.
- [ ] Run `npm run build`; expect a successful production bundle.
- [ ] Search the generated frontend bundle for `SUPABASE_SERVICE_ROLE_KEY`, secret values, and server-only module names.
- [ ] Verify direct anonymous Supabase reads fail.
- [ ] Perform a manual create, revisit, update, rate-limit, and low-volume suppression test.
- [ ] Inspect API responses and logs to ensure no raw IP, anonymous UUID, token hash, or raw database response leaks.
