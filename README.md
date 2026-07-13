# NAWA Tracker

Polish-first, anonymous scholarship questionnaire and privacy-safe community statistics. The browser talks only to same-origin Vercel Functions. Supabase is accessed server-side with a service-role credential; recovery uses one-time-displayed credentials and HttpOnly cookie sessions rather than accounts or browser storage.

The active questionnaire scope is fixed to three programme tracks (`nawa_mnisw`, `minister_health`, `minister_culture`), two study routes (`preparatory_course`, `direct_studies`), and two study types (`first_cycle`, `uniform_masters`). These internal values are shared by the browser, API validation, and PostgreSQL constraints; there are no legacy aliases.

The university autocomplete is intentionally limited to this small canonical set: Uniwersytet Warszawski, Uniwersytet Jagielloński, Politechnika Warszawska, Akademia Górniczo-Hutnicza w Krakowie, Uniwersytet im. Adama Mickiewicza w Poznaniu, Politechnika Wrocławska, Uniwersytet Wrocławski, Uniwersytet Gdański, Warszawski Uniwersytet Medyczny, and Akademia Sztuk Pięknych w Warszawie. The browser and API reject universities outside this shared allowlist so aggregate groups use consistent names. Study-field values remain free text.

## Requirements

- Node.js 20.19 or newer (or 22.12 or newer) and npm
- A Supabase project
- A Cloudflare Turnstile widget
- A Vercel account; the lockfile-pinned local Vercel CLI is invoked through `npx vercel`

Docker and a local Supabase stack are not required. The instructions below apply migrations and run integration tests against remote Supabase projects.

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

Install dependencies, create `.env.local`, apply the migration to a development Supabase project, then start the complete SPA and API runtime:

```bash
npm install
npx vercel dev --listen 3000
```

Open `http://localhost:3000`. Use `npx vercel link` and `npx vercel env pull .env.local` if the project environment is already managed by Vercel. Because `vercel` is a locked development dependency, these commands use the repository's installed CLI version rather than downloading the latest release. Plain `npm run dev` starts Vite only and is suitable for UI work, but it does not provide the `/api` functions.

The session cookie is `HttpOnly`, `SameSite=Lax`, `Path=/`, and gains `Secure` in production. With the current runtime, Vercel preview is non-production, so preview cookies do not include `Secure`. Its `Max-Age` matches `SESSION_MAX_AGE_DAYS`. Browser JavaScript cannot read it. Recovery credentials are displayed after creation or rotation, retained only in memory while that screen is open, and cannot be shown again. Losing both the cookie and saved recovery code permanently loses access. Rotating a recovery code invalidates the old code but does not revoke existing sessions; logout revokes only the current session.

## Database Tests

Use a separate, disposable Supabase project with the migration already applied. Obtain its direct or session-pooler PostgreSQL connection string from **Connect**, ensure SSL is required by the connection string, and run:

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
