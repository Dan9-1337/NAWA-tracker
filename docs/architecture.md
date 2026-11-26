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

The reasoning behind the big choices (Mini App only, pseudonymous identity, the country-only score comparison, banded outcomes, one live track, opt-in bot) is recorded in [`docs/adr/`](adr/README.md).

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
| `/api/responses/current` | POST | initData | Load owned profile. 404 `PROFILE_NOT_FOUND` when the account has no survey for the active intake year; 401 `UNAUTHORIZED` only for missing, invalid or expired (over 24 hours) Telegram authentication |
| `/api/statistics` | POST | initData | Privacy-safe aggregates for owned profile |
| `/api/intake-summary` | POST | initData | Landing counter: valid responses of the active intake (hidden below the cohort floor), and the active `intakeYear` the client saves new surveys with |
| `/api/orientation-mark` | GET | initData | The caller's country `ориентир 2026`: `{ mark, n }`; `?distribution=1` adds the ascending holder score list for the dots |
| `/api/scholarship-report` | GET | initData | Own scholarship-holder report, or `{ report: null }`; `?summary=1[&country=XX]` returns the contributors-only results |
| `/api/scholarship-report` | POST | initData + Origin | Create the scholarship-holder report (2026 Director survey, score ≥ 60) |
| `/api/scholarship-report` | PUT | initData + Origin | Replace the answers and refresh the score snapshot |
| `/api/scholarship-report` | DELETE | initData + Origin | Delete the report; the survey stays |
| `/api/bot` | POST | `X-Telegram-Bot-Api-Secret-Token` | Telegram webhook: `/start` (with `c_<ISO>` or `subscribe` payload), `/subscribe`, `/stop`, `/help`, and `my_chat_member` (blocked bot) |
| `/api/cron/reminders` | GET | `Authorization: Bearer CRON_SECRET` | Daily reminders for subscribers (`intake_open`; `results_soon` and `results_out` only for a season with `resultsRemindersEnabled: true`) |
| `/api/cron/keep-alive` | GET | `Authorization: Bearer CRON_SECRET` | Daily Supabase activity ping (Vercel Cron) |

Removed from the anonymous POC: `/api/session/restore`, `/api/session/logout`, `/api/recovery/rotate`.

## Data model

### `responses`

Questionnaire fields plus:

- `identity_hash text not null` — 64 hex characters (check constraint rejects raw ids); unique together with `intake_year`
- `intake_year`, `grade_basis` (`final_certificate` | `half_year`), `applicant_kind` (`school_leaver` | `student_in_poland`, the latter scored 100)
- `is_suspicious boolean` — sticky exclusion from every statistic: implausible status transitions (only older rows, since the app no longer changes a status) and per-country survey spikes ([ADR 0014](adr/0014-flag-per-country-spikes-for-manual-review.md)); only the maintainer's review clears a spike flag
- `spike_flagged_at timestamp with time zone` — when the spike rule set `is_suspicious`; null on flags from the old status-transition rule, so the review statements leave those alone
- `spike_reviewed_at timestamp with time zone` — when the maintainer reviewed a spike flag; a reviewed survey is never flagged again
- `study_field text not null default 'other'` — ISCED-F detailed code (`^[0-9]{4}$`) or `other`; the default only covers rows created before the field existed (`shared/study-fields.ts`)
- `prep_course_city text` — optional; only allowed on the preparatory route with outcome `scholarship_awarded`; values from `shared/prep-course-cities.ts` or `other`

### `scholarship_reports`

