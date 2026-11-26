# 045 — Official award counts per country (data only)

**Status:** In review

## Goal

Add the data behind the hub's official-context line ([ADR 0021](../docs/adr/0021-official-award-counts-as-context.md)): for each
country of citizenship, how many Director's scholarships for first-cycle and long-cycle studies NAWA awarded in 2022, 2023
and 2024, transcribed from NAWA's annual activity reports. This task adds the data and a lookup. It does not draw anything;
task 047 shows the line.

Intended behavior: `officialAwardContext(country)` returns `{ year, count, sourceUrl, page }` for the latest year
(2024, then 2023, then 2022) in which the country has a row in the report's table, and `null` for a country with no row in
any of the three years. The count is "przyznane finansowanie": persons on the ranking list who were granted funding, before
resignations. It is not the number of holders after resignations and not the number of applications.

## Context

- Relevant code and docs: `shared/countries.ts` (country codes), `shared/scholarship-report.ts` (a sibling module with year
  constants), [ADR 0021](../docs/adr/0021-official-award-counts-as-context.md), `docs/assumptions.md` (D16, P1).
- Sources (NAWA, primary): annual activity reports, section on the Anders NAWA programme, tables of first-cycle and
  long-cycle ("I stopnia i jednolite magisterskie") scholarships by citizenship:
  - 2022: `https://nawa.gov.pl/images/BIP/Sprawozdanie-z-dzialalnosci-NAWA-za-rok-2022.pdf`, about pp. 48–51 (tables 47–51);
  - 2023: `https://nawa.gov.pl/images/2024/Sprawozdanie-z-dzialalnosci-NAWA-za-rok-2023.pdf`, about pp. 52–55 (tables 47–51);
  - 2024: `https://nawa.gov.pl/images/2025/Sprawozdanie-z-dzialalnosci-NAWA-za-rok-2024.pdf`, about pp. 47–50 (tables 52–56).
  Page and table numbers come from a research pass and may be off by one; find the tables by title.
- Research findings the implementer should expect (to be checked, not copied): the first-cycle and long-cycle total of
  persons granted funding is about 472 (2022), 525 (2023) and 502 (2024); Belarus is about 60% of it and Ukraine about 22%;
  Lithuania, Kazakhstan, Czechia and Russia each have a few dozen at most; many countries have one to six. The same
  reports have separate tables for second-cycle studies (do not use them), and the PDF text extraction mangles some
  column layouts, so read each row against the page.
- ADRs this task follows: [0021](../docs/adr/0021-official-award-counts-as-context.md), [0005](../docs/adr/0005-only-nawa-director-track-is-live.md). Replaces none.
- Dependencies and decisions already made: the maintainer chose to show this line (2026-11-26). Which figure: first-cycle and
  long-cycle, granted funding, latest of 2022–2024. 2018–2021 and 2025 are not used (no comparable per-country table).
  The Ministry of Health and Ministry of Culture scholarships are not part of these tables.

## Scope

- In scope: `shared/nawa-award-counts.ts` with the table keyed by report year and country code, each year carrying its source
  URL and report page; `officialAwardContext`; a test file; rows for every country that appears in the first-cycle table and
  that `shared/countries.ts` offers.
- Out of scope: any UI, i18n copy or product-flow text (task 047); fetching anything at runtime; second-cycle data; the
  Polish-plus-other dual-citizenship rows if the report lists them separately from a country (skip them and say so in the
  handoff); any score or cut-off.
- Files or directories assigned to this task: `shared/nawa-award-counts.ts`, `shared/nawa-award-counts.test.ts`.

## Acceptance scenarios

