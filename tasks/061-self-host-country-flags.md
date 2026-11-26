# 061 — Country flags from our own domain

**Status:** In review

## Goal

Make the flags work in production and stop sending requests to a third party. `react-circle-flags` loads each flag from
`https://react-circle-flags.pages.dev/<code>.svg` (its default `cdnUrl`), but the production Content-Security-Policy is
`img-src 'self' data: blob:` (`vercel.json`). In production every flag in the country picker, on the result card and in the holder
results is therefore blocked, and each attempt shows the visitor's IP to an outside host. The dev server has no CSP, so nobody saw it.

Intended behavior: every flag is served from the app's own origin (`/flags/<code>.svg`) and renders under the unchanged CSP.
A country with no flag file keeps the existing globe fallback.

## Context

- Relevant code and docs: `src/components/CountryFlag.tsx` (`CircleFlag`, the globe fallback), `vercel.json` (CSP), `package.json`
  (`react-circle-flags`), `shared/countries.ts` (the country list), `scripts/check-bundle-size.mjs`, [Architecture](../docs/architecture.md)
  (hosting, CSP).
- ADRs this task follows: [0001](../docs/adr/0001-telegram-mini-app-on-vercel-and-supabase.md). Replaces none.
- Dependencies and decisions already made: none outstanding. The fix keeps the CSP as it is; it does not add an image host. The SVGs
  come from the `circle-flags` project (MIT licence), which the `react-circle-flags` package wraps; keep the licence text next to
  the files.

## Scope

- In scope: copying the SVGs for every country code in `shared/countries.ts` into `public/flags/` (use the package's own source
  assets if shipped in `node_modules`, otherwise the upstream project's files, pinned to a release); passing `cdnUrl="/flags/"` (or the
  equivalent) in `CountryFlag`; a test that proves no remote URL is requested; the licence file; a note in `docs/architecture.md`.
- Out of scope: changing the CSP, a flag sprite or an icon font, redesigning the flag look.
- Files or directories assigned to this task: `src/components/CountryFlag.tsx`, `src/components/country-flag.test.tsx` (new), `public/flags/`
  (new), `docs/architecture.md`, `package.json` only if the package is replaced.

## Acceptance scenarios

| ID | Given / when | Expected result | Planned verification |
| --- | --- | --- | --- |
| A1 | `CountryFlag` renders for `UA`, `BY`, `KZ`, `PL` | The `img` source starts with `/flags/` and ends with the lowercase code and `.svg` | `country-flag.test.tsx` |
| A2 | For every code in `shared/countries.ts` | A file `public/flags/<code>.svg` exists | A test that lists the codes and checks the files |
| A3 | A code with no file (for example a test fixture code) | The globe fallback renders and no request is made | `country-flag.test.tsx` |
| A4 | Search `src` and `node_modules/react-circle-flags` default for the remote host in the runtime path | The runtime path never uses `react-circle-flags.pages.dev` | `grep` output and test in the handoff |
| A5 | `vercel.json` | The CSP is unchanged | Reviewer read of the diff |
| A6 | Production build (`npm run build`), served locally with the CSP header applied | Flags display with no CSP violation in the console | Manual: build, preview with the header, screenshot |
| A7 | The bundle-size check | `npm run build` and `scripts/check-bundle-size.mjs` still pass (flags are static files, not in the JS bundle) | `make check` |

## Must stay unchanged

- Behavior, contracts, or user-facing copy this task must not alter: the flag's size, shape and `aria-hidden`; the globe fallback;
  the country list and labels.
- Existing checks that already cover it: `src/components/CountrySelect.test.tsx`, `shared/countries.test.ts`,
  `vercel-config.test.ts`, `scripts/check-bundle-size.test.ts`.

## Open decisions

- None.

## Verification

- `npm test -- src/components shared/countries vercel-config` → A1–A3
- `grep -rn "react-circle-flags.pages.dev" src public` → A4
- `npm run build` then a local preview with the production headers, open the picker → A6
- `make check` → A7

## Handoff

| Scenario | Evidence (command, test assertion, or manual check) | Result |
| --- | --- | --- |
| A1 | `src/components/country-flag.test.tsx`: `UA`, `BY`, `KZ`, `RU` render `img` src exactly `/flags/<code>.svg`. **Deviation:** `PL` is not in `shared/countries.ts` (excluded on purpose), so `isCountryCode('PL')` is false and `CountryFlag` renders the globe; making it show a flag would change the country list/guard, which "Must stay unchanged" forbids. `RU` is tested instead of `PL`; the test asserts `PL` gives the globe (A3). Maintainer to confirm. | Pass (PL deviation) |
| A2 | Test checks `public/flags/<code>.svg` exists for all 249 codes and that `react-circle-flags` knows each code (so it never maps to `xx.svg`); also checks `public/flags/LICENSE.md`. SVGs from HatScripts/circle-flags v2.8.0 (package ships no SVGs). | Pass |
| A3 | Test: `ZZ`, `PL` and empty code render no `img` and show the globe `svg`. | Pass |
| A4 | `grep -rn "react-circle-flags.pages.dev" src public` returns nothing (exit 1). Test asserts every picker country renders a src matching `^/flags/[a-z]{2}\.svg$`. Note: the host string still exists inside the `react-circle-flags` library code in the built JS as its unused default; `cdnUrl` always overrides it. | Pass |
| A5 | I did not edit `vercel.json` (`git diff vercel.json` empty; `vercel-config.test.ts` passes). Reviewer to read the diff. | Pass |
| A6 | `vite build --outDir <scratch>` succeeded and copied 250 files to `dist/flags`. A local static server applying the exact CSP from `vercel.json` returned `/flags/ua.svg` as `200 image/svg+xml` (not the SPA index). `img-src 'self'` covers it. No browser/screenshot check: the picker sits behind the Telegram gate and `make dev` is off-limits in this session. | Partial |
| A7 | `npm test -- scripts/check-bundle-size` passes. `check-bundle-size.mjs` against my scratch build reports JS 191.1 kB gzip vs the 190 kB budget (FAIL). My change adds only a prop and no JS; the shared checkout has other agents' uncommitted changes, so the overshoot is not from this task. `make check` not run (orchestrator). | Not confirmed |

- Changed files: `src/components/CountryFlag.tsx` (`cdnUrl="/flags/"`, exported `FLAGS_BASE_URL`), `src/components/country-flag.test.tsx` (new), `public/flags/` (249 SVGs + `LICENSE.md`, new), `docs/architecture.md` (Images note and changelog entry). `package.json` untouched (package kept).
- Checks not run, blockers, or open questions: `make check` and `npm run build` against `dist/` not run (scratch `--outDir` used to avoid clobbering). `npm test -- src/components shared/countries vercel-config scripts/check-bundle-size` and `npm run typecheck` pass. Open: the A1 `PL` mismatch above; the JS bundle budget overshoot (191.1 vs 190 kB) in the shared checkout.
- LLM contributions: Claude Sonnet 5.5 (Claude Code): specification; the CSP/flag finding came from a read-only audit by a Claude research subagent and was confirmed by reading `vercel.json` and the package's default URL. Implementation: Claude Sonnet 5.5 (implementation). Review: not yet done.
