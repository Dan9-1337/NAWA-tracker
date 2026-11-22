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

## Task author, implementation agents, and reviewer

- **Task author (Opus 5.5 in Claude Code): specification only.** Read the repository for context and create or revise individual task briefs in [`tasks/`](tasks/README.md). Do not write or edit implementation code, tests, migrations, configuration, ADRs, or any other files outside the task brief. Do not implement the task, review implementation diffs, or run acceptance checks. Ask the maintainer to resolve open product decisions before marking the task `Ready`; do not leave them for the implementation agent to infer.
- Link the relevant [ADRs](docs/adr/README.md) from the task. If the task changes an accepted decision or introduces a lasting product or architecture rule, the maintainer records the decision in a new ADR before the task author marks it `Ready`. Routine fixes and refactors do not need a new ADR.
- **Implementation agent (DeepSeek V4.1 Flash by default):** follow the `Ready` task and this file, implement only the assigned scope, run verification, and report changed files, results, and blockers.
- Delegate in parallel only when file ownership does not overlap. If tasks depend on a shared contract or migration, settle that dependency first.
- **Reviewer (maintainer or assigned reviewer, not Opus):** review the diff against the acceptance criteria, verify the integrated result, and mark the task `Done`. Send code changes back to the implementation agent. Role assignments are workflow instructions, not tool permissions.
- Record the actual LLM model(s) and what each contributed (for example, specification, implementation, or review edits) in the task's `LLM contributions` handoff. For changes without a task, record this in the PR description or, if there is no PR, in the change summary. Use `None` if no LLM contributed; don't guess attribution for past work.

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
