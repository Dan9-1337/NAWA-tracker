# Reference example — cohort ladder

> **Reference, not a task.** This is a filled-out example of [the template](../TEMPLATE.md) for behavior that already
> exists. It is not tracked in the task list and asks for no implementation. The decision is
> [ADR 0003](../../docs/adr/0003-cohort-ladder.md); the evidence is the SQL assertions linked below.

## Goal

An applicant compares their score inside the smallest cohort with enough responses: their country, otherwise their
country group, otherwise the whole track. The result names the tier it used, and values below the privacy threshold
stay hidden. This is already implemented; the example shows how to state it as observable scenarios.

## Context

- Decision: [ADR 0003](../../docs/adr/0003-cohort-ladder.md).
- Implementation: `public.compute_country_statistics` and `public.country_group_id` in
  [the cohort ladder migration](../../supabase/migrations/202611210001_cohort_ladder.sql); thresholds are defined in
  [the cleanup and thresholds migration](../../supabase/migrations/202611250001_cleanup_and_thresholds.sql).
- Tests: [cohort_ladder.sql](../../supabase/tests/cohort_ladder.sql) and
  [statistics.sql](../../supabase/tests/statistics.sql), both listed in
  [test-files.mjs](../../supabase/tests/test-files.mjs).

## Scope

- Reference only: this file does not change application code, SQL, fixtures, or product rules.
- Assigned files: none. Copy [the template](../TEMPLATE.md) for a new task.

## Acceptance scenarios

The verification column names the existing assertion, not a new test.

| ID | Given / when | Expected result | Verification (existing assertion) |
| --- | --- | --- | --- |
| A1 | A country is not listed in `country_groups` (for example `JP`) | `country_group_id` returns `world-other` | `cohort_ladder.sql`: "unlisted countries fall into world-other" |
| A2 | A country is listed (for example `KZ`) | `country_group_id` returns its group (`east`) | `cohort_ladder.sql`: "listed countries resolve to their group" |
| A3 | A caller has no response in the active intake year | `get_current_statistics` returns `null` | `cohort_ladder.sql`: "unknown caller has no statistics" |
| A4 | The caller's country has fewer than 10 responses but the country group has at least 10 | `cohortScope` is `group` | `cohort_ladder.sql`: "a country below ten responses compares inside its country group" |
| A5 | The group tier is selected | `cohortGroupId` names the group (`east`) | `cohort_ladder.sql`: "the group id of the pooled cohort is reported" |
| A6 | The group tier is selected | `groupResponseCount` counts every valid response in the group (11 in the fixture) | `cohort_ladder.sql`: "the group cohort counts every response in the group" |
| A7 | The caller's country has fewer than 10 responses | `sameCountryCount` is `null` | `cohort_ladder.sql`: "the single-country count stays hidden below ten" |
| A8 | Responses exist for another intake year | They do not change `totalValidResponses` (it stays 11) | `cohort_ladder.sql`: "responses from another intake year are not counted" |
| A9 | The caller's country reaches 10 responses | `cohortScope` is `country` | `cohort_ladder.sql`: "a country with ten responses compares with itself" |
| A10 | The country and group are below 10 responses but the track has at least 10 | `detailsAvailable` is `true` | `cohort_ladder.sql`: "the track-wide fallback still yields a cohort when pooling the group is not enough" |
| A11 | The track tier is selected | `cohortScope` is `track` | `cohort_ladder.sql`: "the fallback tier is named" |
| A12 | Every comparison group has fewer than 10 responses | `detailsAvailable` is `false`; `medianScore`, `lowerScorePercentage`, and `sameCountryCount` are `null` | `statistics.sql`: "details are suppressed when every comparison group has fewer than ten responses" and the three null assertions |

## Must stay unchanged

- The threshold stays single-sourced: `public.min_cohort_size()` in SQL and `MIN_COHORT_SIZE` in
  `shared/product-rules.ts`, kept equal by `supabase/tests/migration-contracts.test.ts`.
- Suspicious responses and responses from another intake year stay out of every count
  (`statistics.sql`: "suspicious responses are excluded from aggregate counts";
  `cohort_ladder.sql`: "responses from another intake year are not counted").
- `assert_statistics_result` keeps rejecting a detailed payload without a named scope
  (`statistics.sql`: "detailed statistics must name their cohort scope") and a disclosed country count below 10
  (`statistics.sql`: "disclosed country counts must meet the privacy threshold").

## Open decisions

- None. This reference records an accepted decision and behavior that is already implemented.

## Verification

- `npm run test:db:pglite` applies the migrations and runs both SQL files without Docker.
- CI runs the same files against PostgreSQL with `DATABASE_URL=... npm run test:db`.
- This reference adds no tests and was not re-run for the documentation change; the table above names the existing
  assertions instead.

## Handoff

| Scenario | Evidence | Result |
| --- | --- | --- |
| A1 | `cohort_ladder.sql`: "unlisted countries fall into world-other" | existing assertion |
| A2 | `cohort_ladder.sql`: "listed countries resolve to their group" | existing assertion |
| A3 | `cohort_ladder.sql`: "unknown caller has no statistics" | existing assertion |
| A4 | `cohort_ladder.sql`: "a country below ten responses compares inside its country group" | existing assertion |
| A5 | `cohort_ladder.sql`: "the group id of the pooled cohort is reported" | existing assertion |
| A6 | `cohort_ladder.sql`: "the group cohort counts every response in the group" | existing assertion |
| A7 | `cohort_ladder.sql`: "the single-country count stays hidden below ten" | existing assertion |
| A8 | `cohort_ladder.sql`: "responses from another intake year are not counted" | existing assertion |
| A9 | `cohort_ladder.sql`: "a country with ten responses compares with itself" | existing assertion |
| A10 | `cohort_ladder.sql`: "the track-wide fallback still yields a cohort when pooling the group is not enough" | existing assertion |
| A11 | `cohort_ladder.sql`: "the fallback tier is named" | existing assertion |
| A12 | `statistics.sql`: "details are suppressed when every comparison group has fewer than ten responses" and the null assertions | existing assertions |

- Changed files: none for this reference; the cohort ladder is already implemented in the linked migration and tests.
- Checks not run, blockers, or open questions: the SQL suite was not re-run for this documentation change; no new
  behavior or tests are proposed.
- LLM contributions: DeepSeek V4.1 Flash Free — wrote this reference example. The existing cohort ladder implementation
  and SQL tests have no recorded model attribution.
