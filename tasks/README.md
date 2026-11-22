# Implementation tasks

Use this directory for handoffs from the task author to implementation agents. A task is a brief for one reviewable change, not a substitute for product documentation or an ADR.

Start with [AGENTS.md](../AGENTS.md) for **how to work**, check the [ADR index](../docs/adr/README.md) for **what was decided and why**, then write a task for **what to implement and how to verify it**.

1. **Task author (Opus 5.5):** copy [the template](TEMPLATE.md) to `tasks/NNN-short-title.md`, write observable acceptance scenarios, record any required ADR for decisions the maintainer has resolved, and mark the task `Ready`. Opus edits only individual task briefs and ADRs; it does not implement or review the change.
2. **Implementation agent:** read the `Ready` task and [repository instructions](../AGENTS.md), work within the assigned scope, and report changed files, per-scenario evidence, and blockers. Move the task to `In review` when ready for review.
3. **Reviewer (not Opus):** review the diff, check the evidence against the scenarios, run the necessary integration checks, and mark the task `Done` when the acceptance scenarios pass and the unchanged behavior still holds.

The implementation agent and reviewer update status and handoff evidence, not the requirements or acceptance scenarios.

## Ready

A task can be `Ready` when:

- every acceptance scenario has an ID, a condition or action, an expected result, and a planned verification;
- **Must stay unchanged** names the behavior or contracts the change must not alter;
- **Open decisions** is empty (`None`): product choices are settled before handoff, not left to the implementation agent;
- scope, assigned files, and linked ADRs are explicit.

One scenario is enough for a small change. Manual verification is allowed: name the step and the expected observation.

## Done

A task is `Done` when the reviewer can trace every scenario ID to evidence. The handoff reports evidence per scenario, for example:

| Scenario | Evidence | Result |
| --- | --- | --- |
| A1 | `npm test -- src/example.test.ts` → `rejects an empty draft` | pass |
| A2 | Manual: opened the dashboard as a returning user | pass |

A passing suite is not evidence for a scenario unless the handoff names the assertion or check that covers it. Checks that were not run, and any remaining gaps, are listed with a reason; a gap does not become a pass because a nearby test is green. Before `Done`, the handoff also records the actual LLM contributions described below.

## If expected behavior is unclear

Do not infer a product decision from code, copy, or existing tests. Ask the maintainer to decide. If the decision is not settled, leave the task in `Draft` before handoff or move it to `Blocked` during work, and record the question under **Open decisions**. If the answer changes scope or expected behavior, the task author updates the brief and confirms it is `Ready` again before implementation continues.

## LLM contributions

The handoff records the actual model(s) that worked on the change and what each contributed: specification, implementation, or review edits. Write `None` when no LLM contributed. Record what happened, not the intended assignments in [AGENTS.md](../AGENTS.md); those assignments are workflow conventions. For a change without a task, put the same note in the pull request description or change summary, and do not guess attribution for earlier work.

## Worked example

[Reference example: cohort ladder](examples/cohort-ladder.md) is a filled-out spec for behavior that already exists. It is a reference, not a task: it shows how scenario IDs map to SQL assertions and does not request changes to the cohort ladder.

Statuses: `Draft` → `Ready` → `In progress` → `In review` → `Done`. Use `Blocked` when a decision or dependency prevents progress.

If a task changes an accepted ADR, link both the old decision and its replacement. If the replacement is not decided yet, leave the task in `Draft` or `Blocked`. Several tasks can implement the same ADR; keep implementation steps in the tasks.
