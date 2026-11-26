# 062 — An expired session is not "you have no survey"

**Status:** In review

## Goal

Stop sending returning users to the empty start screen when their Telegram session has expired, and stop trapping a user on a
save that can never succeed. Found by reading the code (not yet reproduced in a Telegram client):

- `api/responses/current.ts` answers **401 `UNAUTHORIZED`** both when `initData` is invalid or older than 24 hours and when the
  account simply has no survey (`if (currentResult.data === null) throw unauthorized()`). `HomePage.loadCurrentSession` treats every
  401 as "no survey" and opens the create flow. A returning user whose Mini App stayed open past 24 hours sees the wizard as if
  their data were gone, and the save then fails with a generic message.
- A create that returns **409 `PROFILE_EXISTS`** (the same account on a second device, or a lost response after a successful save)
  shows `Не удалось сохранить` and every retry fails the same way.

Intended behavior:

1. The server answers **404 `PROFILE_NOT_FOUND`** (the existing `profileNotFound()`) when the account has no survey for the active intake
   year, and **401 `UNAUTHORIZED`** only for missing, invalid or expired Telegram authentication.
2. The client: 404 `PROFILE_NOT_FOUND` on the current-survey request opens the create flow (as the old 401 did). A 401 on any request
   shows a full-screen state in the user's language: `Сессия истекла. Откройте приложение заново.` with a button `Открыть заново` that
   reloads the page, and the Settings button stays reachable. It does not open the wizard.
3. A 409 `PROFILE_EXISTS` on create reloads the current survey and shows the dashboard with the line `Анкета уже сохранена на другом
   устройстве — показываем её.` The wizard draft is cleared.
4. A 401 on save or update shows the session-expired state, not `Не удалось сохранить`.

## Context

- Relevant code and docs: `api/responses/current.ts`, `api/_lib/errors.ts` (`unauthorized`, `profileNotFound`, `profileExists`),
  `api/responses.ts`, `src/pages/HomePage.tsx` (`loadCurrentSession`, `create`, `update`, `saveErrorMessage`), `src/lib/api-client.ts`
  (`ApiClientError`), `docs/architecture.md` (API table and error codes), `shared/contracts.ts`.
- ADRs this task follows: [0001](../docs/adr/0001-telegram-mini-app-on-vercel-and-supabase.md), [0002](../docs/adr/0002-pseudonymous-identity.md) (server-side
  `initData` verification is unchanged). Replaces none.
- Dependencies and decisions already made: none outstanding. The API and the static bundle deploy together; an old bundle left open
  in a user's Telegram that still treats 401 as "no survey" is harmless, since a missing survey is then simply a 404 it shows as a
  load error with the existing retry (task 063 adds an in-page button). No migration. Tasks 029, 033 and 041 that touch `HomePage` are `Done`.

## Scope

- In scope: the server change and its tests; the client handling of 404, 401 and 409; the session-expired state and its copy in five
  locales; the error documentation in `docs/architecture.md`.
- Out of scope: refreshing `initData` in the background, changing the 24-hour validity, the retry and timeout behavior (task 063), the
  holder-report endpoints, the statistics endpoints.
- Files or directories assigned to this task: `api/responses/current.ts` and its test, `api/responses.ts` and its test, `src/pages/HomePage.tsx`,
  `src/pages/home-page.test.tsx`, `src/lib/api-client.ts` and its test, `src/i18n/*`, `docs/architecture.md`.

## Acceptance scenarios

| ID | Given / when | Expected result | Planned verification |
| --- | --- | --- | --- |
| A1 | `POST /api/responses/current` for an account with no survey | 404 with code `PROFILE_NOT_FOUND` | `api/responses/current.test.ts` |
| A2 | The same with a missing, malformed, wrong-signature or older-than-24h `initData` | 401 `UNAUTHORIZED` | `api/responses/current.test.ts` |
| A3 | The client gets 404 `PROFILE_NOT_FOUND` on load | The start screen (create flow) opens | `home-page.test.tsx` |
| A4 | The client gets 401 on load | The session-expired state shows with `Открыть заново`; the wizard does not open; pressing the button reloads the page | `home-page.test.tsx` |
| A5 | Create returns 409 `PROFILE_EXISTS` | The current survey loads, the dashboard shows with the `already saved` line, and the draft is cleared | `home-page.test.tsx` |
| A6 | Update or create returns 401 | The session-expired state shows; the generic save error does not | `home-page.test.tsx` |
| A7 | Other errors (500, network) on load | The existing load error with retry, unchanged | Existing tests pass |
| A8 | `docs/architecture.md` | The current-survey endpoint lists 404 `PROFILE_NOT_FOUND` and 401 meaning | Reviewer read |
| A9 | Five locales | New keys exist in all five; glossary tests pass | `src/i18n/locales.test.ts`, `src/i18n/glossary.test.ts` |

