# Anonymous Scholarship Tracker Design

## Superseded Identity And Recovery Requirements

The anonymous UUID, `localStorage`, `anonymous_token_hash`, update-Turnstile, browser-supplied ownership, `SUPABASE_ANON_KEY`, and `ANONYMOUS_TOKEN_SALT` instructions in this document are historical and must not be implemented. They are superseded by `2026-07-13-anonymous-recovery-session-design.md` and `../plans/2026-07-13-anonymous-recovery-session.md`, which define one-time recovery credentials, HttpOnly cookie sessions, session-scoped APIs, and the current environment. The questionnaire, statistics, privacy, and single-page UI requirements that do not conflict with those focused documents remain active.

## Goal

Build a minimal anonymous web application where applicants to a Polish scholarship programme can compare their application data with other participants using aggregated statistics only. The product must not predict admission or scholarship probability.

## Context

The repository was empty when this design was prepared, so there were no existing codebase conventions to preserve. The approved runtime is a single Vite React SPA deployed with Vercel Node API handlers and Supabase PostgreSQL.

## Chosen Approach

Three approaches were considered:

1. Vercel API plus private PostgreSQL functions.
2. Vercel API with direct Supabase table queries.
3. Mostly PostgreSQL RPC logic.

The chosen approach is option 1.

Reasons:

- Keeps browser access simple and secure: the browser never accesses Supabase directly.
- Keeps request validation and product logic in TypeScript.
- Uses private SQL functions only where atomicity and privacy are important.
- Avoids a second backend deployment target.

## Architecture

The application will be a single Vite React SPA and a small set of Vercel Node API handlers in the same repository.

The browser will know only the Turnstile site key. No Supabase key is exposed to the frontend. All database access goes through the API.

Endpoints:

- `POST /api/responses` creates a response.
- `PUT /api/responses` updates the response owned by the anonymous token.
- `POST /api/responses/current` returns only the current response for the anonymous token.
- `POST /api/statistics` returns aggregates only.

Shared TypeScript modules define Zod schemas, domain enums, response types, and API contracts. Server-only modules verify Turnstile, derive HMAC-SHA256 hashes, create a service-role Supabase client, and call private SQL functions.

The SPA remains a single page with:

- intro
- segmented form
- result cards
- privacy notice

> **Superseded:** The historical startup flow below used a UUID in `localStorage`. The active flow removes recovery fragments immediately and resolves an HttpOnly cookie session as defined in the focused recovery design.

On startup, the client reads or creates a UUID in `localStorage` and calls the current-response endpoint to decide whether the form is in create mode or update mode.

## Anonymous Identity (Superseded)

- On first visit, generate a random identifier with `crypto.randomUUID()`.
- Store it only in `localStorage`.
- Send the raw UUID only to the server.
- The API hashes the UUID with HMAC-SHA256 using `ANONYMOUS_TOKEN_SALT`.
- Only the hash is stored in the database.
- One anonymous token hash maps to one active response.
- Re-submitting with the same token updates the existing response instead of creating a second response.

## Database Design (Identity Columns And Sessions Superseded)

The main table is `responses`:

