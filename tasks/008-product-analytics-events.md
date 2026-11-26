# 008 — Product analytics: funnel and feature events, deleted with the survey

**Status:** In review

## Goal

The product records four events and cannot tell how many visitors start the survey, where they leave, or which dashboard and settings features are used. Add a small set of named events that cover the new-user funnel and the main features, document every event in one catalogue, and delete a user's events when they delete their survey ([ADR 0011](../docs/adr/0011-documented-product-events-deleted-with-survey.md)).

Intended behavior:

- New events, each recorded through the existing `trackProductEvent` (fire-and-forget, name only, no payload):

  | Event | Recorded when | At most |
  | --- | --- | --- |
  | `landing_viewed` | The start screen is shown in `create` mode | once per mount of the start screen |
  | `wizard_education_completed` | The user presses Next on the Education step of the **new-survey** wizard and the step is valid, so the Grades step opens | once per mount of the create flow |
  | `what_if_used` | The user first changes the what-if value on the dashboard (drag of the ruler or a valid typed value that differs from the saved average) | once per mount of the dashboard |
  | `survey_updated` | Saving an edit (`PUT /api/responses`) succeeds | once per successful save |
  | `reminders_link_opened` | The user taps Settings → "Reminders in the bot" | once per tap |
  | `invite_link_opened` | The user taps Settings → "Invite people from my country" | once per tap |

- The existing events keep their names and their current trigger points: `wizard_started`, `wizard_completed`, `score_viewed`, `position_or_fallback_viewed`.
- The edit wizard records no step events and no `wizard_started` / `wizard_completed`; an edit is counted only by `survey_updated`.
- A resumed draft that opens directly on the Grades step does not record `wizard_education_completed`.
- `DELETE /api/responses` also deletes every `product_events` row with the caller's `identity_hash`, in the same request as the responses and the bot subscription. If deleting the events fails, the request fails through the existing error helpers, like a failure to delete the responses. The response codes stay as today (200 when a survey was deleted, 404 when none existed); the events are deleted in both cases.
- `docs/architecture.md` gets a **Product events** catalogue: one row per event (all ten), with the name, the exact trigger, the frequency limit and the file that records it. The "Stored" paragraph says events are deleted with the survey.

## Context

- Relevant code and docs: `shared/validation.ts:261` (`productEventNames`, `productEventRequestSchema`), `src/lib/product-events.ts`, `api/product-events.ts`, `src/features/CreateProfileFlow.tsx` (`startWizard`, `goWizardNext`, `handleSubmit`), `src/features/StartScreen.tsx`, `src/features/ProfileDashboard.tsx` (edit wizard and `onSubmit`), `src/pages/HomePage.tsx` (`create` / `update`), `src/features/score/ScoreScreen.tsx` (what-if block), `src/features/statistics/StatisticsPanel.tsx:46` (once-per-mount pattern with a `useRef` set), `src/components/settings/MainMenu.tsx:60`, `api/responses.ts:47` (`deleteProfile`), `docs/architecture.md:85`.
- ADRs this task follows: [0002](../docs/adr/0002-pseudonymous-identity.md), [0008](../docs/adr/0008-refocus-on-score-comparison.md), [0011](../docs/adr/0011-documented-product-events-deleted-with-survey.md). Replaces none.
- Dependencies and decisions already made:
  - The maintainer approved the analytics, chose to delete events with the survey, and asked for every step to be documented precisely (2026-11-22). Per ADR 0011, a step is a distinct event name, not a payload.
  - `product_events.event_name` has no database constraint and the service role can delete from the table, so no migration is needed.
  - The bot subscription itself happens in the bot, outside the Mini App; the app records only that the link was opened.

## Scope

- In scope:
  - Add the six names to `productEventNames`; the client type follows from it.
  - Record each event at the trigger in the table above, using the once-per-mount pattern where the table says so.
  - Delete the caller's `product_events` rows in `deleteProfile`; update its doc comment.
  - Tests listed under Verification.
  - The catalogue and the "Stored" paragraph in `docs/architecture.md`; one line in the `docs/product-flow.md` changelog.
