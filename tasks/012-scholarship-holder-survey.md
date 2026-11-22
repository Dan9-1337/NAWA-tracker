# 012 — Scholarship-holder survey: centre, wished-for kierunek and university, results page for contributors

**Status:** Ready

## Goal

Implement [ADR 0012](../docs/adr/0012-scholarship-holder-survey.md) as changed by [ADR 0016](../docs/adr/0016-scholarship-holder-results-page-without-minimum.md). A person with a 2026 survey who received the Dyrektor NAWA scholarship tells where NAWA sent them for the preparatory course and which kierunek and university they wanted. In return they get a results page: what all scholarship holders reported, across all countries or filtered to one country of citizenship, with no minimum number of answers. Nobody who has not answered sees anything.

Intended behavior:

- **Entry.** On the dashboard, for a survey of intake year `scholarshipReportIntakeYear` (`2026`, a new constant in `shared/`) on the `nawa_director` track, a card sits between the what-if / distribution blocks and the profile block. Without a report it invites: ru `Получили стипендию Dyrektora NAWA? Расскажите, куда вас направили, и посмотрите, что выбирали другие стипендиаты.` with a button `Я получил(а) стипендию`. The button is the self-declaration; nothing is verified.
- **The flow** is a dashboard view like the edit wizard (same Telegram main/back button handling), four steps:
  1. **Path**: preparatory course, then studies; or studies directly.
  2. **Centre** (only on the preparatory path): one choice from the 2026 list in `shared/prep-course-centres.ts` (task 011), shown with the display helper; no "other", no free text.
  3. **Kierunek**: searchable list from `shared/study-programmes.ts` (task 011; load it lazily if it noticeably grows the main bundle). Below the results, always: `Нет в списке — впишу сам(а)` → a text field, trimmed, 1–80 characters, single line. A hint under the field says the text is seen only by the author of NAWAmeter to extend the list.
  4. **University**: the existing university search (`SearchableSelect`, `universitiesForScholarshipTrack('nawa_director')`).
  Saving happens on the last step.
