# Anonymous Recovery And Session Design

## Status

This focused design supersedes the anonymous UUID, `localStorage` authentication, and update-Turnstile sections of `2026-07-13-anonymous-scholarship-tracker-design.md`. Existing questionnaire, statistics, privacy, and single-page UI requirements remain unchanged.

The repository currently contains a frontend prototype and shared validation, but no API routes, Supabase migrations, or persisted identity implementation. The new credential model can therefore be implemented without migrating legacy UUID-owned database records.

## Goal

Allow a person to create one anonymous questionnaire, retain access on the same browser through an HttpOnly cookie, save a recovery QR or code, restore access on another device, and update the questionnaire without registration, email, passwords, or an external authentication provider.

## Credential Model

The application uses two independent opaque credentials.

### Recovery Token

- Long-lived bearer secret used only to restore access or bootstrap a new device.
- Generated server-side with `crypto.randomBytes(32).toString("base64url")`.
- Contains at least 256 bits of entropy.
- Returned only after questionnaire creation or recovery-token rotation.
- Held temporarily in React memory while the one-time recovery card is visible.
- Never written to `localStorage`, `sessionStorage`, cookies, analytics, or logs.
- Stored in PostgreSQL only as HMAC-SHA256 using `RECOVERY_HMAC_SECRET`.
- Anyone possessing it can restore access and should be warned accordingly.

### Session Token

- Opaque bearer secret used for ordinary authenticated API requests.
- Generated server-side with `crypto.randomBytes(32).toString("base64url")`.
- Contains at least 256 bits of entropy.
- Stored in the browser only as an HttpOnly cookie.
- Never returned in an API JSON body.
- Stored in PostgreSQL only as HMAC-SHA256 using `SESSION_HMAC_SECRET`.

The HMAC secrets are separate. The old anonymous UUID and `anonymous_token_hash` model is removed entirely.

## Database Model

The initial `responses` migration includes:

```sql
recovery_token_hash text unique not null,
recovery_token_created_at timestamptz not null default now(),
recovery_token_rotated_at timestamptz
```

It does not include `anonymous_token_hash`.

Sessions are stored in:

```sql
create table anonymous_sessions (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references responses(id) on delete cascade,
  session_token_hash text unique not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
```

Indexes are created for `session_token_hash`, `response_id`, and `expires_at`. The unique constraint already creates an index for `session_token_hash`; the migration must not add a redundant second index.

Rate-limit records distinguish questionnaire creation from recovery attempts using `limit_type text not null check (limit_type in ('create', 'restore'))`. Only HMAC IP hashes, event category, optional non-secret response fingerprints, and timestamps are stored. Raw IP addresses are never persisted.

Creation remains limited to three attempts per IP hash in 24 hours. Recovery is limited to ten attempts per IP hash in 15 minutes. Turnstile is still required for both operations.

RLS is enabled on `responses`, `anonymous_sessions`, and rate-limit tables. No public policies are created. Table and private-function access is revoked from `public`, `anon`, and `authenticated`; only the server-side service-role client may access them.

## Server-Side Token Operations

Server utilities expose focused operations:

```ts
generateOpaqueToken(): string
hashRecoveryToken(token: string): string
hashSessionToken(token: string): string
hashIp(ip: string): string
```

Token validation accepts only canonical 43-character base64url values produced from 32 bytes. Raw credentials must not appear in logs, thrown error messages, analytics, monitoring metadata, or Supabase error details returned to clients.

## Session Cookie

The cookie name comes from `SESSION_COOKIE_NAME`, defaulting to `anonymous_session` only when explicitly supported by configuration validation.

Cookie attributes:

```text
HttpOnly
SameSite=Lax
Path=/
Max-Age=SESSION_MAX_AGE_DAYS * 86400
Secure in production
```

The default configured lifetime is 180 days. The database `expires_at` and cookie `Max-Age` use the same configured duration.

Cookie clearing uses the same name and path, an empty value, and `Max-Age=0`.

## Origin And CORS Policy

Every state-changing endpoint validates the `Origin` header against the origin parsed from `APP_PUBLIC_URL`. Missing or mismatched origins are rejected outside an explicitly controlled test environment. The API does not emit permissive CORS headers and does not accept cross-origin credentials.

Frontend API requests use same-origin URLs and `credentials: "same-origin"`.

## API Flows

### Create Questionnaire

`POST /api/responses` accepts questionnaire data and a Turnstile token. It does not accept a UUID, response ID, recovery token, or session token.

Flow:

1. Validate Origin and strict Zod request schema.
2. Verify Turnstile server-side.
3. HMAC-hash the caller IP and enforce the existing maximum-three-creates-per-24-hours rule.
4. Normalize and validate questionnaire data and recompute grade percentage server-side.
5. Generate independent recovery and session tokens.
6. HMAC-hash both tokens with their separate secrets.
7. Atomically insert the response, rate-limit event, and first session.
8. Set the raw session token only in the HttpOnly cookie.
9. Return the raw recovery token exactly once, its fragment URL, and statistics.

