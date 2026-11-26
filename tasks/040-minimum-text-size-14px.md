# 040 — No text smaller than 14px

**Status:** In review

## Goal

Implement [ADR 0019](../docs/adr/0019-minimum-text-size-14px.md). About forty places in `src/` set text at 11–13px:
`text-xs` (12px), `text-[13px]` and `text-[11px]`, in hints, captions, the formula, disclaimers, settings, the holder flow
and the start screen. After this task, all text is at least 14px (`text-sm` or larger), except:

- tick and axis labels on the score ruler and the distribution charts (`ScoreTape`, `DensityStrip` and similar), and
- short badges or stickers (a few words inside a pill, such as the Polish-school bonus sticker from task 028),

which may stay at 12px. Nothing anywhere is below 12px. This includes sizes set in `src/index.css` and inline styles, not
only Tailwind classes.

Where a larger size breaks a layout (a line that now wraps and collides, a pill that overflows), fix the spacing so the
screen still reads cleanly at 360px width; do not shorten copy. Keep the visual hierarchy with colour and weight.

## Context

- Relevant code and docs: every file listed by `grep -rnE "text-xs|text-\[1[0-3]px\]" src` (about 21 files: GradeInputs,
  HowItWorksPanel, LanguageSwitcher, MiniAppShell, NawaScorePreview, RadioOption, ResultPreviewCard, SearchableSelect,
  settings/AboutView, settings/HelpView, WizardProgressBar, ConfirmSummary, dashboard/ResultHeroCard,
  scholarship-report/*, score/ProfileDetails, score/ScoreScreen, StartScreen, wizard/GradesStep), `src/index.css`
  (`font-size` rules), `docs/ux-review.md` ("Читаемость").
- ADRs this task follows: [0019](../docs/adr/0019-minimum-text-size-14px.md). Replaces none.
- Dependencies and decisions already made: decided 2026-11-26. Task 038 deletes `CompetitionNeighbourhoodDetails.tsx`; skip
  it if it is still present. Tasks 026–031 changed several of these files and are in the working tree; build on them.

## Scope

- In scope: font sizes and the spacing fixes they need, in `src/`.
- Out of scope: copy, colours, the ruler's geometry, the bot's messages.
- Files or directories assigned to this task: `src/components/`, `src/features/`, `src/pages/`, `src/index.css`. Tests only where an
  existing test asserts a class name.

## Acceptance scenarios

| ID | Given / when | Expected result | Planned verification |
| --- | --- | --- | --- |
| A1 | Codebase search | `grep -rnE "text-\[(1[01]|[0-9])px\]" src` finds nothing; every remaining `text-xs` or `text-[12px]`/`text-[13px]` is on a ruler/chart label or a badge, and the handoff lists each with its reason | Command and list in the handoff |
| A2 | `src/index.css` and inline styles | No `font-size` below 14px except ruler/chart labels and badges (12px) | Reviewer read; grep for `font-size` in the handoff |
| A3 | First-time user: start screen, Education, Grades steps, at 360px width | No text below 14px except badges; nothing overlaps or overflows | Manual in Chrome (DevTools device 360×740) with the dev server already running |
| A4 | Returning user: dashboard (light and dark), Settings, About, Help, holder flow and results | Same as A3 | Manual in Chrome |
| A5 | Tests and build | Pass | `make check` |

## Must stay unchanged

- Behavior, contracts, or user-facing copy this task must not alter: all copy and behavior; ruler and chart label sizes; badge sizes.
- Existing checks that already cover it: the full test suite.

## Open decisions

- None.

## Verification

- `grep -rnE "text-xs|text-\[1[0-3]px\]" src` and `grep -rn "font-size" src` → A1, A2
- `make check` → A5
- Manual in Chrome at 360px, light and dark, first-time and returning user. Do not run `make dev` / `make dev-new` if
  ports 3000/3001 are already serving; reuse the running server → A3, A4

## Handoff

| Scenario | Evidence (command, test assertion, or manual check) | Result |
| --- | --- | --- |
| A1 | `grep -rnE "text-\[(1[01]\|[0-9])px\]" src` finds nothing. `grep -rnE "text-xs\|text-\[[0-9.]+px\]" src --include='*.tsx'` (non-test) leaves only: `RadioOption.tsx:40` `text-xs` (the Polish-school bonus sticker pill, a badge); `ScoreTape.tsx:164` and `:174` `text-[12.5px]` (red flag labels on the score ruler: threshold flag and orientation-mark flag, ruler labels, left as is, ruler geometry out of scope); the rest are display numbers (17, 18, 22, 40px). No `text-xs` / `text-[12px]` / `text-[13px]` remains elsewhere. Also raised: 12px formula `<pre>` in `HowItWorksPanel` (`text-[0.75rem]`), 11px `text-[0.6875rem]` hint and legend in the mini `DensityStrip`, 10px `text-[0.625rem]` kicker note in `StartScreen`, and the 12.5/13.5px `ThresholdChip` (a sentence in a pill, so not a badge; now `text-sm`). `DensityStripAxis` ticks (11px) raised to 12px (axis labels). | Pass |
| A2 | `grep -rn "font-size" src` in `src/index.css`: 0.875rem at `.disclosure-row__label`, `.density-strip__title`, `.density-strip__median-hint`, `.density-strip__caption` (the last three raised from 12/11/12px); 0.75rem at `.stat-badge` (badge), `.density-strip__user-label`, `.density-strip__holder-label`, `.density-strip__label` (chart marker/axis labels; the latter two raised from 10px). No inline `fontSize` anywhere in `src`. Spacing fix: `.density-strip__header` now wraps (`flex-wrap`, row gap 0.25rem) so the uppercase title and the median hint do not collide at 360px. | Pass |
| A3 | Not run for the first-time flow (start screen, Education, Grades): the running dev server holds a returning user and I did not create a new profile. Not verified visually; the new sizes are plain Tailwind `text-sm` on helper/hint/error text there. | Not run |
| A4 | Chrome, same-origin 360x740 iframe on the running dev server (window resize did not change the viewport), returning user, light theme: dashboard, Settings sheet, Help, About. Computed `font-size` scan of every text node: nothing below 14px except the density chart "Вы" marker and axis ticks (12px) and the ruler flag "порог 60" (12.5px); no element extends past x=360, no horizontal scroll (scrollWidth 345). Not run: dark theme, holder survey/results flow, the visual look at 360px. | Partial |
| A5 | `make check` exits 0 (68 test files, 694 tests passed; typecheck passed). No test asserted a changed class name. | Pass |

- Changed files: `src/index.css`, `src/components/{DensityStrip,GradeInputs,HowItWorksPanel,MiniAppShell,NawaScorePreview,RadioOption,ResultPreviewCard,SearchableSelect,WizardProgressBar}.tsx`, `src/components/settings/{AboutView,HelpView}.tsx`, `src/features/{ConfirmSummary,StartScreen}.tsx`, `src/features/dashboard/ResultHeroCard.tsx`, `src/features/scholarship-report/{ScholarshipReportCard,ScholarshipReportFlow,ScholarshipReportResults}.tsx`, `src/features/score/{ProfileDetails,ScoreScreen,ThresholdChip}.tsx`, `src/features/wizard/GradesStep.tsx`. Only font sizes plus the one `flex-wrap` rule in `.density-strip__header`.
- Checks not run, blockers, or open questions: A3 not run; A4 partial (dark theme, holder flow, visual 360px review not run). Judgment calls: the season label in the `ResultHeroCard` header is plain text, not a pill, so it is now 14px; the `ThresholdChip` is a sentence, so it is 14px; ruler flags stay at 12.5px as ruler labels. Reviewer to confirm. No blockers.
- LLM contributions: Opus 5.5 (Claude Code): specification and ADR 0019. Sonnet 5.5 (Claude Code subagent): implementation.
