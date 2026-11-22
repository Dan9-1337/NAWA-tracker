# 025 — Audit what the app tells users against the assumptions file

**Status:** In review

## Goal

The maintainer wants to check what the product actually shows and promises to users against
[`docs/assumptions.md`](../docs/assumptions.md). This is a **report-only** task: list every place where a screen, a
copy string, a bot message or a user-facing doc says something that contradicts an assumption, or that no assumption
covers. Change no code and no copy.

Intended behavior:

- Go through every user-visible surface: start screen, wizard, result/dashboard card, what-if, distribution,
  Settings, privacy notice, FAQ/about, error messages, bot messages and reminders, the gate screen, `README.md`, and
  `docs/product-flow.md`.
- For each claim about scoring, cohorts, thresholds, privacy, data retention, scope or officialness, compare it with
  the assumptions file. Read the Russian copy as primary and spot-check the other four locales for meaning drift.
- Write the result as a table appended to the Handoff of this brief, one row per finding:
  `surface / key or file | what it says | assumption it conflicts with (or "not covered") | already handled by task NNN? | suggested fix`.
- Findings already covered by tasks 012 or 013 are still listed and marked with the task number, so the maintainer can
  confirm nothing is missed.

## Context

- Relevant code and docs: `docs/assumptions.md`, `src/i18n/`, `shared/bot-messages.ts`, `README.md`,
  `docs/product-flow.md`.
- ADRs this task follows: all those linked from `docs/assumptions.md`. Replaces none.
- Dependencies and decisions already made: none. It can run at any time, and running it before tasks 012 and 013 are
  merged is fine. Findings then reflect the current app.

## Scope

- In scope: reading the surfaces above, and the findings table.
- Out of scope: any change to code, copy, docs or `docs/assumptions.md`. Fixes become separate briefs.
- Files or directories assigned to this task: this brief's Handoff section only.

## Acceptance scenarios

| ID | Given / when | Expected result | Planned verification |
| --- | --- | --- | --- |
| A1 | The audit is done | Every surface listed under Intended behavior has been checked, and the Handoff names each one with "no findings" or its rows | Reviewer read |
| A2 | A finding | The row quotes the exact text (ru, plus the locale if the drift is locale-specific), names the conflicting assumption ID (for example R3) or "not covered", and says whether task 012 or 013 already handles it | Reviewer read |
| A3 | After the audit | `git diff` shows changes only in this brief | `git status` |

## Must stay unchanged

- Behavior, contracts, or user-facing copy this task must not alter: everything. This task is read-only.
- Existing checks that already cover it: none needed.

## Open decisions

- None.

## Verification

- `git status` → A3
- Reviewer reads the findings table → A1, A2

## Handoff

| Scenario | Evidence (command, test assertion, or manual check) | Result |
| --- | --- | --- |
| A1 | Every surface listed under Intended behavior is named in "Surfaces checked" below with "no findings" or its finding rows; the findings table has 12 rows. | pass |
| A2 | Each row quotes the ru text (or the English repo doc) and names the assumption or "not covered", plus the task that touches it. The same claim was checked in pl/en/uk/be; no locale-specific meaning drift was found. | pass |
| A3 | `git status --short` after the edit → only `tasks/025-audit-user-visible-claims.md` is modified. | pass |

Method: read `AGENTS.md`, `tasks/README.md`, this brief, `docs/assumptions.md`, every ADR it links (0002, 0005, 0006, 0008, 0010–0017), `docs/product-flow.md`, `README.md`, `docs/architecture.md`, all five locale files (ru in full; pl/en in full for the claim-bearing keys; uk/be spot-checked on start, wizard, privacy, About and the scholarship-report flow/results), and the components that render the strings: `StartScreen`, `HowItWorksPanel`, `ResultPreviewCard`, `EducationStep`, `GradesStep`, `ResponseWizardSteps`, `ConfirmSummary`, `ProfileDashboard`, `StatisticsPanel`, `ResultHeroCard`, `ScoreScreen`, `ThresholdChip`, `DistributionDetailsSection`, `DensityStrip`, `ScholarshipReportCard/Flow/Results`, `MainMenu`, `PrivacyView`, `HelpView`, `AboutView`, `DeleteProfileZone`, `TelegramGate`, `HomePage`. Also read `shared/bot-messages.ts`, `shared/reminders.ts`, `api/_lib/errors.ts`, `src/lib/api-client.ts`, the statistics SQL and the delete path. The tree was clean at HEAD 46312fe before the audit. This is a reading audit, so no test suite was run. Unused keys (`dashboard.competitionNeighbourhood`, the Health/Culture track labels) were excluded because no screen renders them.