The answers of the scholarship-holder survey ([ADR 0012](adr/0012-scholarship-holder-survey.md)), one row per survey: `(identity_hash, intake_year)` is the primary key and a foreign key to `responses (identity_hash, intake_year)` with `on delete cascade`, so deleting a survey deletes its report. `score_snapshot numeric not null` (≥ 60) is the survey's `nawa_orientation_score` when the report is created or edited; the server sets it, and a later survey edit does not move it ([ADR 0017](adr/0017-orientation-mark-from-holder-scores.md)). `study_route` is `preparatory_course` or `direct_studies`; `prep_centre_id` is present exactly on the preparatory path and comes from `shared/prep-course-centres.ts`; exactly one of `programme_id` (a catalogue kierunek, with `programme_isced` a four-digit ISCED-F code) and `custom_programme` (typed, trimmed, 1–80 characters, single line) is present; `university_id` is a Director-track partner from `shared/universities.ts`. Typed text is private to its author and the maintainer, and never travels in a summary. Service-role only.

### `score_change_log`

The trail behind the score-change limit ([ADR 0013](adr/0013-limit-on-score-changing-edits.md)): `identity_hash`, `saved_at` and `counted` only, never a score, country or intake year. It is deliberately not linked to `responses`, so deleting the survey does not reset the limit. Rows older than 24 hours stop counting immediately and `purge_score_change_log()` erases them hourly. Service-role only, indexed on `(identity_hash, saved_at)`.

### `season_config`

One row (`id` is the single-value check). `active_intake_year` scopes every statistic and the landing counter. `public_launch_date` is the app's public launch day and stays null until the maintainer sets it; `intake_opens_on` is the day the active intake opened. Both dates bound the quiet periods of the spike rule below.

### Statistics

`compute_country_statistics` compares the NAWA orientation score only among the non-suspicious responses of the applicant's country of citizenship (`ranking_country`) on the same track and in the active intake year (`season_config`); country groups (`country_groups`) and the whole-track tier are no longer used ([ADR 0015](adr/0015-compare-within-citizenship-country-without-minimum.md)). There is no minimum number of responses: `sameCountryCount` always reports the country count, and with 0–1 responses `detailsAvailable` is `false` and every detail field is null. From 2 responses the payload carries the rank, percentile, median, the 16-bucket distribution and `cohortScope: 'country'`; `cohortGroupId` and `trackWideMedian` are always `null`, and the payload keeps its 14 keys so old and new clients and servers parse each other during a deploy.

### RPCs (service_role)

- `create_response_for_identity` — insert once per `(identity_hash, intake_year)`; existing profile or unique violation → `profile_exists`; the first create with no trail row in the last 24 hours is recorded uncounted, a create while a recent trail row exists counts like a score-changing edit, and a save over the limit → `edit_limit_reached`; after the insert it applies the spike rule below
- `get_current_response(identity_hash, intake_year)`
- `update_current_response(identity_hash, intake_year, …)` — allows correcting one final outcome to another; an edit that changes `nawa_orientation_score` is counted and blocked after three counted saves in a rolling 24 hours → `edit_limit_reached`
- `get_current_statistics(identity_hash, intake_year)`
- `get_prep_city_distribution(identity_hash, intake_year)` — **not called by the app since [ADR 0008](adr/0008-refocus-on-score-comparison.md)**, kept for the post-award flow; cities by the caller's study field, from ≥ 3 awarded reports with a city; walks detailed field → narrow group → broad area → all fields and names the level; cities under 3 are merged into `otherCount`; never filtered by country ([ADR 0007](adr/0007-study-field-and-prep-course-city.md))
- `get_cohort_outcomes(identity_hash, intake_year)` — **not called by the app since [ADR 0008](adr/0008-refocus-on-score-comparison.md)**, kept for the post-award flow; walks country → group → track and discloses the first tier with ≥ 3 awarded responses: counts, awarded rate among merit-positive responses, and awarded / not-awarded score bands rounded outward to 5 points (never exact minima or maxima)
- `get_scholarship_report(identity_hash, intake_year)` — the caller's scholarship-holder report, or null
- `create_scholarship_report(identity_hash, intake_year, study_route, prep_centre_id, programme_id, programme_isced, custom_programme, university_id)` — one report per 2026 Director survey; stores the survey's current `nawa_orientation_score` as `score_snapshot`; a missing survey → `profile_not_found`, a score below 60 → `score_below_threshold` with nothing stored, a second report → `report_exists`
- `update_scholarship_report(identity_hash, intake_year, study_route, prep_centre_id, programme_id, programme_isced, custom_programme, university_id)` — replaces the answers and refreshes `score_snapshot` from the survey; a missing report → `report_not_found`
- `delete_scholarship_report(identity_hash, intake_year)` — deletes the report only; the survey stays
- `get_scholarship_report_summary(identity_hash, intake_year, ranking_country)` — null for a caller without a report; otherwise the contributors-only results, counted from every report whose survey is not `is_suspicious`, filtered by the survey's `ranking_country` (`null` = all countries); `countries` always lists every counted country so the filter can switch back; no minimum number of answers
- `get_orientation_mark(identity_hash, intake_year, include_scores)` — null unless the caller has a 2026 Director survey; otherwise the lowest `score_snapshot` among the counted 2026 Director holder reports of the caller's `ranking_country` and their number, with no minimum; the ascending score list is included only with `include_scores` ([ADR 0017](adr/0017-orientation-mark-from-holder-scores.md))
- `compute_orientation_score` — the single SQL implementation of the published formula (mirrors `shared/nawa-score.ts`; parity is tested)