Response shape:

```json
{
  "created": true,
  "recoveryToken": "raw-base64url-token",
  "recoveryUrl": "https://app.example/#restore=raw-base64url-token",
  "statistics": {}
}
```

If the transaction or response creation fails, no session or partial response remains and no recovery token is returned.

### Restore Session

`POST /api/session/restore` accepts only:

```json
{
  "recoveryToken": "raw-base64url-token",
  "turnstileToken": "cloudflare-token"
}
```

Flow:

1. Validate Origin and strict request schema.
2. Verify Turnstile.
3. HMAC-hash the IP and enforce a maximum of ten recovery attempts in 15 minutes.
4. HMAC-hash the recovery token.
5. Find the response without revealing lookup success or failure.
6. Generate and hash a new session token.
7. Atomically insert the session when the recovery hash is valid.
8. Set the HttpOnly cookie.
9. Return only the questionnaire data owned by the restored response.

The private restore function records the rate-limit attempt and returns a generic invalid result instead of raising a database exception for an unknown recovery hash. This ensures failed lookups still consume an attempt and the rate-limit record is committed.

All invalid-token and lookup failures return the same status, code, and Polish message:

```text
Nie udało się odzyskać ankiety. Sprawdź kod i spróbuj ponownie.
```

The response timing should avoid deliberately different code paths for malformed-but-canonical and unknown tokens where practical. Rate-limit responses may use a distinct generic throttling error without mentioning token existence.

### Resolve Authenticated Session

For each authenticated endpoint:

1. Read the configured cookie.
2. Validate its canonical token format.
3. Hash it using `SESSION_HMAC_SECRET`.
4. Find a session where `revoked_at is null` and `expires_at > now()`.
5. Resolve `response_id` server-side.
6. Restrict all reads and writes to that response.

Expired sessions are ignored and may be deleted opportunistically. Internal IDs and hashes are never returned.

### Current Questionnaire

`POST /api/responses/current` accepts no identity body fields. It resolves the session cookie and returns only editable questionnaire fields. Missing, expired, revoked, or invalid sessions return `401`.

### Update Questionnaire

`PUT /api/responses` accepts questionnaire fields only. It validates Origin and authenticates through the session cookie. It does not require Turnstile and does not accept UUIDs, recovery tokens, session tokens, or response IDs. Existing questionnaire validation, grade recomputation, suspicious-transition rules, and aggregate refresh remain in force.

### Statistics

`POST /api/statistics` authenticates through the session cookie and calculates the percentile from the authenticated questionnaire. It does not accept a response ID or client-supplied ownership selector. Existing suppression and suspicious-response rules remain unchanged.

### Rotate Recovery Token

`POST /api/recovery/rotate` requires a valid session cookie and Origin.

Flow:

1. Resolve the authenticated response.
2. Generate and hash a new recovery token.
3. Atomically replace `recovery_token_hash` and set `recovery_token_rotated_at`.
4. Return the raw token and new fragment URL exactly once.

The old recovery token stops working immediately. Existing valid sessions on all devices remain valid. The UI warns that the previous QR code will no longer work.

### Logout

`POST /api/session/logout` validates Origin, resolves the current cookie when possible, marks that session revoked, and clears the cookie. It is idempotent: an absent or invalid session still results in a cleared cookie and successful logout response. The questionnaire and other device sessions are unchanged.

## Private PostgreSQL Functions

Private service-role-only functions provide transaction boundaries for:

- create response plus first session and create-limit event
- restore lookup plus new session and restore-limit event
- authenticated session resolution
- update of the authenticated response
- recovery-token rotation
- current-session revocation
- privacy-safe statistics

Functions return only the minimum data required by the server. Raw hashes and internal session records are not forwarded to the browser.

## Recovery UI

After creation or rotation, the SPA replaces the form/results view with a one-time recovery card containing:

- QR code generated with the small `qrcode` library
- copyable recovery code
- copy button
- download or print button
- confirmation control labeled `Zapisałem kod dostępu`
- rotation-specific warning when applicable

Required warning:

```text
Zapisz ten kod lub wykonaj zrzut ekranu. Jest to jedyny sposób odzyskania ankiety na innym urządzeniu. Każda osoba posiadająca ten kod może uzyskać dostęp do Twojej ankiety.
```

The QR payload contains only:

```text
APP_PUBLIC_URL/#restore=RECOVERY_TOKEN
```

It contains no response ID, questionnaire data, country, university, grade, or personal information.

Confirmation clears the recovery token, URL, and generated QR data from React state. The application cannot show the same credential again. A new credential requires rotation.

An authenticated access-management section provides:

- `Wygeneruj nowy kod dostępu`
- a warning that the previous QR stops working
- logout