Surfaces checked:

| Surface | Result |
| --- | --- |
| Start screen and FAQ (`StartScreen`, `HowItWorksPanel`, `ResultPreviewCard`) | The `start.subtitle` / `whatYouSeeBody` row and the `orientationMarkLine` row. The sample ruler is labelled `Пример результата`, and the response counter respects D6. |
| Wizard and edit wizard (`EducationStep`, `GradesStep`, `ResponseWizardSteps`) | No findings. The country hint says `вас сравнят с кандидатами из этой страны`; the formula, the Belarus bonus and the 4.75 student rule match S1–S4. |
| Saved-data summary (`ConfirmSummary` in Settings) | No findings. |
| Result card (`StatisticsPanel`, `ResultHeroCard`) | The `orientationMarkLine` row. The `only you` line matches D4 and the unofficial caption matches P1. |
| What-if (`ScoreScreen`, `ThresholdChip`) | The `formulaDisclaimer` and `belowAxis` rows. |
| Distribution (`DistributionDetailsSection`, `DensityStrip`) | No findings. The holder dots and the lowest-dot label match D12; the mini strip is unchanged. |
| Scholarship-holder card, flow and results | The placement-framing row. |
| Settings and privacy (`MainMenu`, `PrivacyView`, `HelpView`, `DeleteProfileZone`) | The delete-copy and privacy-points rows; the Help view has no findings. |
| Landing FAQ and About (`StartScreen` FAQ, `AboutView`) | The FAQ row; the About sections otherwise match R1–R3 and P1. |
| Gate screen (`TelegramGate`) | No findings. It says Telegram is needed for sign-in and one survey per account; D1's per-intake wording is a simplification, not a contradiction while only 2026 is live. |
| Error copy (`HomePage`, `api-client`, `api/_lib/errors`) | No findings. API errors are English diagnostics, and the client localizes `EDIT_LIMIT_REACHED` and `SCORE_BELOW_THRESHOLD` (C5). |
| Bot messages and reminders (`shared/bot-messages.ts`, `shared/reminders.ts`) | The `subscribed` row. The reminder texts match the season calendar. |
| `README.md` | The README row. The country-only statistics paragraph and the `only you` description match D3/D4. |
| `docs/product-flow.md` | The FAQ/docs, freeze and allocation rows. The dashboard, holder-survey and `ориентир` sections match ADRs 0012 and 0015–0017. |
| `docs/architecture.md` | The FAQ/docs row (line 277) and the placement row (changelog line 283). The statistics, privacy and RPC sections otherwise match the assumptions. |
| `docs/assumptions.md` | Baseline. No copy changes; metadata notes below. |

**Findings.** Quotes are ru for app copy and English for repo docs. The pl/en/uk/be strings carry the same meaning unless a row says otherwise. "Not covered" means no assumption in `docs/assumptions.md` states the rule the copy relies on.

