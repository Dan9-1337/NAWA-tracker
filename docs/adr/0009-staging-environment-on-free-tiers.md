# 0009. A staging environment on free tiers, checked by smoke tests

Status: Accepted

## Context

The app runs only locally (Docker) and in CI; there is no deployed production, no live bot, and no real
questionnaires. The bot, the Mini App inside the Telegram WebView, `initData` signing, and the cron routes cannot be
checked anywhere but on a real deployment with a real bot. Hosting must stay free ([0001](0001-telegram-mini-app-on-vercel-and-supabase.md)).
On those free tiers, Vercel Hobby runs crons only on production deployments, every branch gets a preview build, and
a Supabase Free project pauses after about a week without requests. Work lives in a long-running PR with no branching
rules yet.

## Decision

- Four environments, with these names: **local**, **CI**, **staging**, **production**. "Preview" is the Vercel
  mechanism, not an environment. Staging is the single preview built from branch `staging`.
- Staging is the Vercel branch URL of `staging`, a separate **staging bot**, and its own Supabase Free project seeded
  from `supabase/seed.sql`. It never shares a bot, a database, or secrets with production. Previews of other branches
  get no server configuration and are not used.
- `staging` is a pointer branch: the maintainer force-pushes whatever should be tested onto it. Nobody commits to it
  or merges into it, so staging does not depend on branching rules.
- GitHub Actions does what Vercel Hobby cannot:
  - on push to `staging`, apply migrations to the staging database, wait for the deployment of that commit, and run
    smoke tests against it;
  - ping the staging keep-alive daily;
  - reset the staging database on manual confirmation.

  Staging reminders are never scheduled.
- Smoke tests check the deployed staging from outside:
  - the page is served;
  - the auth guards reject unauthenticated calls;
  - a signed round trip as a fake persona creates, reads, scores, and deletes a profile;
  - the staging bot's webhook points at staging.

  A failure turns the workflow red; nothing is rolled back.
- Staging follows the production privacy rules ([0002](0002-pseudonymous-identity.md)): testers' data is personal
  data, and a reset is an accepted way to erase it. Because the repository is public, workflow logs show only
  pass/fail per check, and the staging URL is a secret.

## Consequences

- The bot and the Mini App can be tested in Telegram before any production exists, at no cost.
- Staging uses one of the two free Supabase projects; the other is kept for production.
- The staging database credential and the staging bot token live in a GitHub Environment. Production secrets are never
  added to GitHub.
- Migrations only move forward. Pointing `staging` at a branch with a diverged migration history needs a manual reset.
- Until production is launched, Vercel's production builds of `main` have no configuration and their crons fail
  harmlessly.

## Alternatives considered

- Local stack with a tunnel to a test bot (free, but works only while a laptop runs it, and gives testers no stable
  link).
- A second Vercel project for staging (stable URL and crons, but two projects to keep in sync).
- Sharing one database between staging and production (no isolation, and test data would leak into the statistics).
- Paid plans (against 0001).
