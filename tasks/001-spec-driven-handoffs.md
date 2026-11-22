# 001 — Make implementation handoffs spec-driven

**Status:** Done

## Goal

Give the implementation agent observable requirements before coding and let the reviewer trace each requirement to evidence.

## Context

- `tasks/README.md` and `tasks/TEMPLATE.md` already define the handoff workflow.
- No ADR changes. Use [ADR 0003](../docs/adr/0003-cohort-ladder.md) only as the source for a worked example of already-implemented behavior.
- Use [`cohort_ladder.sql`](../supabase/tests/cohort_ladder.sql) for tier selection and [`statistics.sql`](../supabase/tests/statistics.sql) for disclosure at and below the threshold. Keep the documented rule separate from the exact counts used by individual assertions.

## Scope

- Update `tasks/README.md` and `tasks/TEMPLATE.md`; add a worked example at `tasks/examples/cohort-ladder.md`.
- The orchestrator updates `AGENTS.md` to cover attribution for changes without a task.
- Do not change application code, SQL fixtures, CI, or product rules.

## Acceptance scenarios

| ID | Given / when | Expected result | Verification |
| --- | --- | --- | --- |
| A1 | An author starts a task | The template asks for scenario IDs, conditions or actions, expected results, and planned verification; it separately captures unchanged behavior and open decisions. | Review the template. |
| A2 | A task is prepared, implemented, and reviewed | The README explains when it can be `Ready` and `Done`, what to do if expected behavior is unclear, and how to report verification evidence or gaps per scenario. | Review the README and template together. |
| A3 | A contributor wants to see a filled-out spec | The README links to a clearly labeled reference, not an implementation task; it maps existing cohort scenarios to actual SQL assertions without implying new behavior or exact fixture counts that aren't tested. | Compare the example with the linked ADR and SQL files. |
| A4 | A change is handed off | The task handoff or, for work without a task, the PR description or change summary names the actual LLMs and their contributions, or records `None` if no LLM contributed. Unknown historical attribution is not guessed. | Review `AGENTS.md`, the README, the template, and the example. |

## Must stay unchanged

- Keep the existing status flow, ADR policy, and distinction between product docs, ADRs, and tasks.
- Keep the process lightweight: one scenario can be enough for a small change, and manual verification is allowed.

## Verification

- Review the Markdown and links against the referenced files; run `git diff --check`.
- No application or database tests required for this documentation-only task.

## Handoff

| Scenario | Evidence | Result |
| --- | --- | --- |
| A1 | `tasks/TEMPLATE.md`: scenario table with ID, given/when, expected result, planned verification; separate `Must stay unchanged` and `Open decisions` | pass |
| A2 | `tasks/README.md`: `Ready` and `Done` sections, unclear-behavior rule, per-scenario evidence table with a named assertion requirement, gap reporting | pass |
| A3 | `tasks/README.md` links `examples/cohort-ladder.md` as a reference; all 15 quoted assertions in the example (12 scenarios plus unchanged-behavior citations) exist verbatim in `cohort_ladder.sql` or `statistics.sql`; cited migration files exist | pass |
| A4 | Attribution rule in `AGENTS.md`, `tasks/README.md` section, template handoff line, and example note; this handoff records the actual models | pass |

- Changed files: `AGENTS.md`, `tasks/README.md`, `tasks/TEMPLATE.md`, `tasks/001-spec-driven-handoffs.md`, `tasks/examples/cohort-ladder.md`.
- Checks not run, blockers, or open questions: documentation-only change; application and database tests were not run because no code, SQL, or product rules changed. `git diff --check` is clean and all relative links resolve. Historical cohort-ladder attribution is not recorded and was not guessed.
- LLM contributions:
  - DeepSeek V4.1 Flash Free (`opencode/deepseek-v4.1-flash-free`) — implementation: edited `tasks/README.md`, `tasks/TEMPLATE.md`, and wrote `tasks/examples/cohort-ladder.md`.
  - GPT-6.2 Sol (`openai/gpt-6.2-sol`) — specification and brief, `AGENTS.md` attribution rule, and review of the subagent diff against the acceptance scenarios.