| Surface / key or file | What it says | Assumption it conflicts with (or "not covered") | Already handled by task NNN? | Suggested fix |
| --- | --- | --- | --- | --- |
| `src/i18n/*/scholarshipReport.invitationBody`, `openResults`, `results.title`; `ScholarshipReportCard`; `docs/architecture.md` changelog | ru: `Расскажите, куда вас направили` and `Куда распределили стипендиатов`; the flow asks `Какое направление?` / `Какой университет?` and the card labels them `Направление обучения` / `Университет` | Not covered by an assumption. ADR 0012 says the field and university are what holders **wanted**; only the preparatory centre is where NAWA sent them. D5 only defines the page, not what the field and university mean. | 012 (the copy was specified there; no fix yet). Needs a new copy brief. | Rename the entry/results framing to `Что выбирали стипендиаты` / `Куда распределили на подготовительный курс`; ask `Какое направление вы хотели изучать?` and `В каком университете вы хотели учиться?`; add one caption that fields and universities are wishes, not placements. |
| `README.md` "Privacy And Limits" (last paragraph) | `Everything shown to other users is aggregate … outcome scores appear in 5-point bands` and `Outcome score ranges are disclosed from three awarded responses and rounded to 5-point bands` | R8 and D12: holder scores are shown to every user as the `ориентир` and as dots, so one person's score is visible, not an aggregate. The 5-point bands and the three-awarded floor were retired by ADR 0008; `docs/assumptions.md` §7 lists the bands as a known mismatch. | 013 updated the country-only part of this paragraph but left both clauses; 014 did not update README. | Rewrite the paragraph: drop the bands and the three-awarded floor; add the holder-score exception, the `ориентир 2026`, and the small-country recognition risk. |
| `src/i18n/*/form.deleteZoneHint`; `src/i18n/*/settings.deleteConfirmBody` | ru: `Все сохранённые данные … будут потеряны навсегда.` / `Все сохранённые данные будут удалены.` | R7: after a survey is deleted, the identity hash and the times of score-changing saves are kept for at most 24 hours, so the edit limit cannot be bypassed. | 009 added the privacy point about the trail, but not this copy. Not covered by 012–014. | Say `данные анкеты` and add `кроме следа изменений балла, который хранится до 24 часов`, or point to the privacy notice. |
| `src/i18n/*/privacyNotice.points[8]` and `[9]` | point 8: `Результаты анкеты для стипендиатов видят только те, кто сам на неё ответил.`; point 9: `Баллы стипендиатов … видят все как ориентир 2026 их страны — без имён.` | R8 and D12: holder scores are visible to every user. The two adjacent points read as a contradiction unless point 8 is read as the results page only. | 012 and 014 shipped both points; a wording fix is needed. | Make point 8 `Остальные результаты анкеты для стипендиатов…` or add `кроме баллов, которые видны всем как ориентир`. |
| `src/i18n/*/start.whatYouSeeBody`; `docs/product-flow.md` line 96; `docs/architecture.md` line 277 | FAQ: `Вы также увидите ориентир 2026 … самый низкий балл среди стипендиатов, ответивших в NAWAmeter.` It does not say the scores are visible to everyone or that acquaintances may recognise them. product-flow and architecture say the landing FAQ says both. | R3 and R8: the copy should say honestly that few holders can be recognised. Task 014 required the privacy notice **and FAQ** to say scores are visible to all and may be recognised. | 014 added the privacy point but not the FAQ sentence; the two docs overstate the FAQ. | Add the visibility/recognition sentence to `whatYouSeeBody` (or a separate FAQ point), or correct product-flow and architecture. |
| `src/i18n/*/scoreScreen.formulaDisclaimer` | ru: `Прохождение порога не гарантирует стипендию: места распределяются по лимитам для стран.` | Not covered. P3 says seat limits per country, but the product-flow watchlist says official limits may be for country **groups** and says `Don't imply real quotas`; the sentence states per-country quotas as fact. | Not covered by 009–014. | Say `по правилам конкурса` or `по лимитам для стран и их групп`; if the per-country wording is intended, add an assumption that the copy may say it. |
| `src/i18n/*/scoreScreen.belowAxis` | ru: `Ниже порога 60 — вне распределения группы` | Not covered. The statistics SQL puts every below-60 score into bucket 0 of the 16-bucket distribution (`Bucket 0 also takes everything below the origin`), so such a score is counted in the first bar; only the percentile band is not shown. | Not covered by 013 or 014. | Say `Ниже порога 60 — процентиль для такого балла не рассчитывается` or similar. |
| `src/i18n/*/start.subtitle`; `src/i18n/*/start.whatYouSeeBody` (first sentence) | ru: `Узнайте свой процентиль, положение относительно медианы и то, как меняется ваша группа.` / `Ваш балл, процентиль в группе, положение относительно медианы…` — unconditional. The dashboard has no history of how the group changes, only the current statistics and an updated stamp. | D4: with 0–1 valid surveys in the country the card shows only `<Страна>: пока только ваша анкета…`, with no percentile or median. | 013 added the fallback but not the landing caveat. | Add `когда в вашей стране уже есть другие анкеты`; drop `как меняется ваша группа` or explain that the numbers update as responses arrive. |
| `src/i18n/*/dashboard.hero.orientationMarkLine`; `src/i18n/*/start.whatYouSeeBody` | ru: `…самый низкий балл среди стипендиатов 2026, ответивших в NAWAmeter (${count}). Не данные NAWA.` No upper-bound caveat. | D12: the mark `is an upper bound on the real cut-off`; ADR 0017 says it is never a cut-off or pass mark. The copy is literally true but does not say a lower score may also have been enough. | 014 implemented the agreed copy; the caveat is not covered. | Add a short `это верхняя граница: балл ниже тоже мог подойти` or record that the current label is the intended one. |
| `shared/bot-messages.ts` `subscribed` (all locales); `src/i18n/*/privacyNotice.points[6]` | ru: `Ваш Telegram ID хранится отдельно от анкеты, пока вы не выключите напоминания (/stop).` The privacy point adds survey deletion; neither mentions a blocked bot. | R4: the ID is removed on `/stop`, when the bot is blocked, and when the survey is deleted. | Not covered by 009–014. | Add `или пока вы не заблокируете бота` to the bot message; the privacy point can stay as is. |
| `docs/product-flow.md` lines 18, 31, 147 | `Freeze the intake dataset after the season and keep it read-only until the next nabór`; the lifecycle diagram includes `freeze dataset`; the gap table says `Freeze still an ops decision`. | D1: `There is no freeze`; records are keyed by (account, intake year) and past years stay as an archive. D14 only plans a freeze before 2027. `docs/assumptions.md` §7 bullet 4 names this mismatch. | 013 updated product-flow but left this; not fully covered. | Say `no freeze today; a freeze before 2027 is planned (D14)` and align the diagram and the gap row. |
| `docs/product-flow.md` line 114 and line 142 | `Country cohort + allocation-oriented cards (community estimate, not official limits)`; `Illustrative allocation, not official 2026 groups`. | D3 and ADR 0015: the comparison is the country of citizenship only, with no country groups and no allocation cards. P1: numbers are never an official ranking, a cut-off or a forecast of seats. §7 bullet 4 names the allocation cards. | 013 updated product-flow but left this; not fully covered. | Replace with `country-only comparison; no allocation cards or group quotas` (and, if the group caveat stays, move it to a note about NAWA's own rules). |

Consistent (spot-checked, no row): the `only you` line matches D4 word for word; the formula, the Belarus bonus and the 4.75 student rule match S1–S4; the privacy notice says pseudonymous, not anonymous (R1), no names or IDs (R2), small-country guessing (R3), the 24-hour trail (R7), the bot ID (R4), the holder scores (R8) and the private typed kierunek (R6); the holder results page is contributors-only and counts from one (D5/0016); the landing counter hides below ten (D6); the `ориентир` line, ruler mark and dots match D12; the README country-only statistics paragraph matches D3/D4; API errors are English diagnostics localized by code on the client (C5).

Assumption metadata for the task author (not changed here, per scope): D3 still says `today the app still uses the country → group → track ladder from 10 responses`, but 013 is merged; D4, D5, D12 and D13 still say `decided` after their tasks shipped. D1 `There is no freeze` and D14 `Planned: freeze 2026 before 2027` need wording that keeps D1 as today and D14 as a future option; product-flow's `Freeze still an ops decision` is closer to D14 than to D1. P3's `seat limits per country` and the product-flow watchlist's `official limits may be for groups` need the same reconciliation.

- Changed files: `tasks/025-audit-user-visible-claims.md` only (status, Handoff evidence, findings table, method note). No code, copy, translations, docs, ADR or `docs/assumptions.md` changes.
- Checks not run, blockers, or open questions: no test suite was run (reading audit). `git status --short` after the edit shows only this brief. Open questions for the maintainer: (1) is the placement framing in row 1 a copy fix or a new ADR/task? (2) should the ориентир copy state the upper-bound caveat or is the current label enough? (3) should the delete confirmation repeat the 24-hour trail or link to the privacy notice? (4) the assumption metadata above.
- LLM contributions: Claude Opus 5.5 (Claude Code) — specification of this brief and `docs/assumptions.md`. DeepSeek V4.1 Flash — audit and report.
