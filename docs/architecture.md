# NAWA Tracker Architecture

Living architecture document for the Telegram Mini App. Update this file (and the changelog) when product or security boundaries change.

## Current architecture

NAWA Tracker is a **Telegram Mini App only** scholarship questionnaire with privacy-safe community statistics. One Telegram account maps to one applicant profile.

| Layer | Technology | Role |
| --- | --- | --- |
| Client | Vite + React in Telegram WebView | Questionnaire, status updates, statistics panel |
| API | Vercel Functions (`api/`) | Auth, validation, Supabase RPC orchestration |
| Database | Supabase PostgreSQL | `responses` rows, aggregate statistics RPCs |
| Bot | Telegram Bot (BotFather) | Menu button / direct link into the Mini App |

Identity is **not anonymous**: each `responses` row stores `telegram_user_id` (unique). Optional `telegram_username` is stored for support only.

Authentication is **native Mini App**: every protected API call carries Telegram `initData`. The server verifies the HMAC using `TELEGRAM_BOT_TOKEN` and rejects expired payloads. There are no HttpOnly session cookies, recovery codes, or Cloudflare Turnstile challenges.

## System boundaries

```text
Telegram user
  → Bot / Menu Button
  → WebView loads APP_PUBLIC_URL (Vite SPA)
  → fetch /api/* with Authorization: tma <initData>
  → Vercel Function verifies initData + Origin
  → Supabase service_role RPC
  → PostgreSQL
```

The browser never receives `SUPABASE_SERVICE_ROLE_KEY` or talks to Supabase directly. RLS is enabled with zero policies; only `service_role` can access tables.

## API surface

| Route | Method | Auth | Purpose |
| --- | --- | --- | --- |
| `/api/responses` | POST | initData + Origin | Create profile (once per Telegram user) |
| `/api/responses` | PUT | initData + Origin | Update owned profile |
| `/api/responses/current` | POST | initData | Load owned profile |
| `/api/statistics` | POST | initData | Privacy-safe aggregates for owned profile |
| `/api/statistics/public` | POST | initData + Origin | Cohort preview from draft questionnaire values |

Removed from the anonymous POC: `/api/session/restore`, `/api/session/logout`, `/api/recovery/rotate`.

## Data model

### `responses`

Questionnaire fields plus:

- `telegram_user_id bigint not null unique` — primary identity
- `telegram_username text` — optional, non-unique
- `is_suspicious boolean` — sticky flag from implausible status transitions

### Statistics

`compute_country_statistics` compares declared grades (or NAWA orientation score for `nawa_director`) within scholarship track and ranking citizenship country. Detailed aggregates require k-anonymity: cohort size ≥ 10 non-suspicious responses; otherwise `detailsAvailable: false`.

### RPCs (service_role)

- `create_response_for_telegram_user` — insert once; existing profile or unique violation → `profile_exists`
- `get_current_response(telegram_user_id)`
- `update_current_response(telegram_user_id, …)`
- `get_current_statistics(telegram_user_id)`
- `get_public_statistics` — session-free cohort preview (rate-limited per IP hash)

## Security and privacy

**Stored:** questionnaire answers, `telegram_user_id`, optional `telegram_username`, suspicious flag, timestamps.

**Not stored:** recovery tokens, session tokens, raw IP addresses (IP hashes used transiently for public-stats rate limits).

**Client requirements:** Mini App must be opened inside Telegram so `initData` is present. Opening the hosted URL in a normal browser shows a gate screen, not the full product.

**Hosting:** CSP allows Telegram embedding (`frame-ancestors` includes `https://web.telegram.org`). `X-Frame-Options: DENY` is removed.

## Questionnaire scope

Three tracks: `nawa_director`, `health_minister`, `culture_minister`. Two study routes: `preparatory_course`, `direct_studies`. Ten application statuses from `submitted` through terminal award outcomes. Shared enums in `shared/contracts.ts`, validated in `shared/validation.ts`, enforced in PostgreSQL constraints.

## Architecture changelog

### 2026-07-21 — Telegram Mini App (greenfield)

- Product channel: Telegram Mini App only; public anonymous web entry removed.
- Identity: `telegram_user_id` unique per profile; one Telegram account → one profile.
- Auth: `initData` HMAC verification on every API call; no cookies, recovery codes, or Turnstile.
- Removed: `anonymous_sessions`, recovery token columns, restore/logout/rotate APIs and UI.
- Consolidated prior `docs/superpowers/{specs,plans}/*` anonymous POC documents into this file. Those files described the superseded anonymous recovery model and are no longer maintained separately.

### 2026-07-13 — Anonymous POC (superseded)

Initial pseudonymous design: HttpOnly session cookies, one-time recovery codes, Turnstile on create/restore, IP-hash rate limits. Replaced before public launch.