```sql
create table responses (
  id uuid primary key default gen_random_uuid(),

  anonymous_token_hash text not null unique,

  scholarship_track text not null,
  study_route text not null,
  study_type text not null,

  country text not null,

  grade_scale numeric not null,
  grade_value numeric not null,
  grade_percentage numeric not null,

  university text not null,
  study_field text not null,
  choice_priority text not null,

  application_status text not null,
  decision_date date,

  is_suspicious boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Indexes are added for:

- `scholarship_track`
- `study_route`
- `study_type`
- `country`
- `university`
- `study_field`
- `application_status`
- `grade_percentage`

Constraints enforce:

- `scholarship_track`: `nawa_mnisw`, `minister_health`, or `minister_culture`
- `study_route`: `preparatory_course` or `direct_studies`
- `study_type`: `first_cycle` or `uniform_masters`
- allowed enum-like values for `choice_priority` and `application_status`
- `grade_percentage` between 0 and 100
- `country` maximum 100 characters
- `university` maximum 200 characters
- `study_field` maximum 200 characters

The rate-limit table is:

```sql
create table submission_limits (
  id uuid primary key default gen_random_uuid(),
  ip_hash text not null,
  response_fingerprint text,
  created_at timestamptz not null default now()
);
```

`response_fingerprint` is included to support simple suspicious-pattern detection without storing raw responses or raw IPs in a separate abuse table.

## Grade Handling

The UI supports fixed scales:

- `5`
- `10`
- `12`
- `20`
- `100`

and also `custom`.

For `custom`, the user supplies a numeric maximum scale value. The accepted range is `1..1000`.

At the API boundary, the request shape uses:

```ts
type GradeScaleInput = 5 | 10 | 12 | 20 | 100 | 'custom'
```

with an additional `customGradeScale` field when needed.

In the database, `grade_scale` stores the numeric maximum only. `grade_percentage` is always recomputed server-side as:

```text
grade_value / grade_scale * 100
```

The server never trusts a client-supplied percentage.

## Security Model

- The browser has no permission to read raw responses.
- Row Level Security is enabled on raw tables.
- No public read or write policies are created for `responses` or `submission_limits`.
- Table access is revoked from `anon`, `authenticated`, and `public` roles.
- Private SQL functions are also not executable by public roles.
- Only the server-side service-role client may call raw tables and private SQL functions.

No endpoint ever returns:

- anonymous token hashes
- raw response rows
- IP addresses
- exact per-row timestamps

## Turnstile And Abuse Controls (Identity And Update Rules Superseded)

> **Superseded:** Turnstile is required for create and restore. Cookie-authenticated updates do not use Turnstile.

The historical MVP required Turnstile for both creates and updates.

Rules:

- Every create request must include a Turnstile token.
- Every update request must also include a Turnstile token.
- Turnstile is verified server-side only.
- Raw IP addresses are never stored.
- The API may pass the IP transiently to Cloudflare verification only.
- The API stores only a salted HMAC hash of the IP for rate-limiting.

Rate limiting:

- Maximum 3 new responses per IP per 24 hours.
- Updates may occur more often, but still require Turnstile.
- Old `submission_limits` rows older than 24 hours are deleted during checks.

Suspicious patterns:

- repeated rapid submissions
- many identical responses from the same IP hash
- impossible or conflicting final decision changes
- repeated switching between final decisions

Suspicious responses are excluded from public statistics.

The `is_suspicious` flag is sticky once set.

## Response Create And Update Rules (Ownership Flow Superseded)

Create flow:

1. Validate request body with Zod.
2. Verify Turnstile server-side.
3. Hash anonymous UUID with `ANONYMOUS_TOKEN_SALT`.
4. Hash caller IP with `IP_HASH_SALT`.
5. Normalize grade scale and recompute `grade_percentage`.
6. Run a private transactional SQL function that checks rate limits and inserts atomically.
7. Return aggregate statistics only.

Update flow:

1. Validate request body with Zod.
2. Verify Turnstile server-side.
3. Hash anonymous UUID.
4. Find the owned response by token hash only.
5. Validate status transitions.
6. Recompute `grade_percentage` server-side.
7. Update the existing row.
8. Return aggregate statistics only.

Status-transition rule:

- ordinary transitions are allowed
- one correction between opposing final decisions is allowed
- switching between `positive_decision` and `negative_decision` marks the row suspicious
- suspicious rows remain excluded from public statistics

`decision_date` is accepted only for final statuses and is cleared for non-final statuses.

## Private SQL Functions

The design uses private PostgreSQL functions callable only by `service_role`.

Required functions:

- create response function with transactional rate-limit enforcement
- update response function with token ownership and suspicious transition logic
- current response function returning editable fields for one token only
- statistics function returning aggregate JSON only

The create function should:

- acquire an advisory lock derived from the IP hash
- delete stale `submission_limits` rows older than 24 hours
- count recent create attempts
- reject the fourth create in 24 hours
- reject duplicate anonymous token hashes
- insert the limit record and response atomically
- optionally mark suspicious duplicate patterns based on repeated fingerprints

The update function should:

- lock the owned response row with `FOR UPDATE`
- reject unknown tokens
- apply transition rules
- keep `is_suspicious` sticky

## Statistics Design

Public statistics are based only on non-suspicious responses.

Primary comparison groups are attempted in this order:

1. `scholarship_track + study_route + study_type + university + study_field`
2. `scholarship_track + study_route + study_type + university`
3. `scholarship_track + study_route + study_type`

Detailed statistics are returned only if the selected group has at least 10 valid responses.

If every group candidate has fewer than 10 valid responses:

- the API returns only safe top-level counts
- detailed percentile and median metrics are `null`
- the UI explains that there is not enough data yet

Returned aggregate fields:

- total number of valid responses
- number of participants in the same scholarship track
- number of participants in the same university
- number of participants in the same university and study field
- selected group count
- median grade percentage
- percentage of respondents with a lower grade
- number waiting for a decision
- number with positive decisions
- number with negative decisions
- a structured descriptor of the selected fallback group

Percentile wording in the UI:

```text
Twój wynik jest wyższy niż wynik X% uczestników tej grupy.
```

This is explicitly presented as a community statistic, not a scholarship probability.

Percentile definition:

- percentage of selected-group respondents with a strictly lower `grade_percentage`

Waiting-for-decision counts include:

- `submitted`
- `under_review`
- `documents_requested`
- `waiting_for_decision`

## Frontend Design

The UI is Polish-first and mobile-first.

Structure:

1. Intro section
2. Form section
3. Results section
4. Privacy notice

The form is split into logical sections:

- programme
- education choice
- grades
- current application status

Requirements:

- accessible labels for every field
- loading state
- success state
- validation error messages
- server error message
- no account requirement
- no charts in MVP

Autocomplete data starts from small local JSON files for universities and study fields. University uses suggestions only; study field uses suggestions but also allows custom text.

All user-facing strings live in `src/i18n/pl.ts` so Russian and English can be added later.

## API Contracts

Shared Zod schemas cover:

- create response request
- update response request
- current response request
- statistics request
- API success and error envelopes

Server-only utilities remain outside the frontend import graph.

Stable server error codes are used instead of leaking internal details.

Examples:

- `VALIDATION_ERROR`
- `TURNSTILE_FAILED`
- `RATE_LIMITED`
- `RESPONSE_NOT_FOUND`
- `SERVER_ERROR`

## Testing Strategy

Tests must cover:

- Zod validation boundaries
- custom and fixed scale normalization
- UUID creation and reuse
- Turnstile verification outcomes
- create/update endpoint method and error handling
- ownership by anonymous token hash
- rate limiting
- suspicious exclusion from statistics
- group fallback thresholds
- percentile and median calculations
- UI create mode and update mode
- result rendering and suppressed-data behavior

Verification commands at implementation time:

- `npm test`
- `npm run typecheck`
- `npm run build`

## Documentation And Deployment (Environment List Superseded)

Deliverables include:

- working React application
- Supabase SQL migrations
- secure API endpoints
- Turnstile integration
- anonymous token handling
- statistics calculation
- sample university and study field data
- `.env.example`
- README with local setup
- deployment instructions for Vercel and Supabase

Historical environment variables (superseded by the focused recovery design and `.env.example`):

```env
VITE_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=

SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

ANONYMOUS_TOKEN_SALT=
IP_HASH_SALT=
```

`SUPABASE_SERVICE_ROLE_KEY` must never be exposed to the frontend.

## Out Of Scope

Do not implement:

- user registration
- email authentication
- social login
- admin panel
- WebSockets
- push notifications
- SMS notifications
- predictive admission model
- AI-based scholarship prediction
- scraping university websites
- official NAWA integration
- a complete university database
- microservices
- Docker or Kubernetes unless required for local development

## Acceptance Criteria Mapping

The design satisfies these acceptance goals:

1. Anonymous response creation through the SPA and API.
2. Bot token verified server-side.
3. Invalid grades and invalid values rejected by shared validation and server recomputation.
4. One browser token cannot create multiple active responses.
5. The same user can update their response.
6. Raw responses cannot be read from the frontend.
7. Statistics exclude suspicious responses.
8. Statistics are hidden for groups smaller than 10.
9. Results show percentile, median, and decision counts when allowed.
10. Deployable on free Vercel and Supabase plans.
11. No authentication and no unnecessary infrastructure.