### Spike flags

A burst of new surveys for one `ranking_country` in the active intake year is held out of the statistics until the maintainer reviews it ([ADR 0014](adr/0014-flag-per-country-spikes-for-manual-review.md)). After every insert, `create_response_for_identity` counts the country's surveys created in the last hour (including the new one) and compares that count with the country's average hourly rate over the preceding 14 days (surveys created in the 14 days before that hour, divided by 336). A spike is `count > max(10, 5 × average)`.

Nothing is flagged while `season_config.public_launch_date` is null, during the first seven days after it, or during `[intake_opens_on, intake_opens_on + 7 days)`. On a spike every unreviewed survey of that hour (`spike_reviewed_at is null`) gets `is_suspicious = true` and `spike_flagged_at = now()`; a survey already flagged by an earlier spike keeps its timestamp. Surveys of other countries, of other intake years, and flags written by the old status-transition rule (no `spike_flagged_at`) are not touched.

Flagged surveys drop out of every statistic and of the landing counter through the existing `not is_suspicious` filters. Their owners are not told and still see their own score and position against the unflagged cohort.

### Reviewing spike flags

Review is manual in the database; there is no notification and no admin screen. List the flagged groups by country and hour:

```sql
select intake_year,
       ranking_country,
       date_trunc('hour', created_at) as flagged_hour,
       count(*) as surveys,
       min(spike_flagged_at) as first_flagged_at
from public.responses
where is_suspicious
  and spike_flagged_at is not null
  and spike_reviewed_at is null
group by 1, 2, 3
order by 3 desc, 1 desc, 2;
```

Clear one group (the flags are dropped, the group is reviewed):

```sql
update public.responses
set is_suspicious = false,
    spike_reviewed_at = now()
where intake_year = 2026
  and ranking_country = 'UA'
  and created_at >= timestamptz '2026-11-22 14:00+00'  -- the flagged_hour from the list
  and created_at <  timestamptz '2026-11-22 15:00+00'
  and spike_flagged_at is not null
  and spike_reviewed_at is null;
```

Keep a group flagged (the flag stays, the group stops appearing as unreviewed):

```sql
update public.responses
set spike_reviewed_at = now()
where intake_year = 2026
  and ranking_country = 'UA'
  and created_at >= timestamptz '2026-11-22 14:00+00'
  and created_at <  timestamptz '2026-11-22 15:00+00'
  and spike_flagged_at is not null
  and spike_reviewed_at is null;
```

A reviewed survey is never flagged again. The `spike_flagged_at is not null` filter keeps flags from the old status-transition rule out of both statements.

