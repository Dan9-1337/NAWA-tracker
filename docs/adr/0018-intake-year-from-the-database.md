# 0018. The active intake year comes from the database, not from a code constant

Status: Accepted

## Context

Records are keyed by `(identity_hash, intake_year)` and every statistic is scoped to
`season_config.active_intake_year` ([0003](0003-cohort-ladder.md), [0015](0015-compare-within-citizenship-country-without-minimum.md)).
The API and the client also carry their own copy of the year, `currentIntakeYear` in `shared/season.ts`: the client puts
it into every saved survey, and `api/responses.ts`, `api/responses/current.ts` and `api/statistics.ts` read and check
against it. The rollover procedure in `docs/architecture.md` asks the maintainer to change the constant and the
database row in the same release. If the two drift apart (a release without the `update`, or an `update` without a
release), saves are rejected with `INVALID_INTAKE_YEAR` or users see an empty cohort of the wrong year. The first
rollover, to the 2027 intake, has not happened yet.

## Decision

1. **`season_config.active_intake_year` is the only source of the active intake year.** The API reads it from the
   database for each request that needs it; no API handler uses `currentIntakeYear`.
2. **The client takes the year from the server.** It learns the year from an API response and uses it for new and
   edited surveys and for the season copy (dates are looked up in `seasons` by that year). It does not decide the year
   itself.
3. A save whose `intakeYear` differs from the active year is still rejected with `INVALID_INTAKE_YEAR`.
4. Rolling over to a new intake is one database `update` plus, when NAWA publishes them, the dates in `seasons`. A code
   release is no longer needed just to change the year.

## Consequences

- The constant and the database can no longer disagree. A rollover cannot half-happen.
- Each affected API request makes one extra small read (or the year comes back with a query it already makes).
- The demo and local fixtures need the year too; they read the same row from the local database.
- A year in `season_config` that has no entry in `seasons` must still render: the season copy falls back to text
  without dates.

## Alternatives considered

Keeping the constant with a check that it matches the database at startup (still two places to change, and a failed
check stops the API); keeping the manual procedure (relies on remembering both steps once a year).
