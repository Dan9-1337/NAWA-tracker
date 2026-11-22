# Implementation tasks

Use this directory for handoffs from the orchestrator to implementation agents. A task is a brief for one reviewable change, not a substitute for product documentation or an ADR.

Start with [AGENTS.md](../AGENTS.md) for **how to work**, check the [ADR index](../docs/adr/README.md) for **what was decided and why**, then write a task for **what to implement and how to verify it**.

1. The orchestrator copies [the template](TEMPLATE.md) to `tasks/NNN-short-title.md`, settles open decisions, and marks the task `Ready`.
2. The implementation agent reads the task and [repository instructions](../AGENTS.md). It works within the assigned scope and reports changed files, checks run, and blockers. If a requirement is unclear or conflicts with the repository, it asks the orchestrator rather than making a product decision.
3. The orchestrator reviews the diff, runs the necessary integration checks, and marks the task `Done` once the acceptance criteria are met.

Statuses: `Draft` → `Ready` → `In progress` → `In review` → `Done`. Use `Blocked` when a decision or dependency prevents progress.

If a task changes an accepted ADR, link both the old decision and its replacement. If the replacement is not decided yet, leave the task in `Draft` or `Blocked`. Several tasks can implement the same ADR; keep implementation steps in the tasks.