| ID | Given / when | Expected result | Planned verification |
| --- | --- | --- | --- |
| A1 | `officialAwardContext('BY')`, `('UA')`, `('KZ')` | Each returns the 2024 count from the report table, with `year` 2024 and a source URL ending in `Sprawozdanie-z-dzialalnosci-NAWA-za-rok-2024.pdf` | `shared/nawa-award-counts.test.ts` asserts year and source; the counts are spot-checked by the reviewer against the PDF (A4) |
| A2 | A country that has a 2023 row but no 2024 row | Returns the 2023 count with `year` 2023 | Test with a fixture table passed to an internal lookup function, so the test does not depend on the real rows |
| A3 | A country with no row in 2022–2024, and a code that is not a country | Returns `null` | Test |
| A4 | Reviewer opens the three PDFs | At least five rows per year (Belarus, Ukraine and three others) match the table's "przyznane finansowanie" column for first-cycle and long-cycle studies; the handoff records the sum of all transcribed rows per year next to the report's own total for that table, and explains any difference | Manual: PDF pages named in the data file |
| A5 | Data shape | Every country code passes `isCountryCode`; every count is a positive integer; each year has `sourceUrl` and `page` | Test |

## Must stay unchanged

- Behavior, contracts, or user-facing copy this task must not alter: everything. No component, locale file, migration or API
  handler changes; nothing is shown yet.
- Existing checks that already cover it: `shared/countries.test.ts`, `docs-consistency.test.ts`.

## Open decisions

- None.

## Verification

- `npm test -- shared/nawa-award-counts shared/countries` → A1–A3, A5
- `make check`
- Manual: compare the rows with the report pages → A4

## Handoff

| Scenario | Evidence (command, test assertion, or manual check) | Result |
| --- | --- | --- |
| A1 | `npm test -- shared/nawa-award-counts shared/countries`: "returns the 2024 figures for Belarus, Ukraine and Kazakhstan" asserts year 2024, counts BY 302, UA 104, KZ 14, source ending `...za-rok-2024.pdf` | Pass (2 files, 16 tests) |
| A2 | Same run: "falls back to the latest earlier year" uses a fixture table through `lookupOfficialAwardContext`; FR resolves to 2023, HU to 2022 | Pass |
| A3 | Same run: `NG`, `PL`, `OTHER`, empty string and lowercase `ua` return `null`; `CA` and `VE` (zero rows in 2023) return `null` | Pass |
| A4 | Reviewer step, not done by me. I read all three PDFs by text extraction (pdfplumber) and checked the sum of transcribed rows against each table's RAZEM row; a test asserts the sums. 2024 (printed pp. 48-49, Tabela 54): 502 transcribed, report 502. 2023 (pp. 53-54, Tabela 49): 525 transcribed, report 525. 2022 (p. 50, Tabela 49): 472 transcribed, report 472. No differences. Belarus 302 / 329 / 263, Ukraine 104 / 106 / 105 (2024 / 2023 / 2022) | Sums match; PDF spot-check by reviewer pending |
| A5 | Same run: "uses valid country codes, positive integer counts, a source URL and a page for each year" | Pass |

- Changed files: `shared/nawa-award-counts.ts` (new), `shared/nawa-award-counts.test.ts` (new), this brief.
- Notes on the data: the count is the "przyznane finansowanie" column (2024, 2023: "liczba osób na liście rankingowej, którym zostało przyznane finansowanie"; 2022 table has only "liczba wniosków zakwalifikowanych do finansowania", used as the same figure; its sum equals the report total 472 and the narrative text). Rows left out: "Pozostałe kraje" (not a country, zero everywhere); Romania 2022, Canada 2023 and Venezuela 2023 (a row, but zero persons granted funding; Romania has a 2023 and 2024 row, so it still resolves to 2024); no separate Polish-plus-other dual-citizenship row exists in the tables (the reports count those persons inside their other country's row), so nothing was skipped on that account. `page` is a string because the table spans two pages in 2023 and 2024. All source PDFs downloaded read-only from nawa.gov.pl; PDF page numbers equal printed page numbers.
- Checks not run, blockers, or open questions: `make check` (the orchestrator runs it); `docs-consistency.test.ts` not run separately. `npm run typecheck` passes. No blockers.
- LLM contributions: Claude Sonnet 5.5 (Claude Code): specification and the research pass over NAWA reports that produced the source list and expected totals (via research subagents); ADR 0021. Claude Sonnet 5.5 (implementation): data file, lookup, tests, handoff. Review: not yet done.
