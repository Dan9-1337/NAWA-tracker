# 060 — The ruler looks like a ruler: an end stop, a plain hint, one gentle nudge

**Status:** Ready

## Goal

Make the what-if ruler read as something you can move (the maintainer approved this on 2026-11-26). Seen live at 390px:
at a score of 100 the right half of the track is a black plate that looks broken; the hint says `Перетащите линейку: средний балл
изменится на 0,05`, which nobody understands (0,05 of what, per what?); and nothing tells a new user that the ruler moves.

Intended behavior:

1. **End stop.** The track ends at 100 with a visible end cap right after the `100` tick. No dark empty block is drawn beyond it, at
   any score. The pointer cannot go past it (the tape already clamps; this is only the look).
2. **Hint.** The text under the ruler on the What-if page and on the landing sample is `Двигайте линейку влево и вправо`
   (key `scoreScreen.tapeHint` takes no argument any more). The step size, `Шаг: 0,05`, is shown as helper text inside the `Ввести
   точно` disclosure of [task 049](049-what-if-page-plain-answers.md).
3. **One nudge.** The first time the What-if page opens on a device, the tape moves about 12px right and back over about 900ms,
   once. It is skipped under `prefers-reduced-motion`, when the user has already moved the ruler in this session, and when browser
   storage is unavailable. It is remembered per device (`localStorage` key `nawa-tape-nudged`, every access in try/catch). The landing
   sample does not nudge.

## Context

- Relevant code and docs: `src/components/ScoreTape.tsx` (track, ticks, flag, `referenceMark`), `src/lib/score-tape.ts`,
  `src/features/score/ScoreScreen.tsx` (hint, disclosure from task 049), `src/components/ResultPreviewCard.tsx` (landing sample),
  `src/index.css` (tape styles; `prefers-reduced-motion` rules at the end), `src/i18n/*` (`scoreScreen.tapeHint`, `start.previewTapeHint`).
- ADRs this task follows: [0019](../docs/adr/0019-minimum-text-size-14px.md), [0020](../docs/adr/0020-dashboard-hub-and-pages.md). Replaces none.
- Dependencies and decisions already made: tasks 029 and 049 are `Done` (they edit `ScoreScreen.tsx`). The tape's maths,
  haptics and keyboard control (`role="slider"`, arrow keys) do not change.

## Scope

- In scope: the end stop; the new hint in five locales; the step text inside the exact-input disclosure; the one-time nudge;
  tests.
- Out of scope: the threshold flag and the `ориентир` mark, the tape's scale and ticks, the saved score, the hub, the hatched area
  below 60 on the landing sample.
- Files or directories assigned to this task: `src/components/ScoreTape.tsx`, `src/features/score/ScoreScreen.tsx`,
  `src/features/score/score-screen.test.tsx`, `src/components/ResultPreviewCard.tsx`, `src/index.css` (tape rules only), `src/i18n/*`.

## Acceptance scenarios

| ID | Given / when | Expected result | Planned verification |
| --- | --- | --- | --- |
| A1 | The ruler at score 100 and at score 60 | No element of the tape draws a dark block beyond the `100` tick; an end-cap element is present after it | Component test on the DOM; screenshot in the handoff |
| A2 | The What-if page and the landing sample | The hint reads `Двигайте линейку влево и вправо`; it contains no `0,05` | `score-screen.test.tsx`, `StartScreen.test.tsx` |
| A3 | `Ввести точно` is opened | It shows `Шаг: 0,05` (locale decimal separator) | `score-screen.test.tsx` |
| A4 | First open of the What-if page (empty storage, fake timers) | The tape runs the nudge once (a class or transform change is observed, then removed) and the storage key is set | `score-screen.test.tsx` |
| A5 | Second open; `prefers-reduced-motion: reduce`; storage throws | No nudge in each case, and nothing crashes | `score-screen.test.tsx` |
| A6 | The user drags the ruler before the nudge would run | No nudge | `score-screen.test.tsx` |
| A7 | The ruler is used with the keyboard (arrows, Page keys) and by dragging | Behavior and `aria-valuenow` as before | Existing tests pass |
| A8 | Five locales | The hint key has no placeholder in any locale; key sets match | `src/i18n/locales.test.ts` |

## Must stay unchanged

- Behavior, contracts, or user-facing copy this task must not alter: the score maths and clamp, haptics on selection and on crossing
  the threshold, the threshold flag and the `ориентир` mark, the saved score and the hub.
- Existing checks that already cover it: `src/features/score/score-screen.test.tsx`, `src/lib/score-tape.test.ts`,
  `src/features/StartScreen.test.tsx`.

## Open decisions

- None.

## Verification

- `npm test -- src/features src/components src/lib/score-tape src/i18n` → A1–A8
- `make check`
- Manual (optional): `make dev`, the What-if page → screenshot for A1

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
- LLM contributions: Claude Sonnet 5.5 (Claude Code): specification. Implementation and review: not yet done.
