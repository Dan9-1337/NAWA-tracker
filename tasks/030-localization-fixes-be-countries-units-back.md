# 030 — Localization fixes: Belarusian country names, uk and be units, the "Back" button

**Status:** In review

## Goal

Three localization defects found on 2026-11-26 by switching the language on the dashboard and in the wizard.

1. **Belarusian shows country names in English.** With the language set to Belarusian the card says "5 з 17 · Ukraine".
   `getCountryDisplayName` (`shared/countries.ts`) relies on `Intl.DisplayNames([locale], { type: 'region' })` and the
   browser has no Belarusian region data: Chrome answers "Ukraine" for `be` (and `ru` → "Украина", `uk` → "Україна"
   work). The same call feeds the country pickers, the card, the invite text and the reports, so every Belarusian screen
   that names a country is affected. Node's ICU does have the data (`Украіна`, `Польшча`, `Казахстан`, `Беларусь`).
   **Decision (maintainer, 2026-11-26): Belarusian shows Belarusian country names, there is no fallback to another language.**
2. **The Ukrainian and Belarusian sample line has no unit.** `cohortMeta` reads "17 у вибірці · медіана 76,5" (uk) and
   "17 у выбарцы · медыяна 76,5" (be); pl and ru add the unit ("mediana 76,5 pkt", "медиана 76,5 балла").
3. **"← Back" is hardcoded in English.** `DevActionBar` in `src/components/MiniAppShell.tsx` prints `← Back` in every
   language. That bar is shown only **outside Telegram** (it returns `null` when `app.isTelegram`), so real users do not
   see it; it matters for local browser testing and the demo. Every locale already has a `back` string (ru "Назад",
   pl "Wstecz", en "Back", uk "Назад", be "Назад").

Intended behavior:

- `getCountryDisplayName(code, 'be')` returns a Belarusian name for every code in `countryCodes`, whatever the browser's
  ICU data contains. The table is generated once from Node's ICU by a script kept in `scripts/`, and the generated file is
  committed (a static module under `shared/`). Other locales keep using `Intl.DisplayNames`.
- The names depend on the CLDR version inside Node (Node 26.7 here has ICU 78.3 / CLDR 48.0; the package allows Node
  22.12, which ships an older CLDR), so the file cannot be byte-identical across Node versions. The generator therefore:
  writes the entries in `countryCodes` order; writes a header comment with `process.versions.node`, `icu` and `cldr`
  and no timestamp; takes `--output <path>` (default `shared/country-names-be.ts`), like
  `scripts/build-study-programmes.mjs`; and does not import `.ts` files (Node 22.12 cannot without a flag), for example
  by reading the codes out of `shared/countries.ts` as text. It is run by hand, never in CI or at build time.
- If a code is missing from the table, the function falls back to what it does today (`Intl.DisplayNames`, then `null`).
- The uk and be `cohortMeta` strings end with the unit in the correct plural form (uk бал/бали/балів, be бал/балы/балаў),
  built with the plural helper each locale already uses for "points" (uk `pointsWord`, be `forNumber(…, POINTS)`). In the
  app the median always comes from `formatScore` with one decimal ("76,6"), so the shown form is always the fractional
  one, "бала"; the integer forms only matter for the helper.
- `DevActionBar` uses the locale's existing `t.settings.back` string with the arrow, for example `← Назад`.

## Context

- Relevant code and docs: `shared/countries.ts` (`countryCodes`, `getCountryDisplayName`), `src/components/CountrySelect.tsx`,
  `src/lib/country-label.ts`, `src/i18n/uk.ts` and `src/i18n/be.ts` (`cohortMeta`, the plural helper near the top of each
  file), `src/components/MiniAppShell.tsx` (`DevActionBar`), `src/i18n/locales.test.ts`, [ADR 0010](../docs/adr/0010-locale-glossary-and-english-api-errors.md),
  README ("Languages").
- ADRs this task follows: 0010. Replaces none.
- Dependencies and decisions already made: the decision in item 1. The Belarusian names come from CLDR through Node's ICU
  and are a draft until a native speaker reads them, like the other Belarusian texts. Task 028 also edits the locale files
  (a different key); merge one after the other. `src/pages/home-page.test.tsx` clicks the dev back button by the name
  `'← Back'` (lines 197, 424 and 429, rendered in pl); those become `` `← ${pl.settings.back}` ``. Task 027 owns that file
  and task 029 changes one test in it: merge 030 after 027 and touch only those three lines.

## Scope

- In scope: the generator script and the generated Belarusian name table; using it for `be` in `getCountryDisplayName`;
  the `cohortMeta` units in uk and be; the `DevActionBar` label; one sentence in README "Languages" saying the Belarusian
  country names are generated from CLDR and await a native review; tests.