### Scholarship-holder results

Only a person with a report sees the contributors-only results ([ADR 0012](adr/0012-scholarship-holder-survey.md), [ADR 0016](adr/0016-scholarship-holder-results-page-without-minimum.md)): `get_scholarship_report_summary` returns null for everyone else and the API answers 404 `REPORT_NOT_FOUND`. The summary counts every report whose survey is not `is_suspicious`, with no disclosure floor: the total, the two study paths, preparatory centres, ISCED-F broad groups with catalogue kierunki, one "typed by hand" row for private text, and wished-for universities are all shown from one answer. Typed text is never included; the API resolves catalogue names and maps codes outside `broadGroups` to "other". The country filter uses the survey's `ranking_country`; the country list is deliberately left unfiltered so the page can switch back.

The card stores the survey's current score as `score_snapshot` on every report create or edit. A survey below 60 gets no invitation and the server refuses a report with 409 `SCORE_BELOW_THRESHOLD`; a later survey edit does not move an existing snapshot until the report is saved again ([ADR 0017](adr/0017-orientation-mark-from-holder-scores.md)).

Reviewing typed kierunki (maintainer only):

```sql
select custom_programme, count(*) as reports
from public.scholarship_reports
where custom_programme is not null
group by 1
order by 2 desc, 1;
```

After adding the name, its id and ISCED-F code to `shared/study-programmes.ts` and deploying, point matching reports at it:

```sql
update public.scholarship_reports
set programme_id = 'nowy-kierunek',
    programme_isced = '0613',
    custom_programme = null,
    updated_at = now()
where custom_programme is not null
  and lower(btrim(custom_programme)) = lower('Nowy kierunek');
```

The next edit of such a report writes the catalogue id itself; until then the rows count under the new catalogue kierunek.

### `ориентир 2026`

For a user with a 2026 Director survey, `get_orientation_mark` returns the lowest `score_snapshot` among the counted 2026 Director holder reports of the user's `ranking_country`, with their number; there is no minimum, so a single holder is shown. Reports of `is_suspicious` surveys are left out, and another intake year or a missing survey gets null (404 `PROFILE_NOT_FOUND`). The mark reads the snapshot, never the survey's live score, so a survey edit does not move it until the report is saved again. `GET /api/orientation-mark` returns only numbers, `{ mark, n }`; the ascending holder score list travels only with `?distribution=1`, which the dashboard asks for once the full distribution is on screen. No identity, survey id or other report field is ever part of the payload.

The line under the country position on the result card (also on the "only you" card) says how many holders answered and that this is not NAWA data; with no holder it says the country has no mark yet and, only at a survey score of at least 60, invites a holder to answer through the task 012 flow. The what-if ruler shows a fixed mark styled like the threshold flag, and the full distribution draws the holder scores as dots with the lowest one labelled. Reviewing the holder scores behind a mark (maintainer only):

```sql
select r.ranking_country, sr.score_snapshot
from public.scholarship_reports sr
join public.responses r
  on r.identity_hash = sr.identity_hash
 and r.intake_year = sr.intake_year
where sr.intake_year = 2026
  and r.scholarship_track = 'nawa_director'
  and not r.is_suspicious
order by r.ranking_country, sr.score_snapshot;
```

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
| `invite_main_button_opened` | The user presses the Telegram main button "Invite people from my country" on the dashboard | Once per press | `src/features/ProfileDashboard.tsx` |
| `wizard_average_above_maximum_shown` | The "average above the maximum" error first becomes visible on the Grades step of the new-survey wizard | Once per mount of the create flow | `src/features/CreateProfileFlow.tsx` (visibility reported by `src/features/wizard/GradesStep.tsx`) |
| `wizard_low_score_warning_shown` | The low-score warning first becomes visible on the Grades step of the new-survey wizard | Once per mount of the create flow | `src/features/CreateProfileFlow.tsx` (visibility reported by `src/features/wizard/GradesStep.tsx`) |
| `wizard_save_failed` | Saving the new survey fails and the error is shown to the user, whatever the error code | Once per failed save | `src/features/CreateProfileFlow.tsx` |

