# 056 — Rules in plain words; the legal citation moves to Help and About

**Status:** In review

## Goal

Stop quoting a Polish legal document inside the grade step. Today the score note under the form and the Belarus bonus notice say
`Согласно документу Ogłoszenie nr 13/2026, пункт 2.7 (критерий 2)…`, which a 17-year-old cannot read and which reads as bureaucracy.
The citation is a trust anchor, so it stays, but only where a curious reader goes: Help and About.

Intended behavior, same shape in all five locales (the ru strings are the intended copy):

- **Score note** (`wizard.previewNote` and the second place that repeats it): `Считаем по правилам NAWA: оценки — до 90 баллов + бонус
  0/5/10 за польскую школу. Это не официальный результат NAWA.`
- **Belarus notice** (`wizard.belarusPoloniaBonusNotice`): `По правилам NAWA бонус за польскую школу не начисляется гражданам Беларуси.`
- **Help and About** each carry one line with the exact source: `Источник правил: Ogłoszenie nr 13/2026, п. 2.7 (критерий 2).`
  (Polish title untranslated, the rest in the locale's language.)
- No other string in ru, uk, be, pl or en cites `Ogłoszenie` inline in a sentence about the user's score or rights.

## Context

- Relevant code and docs: `src/i18n/{ru,uk,be,pl,en}.ts` (`wizard.previewNote`, `wizard.belarusPoloniaBonusNotice`, `help.*`, `about.*`;
  the citation appears around `ru.ts:64` and `ru.ts:142`), `src/components/NawaScorePreview.tsx`, `src/components/settings/HelpView.tsx`,
  `src/components/settings/AboutView.tsx`, `docs/assumptions.md` (S1, S3).
- ADRs this task follows: [0010](../docs/adr/0010-locale-glossary-and-english-api-errors.md). Replaces none.
- Dependencies and decisions already made: the maintainer approved the wording principle (2026-11-26). The rules themselves
  (90 + bonus, Belarus has no bonus) are unchanged and not re-checked here.

## Scope

- In scope: the two sentences and the two source lines in five locales; tests that assert the old text.
- Out of scope: changing the rules, the grade step layout (task 057), any other copy.
- Files or directories assigned to this task: `src/i18n/*`, `src/components/NawaScorePreview.tsx` if it holds text, tests under
  `src/components` and `src/features` that assert the old strings, `src/components/settings/HelpView.tsx`, `src/components/settings/AboutView.tsx`.

## Acceptance scenarios

| ID | Given / when | Expected result | Planned verification |
| --- | --- | --- | --- |
| A1 | Grade step, any country | The note under the score reads the new sentence and contains no `Ogłoszenie` | `grade-inputs.test.tsx` / `grades-step.test.tsx` |
| A2 | A Belarusian citizen with the Polish-school question | The notice reads the new sentence and contains no `Ogłoszenie` | `grades-step.test.tsx` |
| A3 | Settings → Help and About | Each shows the source line with `Ogłoszenie nr 13/2026` and `2.7` | `src/components/SettingsSheet.test.tsx` |
| A4 | Search the five locale files for `Ogłoszenie` | Only the Help and About lines match (and the Polish locale's own legal references there) | `grep` output in the handoff |
| A5 | Five locales | Same key set; glossary tests pass | `src/i18n/locales.test.ts`, `src/i18n/glossary.test.ts` |

## Must stay unchanged

- Behavior, contracts, or user-facing copy this task must not alter: the score maths, the bonus rules, the layout of the step, the
  `Ориентировочный балл: …` line itself.
- Existing checks that already cover it: `src/components/grade-inputs.test.tsx`, `src/features/wizard/grades-step.test.tsx`,
  `src/components/SettingsSheet.test.tsx`.

## Open decisions

- None.

## Verification

- `npm test -- src/components src/features src/i18n` → A1–A3, A5
- `grep -rn "Ogłoszenie" src/i18n` → A4
- `make check`

## Handoff

| Scenario | Evidence (command, test assertion, or manual check) | Result |
| --- | --- | --- |
| A1 | `grades-step.test.tsx`: preview note equals the new ru sentence; for all five locales the note contains no `Ogłoszenie` | Pass |
| A2 | `grades-step.test.tsx`: BY citizen sees the new ru sentence, no `Ogłoszenie` | Pass |
| A3 | `SettingsSheet.test.tsx`: About and Help both show `about.rulesSource` (pl contains `Ogłoszenie nr 13/2026` and `2.7`) | Pass |
| A4 | `grep -rn "Ogłoszenie" src/i18n` returns only the five `about.rulesSource` lines (be, en, uk, ru, pl) | Pass |
| A5 | `npm test -- src/components src/features src/i18n`: 21 files, 272 tests passed (includes `locales.test.ts`, `glossary.test.ts`); `npm run typecheck` clean | Pass |

- Changed files: `src/i18n/{ru,uk,be,pl,en}.ts` (`nawaScore.previewNote`, `wizard.belarusPoloniaBonusNotice` reworded; new key `about.rulesSource`, used by both views), `src/components/settings/HelpView.tsx`, `src/components/settings/AboutView.tsx`, `src/features/wizard/grades-step.test.tsx`, `src/components/SettingsSheet.test.tsx`. The score note key is `nawaScore.previewNote` (not `wizard.previewNote`) and appears once, rendered by `NawaScorePreview.tsx`.
- Checks not run, blockers, or open questions: `make check` not run (orchestrator runs it). `docs/assumptions.md` S1/S3 not touched (outside assigned files).
- LLM contributions: Claude Sonnet 5.5 (Claude Code): specification. Claude Sonnet 5.5 (Claude Code): implementation. Review: not yet done.
