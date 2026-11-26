# 051 — Profile page: the formula in words

**Status:** Ready

## Goal

The Profile page ([ADR 0020](../docs/adr/0020-dashboard-hub-and-pages.md)) keeps the four profile rows and adds one sentence
that says in words how the score is built, above the numeric line that is there today. Until now the only explanation was
`4,82 × 90 ÷ 5 + 5 = 95,76`, which reads as arithmetic, not as a rule.

Intended behavior (page title `Мой профиль и формула`, from task 046):

1. The four rows (citizenship, average, scale, Polish school), each opening the edit wizard at its step, unchanged.
2. A sentence above the numeric line: `Как считается балл: средний балл ÷ максимум шкалы × 90, плюс 5 или 10 баллов за польскую
   школу.` It is the same for every profile and says nothing about a country's bonus rules or a student in Poland (the numeric
   line below still shows the user's own bonus, including 0).
3. The existing numeric line and the existing disclaimer that passing the threshold does not guarantee a scholarship, unchanged.

Nothing else on the page changes: the page frame, Back, scroll and edit-origin handling are task 046's.

## Context

- Relevant code and docs: `src/features/score/ProfileDetails.tsx`, `src/features/score/profile-details.test.tsx`,
  `src/lib/score-tape.ts` (`scoreForAverage`), `docs/assumptions.md` (S1, S3, S4), [Product flow](../docs/product-flow.md).
- ADRs this task follows: [0020](../docs/adr/0020-dashboard-hub-and-pages.md), [0019](../docs/adr/0019-minimum-text-size-14px.md). Replaces none.
- Dependencies and decisions already made: task 046 is `Done`. The maintainer accepted the Profile page as "rows, formula, edit"
  with no other change (2026-11-26). Write uk, be, pl and en from the glossaries (ADR 0010).

## Scope

- In scope: the one sentence and its i18n key in five locales; its test; `docs/product-flow.md` (the profile block line).
- Out of scope: the rows' labels and chevrons, the numeric formula, the disclaimer, the wizard, the score maths, any
  other page.
- Files or directories assigned to this task: `src/features/score/ProfileDetails.tsx`, `src/features/score/profile-details.test.tsx`,
  `src/i18n/*`, `docs/product-flow.md`.

## Acceptance scenarios

| ID | Given / when | Expected result | Planned verification |
| --- | --- | --- | --- |
| A1 | A profile with no Polish-school bonus opens the Profile page | The sentence appears above the numeric line; the numeric line shows no bonus term | `profile-details.test.tsx` |
| A2 | A profile with a Polish-school bonus of 5 | The same sentence; the numeric line shows `+ 5` | `profile-details.test.tsx` |
| A3 | A profile row is tapped | The wizard opens at that row's step as before | Existing test passes |
| A4 | Five locales | The new key exists in all five; glossary tests pass | `src/i18n/locales.test.ts`, `src/i18n/glossary.test.ts` |
| A5 | The page at 390px | The sentence wraps within the width at 14px or larger | Manual (optional) |

## Must stay unchanged

- Behavior, contracts, or user-facing copy this task must not alter: the score maths, the numeric formula line, the disclaimer,
  the row labels and values, the edit wizard.
- Existing checks that already cover it: `src/features/score/profile-details.test.tsx`, `src/features/ProfileDashboard.test.tsx`.

## Open decisions

- None.

## Verification

- `npm test -- src/features/score src/i18n` → A1–A4
- `make check`
- Manual (optional): `make dev`, the Profile page → A5

## Handoff

| Scenario | Evidence (command, test assertion, or manual check) | Result |
| --- | --- | --- |
| A1 | | |
| A2 | | |
| A3 | | |
| A4 | | |
| A5 | | |

- Changed files:
- Checks not run, blockers, or open questions:
- LLM contributions: Claude Sonnet 5.5 (Claude Code): specification; ADR 0020. Implementation and review: not yet done.