## Security and privacy

**Stored:** questionnaire answers, `identity_hash`, suspicious flag, timestamps, and `product_events` (event name only; the retired `status_updated` event carried two status values in old rows; never free text, enforced by the API schema and a payload size check). Deleting the survey deletes the user's events. `score_change_log` keeps only the identity hash and the times of recent saves that set a score, for 24 hours; it survives a deletion, as the privacy notice states ([ADR 0013](adr/0013-limit-on-score-changing-edits.md)).

**Not stored:** Telegram id, Telegram username, name, email, phone, search queries, recovery or session tokens, raw IP addresses (IP hashes used transiently for public-stats rate limits).

**Deleting** a profile in Settings removes every intake year of that account and the user's product events; it does not remove the 24-hour `score_change_log` trail.

**Client requirements:** Mini App must be opened inside Telegram so `initData` is present. Opening the hosted URL in a normal browser shows a gate screen, not the full product.

**Hosting:** CSP allows Telegram embedding (`frame-ancestors` includes `https://web.telegram.org`). `X-Frame-Options: DENY` is removed.

**Images:** the CSP is `img-src 'self' data: blob:`, so every image must come from the app's own origin. Country flags are static SVGs in `public/flags/<code>.svg` (from the MIT-licensed [circle-flags](https://github.com/HatScripts/circle-flags) project, release v2.8.0; licence in `public/flags/LICENSE.md`), and `CountryFlag` passes `cdnUrl="/flags/"` to `react-circle-flags`, whose default host (`react-circle-flags.pages.dev`) would be blocked and would expose the visitor's IP. Adding a country to `shared/countries.ts` requires adding its SVG; `src/components/country-flag.test.tsx` fails otherwise.

### Keeping `IDENTITY_PEPPER`

Every survey is keyed by `HMAC-SHA256(IDENTITY_PEPPER, telegram id)` ([ADR 0002](adr/0002-pseudonymous-identity.md)). If the pepper is lost or changed, every stored profile is orphaned: users can no longer reach their surveys, and the statistics fill with duplicates as they answer again. There is no way to recompute the old hashes without the old value.

**Status: no backup yet, to be made by the maintainer.** The maintainer removes this line after making the backup.

- **Where it lives.** The Vercel Production environment variable is the primary copy. Staging has its own, different value ([ADR 0009](adr/0009-staging-environment-on-free-tiers.md)). Local development uses its own `local-dev-identity-pepper-…` value; the API refuses to start in production with a value that has that prefix (`api/_lib/env.ts`), and any value shorter than 32 characters is refused everywhere.
- **Backup is required.** The maintainer keeps one offline copy of the Production value outside Vercel (for example in a password manager), never in the repository, an issue, a chat or a log.
  - To make it once: read the value from the Vercel dashboard (project settings, Environment Variables, Production), or run `vercel env pull` for Production into a temporary file outside the repository. Store the value in the offline copy, then delete the temporary file. Do not paste the value into a terminal command line, a note or a shared document.
  - To check it later without exposing it: compute a SHA-256 hash of the stored copy and of the Vercel value (read the same way) and compare the two hashes, never the values.
- **Who has access.** The maintainer only. Anyone added to the Vercel project can read the Production value, so add people to the project with that in mind.
- **Never rotate casually.** Changing the value is not a routine secret rotation. If the value leaks, whoever holds it can match known Telegram IDs to surveys (assumption R1), which is the pseudonymity limit already stated above. A rotation would need a re-keying migration that does not exist, so every profile would be orphaned. A suspected leak must be discussed before any change.
- **Restore.** If the Vercel variable is lost, set it back from the backup and redeploy. With no backup, the stored profiles cannot be recovered.