- Out of scope: payloads of any kind, renaming existing events, dashboards or SQL views over the events, retention or expiry of events, events from the bot, any copy change, the invite prompt on the result card.
- Files or directories assigned to this task: `shared/validation.ts`, `src/lib/product-events.ts`, `src/features/StartScreen.tsx`, `src/features/CreateProfileFlow.tsx`, `src/features/ProfileDashboard.tsx`, `src/features/score/ScoreScreen.tsx`, `src/components/settings/MainMenu.tsx`, `api/responses.ts`, and their tests; `api/product-events.test.ts`; `docs/architecture.md`, `docs/product-flow.md`.

## Acceptance scenarios

| ID | Given / when | Expected result | Planned verification |
| --- | --- | --- | --- |
| A1 | A user without a survey opens the app; the start screen re-renders several times | `landing_viewed` is sent exactly once | StartScreen test with mocked `trackProductEvent` |
| A2 | In the new-survey wizard the user presses Next on a valid Education step | `wizard_education_completed` is sent once; pressing Back and Next again does not send it a second time | CreateProfileFlow / home-page test |
| A3 | The Education step is invalid and the user presses Next | No `wizard_education_completed` | Same test file |
| A4 | A resumed draft opens on the Grades step and the user saves | `wizard_completed` is sent, `wizard_education_completed` is not | Same test file |
| A5 | A returning user drags the what-if ruler several times, or types a new valid average | `what_if_used` is sent exactly once per dashboard mount; typing an invalid value or the saved average sends nothing | ScoreScreen test |
| A6 | A returning user edits the survey and the save succeeds; another save fails | One `survey_updated` for the success, none for the failure; no `wizard_started`, `wizard_education_completed` or `wizard_completed` during the edit | ProfileDashboard / home-page test |
| A7 | The user taps Settings → Reminders, then Settings → Invite | `reminders_link_opened` and `invite_link_opened` are each sent once per tap, and the Telegram links still open as before | MainMenu / settings test |
| A8 | `POST /api/product-events` with each of the ten names, and with an unknown name or any extra field | 200 for the ten names; 400 for the others, nothing inserted | `api/product-events.test.ts` |
| A9 | `DELETE /api/responses` for a user who has a survey and events | Responses, bot subscription and that user's events are deleted; another user's events remain; 200 | `api/responses.test.ts` with a fake client |
| A10 | `DELETE /api/responses` for a user with events but no survey | Events are deleted; response is 404 as today | `api/responses.test.ts` |
| A11 | Deleting the events fails | The request returns an error through the existing helpers, not 200 | `api/responses.test.ts` |
| A12 | The catalogue | `docs/architecture.md` lists all ten names with trigger, frequency and recording file, and every name in `productEventNames` appears in it | Reviewer check; optional unit test that reads both |

## Must stay unchanged

- Behavior, contracts, or user-facing copy this task must not alter:
  - `productEventRequestSchema` stays `{ eventName }` with `.strict()`; no payload is ever sent;
  - the names and trigger points of the four existing events;
  - analytics never block or break the UI (`trackProductEvent` swallows errors; no `initData` → nothing sent);
  - `DELETE /api/responses` status codes and response body; deletion of responses and the bot subscription;
  - server-side `initData` verification and same-origin checks on `/api/product-events` and `/api/responses`;
  - no raw Telegram ID in `product_events`.
- Existing checks that already cover it: `api/product-events.test.ts`, `api/responses.test.ts`, `src/features/statistics/statistics-panel.test.tsx`, `src/pages/home-page.test.tsx`, `src/features/StartScreen.test.tsx`, `src/features/ProfileDashboard.test.tsx`, `src/features/score/score-screen.test.tsx`.

## Open decisions