## Must stay unchanged

- Behavior, contracts, or user-facing copy this task must not alter: `initData` verification and its 24-hour window, the Origin
  check, the create and update contracts, the draft autosave, the edit-limit message, the first-time flow for a real new user.
- Existing checks that already cover it: `api/responses.test.ts`, `api/_lib/api-stack.test.ts`, `src/pages/home-page.test.tsx`,
  `shared/api-contracts.test.ts`.

## Open decisions

- None.

## Verification

- `npm test -- api src/pages src/lib/api-client shared src/i18n` → A1–A7, A9
- `make check`
- Reviewer read of `docs/architecture.md` → A8

## Handoff

| Scenario | Evidence (command, test assertion, or manual check) | Result |
| --- | --- | --- |
| A1 | `api/responses.test.ts` › `POST /api/responses/current` › `answers 404 PROFILE_NOT_FOUND when the account has no survey…` (the current-endpoint tests live in `api/responses.test.ts`; there is no `current.test.ts`) | Pass |
| A2 | `api/responses.test.ts` › `Telegram authentication failures stay 401 UNAUTHORIZED` (`it.each`: missing, malformed, wrong signature, older than 24h; also asserts no RPC call) | Pass |
| A3 | `home-page.test.tsx` › `opens the start screen on 404 PROFILE_NOT_FOUND (A3)`; the older no-survey tests now mock 404 | Pass |
| A4 | `home-page.test.tsx` › `shows the session-expired state on a 401 load…`: alert text, no start screen, Settings button present, button calls `window.location.reload` | Pass |
| A5 | `home-page.test.tsx` › `loads the saved survey and clears the draft when create returns 409 PROFILE_EXISTS (A5)`: `already saved` line, dashboard, no draft key left in localStorage | Pass |
| A6 | `home-page.test.tsx` › two tests, create 401 and update 401: session-expired text shown, `form.saveError` / `home.actionError` absent | Pass |
| A7 | Existing `shows the load error alert and hint when the current survey request fails` (500) unchanged and passing | Pass |
| A8 | `docs/architecture.md` API table row for `/api/responses/current` now lists 404 `PROFILE_NOT_FOUND` and the 401 meaning; needs reviewer read | Done, not reviewed |
| A9 | `npm test -- api src/pages src/lib/api-client shared src/i18n` (`locales.test.ts`, `glossary.test.ts`): 34 files, 406 tests pass; keys `home.sessionExpired`, `home.sessionExpiredAction`, `home.alreadySaved` in pl, en, ru, uk, be | Pass |

- Changed files: `api/responses/current.ts`, `api/responses.test.ts`, `src/pages/HomePage.tsx`, `src/pages/home-page.test.tsx`, `src/i18n/{pl,en,ru,uk,be}.ts`, `src/bootstrap.test.tsx` (one mock), `docs/architecture.md`, this brief (Status and Handoff only). Also unchanged but worth knowing: `src/lib/api-client.ts` needed no change, so it has no test change.
- Checks not run, blockers, or open questions: `make check` passes (68 files, 703 tests, typecheck clean). `src/bootstrap.test.tsx` mocked 401 as "no survey"; at the maintainer's request I changed that one mock to 404 `PROFILE_NOT_FOUND` (outside the assigned files, by explicit permission). Not run: browser check in a Telegram client or `make dev` (no permission asked), `npm run test:db:pglite` (no SQL changed). The `docs/architecture.md` changelog got no entry (no migration). The draft is kept on a create 401 so a reload restores it.
- LLM contributions: Claude Sonnet 5.5 (Claude Code): specification; the defect was found by a read-only audit by a Claude research subagent and confirmed by reading `api/responses/current.ts` and `HomePage.tsx`. Implementation: Claude Sonnet 5.5 (Claude Code), as implementation agent at the maintainer's explicit request for this session. Review: not yet done.
