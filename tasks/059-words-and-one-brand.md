# 059 — One brand, plain words on the first screens

**Status:** Ready

## Goal

Make the first screens and the buttons sound like an app and not like a form, and use one name. The maintainer approved this on
2026-11-26 (Q22). Today the start screen opens with `ТРЕКЕР NAWA 2026 (неофициальный)` while the header says `NAWAmeter`; the
subtitle says `Узнайте свой процентиль, положение относительно медианы…`; the buttons say `Сохранить анкету` / `Обновить анкету`.
After tasks 046–049 the product no longer shows a percentile or a median anywhere, so these words on the landing promise something
the app no longer has.

Intended copy (ru; the other four locales get the same shape of text, written from the glossaries):

- **Brand:** the name is `NAWAmeter` everywhere. The kicker becomes `NAWAmeter · неофициальный` (uk, be: same pattern; pl `nieoficjalny`, en
  `unofficial`) and no longer contains the year.
- **Landing subtitle (`start.subtitle`):** `Введите средний балл и узнайте, где вы среди кандидатов из своей страны.`
- **Landing "what you will see" (`start.whatYouSeeBody`):** `Ваш балл, ваше место среди кандидатов из вашей страны и ориентир 2026:
  самый низкий балл среди стипендиатов, ответивших в NAWAmeter.`
- **Landing sample card:** the `70–80 процентиль` badge is removed; the line `Выше медианы на 5,78 балла` becomes a sample position line
  `Пример: место 6 из 20` (the number follows the dragged sample; no ordinal suffix); the `how it works` FAQ drops the percentile
  question (`howPercentileTitle`, `howPercentileBody`, `howPercentileExample`).
- **Buttons:** `form.submitCreate` and `form.submitUpdate` both read `Сохранить`. The Settings row is `Мои данные` (task 058).
  The noun `анкета` stays where it is the unit that is counted (`4 анкеты из Казахстана`), per the glossary.

## Context

- Relevant code and docs: `src/i18n/{ru,uk,be,pl,en}.ts` (`start.kicker`, `start.kickerNote`, `start.subtitle`, `start.whatYouSeeBody`, `start.how*`,
  `start.preview*`, `form.submitCreate`, `form.submitUpdate`), `src/components/ResultPreviewCard.tsx`, `src/components/HowItWorksPanel.tsx`,
  `src/features/StartScreen.tsx`, `src/i18n/glossary.test.ts`, `docs/adr/0010-locale-glossary-and-english-api-errors.md`.
- ADRs this task follows: [0010](../docs/adr/0010-locale-glossary-and-english-api-errors.md), [0020](../docs/adr/0020-dashboard-hub-and-pages.md). Replaces none.
  If the glossary needs a new entry (`Сохранить`, `место`), the implementer adds it to the glossary file the glossary test reads and
  names the entry in the handoff.
- Dependencies and decisions already made: tasks 047 and 049 are `Done` (percentile and median are gone from the dashboard). The
  sample line is a content decision within the maintainer's "best practice" brief; it is only a demo number and affects nothing saved.

## Scope

- In scope: the strings above in five locales, `ResultPreviewCard` showing the sample position instead of the percentile badge and
  the median line, removing the percentile FAQ keys and the demo's percentile helpers if unused, tests that assert the old text.
- Out of scope: the score formula copy (task 056), the dashboard copy (tasks 047, 049), the bot's texts, the start screen layout and
  the draft-resume prompt, the headline `Где вы среди кандидатов NAWA?`.
- Files or directories assigned to this task: `src/i18n/*`, `src/components/ResultPreviewCard.tsx`, `src/components/HowItWorksPanel.tsx`,
  `src/features/StartScreen.tsx`, `src/features/StartScreen.test.tsx`, `src/components/` tests that assert the old strings.

## Acceptance scenarios

| ID | Given / when | Expected result | Planned verification |
| --- | --- | --- | --- |
| A1 | The start screen in ru | The kicker is `NAWAmeter · неофициальный`; no `Трекер`, no year; the subtitle is the new sentence | `StartScreen.test.tsx` |
| A2 | The sample card is dragged | It shows `Пример: место N из 20` and no percentile badge and no median line; N follows the ruler | `StartScreen.test.tsx` / `ResultPreviewCard` test |
| A3 | The `how it works` FAQ | It has the score explanation and no percentile question | `StartScreen.test.tsx` |
| A4 | Create wizard last step, edit wizard last step | The main button reads `Сохранить` in both | `grades-step.test.tsx`, `ProfileDashboard.test.tsx` |
| A5 | Search the five locale files for `процентил`, `percentyl`, `percentile`, `Трекер`, `Tracker` as product copy | No match outside historical comments | `grep` output in the handoff |
| A6 | Five locales | Same key set; glossary tests pass | `src/i18n/locales.test.ts`, `src/i18n/glossary.test.ts` |

## Must stay unchanged

- Behavior, contracts, or user-facing copy this task must not alter: the start screen layout, the live response count, the sample
  ruler's dragging and haptics, the dashboard, the bot's messages, the score formula text.
- Existing checks that already cover it: `src/features/StartScreen.test.tsx`, `src/i18n/locales.test.ts`, `src/i18n/glossary.test.ts`.

## Open decisions

- None.

## Verification

- `npm test -- src/features src/components src/i18n` → A1–A4, A6
- `grep -rniE "процентил|percentyl|percentile|Трекер|Tracker" src/i18n` → A5
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

- Changed files:
- Checks not run, blockers, or open questions:
- LLM contributions: Claude Sonnet 5.5 (Claude Code): specification. Implementation and review: not yet done.