- None.

## Verification

- `npm test -- src/features/StartScreen.test.tsx src/pages/home-page.test.tsx src/features/ProfileDashboard.test.tsx src/features/score/score-screen.test.tsx` → A1–A6
- `npm test -- <settings menu test file>` → A7
- `npm test -- api/product-events.test.ts api/responses.test.ts` → A8–A11
- `make check`
- Reviewer: compare `productEventNames` with the catalogue in `docs/architecture.md` → A12
- Manual (optional, local fixtures, `make dev` after checking ports 3000/3001 and `.env.local`): go through start → Education → Grades → dashboard → what-if → Settings → delete, and check the `product_events` rows in the local database at each step and after the delete. → A1–A10

## Handoff

| Scenario | Evidence (command, test assertion, or manual check) | Result |
| --- | --- | --- |
| A1 | `npm test -- src/features/StartScreen.test.tsx` → `records landing_viewed once per mount of the start screen` | pass |
| A2 | `npm test -- src/pages/home-page.test.tsx` → `records wizard_education_completed once when a valid education step opens grades` | pass |
| A3 | `npm test -- src/pages/home-page.test.tsx` → `records no wizard_education_completed while the education step is invalid` | pass |
| A4 | `npm test -- src/pages/home-page.test.tsx` → `resumes on grades without wizard_education_completed and counts the save as wizard_completed` | pass |
| A5 | `npm test -- src/features/score/score-screen.test.tsx` → `records what_if_used once per dashboard mount and ignores invalid or unchanged values` and `counts several ruler steps as one what-if use per dashboard mount` | pass |
| A6 | `npm test -- src/features/ProfileDashboard.test.tsx` → `records survey_updated on a successful edit and no wizard events` and `records no survey_updated when the edit save fails` | pass |
| A7 | `npm test -- src/components/SettingsSheet.test.tsx` → `records the settings link events and still opens the Telegram links` | pass |
| A8 | `npm test -- api/product-events.test.ts` → `accepts the documented event <name>` (all ten names) and the `rejects …` cases including `an extra field on a documented event` | pass |
| A9 | `npm test -- api/responses.test.ts` → `deletes responses, product events and the bot subscription, and leaves another user alone` | pass |
| A10 | `npm test -- api/responses.test.ts` → `deletes product events even when no survey exists, and still answers 404` | pass |
| A11 | `npm test -- api/responses.test.ts` → `fails the delete when removing the product events fails` | pass |
| A12 | `npm test -- api/product-events.test.ts` → `documents every accepted event name in the architecture catalogue`; the `Product events` table in `docs/architecture.md` lists all ten names with trigger, frequency and recording file | pass |

- Changed files: `shared/validation.ts`, `src/lib/product-events.ts` (comment only), `src/features/StartScreen.tsx`, `src/features/CreateProfileFlow.tsx`, `src/features/ProfileDashboard.tsx`, `src/features/score/ScoreScreen.tsx`, `src/components/settings/MainMenu.tsx`, `api/responses.ts`, tests in `src/features/StartScreen.test.tsx`, `src/pages/home-page.test.tsx`, `src/features/ProfileDashboard.test.tsx`, `src/features/score/score-screen.test.tsx`, `src/components/SettingsSheet.test.tsx`, `api/product-events.test.ts`, `api/responses.test.ts`; `docs/architecture.md`, `docs/product-flow.md`, this brief.
- Checks not run, blockers, or open questions: `make check` passed (443 tests, typecheck). No migration, so the database suites were not needed. The optional local end-to-end walk through `make dev` was not run; the event triggers and deletion are covered by the unit/API tests above. No blockers.
- LLM contributions: Claude Opus 5.5 (Claude Code) — specification of this brief and [ADR 0011](../docs/adr/0011-documented-product-events-deleted-with-survey.md); DeepSeek V4.1 Flash (OpenCode) — implementation, tests, and the architecture catalogue.
