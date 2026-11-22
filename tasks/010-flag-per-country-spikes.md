# 010 — Flag per-country spikes of new surveys for manual review

**Status:** Ready

## Goal

Implement [ADR 0014](../docs/adr/0014-flag-per-country-spikes-for-manual-review.md): a burst of new surveys for one country is held out of the statistics until the maintainer looks at it, without flagging the launch or an intake opening.

Intended behavior:

- **When it runs.** Inside `create_response_for_identity`, after the new survey is inserted, for the new survey's `ranking_country` and the active intake year.
- **Quiet periods: nothing is flagged** when any of these holds:
  - `season_config.public_launch_date` is null (the default until the maintainer sets it);
  - now is before `public_launch_date + 7 days`;
  - `season_config.intake_opens_on` is set and now is within `[intake_opens_on, intake_opens_on + 7 days)`.
- **Spike rule.** Let `recent` be the surveys of that country and intake year created in the last hour (`created_at > now() - interval '1 hour'`), including the new one, and `baseline` be the non-suspicious surveys of that country and intake year created in the 14 days before that hour, divided by 336. A spike is `count(recent) > greatest(10, 5 × baseline)`.
- **On a spike** every survey in `recent` that the maintainer has not reviewed (`spike_reviewed_at is null`) gets `is_suspicious = true` and `spike_flagged_at = now()` (kept if already set). Later surveys created while the condition holds are flagged the same way.
- **Effect.** Flagged surveys drop out of every statistic and of the landing counter through the existing `not is_suspicious` filters. Their owners are not told: their own dashboard still shows their score and their position against the unflagged cohort, the same way it does for anyone else with that score.
- **Review is manual.** `docs/architecture.md` gets a "Reviewing spike flags" section with ready SQL: list flagged surveys grouped by country and hour; clear a group (`is_suspicious = false, spike_reviewed_at = now()`); keep a group flagged (`spike_reviewed_at = now()`, flag stays). A reviewed survey is never flagged again by this rule. Flags set by the old status-transition rule (no `spike_flagged_at`) are not touched by these queries.
- **Configuration.** The migration adds `season_config.public_launch_date date` (null) and `season_config.intake_opens_on date`, set to `2026-03-31` for the active 2026 intake. The "Season rollover" section gains a step to set `intake_opens_on` for each new intake, and a note that the maintainer sets `public_launch_date` on launch day.

## Context

- Relevant code and docs: the `create_response_for_identity` as redefined by task [009](009-limit-score-changing-edits.md), `supabase/migrations/202611210001_cohort_ladder.sql` (`season_config`, `active_intake_year()`), `supabase/migrations/202611250001_cleanup_and_thresholds.sql` (statistics filters `not is_suspicious`), `supabase/migrations/202611270001_intake_summary.sql`, `responses.created_at`, `shared/season.ts` (`season2026.documentsFrom = '2026-03-31'`), `docs/architecture.md` (Data model, Season rollover, changelog).
- ADRs this task follows: [0002](../docs/adr/0002-pseudonymous-identity.md), [0003](../docs/adr/0003-cohort-ladder.md), [0013](../docs/adr/0013-limit-on-score-changing-edits.md), [0014](../docs/adr/0014-flag-per-country-spikes-for-manual-review.md). Replaces none.
- Dependencies and decisions already made:
  - Thresholds: more than max(10, 5 × average hourly rate over the preceding 14 days) in one hour; 7-day quiet periods after launch and after each intake opening; no notification; review by hand in the database (maintainer, 2026-11-22).
  - The launch date lives in the database and is empty until the maintainer sets it; while empty nothing is flagged.
  - **Depends on task 009**: both redefine `create_response_for_identity`; start after 009 is merged and keep its limit logic intact.

## Scope

- In scope:
  - Migration `supabase/migrations/202611290001_spike_flags.sql`: the two `season_config` columns; `responses.spike_flagged_at timestamptz` and `responses.spike_reviewed_at timestamptz`; an index that supports counting by `(intake_year, ranking_country, created_at)`; `create or replace` of `create_response_for_identity` with the same signature and the spike step.
  - SQL tests.
  - `docs/architecture.md`: data model columns, the rule, the review SQL, Season rollover steps, changelog. One line in the `docs/product-flow.md` changelog.
- Out of scope: notifications, an admin screen, flags on edits or on country changes, changing the cohort floor, changes to the API or the client, setting `public_launch_date` in any real database.
- Files or directories assigned to this task: `supabase/migrations/202611290001_spike_flags.sql`, `supabase/tests/` (new `spike_flags.sql`), `supabase/tests/migration-contracts.test.ts` if signatures are pinned there, `supabase/seed.sql` only if the seed breaks, `docs/architecture.md`, `docs/product-flow.md`.

## Acceptance scenarios

| ID | Given / when | Expected result | Planned verification |
| --- | --- | --- | --- |
| A1 | `public_launch_date` is null; 30 surveys for one country within an hour | Nothing is flagged | SQL test |
| A2 | Launch 3 days ago; 30 surveys in an hour | Nothing is flagged | SQL test |
| A3 | Launch 30 days ago, intake opened 10 days ago, no history; 10 surveys for one country in an hour, then an 11th | The first 10 are not flagged; with the 11th all 11 are flagged with `spike_flagged_at` set | SQL test |
| A4 | Same, but the country's 14-day history averages 4 per hour (1344 back-dated surveys); 20 in the last hour | Not flagged (20 ≤ 5 × 4); at 21 they are | SQL test |
| A5 | Now is 3 days after `intake_opens_on`, launch long ago; 30 surveys in an hour | Nothing is flagged | SQL test |
| A6 | A spike for country A | Surveys of country B and of other intake years are not flagged | SQL test |
| A7 | Flagged surveys | Excluded from `get_current_statistics` cohorts and `get_intake_summary`; the owner of a flagged survey still gets a statistics result with a position when the unflagged cohort has ≥ 10 | SQL test |
| A8 | The maintainer clears a group with the documented SQL, then another survey arrives in the same hour | Cleared surveys stay unflagged (`spike_reviewed_at` set); only unreviewed ones can be flagged | SQL test running the documented statements |
| A9 | A survey flagged by the old status-transition rule | Not changed by the spike step or the review statements | SQL test |
| A10 | The limit from task 009 | All task 009 SQL tests still pass | `npm run test:db:pglite` |

## Must stay unchanged

- Behavior, contracts, or user-facing copy this task must not alter:
  - the signature and return shape of `create_response_for_identity` and its error codes, including `edit_limit_reached` from task 009;
  - the cohort floor (10), the ladder, the statistics payload;
  - API handlers and the client;
  - no raw Telegram ID anywhere.
- Existing checks that already cover it: `supabase/tests/statistics.sql`, `supabase/tests/cohort_ladder.sql`, `supabase/tests/intake_summary.sql`, `supabase/tests/privacy_identity.sql`, the task 009 tests, `supabase/tests/migration-contracts.test.ts`.

## Open decisions

- None.

## Verification

- `npm run test:db:pglite` → A1–A10; CI runs pgTAP
- `make check`
- Reviewer: run the review SQL from `docs/architecture.md` against the local PGlite/pgTAP fixture → A8

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

- Changed files:
- Checks not run, blockers, or open questions:
- LLM contributions: Claude Opus 5.5 (Claude Code) — specification of this brief and [ADR 0014](../docs/adr/0014-flag-per-country-spikes-for-manual-review.md).
