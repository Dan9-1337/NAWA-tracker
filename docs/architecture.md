# NAWA Tracker Architecture

Living architecture document for the Telegram Mini App. Update this file (and the changelog) when product or security boundaries change.

## Current architecture

NAWA Tracker is a **Telegram Mini App only** scholarship questionnaire with privacy-safe community statistics. One Telegram account maps to one applicant profile.

| Layer | Technology | Role |
| --- | --- | --- |
| Client | Vite + React in Telegram WebView | Questionnaire, statistics panel |
| API | Vercel Functions (`api/`) | Auth, validation, Supabase RPC orchestration |
| Database | Supabase PostgreSQL | `responses` rows, aggregate statistics RPCs |
| Bot | Telegram Bot (BotFather) | Menu button / direct link into the Mini App |

Identity is **pseudonymous, not anonymous**: each `responses` row is keyed by `identity_hash = HMAC-SHA256(IDENTITY_PEPPER, telegram id)`, computed by the API (`api/_lib/identity.ts`). The database never stores the Telegram id or username, so a database export alone cannot be resolved to Telegram accounts. Whoever holds the pepper can still recompute hashes, so the product promises pseudonymity, never anonymity.

Authentication is **native Mini App**: every protected API call carries Telegram `initData`. The server verifies the HMAC using `TELEGRAM_BOT_TOKEN` and rejects expired payloads. There are no HttpOnly session cookies, recovery codes, or Cloudflare Turnstile challenges.

## Decisions

The reasoning behind the big choices (Mini App only, pseudonymous identity, the cohort ladder, banded outcomes, one live track, opt-in bot) is recorded in [`docs/adr/`](adr/README.md).

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
| `/api/intake-summary` | POST | initData | Landing counter: valid responses of the active intake (hidden below the cohort floor) |
| `/api/bot` | POST | `X-Telegram-Bot-Api-Secret-Token` | Telegram webhook: `/start` (with `c_<ISO>` or `subscribe` payload), `/subscribe`, `/stop`, `/help`, and `my_chat_member` (blocked bot) |
| `/api/cron/reminders` | GET | `Authorization: Bearer CRON_SECRET` | Daily reminders for subscribers (`results_soon`, `results_out`, `intake_open`) |
| `/api/cron/keep-alive` | GET | `Authorization: Bearer CRON_SECRET` | Daily Supabase activity ping (Vercel Cron) |

Removed from the anonymous POC: `/api/session/restore`, `/api/session/logout`, `/api/recovery/rotate`.

## Data model

### `responses`

Questionnaire fields plus:

- `identity_hash text not null` — 64 hex characters (check constraint rejects raw ids); unique together with `intake_year`
- `intake_year`, `grade_basis` (`final_certificate` | `half_year`), `applicant_kind` (`school_leaver` | `student_in_poland`, the latter scored 100)
- `is_suspicious boolean` — sticky flag from implausible status transitions (the app no longer changes a status, so it only matters for older rows)
- `study_field text not null default 'other'` — ISCED-F detailed code (`^[0-9]{4}$`) or `other`; the default only covers rows created before the field existed (`shared/study-fields.ts`)
- `prep_course_city text` — optional; only allowed on the preparatory route with outcome `scholarship_awarded`; values from `shared/prep-course-cities.ts` or `other`

### Statistics

`compute_country_statistics` compares the NAWA orientation score within the active intake year (`season_config`) through the cohort ladder: country (≥ 10 non-suspicious responses) → country group (`country_groups`, unlisted countries fall into `world-other`) → whole track. The result names the tier (`cohortScope`, `cohortGroupId`); with fewer than 10 responses on every tier `detailsAvailable` is `false`.

### RPCs (service_role)

- `create_response_for_identity` — insert once per `(identity_hash, intake_year)`; existing profile or unique violation → `profile_exists`
- `get_current_response(identity_hash, intake_year)`
- `update_current_response(identity_hash, intake_year, …)` — allows correcting one final outcome to another
- `get_current_statistics(identity_hash, intake_year)`
- `get_prep_city_distribution(identity_hash, intake_year)` — **not called by the app since [ADR 0008](adr/0008-refocus-on-score-comparison.md)**, kept for the post-award flow; cities by the caller's study field, from ≥ 3 awarded reports with a city; walks detailed field → narrow group → broad area → all fields and names the level; cities under 3 are merged into `otherCount`; never filtered by country ([ADR 0007](adr/0007-study-field-and-prep-course-city.md))
- `get_cohort_outcomes(identity_hash, intake_year)` — **not called by the app since [ADR 0008](adr/0008-refocus-on-score-comparison.md)**, kept for the post-award flow; walks country → group → track and discloses the first tier with ≥ 3 awarded responses: counts, awarded rate among merit-positive responses, and awarded / not-awarded score bands rounded outward to 5 points (never exact minima or maxima)
- `compute_orientation_score` — the single SQL implementation of the published formula (mirrors `shared/nawa-score.ts`; parity is tested)