- Out of scope: any other locale's country names, any other locale string, the order or the "popular" list of countries,
  the real Telegram back button, and the About-screen duplicate title.
- Files or directories assigned to this task: `shared/countries.ts`, a new `shared/country-names-be.ts` (generated), a new
  `scripts/generate-country-names-be.mjs`, `src/i18n/uk.ts`, `src/i18n/be.ts`, `src/components/MiniAppShell.tsx`, `README.md`,
  and their tests (`shared/countries.test.ts`, `src/i18n/locales.test.ts`, a new `src/components/mini-app-shell.test.tsx`
  rendering `MiniAppShell` outside Telegram, since `DevActionBar` is not exported) plus the three `'← Back'` lines in
  `src/pages/home-page.test.tsx`.

## Acceptance scenarios

| ID | Given / when | Expected result | Planned verification |
| --- | --- | --- | --- |
| A1 | `Intl.DisplayNames` is stubbed to return English names for `be` | `getCountryDisplayName('UA', 'be')` is `Украіна` anyway | Unit test in `shared/countries.test.ts` |
| A2 | Every code in `countryCodes` | The Belarusian name exists, is non-empty, contains Cyrillic letters and is not the code | Unit test over `countryCodes` |
| A3 | The language is Belarusian, a Ukrainian citizen's dashboard | The card says "5 з 17 · Украіна" and the country picker lists Belarusian names | Manual in Chrome; component test with the be locale |
| A4 | A code absent from the table (test with a fake code) | Falls back to the previous behavior (`null` or the ICU name), no throw | Unit test |
| A5 | uk and be, `cohortMeta('18', '76,6')` | uk "18 у вибірці · медіана 76,6 бала", be "18 у выбарцы · медыяна 76,6 бала"; with integer medians `'1'`, `'2'`, `'5'`, `'21'` the unit is uk бал/бали/балів/бал and be бал/балы/балаў/бал | Unit test on `messages.uk/be.dashboard.hero.cohortMeta` in `src/i18n/locales.test.ts` |
| A6 | The language is pl, en, ru, uk or be, outside Telegram, a step with a Back button | The button reads `← Wstecz`, `← Back`, `← Назад`, `← Назад`, `← Назад`; the `home-page.test.tsx` back clicks still pass | `src/components/mini-app-shell.test.tsx` with each locale; `npm test -- src/pages/home-page.test.tsx` |
| A7 | The generator is run twice with the same Node, and its header is read | Both runs give identical bytes; the header names the Node, ICU and CLDR versions used; run with the Node whose CLDR the header names, the output equals the committed `shared/country-names-be.ts` | Manual: `node scripts/generate-country-names-be.mjs --output "$TMPDIR/a.ts" && node scripts/generate-country-names-be.mjs --output "$TMPDIR/b.ts" && cmp "$TMPDIR/a.ts" "$TMPDIR/b.ts" && cmp "$TMPDIR/a.ts" shared/country-names-be.ts`; the handoff quotes the header and `node -p process.versions.cldr` |
| A8 | Languages other than be | Country names are unchanged | Existing `src/lib/country-label.test.ts` (pl `Ukraina`, ru `Украина`); `shared/countries.test.ts` checks no names today |

## Must stay unchanged

- Behavior, contracts, or user-facing copy this task must not alter: country codes, their order and the popular list; every
  string in the five locales other than the two `cohortMeta` lines; the Telegram-native back button.
- Existing checks that already cover it: `shared/countries.test.ts` (codes, popular list), `src/lib/country-label.test.ts`
  (names in pl and ru), `src/i18n/locales.test.ts` (key parity, arity, no Russian-only spellings in uk and be),
  `src/pages/home-page.test.tsx` (dev back button), the bundle budget (`scripts/check-bundle-size.mjs`, run in CI; the
  table adds about 3 kB gzip).

## Open decisions

- None.

## Verification

- `npm test -- shared/countries.test.ts src/lib/country-label.test.ts src/i18n src/components src/pages/home-page.test.tsx` → A1, A2, A4–A6, A8
- The two generator runs and `cmp` commands in A7 → A7
- `make check`
- `npm run build && node scripts/check-bundle-size.mjs` → bundle budget
- Manual in Chrome (`make dev`, language Belarusian) → A3

## Handoff

