# 043 — Ukrainian and Belarusian copy: a model proofreading pass and a list for a native speaker

**Status:** In review

## Goal

`uk` and `be` are the main audiences but are marked as drafts awaiting a native-speaker review (assumption C3). A model
cannot replace that review. This task does the part a model can do reliably and prepares the rest for a person:

1. **Fix clear errors** in `src/i18n/uk.ts` and `src/i18n/be.ts` (and the bot texts for `uk` and `be` in
   `shared/bot-messages.ts`): spelling, grammar and agreement errors; Russian words or forms left in the text
   (russisms, for example "являється", "приймаючи участь" in uk; Russian letters such as "и", "щ", "ъ" in be where the
   Belarusian word needs "і", "шч", "’"); untranslated English or Russian fragments; inconsistent terms that contradict the
   locale's glossary ([ADR 0010](../docs/adr/0010-locale-glossary-and-english-api-errors.md)).
2. **Do not rewrite style.** Wording that is correct but could be more natural is not changed; it goes to the list.
3. **List the uncertain cases** in a new file `docs/locale-review-uk-be.md`: a table per locale with the key, the current
   text, the proposed text, and why. This is what the native speaker reviews. Write the file's intro in English.
4. Keep the "draft" status everywhere it appears (README, assumption C3); the native review is still pending.

Rules from ADR 0010 hold: country names are never declined (`<Країна>: …`), one term per concept, neutral forms instead of
gendered ones where possible. Placeholders, plural helpers and function signatures stay exactly as they are.

## Context

- Relevant code and docs: `src/i18n/uk.ts`, `src/i18n/be.ts`, `src/i18n/glossary.test.ts` (the glossaries), `src/i18n/locales.test.ts`,
  `shared/bot-messages.ts`, `shared/country-names-be.ts` (task 030), task [030](030-localization-fixes-be-countries-units-back.md),
  task [007](007-natural-localization-copy.md).
- ADRs this task follows: [0010](../docs/adr/0010-locale-glossary-and-english-api-errors.md). Replaces none.
- Dependencies and decisions already made: the maintainer chose a model pass plus a list, with the native review still to
  come (2026-11-26). Run this **after** tasks 033, 036, 038 and 039 so new keys are included.

## Scope

- In scope: the fixes and the review list above.
- Out of scope: `ru`, `pl`, `en`; country name lists (task 030); changing keys or meaning; restyling.
- Files or directories assigned to this task: `src/i18n/uk.ts`, `src/i18n/be.ts`, `shared/bot-messages.ts` (uk and be only),
  a new `docs/locale-review-uk-be.md`.

## Acceptance scenarios

| ID | Given / when | Expected result | Planned verification |
| --- | --- | --- | --- |
| A1 | The diff of `uk.ts` and `be.ts` | Each change is a clear error fix of a kind listed in Goal 1; the handoff gives a count per kind and three examples per locale | Reviewer read |
| A2 | `docs/locale-review-uk-be.md` | Lists every uncertain or stylistic proposal with key, current, proposed, reason | Reviewer read |
| A3 | Keys, placeholders, plural helpers | Unchanged | `npm test -- src/i18n shared/bot-messages` |
| A4 | Glossary | Still satisfied | `src/i18n/glossary.test.ts` |
| A5 | Tests and build | Pass | `make check` |

## Must stay unchanged

- Behavior, contracts, or user-facing copy this task must not alter: keys, the meaning of every string, other locales,
  the "draft" status.
- Existing checks that already cover it: `src/i18n/locales.test.ts`, `src/i18n/glossary.test.ts`, `shared/bot-messages.test.ts`.

## Open decisions

- None.

## Verification

- `npm test -- src/i18n shared/bot-messages` → A3, A4
- `make check` → A5
- Reviewer reads the diff and the review list → A1, A2

## Handoff

| Scenario | Evidence (command, test assertion, or manual check) | Result |
| --- | --- | --- |
| A1 | `git diff` of `src/i18n/uk.ts`, `src/i18n/be.ts`, `shared/bot-messages.ts` for this task: no edits. Counts per kind of fix: spelling 0, grammar/agreement 0, russisms or Russian letters 0, untranslated English/Russian fragments 0, glossary contradictions 0. Checks made: grep for Russian letters in `be` (и, щ, ъ) and for Ukrainian-incompatible letters in `uk` (ы, э, ъ, ё) and for common Russian words in both; a regex check of the Belarusian у/ў alternation (0 violations); a full read of every string of both locales and of the uk/be bot texts. Examples: none, because no clear error was found. The nearest candidates (uk "числа по вашій країні", "відносно медіани"; be "pkt 2.7 (kryterium 2)", "Дзе праходзіў") are correct or arguable and went to the review list instead. | No fixes needed; zero copy changes |
| A2 | New `docs/locale-review-uk-be.md`: English intro, one table per locale (uk 10 rows, be 10 rows, 20 in total) with key, current, proposed, reason and a confidence column; a short note that the bot texts have no proposals. | Done |
| A3 | `npm test -- src/i18n shared/bot-messages`: 5 files, 97 tests pass (includes `locales.test.ts` key and placeholder parity). No key, placeholder, plural helper or signature was touched (no code edits). | Pass |
| A4 | `src/i18n/glossary.test.ts`: 35 tests pass. | Pass |
| A5 | `make check` exits 0 (68 test files, 694 tests, typecheck). | Pass |

- Changed files: `docs/locale-review-uk-be.md` (new). `src/i18n/uk.ts`, `src/i18n/be.ts` and `shared/bot-messages.ts` were not edited by this task (they already carry uncommitted changes from other tasks).
- Checks not run, blockers, or open questions: no blockers. This is a model pass, not a native-speaker review, so "draft" status in README and assumption C3 is unchanged. Two cross-locale questions for the maintainer are on the list: whether "Dyrektora NAWA" and "pkt 2.7 (kryterium 2)" stay in Polish in `ru`, `uk` and `be` (uk already translates "pkt/kryterium"; uk and be translate neither "Dyrektora").
- LLM contributions: Opus 5.5 (Claude Code): specification. Sonnet 5.5 (Claude Code subagent): implementation (proofreading pass; not a native-speaker review).
