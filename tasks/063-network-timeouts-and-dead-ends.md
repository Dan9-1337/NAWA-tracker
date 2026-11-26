# 063 — No dead ends: timeouts, honest errors, an in-page retry, a safety net

**Status:** Ready

## Goal

Make every network failure end in a screen the user can act on. Found by reading the code (not yet reproduced in a Telegram
client):

- `request()` in `src/lib/api-client.ts` has no timeout or abort. On a slow or dropped connection the skeleton shows forever and a
  hung save keeps the Telegram main button spinning.
- Save errors collapse into one string: offline, a 400 and a 500 all read `Не удалось сохранить`.
- The load-error screen has no title controls and its only retry is the native main button; if that button is not drawn, the user
  is stuck. The Settings gear is missing in the loading state, so there is no language switch there.
- There is no error boundary: a render exception gives a blank screen. `saveWizardSession` and the locale write call `localStorage`
  without a guard.

Intended behavior:

1. Every request aborts after **12 seconds** and fails with `ApiClientError(0, 'TIMEOUT')`. When the browser is offline
   (`navigator.onLine === false`) a request fails at once with `ApiClientError(0, 'OFFLINE')`.
2. Messages by cause, in the user's language: offline `Нет соединения. Проверьте интернет и повторите.`; timeout `Медленное
   соединение. Попробуйте ещё раз.`; any other save failure keeps the current generic text; 401 and 409 are task 062's. The main
   button is disabled while offline and enables when the `online` event fires.
3. The load-error screen has an in-page `Повторить` button in addition to the native main button, and the header keeps the Settings
   button in the loading and error states.
4. A top-level error boundary in `App.tsx` shows `Что-то пошло не так` with a `Перезагрузить` button (page reload) instead of a
   blank screen.
5. Every `localStorage` and `sessionStorage` read or write in `src/lib/draft.ts` and the locale and theme code is wrapped so a throw
   (private mode, blocked storage) falls back to in-memory behavior and never breaks rendering.

## Context

- Relevant code and docs: `src/lib/api-client.ts` (`request`, `ApiClientError`), `src/pages/HomePage.tsx` (`saveErrorMessage`,
  the loading and error branches, `useMiniAppChrome`), `src/App.tsx`, `src/lib/draft.ts` (`saveWizardSession`),
  `src/i18n/context.tsx` (locale persistence), `src/lib/useOnlineStatus.ts`, `src/components/MiniAppShell.tsx`.
- ADRs this task follows: none. Replaces none.
- Dependencies and decisions already made: tasks 047 (statistics retry) and 062 (session errors) are `Done` first; both edit
  `HomePage.tsx`. The 12-second limit is a reasonable default chosen by the task author; the implementer states if a lower or
  higher number is needed for the slowest local fixture.

## Scope

- In scope: the abort and offline handling in `request`; the cause-specific messages and the disabled main button while
  offline; the in-page retry and Settings button on the load screens; the error boundary; the storage guards; five locales; tests.
- Out of scope: automatic background retries, caching, a service worker, 401 and 409 handling (task 062), the statistics retry
  button (task 047).
- Files or directories assigned to this task: `src/lib/api-client.ts` and its test, `src/pages/HomePage.tsx` and its test, `src/App.tsx`,
  `src/lib/draft.ts` and its test, `src/i18n/context.tsx`, `src/lib/theme.ts` only for storage guards, `src/components/MiniAppShell.tsx`,
  `src/i18n/*`.

## Acceptance scenarios

| ID | Given / when | Expected result | Planned verification |
| --- | --- | --- | --- |
| A1 | A request that never answers (fake timers advance 12 s) | It rejects with `ApiClientError` code `TIMEOUT`; no pending state is left behind | `api-client.test.ts` |
| A2 | `navigator.onLine` is false | The request rejects at once with code `OFFLINE`, with no network call | `api-client.test.ts` |
| A3 | A save fails with `OFFLINE`, then with `TIMEOUT`, then with a 500 | The action error text is the offline, the slow-connection and the generic text respectively | `home-page.test.tsx` |
| A4 | The device is offline on the create or edit screen | The native main button is disabled; the `online` event enables it again | `home-page.test.tsx` |
| A5 | The first load fails | An in-page `Повторить` button and the Settings button are in the document; pressing the button reloads the survey | `home-page.test.tsx` |
| A6 | A child component throws while rendering | The boundary shows `Что-то пошло не так` and `Перезагрузить`; the page is not blank | `src/App.test.tsx` (new) |
| A7 | `localStorage.setItem` throws on a draft save and on a locale change | The app keeps working; the draft lives in memory for the session; no unhandled exception | `draft.test.ts`, `src/i18n` test |
| A8 | Five locales | New keys exist in all five; glossary tests pass | `src/i18n/locales.test.ts`, `src/i18n/glossary.test.ts` |

## Must stay unchanged

- Behavior, contracts, or user-facing copy this task must not alter: the API requests and responses, the draft format, the
  edit-limit and validation messages, the double-submit guards (`useGuardedSubmit`, `useRequestGuard`), the first-time flow.
- Existing checks that already cover it: `src/lib/api-client.test.ts`, `src/pages/home-page.test.tsx`, `src/lib/draft.test.ts`,
  `src/lib/useGuardedSubmit.test.tsx`, `src/lib/useRequestGuard.test.tsx`.

## Open decisions

- None.

## Verification

- `npm test -- src/lib src/pages src/App src/i18n` → A1–A8
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
| A7 | | |
| A8 | | |

- Changed files:
- Checks not run, blockers, or open questions:
- LLM contributions: Claude Sonnet 5.5 (Claude Code): specification; the findings came from a read-only audit by a Claude research subagent. Implementation and review: not yet done.