## Questionnaire scope

Only `nawa_director` is writable (the API rejects other tracks); `health_minister` and `culture_minister` stay in the enums for later. Two study routes: `preparatory_course`, `direct_studies`. Six application statuses (`submitted` → … → `scholarship_awarded` / `scholarship_not_awarded`, plus `merit_review_negative`) stay in the enums and constraints, but the app only ever sends `submitted`. Shared enums in `shared/contracts.ts`, validated in `shared/validation.ts`, enforced in PostgreSQL constraints.

## Catalogues

- `shared/prep-course-centres.ts` is the closed list of NAWA preparatory-course centres, keyed by intake year. The 2026 list is the ten institutions of NAWA's *Lista Wnioskodawców otrzymujących finansowanie w programie Kursy Przygotowawcze NAWA 2026/2027*; a centre names the unit that runs the course only when the university's own site names it, with the source URL, otherwise it is shown by the university name alone. Add a new year key when NAWA publishes the next results; do not rewrite past years.
- `shared/study-programmes.ts` is generated from the RAD-on / POL-on course registry (the source of studia.gov.pl). `node scripts/build-study-programmes.mjs` downloads the public list, keeps first-cycle and long-cycle full-time Polish-taught active programmes at all institutions, deduplicates kierunek names and writes the id-sorted module with the dataset URL, download date and filter in its header. Run it by hand when the list needs refreshing; it is never part of CI or the build.

## Season rollover

Records are keyed by `(identity_hash, intake_year)` and every statistic is scoped to `season_config.active_intake_year`. When
NAWA publishes a new call:

1. Add its dates to `seasons` in `shared/season.ts` (the reminder cron derives `intake_open` from them, and `results_soon` and
   `results_out` only when the season sets `resultsRemindersEnabled: true`, which stays off until the results are
   really out or their date is confirmed) and check the copy that mentions dates.
2. Run `update public.season_config set intake_opens_on = '<documentsFrom>'` for the new intake, so the first seven
   days after it are quiet for spike flags. Set `season_config.public_launch_date` on launch day only; while it is
   null nothing is flagged.
3. Run `update public.season_config set active_intake_year = <year>`. That one statement is the whole switch
   ([ADR 0018](adr/0018-intake-year-from-the-database.md)): the API reads the year from the database on every
   request that needs it (`get_active_intake_year()`), the client takes it from the server (the intake summary for a
   new survey, the saved response for an edit), and a save for any other year is rejected with `INVALID_INTAKE_YEAR`.
   No code release is needed for the year. A year without an entry in `seasons` still works: the season copy reads
   "intake closed" with the year and no dates until step 1 is released.
4. Past years stay in the database as an archive and drop out of live cohorts automatically. People who applied before simply
   create a new record for the new year.

## Scheduled jobs

Supabase free-tier projects pause after roughly seven days without database activity. A Vercel Cron job calls `GET /api/cron/keep-alive` once per day (`0 12 * * *` UTC). The handler verifies `Authorization: Bearer <CRON_SECRET>` (set `CRON_SECRET` in Vercel; the platform attaches it automatically) and runs a lightweight `responses` read via the existing service-role client.

The database also erases the score-change trail every hour. Migration `202611280001` enables `pg_cron` when `pg_available_extensions` lists it and schedules `select public.purge_score_change_log()` at minute 0 (`0 * * * *`). After deploy, `select * from cron.job` shows the hourly `purge-score-change-log` job; if the extension was not enabled on the project, enable it and run the migration's schedule statement manually.

## Architecture changelog

### 2026-12-05 — Country flags from our own domain

- Flags were requested from `react-circle-flags.pages.dev`, which the production CSP (`img-src 'self'`) blocks. They are now served from `/flags/<code>.svg` (`public/flags/`); the CSP is unchanged.

### 2026-12-04 — Active intake year from the database

