# 052 — Remove the density strip, the full distribution and the holder dots (client only)

**Status:** Ready

## Goal

Delete what [ADR 0020](../docs/adr/0020-dashboard-hub-and-pages.md) removes, after tasks 047 and 049 have replaced it: the
`DensityStrip` component (mini and detailed variants), the full-distribution disclosure on the What-if page (the interim
placement from task 046), the holder dots drawn on it, and the client's request for the holder score list. The `ориентир 2026`
line and its ruler mark stay exactly as they are.

Intended behavior: no screen draws a score histogram or holder dots. The client no longer calls
`GET /api/orientation-mark?distribution=1`; it asks for `{ mark, n }` only. The server route, the
`get_orientation_mark(..., include_scores)` RPC and the API contract keep supporting the parameter; removing them needs a
migration task of its own, because migration history is not edited and an RPC signature change must be paired with its tests.

## Context

- Relevant code and docs: `src/components/DensityStrip.tsx`, `src/features/dashboard/DistributionDetailsSection.tsx`,
  `src/features/statistics/StatisticsPanel.tsx` (`StatisticsDistribution`, `orientationScores`),
  `src/features/dashboard/useOrientationMark.ts`, `src/features/ProfileDashboard.tsx` (`hasFullDistribution`, the third argument
  of `useOrientationMark`), `src/lib/score-buckets.ts`, `src/lib/api-client.ts` (the orientation-mark request),
  `docs/product-flow.md`, `docs/architecture.md` (the orientation-mark paragraph).
- ADRs this task follows: [0020](../docs/adr/0020-dashboard-hub-and-pages.md); the removal is the change to point 2 of
  [0017](../docs/adr/0017-orientation-mark-from-holder-scores.md) recorded in the ADR index. Replaces none.
- Dependencies and decisions already made: tasks 047 (the hub card no longer uses the mini strip) and 049 (the What-if page no
  longer needs `percentileBand`) are `Done`. `canShowScoreDistribution` and `FINE_BUCKET_COUNT` stay: tasks 047 and 049 use
  them. Every other helper in `src/lib/score-buckets.ts` that nothing uses after the deletion is removed with its tests; the
  implementer checks each by search and lists what stayed and why in the handoff.

## Scope

- In scope: deleting the two components and their tests; removing `StatisticsDistribution`, `orientationScores` and the holder
  props through the tree; making the client request omit `distribution=1` and removing the hook's third argument; removing the
  i18n keys only these used (`expandDistribution`, `collapseDistribution`, `densityHint`, the strip's own labels), in all five
  locales; removing unused `score-buckets` helpers and tests; docs.
- Out of scope: the server route, the RPC, `shared/contracts.ts` types for the optional score list, migrations, the landing
  sample ruler (`ScoreTape`), the `ориентир` mark and line, the hub and What-if content, any new feature.
- Files or directories assigned to this task: `src/components/DensityStrip.tsx` (and test, if any),
  `src/features/dashboard/DistributionDetailsSection.tsx`, `src/features/statistics/StatisticsPanel.tsx` and its test,
  `src/features/dashboard/useOrientationMark.ts`, `src/features/dashboard/orientation-mark.test.tsx`,
  `src/features/ProfileDashboard.tsx` and its test, `src/lib/score-buckets.ts` and its test, `src/lib/api-client.ts` and its test,
  `src/i18n/*`, `docs/product-flow.md`, `docs/architecture.md`.

## Acceptance scenarios

| ID | Given / when | Expected result | Planned verification |
| --- | --- | --- | --- |
| A1 | The hub and the What-if page in any state | No density strip, no `Показать полное распределение` control, no holder dots | `statistics-panel.test.tsx`, `score-screen.test.tsx`, `ProfileDashboard.test.tsx` |
| A2 | A 2026 Director survey with holders | The `ориентир 2026` line on the hub and the mark on the ruler still show with the same numbers | `orientation-mark.test.tsx` passes |
| A3 | The client requests the mark | The URL has no `distribution` parameter, and no request carries it at any point on the dashboard | `src/lib/api-client.test.ts` or `orientation-mark.test.tsx` |
| A4 | `GET /api/orientation-mark?distribution=1` | Still returns the ascending score list (server unchanged) | Existing API test passes |
| A5 | Search `src` for `DensityStrip`, `DistributionDetailsSection`, `holderScores`, `orientationScores` | No match | `grep` output in the handoff; `npx tsc --noEmit` passes |
| A6 | Search the five locale files for the removed keys | No match; key sets still equal across locales | `src/i18n/locales.test.ts` |
| A7 | `src/lib/score-buckets.ts` | Only helpers that something still imports remain; the handoff lists each removed and each kept helper | Reviewer read of the diff |
| A8 | `docs/product-flow.md` and `docs/architecture.md` | The dashboard sections no longer describe the strip, the disclosure or holder dots; the orientation-mark paragraph says the app does not request the list and the server still supports it | Reviewer read |

## Must stay unchanged

- Behavior, contracts, or user-facing copy this task must not alter: the `ориентир 2026` calculation, line and ruler mark; the
  hub card and the What-if page content from tasks 047 and 049; the orientation-mark API and RPC; the privacy notice and
  FAQ copy (it says holder scores are visible without names; the maintainer reviews whether it still needs the "dots" wording
  and any change is a separate task).
- Existing checks that already cover it: `src/features/dashboard/orientation-mark.test.tsx`, `src/features/statistics/statistics-panel.test.tsx`,
  `api/orientation-mark*.test.ts`, `supabase/tests/`.

## Open decisions

- None.

## Verification

- `npm test -- src/features src/lib src/components src/i18n api/orientation-mark` → A1–A4, A6
- `npx tsc --noEmit` and `grep -rn "DensityStrip\|DistributionDetailsSection\|holderScores\|orientationScores" src` → A5
- `make check`
- Reviewer read of the docs diff → A7, A8

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

- Changed files:
- Checks not run, blockers, or open questions:
- LLM contributions: Claude Sonnet 5.5 (Claude Code): specification; ADR 0020. Implementation and review: not yet done.