### `bot_subscriptions`

`telegram_user_id`, `chat_id`, `locale`, `last_reminder`. The only table with a real Telegram id; opt-in, no answers, service-role only. Removed on `/stop`, when Telegram reports the bot blocked, when a send fails with 403 or "chat not found", and by `DELETE /api/responses`.

### Product events

`product_events` stores one row per recorded event, keyed by `identity_hash`; the client sends them to `POST /api/product-events`. An event is only its name — the API rejects any payload and the table limits the name to 256 bytes. Names already recorded are not renamed, and an event is added, renamed or removed only together with this table ([ADR 0011](adr/0011-documented-product-events-deleted-with-survey.md)).

| Event | Recorded when | At most | Recorded in |
| --- | --- | --- | --- |
| `landing_viewed` | The start screen is shown in `create` mode | Once per mount of the start screen | `src/features/StartScreen.tsx` |
| `wizard_started` | The user presses the start button on the start screen | Once per press | `src/features/CreateProfileFlow.tsx` |
| `wizard_education_completed` | The user presses Next on a valid Education step of the new-survey wizard, so the Grades step opens | Once per mount of the create flow | `src/features/CreateProfileFlow.tsx` |
| `wizard_completed` | A new survey is saved successfully from the Grades step | Once per successful save | `src/features/CreateProfileFlow.tsx` |
| `score_viewed` | The saved result panel first renders the score for a `nawa_director` profile | Once per mount of the result panel | `src/features/statistics/StatisticsPanel.tsx` |
| `position_or_fallback_viewed` | The saved result panel first renders its position or the small-cohort fallback | Once per mount of the result panel | `src/features/statistics/StatisticsPanel.tsx` |
| `what_if_used` | The user first changes the what-if average away from the saved one, by the ruler or a valid typed value | Once per mount of the dashboard | `src/features/ProfileDashboard.tsx` (the change is detected in `src/features/score/ScoreScreen.tsx`) |
| `survey_updated` | Saving an edit through `PUT /api/responses` succeeds | Once per successful save | `src/features/ProfileDashboard.tsx` |
| `reminders_link_opened` | The user taps Settings → "Reminders in the bot" | Once per tap | `src/components/settings/MainMenu.tsx` |
| `invite_link_opened` | The user taps Settings → "Invite people from my country" | Once per tap | `src/components/settings/MainMenu.tsx` |

## Security and privacy

**Stored:** questionnaire answers, `identity_hash`, suspicious flag, timestamps, and `product_events` (event name only; the retired `status_updated` event carried two status values in old rows; never free text, enforced by the API schema and a payload size check). Deleting the survey deletes the user's events.

**Not stored:** Telegram id, Telegram username, name, email, phone, search queries, recovery or session tokens, raw IP addresses (IP hashes used transiently for public-stats rate limits).

**Deleting** a profile in Settings removes every intake year of that account.

**Client requirements:** Mini App must be opened inside Telegram so `initData` is present. Opening the hosted URL in a normal browser shows a gate screen, not the full product.

**Hosting:** CSP allows Telegram embedding (`frame-ancestors` includes `https://web.telegram.org`). `X-Frame-Options: DENY` is removed.

## Questionnaire scope

Only `nawa_director` is writable (the API rejects other tracks); `health_minister` and `culture_minister` stay in the enums for later. Two study routes: `preparatory_course`, `direct_studies`. Six application statuses (`submitted` → … → `scholarship_awarded` / `scholarship_not_awarded`, plus `merit_review_negative`) stay in the enums and constraints, but the app only ever sends `submitted`. Shared enums in `shared/contracts.ts`, validated in `shared/validation.ts`, enforced in PostgreSQL constraints.

## Season rollover

Records are keyed by `(identity_hash, intake_year)` and every statistic is scoped to `season_config.active_intake_year`. When
NAWA publishes a new call:

1. Add its dates to `seasons` in `shared/season.ts` (the reminder cron derives `intake_open`, `results_soon` and
   `results_out` from them) and check the copy that mentions dates.
2. Change `currentIntakeYear` in `shared/season.ts` **and** `update public.season_config set active_intake_year = <year>` in
   the same release; the API rejects any other year (`INVALID_INTAKE_YEAR`).
3. Past years stay in the database as an archive and drop out of live cohorts automatically. People who applied before simply
   create a new record for the new year.

## Scheduled jobs

