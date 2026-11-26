# 0008. Refocus on the score comparison: drop application statuses and the university question

Status: Accepted. Supersedes [0004](0004-outcomes-as-banded-self-reports.md) and [0007](0007-study-field-and-prep-course-city.md).

## Context

The core value of the product is one answer: where does my score stand among other applicants
([0003](0003-cohort-ladder.md)). Everything else dilutes it.

- The first wizard step asked for a target university and a field of study. The university is not used by anything
  after it is stored; the field fed only the prep-course city card ([0007](0007-study-field-and-prep-course-city.md)),
  which needed the "scholarship awarded" status. A new visitor was asked where they dream of studying before they saw
  anything about their score.
- The 2026 intake is over, so the application status ladder, the Season and Outcomes tabs and the "add your outcome"
  reminders ([0004](0004-outcomes-as-banded-self-reports.md), [0006](0006-opt-in-bot-reminders.md)) no longer serve
  anyone.
- The landing screen showed a drawn density strip that explained a chart the visitor could not yet read, while the
  dashboard already has a ruler (`ScoreTape`) that invites interaction.

## Decision

1. The wizard is **countries and grades**: citizenship, school country, then the average. The comparison works without
   a university or a field.
2. The landing shows a **live sample ruler** instead of the fake density strip: dragging it changes a demo score, its
   place against a sample cohort and the percentile. The real density strip stays on the dashboard, where it shows the
   user's own cohort.
3. Users **no longer report statuses**. The Season and Outcomes tabs, the status reporter, the prep-city card,
   `POST /api/outcomes`, `POST /api/prep-cities` and the `status_updated` event are removed, and the reminder texts no
   longer ask for an outcome. The dashboard is a single screen.
4. **The data and the schema stay.** There is no migration: the columns, the status transition rules and the RPCs
   `get_cohort_outcomes` and `get_prep_city_distribution` remain. The client sends neutral defaults for what it no
   longer asks (`submitted` and today, field `other`, route `direct_studies`, no university); `targetUniversity` is
   optional on writes. Profiles that already carry these values keep them.
5. A **separate flow comes later, only for people who received a scholarship**: where they wanted to go and where they
   were placed. On the Director programme a candidate who passes the selection is awarded the scholarship, so there is
   no "passed but not awarded" case to track. The university catalogue and the ISCED-F field list stay in the
   repository for that flow.

## Consequences

- The first minute is about the score, and the screen count drops from three steps plus three tabs to two steps and one
  screen.
- The archive of self-reported outcomes stops growing, and applicants lose the "which city will they send me to" answer
  that 0007 promised. Existing rows stay readable in the database.
- The schema carries unused columns and RPCs until the new flow exists; `is_suspicious` can no longer be set from a
  status change.
- A newer client and an older server (or the reverse) stay compatible, because no contract changed in a breaking way.
- Wizard sessions stored in `localStorage` are versioned; a session from before this change has its step index shifted
  by one.
- The new flow will need its own questions and, probably, its own schema; this record does not design it.

## Alternatives considered

Dropping the columns and rewriting the RPCs in a migration (cleaner, but the create and update RPCs are redefined in
nearly every migration, a client and server out of step would break writes, and it closes the door on the post-award
flow); hiding the tabs but keeping status reporting (dead code and reminders that promise something the app no longer
does); keeping the university and field as optional steps (still the first thing a visitor meets, and the field has no
consumer without prep-cities); keeping the fake density strip and adding the ruler beside it (two decorations on a
screen whose job is to start the wizard).
