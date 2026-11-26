# 044 — One name for the Director scholarship and a translated clause reference in ru, uk and be

**Status:** In review

## Goal

The proofreading pass of task [043](043-uk-be-proofreading-pass.md) found two inconsistencies that repeat in `ru`, `uk` and
`be`. The maintainer decided both on 2026-11-26.

1. **The programme name.** The track choice calls it "Стипендия Директора NAWA" (uk "Директора", be "Дырэктара"), but the
   scholarship-holder strings use the Polish genitive "Dyrektora NAWA" in Latin letters. ADR 0010 asks for one term per
   concept. Decision: **translate everywhere**, as in the track choice.
2. **The clause reference.** The reference to the announcement is "pkt 2.7 (kryterium 2)" in `ru` and `be`, but
   "пункт 2.7 (критерій 2)" in `uk`. Decision: **translate it in `ru` and `be` as `uk` does**. The document title
   "Ogłoszenie nr 13/2026" stays in Polish so it can be found.

Replace exactly these strings. Everything else in each string stays unchanged.

| Locale | Key (as in the file) | Current text | New text |
| --- | --- | --- | --- |
| ru | `scholarshipReport.title` (line ~186) | `Стипендиаты Dyrektora NAWA 2026` | `Стипендиаты Директора NAWA 2026` |
| ru | invitation body (line ~188) | `Получили стипендию Dyrektora NAWA? …` | `Получили стипендию Директора NAWA? …` |
| ru | `errors.profileNotFound` (line ~213) | `Анкета Dyrektora NAWA за 2026 год не найдена.` | `Анкета по стипендии Директора NAWA за 2026 год не найдена.` |
| ru | Belarus bonus notice (line ~64) | `…Ogłoszenie nr 13/2026, pkt 2.7 (kryterium 2), бонус…` | `…Ogłoszenie nr 13/2026, пункт 2.7 (критерий 2), бонус…` |
| ru | score preview note (line ~142) | `…Ogłoszenie nr 13/2026, pkt 2.7 (kryterium 2): оценки…` | `…Ogłoszenie nr 13/2026, пункт 2.7 (критерий 2): оценки…` |
| uk | `scholarshipReport.title` (line ~187) | `Стипендіати Dyrektora NAWA 2026` | `Стипендіати Директора NAWA 2026` |
| uk | invitation body (line ~189) | `Отримали стипендію Dyrektora NAWA? …` | `Отримали стипендію Директора NAWA? …` |
| uk | `errors.profileNotFound` (line ~214) | `Анкету Dyrektora NAWA за 2026 рік не знайдено.` | `Анкету щодо стипендії Директора NAWA за 2026 рік не знайдено.` |
| be | `scholarshipReport.title` (line ~189) | `Стыпендыяты Dyrektora NAWA 2026` | `Стыпендыяты Дырэктара NAWA 2026` |
| be | invitation body (line ~191) | `Атрымалі стыпендыю Dyrektora NAWA? …` | `Атрымалі стыпендыю Дырэктара NAWA? …` |
| be | `errors.profileNotFound` (line ~216) | `Анкета Dyrektora NAWA за 2026 год не знойдзена.` | `Анкета па стыпендыі Дырэктара NAWA за 2026 год не знойдзена.` |
| be | Belarus bonus notice (line ~67) | `…Ogłoszenie nr 13/2026, pkt 2.7 (kryterium 2), бонус…` | `…Ogłoszenie nr 13/2026, пункт 2.7 (крытэрый 2), бонус…` |
| be | score preview note (line ~145) | `…Ogłoszenie nr 13/2026, pkt 2.7 (kryterium 2): адзнакі…` | `…Ogłoszenie nr 13/2026, пункт 2.7 (крытэрый 2): адзнакі…` |

The `profileNotFound` wording adds "по стипендии" / "щодо стипендії" / "па стыпендыі" so it does not read as "the
Director's questionnaire".

Also update `docs/locale-review-uk-be.md`, the list for the native speaker:

- mark the "Dyrektora NAWA" and "pkt 2.7 (kryterium 2)" items as resolved by task 044;
- remove the `scholarshipReport.flow.centreTitle` items ("Де проходив" / "Дзе праходзіў"). The verb agrees with "курс"
  (masculine), not with the person, so the question does not assume the user's gender. Add a one-line note saying so.