Supabase free-tier projects pause after roughly seven days without database activity. A Vercel Cron job calls `GET /api/cron/keep-alive` once per day (`0 12 * * *` UTC). The handler verifies `Authorization: Bearer <CRON_SECRET>` (set `CRON_SECRET` in Vercel; the platform attaches it automatically) and runs a lightweight `responses` read via the existing service-role client.

## Architecture changelog

### 2026-11-27 — Real landing response counter

- Migration `202611270001`: new `get_intake_summary()` RPC returns `{ intakeYear, responseCount }` for `active_intake_year()`, counting valid (not `is_suspicious`) responses across all tracks and sending `responseCount: null` below `min_cohort_size()`; execute is granted to the service role only. New `POST /api/intake-summary`; the landing screen calls it once on mount and renders nothing while loading, on failure, or when the count is suppressed.
- The hard-coded `start.previewLive` figure ("48 … +7 this week") is removed from every locale and from `ResultPreviewCard`; the real line sits below the sample card and keeps the accent dot.

### Unreleased — Refocus on the score comparison

- No migration. The client stopped asking for the university, field, route and status and sends `currentStatus: 'submitted'`, today’s `statusChangedAt`, `studyField: 'other'`, `studyRoute: 'direct_studies'` and no `targetUniversity`; `targetUniversity` is no longer required on writes (`shared/validation.ts`).
- Removed `POST /api/outcomes`, `POST /api/prep-cities`, the `status_updated` product event, `shared/status-options.ts`, `shared/status-transitions.ts` and `shared/anders-history.ts`. The SQL (`get_cohort_outcomes`, `get_prep_city_distribution`, status transition rules) stays for the post-award flow.
- `migration-contracts.test.ts` pins the outcome thresholds (3 and 5) as literals because `OUTCOME_MIN_AWARDED` / `OUTCOME_BAND_WIDTH` left `shared/product-rules.ts`.
- Wizard sessions saved in `localStorage` are versioned (2); a version 1 session has its step index shifted by one for the removed step.
- Decision record: [ADR 0008](adr/0008-refocus-on-score-comparison.md).

### 2026-11-26 — Study field and preparatory-course city

- Migration `202611260001`: `responses.study_field` and `prep_course_city` with check constraints; `create_response_for_identity`, `update_current_response` and `get_current_response` take and return the two new values (17-argument signature); new `get_prep_city_distribution` RPC and `POST /api/prep-cities`.
- The wizard asks for the field (ISCED-F detailed list with search, about 60 entries, 5 languages) in the application step; the status reporter asks for the city when an award is reported on the preparatory route; the Outcomes tab shows the field-by-city card to preparatory-route applicants.
- Decision record: [ADR 0007](adr/0007-study-field-and-prep-course-city.md).

### 2026-11-26 — Dead-code cleanup and single-source thresholds

- Migration `202611250001`: dropped the never-called public what-if statistics (`get_public_statistics`, `submission_limits`, `POST /api/statistics/public`, `IP_HASH_SALT`, the concurrency test); removed the always-null `gradesScore` and `polishSchoolBonus` from the statistics payload (now 14 keys).
- The privacy thresholds (cohort of 10, 3 awarded, 5-point bands) have one definition per side: `public.min_cohort_size()`, `outcome_min_awarded()`, `outcome_band_width()` in SQL and `shared/product-rules.ts` in TypeScript; `migration-contracts.test.ts` fails if they drift apart.
- Spaghetti refactors (behaviour unchanged, covered by tests): `ProfileDashboard` lost its status editor (`StatusReporter`), the Telegram bottom-button rules (`dashboard-chrome.ts`, pure and tested) and the duplicated save guard (`useGuardedSubmit`); `SettingsSheet` is now a shell around `components/settings/*` views; `ResultHeroCard` is a frame with `DetailedPosition` / `SmallCohortNotice` bodies instead of a `variant` flag; the wizard's consistency rules live in `lib/draft-rules.ts` and each step is its own component under `features/wizard/`; `HomePage` uses `useRequestGuard` and `useOnlineStatus`; `CreateProfileFlow` renders `StartScreen`. `tsconfig.json` now enforces `noUnusedLocals` and `noUnusedParameters`.
- A latent bug fixed on the way: the "calculation error" support report ignored `applicantKind`, so a student in Poland would have been reported with the wrong score.
- The Vercel CLI is no longer a dev dependency (about 135 MB of `node_modules` and 100 KB of lockfile); use `npx vercel@45`.

### 2026-11-25 — Forward status jumps, PGlite tests, season helpers

