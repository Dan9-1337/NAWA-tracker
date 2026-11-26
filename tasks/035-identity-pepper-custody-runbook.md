# 035 — Document how `IDENTITY_PEPPER` is kept, backed up and never rotated by accident

**Status:** In review

## Goal

Every survey is keyed by `HMAC-SHA256(IDENTITY_PEPPER, telegram id)` ([ADR 0002](../docs/adr/0002-pseudonymous-identity.md)).
If the pepper is lost or changed, every stored profile is orphaned: users can no longer reach their surveys, and
statistics fill with duplicates as they answer again. Today the repository says only "Changing it orphans every stored
profile" (`README.md`, `docs/architecture.md`). There is **no backup of the secret yet** (maintainer, 2026-11-26).

Write a short operational section, "Keeping `IDENTITY_PEPPER`", in `docs/architecture.md` (and a one-line link from the
`README.md` environment table) that states:

1. **Where it lives:** the Vercel Production environment variable is the primary copy. Staging has its own different
   value ([ADR 0009](../docs/adr/0009-staging-environment-on-free-tiers.md)); local development uses its own value that
   production rejects.
2. **Backup is required:** the maintainer keeps one offline copy of the Production value outside Vercel (for example a
   password manager), never in the repository, an issue, a chat or a log. Describe the steps to make the backup once
   (read the value from the Vercel dashboard or `vercel env pull` into a temporary file outside the repository, store it,
   delete the file) and to check it later (compare a hash, not the value). Add an explicit "Status: no backup yet, to be
   made by the maintainer" line; the maintainer removes it after making the backup.
3. **Who has access:** the maintainer only. Anyone added to the Vercel project can read it.
4. **Never rotate casually:** changing the value is not a routine secret rotation. If the value leaks, the consequence is
   that whoever holds it can match known Telegram IDs to surveys (assumption R1); a rotation would need a re-keying migration
   that does not exist. State this and say that a leak must be discussed before any change.
5. **Restore:** if the Vercel variable is lost, set it back from the backup and redeploy; with no backup, the stored
   profiles cannot be recovered.

The repository will be public: the section names no account, vault, path or person beyond "the maintainer", and contains
no part of the value.

## Context

- Relevant code and docs: `api/_lib/identity.ts` (how the pepper is used and the production check), `README.md` (environment
  table, deployment steps), `docs/architecture.md` (identity, deployment), `.env.example`.
- ADRs this task follows: [0002](../docs/adr/0002-pseudonymous-identity.md), [0009](../docs/adr/0009-staging-environment-on-free-tiers.md).
  Replaces none.
- Dependencies and decisions already made: no backup exists yet; the maintainer makes it by hand after this task.

## Scope

- In scope: documentation only.
- Out of scope: code, a re-keying tool, actually reading or copying the secret, touching Vercel. Do not open `.env.local` or
  print any secret.
- Files or directories assigned to this task: `docs/architecture.md`, `README.md`.

## Acceptance scenarios

| ID | Given / when | Expected result | Planned verification |
| --- | --- | --- | --- |
| A1 | A reader of `docs/architecture.md` | Finds where the pepper lives, that a backup is required and not yet made, who has access, why it must not be rotated, and how to restore | Reviewer read |
| A2 | The `README.md` environment table | The `IDENTITY_PEPPER` row links to the new section | Reviewer read |
| A3 | The diff | Contains no secret value, account name, vault name or personal name | Reviewer read; `git diff` grep for `pepper` shows only prose |
| A4 | The statements about code | Match `api/_lib/identity.ts` (production rejects the local value, minimum length) | Reviewer compares with the code |

## Must stay unchanged

- Behavior, contracts, or user-facing copy this task must not alter: all code and configuration.
- Existing checks that already cover it: none needed; `make check` must still pass (docs only).

## Open decisions

- None.

## Verification

- Reviewer reads the docs diff → A1–A4

## Handoff

| Scenario | Evidence (command, test assertion, or manual check) | Result |
| --- | --- | --- |
| A1 | `docs/architecture.md`, new subsection "Keeping `IDENTITY_PEPPER`" under Security and privacy: where it lives, required backup with make-once and hash-check steps, the "no backup yet, to be made by the maintainer" status line, access, never-rotate reasoning (R1, no re-keying migration, discuss a leak first), restore | Done |
| A2 | `README.md` environment table row for `IDENTITY_PEPPER` now links to `docs/architecture.md#keeping-identity_pepper` | Done |
| A3 | Self-read of the added text: no secret value, account, vault, path or person beyond "the maintainer"; the only prose example is "a password manager" | Done (reviewer to confirm with `git diff` grep) |
| A4 | Compared with `api/_lib/env.ts` (the pepper is used in `api/_lib/identity.ts`): secrets must be at least 32 characters (`z.string().min(32)`); in production the `local-dev-identity-pepper-` prefix throws "Invalid server environment" | Done |

- Changed files: `docs/architecture.md`, `README.md`, this brief.
- Checks not run, blockers, or open questions: `make check` passed (689 tests, typecheck and the rest of the target, exit 0). No Vercel command was run and no secret was read. No blockers.
- LLM contributions: Opus 5.5 (Claude Code): specification. Sonnet 5.5 (Claude Code subagent): implementation.