## Context

- Relevant code and docs: `src/i18n/ru.ts`, `src/i18n/uk.ts`, `src/i18n/be.ts`, `docs/locale-review-uk-be.md`,
  `src/i18n/choices` (`choices.scholarshipTrack.nawa_director`, the reference name).
- ADRs this task follows: [0010](../docs/adr/0010-locale-glossary-and-english-api-errors.md). Replaces none.
- Dependencies and decisions already made: both decisions above were made by the maintainer on 2026-11-26. Task 043 created
  `docs/locale-review-uk-be.md`.

## Scope

- In scope: the 13 strings in the table and the review-list update.
- Out of scope: `pl` and `en`; Polish citations in code comments (`src/lib/draft-rules.ts`, `shared/nawa-score.ts`); moving the
  legal reference into a collapsible block; any other wording.
- Files or directories assigned to this task: `src/i18n/ru.ts`, `src/i18n/uk.ts`, `src/i18n/be.ts`, `docs/locale-review-uk-be.md`.

## Acceptance scenarios

| ID | Given / when | Expected result | Planned verification |
| --- | --- | --- | --- |
| A1 | Search the three locales | `grep -n "Dyrektora\|pkt 2.7\|kryterium" src/i18n/ru.ts src/i18n/uk.ts src/i18n/be.ts` finds nothing | Command in the handoff |
| A2 | The changed strings | Each equals the "New text" column, and the rest of each string is unchanged | `git diff` of the three files, reviewer read |
| A3 | `pl` and `en` | Unchanged | `git diff --stat` shows no change to `pl.ts` or `en.ts` from this task |
| A4 | Keys, placeholders, glossary | Unchanged and passing | `npm test -- src/i18n` |
| A5 | Tests and typecheck | Pass | `make check` |
| A6 | `docs/locale-review-uk-be.md` | Both items are marked resolved by 044; the centreTitle items are removed with the note | Reviewer read |

## Must stay unchanged

- Behavior, contracts, or user-facing copy this task must not alter: every other string; keys; `pl` and `en`; the
  document title "Ogłoszenie nr 13/2026".
- Existing checks that already cover it: `src/i18n/locales.test.ts`, `src/i18n/glossary.test.ts`.

## Open decisions

- None.

## Verification

- `grep -n "Dyrektora\|pkt 2.7\|kryterium" src/i18n/ru.ts src/i18n/uk.ts src/i18n/be.ts` → A1
- `npm test -- src/i18n` → A4
- `make check` → A5
- Reviewer reads the diff and the review list → A2, A3, A6

## Handoff

| Scenario | Evidence (command, test assertion, or manual check) | Result |
| --- | --- | --- |
| A1 | `grep -n "Dyrektora\|pkt 2.7\|kryterium" src/i18n/ru.ts src/i18n/uk.ts src/i18n/be.ts` | No matches (grep exit 1) |
| A2 | 13 strings replaced by an exact-match script that asserted each old text occurs exactly once; `git diff` of the three files shows the new texts as in the table | Pass; reviewer to read the diff (the files also hold other tasks' uncommitted changes) |
| A3 | `pl.ts` and `en.ts` not opened or edited by this task. `git diff --stat` still lists them because of other tasks' uncommitted work (13 lines each, not from 044) | Pass for this task's edits |
| A4 | `npm test -- src/i18n`: 4 files, 90 tests (locales, glossary, plural, response-count) | Pass |
| A5 | `make check`: 68 test files, 694 tests passed; `npm run typecheck` ended with no errors | Pass |
| A6 | `docs/locale-review-uk-be.md`: the three "Dyrektora" and "pkt 2.7" rows (uk, be, be) are marked "Resolved by task 044" with confidence "resolved"; both `centreTitle` rows removed; a one-line note above the Ukrainian table gives the reason | Pass; reviewer to read |

- Changed files: `src/i18n/ru.ts`, `src/i18n/uk.ts`, `src/i18n/be.ts`, `docs/locale-review-uk-be.md`, this brief.
- Checks not run, blockers, or open questions: none. All 13 strings were found as described. `docs/locale-review-uk-be.md` is untracked in git (created by task 043), so it has no `git diff`.
- LLM contributions: Opus 5.5 (Claude Code): specification. Sonnet 5.5 (Claude Code subagent): implementation.
