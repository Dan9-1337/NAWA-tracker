# 068 — Education step: citizenship, then one yes/no about the school country

**Status:** Ready

## Goal

Turn the first wizard step from two country selects into one select and one yes/no question
(the maintainer's design, 2026-11-26: citizenship is one country; the school may be in another; ask it as a yes/no).
Seen live: a new user picks `Украина` for citizenship and is asked for the school country again, with an empty select, although the
two match for most people. Today a user must open and search two lists before the first question about grades.

Intended behavior of the step (create and edit wizard):

1. **Citizenship** — the country select, as today, with the hint `Вас сравнят с кандидатами из этой страны.`
2. **After a citizenship is chosen**, the question `Школу окончили в другой стране?` with two segmented choices `Нет` and `Да`,
   **`Нет` preselected**, and under it the line `Нет — значит, в стране гражданства: Украина.` (the country name in the nominative, so
   no locale has to inflect it).
3. **`Нет`:** the school country equals the citizenship country and follows it if the citizenship changes. No second select.
4. **`Да`:** the school-country select appears below, empty, with the hint `От страны школы зависит шкала оценок, например 12 баллов в
   Украине.`; the user must pick one before `Далее`.
5. Switching back from `Да` to `Нет` sets the school country to the citizenship again.
6. A saved survey or a restored draft whose school country differs from its citizenship opens with `Да` and the country shown; one
   where they are equal opens with `Нет`. A `startapp=c_XX` link prefills citizenship and leaves the question on `Нет`.
7. `Далее` is enabled when citizenship is chosen and, with `Да`, a school country is chosen. The scale and everything after are unchanged.

## Context

- Relevant code and docs: `src/features/wizard/EducationStep.tsx`, `src/features/ResponseWizardSteps.tsx` (`canAdvanceWizardStep`, the
  draft updates), `src/features/CreateProfileFlow.tsx` (the `startapp` prefill, `getTelegramStartCountry`), `src/lib/draft.ts` and
  `src/lib/draft-rules.ts` (draft shape, rules about school country), `src/components/CountrySelect.tsx`, `src/components/RadioOption.tsx`,
  `docs/ux-review.md` (P1.1), [Product flow](../docs/product-flow.md).
- ADRs this task follows: none. Replaces none. The saved data does not change (`rankingCountry` and `schoolCountry` are still both stored).
- Dependencies and decisions already made: `Нет` is preselected because it is the common case; the draft format keeps both fields, so
  old drafts load. Task 064 is `Done` (it also edits the wizard's draft handling). This task
  works with the country select as it exists, so it does not wait for task 069. Write uk, be, pl and en copy from the glossaries (ADR 0010).

## Scope

- In scope: the step layout and copy above in five locales; the school-country rule (follows citizenship while `Нет`); mapping saved
  and drafted data to `Да` or `Нет`; tests; `docs/product-flow.md` (the education step paragraph).
- Out of scope: the country picker's look (task 069), the grades step, scale rules, the cohort-change warning, the draft format.
- Files or directories assigned to this task: `src/features/wizard/EducationStep.tsx`, `src/features/ResponseWizardSteps.tsx`,
  `src/features/CreateProfileFlow.tsx`, `src/lib/draft.ts`, `src/lib/draft-rules.ts` and their tests, `src/i18n/*`, `docs/product-flow.md`.

## Acceptance scenarios

| ID | Given / when | Expected result | Planned verification |
| --- | --- | --- | --- |
| A1 | A first-time user opens the step | Only the citizenship select shows; the yes/no question is not in the document yet | `ResponseWizardSteps` / education step test |
| A2 | Citizenship `Украина` is chosen | The question shows with `Нет` selected and the line `Нет — значит, в стране гражданства: Украина.`; no school select; `Далее` is enabled; the draft has `schoolCountry` `UA` | Same |
| A3 | The user then picks `Да` | The school select appears empty and `Далее` is disabled until a country is chosen | Same |
| A4 | `Да` with `KZ`, then back to `Нет` | The school country becomes `UA` again and the select disappears | Same |
| A5 | Citizenship changes from `UA` to `BY` while on `Нет` | `schoolCountry` becomes `BY` | Same |
| A6 | An edit wizard on a survey with citizenship `BY` and school `PL`; and one with `UA`/`UA` | `Да` with `Польша` shown; `Нет` | `ProfileDashboard.test.tsx` |
| A7 | The app opens with `startapp=c_KZ` | Citizenship `Казахстан`, `Нет`, scale 5 later | `CreateProfileFlow` test / `telegram-start.test.ts` |
| A8 | A restored v1 or v2 draft | Loads without error and shows the right choice | `draft.test.ts` |
| A9 | Saving a user who chose `Нет` | The request has equal `rankingCountry` and `schoolCountry` | Existing contract tests pass |
| A10 | Five locales | New keys in all five; glossary tests pass | `src/i18n/locales.test.ts`, `src/i18n/glossary.test.ts` |

## Must stay unchanged

- Behavior, contracts, or user-facing copy this task must not alter: what is saved, the scale rules, the cohort-change warning on
  citizenship changes, the grades step, `startapp` handling.
- Existing checks that already cover it: `src/lib/draft.test.ts`, `src/lib/draft-rules.test.ts`, `src/lib/telegram-start.test.ts`,
  `src/features/ProfileDashboard.test.tsx`, `shared/api-contracts.test.ts`.

## Open decisions

- None.

## Verification

- `npm test -- src/features src/lib src/i18n shared` → A1–A10
- `make check`
- Manual (optional): `make dev-new`, the first step at 390×700 → A1–A3

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
- LLM contributions: Claude Sonnet 5.5 (Claude Code): specification (the yes/no design is the maintainer's). Implementation and review: not yet done.