## Startup And Fragment Restore

Startup order:

1. Inspect `window.location.hash` for an exact `restore` fragment.
2. Copy a canonical token into memory only.
3. Immediately remove the fragment with `history.replaceState` before API work or analytics initialization.
4. Complete an automatically executed Turnstile challenge.
5. Send the in-memory token and Turnstile result to `/api/session/restore`.
6. Clear the in-memory recovery token after success or failure.
7. On success, rely only on the HttpOnly cookie and load update mode.
8. Without a fragment, call `/api/responses/current`.
9. A `401` current response displays the create form.

The SPA also offers a manual `Mam kod dostępu` flow for a copied recovery code. Manual input remains in component memory only and is cleared after the attempt.

No authentication value is generated or stored in `localStorage` or `sessionStorage`.

## Error Handling

API responses use stable error codes and generic messages. Authentication failures use `401`; Origin failures use `403`; invalid bodies use `400`; rate limits use `429`; unexpected failures use `500` without internal details.

Recovery lookup failures never reveal whether a token exists. Server logs must use request-level metadata only and exclude bodies, cookies, credential fragments, token hashes, Supabase row payloads, and raw IP addresses.

## Translation And Privacy Copy

All recovery, session, error, warning, confirmation, rotation, and logout strings live in `src/i18n/pl.ts`.

The privacy notice is updated to explain:

- no names or contact details are collected
- the browser uses an HttpOnly session cookie to retain access
- a recovery credential is shown once and should be protected like a password
- technical data is processed temporarily for abuse prevention
- raw credentials and raw IP addresses are not stored
- the service does not claim perfect anonymity

It no longer claims that a random identifier is stored in browser local storage.

## Testing Strategy

### Shared And Server Unit Tests

- token generation decodes to exactly 32 random bytes
- token parser rejects short, padded, malformed, and non-canonical values
- recovery, session, and IP values use separate HMAC secrets
- cookie serialization includes HttpOnly, SameSite=Lax, Path, configured Max-Age, and production Secure
- cookie clearing matches name and path
- Origin validation accepts only the configured same origin
- Turnstile is required for create and restore only
- API errors and logs do not contain raw tokens

### API Tests

- create atomically inserts response and session, sets the cookie, and returns recovery data once
- current/update/statistics require a valid non-expired, non-revoked session
- request bodies containing identity selectors are rejected by strict schemas
- restore uses a generic error for canonical unknown tokens
- restore rate limiting is independent of create rate limiting
- rotation invalidates the old recovery token and keeps existing sessions valid
- logout revokes only the current session and clears the cookie
- invalid Origin is rejected for every state-changing endpoint

### Database Tests

- RLS and privilege revocations cover all raw tables and private functions
- raw recovery and session tokens are never stored
- create and restore operations are atomic under concurrent requests
- expired and revoked sessions cannot resolve a response
- old recovery hashes cannot restore after rotation
- suspicious responses remain excluded from statistics
- statistics remain suppressed below the minimum group size

### Frontend Tests

- startup removes a restore fragment before making the restore request
- recovery credentials never enter local or session storage
- create response displays the one-time recovery card
- confirmation clears raw recovery state and shows normal results
- QR payload contains only the fragment recovery URL
- copy and download/print controls work
- refresh on the same browser loads through the cookie
- invalid restore shows the generic Polish message
- manual code restoration works without persistence
- update mode does not require Turnstile
- rotation shows a new one-time recovery card
- logout returns to create mode
- existing questionnaire and statistics behavior remains functional

## Environment Variables

```env
VITE_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=

SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

IP_HASH_SALT=
SESSION_HMAC_SECRET=
RECOVERY_HMAC_SECRET=
SESSION_COOKIE_NAME=anonymous_session
SESSION_MAX_AGE_DAYS=180
APP_PUBLIC_URL=
```

All variables except `VITE_TURNSTILE_SITE_KEY` are server-only. `SUPABASE_ANON_KEY` is not needed because the frontend never accesses Supabase.

## Out Of Scope

- email, phone, username, or password accounts
- OAuth or Supabase Auth
- account merging
- administrator access
- session-management dashboard
- remote logout of individual devices
- WebSockets, queues, microservices, or background jobs

## Acceptance Criteria

1. Creation sets an HttpOnly session cookie.
2. Recovery credentials appear only after creation or rotation.
3. Recovery credentials are never stored in browser storage.
4. Refresh retains access through a valid cookie.
5. A QR or copied credential can restore access on another device.
6. Recovery fragments disappear from the address bar immediately.
7. Invalid recovery tokens do not disclose account existence.
8. Updates require a valid session and accept no client identity selector.
9. Raw credentials are never stored in PostgreSQL.
10. Rotation invalidates the previous recovery credential while preserving active sessions.
11. Logout revokes the current session and leaves the questionnaire unchanged.
12. The application continues without registration, external auth, or additional infrastructure.
