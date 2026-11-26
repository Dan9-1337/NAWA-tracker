# 069 — Country picker as a bottom sheet that finds a country in any language

**Status:** Ready

## Goal

Replace the inline country dropdown with a bottom sheet that is easy to use with a thumb and with a keyboard. Seen live at 390px:
the list opens inline under the select, and for the second select it is entirely hidden behind the fixed bottom bar until the page is
scrolled; the search matches only the current locale's names; rows are 40px high; there are no arrow keys or Escape; and every row is a tab
stop among about 250 countries. The maintainer approved the change (2026-11-26).

Intended behavior:

1. Tapping a country field opens a **sheet** that covers the screen's lower part, above the Telegram bottom controls. The page
   behind it cannot be scrolled and is inert. A search field at the top, focused on open, and a list below.
2. **Rows** are at least 44px high, show the flag and the name, and the chosen country is marked. The list starts with a group
   `Популярные` (Украина, Беларусь, Казахстан) and then all countries alphabetically in the current locale.
3. **Search** ignores case, `ё`/`е` and diacritics, and matches a country's name in **any of the five locales** and its ISO code:
   typing `Ukraine`, `UA`, `Украина`, `Україна` or `Ukraina` finds Ukraine whatever the app language is. A search with no result says
   `Ничего не найдено`.
4. **Keyboard and assistive tech:** arrow keys move through rows, Enter chooses, Escape closes; focus is trapped in the sheet and
   returns to the field that opened it; the list uses a valid listbox structure (group headings are `role="group"`, rows are the only
   options).
5. **Telegram chrome:** while the sheet is open the main button is hidden and the Telegram Back button closes the sheet (not the screen
   behind it); both are restored on close.
6. Choosing a country sets the value, closes the sheet and gives selection haptics, as today.

This applies to the two country selects of the education step. Other searchable lists (universities, programmes) keep their current
behavior.

## Context

- Relevant code and docs: `src/components/CountrySelect.tsx`, `src/components/SearchableSelect.tsx` (shared with the holder flow; do not
  change its other uses), `src/components/rank-search-matches.ts` and its test, `shared/countries.ts`, `shared/country-names-be.ts`, `src/lib/country-label.ts`,
  `src/features/wizard/EducationStep.tsx`, `src/lib/useMiniAppChrome.ts`, `src/components/SettingsSheet.tsx` (an existing sheet to follow),
  [ADR 0019](../docs/adr/0019-minimum-text-size-14px.md).
- ADRs this task follows: [0019](../docs/adr/0019-minimum-text-size-14px.md). Replaces none.
- Dependencies and decisions already made: tasks 031 (closest matches first) and 042 are `Done`; the ranking helper keeps ranking results, now
  across all names. The names of the countries in the five locales already exist in the repository (the Belarusian names in
  `shared/country-names-be.ts`); no new data is invented. The sheet uses the stable viewport height (`--tg-viewport-stable-height`), and
  how it behaves when the on-screen keyboard opens is checked on a real device by task 074.

## Scope

- In scope: a `CountrySheet` used by `CountrySelect`; multi-locale and ISO search; keyboard handling and focus management; hiding the main
  button and the Back handling while open; tests.
- Out of scope: the yes/no question (task 068), the other searchable selects, the country list itself, any API change.
- Files or directories assigned to this task: `src/components/CountrySelect.tsx`, `src/components/CountrySheet.tsx` (new),
  `src/components/CountrySelect.test.tsx`, `src/components/rank-search-matches.ts` and its test, `src/lib/country-label.ts` (if a helper for all-locale names
  is needed) and its test, `src/index.css` (sheet rules only), `src/i18n/*`.

## Acceptance scenarios

| ID | Given / when | Expected result | Planned verification |
| --- | --- | --- | --- |
| A1 | The user taps the citizenship field | A sheet with `role="dialog"`, a focused search field and the list opens; the page behind is inert | `CountrySelect.test.tsx` |
| A2 | The app language is Russian; the user types `Ukraine`, `UA`, `Україна`, `Ukraina` | Ukraine is the first result each time | `CountrySelect.test.tsx`, `rank-search-matches.test.ts` |
| A3 | The user types `belaru` and `Biał` | Belarus is found in both | Same |
| A4 | A search with no match | `Ничего не найдено` shows | `CountrySelect.test.tsx` |
| A5 | Arrow Down, Enter, then reopen and press Escape | The country is chosen with Enter; Escape closes without a change; focus returns to the field in both cases | `CountrySelect.test.tsx` |
| A6 | The sheet is open in Telegram (fake WebApp) | The main button is hidden; pressing Back closes the sheet and not the screen; both are restored after closing | `CountrySelect.test.tsx` with the fake WebApp |
| A7 | Row sizes | Every row has `min-height` 44px; group headings are not tab stops | Component test |
| A8 | The list structure | Only options are children of the listbox; headings use `role="group"` with a label | Component test (testing-library roles) |
| A9 | Holder flow lists (universities, programmes) | Unchanged | `scholarship-report.test.tsx`, `SearchableSelect.test.tsx` pass |
| A10 | Browser 390×700, with and without the keyboard | The list is visible above the bottom controls | Manual (optional); real-device check is task 074 |
| A11 | Five locales | New strings in all five; glossary tests pass | `src/i18n/locales.test.ts`, `src/i18n/glossary.test.ts` |

## Must stay unchanged

- Behavior, contracts, or user-facing copy this task must not alter: the country values and codes, the order of countries
  within a locale, the `Популярные` choices, the flags, the other searchable lists, the stored data.
- Existing checks that already cover it: `src/components/CountrySelect.test.tsx`, `src/components/SearchableSelect.test.tsx`,
  `src/components/rank-search-matches.test.ts`, `shared/countries.test.ts`.

## Open decisions

- None.

## Verification

- `npm test -- src/components src/features src/lib src/i18n shared` → A1–A9, A11
- `make check`
- Manual (optional): `make dev-new`, the education step at 390×700 → A10

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
- LLM contributions: Claude Sonnet 5.5 (Claude Code): specification; the findings came from the live walkthrough and a read-only audit by a Claude research subagent. Implementation and review: not yet done.