- Migration `202612040001`: new `get_active_intake_year()` RPC returns `season_config.active_intake_year`; execute is granted to the service role only (`anon` and `authenticated` cannot call it, and the internal `active_intake_year()` stays revoked from every role).
- API: `POST /api/responses` (create and update), `POST /api/responses/current` and `POST /api/statistics` read the year through that RPC (`readActiveIntakeYear` in `api/_lib/questionnaire.ts`) instead of the `currentIntakeYear` constant, which is removed. A save for a different year is still rejected with `INVALID_INTAKE_YEAR`. Each of these requests makes one extra small read.
- Client: a new survey is saved with the `intakeYear` returned by `POST /api/intake-summary` (the create flow asks for it when it opens; concurrent callers share one request, and the save is never sent before the year is known); an edit keeps the year of the saved response. The result card finds the season dates in `seasons` by that year and falls back to the "intake closed" text without dates.
- Season rollover is one `update public.season_config set active_intake_year = <year>`; see "Season rollover".
- Decision record: [ADR 0018](adr/0018-intake-year-from-the-database.md).

### 2026-12-03 — "Ориентир 2026"

- Migration `202612030001`: new `get_orientation_mark(identity_hash, intake_year, include_scores)` RPC. For the caller's `ranking_country` it takes the lowest `score_snapshot` among the counted 2026 Director holder reports whose survey is not `is_suspicious`, with `n` and no minimum; a 2026 Director survey is required, another intake year or a missing survey gets null. The payload carries only numbers (`mark`, `n`, and the ascending `scores` list only with `include_scores`); the RPC is service-role only. No new table, and the 14-key statistics contract and the country-only rules of ADR 0015 are untouched.
- API: `GET /api/orientation-mark` returns `{ mark, n }`, or `{ mark, n, scores }` with `?distribution=1`; a caller without a 2026 Director survey gets 404 `PROFILE_NOT_FOUND`, and any failure hides the feature on the client.
- Dashboard: the result card gains one line under the country position — also on the "only you" card — with the holder count and the "not NAWA data" note, or, with no holder, that the country has no mark yet plus the holder invitation at a survey score of at least 60 (it opens the task 012 flow). The what-if ruler gains a fixed mark styled like the threshold flag, and the full distribution draws the holder scores as dots, the lowest labelled. Nothing is saved and no product event is added.
- Privacy and FAQ copy gain the holder-score reference in five locales, including the small-country guess.
- Decision record: [ADR 0017](adr/0017-orientation-mark-from-holder-scores.md).

### 2026-12-02 — Scholarship-holder survey and results

- Migration `202612020001`: new `scholarship_reports` keyed by `(identity_hash, intake_year)`, with a cascade foreign key to `responses`, a server-set `score_snapshot` (≥ 60), the structural checks for the centre, one catalogue/typed kierunek and the ISCED-F code, and service-role-only access. New RPCs `get_scholarship_report`, `create_scholarship_report`, `update_scholarship_report`, `delete_scholarship_report` and `get_scholarship_report_summary`; a survey below 60 or missing refuses a report, a second report answers `report_exists`, and the summary refuses non-contributors.
- Dashboard: a scholarship-holder card sits between the what-if/distribution blocks and the profile block for a 2026 Director survey scoring at least 60. It opens a four-step flow (path, centre only on the preparatory path, kierunek from the lazily loaded catalogue or typed 1–80 characters, university), then shows the answers with Edit/Delete and "where holders were placed". The separate results view has an all-countries filter with counts, totals, paths, centres, ISCED-F field groups with catalogue kierunki, one typed row without text, universities, an empty state and the self-reported caption. No minimum, no ladder, no extra "other" row; reports of suspicious surveys are excluded.
- API: `GET`/`POST`/`PUT`/`DELETE /api/scholarship-report`; a same-origin GET may omit the Origin header, and only a present, different origin is refused. Catalogue programme ids are validated on the server and the ISCED-F code is resolved there; typed text never appears in a summary.
- Privacy copy gains the contributors-only rule, the small-country guess and the private typed kierunek in five locales.
- Decision records: [ADR 0012](adr/0012-scholarship-holder-survey.md), [ADR 0016](adr/0016-scholarship-holder-results-page-without-minimum.md), [ADR 0017](adr/0017-orientation-mark-from-holder-scores.md).

