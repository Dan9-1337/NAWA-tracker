# 006 — Staging environment (staging bot + staging database) and smoke tests

**Status:** Ready

## Goal

Today the app runs only locally (Docker stack) and in CI. There is no deployed production yet: no live bot, no real questionnaires, and no Supabase project. Bot and Mini App changes therefore cannot be checked in a real Telegram client at all.

Add **staging** as the first cloud environment, built entirely on free tiers:

- the Git branch `staging` deploys to its stable Vercel Preview branch URL (`<project>-git-staging-<scope>.vercel.app`);
- a separate Telegram bot, the **staging bot** (working name `@nawa_tracker_staging_bot`; the username is configuration, not code), points its Menu Button, Main Mini App and webhook at that URL;
- a Supabase Free project (staging database) holds the schema and `supabase/seed.sql` demo data;
- GitHub Actions applies migrations to the staging database on every push to `staging`, waits for the matching Vercel deployment, and runs **smoke tests** against the deployed URL;
- a daily scheduled workflow pings the staging keep-alive, because Vercel Hobby runs `vercel.json` crons only on production deployments, and a paused Supabase Free project would break staging;
- a manual workflow resets the staging database to migrations + seed.

Production does not exist yet. Its future setup (Production env, manual `supabase db push`, `vercel.json` crons) is documented in the README and stays unchanged; this task does not create it. The production guard below protects the production that will exist later.

### Environments (canonical terms)

| Term | What it is |
| --- | --- |
| **local** | Docker Supabase + `make dev` / `make dev-new`, fixed dev bot token |
| **CI** | Ephemeral PGlite / `supabase/postgres` inside GitHub Actions, no deployment |
| **staging** | The Vercel deployment of branch `staging` + the staging bot + the staging database |
| **production** | The Vercel Production deployment + the production bot + the production database (not created yet) |

