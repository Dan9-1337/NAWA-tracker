# 046 — Dashboard hub and page shell

**Status:** Ready

## Goal

Turn the saved dashboard from one scrolling screen into a **hub** and **pages** ([ADR 0020](../docs/adr/0020-dashboard-hub-and-pages.md)),
without changing what any block says or computes. This task is the shell the other hub tasks (047–052) build on: the view
state, the Telegram Back handling, the scroll behavior and the two entry rows. Blocks move; their content does not.

Intended behavior after this task:

- **Hub** (the default): the existing result card (`StatisticsPanel`, unchanged), the existing holder card
  (`ScholarshipReportCard`, only when `scholarshipReportEligible`, unchanged), then two full-width link rows:
  `Что если средний балл другой?` (opens the What-if page) and `Мой профиль и формула` (opens the Profile page). The hub no
  longer renders the what-if block, the full-distribution disclosure or the profile block.
- **What-if page**: a page title and the existing `ScoreScreen`, followed for now by the existing `StatisticsDistribution`
  (task 052 removes it). The ruler, the input, the percentile band and the `ориентир` mark behave as today.
- **Profile page**: a page title and the existing `ProfileDetails`; its rows still open the edit wizard at their step.
- **Back**: on a page, the Telegram Back button is visible and returns to the hub. The hub keeps its scroll position;
  a page opens at its top. The holder flow and the holder results keep their own Back behavior and now return to the hub.
- **Edit wizard**: opened from a Profile row, Back returns to the Profile page; opened from Settings, Back returns to the
  hub; a successful save returns to the hub with the existing saved line ([task 027](027-save-flow-returns-to-dashboard.md)).
- **Main button**: the hub keeps the invite button as it is after [task 036](036-dashboard-main-button-invites-country.md)
  (label and event unchanged here; task 048 renames it). The What-if and Profile pages show no main button yet.

Pages are in-app views held in `ProfileDashboard` state, not URL routes.

## Context

- Relevant code and docs: `src/features/ProfileDashboard.tsx` (`view`, `chromeConfig`, `openEditAt`, `leaveEditWizard`),
  `src/features/score/ScoreScreen.tsx`, `src/features/score/ProfileDetails.tsx`, `src/features/statistics/StatisticsPanel.tsx`,
  `src/features/scholarship-report/ScholarshipReportCard.tsx`, `src/lib/useScrollToTop.ts` (`APP_SCROLL_ATTRIBUTE`,
  `scrollAppToTop`, `useScrollToTopOnChange`), `src/components/MiniAppShell.tsx` (`DevActionBar` renders the Back action
  outside Telegram), [Product flow](../docs/product-flow.md).
- ADRs this task follows: [0020](../docs/adr/0020-dashboard-hub-and-pages.md), [0019](../docs/adr/0019-minimum-text-size-14px.md). Replaces none.
- Dependencies and decisions already made: the maintainer chose a hub with pages over tabs and over one scroll
  (2026-11-26). **Do not start until the reviewer has closed (`Done`) the in-review tasks that touch the same files:
  027, 029, 033, 036, 038, 039, 040 and 041.** Build on their final state, not on the working tree while they are open.
  The link-row and page-title copy is given in Russian above; write uk, be, pl and en from the locale glossaries
  (ADR 0010); uk and be remain drafts for native review (assumption C3).

## Scope

- In scope: the page state and Back handling in `ProfileDashboard`; a small page frame component (title, spacing) and a link
  row component; scroll restore for the hub; the new i18n keys in all five locales; moving the existing blocks as described;
  updating `docs/product-flow.md` (Dashboard section) to describe hub and pages.
- Out of scope: any change inside the moved blocks; the position visual and hub copy (047); the invite label and main button
  on the pages (048); the What-if wording (049); the holder card's states (050); the Profile page's content (051); removing
  `DensityStrip` and the distribution (052); new product events (none are added: `what_if_used` and the invite events keep
  their meaning).
- Files or directories assigned to this task: `src/features/ProfileDashboard.tsx`, `src/features/dashboard/DashboardPage.tsx`
  (new), `src/features/dashboard/HubLink.tsx` (new), `src/lib/useScrollToTop.ts`, `src/features/ProfileDashboard.test.tsx`,
  `src/i18n/{ru,uk,be,pl,en}.ts` and `src/i18n/types.ts`, `docs/product-flow.md`.

## Acceptance scenarios

| ID | Given / when | Expected result | Planned verification |
| --- | --- | --- | --- |
| A1 | A returning user with a 2026 Director survey opens the dashboard | The hub shows the result card, the two link rows, and the holder card when eligible; it does not contain `what-if-block`, `profile-block` or the distribution disclosure | `ProfileDashboard.test.tsx` |
| A2 | The user taps `Что если средний балл другой?` | The What-if page shows `what-if-block`; the fake Telegram Back button is visible; pressing it shows the hub again | `ProfileDashboard.test.tsx` (fake WebApp back button) |
| A3 | The user taps `Мой профиль и формула`, then a profile row | The wizard opens at that row's step; Back returns to the Profile page; saving returns to the hub and shows the saved line | `ProfileDashboard.test.tsx` |
| A4 | Settings requests an edit (`editRequestNonce`) | The wizard opens at the first step; Back returns to the hub | Existing test adjusted |
| A5 | The user scrolls the hub, opens a page, goes back | The page opened at its top; the hub is at the earlier scroll position | `ProfileDashboard.test.tsx` with the scroll container (`data-app-scroll`) |
| A6 | Hub, What-if page, Profile page | Main button: invite text on the hub (as today); not visible on the two pages | `ProfileDashboard.test.tsx` (dev chrome state) |
| A7 | The holder flow or the holder results is open and the user presses Back | Returns to the hub | Existing tests pass |
| A8 | The ruler is moved on the What-if page | `what_if_used` is sent once, as before | Existing test passes |
| A9 | All five locales | The new keys exist in all five and the glossary tests pass | `src/i18n/locales.test.ts`, `src/i18n/glossary.test.ts` |
| A10 | Browser at 390×700, first-time and returning user (`make dev-new`, `make dev`) | The hub renders; each page opens and returns; no text below 14px | Manual (optional) |

## Must stay unchanged

- Behavior, contracts, or user-facing copy this task must not alter: the score, the position and the statistics requests;
  the what-if maths and band; the profile rows and the formula; the edit wizard and its cohort warning; the holder flow
  and results; the invite button on the hub; the saved line; first-time flow (`StartScreen`, `CreateProfileFlow`).
- Existing checks that already cover it: `src/features/ProfileDashboard.test.tsx`, `src/features/score/score-screen.test.tsx`,
  `src/features/score/profile-details.test.tsx`, `src/features/statistics/statistics-panel.test.tsx`,
  `src/pages/home-page.test.tsx`, `src/components/mini-app-shell.test.tsx`.

## Open decisions

- None.

## Verification

- `npm test -- src/features src/pages src/components/mini-app-shell src/i18n` → A1–A9
- `make check`
- Manual (optional): `make dev` and `make dev-new` (they overwrite `.env.local` and stop processes on ports 3000/3001; check first) → A10

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
- LLM contributions: Claude Sonnet 5.5 (Claude Code): specification; ADR 0020. Implementation and review: not yet done.
