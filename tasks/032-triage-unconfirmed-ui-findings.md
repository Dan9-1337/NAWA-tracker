# 032 — Triage of UI findings that need a decision or a reproduction

**Status:** Draft

## Goal

The Chrome pass of 2026-11-26 (tasks 026 to 031 cover the confirmed, decided defects) also left findings that
are **not ready to implement**: they need a maintainer decision, a reproduction, or they belong to another task. This brief
keeps them in one place so they are not lost. It is not an implementation task: each row ends as a new brief, a line added
to an existing one, or "won't fix", and then this brief is `Done`.

## Context

- Relevant code and docs: see each row.
- ADRs this task follows: none. Replaces none.
- Dependencies and decisions already made: none. Rows 1 and 2 need a reproduction first; rows 3, 5 and 6 need a
  maintainer decision; row 4 goes to task 025.

## Scope

- In scope: recording the answer for each row below and, where the answer is "fix", writing the follow-up brief.
- Out of scope: changing code, copy or docs in this task.
- Files or directories assigned to this task: this brief only.

## Findings

| # | What was seen | Where | Why it is not ready | Question or next step |
| --- | --- | --- | --- | --- |
| 1 | Scrolling the page with the mouse wheel while the pointer was over the ruler changed the simulated average (10,5 → 11,1). | `src/components/ScoreTape.tsx`, the what-if block | Not reproduced twice. The code has no wheel handler: `ScoreTape` listens only to pointer and key events (lines 92-96), and nothing in `src/` handles `wheel`. So it is not a deliberate shortcut; it may be a trackpad or pointer-drag artefact of the test | Reproduce first (mouse wheel and trackpad). If it reproduces, write a bug brief: the wheel should scroll the page and not change the value, unless the maintainer wants a wheel shortcut. If not, close. |
| 2 | The accessibility tree lists the Polish-school and other radio inputs by their values (`school_leaver`, `half_year`, `preparatory_course`) instead of their text. | `src/components/RadioOption.tsx` (the input is wrapped by its `<label>`) | The wrapping label should name the input; this may be an artefact of the inspection tool | Check with a real screen reader or the browser's accessibility panel. If the name is wrong, write a brief; if not, close. |
| 3 | The lowest place reads "Выше, чем у 0% группы" (rank 18 of 18). | `dashboard.position.percentileLine` in `src/i18n/*.ts`, `DetailedPosition` in `src/features/dashboard/ResultHeroCard.tsx` (line 177, shown whenever `lowerScorePercentage` is not null) | A wording and product choice | Decide the text for 0% (for example hide the percentile line, or say "Ниже всех в группе") in all five locales. |
| 4 | The privacy notice opens with "Ваши отдельные ответы никому не видны — только числа по вашей стране", while the holder results page ([ADR 0016](../docs/adr/0016-scholarship-holder-results-page-without-minimum.md)) shows its breakdown from the first answer, so with one answer a viewer sees one person's choices. | `src/i18n/*.ts` privacy keys, `src/features/scholarship-report/ScholarshipReportResults.tsx` | The claim and the accepted ADR may not conflict (the notice also warns about small countries), but the sentence needs a check | Belongs to task 025 (the claims audit, in review): add or confirm a row there. No new task. |
| 5 | While the browser-only action bar (`DevActionBar`, shown outside Telegram) is visible, it covers the lower part of an open country dropdown in the wizard. | `src/components/MiniAppShell.tsx`, `SearchableSelect` | It only happens outside Telegram, where the native buttons are used instead | Decide whether the dev bar's overlap is worth fixing or accepted. |
| 6 | `GET /api/cron/reminders` without `CRON_SECRET` answers 500 `INTERNAL_ERROR`, while `POST /api/bot` without its secret answers 503 `BOT_NOT_CONFIGURED`. The About screen repeats its title ("О NAWAmeter") as the first section heading. | `api/_lib/cron-auth.ts`, `src/components/settings/AboutView.tsx` | Confirmed in code: `assertCronAuthorized` deliberately throws 500 `INTERNAL_ERROR` when `CRON_SECRET` is missing or shorter than 32 characters (`cron-auth.ts:13-15`); this applies to both cron routes, including `/api/cron/keep-alive` once task 026 serves it locally. `AboutView.tsx:7` uses `t.about.title` as its first section heading, the same string the sheet header shows (`settings-view.ts:14`). Both are product choices, not defects | Decide whether a missing cron secret should answer 503 like the bot, and whether the About screen's first heading should change. Both are small. |

## Acceptance scenarios

| ID | Given / when | Expected result | Planned verification |
| --- | --- | --- | --- |
| A1 | Every row above | The handoff says for each: "new brief NNN", "added to task NNN", or "won't fix" with the reason | Reviewer read |
| A2 | Rows 1 and 2 | The handoff records how it was reproduced or why it was not | Reviewer read |

## Must stay unchanged

- Behavior, contracts, or user-facing copy this task must not alter: everything; this brief changes no code.
- Existing checks that already cover it: none needed.

## Open decisions

- Row 1: only if it reproduces, whether the wheel over the ruler may change the value at all (the code has no such feature today).
- Row 3: the text for 0% (and whether the line is hidden), in five locales.
- Row 5: fix the dev bar's overlap or accept it.
- Row 6: the status of the cron answer without a secret, and the About heading.

## Verification

- Reviewer reads the handoff table → A1, A2

## Handoff

| Scenario | Evidence (command, test assertion, or manual check) | Result |
| --- | --- | --- |
| A1 | | |
| A2 | | |

- Changed files:
- Checks not run, blockers, or open questions:
- LLM contributions: Sonnet 5.5 (Claude Code) wrote this brief. No implementation. Opus 5.5 (Claude Code subagent): specification review.
