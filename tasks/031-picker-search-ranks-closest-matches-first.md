# 031 — Picker search puts the closest matches first

**Status:** In review

## Goal

Searching in a dropdown (`SearchableSelect`) lists every match in the options' original, alphabetical order. For the study
programme (`ProgrammeStep` in the holder flow, about 1,400 entries), typing `informat` lists "Automatyka i informatyka przemysłowa", "Bioinformatyka", "Geoinformatyka" … and only
about the 17th row is "Informatyka" itself (found on 2026-11-26 in the scholarship-holder flow, step "Какое
направление?"). The person who types the start of a name expects that name first.

Intended behavior: when a query is typed and the picker uses its own default or `matchesQuery` filtering, the matches are
ordered by how close they are, then in their original order inside each tier:

1. the label equals the query (ignoring case and surrounding spaces);
2. the label starts with the query;
3. a word inside the label starts with the query (words split on spaces, `-`, `/`, `(`, `,`);
4. the query appears anywhere else in the label.

The **set** of matches does not change, only its order. Tiers compare `normalizeSearchText(label)` with
`normalizeSearchText(query)` (`shared/university-search/normalize.ts`: lowercase, Polish diacritics and punctuation
folded), so a query without diacritics ranks like one with them. An option the picker's matcher accepted that fits none
of tiers 1–3 goes to tier 4. Ranking happens inside each group: the groups keep the order they have today (in
`CountrySelect`, "Популярные" stays first when it has matches). Pickers that pass `filterOptions` (their own ranking) are
not touched; no caller passes it today. With an empty query nothing changes.

## Context

- Relevant code and docs: `src/components/SearchableSelect.tsx` (`filtered`, `matchesQuery`, `filterOptions`, the `grouped` buckets;
  `grouped` orders groups by their first option in `filtered`, so a flat re-sort would reorder groups),
  its callers `src/components/CountrySelect.tsx` (default matching, "Популярные" group for UA, BY, KZ, RU),
  `src/features/scholarship-report/ScholarshipReportResults.tsx` (country filter, default matching) and
  `src/features/scholarship-report/ScholarshipReportFlow.tsx` (centre, programme and university pickers with `matchesLabel`,
  which uses `normalizeSearchText`), `shared/university-search/` (separate scoring, not part of this task; only
  `normalizeSearchText` is imported). There are no `SearchableSelect` or `CountrySelect` tests today.
- ADRs this task follows: none. Replaces none.
- Dependencies and decisions already made: none.

## Scope

- In scope: the ordering of `filtered` in `SearchableSelect` when it filters itself (default or `matchesQuery`); a pure helper
  with a unit test; component tests.
- Out of scope: which options match (no new diacritic or alias matching), `filterOptions` users, the `shared/university-search` module,
  grouping and the "Популярные" group, the empty-state and analytics callbacks, and the list's layout.
- Files or directories assigned to this task: `src/components/SearchableSelect.tsx`, a new helper beside it, and new tests
  `src/components/SearchableSelect.test.tsx`, `src/components/CountrySelect.test.tsx` and the helper's unit test.

## Acceptance scenarios

| ID | Given / when | Expected result | Planned verification |
| --- | --- | --- | --- |
| A1 | A picker with the options, in this original order, "Automatyka i informatyka przemysłowa", "Bioinformatyka", "Informatyka", "Informatyka stosowana", "Zarządzanie i informatyka"; the query is `informat` | The order is "Informatyka", "Informatyka stosowana" (tier 2, the label starts with the query), then "Automatyka i informatyka przemysłowa", "Zarządzanie i informatyka" (tier 3, a word starts with it), then "Bioinformatyka" (tier 4, substring only) | Unit test of the ranking helper with this list |
| A2 | The query equals a whole label in a different case (`INFORMATYKA`) | That label is first | Unit test |
| A3 | Two options in the same tier | They keep their original relative order | Unit test |
| A4 | The query (2+ characters) matches nothing | The empty state appears as before and `onSearchNoResults` is called once | New `SearchableSelect.test.tsx` |
| A5 | The country picker in English with the query `sudan` (today "South Sudan" is listed before "Sudan") | "Sudan" is the first row, then "South Sudan"; exactly these two countries match, as before | New `CountrySelect.test.tsx` |
| A6 | A picker that passes `filterOptions` | Its order is exactly what `filterOptions` returned | New `SearchableSelect.test.tsx` |
| A7 | The query is empty | The options appear in their original order, groups as before | New `SearchableSelect.test.tsx` |
| A8 | A picker with `matchesQuery` based on `normalizeSearchText`, options "Automatyka i zarządzanie", "Zarządzanie"; the query is `zarzadzanie` | "Zarządzanie" (tier 1) comes before "Automatyka i zarządzanie" (tier 3) | Unit test of the helper |
| A9 | Grouped options in this order: group "P" with "Ukraina", then ungrouped "Gwinea", "Indie"; the query is `in` | The "P" group stays first although "Ukraina" is only tier 4; among the ungrouped options "Indie" (tier 2) precedes "Gwinea" (tier 4) | New `SearchableSelect.test.tsx` |
| A10 | A query is typed, then an option is selected or the list is closed | `onSearchSelected` / `onSearchAbandoned` receive the same result count as before | New `SearchableSelect.test.tsx` |

## Must stay unchanged

- Behavior, contracts, or user-facing copy this task must not alter: the set of matches for any query; the analytics
  callbacks (`onSearchAbandoned`, `onSearchSelected`, `onSearchNoResults`) and the counts they receive.
- Existing checks that already cover it: none for the pickers themselves (A4, A6, A7 and A10 add them);
  `src/features/scholarship-report/scholarship-report.test.tsx`, `shared/university-search/search.test.ts`.

## Open decisions

- None.

## Verification

- `npm test -- src/components src/features/scholarship-report` → A1–A10
- `make check`
- Manual in Chrome (`make dev`, which overwrites `.env.local` and stops processes on ports 3000/3001; Settings language
  Russian; the returning demo user's holder flow, step "Какое направление?", type `informat`): "Informatyka" is the first
  row → A1

## Handoff

| Scenario | Evidence (command, test assertion, or manual check) | Result |
| --- | --- | --- |
| A1 | `npm test -- src/components` → `rank-search-matches.test.ts` `orders matches by tier: starts-with, word-start, then substring (A1)`; also `SearchableSelect.test.tsx` `ranks a custom matchesQuery result without changing its set (A1, A8)` | pass |
| A2 | `rank-search-matches.test.ts` → `puts a label equal to the query first, ignoring case and surrounding spaces (A2)` | pass |
| A3 | `rank-search-matches.test.ts` → `keeps the original order inside a tier (A3)` | pass |
| A4 | `SearchableSelect.test.tsx` → `shows an empty-state row and reports no results once (A4)` (query `zz`; typing a third character is a new query and reports again, as before) | pass |
| A5 | `CountrySelect.test.tsx` → `lists Sudan before South Sudan for the query "sudan" in English (A5)` (asserts exactly `['Sudan', 'South Sudan']`) | pass |
| A6 | `SearchableSelect.test.tsx` → `keeps exactly what filterOptions returned (A6)` | pass |
| A7 | `SearchableSelect.test.tsx` → `lists options in their original order for an empty query (A7)` | pass |
| A8 | `rank-search-matches.test.ts` → `ranks a query without diacritics like one with them (A8)`; `SearchableSelect.test.tsx` A1/A8 test above | pass |
| A9 | `rank-search-matches.test.ts` → `keeps group order by first appearance and ranks inside each group (A9)`; `SearchableSelect.test.tsx` → `ranks inside each group and keeps the group order (A9)` | pass |
| A10 | `SearchableSelect.test.tsx` → `passes the same result count to the analytics callbacks as before (A10)` (`onSearchSelected('informat', 'Informatyka', 3)`, `onSearchAbandoned('fiz', 1)`) | pass |
| Manual (Verification, A1 in the app) | not run: needs maintainer manual check. Steps: `make dev`, Settings language Russian, returning demo user's holder flow, step "Какое направление?", type `informat`; expect "Informatyka" as the first row | not run |

- Changed files: `src/components/SearchableSelect.tsx` (ranks the matches when it filters itself), `src/components/rank-search-matches.ts` (new helper), `src/components/rank-search-matches.test.ts`, `src/components/SearchableSelect.test.tsx`, `src/components/CountrySelect.test.tsx` (new tests); this brief (Status, Handoff).
- Checks not run, blockers, or open questions: `npm test -- src/components src/features/scholarship-report` → 6 files, 41 tests pass; `make typecheck` passes. `make check` fails in its test step only because of task 027's `src/pages/home-page.test.tsx` (`HomePage save flow returns to the dashboard > shows the new survey dashboard at its top after Settings edit, delete and create in one session` and `... > does not offer an interrupted edit as saved progress once the survey is gone`); it failed the same way on retry. All other 64 files pass. Not touched. Design note: the helper ranks per group and returns groups in order of first appearance, so `grouped` in the component keeps today's group order.
- LLM contributions: Sonnet 5.5 (Claude Code) wrote this specification. Implementation and review: not yet done. Opus 5.5 (Claude Code subagent): specification review. Sonnet 5.5 (Claude Code subagent): implementation.
