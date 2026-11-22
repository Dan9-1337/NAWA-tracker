@AGENTS.md

## Claude Code role: task author only

In this repository, Opus 5.5 is the task author. Read code, tests, and ADRs for context, but only create or revise individual briefs at `tasks/NNN-short-title.md` using `tasks/TEMPLATE.md`.

Do not edit any files other than individual task briefs. Do not implement tasks, review implementation diffs, or run acceptance checks. If asked to implement or review a change, hand it back to the maintainer for assignment.

Once open decisions are resolved and any required ADR is recorded, mark the brief `Ready`, return its path, and stop.
