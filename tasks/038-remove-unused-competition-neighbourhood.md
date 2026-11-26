# 038 — Remove the unused "competition neighbourhood" block and its strings

**Status:** In review

## Goal

`src/features/dashboard/CompetitionNeighbourhoodDetails.tsx` is not imported anywhere; its helper
`src/lib/competition-neighbourhood.ts` is used only by that component and its own test, and the `competitionNeighbourhood.*`
strings are kept in all five locales. The maintainer decided not to show a "near you ±1 point" block (2026-11-26).
Remove the dead code so it does not mislead readers or translators.

Intended result: the component, the helper, the helper's test and every `competitionNeighbourhood` key in
`src/i18n/{pl,en,ru,uk,be}.ts` (and in the locale type, if declared there) are deleted. Nothing visible changes.

## Context

- Relevant code and docs: `src/features/dashboard/CompetitionNeighbourhoodDetails.tsx`, `src/lib/competition-neighbourhood.ts`,
  `src/lib/competition-neighbourhood.test.ts`, `src/i18n/*.ts`, `src/i18n/types.ts` (if it lists the keys), `docs/ux-review.md` (P2 list).
- ADRs this task follows: none. Replaces none.
- Dependencies and decisions already made: delete, not wire up (maintainer, 2026-11-26).

## Scope

- In scope: deleting the files and keys above and any import or type that only served them.
- Out of scope: other unused code, the dashboard layout, other locale keys.
- Files or directories assigned to this task: the three files above, `src/i18n/{pl,en,ru,uk,be}.ts`, `src/i18n/types.ts`,
  `shared/product-rules.ts` and `shared/product-rules.test.ts` (remove `canShowCompetitionNeighbourhood`, its comment and its
  test case; keep `MIN_COHORT_SIZE` and its tests, which other code uses). Added by the task author after the first run
  found these references (2026-11-26).

## Acceptance scenarios

| ID | Given / when | Expected result | Planned verification |
| --- | --- | --- | --- |
| A1 | Codebase search | `grep -rni "competitionNeighbourhood\|competition-neighbourhood" src shared api` finds nothing | Command in the handoff |
| A2 | Typecheck, tests, build | All pass | `make check` |
| A3 | Locale parity | The five locales still have identical key sets | `npm test -- src/i18n` |

## Must stay unchanged

- Behavior, contracts, or user-facing copy this task must not alter: everything users see.
- Existing checks that already cover it: `src/i18n/locales.test.ts`, `src/i18n/glossary.test.ts`, dashboard tests.

## Open decisions

- None.

## Verification

- `grep -rni "competitionNeighbourhood\|competition-neighbourhood" src shared api` → A1
- `npm test -- src/i18n` → A3
- `make check` → A2

## Handoff

| Scenario | Evidence (command, test assertion, or manual check) | Result |
| --- | --- | --- |
| A1 | `grep -rniE "competitionNeighbourhood\|competition-neighbourhood" src shared api` returns no matches (exit 1) | Pass |
| A2 | `make check` (67 files, 643 tests, `tsc --noEmit`), exit 0 | Pass |
| A3 | `npm test -- src/i18n shared/product-rules`: 5 files, 91 tests (`locales.test.ts`, `glossary.test.ts`, `product-rules.test.ts`) | Pass |

- Changed files: deleted `src/features/dashboard/CompetitionNeighbourhoodDetails.tsx`, `src/lib/competition-neighbourhood.ts`, `src/lib/competition-neighbourhood.test.ts`; removed the `competitionNeighbourhood` block from `src/i18n/{pl,en,ru,uk,be}.ts` and the now-unused `PARTICIPANTS` (be), `participants` (ru), `participantsWord` (uk) helpers (typecheck flagged them). `src/i18n/types.ts` needed no change (types derive from `en`). Also removed `canShowCompetitionNeighbourhood`, its comment and its test case from `shared/product-rules.ts` and `shared/product-rules.test.ts` (`MIN_COHORT_SIZE` and its test kept).
- Checks not run, blockers, or open questions: no manual browser check (nothing visible changes). No blockers.
- LLM contributions: Opus 5.5 (Claude Code): specification. Sonnet 5.5 (Claude Code subagent): implementation.
