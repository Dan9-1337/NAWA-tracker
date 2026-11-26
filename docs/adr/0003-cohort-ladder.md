# 0003. Compare inside a cohort ladder instead of a fixed k = 10 per country

Status: Superseded by [0015](0015-compare-within-citizenship-country-without-minimum.md)

## Context

NAWA allocates seats per country or per *group* of countries. Awards are highly concentrated: Belarus, Ukraine and
Kazakhstan took 401 of 471 first-cycle awards in 2021, and most countries have a handful of applicants. A rule of
"show statistics only for a country with at least 10 responses" left almost every user with an empty dashboard, and
the privacy it bought was not real (see [0004](0004-outcomes-as-banded-self-reports.md) for what actually leaks).

## Decision

The comparison cohort is the applicant's country if it has at least 10 responses, otherwise their country group
(`country_groups`, an editable table), otherwise the whole track. The result names the tier it used and says why.
The thresholds have one definition per side: `public.min_cohort_size()` in SQL and `MIN_COHORT_SIZE` in
`shared/product-rules.ts`, kept equal by a contract test.

## Consequences

- Small countries get a meaningful comparison, and the grouping mirrors NAWA's own mechanism.
- Groups are our guess until real data exists (BY, UA, LT stand alone; an "east" group follows the former Anders
  region IV; the rest is pooled), so the table must be reviewed after each intake.
- Percentiles inside a pooled group are not an official ranking, which the copy states.

## Alternatives considered

Hiding everything below 10 (empty product); showing raw small-n percentiles (noise and re-identification); modelling
NAWA's real limits (not published: only totals are, see `shared/anders-history.ts`).