| Scenario | Evidence (command, test assertion, or manual check) | Result |
| --- | --- | --- |
| A1 | `npm test -- shared/countries.test.ts` → `returns Belarusian names even when Intl.DisplayNames answers in English (A1)` (`getCountryDisplayName('UA', 'be')` is `Украіна` with `Intl.DisplayNames` stubbed to English) | pass |
| A2 | `npm test -- shared/countries.test.ts` → `has a Cyrillic Belarusian name for every offered country (A2)` (loops over `countryCodes`: truthy, not the code, matches Cyrillic) | pass |
| A3 | Component test: `npm test -- src/components/CountrySelect.test.tsx` → `lists Belarusian country names in Belarusian even when the browser answers in English (A3)` (be picker lists `Украіна`, `Беларусь`, not `Ukraine`); `src/lib/country-label.test.ts` → `localizes ISO country codes` (`formatCountryLabel('UA', 'be')` is `Украіна`, the card's label function). Manual card check: not run: needs maintainer manual check. Steps: `make dev`, set the language to Belarusian, open a Ukrainian citizen's dashboard; the card says "5 з 17 · Украіна" and the country picker lists Belarusian names | not run (manual part); component part pass |
| A4 | `npm test -- shared/countries.test.ts` → `falls back to Intl.DisplayNames, then null, for a code missing from the Belarusian table (A4)` (`'Atlantis'`, `''` give `null`; a code absent from the table with a stubbed `Intl.DisplayNames` gives the ICU name) | pass |
| A5 | `npm test -- src/i18n/locales.test.ts` → `cohort sample line > ends with the points unit in uk and be (A5)` (uk "18 у вибірці · медіана 76,6 бала", be "18 у выбарцы · медыяна 76,6 бала") and `uses the plural form for the integer median … in uk and be (A5)` for `1`, `2`, `5`, `21` (uk бал/бали/балів/бал, be бал/балы/балаў/бал) | pass |
| A6 | `npm test -- src/components/mini-app-shell.test.tsx` → `reads "%s" outside Telegram in the active language (A6)` for pl `← Wstecz`, en `← Back`, ru/uk/be `← Назад`, plus `renders no bar inside Telegram`; `npm test -- src/pages/home-page.test.tsx` → 22 tests pass with the back clicks using `` `← ${pl.settings.back}` `` | pass |
| A7 | `T=$(mktemp -d); node scripts/generate-country-names-be.mjs --output "$T/a.ts" && node scripts/generate-country-names-be.mjs --output "$T/b.ts" && cmp "$T/a.ts" "$T/b.ts" && cmp "$T/a.ts" shared/country-names-be.ts` → no output from `cmp`, exit 0. Header: `Source: Node 26.7.0, ICU 78.3, CLDR 48.0 (\`Intl.DisplayNames\`, locale "be", type "region").` (no timestamp); `node -p process.versions.cldr` → `48.0` | pass |
| A8 | `npm test -- src/lib/country-label.test.ts` (pl `Ukraina`, ru `Украина`) and `shared/countries.test.ts` → `keeps using Intl.DisplayNames for other locales (A8)` (pl, ru, uk, en) | pass |

- Changed files: `scripts/generate-country-names-be.mjs` (new), `shared/country-names-be.ts` (new, generated), `shared/countries.ts`, `shared/countries.test.ts`, `src/i18n/uk.ts`, `src/i18n/be.ts`, `src/i18n/locales.test.ts`, `src/components/MiniAppShell.tsx`, `src/components/mini-app-shell.test.tsx` (new), `src/components/CountrySelect.test.tsx` (A3 component test), `src/lib/country-label.test.ts` (one `be` assertion), `src/pages/home-page.test.tsx` (four `'← Back'` lines, see below), `README.md` (one sentence in "Languages"), this brief (Status and Handoff).
- Checks not run, blockers, or open questions:
  - Run: `npm test -- shared/countries.test.ts src/lib/country-label.test.ts src/i18n src/components src/pages/home-page.test.tsx` (14 files, 168 tests pass), `make check` (exit 0; 68 files, 647 tests, typecheck), `npm run build && node scripts/check-bundle-size.mjs` (`Bundle (gzip): js 186.4 kB, css 6.6 kB`, within budget).
  - Not run: A3 manual check in Chrome (see the A3 row).
  - `src/pages/home-page.test.tsx` has four, not three, `'← Back'` clicks (lines 197, 424, 429 and 685; the last one is in `leaves no wizard draft after an edit is saved or left with Back`, added after the brief was written). All four were changed to `` `← ${pl.settings.back}` ``; no other line in that file was touched.
  - `src/components/CountrySelect.test.tsx` and `src/lib/country-label.test.ts` are not named in the brief's file list; they hold the A3 component test and one `be` assertion (both are tests of assigned code).
  - The Belarusian names are CLDR 48.0 output (Node 26.7.0), a draft until a native speaker reads them. The generator fails if ICU returns a non-Cyrillic name for any code (for example on a Node without full ICU).
- LLM contributions: Sonnet 5.5 (Claude Code) wrote this specification. Implementation and review: not yet done. Opus 5.5 (Claude Code subagent): specification review. Sonnet 5.5 (Claude Code subagent): implementation.
