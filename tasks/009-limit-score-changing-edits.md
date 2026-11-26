# 009 — Limit score-changing saves to three in 24 hours

**Status:** In review

## Goal

Implement [ADR 0013](../docs/adr/0013-limit-on-score-changing-edits.md): one account can no longer keep moving its own score to drag a small cohort's distribution.

Intended behavior:

- **What counts.** A save whose new `nawa_orientation_score` differs from the stored one counts. A save that leaves the score unchanged (for example only `gradeBasis` or the school country) does not count and is never blocked.
- **The trail.** Every save that sets a score is recorded in a new table `score_change_log (identity_hash, saved_at, counted boolean)`, not linked to `responses`, so deleting the survey does not delete it. No other column: no score, no country, no intake year.
- **Creating a survey.**
  - If the trail holds no row of this `identity_hash` from the last 24 hours, the create is the first one: it is recorded with `counted = false` and never blocked.
  - If the trail holds any row from the last 24 hours (the survey was deleted and is being created again), the create counts like an edit: it is blocked when three counted rows already exist, otherwise recorded with `counted = true`.
- **Editing.** A score-changing `PUT` is blocked when the trail holds three `counted` rows of this identity from the last 24 hours (rolling window, `saved_at > now() - interval '24 hours'`); otherwise the update is applied and a counted row is recorded, in the same transaction.
- **Blocked save.** Nothing is written. The API answers **429** with code `EDIT_LIMIT_REACHED` and `retryAt`: the time the oldest counted row of the window turns 24 hours old (ISO 8601, UTC). The client shows a localized message with that time in the user's local time (for example ru: `Балл можно менять не больше трёх раз за сутки. Следующее изменение — после 14:05.`; if `retryAt` is not today, include the date). What the user typed stays in the form (edit) or in the saved draft (create).
- **Erasure.** Rows older than 24 hours are deleted by `public.purge_score_change_log()`, scheduled **hourly with pg_cron** in Supabase. Expired rows never count even before they are erased (the window check above). Worst-case physical retention is about 25 hours.
- **The what-if ruler** is not affected; it never saves.
- **Privacy copy** in all five locales gets one new point in `privacyNotice.points`, after "you can delete everything": after a deletion, for about a day, only the account code and the times of the last score changes are kept, so the limit cannot be bypassed. ru: `После удаления анкеты около суток хранится только код аккаунта и время последних изменений балла — чтобы ограничение на изменения нельзя было обойти.` Other locales: natural equivalents following [ADR 0010](../docs/adr/0010-locale-glossary-and-english-api-errors.md).

## Context

- Relevant code and docs: `supabase/migrations/202611260001_study_field_and_prep_city.sql` (latest `create_response_for_identity`, `update_current_response`, 17-argument signatures, `p_identity_hash`, `nawa_orientation_score`), `api/responses.ts` (POST/PUT handlers, `assertCreateSucceeded`), `api/_lib/errors.ts`, `api/_lib/questionnaire.ts` (`assertRpcSucceeded`), `shared/contracts.ts` (`ApiError`), `shared/validation.ts` (`apiErrorSchema`), `src/lib/api-client.ts` (`ApiClientError`), `src/pages/HomePage.tsx` (`create`, `update`, `actionError`), `src/features/CreateProfileFlow.tsx`, `src/features/ProfileDashboard.tsx`, `src/i18n/*.ts` (`privacyNotice`, `form.saveError*`, `home.actionError`), `docs/architecture.md` (RPCs, Security and privacy, changelog).
- ADRs this task follows: [0002](../docs/adr/0002-pseudonymous-identity.md), [0010](../docs/adr/0010-locale-glossary-and-english-api-errors.md), [0011](../docs/adr/0011-documented-product-events-deleted-with-survey.md), [0013](../docs/adr/0013-limit-on-score-changing-edits.md). Replaces none.
- Dependencies and decisions already made:
  - The maintainer chose 3 saves per rolling 24 hours, keeping the trail after deletion for about a day, and hourly erasure with pg_cron in Supabase (2026-11-22).
  - Recording the first create with `counted = false` is how "creating the first survey does not count" and "a survey created again within that time counts" are both implemented.
  - pg_cron is not available in PGlite and may be missing in the CI PostgreSQL image. The migration enables it and schedules the job only when `pg_available_extensions` lists it; the purge function itself is tested directly.
  - Task [010](010-flag-per-country-spikes.md) also redefines `create_response_for_identity` and must be merged after this task.

## Scope

