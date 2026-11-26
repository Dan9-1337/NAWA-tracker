# 070 — Copy fixes: a clearer start button, a human warning, no gender slashes, no "matura", a bot greeting that says what to do

**Status:** Ready

## Goal

Apply the copy fixes the maintainer approved on 2026-11-26 (Q30). Each came from a read-only audit of all five locales and the bot.
Texts are given in ru; write uk, be, pl and en from the glossaries (ADR 0010), keeping the same meaning and register (formal "вы" in
ru, uk, be).

1. **Start button** (`start.cta`): `Посчитать мой балл` (the button opens a form, so it must not promise a result that is not there yet).
2. **Average above the scale** (`wizard.averageAboveMaximum`): `Средний балл выше максимума шкалы — проверьте, нет ли опечатки.`
   (replaces `Ого, выше максимума шкалы!…`).
3. **Holder button** (`scholarshipReport.start`): `У меня есть стипендия`; uk `Я маю стипендію`; be `Я маю стыпендыю`; pl keeps `Mam stypendium`;
   en `I have the scholarship`. Every other ru, uk or be string with a gender slash form (`получил(а)`, `Випускник(ця)`, `закінчив(ла)`, `впишу
   сам(а)`, be `-ца`) is rewritten in a neutral way; the implementer lists each in the handoff.
4. **"matura"** (`choices.gradeBasis.final_certificate` in en and pl): `Final school certificate` / `Świadectwo ukończenia szkoły`
   (a Ukrainian or Belarusian applicant has no matura).
5. **Bot greeting** (`shared/bot-messages.ts`, `welcome` and `welcomeCountry`, five locales): the first sentence says what the user does,
   then the commands on their own line. ru `welcome`: `NAWAmeter — неофициальный калькулятор баллов NAWA. Введите средний балл аттестата
   и узнайте, где вы среди кандидатов из своей страны.` then `/subscribe — напоминания о сроках.` `welcomeCountry` keeps the country name
   (task 065) and says `Страна уже выбрана: <название>. Осталось ввести средний балл аттестата.` The text about storing the Telegram id stays
   where it is (in the subscription reply, not in the greeting).

## Context

- Relevant code and docs: `src/i18n/{ru,uk,be,pl,en}.ts` (`start.cta`, `wizard.averageAboveMaximum`, `scholarshipReport.*`, `applicantKind`,
  `choices.gradeBasis`), `shared/bot-messages.ts`, `src/i18n/glossary.test.ts`, [ADR 0010](../docs/adr/0010-locale-glossary-and-english-api-errors.md).
- ADRs this task follows: [0010](../docs/adr/0010-locale-glossary-and-english-api-errors.md), [0006](../docs/adr/0006-opt-in-bot-reminders.md). Replaces none.
- Dependencies and decisions already made: the maintainer approved the five items. Tasks 059 (start screen words) and 065 (bot country
  name) are `Done` first, since they edit the same files. Item 3's holder button text replaces the one in
  [task 050](050-holder-card-on-hub.md)'s card; if 050 is already done the button keeps its place and only the text changes.

## Scope

- In scope: the five items in five locales; tests that assert the old strings; the glossary file if an entry is needed.
- Out of scope: the subscription reply text (task 072), the reminder texts, the privacy text (task 073), any layout.
- Files or directories assigned to this task: `src/i18n/*`, `shared/bot-messages.ts`, `api/bot.test.ts`, tests under `src/features` and
  `src/components` that assert the old strings.

## Acceptance scenarios

| ID | Given / when | Expected result | Planned verification |
| --- | --- | --- | --- |
| A1 | The start screen in each locale | The main button reads the new text; it does not contain `результат` | `StartScreen.test.tsx` |
| A2 | An average above the scale maximum | The message is the new text with no exclamation of surprise | `grades-step.test.tsx` |
| A3 | The holder card in ru, uk, be, pl, en | The button reads `У меня есть стипендия` / `Я маю стипендію` / `Я маю стыпендыю` / `Mam stypendium` / `I have the scholarship` | `scholarship-report.test.tsx` |
| A4 | Search ru, uk and be files for a slash gender form (`\(а\)`, `\(ла\)`, `\(ця\)`, `\(-ца\)`) | No match in product copy | `grep` output in the handoff, with the list of rewritten strings |
| A5 | en and pl `final_certificate` | No `matura`; the new texts | `locales` test / grep |
| A6 | `/start` and `/start c_UA` in five locales (fake sender) | The first sentence is the action; the commands follow on their own line; the country name is the localized one | `api/bot.test.ts` |
| A7 | Five locales | Same key set; glossary tests pass | `src/i18n/locales.test.ts`, `src/i18n/glossary.test.ts` |

## Must stay unchanged

- Behavior, contracts, or user-facing copy this task must not alter: every string not listed, the button URLs and commands, the
  subscription logic, validation conditions.
- Existing checks that already cover it: `src/features/StartScreen.test.tsx`, `src/features/wizard/grades-step.test.tsx`,
  `src/features/scholarship-report/scholarship-report.test.tsx`, `api/bot.test.ts`, `src/i18n/locales.test.ts`.

## Open decisions

- None.

## Verification

- `npm test -- src/features src/components src/i18n api/bot` → A1–A3, A5–A7
- `grep -rnE "\(а\)|\(ла\)|\(ця\)|\(-ца\)|matura" src/i18n shared` → A4, A5
- `make check`

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

- Changed files:
- Checks not run, blockers, or open questions:
- LLM contributions: Claude Sonnet 5.5 (Claude Code): specification; the fixes came from a read-only copy audit by a Claude research subagent. Implementation and review: not yet done.