"Preview" is a Vercel mechanism, not an environment. Staging is one specific preview, the one built from branch `staging`. Previews of every other branch, including `feat/tracker-poc` (PR #1), get no server env vars: they serve only the static page, their API answers 500, and nobody uses them in Telegram. This is intentional.

Staging follows the same privacy rules as production ([ADR 0002](../docs/adr/0002-pseudonymous-identity.md)). Testers are the maintainer and a few trusted people, and their staging questionnaires and `bot_subscriptions` rows are real personal data. The `reset` workflow is an accepted way to erase them.

### `staging` is a deploy pointer, not a merge target

Nothing is merged into `main` yet: all work lives in PR #1 (`feat/tracker-poc`) until there is a working version, and no branching rules are decided. Staging must therefore not depend on merges or on branch protection:

- `staging` is a branch that nobody commits to or merges into. The maintainer points it at whatever should be tested: `git push --force-with-lease origin <branch>:staging` (today `feat/tracker-poc:staging`).
- `staging.yml` triggers on `push` to `staging`, force-pushes included. It does not trigger on pull requests or on `main`.
- Force-pushing an older branch does not roll back the staging database, because `supabase db push` only moves forward. When `migrate` fails because the migration history diverged, `migrate` exits with a message that points to the `reset` workflow. That run fails; it does not reset the database itself.
- When branching rules are decided later (for example, `staging` follows `main`), only the runbook line changes. The workflow does not.

### Smoke test definition

A Node script that runs against a deployed base URL and exits non-zero on the first failed check. The checks, in order:

1. **Page:** `GET /` → `200`, `content-type` text/html, body contains the app root element. A Vercel Authentication wall (401 or a vercel.com login page) fails this check with a message that says Deployment Protection must be off for Preview.
2. **Webhook guard:** `POST /api/bot` without `X-Telegram-Bot-Api-Secret-Token` → `401`. A `503` means `TELEGRAM_WEBHOOK_SECRET` is missing in the staging env, and the script reports it as such.
3. **Cron guard:** `GET /api/cron/keep-alive` without a bearer token → `401`. The same call with `Authorization: Bearer $CRON_SECRET` → `200` and `{ ok: true }` (this proves the server can reach the staging database).
4. **Authenticated round trip** as a fixed smoke persona (a constant fake Telegram user id defined in the script, distinct from the seed personas `900000001` and `900000002`). The initData is signed at run time with the staging bot token, and the `Origin` is the staging URL:
   - `DELETE /api/responses` first, accepting `200` or profile-not-found (this cleans up a previous aborted run);
   - `POST /api/responses` with a valid fixture questionnaire for the active intake → `2xx` and a result that parses with the shared contract schema;
   - `POST /api/responses/current` → returns the profile just created;
   - `POST /api/statistics` → parses with the shared statistics schema;
   - `POST /api/intake-summary` → parses with its shared schema;
   - `DELETE /api/responses` → `200`, `{ deleted: true }`. Cleanup runs even when an earlier step of the round trip fails.
5. **Bot registration** (read-only Telegram Bot API): `getWebhookInfo` for the staging bot → `url` equals `$STAGING_APP_URL/api/bot`. `last_error_message`, if present, is printed as a warning and does not fail the run.

Output and failure handling:

- The repository is public, so workflow logs are public. Per check, the script prints only the check name, pass/fail, and a short reason (HTTP status or the name of the failed assertion). It never prints response bodies, the bot token, the secrets, the full initData, or the staging URL.
- `STAGING_APP_URL` is stored as a GitHub **secret**, not a variable, so GitHub masks it in logs.
- A failed smoke run means a red workflow and GitHub's standard failure email. There is no auto-rollback, no Telegram alert, and no issue creation.

### Production guard

The smoke script and the staging workflows must be unable to touch production:

- The base URL comes only from `STAGING_APP_URL` (GitHub Environment `staging`). The script refuses to run when the URL is not HTTPS, or when its hostname does not contain `-git-staging-`.
- Every secret comes from the GitHub Environment `staging`. No production secret is added to GitHub.
- Signed initData from the staging bot token is rejected by production by design. This is a second line of defence, not the only one.

## Context

- Relevant code and docs: `api/_lib/env.ts` (already distinguishes `VERCEL_ENV=preview`), `api/_lib/telegram-auth.ts`, `api/_lib/cron-auth.ts`, `api/bot.ts`, `api/responses.ts`, `api/responses/current.ts`, `api/statistics.ts`, `api/intake-summary.ts`, `api/cron/keep-alive.ts`, `shared/contracts.ts`, `scripts/write-local-env.mjs` (`signTelegramInitData`), `scripts/ci-prepare-database.sh`, `.github/workflows/ci.yml`, `vercel.json`, `README.md` (Telegram Bot setup, Supabase Setup, Vercel Deployment), `docs/testing.md`.
- ADRs this task follows or replaces: [0009](../docs/adr/0009-staging-environment-on-free-tiers.md) (the staging environment; this task implements it), [0001](../docs/adr/0001-telegram-mini-app-on-vercel-and-supabase.md) (free tiers; staging must stay on them), [0002](../docs/adr/0002-pseudonymous-identity.md) (smoke persona goes through the same hashing), [0006](../docs/adr/0006-opt-in-bot-reminders.md) (reminders are not scheduled in staging).
- Decisions already made by the maintainer:
  - option A: a cloud staging on a Vercel Preview branch URL plus a Supabase Free project, not a local tunnel;
  - staging data comes from `supabase/seed.sql`, with a manual reset;
  - smoke tests run against staging only; no production smoke (there is no production);
  - migrations reach staging through a GitHub Action on push to `staging`;
  - staging keep-alive runs daily from GitHub Actions; staging reminders run only by manual `curl` with `CRON_SECRET`, never on a schedule;
  - `staging` is a force-pushed pointer branch, independent of PR #1 and `main`;
  - the environment terms, the preview rule, the privacy rule, and the log and failure rules above;
  - the staging bot's working name is `@nawa_tracker_staging_bot`. The maintainer may pick another username; only env values and the runbook text change;
  - the production bot name, the production Supabase project, and Vercel's production builds of `main` (no env, cron fails harmlessly) are deferred until launch. This task does not touch them;
  - **order (2026-11-22): implement this task last.** Start it only once tasks 002, 003, 004, 005 and 007 are `Done`, so that the smoke tests run against the final API, migrations and copy. Task 007 changes the API error messages to English ([ADR 0010](../docs/adr/0010-locale-glossary-and-english-api-errors.md)). Smoke assertions check error `code` and HTTP status, not message text.
- Facts confirmed by the maintainer (2026-11-22): no deployed production, no real questionnaires, no existing Supabase project. Facts checked by the task author: the repository is public, and the Vercel Git integration already reports Preview deployments to GitHub with `ref` = commit SHA.

## Scope

- In scope:
  - `scripts/lib/telegram-init-data.mjs`: move `signTelegramInitData` here from `scripts/write-local-env.mjs` (its output is unchanged), and import it from both places.
  - `scripts/smoke.mjs`: the smoke test above. Config from env: `SMOKE_BASE_URL`, `SMOKE_BOT_TOKEN`, `SMOKE_CRON_SECRET`. A `--skip-bot-api` flag skips check 5 for local runs.
  - `scripts/smoke.test.ts`: unit tests with an injected fake `fetch`. They cover every check, the production guard, cleanup after a failed step, and the no-secrets-in-output rule.
  - `.github/workflows/staging.yml`, using GitHub Environment `staging`, SHA-pinned actions and minimal permissions like `ci.yml`:
    - job `migrate` (push to `staging`): link the staging project and run `supabase db push`;
    - job `smoke` (needs `migrate`): poll the GitHub Deployments API until the Vercel deployment for the pushed SHA (`ref` = SHA, environment `Preview`) reaches a final state (timeout 10 min, `deployments: read`). On `success`, continue. On `failure` or `error`, fail at once with "Vercel deployment failed" instead of waiting for the timeout, then run `node scripts/smoke.mjs` against `STAGING_APP_URL`;
    - job `keep-alive` (schedule, daily, plus `workflow_dispatch`): `GET $STAGING_APP_URL/api/cron/keep-alive` with the bearer token, failing on non-200;
    - job `reset` (`workflow_dispatch` only, with a required `confirm` input equal to `reset-staging`): `supabase db reset --linked` against the staging project, which reapplies migrations and the seed.
  - An npm script `smoke` → `node scripts/smoke.mjs`.
  - Docs: a `Staging` section in `README.md`, written as a one-time runbook for the maintainer:
    - create the staging bot in BotFather (`/setmenubutton`, Main Mini App, `/setcommands`) and register its webhook with the existing `setWebhook` command against the staging URL;
    - create the second Supabase Free project;
    - set Vercel Preview env vars scoped to the `staging` branch: all server vars with staging values, a new `IDENTITY_PEPPER`, `APP_PUBLIC_URL` = branch URL, `VITE_TELEGRAM_BOT_USERNAME` = staging bot;
    - turn Vercel Authentication off for Preview deployments;
    - create the GitHub Environment `staging` with `STAGING_APP_URL`, `STAGING_BOT_TOKEN`, `STAGING_CRON_SECRET`, `SUPABASE_ACCESS_TOKEN`, `STAGING_SUPABASE_PROJECT_REF`, `STAGING_SUPABASE_DB_PASSWORD`;
    - run reminders by hand.
  - Docs: add the staging workflows and the smoke layer to `docs/testing.md` (layers table, CI table). Move "Real bot" from manual-only checks to "staging, with the staging bot".
- Out of scope:
  - production smoke tests (there is no production yet; see ADR 0009);
  - automating production migrations;
  - BotFather, Supabase, Vercel or GitHub settings themselves. The maintainer does these by hand, following the runbook;
  - any change to `api/`, `shared/`, `src/`, `supabase/migrations/`, `vercel.json` or `.github/workflows/ci.yml`. If the smoke test cannot work without a code change, stop and report it as a blocker.
- Files or directories assigned to this task: `scripts/lib/telegram-init-data.mjs`, `scripts/write-local-env.mjs` (import only), `scripts/smoke.mjs`, `scripts/smoke.test.ts`, `.github/workflows/staging.yml`, `package.json` (`scripts.smoke` only), `README.md`, `docs/testing.md`, `.env.example` (comment block documenting the `SMOKE_*` vars, empty values).

## Acceptance scenarios

| ID | Given / when | Expected result | Planned verification |
| --- | --- | --- | --- |
| A1 | `npm run local:env` after the signer moves to `scripts/lib/` | `.env.local` holds byte-identical `VITE_TELEGRAM_DEV_INIT_DATA` for the same persona and token (apart from `auth_date`) | Unit test: shared signer with fixed `auth_date` returns a known-good string; existing `api/_lib/telegram-auth.test.ts` verification of signed data still passes |
| A2 | Smoke against a fake server where all routes behave as in production code | Exit code 0; each check printed as passed | `scripts/smoke.test.ts` |
| A3 | `GET /` returns 401 or a Vercel login page | Exit non-zero, message names Deployment Protection | `scripts/smoke.test.ts` |
| A4 | `POST /api/bot` without secret returns 503 | Exit non-zero, message names missing `TELEGRAM_WEBHOOK_SECRET` | `scripts/smoke.test.ts` |
| A5 | `POST /api/statistics` fails mid round trip | `DELETE /api/responses` is still sent for the smoke persona; exit non-zero | `scripts/smoke.test.ts` (fake fetch records calls) |
| A6 | `SMOKE_BASE_URL` is `http://…`, or its host lacks `-git-staging-` | Script exits non-zero before any request | `scripts/smoke.test.ts` (fake fetch never called) |
| A7 | Any run, passing or failing | Bot token, cron secret, and the initData `hash` never appear in stdout/stderr | `scripts/smoke.test.ts` captures output and asserts absence |
| A8 | `getWebhookInfo` URL differs from `$STAGING_APP_URL/api/bot` | Exit non-zero; `last_error_message` alone only warns | `scripts/smoke.test.ts` |
| A9 | `staging.yml` is valid and secret-safe | Uses Environment `staging`, SHA-pinned actions, minimal `permissions`; `reset` requires the `confirm` input; no production secret names | Review + `actionlint` if available (manual: report if not run) |
| A10 | Maintainer completed the runbook, pushes to `staging` | `migrate` then `smoke` succeed in GitHub Actions; the staging bot's Menu Button opens the staging Mini App with seed data visible | Manual, by maintainer after pushing the implementation onto `staging`: workflow run link + Telegram check |
| A11 | Scheduled `keep-alive` fires | Job succeeds; staging Supabase not paused after 7+ days | Manual, by maintainer: workflow history |
| A12 | `supabase db push` in `migrate` fails on a diverged migration history | Job fails with a message naming the `reset` workflow; no reset runs automatically | Review of `staging.yml` (manual: maintainer confirms the message on the first divergence) |
| A13 | The Vercel deployment for the pushed SHA reports `failure` | `smoke` fails within one poll interval with "Vercel deployment failed"; the smoke script is not run | Review of `staging.yml` |

## Must stay unchanged

- Production: Vercel Production env, `vercel.json` crons, manual production migrations, the production bot and its webhook.
- `ci.yml` jobs `verify` and `database`, and `security.yml`. They keep running on every PR without staging secrets, so forks and PRs need no secrets.
- `initData` verification, Origin checks, cron auth, and webhook secret checks in `api/`. The smoke test exercises them; it does not loosen them.
- Local dev (`make dev`, `make dev-new`, `npm run local:env`) behaves as before.
- No raw Telegram id is written to survey data. The smoke persona leaves no `bot_subscriptions` row and no `responses` row after a run.

## Open decisions

- None.

## Verification

- `npm test -- scripts/smoke.test.ts` → A2–A8.
- `npm test -- api/_lib/telegram-auth.test.ts` plus the new signer unit test → A1.
- `make check` → whole suite and typecheck still green.
- `actionlint .github/workflows/staging.yml` if installed; otherwise state it was not run → A9. Review of the workflow → A12, A13.
- Do **not** run the workflows, call the real staging URL, call the Telegram Bot API, or touch any Supabase project. A10 and A11 are the maintainer's post-merge checks.

## Handoff

| Scenario | Evidence (command, test assertion, or manual check) | Result |
| --- | --- | --- |
| A1 | | |
| A2 | | |
| A3 | | |
| A4 | | |
| A5 | | |
| A6 | | |
| A7 | | |
| A8 | | |
| A9 | | |
| A10 | | |
| A11 | | |
| A12 | | |
| A13 | | |

- Changed files:
- Checks not run, blockers, or open questions:
- LLM contributions: Opus 5.5 (Claude Code) — specification of this brief, plus the text of ADR 0009 (`docs/adr/0009-staging-environment-on-free-tiers.md` and its index row). The maintainer explicitly asked for the ADR as a one-off exception to the task-author-only rule. Implementation and review: to be filled in.