- In scope:
  - Migration `supabase/migrations/202611280001_score_change_limit.sql`: the `score_change_log` table (service role only, index on `(identity_hash, saved_at)`); `create or replace` of both write RPCs with the same signatures, enforcing the rules above under a lock that prevents two parallel saves from both passing (row lock for updates, `pg_advisory_xact_lock` on the identity hash for creates); a distinct error (`edit_limit_reached`) that carries the retry time; `purge_score_change_log()`; conditional `create extension pg_cron` and an hourly `cron.schedule`.
  - API: map `edit_limit_reached` to 429 `EDIT_LIMIT_REACHED` with `retryAt`; extend `ApiError` and its schema with an optional `retryAt` (ISO string) used only by this code. The English message follows ADR 0010.
  - Client: surface the localized message on create and edit, keep the user's input; parse `retryAt` from `ApiClientError`.
  - Privacy point in five locales; locale parity stays green.
  - `docs/architecture.md`: the table, the rule, the pg_cron job and how to check it after deploy (`select * from cron.job`), the Stored paragraph, a changelog entry. One line in the `docs/product-flow.md` changelog.
- Out of scope: per-country spike flags (task 010), any change to what deletion removes besides keeping the trail, rate limits on other endpoints, admin tooling, applying the migration to a remote database.
- Files or directories assigned to this task: `supabase/migrations/202611280001_score_change_limit.sql`, `supabase/tests/` (new `score_change_limit.sql`), `supabase/tests/migration-contracts.test.ts` if signatures are pinned there, `api/responses.ts`, `api/responses.test.ts`, `api/_lib/errors.ts`, `shared/contracts.ts`, `shared/validation.ts`, `shared/api-contracts.test.ts`, `src/lib/api-client.ts`, `src/pages/HomePage.tsx`, `src/features/CreateProfileFlow.tsx`, `src/features/ProfileDashboard.tsx`, their tests, `src/i18n/*.ts`, `docs/architecture.md`, `docs/product-flow.md`.

## Acceptance scenarios

| ID | Given / when | Expected result | Planned verification |
| --- | --- | --- | --- |
| A1 | A new account creates its first survey | Saved; one trail row with `counted = false` | SQL test |
| A2 | Three score-changing edits within 24 hours, then a fourth | The first three succeed; the fourth raises `edit_limit_reached` with a retry time equal to the first edit's `saved_at` + 24 h; the survey keeps the third edit's values | SQL test |
| A3 | Edits that do not change the score, any number of times, also after the limit is reached | All succeed; no trail rows are added | SQL test |
| A4 | The oldest counted row is older than 24 hours (fixture with a back-dated `saved_at`) | A fourth edit succeeds | SQL test |
| A5 | The user deletes the survey after three counted edits and creates it again within 24 hours | The create is blocked with `edit_limit_reached`; after deletion the trail rows still exist | SQL test + `api/responses.test.ts` (DELETE does not touch the trail) |
| A6 | The user creates, deletes without editing, and creates again | The second create succeeds with `counted = true`; after two more such cycles the next create is blocked | SQL test |
| A7 | Two parallel score-changing edits when two counted rows exist | Exactly one succeeds | SQL test with two sessions if the harness allows, otherwise a reviewer check of the lock in the migration |
| A8 | `purge_score_change_log()` runs | Rows older than 24 h are gone, newer rows stay; with pg_cron available the job is scheduled hourly | SQL test for the function; manual `select * from cron.job` after deploy |
| A9 | `PUT` or `POST /api/responses` when the RPC reports the limit | 429, `{ error: { code: 'EDIT_LIMIT_REACHED', message, retryAt } }`, schema-valid | `api/responses.test.ts`, `shared/api-contracts.test.ts` |
| A10 | Edit blocked in the app | The localized message with the local time (and date when not today) appears; the edit form keeps the typed values; no `survey_updated` event | ProfileDashboard / home-page test |
| A11 | Re-create blocked in the app | The message appears; the draft stays on the device; no `wizard_completed` event | CreateProfileFlow / home-page test |
| A12 | Privacy notice | The new point exists in all five locales; locale parity passes | `npm test -- src/i18n` |
| A13 | What-if ruler on a blocked account | Works as before; nothing is sent to `/api/responses` | Existing score-screen test still passes; reviewer check |

## Must stay unchanged

- Behavior, contracts, or user-facing copy this task must not alter:
  - signatures and return shapes of `create_response_for_identity` and `update_current_response`; `profile_exists` → 409;
  - statistics, the cohort floor and the ladder;
  - DELETE still removes responses, events and the bot subscription, with the same status codes;
  - server-side `initData` verification and same-origin checks;
  - no raw Telegram ID and no score value in the trail.
- Existing checks that already cover it: `api/responses.test.ts`, `api/_lib/api-stack.test.ts`, `supabase/tests/privacy_identity.sql`, `supabase/tests/statistics.sql`, `supabase/tests/migration-contracts.test.ts`, `src/pages/home-page.test.tsx`.

## Open decisions

- None.

## Verification

- `npm run test:db:pglite` → A1–A8 (function part of A8); CI runs pgTAP
- `npm test -- api/responses.test.ts shared/api-contracts.test.ts` → A5 (API), A9
- `npm test -- src/pages/home-page.test.tsx src/features/ProfileDashboard.test.tsx src/features/score/score-screen.test.tsx src/i18n` → A10–A13
- `make check`
- After deploy, by the maintainer: `select jobname, schedule from cron.job` shows the hourly purge → A8

