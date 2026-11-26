# 050 — Scholarship-holder card on the hub, answers on their own page

**Status:** Ready

## Goal

Put the scholarship-holder block where people see it ([ADR 0020](../docs/adr/0020-dashboard-hub-and-pages.md), point 7). Today the
card sits near the bottom of a long scroll and, once a report exists, grows into a tall list of answers with Edit and
Delete. On the hub it becomes a compact card directly under the result card, and the answers move to a page.

Intended behavior, for a 2026 Director survey scoring at least 60 (`scholarshipReportEligible`, unchanged):

- **No report yet:** a card with a visibly stronger treatment than the muted card used today, using existing design tokens and
  no new colours. Title `Стипендиаты Директора NAWA 2026`; body `Получили стипендию Директора NAWA? Расскажите, куда вас
  направили, и посмотрите, что выбирали другие стипендиаты.` (the existing `invitationBody`, at most three lines at 390px);
  button `Я получил(а) стипендию`, which opens the holder flow as today.
- **Report saved:** the same title, one line naming the university from the report, the button
  `Куда распределили стипендиатов` (opens the holder results as today) and a text link `Мои ответы`.
- **My holder report page** (new, a page view like What-if and Profile): title `Мой отчёт стипендиата`; the answers list that
  `ScholarshipReportCard` shows today, `Изменить` (opens the flow as today), `Удалить` with its existing confirmation, and the
  existing action error. Back returns to the hub; the main button shows no invite here. After a delete the page returns to the
  hub, where the card is back in its no-report state.
- **Loading or disabled:** no card, as today. **Load error:** the muted card with `Повторить`, as today.
- **Not eligible** (survey below 60, another track or intake year): no card and no `Мои ответы`.

The results stay visible only to someone with a report ([ADR 0012](../docs/adr/0012-scholarship-holder-survey.md),
[ADR 0016](../docs/adr/0016-scholarship-holder-results-page-without-minimum.md)); nothing about who may open them changes.

## Context

- Relevant code and docs: `src/features/scholarship-report/ScholarshipReportCard.tsx`, `useScholarshipReport.ts`
  (`ScholarshipReportMode = 'dashboard' | 'flow' | 'results'`, `openFlow`, `openResults`, `remove`), `src/features/ProfileDashboard.tsx`
  (page state from task 046, `chromeConfig`), `src/components/DashboardCard.tsx` (tones), [Product flow](../docs/product-flow.md).
- ADRs this task follows: [0020](../docs/adr/0020-dashboard-hub-and-pages.md), [0012](../docs/adr/0012-scholarship-holder-survey.md),
  [0016](../docs/adr/0016-scholarship-holder-results-page-without-minimum.md), [0017](../docs/adr/0017-orientation-mark-from-holder-scores.md). Replaces none.
- Dependencies and decisions already made: tasks 046 and 047 are `Done`. The hub fits one screen in its usual state; the card
  must not be the reason it does not (the manual check is task 047's A8, repeated here for the report-saved state). Putting the
  answers on a separate page is a UI decision within the maintainer's "best practice" brief; the data, the flow and the gate are
  unchanged. Write uk, be, pl and en copy for the two new keys from the glossaries (ADR 0010).

## Scope

- In scope: the two hub card states; the answers page and its entry; the `holder-report` value added to the page state from task
  046; the two new i18n keys (`myAnswers`, `myReportTitle`); `docs/product-flow.md` (the holder-survey paragraph).
- Out of scope: the flow's steps and validation, the results page, the report API and RPCs, eligibility rules, the invite
  (048), an invite for holders, opening the results to non-holders.
- Files or directories assigned to this task: `src/features/scholarship-report/ScholarshipReportCard.tsx`,
  `src/features/scholarship-report/ScholarshipReportPage.tsx` (new), `src/features/scholarship-report/scholarship-report.test.tsx`,
  `src/features/ProfileDashboard.tsx` and its test, `src/i18n/*`, `docs/product-flow.md`.

## Acceptance scenarios

| ID | Given / when | Expected result | Planned verification |
| --- | --- | --- | --- |
| A1 | An eligible survey with no report opens the hub | The stronger card sits directly under the result card, above the two link rows, with the title, body and `Я получил(а) стипендию`; the button opens the flow | `scholarship-report.test.tsx`, `ProfileDashboard.test.tsx` |
| A2 | An eligible survey with a saved report | The card shows the university line, `Куда распределили стипендиатов` and `Мои ответы`; it shows no `Изменить` or `Удалить` | `scholarship-report.test.tsx` |
| A3 | The user opens `Мои ответы` | The page shows the answers as the old card did (path, centre when present, programme with `Вписано вручную` for typed text, university), `Изменить` and `Удалить`; Back returns to the hub | `ProfileDashboard.test.tsx` |
| A4 | `Изменить` | Opens the holder flow at its first step as before; saving returns to the hub with the card in the report state | Existing tests adjusted |
| A5 | `Удалить`, then `Да, удалить` | The report is deleted, the hub shows the no-report card, and a failed delete shows the existing error on the page | `scholarship-report.test.tsx` |
| A6 | A survey below 60, another track or another intake year | No card and no `Мои ответы` | Existing tests pass |
| A7 | The report loads, fails, or is disabled | Nothing / the muted card with `Повторить` / nothing, as today | Existing tests pass |
| A8 | The holder results page | Opens from the card, Back returns to the hub, and a non-contributor still gets 404 `REPORT_NOT_FOUND` from the API | Existing tests pass; no API change |
| A9 | The page on a phone-size viewport | The main button shows no invite on the report page | `ProfileDashboard.test.tsx` |
| A10 | Hub at 390×700 with a saved report, four surveys in the country | The hub (cards, link rows and main button) fits without vertical scroll | Manual (`make dev`), screenshot in the handoff |
| A11 | Five locales | The two new keys exist in all five; glossary tests pass | `src/i18n/locales.test.ts`, `src/i18n/glossary.test.ts` |

## Must stay unchanged

- Behavior, contracts, or user-facing copy this task must not alter: the holder flow, its validation and chrome; the report API,
  RPCs and snapshots; the `ориентир 2026` calculation; the holder results content and the contributors-only gate; the
  existing title and invitation copy.
- Existing checks that already cover it: `src/features/scholarship-report/scholarship-report.test.tsx`,
  `src/features/ProfileDashboard.test.tsx`, `api/scholarship-report*.test.ts`, `supabase/tests/`.

## Open decisions

- None.

## Verification

- `npm test -- src/features src/i18n api/scholarship-report` → A1–A9, A11
- `make check`
- Manual: `make dev` with a demo holder; screenshot of the hub with a saved report at 390×700 → A10

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
- LLM contributions: Claude Sonnet 5.5 (Claude Code): specification; ADR 0020. Implementation and review: not yet done.
