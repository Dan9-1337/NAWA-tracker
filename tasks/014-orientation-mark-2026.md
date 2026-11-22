# 014 — "Ориентир 2026": lowest reported holder score per country, for every user

**Status:** Ready

## Goal

Implement [ADR 0017](../docs/adr/0017-orientation-mark-from-holder-scores.md). Every user with a 2026 Director survey sees, for their own country of citizenship, the lowest score with which a reporting scholarship holder of that country received the scholarship in 2026. It is shown as a line on the result card, a mark on the what-if ruler, and holder dots in the full distribution.

Intended behavior:

- **Data.** For the user's `ranking_country`, take the scholarship reports (task 012) of the 2026 intake on the `nawa_director` track whose survey is not `is_suspicious`. The mark is the lowest `score_snapshot` and `n` is their number. The user's own report, if any, counts like any other. There is no minimum: `n` can be 1.
- **Who sees it.** Every user whose survey is of intake year 2026 on the Director track, whether or not they have a report. Other intake years show nothing of this feature.
- **Result card.** One line under the position in the country:
  - `n ≥ 1`: ru `Беларусь: самый низкий балл среди стипендиатов 2026, ответивших в NAWAmeter (14). Не данные NAWA.`
  - `n = 0`: ru `Беларусь: ориентира 2026 пока нет.` If the user's survey scores at least 60, the line goes on: ` Получили стипендию? Расскажите — и он появится.` Tapping it opens the scholarship-holder flow of task 012. Below 60 the second sentence is not shown, consistent with task 012, which shows no invitation then.
  - The line is shown on the full card and on the "only you" card of task 013.
  - Country names are never declined (ADR 0010). Other locales follow the glossary.
- **What-if ruler.** When `n ≥ 1`, a mark at the mark's value labelled ru `ориентир 2026`, styled like the existing threshold-60 mark and next to it. It stays fixed while the user drags. When `n = 0` there is no mark. The ruler is never saved, as before.
- **Full distribution** (`Показать полное распределение`, which exists only when the country has ≥ 2 surveys, task 013). Holder scores are drawn as dots over the distribution of the country's 2026 surveys, and the lowest dot is labelled `ориентир 2026`. The small distribution on the card itself does not change.
- **Payload.** The server returns the mark value, `n` and, for the dots, the list of holder score snapshots of the country. It returns only numbers, never identities, survey ids or report fields other than the score. The holder-score list is returned only together with the full distribution data.
- **Privacy copy** (`privacyNotice` and FAQ, five locales). A point says that the scores of scholarship holders who answered the survey are shown to all users as their country's ориентир, without names, and that with few holders acquaintances may recognise a score.

## Context

- Relevant docs: [ADR 0017](../docs/adr/0017-orientation-mark-from-holder-scores.md), [ADR 0016](../docs/adr/0016-scholarship-holder-results-page-without-minimum.md), [ADR 0015](../docs/adr/0015-compare-within-citizenship-country-without-minimum.md), [ADR 0010](../docs/adr/0010-locale-glossary-and-english-api-errors.md), [`docs/assumptions.md`](../docs/assumptions.md) (P1, D12, D13, R8).
- Dependencies and decisions already made:
  - **Depends on task 012**, which adds `score_snapshot` and the rule that blocks reports below 60, and on **task 013** (country-only statistics, the "only you" card). Start after both are merged.
  - Maintainer decisions (2026-11-22): name `ориентир 2026`, never "проходной"; formats E (ruler mark) and G (dots over the distribution); shown to everyone; no minimum, the count always shown; the `n = 0` line with the invitation; 2026 only.
  - No product events in this task.

## Scope

- In scope: a server computation (a migration with a new or extended RPC, named to sort after task 012's `202612020001_scholarship_reports.sql`, and its SQL tests), contract and schema, the result-card line, the ruler mark, the dots in the full distribution, copy in five locales, the privacy point, and updates to `docs/architecture.md` (changelog) and `docs/product-flow.md`.
- Out of scope: other intake years; the public "Стипендия NAWA в цифрах" page and the 2026 freeze; asking applicants who were not awarded; showing other holder results (centres, fields, universities) to non-contributors; changing task 012's results page.
- Files or directories assigned to this task: the implementation agent names them from the areas above before starting. It must not touch task 012's report flow or task 013's statistics rules beyond reading their outputs.

## Acceptance scenarios

| ID | Given / when | Expected result | Planned verification |
| --- | --- | --- | --- |
| A1 | BY has holder reports with snapshots 72, 80, 95 | A BY user sees the line with `(3)`, the ruler mark at 72 and three dots in the full distribution; the lowest dot is labelled | SQL test + dashboard tests |
| A2 | BY has one holder report (snapshot 88) | Line with `(1)` and the mark at 88 | SQL test + dashboard test |
| A3 | BY has no holder reports; the user's survey scores 70 / 55 | The line `Беларусь: ориентира 2026 пока нет.` plus the invitation sentence at 70, without it at 55; no ruler mark; no dots | dashboard tests |
| A4 | Tap the invitation sentence | The scholarship-holder flow of task 012 opens | dashboard test |
| A5 | A holder report whose survey is `is_suspicious` | Not counted in the mark, `n` or the dots | SQL test |
| A6 | A holder edits their survey from 72 to 65 without saving the report | The mark stays 72 (the snapshot) | SQL test |
| A7 | A holder deletes their report, or their survey | Their snapshot disappears from the mark, `n` and the dots | SQL test |
| A8 | The user's own country has only their own survey ("only you" card, task 013) and one holder report exists | The line and the ruler mark are shown; no dots (no full distribution) | dashboard test |
| A9 | A user with a survey of another intake year | Nothing of this feature is shown | dashboard test |
| A10 | Payload | Contains only numbers (mark, `n`, score list); no identity, survey or report fields | contract test + SQL test |
| A11 | Copy | New keys in five locales; the privacy point present; locale parity passes; no "проходной" anywhere in the new copy | `npm test -- src/i18n` + reviewer read |

## Must stay unchanged

- Behavior, contracts, or user-facing copy this task must not alter: the score formula and threshold 60; the score comparison of task 013; task 012's flow and results page and their contributors-only rule; the landing counter; the edit limit; server-side `initData` verification.
- Existing checks that already cover it: the SQL and handler tests of tasks 012 and 013, `api/responses.test.ts`, `src/i18n/locales.test.ts`.

## Open decisions

- None.

## Verification

- `npm run test:db:pglite` → A1, A2, A5–A7, A10; CI runs pgTAP
- `npm test` for the dashboard, statistics and score tests the agent touches, and for the contracts → A1–A4, A8–A10
- `npm test -- src/i18n` → A11
- `make check`
- Manual (local fixtures, `make dev` after checking ports 3000/3001 and `.env.local`): seed holder reports in one country and none in another; open the dashboard as users of both countries, scores above and below 60, and drag the ruler → A1, A3, A8

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

- Changed files:
- Checks not run, blockers, or open questions:
- LLM contributions: Claude Opus 5.5 (Claude Code) — specification of this brief, [ADR 0017](../docs/adr/0017-orientation-mark-from-holder-scores.md), and the matching `docs/assumptions.md` entries.