## Handoff

| Scenario | Evidence (command, test assertion, or manual check) | Result |
| --- | --- | --- |
| A1 | `npm run test:db:pglite` → `supabase/tests/score_change_limit.sql`: "A1: a new account can create its first survey" and "A1: the first create leaves one uncounted trail row" (`[{"counted": false}]`) | pass |
| A2 | Same run: "A2: the fourth score-changing edit in the window is blocked", "A2: the retry time is the oldest counted row plus 24 hours", "A2: the blocked edit keeps the third edit values" | pass |
| A3 | Same run: "A3: any number of edits that leave the score unchanged succeed", "A3: unchanged-score edits add no trail rows", "A3: an unchanged-score edit still succeeds after the limit is reached", "A3: an unchanged-score edit adds no trail row after the limit" | pass |
| A4 | Same run: "A4: a fourth edit succeeds when the oldest counted row is older than 24 hours" and "A4: the edit that fits the window is applied" | pass |
| A5 | Same run: "A5: deleting the survey keeps the trail rows", "A5: creating the survey again inside the window is blocked", "A5: the blocked create writes no trail row". `npm test -- api/responses.test.ts` → "DELETE /api/responses > deletes responses, product events and the bot subscription, and leaves another user alone" asserts `fake.tables.score_change_log` is unchanged | pass |
| A6 | Same SQL run: "A6: a survey created again inside the window records a counted row" and "A6: the next create is blocked after three counted re-creates" | pass |
| A7 | No two-session harness in PGlite (single connection). Reviewer check: migration lines `perform pg_advisory_xact_lock(hashtextextended(p_identity_hash, 3));` (create) and `for update` before the count (update); pinned by `npm test -- supabase/tests/migration-contracts.test.ts` → "redefines both write RPCs with the same signatures and the shared limit rule" | pass (reviewer check) |
| A8 | Same SQL run: "A8: the purge deletes expired rows", "A8: rows older than 24 hours are gone after the purge", "A8: rows newer than 24 hours stay after the purge". Hourly scheduling is conditional in the migration; after deploy the maintainer runs `select jobname, schedule from cron.job` (not run here) | pass (function); scheduled job not verified |
| A9 | `npm test -- api/responses.test.ts shared/api-contracts.test.ts` → POST and PUT tests "returns 429 EDIT_LIMIT_REACHED with the retry time when the limit blocks a create/an edit", plus "accepts the score-change limit error with an optional ISO retry time" | pass |
| A10 | `npm test -- src/pages/home-page.test.tsx` → "shows the localized score-change limit and keeps the edit values when an edit is blocked" (alert, average still `4.8`, no `survey_updated`) and "includes the date in the score-change limit when the retry time is not today"; `ProfileDashboard.test.tsx` suite still green | pass |
| A11 | Same run: "shows the score-change limit when a re-create is blocked and keeps the draft on the device" (alert, average still `4.5`, no `wizard_completed`, local draft contains `averageGrade: 4.5`) | pass |
| A12 | `npm test -- src/i18n` → "explains the score-change trail right after the delete-everything point" for pl/en/ru/uk/be, and the key-parity plus glossary suites are green | pass |
| A13 | `npm test -- src/features/score/score-screen.test.tsx` (16 tests) and `home-page.test.tsx` → "previews a different average on the tape without saving it or moving the saved result" asserts `api.updateResponse` was not called | pass |

- Changed files: `supabase/migrations/202611280001_score_change_limit.sql`; `supabase/tests/score_change_limit.sql`; `supabase/tests/test-files.mjs`; `supabase/tests/migration-contracts.test.ts`; `api/_lib/errors.ts`; `api/_lib/questionnaire.ts`; `api/responses.ts`; `api/responses.test.ts`; `shared/contracts.ts`; `shared/validation.ts`; `shared/api-contracts.test.ts`; `src/lib/api-client.ts`; `src/lib/api-client.test.ts`; `src/pages/HomePage.tsx`; `src/pages/home-page.test.tsx`; `src/features/CreateProfileFlow.tsx`; `src/features/ProfileDashboard.tsx`; `src/i18n/{pl,en,ru,uk,be}.ts`; `src/i18n/locales.test.ts`; `docs/architecture.md`; `docs/product-flow.md`.
- Checks not run, blockers, or open questions: `make check` is left to the orchestrator after both concurrent tasks finish. The PostgreSQL/pgTAP CI suite was not run locally (no Docker). The two-session concurrency assertion has no PGlite harness; the lock was reviewed statically and pinned by the migration-contract test. The deployed `cron.job` check is manual after deploy. No blockers.
- LLM contributions: Claude Opus 5.5 (Claude Code) — specification of this brief and [ADR 0013](../docs/adr/0013-limit-on-score-changing-edits.md). DeepSeek V4.1 Flash — implementation.
