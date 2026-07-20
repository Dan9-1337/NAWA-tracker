# NAWA Tracker

Polish-first, pseudonymous scholarship questionnaire and privacy-safe community statistics by passport country. The browser talks only to same-origin Vercel Functions. Supabase is accessed server-side with a service-role credential; recovery uses one-time-displayed credentials and HttpOnly cookie sessions rather than accounts or browser storage of recovery codes.

The active questionnaire scope is fixed to three programme tracks (`nawa_director`, `health_minister`, `culture_minister`), two study routes (`preparatory_course`, `direct_studies`), and ten application statuses from `submitted` through `scholarship_awarded` / `scholarship_not_awarded`. These internal values are shared by the browser, API validation, and PostgreSQL constraints; there are no legacy aliases.

Statistics compare declared grades (or the NAWA orientation score for `nawa_director`) within the same scholarship track and ranking citizenship country, with a track-wide fallback when a country cohort is too small. Aggregates are never an official ranking or seat-limit forecast.

## Requirements

- Node.js 20.19 or newer (or 22.12 or newer) and npm
- A Supabase project (remote) **or** Docker Desktop for local Supabase
- A Cloudflare Turnstile widget
- A Vercel account; the lockfile-pinned local Vercel CLI is invoked through `npx vercel`

Remote Supabase is enough for day-to-day work. Local Docker is optional and useful when you want seeded mock data and offline database tests.

## Environment

Copy `.env.example` to `.env.local` and set these values:

| Variable | Scope | Purpose |
| --- | --- | --- |
| `VITE_TURNSTILE_SITE_KEY` | Browser | Public Turnstile widget site key. This is the only frontend-visible variable. |
| `TURNSTILE_SECRET_KEY` | Server | Matching Turnstile secret key. |
| `SUPABASE_URL` | Server | Supabase project URL, such as `https://PROJECT_REF.supabase.co`. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | Supabase secret/service-role key used only by Vercel Functions. |
| `RECOVERY_HMAC_SECRET` | Server | Independent secret for recovery-token HMACs. Minimum 32 characters. |
| `SESSION_HMAC_SECRET` | Server | Independent secret for session-token HMACs. Minimum 32 characters. |
| `IP_HASH_SALT` | Server | Independent secret for transient IP HMACs. Minimum 32 characters. |
| `SESSION_COOKIE_NAME` | Server | Cookie name; use `anonymous_session` unless intentionally changing it. |
| `SESSION_MAX_AGE_DAYS` | Server | Positive session lifetime in days; the default is `180`. |
| `APP_PUBLIC_URL` | Server | Exact public app URL used for Origin checks, Turnstile hostname checks, and recovery links. |
| `DATABASE_URL` | Tests only | PostgreSQL connection string for an isolated, migrated test project. Never point database tests at production. |

All variables except `VITE_TURNSTILE_SITE_KEY` are server-only. Never prefix a secret with `VITE_`, expose `SUPABASE_SERVICE_ROLE_KEY` to the browser, or add real values to tracked files. `SUPABASE_ANON_KEY` is not used: the frontend never connects to Supabase.

Generate each HMAC secret independently, for example with `openssl rand -hex 32`. Do not reuse a value between recovery, session, and IP hashing.

For local Vercel development, use `APP_PUBLIC_URL=http://localhost:3000`. For production, use the exact HTTPS origin with no path, query, fragment, or trailing slash, for example `https://tracker.example.com`. A preview deployment needs its own exact HTTPS `APP_PUBLIC_URL`; arbitrary Vercel preview URLs will fail Origin and Turnstile hostname checks unless that preview environment is configured explicitly.

## Supabase Setup

Create a new Supabase project and copy its project URL and secret/service-role key from **Project Settings > API Keys**. Do not use the publishable/anon key as `SUPABASE_SERVICE_ROLE_KEY`.

Apply the tracked migration through the Supabase CLI against the remote project:

```bash
npx supabase@latest login
npx supabase@latest link --project-ref YOUR_PROJECT_REF
npx supabase@latest migration list
npx supabase@latest db push
npx supabase@latest migration list
```

`db push` applies `supabase/migrations/202607130001_initial_schema.sql` and records it in Supabase migration history. Do not paste tracked migrations into the production SQL Editor or edit production tables manually, because that bypasses migration history. These remote commands do not require Docker.

Verify RLS, policies, and browser-role privileges in the Supabase SQL Editor:

```sql
select
  c.relname,
  c.relrowsecurity as rls_enabled,
  count(p.policyname) as policy_count,
  has_table_privilege('anon', c.oid, 'select,insert,update,delete') as anon_access,
  has_table_privilege('authenticated', c.oid, 'select,insert,update,delete') as authenticated_access
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policies p on p.schemaname = n.nspname and p.tablename = c.relname
where n.nspname = 'public'
  and c.relname in ('responses', 'anonymous_sessions', 'submission_limits')
group by c.relname, c.relrowsecurity, c.oid
order by c.relname;
```

Expected for all three rows: `rls_enabled = true`, `policy_count = 0`, `anon_access = false`, and `authenticated_access = false`. The migration also revokes private RPC execution from `public`, `anon`, and `authenticated` and grants only the required RPCs to `service_role`; `npm run test:db` verifies those contracts dynamically.

## Turnstile

For production, create a Turnstile widget and add every exact hostname that will serve the app, such as `tracker.example.com`. Add a stable Vercel hostname only if it is a supported deployment target. The API requires the hostname returned by Turnstile to equal the hostname in `APP_PUBLIC_URL`, so configure both together.

For local manual testing, use Cloudflare's always-pass visible test pair:

```env
VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
APP_PUBLIC_URL=http://localhost:3000
```

