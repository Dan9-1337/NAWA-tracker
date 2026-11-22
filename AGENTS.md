# NAWA Tracker — repository instructions

NAWA Tracker is a Telegram Mini App for scholarship questionnaires and community score comparisons. Keep changes scoped to the task; do not bundle unrelated refactors or product changes.

## Where to start

| Area | Code | Context |
| --- | --- | --- |
| Questionnaire, dashboard, translations | `src/`, `src/i18n/` | [Product flow](docs/product-flow.md) |
| Scoring, validation, API contracts | `shared/` | [Product flow](docs/product-flow.md) |
| Telegram authentication, bot, Vercel API | `api/` | [Architecture](docs/architecture.md) |
| Schema, RPCs, statistics | `supabase/migrations/`, `supabase/tests/` | [Architecture](docs/architecture.md), [ADR index](docs/adr/README.md) |
| Local setup and test commands | `Makefile`, `package.json` | [README](README.md), [Testing](docs/testing.md) |

## Orchestrator and implementation agents

- The orchestrator (Opus 5.5) writes an implementation brief in [`tasks/`](tasks/README.md) before delegating coding work. Resolve product decisions before handing off the task; do not leave them for the implementation agent to infer.
- Link the relevant [ADRs](docs/adr/README.md) from the task. If the task changes an accepted decision or introduces a lasting product or architecture rule, record the decision in a new ADR before marking the task `Ready`. Routine fixes and refactors do not need a new ADR.
- Implementation agents (DeepSeek V4.1 Flash) follow the task and this file, implement only the assigned scope, and report changed files, verification results, and blockers.
- Delegate in parallel only when file ownership does not overlap. If tasks depend on a shared contract or migration, settle that dependency first.
- The orchestrator reviews the diff against the acceptance criteria and verifies the integrated result. Model assignments are workflow conventions, not runtime configuration.

## Guardrails

- Use local fixtures and fake Telegram/API dependencies by default. Do not deploy, modify a remote database, register a webhook, or send real Telegram messages without explicit authorization for that action.
- Never expose or commit secrets. Use `.env.example` to discover configuration; do not copy `.env.local` values into logs, tests, or responses. The browser calls same-origin API handlers; the Supabase service-role key stays server-side.
- Preserve server-side verification of Telegram `initData` on protected app routes. Survey identity is pseudonymous, not anonymous. Keep raw Telegram IDs out of survey data and public output; opt-in bot subscriptions are the separate exception.
- Community statistics are aggregates, not an official ranking or a forecast of scholarship places. Do not change disclosure thresholds or fallback behavior as part of an unrelated task.
- Add a new migration for database changes rather than editing migration history. When changing a rule or contract shared by TypeScript and SQL, update both implementations and their tests. Update the architecture changelog for new migrations.

## Verification

- Use the Node version required by `package.json` and install locked dependencies with `npm ci` if needed.
- Run the relevant tests first (`npm test -- path/to/test`), then `make check` for application code changes.
- For SQL changes, run `npm run test:db:pglite` (no Docker); CI also runs the PostgreSQL/pgTAP suite. Never point tests at production.
- For UI changes, check first-time and returning users and keep locale keys in sync. `make dev-new` and `make dev` overwrite `.env.local` and stop processes on ports 3000/3001; check before using them.
- Report what you verified and what you could not run.
