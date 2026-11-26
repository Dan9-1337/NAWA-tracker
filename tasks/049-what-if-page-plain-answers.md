# 049 — What-if page: how far from the ориентир and what place, in plain words

**Status:** Ready

## Goal

The What-if page ([ADR 0020](../docs/adr/0020-dashboard-hub-and-pages.md), point 5) answers the question people actually ask
when they drag the ruler: "how far is this from the `ориентир 2026`, and where would I stand?". Today the page ends in a
percentile band ("между 60-м и 70-м процентилем") and carries two controls that do the same thing (the tape and the
−/+ input; `docs/ux-review.md`, P1.6).

Intended behavior of the page (title `Что если средний балл другой?`, from task 046):

1. The ruler with the threshold flag and the fixed `ориентир 2026` mark, as today.
2. The score row: the score, `/ 100` and the threshold chip (the saved score until the ruler moves, then the what-if score).
3. **Distance to the ориентир**, when the country has a mark and whether or not the ruler moved:
   `Выше ориентира 2026 (87,5) на 4,1`, `До ориентира 2026 (87,5) не хватает 3,2` or `Ровно на уровне ориентира 2026 (87,5)`.
   One decimal; the numbers use the locale's decimal separator. With no mark, no line.
4. **Place range**, only while a what-if is active and the country has a distribution
   (`detailsAvailable` and 16 buckets): `С таким баллом ваше место было бы 1–2 из 4`, or `…место было бы 2 из 4` when the
   range is a single place. The total is the number of surveys in the country (the user's own survey is replaced by the
   what-if score, not added). The range comes from the 16 buckets: remove the user's saved score from its bucket, then
   `above_min` = surveys in buckets strictly above the what-if score's bucket, `above_max` = `above_min` + surveys in
   its own bucket, range = `above_min + 1` to `above_max + 1`. Bucket index = `floor((score − 60) / 2.5)`, clamped to 0–15
   (100 falls in the last bucket); a score below 60 is below every bucket (`above_min = above_max` = all the other surveys, so the
   place is the last one). The numerals carry no ordinal suffix, so no locale has to inflect them.
5. `Ввести точно`: a collapsed disclosure holding the exact-average input with its −/+ buttons. It starts collapsed every
   visit. The input validates and applies exactly as today.
6. While a what-if is active: the saved-score line, `Сбросить`, and the existing note that nothing is saved. They sit
   next to the score row and are visible without opening the disclosure.

The percentile band and its i18n keys disappear. The full-distribution disclosure under the ruler is still rendered by
task 046 and is removed by task 052; this task does not touch it.

## Context

- Relevant code and docs: `src/features/score/ScoreScreen.tsx`, `src/features/score/score-screen.test.tsx`,
  `src/lib/score-buckets.ts` (`FINE_BUCKET_COUNT`, `percentileBand`), `src/lib/score-tape.ts`, `src/components/ScoreTape.tsx`,
  `src/features/score/ThresholdChip.tsx`, [Product flow](../docs/product-flow.md), `docs/ux-review.md`.
- ADRs this task follows: [0020](../docs/adr/0020-dashboard-hub-and-pages.md), [0017](../docs/adr/0017-orientation-mark-from-holder-scores.md),
  [0015](../docs/adr/0015-compare-within-citizenship-country-without-minimum.md), [0019](../docs/adr/0019-minimum-text-size-14px.md). Replaces none.
- Dependencies and decisions already made: tasks 029, 033 and 046 are `Done`. The what-if is never saved and stays off the
  result card. `percentileBand` is used only by the band this task removes: delete it and its tests if nothing else uses it
  after the change (check with a search); leave `percentileInBuckets`, `displayBuckets` and the rest for task 052.
  Copy is given in Russian; write uk, be, pl and en from the glossaries (ADR 0010).

## Scope

- In scope: the page layout above; a pure helper `whatIfPlaceRange(score, savedScore, buckets)` and its tests; the distance
  line; the `Ввести точно` disclosure; removing the percentile band and its keys; i18n; `docs/product-flow.md` (what-if
  paragraph).
- Out of scope: the ruler's maths and haptics, the threshold chip, the hub, the invite button (048), the distribution
  disclosure (052), any server change, any new product event (`what_if_used` keeps its meaning and fires once).
- Files or directories assigned to this task: `src/features/score/ScoreScreen.tsx`, `src/features/score/score-screen.test.tsx`,
  `src/lib/what-if-place.ts` and its test (new), `src/lib/score-buckets.ts` and `src/lib/score-buckets.test.ts` (only the
  `percentileBand` removal), `src/i18n/*`, `docs/product-flow.md`.

## Acceptance scenarios

| ID | Given / when | Expected result | Planned verification |
| --- | --- | --- | --- |
| A1 | Mark 87,5; score shown 100 / 80 / 87,5 | `Выше ориентира 2026 (87,5) на 12,5` / `До ориентира 2026 (87,5) не хватает 7,5` / `Ровно на уровне ориентира 2026 (87,5)` | `score-screen.test.tsx` |
| A2 | No mark for the country | No distance line | `score-screen.test.tsx` |
| A3 | Four surveys at 100 (the user), 90, 85, 70; the ruler moves the score to 88 | `С таким баллом ваше место было бы 2 из 4` | `what-if-place.test.ts` and `score-screen.test.tsx` |
| A4 | The same surveys; the score moves to 90 | `…место было бы 1–2 из 4` | `what-if-place.test.ts` |
| A5 | A score below 60; a score of 100 | Last place (`4 из 4`) / `1 из 4` | `what-if-place.test.ts` |
| A6 | The ruler has not moved, or the country has fewer than two surveys, or no distribution | No place line | `score-screen.test.tsx` |
| A7 | The page opens | `Ввести точно` is collapsed; the input is not in the document until it is opened | `score-screen.test.tsx` |
| A8 | The disclosure is open; the user types `4,5`, `abc`, and presses − and + | The ruler and score follow exactly as before; invalid text shows the existing error | Existing tests adjusted |
| A9 | A what-if is active; the user presses `Сбросить` | The score returns to the saved one; the saved-score line, the place line and the note disappear | `score-screen.test.tsx` |
| A10 | The page in any state | No `what-if-percentile-band` element and no band text; `percentileBand` is gone if unused | Test and search |
| A11 | The ruler is moved | `what_if_used` is sent once | Existing test passes |
| A12 | Five locales | New keys in all five, removed keys gone; glossary tests pass | `src/i18n/locales.test.ts`, `src/i18n/glossary.test.ts` |
| A13 | Browser at 390×700, ruler dragged | Readable, no text below 14px except ruler labels and badges | Manual (optional) |

## Must stay unchanged

- Behavior, contracts, or user-facing copy this task must not alter: the score maths (`scoreForAverage`), the ruler drag,
  steps and haptics, the threshold chip, the `ориентир` mark on the ruler, the saved score, the hub and the result card.
- Existing checks that already cover it: `src/features/score/score-screen.test.tsx`, `src/lib/score-tape.test.ts`,
  `src/lib/score-buckets.test.ts`, `src/features/ProfileDashboard.test.tsx`.

## Open decisions

- None.

## Verification

- `npm test -- src/features/score src/lib src/i18n` → A1–A12
- `make check`
- Manual (optional): `make dev`, the what-if page in the browser → A13

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
| A11 | | |
| A12 | | |
| A13 | | |

- Changed files:
- Checks not run, blockers, or open questions:
- LLM contributions: Claude Sonnet 5.5 (Claude Code): specification; ADR 0020. Implementation and review: not yet done.
