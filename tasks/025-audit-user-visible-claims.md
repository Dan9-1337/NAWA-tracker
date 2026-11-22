# 025 — Audit what the app tells users against the assumptions file

**Status:** Ready

## Goal

The maintainer wants to check what the product actually shows and promises to users against
[`docs/assumptions.md`](../docs/assumptions.md). This is a **report-only** task: list every place where a screen, a
copy string, a bot message or a user-facing doc says something that contradicts an assumption, or that no assumption
covers. Change no code and no copy.

Intended behavior:

- Go through every user-visible surface: start screen, wizard, result/dashboard card, what-if, distribution,
  Settings, privacy notice, FAQ/about, error messages, bot messages and reminders, the gate screen, `README.md`, and
  `docs/product-flow.md`.
- For each claim about scoring, cohorts, thresholds, privacy, data retention, scope or officialness, compare it with
  the assumptions file. Read the Russian copy as primary and spot-check the other four locales for meaning drift.
- Write the result as a table appended to the Handoff of this brief, one row per finding:
  `surface / key or file | what it says | assumption it conflicts with (or "not covered") | already handled by task NNN? | suggested fix`.
- Findings already covered by tasks 012 or 013 are still listed and marked with the task number, so the maintainer can
  confirm nothing is missed.

## Context

- Relevant code and docs: `docs/assumptions.md`, `src/i18n/`, `shared/bot-messages.ts`, `README.md`,
  `docs/product-flow.md`.
- ADRs this task follows: all those linked from `docs/assumptions.md`. Replaces none.
- Dependencies and decisions already made: none. It can run at any time, and running it before tasks 012 and 013 are
  merged is fine. Findings then reflect the current app.

## Scope

- In scope: reading the surfaces above, and the findings table.
- Out of scope: any change to code, copy, docs or `docs/assumptions.md`. Fixes become separate briefs.
- Files or directories assigned to this task: this brief's Handoff section only.

## Acceptance scenarios

| ID | Given / when | Expected result | Planned verification |
| --- | --- | --- | --- |
| A1 | The audit is done | Every surface listed under Intended behavior has been checked, and the Handoff names each one with "no findings" or its rows | Reviewer read |
| A2 | A finding | The row quotes the exact text (ru, plus the locale if the drift is locale-specific), names the conflicting assumption ID (for example R3) or "not covered", and says whether task 012 or 013 already handles it | Reviewer read |
| A3 | After the audit | `git diff` shows changes only in this brief | `git status` |

## Must stay unchanged

- Behavior, contracts, or user-facing copy this task must not alter: everything. This task is read-only.
- Existing checks that already cover it: none needed.

## Open decisions

- None.

## Verification

- `git status` → A3
- Reviewer reads the findings table → A1, A2

## Handoff

| Scenario | Evidence (command, test assertion, or manual check) | Result |
| --- | --- | --- |
| A1 | | |
| A2 | | |
| A3 | | |

Findings:

| Surface / key or file | What it says | Conflicts with | Handled by | Suggested fix |
| --- | --- | --- | --- | --- |

- Changed files:
- Checks not run, blockers, or open questions:
- LLM contributions: Claude Opus 5.5 (Claude Code) — specification of this brief and `docs/assumptions.md`.