### 2026-12-01 — Country-only statistics

- Migration `202612010001`: `compute_country_statistics` and `assert_statistics_result` keep their signatures and grants and now compare only within the applicant's country of citizenship on the same track and intake. There is no floor: with 0–1 valid surveys `detailsAvailable` is `false` and every detail field is null, while `sameCountryCount` still reports the count; from 2 surveys the payload carries the rank, percentile, median and 16-bucket distribution. `cohortScope` is only ever `'country'`, and `cohortGroupId` / `trackWideMedian` are always `null` (the 14 keys stay). Country groups and the whole-track tier are no longer read by the score statistics; `country_groups`, `country_group_id()`, `MIN_COHORT_SIZE` / `min_cohort_size()` stay for the landing counter and the outcomes flow.
- Dashboard: the result card shows the full position from two valid surveys in the country and a single "only you" line below the score while it has fewer (no percentile, median, distribution or what-if band); the group and track notes and the all-countries benchmark are gone. Privacy and About copy rewritten in five locales.
- Decision record: [ADR 0015](adr/0015-compare-within-citizenship-country-without-minimum.md), which supersedes [0003](adr/0003-cohort-ladder.md).

### 2026-11-29 — Spike flags for manual review

- Migration `202611290001`: `season_config.public_launch_date` (null until the maintainer sets it) and `season_config.intake_opens_on` (2026-03-31 for the active 2026 intake); `responses.spike_flagged_at` and `responses.spike_reviewed_at`; an index on `(intake_year, ranking_country, created_at)`. `create_response_for_identity` keeps its signature, the advisory lock and the task 009 edit limit, and after the insert flags a per-country burst of more than `max(10, 5 × average hourly rate over the preceding 14 days)` in one hour. Nothing is flagged while the launch date is null or during the seven days after the launch or an intake opening.
- Flags are reviewed by hand: the "Reviewing spike flags" SQL lists groups by country and hour and clears or keeps them. Reviewed surveys are never flagged again; flags from the old status-transition rule have no `spike_flagged_at` and are left alone. Owners are not told.
- Decision record: [ADR 0014](adr/0014-flag-per-country-spikes-for-manual-review.md).

### 2026-11-28 — Score-change limit

- Migration `202611280001`: new `score_change_log` (`identity_hash`, `saved_at`, `counted`; service-role only; index on `(identity_hash, saved_at)`) keeps the trail of score-changing saves for a rolling 24 hours and survives deletion. `create_response_for_identity` records a first create uncounted and counts a re-create inside the window; `update_current_response` counts an edit only when `nawa_orientation_score` changes. Both raise `edit_limit_reached` with the retry instant (oldest counted row + 24 hours, ISO 8601 UTC) when three counted rows are in the window. `purge_score_change_log()` erases expired rows; pg_cron schedules it hourly when the extension is available.
- API: `edit_limit_reached` → 429 `EDIT_LIMIT_REACHED` with `retryAt`; the client shows a localized message with the retry time in local time (and the date when it is not today) and keeps the form input or the local draft.
- Decision record: [ADR 0013](adr/0013-limit-on-score-changing-edits.md).

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
- `GET /api/cron/reminders` plans reminders from `shared/season.ts` (`shared/reminders.ts`): one reminder per subscriber at a time, never a backlog, expiring after a window; capped at 200 sends per run. The two results reminders (`results_soon`, `results_out`) are created only for a season with `resultsRemindersEnabled: true`; the 2026 season has it off until the maintainer confirms the results are out or the publication date.
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