Use the test site key and test secret together. Production secrets reject dummy tokens, and test secrets must never be configured in production.

## Local Development

### Option A — Local Supabase in Docker (seeded mock data)

Requires Docker Desktop. Starts the local stack from `supabase/config.toml`, applies migrations, and loads `supabase/seed.sql`:

```bash
npm install
npm run db:start
npm run local:env
npm run local:dev
```

`npm run local:env` writes `.env.local` with the local API URL, service-role key, Cloudflare always-pass Turnstile keys, and fixed HMAC secrets that match the seeded demo credentials. `npm run local:dev` starts the Vite SPA on port 3000 and a local `/api` server on port 3001 — no Vercel login required. (`npx vercel dev` still works if the project is already linked to a Vercel account.)

Open `http://localhost:3000` and restore the demo applicant:

```text
http://localhost:3000/#restore=AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE
```

That row is `nawa_director` / ranking citizenship `Ukraina` with twelve peers in the same country cohort, so the statistics panel shows detailed aggregates. Reset and re-seed any time with `npm run db:reset`. Stop containers with `npm run db:stop`.

### Option B — Remote development project

Install dependencies, create `.env.local` (copy from `.env.example` or pull from Vercel), apply the migration to a development Supabase project, then start the SPA and API:

```bash
npm install
npm run local:dev
```

Open `http://localhost:3000`. Use `npx vercel link` and `npx vercel env pull .env.local` if the project environment is already managed by Vercel. For a Vercel-linked project you can still use `npx vercel dev --listen 3000` instead. Plain `npm run dev` (Vite alone) is suitable for UI work, but without `local:dev` it only proxies `/api` and needs the local API process.

The session cookie is `HttpOnly`, `SameSite=Lax`, `Path=/`, and gains `Secure` in production. With the current runtime, Vercel preview is non-production, so preview cookies do not include `Secure`. Its `Max-Age` matches `SESSION_MAX_AGE_DAYS`. Browser JavaScript cannot read it. Recovery credentials are displayed after creation or rotation, retained only in memory while that screen is open, and cannot be shown again. Losing both the cookie and saved recovery code permanently loses access. Rotating a recovery code invalidates the old code but does not revoke existing sessions; logout revokes only the current session.

## Database Tests

Use a separate, disposable Supabase project with the migration already applied, or the local Docker database from `npm run db:start` (its `DATABASE_URL` is written by `npm run local:env`). Obtain a remote project's direct or session-pooler PostgreSQL connection string from **Connect**, ensure SSL is required by the connection string, and run:

```bash
DATABASE_URL='postgresql://...' npm run test:db
```

This runs the transactional pgTAP suites, then concurrent rate-limit and credential-rotation checks. The project must support the `pgtap` extension. The command fails clearly when `DATABASE_URL` is absent and must never be run against production because concurrency checks temporarily insert test rows.

Static database contracts are also part of `npm test` and require no database connection.

## Verification

```bash
npm test
npm run typecheck
npm run build
npm run audit:prod
git diff --check
```

GitHub Actions runs the same checks on pushes to `main`/`master` and on pull requests (`.github/workflows/ci.yml`). Database integration tests (`npm run test:db`) stay manual: they need an isolated migrated Postgres with `pgtap` and must never target production.

After `npm run build`, inspect `dist/` for server-only variable names, service-role values, and API implementation code before deployment. Never search by printing real secret values into shell history; use known non-secret markers or a local secret scanner.

## Vercel Deployment

1. Create or link the Vercel project with `npx vercel link`.
2. Set the framework preset to Vite, build command to `npm run build`, and output directory to `dist`; `vercel.json` tracks these settings.
3. Add the ten runtime variables from `.env.example` except `DATABASE_URL` to the Production environment. `VITE_TURNSTILE_SITE_KEY` is public; mark every other non-default value as sensitive.
4. Set `APP_PUBLIC_URL` to the exact final HTTPS origin and add that hostname to the production Turnstile widget.
5. Deploy a preview with `npx vercel`. If testing it end to end, set a preview-scoped `APP_PUBLIC_URL` and matching Turnstile hostname/keys first.
6. Deploy production with `npx vercel --prod`.
7. Test create, recovery-code save, refresh, update without Turnstile, restore in a separate browser profile, rotation, logout, rate limiting, and statistics suppression below ten records.

Add variables in **Vercel > Project > Settings > Environment Variables**, or run `npx vercel env add VARIABLE production` once for each variable. Environment changes require a redeployment. Do not set `DATABASE_URL` in Vercel.

The SPA rewrite excludes `/api` and `/api/*`, so Vercel Functions are never rewritten to `index.html`. Unknown non-API paths return the SPA for client-side navigation.

`vercel.json` also applies browser security headers to every route. The CSP permits same-origin Vite assets and the Cloudflare Turnstile script/frame endpoint, blocks embedding with `frame-ancestors 'none'`, and denies plugins and unexpected form targets. MIME sniffing, referrer transmission, camera, microphone, geolocation, payment, and USB access are disabled. If a new browser-hosted dependency is introduced, update the CSP narrowly and extend `vercel-config.test.ts`; do not replace it with wildcard sources.

## Privacy And Limits

The app collects no account, email, or contact details, but it does not promise perfect anonymity. Supabase and Vercel process questionnaire data, and Cloudflare receives Turnstile verification traffic. The API transiently processes caller IP addresses for Turnstile and HMAC-based abuse controls; raw IPs are not stored by this application. A recovery code is a bearer credential: anyone who obtains it can restore access. Aggregate statistics suppress detailed groups below ten valid, non-suspicious responses, but these controls do not eliminate every re-identification, traffic-analysis, service-provider logging, or abuse risk.