- Migration `202611240001`: `status_rank` and a looser `is_allowed_status_transition`: any later stage is allowed, going back is not (people joining after the results can report the outcome in one step). The UI offers exactly those options (`shared/status-options.ts`, `getStatusOptions`).
- `npm run test:db:pglite` runs migrations, the SQL tests and the seed on PGlite without Docker; CI runs it next to the unit tests and still runs real pgTAP on PostgreSQL.
- `isIntakeOpen` and `calendarPhase` accept a season; a season with unannounced dates is never open (`shared/season.ts`).
- The test setup no longer needs `NODE_OPTIONS=--no-experimental-webstorage` on Node 25+.

### 2026-11-24 — Bot webhook, reminders and country links

- Migration `202611230001`: `bot_subscriptions`.
- `POST /api/bot` verifies the webhook secret in constant time, ignores everything except private-chat commands and `my_chat_member`, and never echoes user input (country payloads are validated against the country list).
- `GET /api/cron/reminders` plans reminders from `shared/season.ts` (`shared/reminders.ts`): one reminder per subscriber at a time, never a backlog, expiring after a window; capped at 200 sends per run.
- The Mini App reads `start_param` (`c_UA`) or `?c=UA` and preselects the country of citizenship; Settings gained "Reminders in the bot" and "Invite people from my country".
- Bot texts live in `shared/bot-messages.ts` (pl, en, ru, uk, be).

### 2026-11-23 — Ukrainian and Belarusian

- Locales: `pl`, `en`, `ru`, `uk`, `be` (`src/i18n/*.ts`; the `Messages` type is derived from `pl`, and `src/i18n/locales.test.ts` checks key parity, function arity, and that Ukrainian/Belarusian carry no Russian-only spellings).
- The initial locale is the stored choice, then the Telegram user's `language_code`, then the browser language, then Polish.
- Belarusian uses the official orthography (narkamaŭka, Cyrillic). Both new translations were machine-drafted and need a native-speaker review before release.
- About 1,100 lines of unused UI copy were removed from every locale before translating.

### 2026-11-22 — Pseudonymous identity

- Migration `202611220001`: `identity_hash` replaces `telegram_user_id` and `telegram_username` in `responses` and `product_events`; RPCs take `p_identity_hash`; `create_response_for_telegram_user` became `create_response_for_identity`.
- New server secret `IDENTITY_PEPPER` (the local-dev value is rejected in production). Changing it orphans stored profiles.
- Product events carry no free text; university search queries are no longer logged.

### 2026-11-20 — Season model, cohort ladder, slim statistics

- Migration `202611200001`: records per `(account, intake year)`, `grade_basis`, `applicant_kind`, `scholarship_not_awarded`, terminal corrections, dropped unused review/audit/snapshot tables.
- Migration `202611210001`: `season_config`, `country_groups`, the cohort ladder, `get_cohort_outcomes` (replaces `get_country_outcomes`), and a 16-key statistics payload (growth, history, benchmark, country context, group progress and reported-merit blocks were removed with their functions).
- Removed passport, badges, milestones, radar, allocation estimates, the university alias pipeline and search-query logging.
- Official Anders totals live in `shared/anders-history.ts` (2021, 2023, 2024; NAWA publishes no per-country limits or cut-offs).

### 2026-11-19 — Ruler redesign and country outcomes

- Dashboard split into Score / Outcomes / Season tabs (`src/features/{score,outcomes,season}`).
- New `get_country_outcomes` RPC (migration `202611190001`) and `POST /api/outcomes`; the API re-validates the k ≥ 10 floor and strips unknown fields.
- CI now applies every file in `supabase/migrations/` in order.
- Fonts (Oswald, Golos Text) are self-hosted through `@fontsource/*` because the CSP only allows `'self'`.

### 2026-08-09 — Supabase keep-alive cron

- Added `GET /api/cron/keep-alive` and daily Vercel Cron schedule to prevent Supabase project inactivity pauses.
- Requires production `CRON_SECRET` (minimum 32 characters).

### 2026-07-21 — Telegram Mini App (greenfield)

- Product channel: Telegram Mini App only; public anonymous web entry removed.
- Identity: `telegram_user_id` unique per profile; one Telegram account → one profile.
- Auth: `initData` HMAC verification on every API call; no cookies, recovery codes, or Turnstile.
- Removed: `anonymous_sessions`, recovery token columns, restore/logout/rotate APIs and UI.
- Consolidated prior `docs/superpowers/{specs,plans}/*` anonymous POC documents into this file. Those files described the superseded anonymous recovery model and are no longer maintained separately.

### 2026-07-13 — Anonymous POC (superseded)

Initial pseudonymous design: HttpOnly session cookies, one-time recovery codes, Turnstile on create/restore, IP-hash rate limits. Replaced before public launch.
