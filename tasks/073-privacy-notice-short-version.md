# 073 — Privacy notice: three plain points and a "More" that holds the full text

**Status:** Ready

## Goal

Make the privacy view readable without removing anything it promises. Today the notice is 11 bullets, about 1,300 characters, in the
language of a contract ("псевдонимные данные", three bullets that repeat the same warning). The maintainer approved a short version with
the full text kept behind a `Подробнее` row (2026-11-26) and asked to **review the exact text before it is published**: the reviewer
for this task is the maintainer, and the task is not `Done` until they approve the wording recorded in the handoff.

Intended behavior of the privacy view (the sheet's privacy page and wherever `privacyNotice` is shown):

1. A title, then **three points** (ru, the intended copy):
   - `Мы не храним ваше имя, номер телефона и username. Аккаунт записан как код, а не как Telegram ID. Это псевдонимные данные, не анонимные.`
   - `Другим видны только числа по вашей стране. Где ответов мало, знакомые могут догадаться, чей это балл.`
   - `Всё можно удалить в настройках в любой момент.`
2. A collapsed row `Подробнее` that expands to the **existing full list of points, unchanged in meaning and wording** (the 11 current
   bullets, including the 24-hour trail after deletion, the separate Telegram ID for reminders, the holder results and the `ориентир`
   disclosures, and the hand-typed programme note).
3. The three points keep the honesty the product already commits to: not anonymous, acquaintances may guess, deletable. None of them is
   weakened relative to the full text ([ADR 0002](../docs/adr/0002-pseudonymous-identity.md), assumptions R1, R3, R7, R8).
4. Same structure in uk, be, pl and en, written from the glossaries; the expanded list is each locale's existing text.

## Context

- Relevant code and docs: `src/i18n/{ru,uk,be,pl,en}.ts` (`privacyNotice.title`, `.body`, `.points`, `.close`), `src/components/settings/PrivacyView.tsx`,
  any other component that renders `privacyNotice` (search), `src/components/SettingsSheet.test.tsx`, `docs/assumptions.md` (R1–R8),
  [ADR 0002](../docs/adr/0002-pseudonymous-identity.md), [0013](../docs/adr/0013-limit-on-score-changing-edits.md), [0017](../docs/adr/0017-orientation-mark-from-holder-scores.md).
- ADRs this task follows: [0002](../docs/adr/0002-pseudonymous-identity.md), [0011](../docs/adr/0011-documented-product-events-deleted-with-survey.md), [0017](../docs/adr/0017-orientation-mark-from-holder-scores.md). Replaces none.
- Dependencies and decisions already made: the structure and the three points are the maintainer's approval in principle; the
  final ru wording is the maintainer's to confirm. After [task 052](052-remove-density-strip.md) removes the holder dots, the full text's `ориентир` bullet
  may still say "holder scores"; it is left as is and the maintainer reviews it there (task 052 says so).

## Scope

- In scope: the short list and the `Подробнее` disclosure in five locales; keeping the full list; tests; a note in the handoff with the
  final ru text for the maintainer's approval.
- Out of scope: changing any promise, the retention rules, the privacy policy outside the app, the other settings views.
- Files or directories assigned to this task: `src/i18n/*`, `src/components/settings/PrivacyView.tsx`, `src/components/SettingsSheet.test.tsx`.

## Acceptance scenarios

| ID | Given / when | Expected result | Planned verification |
| --- | --- | --- | --- |
| A1 | Settings → Privacy | A title, exactly three points and a collapsed `Подробнее` row; the 11 full points are not visible | `SettingsSheet.test.tsx` |
| A2 | `Подробнее` is opened | All 11 existing points show, in the original order and wording | `SettingsSheet.test.tsx` (compares to the locale's `points` array) |
| A3 | The three points | Together they contain the words for `не анонимные`, `знакомые могут догадаться` and `удалить`; each locale's equivalents are present | Test per locale |
| A4 | The row's state | It reports `aria-expanded` and starts collapsed on every visit | `SettingsSheet.test.tsx` |
| A5 | Five locales | New keys in all five; glossary tests pass | `src/i18n/locales.test.ts`, `src/i18n/glossary.test.ts` |
| A6 | The maintainer reads the ru text in the handoff and approves or edits it | Approval recorded in the handoff before `Done` | Reviewer (maintainer) read |

## Must stay unchanged

- Behavior, contracts, or user-facing copy this task must not alter: the full list's wording, what the app stores, the deletion
  flow, the retention periods.
- Existing checks that already cover it: `src/components/SettingsSheet.test.tsx`, `src/i18n/locales.test.ts`.

## Open decisions

- None. (The final wording is approved by the maintainer at review, as written in the goal.)

## Verification

- `npm test -- src/components src/i18n` → A1–A5
- `make check`
- Maintainer read → A6

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
- LLM contributions: Claude Sonnet 5.5 (Claude Code): specification and the proposed ru wording; the finding came from a read-only copy audit by a Claude research subagent. Implementation and review: not yet done.
