# Testing

Four layers, from fastest to most realistic. Everything except the last runs without Docker.

| Layer | Command | What it covers |
| --- | --- | --- |
| Unit and component tests | `npm test` | Shared rules (`shared/`), API handlers with injected dependencies (`api/`), React screens (`src/`), locale parity, migration contracts |
| Database tests on PGlite | `npm run test:db:pglite` | Every migration applied in order, the pgTAP-style SQL tests, and the development seed |
| Types and build | `npm run typecheck`, `npm run build` | The whole TypeScript project and the production bundle |
| Database tests on PostgreSQL | `DATABASE_URL=... npm run test:db` | The same SQL tests with real pgTAP (CI only) |

## Unit and component tests

Vitest with jsdom (`vitest.config.ts`, `src/test/setup.ts`). The setup installs an in-memory `localStorage` when the
runtime's own is unusable (Node 25+), so no environment flag is needed.

- **API handlers** take their dependencies as arguments (`getClient`, `hashIdentity`, `requireTelegramIdentity`, the bot's
  `send` and `store`, the cron's `now` and `sleep`), so tests inject fakes and never reach Supabase or Telegram.
- **Migration contracts** (`supabase/tests/migration-contracts.test.ts`) assert on the SQL text of each migration: what it
  drops, which privileges it revokes, which tables carry a Telegram id. They are cheap guards for the privacy promises.
- **Locales** (`src/i18n/locales.test.ts`) check that every language has exactly the keys of Polish, keeps function
  arity, and that Ukrainian and Belarusian contain no Russian-only spellings.
- **Pure logic is extracted on purpose**: screen rules live in plain modules (`src/lib/draft-rules.ts`, `src/features/dashboard-chrome.ts`, `shared/reminders.ts`) and hooks (`useGuardedSubmit`, `useRequestGuard`), so they have direct unit tests instead of only being exercised through a screen.
- **Parity tests** keep the two implementations of the score formula (`shared/nawa-score.ts` and
  `public.compute_orientation_score`) on the same fixtures.

## Database tests on PGlite

`supabase/tests/run-pglite-tests.mjs` boots PostgreSQL compiled to WebAssembly, creates the Supabase roles, applies
`supabase/migrations/*.sql` in order, installs `supabase/tests/pgtap-shim.sql` (a minimal `plan`, `ok`, `is`,
`lives_ok`, `throws_ok`, `finish`), runs every file in `supabase/tests/test-files.mjs`, and finally loads
`supabase/seed.sql` and checks that the seeded applicants hit each branch of the cohort ladder.

It is an approximation of production: no real pgTAP, no real `pgcrypto`, a single connection. CI therefore still runs the
real suite against `supabase/postgres`.

### Writing a SQL test

1. Create `supabase/tests/<name>.sql` that starts with `begin;`, `select plan(N);`, ends with `select * from finish(); rollback;`
   and uses only `ok`, `is`, `lives_ok`, `throws_ok`.
2. Account keys are 64-hex strings: define `create function pg_temp.h(bigint) returns text ... lpad(to_hex($1), 64, '0')`
   as the existing tests do.
3. Add the file to `supabase/tests/test-files.mjs`.
4. A throwing test aborts its transaction; the runner rolls back and continues, but fix the first failure first.

If you need another pgTAP function, add it to the shim *and* confirm it exists in real pgTAP.

## CI

| Workflow | When | What |
| --- | --- | --- |
| `ci.yml` job `verify` | every push to `main` and every pull request | unit tests, PGlite database tests, catalog validation, typecheck, production build, gzip bundle budget (`scripts/check-bundle-size.mjs`: JS 190 kB, CSS 12 kB) |
| `ci.yml` job `database` | same | migrations and pgTAP tests on `supabase/postgres` |
| `security.yml` job `secrets` | same, plus Mondays | gitleaks over the full history (`.gitleaks.toml` allowlists documented placeholders) |
| `security.yml` job `dependencies` | same, plus Mondays | `npm run audit:prod`, so a new advisory fails here instead of blocking unrelated pull requests |
| Dependabot (`.github/dependabot.yml`) | weekly | one grouped pull request for minor and patch updates of npm packages and GitHub Actions |

Actions are pinned to commit SHAs (Dependabot keeps them current) and workflows run with read-only `contents` permission.
Make `Verify`, `Database tests` and `Secret scan (gitleaks)` required checks on `main` in the repository's branch protection.
Deploys are handled by the Vercel Git integration, not by these workflows.

## Manual checks that no automated test covers

- Open the Mini App in Telegram (or `make dev` with Docker) and walk through: first-time wizard, returning dashboard,
  the three tabs in light and dark at 390 px width, all five languages.
- Real bot: register the webhook (README), send `/start`, `/subscribe`, `/stop`, block the bot and check the
  subscription disappears; trigger `/api/cron/reminders` with the cron secret.
- Ukrainian and Belarusian copy should be read by a native speaker before a release.