- **After saving** the card shows the person's own answers (their typed kierunek included, to them only) with **Edit** (same flow, prefilled), **Delete** (confirmation; afterwards the card returns to the invitation and the results page is no longer reachable) and a button ru `Куда распределили стипендиатов` that opens the results page.
- **Results page** (only for someone who has a report): a dashboard view of its own, like the flow, with the Telegram back button returning to the dashboard. Computed on the server from reports whose survey is not `is_suspicious`, joined to the survey's `ranking_country`. **No minimum number of answers, no ladder, no "Other" row for small cells:** every count is shown from 1.
  - **Filter** at the top: `Все страны` (default, selected each time the page opens), then every country of citizenship that has at least one counted report, each with its count, sorted by count descending, then by display name. Choosing a country reloads the page for that country only.
  - **Total**: the number of counted reports in the selection.
  - **Path**: preparatory course, then studies / studies directly, each with its count and share of the selection.
  - **Centres** (preparatory-path reports only): every centre with at least one report, with its count, sorted by count descending, then by display name. The display helper of task 011 names the centre.
  - **Fields**: the 11 ISCED-F broad groups of `shared/study-fields.ts` that have at least one report, sorted by count. Under each group, its catalogue kierunki with their counts. Reports with a typed kierunek appear as one row ru `Вписано вручную` with its count, outside the groups, and their text is never sent.
  - **Universities**: every wished-for university with at least one report, with its count, sorted by count descending, then by name.
  - If the selection has no counted reports (possible only for `Все страны` when the viewer's own survey is flagged and nobody else has answered): ru `Пока нет ответов.` and nothing else.
  - One caption: the numbers are self-reported by holders who use NAWAmeter, not NAWA data.
- **Typed kierunki** are stored, returned only to their author, and never included in any aggregate except as "Other". `docs/architecture.md` gets SQL for the maintainer to list them and, after adding a name to the catalogue, to move matching reports onto the new programme id and ISCED code.
- **Deletion.** Deleting the survey deletes the report (FK on `responses (identity_hash, intake_year)` with `on delete cascade`). Deleting the report alone leaves the survey. The edit limit of [ADR 0013](../docs/adr/0013-limit-on-score-changing-edits.md) does not apply: a report has no score.
- **Privacy copy** (`privacyNotice.points`, five locales): results of the scholarship-holder survey are visible only to those who answered it; they show counts without names, so in a country with few holders acquaintances may guess who chose what; a kierunek typed by hand is seen only by the author of NAWAmeter.

## Context

- Relevant code and docs: `src/features/ProfileDashboard.tsx` (`View`, edit wizard pattern, `useMiniAppChrome`), `src/features/wizard/*`, `src/components/SearchableSelect.tsx`, `src/components/RadioOption.tsx`, `shared/universities.ts` (`universitiesForScholarshipTrack`, `getUniversityById`), `shared/study-fields.ts` (`broadGroups`), task 011 modules, `api/responses.ts` (handler pattern, dependencies, error helpers), `api/_lib/*`, `shared/contracts.ts`, `shared/validation.ts`, `src/lib/api-client.ts`, `supabase/migrations/202611220001_privacy_identity.sql` (`responses_identity_hash_intake_year_key`), `src/i18n/*.ts`, `docs/architecture.md`, `docs/product-flow.md`.
- ADRs this task follows: [0002](../docs/adr/0002-pseudonymous-identity.md), [0005](../docs/adr/0005-only-nawa-director-track-is-live.md), [0008](../docs/adr/0008-refocus-on-score-comparison.md), [0010](../docs/adr/0010-locale-glossary-and-english-api-errors.md), [0011](../docs/adr/0011-documented-product-events-deleted-with-survey.md), [0012](../docs/adr/0012-scholarship-holder-survey.md) as changed by [0016](../docs/adr/0016-scholarship-holder-results-page-without-minimum.md). Replaces none.
- Dependencies and decisions already made:
  - **Depends on task 011** (catalogues). It does not redefine the RPCs of tasks 009 and 010, and its migration file name sorts after theirs. **Start after task 009 is merged, and not in parallel with task 013**: all three edit `shared/contracts.ts`, `shared/validation.ts` and `src/i18n/*.ts`.
  - Maintainer decisions (2026-11-22): only 2026 Director holders; entry from the dashboard of an existing survey; closed centre list; kierunek from the list or typed (≤ 80, private); 11 broad ISCED-F groups; results only for contributors; the report can be edited and deleted on its own. Revised the same day ([ADR 0016](../docs/adr/0016-scholarship-holder-results-page-without-minimum.md)): no floor and no ladder; results on a separate page; all countries by default with a filter by country of citizenship.
  - The old `prep_course_city`, `study_field` and status columns and `get_prep_city_distribution` are not reused.
  - No product events in this task; adding any needs a catalogue entry under ADR 0011.

## Scope

- In scope:
  - Migration `supabase/migrations/202611300001_scholarship_reports.sql`: table `scholarship_reports` (`identity_hash`, `intake_year`, `study_route`, `prep_centre_id`, `programme_id`, `programme_isced`, `custom_programme`, `university_id`, timestamps), unique on `(identity_hash, intake_year)`, FK with cascade to `responses`, checks (centre present only on the preparatory path; exactly one of programme id / typed text; typed text 1–80 characters; ISCED `^[0-9]{4}$`); RPCs for get-own, create, update, delete and `get_scholarship_report_summary(identity_hash, intake_year, ranking_country)` (`ranking_country` null = all countries) that refuses callers without a report and returns the filter's country list with counts plus the lists above; service role only.
  - Contracts and zod schemas for the input, the own report and the summary; ids validated against the task 011 catalogues and the track's universities; `programme_isced` set by the server from the catalogue, never by the client.
  - `api/scholarship-report.ts`: `GET` (own report, or `{ report: null }`), `GET ?summary=1[&country=XX]` (the results page; `country` validated as a country code; 404 `REPORT_NOT_FOUND` without a report), `POST`, `PUT`, `DELETE`; same-origin and `initData` checks; 404 `PROFILE_NOT_FOUND` without a 2026 Director survey; 409 `REPORT_EXISTS` on a second `POST`; 404 `REPORT_NOT_FOUND` on `PUT`/`DELETE` without one.
  - API client functions, the dashboard card, the flow view, the results page, five-locale copy following ADR 0010, the privacy points.
  - Tests listed under Verification.
  - `docs/architecture.md` (table, RPCs, disclosure rules, typed-kierunek SQL, changelog) and `docs/product-flow.md` (new section for the survey, changelog line).
- Out of scope: inviting holders through the bot, holders of other intakes or tracks, verification of the scholarship, showing results to non-contributors, cross-tables (for example field by centre), product events, changes to the score statistics, the spike rule (task 010) or the edit limit (task 009).
- Files or directories assigned to this task: `supabase/migrations/202611300001_scholarship_reports.sql`, `supabase/tests/` (new `scholarship_reports.sql`), `supabase/tests/migration-contracts.test.ts`, `api/scholarship-report.ts` (+ test), `api/_lib/errors.ts`, `shared/contracts.ts`, `shared/validation.ts`, `shared/api-contracts.test.ts`, `shared/season.ts` or a new `shared/scholarship-report.ts` for the constant, `src/lib/api-client.ts`, `src/features/ProfileDashboard.tsx`, new files under `src/features/scholarship-report/`, `src/i18n/*.ts`, `docs/architecture.md`, `docs/product-flow.md`.

## Acceptance scenarios

| ID | Given / when | Expected result | Planned verification |
| --- | --- | --- | --- |
| A1 | Dashboard of a 2026 Director survey without a report | The invitation card appears between the what-if / distribution blocks and the profile block; for another intake year it does not | ProfileDashboard test |
| A2 | Preparatory path: path → centre → kierunek from the list → university → save | `POST` with the chosen ids; the card shows the answers and the results | Flow test with mocked API |
| A3 | Direct path | The centre step is skipped; the saved report has no centre | Flow test + SQL check constraint test |
| A4 | Typed kierunek of 81 characters, empty, or with a line break | Rejected on the client and with 400 on the server; 1–80 characters accepted | Flow test, `shared/validation` test, handler test |
| A5 | Unknown centre id, centre on the direct path, unknown programme id, both or neither of programme id and typed text, a university outside the Director track | 400; nothing stored | Handler test + SQL tests for the structural checks |
| A6 | `GET ?summary=1` by a user without a report | 404 `REPORT_NOT_FOUND`; the summary RPC called directly for that user refuses; plain `GET` answers `{ report: null }` | Handler test, SQL test |
| A7 | 1 report from BY (preparatory, centre UMCS) and 3 from UA, all countries | Totals 4; BY in the filter with 1 and UA with 3, UA first; the BY centre is listed with count 1; no "Other" row, no "too few answers" message | SQL test + results-page test |
| A8 | Filter set to BY | Every list counts only BY reports; reopening the page starts again on `Все страны` | SQL test + results-page test |
| A9 | 11 typed kierunki that are the same text | They count only in `Вписано вручную`; the text never appears in any summary or in another user's `GET` | SQL test + handler test |
| A10 | One report for a catalogue kierunek | That kierunek is listed with count 1 under its ISCED-F broad group | SQL test |
| A11 | Reports whose survey is `is_suspicious` | Excluded from every count | SQL test |
| A12 | Edit the report | `PUT` replaces the answers; counts update | Flow test + SQL test |
| A13 | Delete the report | Removed; the card shows the invitation; the results page is no longer reachable and the summary is refused; the survey stays | Flow test + SQL test |
| A14 | Delete the survey | The report is deleted with it | SQL test (cascade) + `api/responses.test.ts` unchanged and passing |
| A15 | `POST` twice; `PUT`/`DELETE` without a report; no 2026 Director survey; cross-origin; no `initData` | 409 `REPORT_EXISTS`; 404 `REPORT_NOT_FOUND`; 404 `PROFILE_NOT_FOUND`; 403; 401 | Handler test |
| A17 | Card with a saved report → `Куда распределили стипендиатов`; then Telegram back | The results page opens; back returns to the dashboard | Results-page / ProfileDashboard test |
| A16 | Copy | All new keys in five locales; the privacy points present; locale parity passes; terms follow ADR 0010 | `npm test -- src/i18n` + reviewer read |

## Must stay unchanged

- Behavior, contracts, or user-facing copy this task must not alter:
  - `/api/responses`, `/api/statistics`, `/api/intake-summary` contracts and the score statistics;
  - `MIN_COHORT_SIZE` / `min_cohort_size()` and the landing counter (this task no longer uses them);
  - the start screen, the survey wizard and the edit wizard;
  - server-side `initData` verification; no raw Telegram ID in the new table;
  - the product-event catalogue (no new events).
- Existing checks that already cover it: `api/responses.test.ts`, `api/_lib/api-stack.test.ts`, `src/features/ProfileDashboard.test.tsx`, `src/pages/home-page.test.tsx`, `supabase/tests/statistics.sql`, `supabase/tests/migration-contracts.test.ts`.

## Open decisions

- None.

## Verification

- `npm run test:db:pglite` → A3, A5–A14 (SQL); CI runs pgTAP
- `npm test -- api/scholarship-report.test.ts shared/api-contracts.test.ts shared/validation.test.ts` → A4–A6, A9, A15
- `npm test -- src/features/ProfileDashboard.test.tsx src/features/scholarship-report src/i18n` → A1–A4, A7, A8, A12, A13, A16, A17
- `make check`
- Manual (local fixtures, `make dev` after checking ports 3000/3001 and `.env.local`): as a returning 2026 user, fill the survey on each path, edit it, delete it; seed reports in two countries and check the results page with both filters. → A1–A3, A7, A8, A12, A13, A17

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
| A12 | | |
| A13 | | |
| A14 | | |
| A15 | | |
| A16 | | |
| A17 | | |

- Changed files:
- Checks not run, blockers, or open questions:
- LLM contributions: Claude Opus 5.5 (Claude Code) — specification of this brief and [ADR 0012](../docs/adr/0012-scholarship-holder-survey.md); revision of this brief (results page, no floor) and [ADR 0016](../docs/adr/0016-scholarship-holder-results-page-without-minimum.md).
