# 041 — Skeletons instead of "Loading…" lines

**Status:** In review

## Goal

Three places show a single grey line while data loads: the home page ("Загрузка анкеты…", `HomePage.tsx`, the first
thing every user sees), the statistics panel ("Загрузка статистики…", `StatisticsPanel.tsx`) and the holder results page
("Загрузка результатов…", `ScholarshipReportResults.tsx`). The page then jumps when content arrives.

Intended behavior: each of the three shows a skeleton shaped like the content that will replace it (blocks of the same
rough height and position: for the home page, the dashboard's top card or the start screen's title and card; for
statistics, the position card; for the holder results, the summary rows), so the layout does not jump much when it loads.

- Skeleton blocks use theme-aware colours (existing CSS variables such as the section background and divider), readable in
  light and dark themes.
- A gentle pulse animation is allowed; under `prefers-reduced-motion: reduce` it is static (follow the existing rule in
  `src/index.css`).
- Accessibility stays as today: the container keeps `role="status"`, `aria-live="polite"` and the existing localized label
  (`t.home.loading`, `t.stats.loadingAriaLabel`, the results loading text) as its accessible name, visually hidden; the
  skeleton blocks are `aria-hidden`.
- The home page error state (`role="alert"` with the hint) is unchanged.
- One small shared skeleton component is used by all three.

## Context

- Relevant code and docs: `src/pages/HomePage.tsx` (loading/error section), `src/features/statistics/StatisticsPanel.tsx`
  (`state.status === 'loading'`), `src/features/scholarship-report/ScholarshipReportResults.tsx` (`summary.status`),
  `src/index.css` (reduced-motion rule), `docs/ux-review.md` (P2, "Момент результата").
- ADRs this task follows: [0019](../docs/adr/0019-minimum-text-size-14px.md) (no visible text is added, but keep it in mind).
  Replaces none.
- Dependencies and decisions already made: approved by the maintainer 2026-11-26. The programme-list loading text in the
  holder flow (`programmeLoading`) is a small inline state and stays.

## Scope

- In scope: the skeleton component, the three loading states, tests.
- Out of scope: data fetching, timing, error states, the programme-list loading text, optimistic rendering of the score.
- Files or directories assigned to this task: a new `src/components/Skeleton.tsx`, `src/pages/HomePage.tsx`,
  `src/features/statistics/StatisticsPanel.tsx`, `src/features/scholarship-report/ScholarshipReportResults.tsx`, `src/index.css`
  (only the animation), related tests.

## Acceptance scenarios

| ID | Given / when | Expected result | Planned verification |
| --- | --- | --- | --- |
| A1 | Home page while the current survey request is pending | A skeleton is shown; `getByRole('status', { name: <home loading text> })` still finds it | `home-page.test.tsx` |
| A2 | Statistics loading | Skeleton shown; the status keeps `t.stats.loadingAriaLabel` | StatisticsPanel test |
| A3 | Holder results loading | Skeleton shown; status with the loading text | `scholarship-report.test.tsx` |
| A4 | Home page load fails | The error alert and hint appear exactly as today | Existing test |
| A5 | `prefers-reduced-motion: reduce` | The skeleton does not animate | Reviewer reads the CSS; manual in Chrome DevTools (emulate reduced motion) |
| A6 | Light and dark theme, 360px | The skeleton is visible but subtle and roughly matches the loaded layout | Manual in Chrome with the dev server already running (throttle the network to see it) |

## Must stay unchanged

- Behavior, contracts, or user-facing copy this task must not alter: what loads and when; error states; loaded content.
- Existing checks that already cover it: `src/pages/home-page.test.tsx`, statistics and holder results tests.

## Open decisions

- None.

## Verification

- `npm test -- src/pages src/features/statistics src/features/scholarship-report` → A1–A4
- `make check`
- Manual in Chrome (reuse the running dev server; do not run `make dev` if ports 3000/3001 are serving) → A5, A6

## Handoff

| Scenario | Evidence (command, test assertion, or manual check) | Result |
| --- | --- | --- |
| A1 | `home-page.test.tsx` new test: pending `getCurrentResponse`; `getByRole('status', { name: pl.home.loading })` found, contains `aria-hidden` `.skeleton-block` elements. Passes. | Pass |
| A2 | `statistics-panel.test.tsx` loading case: status has text `Wczytywanie statystyk…`, name `pl.stats.loadingAriaLabel`, and `aria-hidden` skeleton blocks. Passes. | Pass |
| A3 | `scholarship-report.test.tsx` new test: pending summary; status named `pl.scholarshipReport.results.loading` with skeleton blocks. Passes. | Pass |
| A4 | `home-page.test.tsx` new test (no earlier test existed): non-401 failure shows `role="alert"` with `loadError` and `loadErrorHint`, no loading status. Passes; error JSX untouched. | Pass |
| A5 | CSS: `.skeleton-block { animation: none; }` inside the existing `@media (prefers-reduced-motion: reduce)` block in `src/index.css`. Not checked in Chrome DevTools. | Implemented; manual check not run |
| A6 | Colours use `--section-divider-color` (theme-aware, light and dark); pulse is opacity 1 to 0.5. Not checked visually in Chrome (manual check skipped). | Implemented; manual check not run |

- Changed files: `src/components/Skeleton.tsx` (new: `SkeletonBlock`, `SkeletonStatus`), `src/pages/HomePage.tsx`, `src/features/statistics/StatisticsPanel.tsx`, `src/features/scholarship-report/ScholarshipReportResults.tsx`, `src/index.css`, `src/pages/home-page.test.tsx`, `src/features/statistics/statistics-panel.test.tsx`, `src/features/scholarship-report/scholarship-report.test.tsx`.
- Checks not run, blockers, or open questions: `npm test -- src/pages src/features/statistics src/features/scholarship-report` (58 passed) and `make check` (692 tests, typecheck) pass. Manual Chrome checks (A5 reduced motion, A6 light/dark at 360px) were not run. No blockers.
- LLM contributions: Opus 5.5 (Claude Code): specification. Sonnet 5.5 (Claude Code subagent): implementation.
