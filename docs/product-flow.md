# NAWAmeter product flow

Product intent, in-app questionnaire flow, and how it relates to official Anders NAWA documents for intake **13/2026**.

Official sources:

- [Ogłoszenie 13/2026 — Anders I stopień / jednolite magisterskie](https://www.nawa.gov.pl/images/Anders-I-stopien/Ogloszenie_13_2026_z_31.03.2026_Anders_NAWA_studia_I_stopnia_i_jednolite_magisterskie.pdf) — eligibility, scoring, country seat limits
- [Zał. 1 — Regulamin programów NAWA](https://www.nawa.gov.pl/images/Anders-I-stopien/Ogloszenie_13_2026_Zal._1_Regulamin_programow_NAWA__Programy_dla_os._fizycznych_podejmujacych_ksztalcenie_odbywajacych_pobyty_na.pdf) — shared process shell (System, formal/merit, Director decision, contract)

NAWAmeter is **not** a substitute for `programs.nawa.gov.pl`. It is an unofficial community orientation tool.

## Product intent

What we optimize for:

1. **Collect declared grades (and related inputs) by citizenship country** so cohorts are comparable.
2. **Show each user who they are and where they stand** among other declarers (score, percentile, country context, community pulse) — orientation only, never an official ranking or forecast.
3. **Freeze the intake dataset after the season** and keep it read-only until the next nabór.

What we deliberately do **not** model as product priorities:

- Formal rejection / “bez rozpatrzenia” / request for supplementary documents
- Full NAWA System paperwork (attachments, translations, parental consent, etc.)
- Post-award contract, payments, reporting, appeals

Users no longer report application statuses: the 2026 intake is over and the feature served the season. A later flow will collect outcomes only from people who received a scholarship ([ADR 0008](adr/0008-refocus-on-score-comparison.md)).

## Season lifecycle

```text
Open intake  →  collect + live community stats  →  freeze dataset  →  next nabór (new season)
```

There is no freeze: records are keyed by `(account, intake year)`, so a new nabór simply opens a new year (`season_config.active_intake_year`, `currentIntakeYear` in `shared/season.ts`) and past years stay as an archive.

## In-app user flow

Channel: Telegram Mini App only (`gate` → `loading` → `create` | `authenticated`). No URL router.

### Start

- Pitch + a live sample ruler: dragging it changes a demo score, its position against a sample cohort and the percentile (no real data)
- Below the sample card: the real number of responses in the active intake (`● 312 odpowiedzi w naborze 2026`), hidden while loading, on error, and below ten responses — no weekly delta and no placeholder
- One start button; **NAWA Director** is the only live track (Health / Culture are hidden until their scoring documents are modelled)
- Optional resume of local draft
- FAQ (what you see / how it works)

On save the client sends neutral defaults for what is not asked: status `submitted` + today’s date, field of study `other`, route `direct_studies`, no university.

### Wizard (create / edit)

The wizard has two steps. The university and field of study were dropped from the start ([ADR 0008](adr/0008-refocus-on-score-comparison.md)); the server still accepts them, and profiles that already have them keep the values.

The Polish-citizenship question and the track choice return together with the Health / Culture tracks (dual Polish citizens may only apply for Dyrektor NAWA).

#### Step 1 — Education

| Question | Role |
| --- | --- |
| Country of citizenship (`rankingCountry`) | Comparison cohort / country list (Ogłoszenie: lists by non-Polish citizenship) |
| Country of secondary school completion (`schoolCountry`) | Default grading scale for the calculator |

#### Step 2 — Grades

| Question | Role |
| --- | --- |
| Who are you applying as | `school_leaver`, or `student_in_poland` (average ≥ 4.75 on the 2–5 scale is assigned 100 points, Ogłoszenie 2.7) |
| Which grades | `final_certificate` or `half_year` (2025/26); a tag, not part of the cohort key |
| Average grade | Declared average |
| Maximum grade on scale | Locked from school country (students in Poland: 5) |
| Polish / Polonia school level | `none` / `primary` (+5) / `secondary` (+10); not for Belarus citizens or students in Poland |
| Live orientation score preview | `(avg / max) × 90 + bonus` |

Formula and 60-point merit threshold align with Ogłoszenie §2.7 for Dyrektor NAWA (`shared/nawa-score.ts`, `nawaOrientationThreshold = 60`).

### Confirm

There is no separate confirm screen: the grades step saves directly — `POST` for a new profile, `PUT` for an edit. When an edit changes the comparison cohort (citizenship, track or country), the first save press shows a warning on the grades step and the second one confirms; Cancel, Back or any further edit hides it.

### Dashboard (authenticated)

One screen, no tabs. The saved result card opens it: the season, the orientation score, the threshold-60 chip and then the position inside the comparison cohort — rank, percentile, median, a mini distribution and the cohort size once a cohort of ten exists. The cohort follows the ladder country → country group → whole track and says which tier it used; the card ends with one caption saying the sample is unofficial. The score and chip render even while statistics load or fail, with the status line inside the card. Below the card comes the what-if block (draggable measuring tape, input, and only while a what-if is active its own score, chip and percentile band; never saved), then the full-distribution disclosure for detailed cohorts, and the profile block with the edit rows and the formula. The score breakdown and the source badges are gone.

Also: edit profile (same wizard), Settings, delete profile.

### Retired: application statuses, Outcomes and Season

Until the 2026 intake closed, users could report a status ladder (`submitted` → `formal_review_positive` → `merit_review_positive` → `scholarship_awarded` / `scholarship_not_awarded`, plus `merit_review_negative`), and the dashboard had Outcomes and Season tabs built on it. All of that is gone from the app. The columns, the transition rules and `get_cohort_outcomes` / `get_prep_city_distribution` remain in the database for the post-award flow.

## Mapping to Anders Ogłoszenie 13/2026

### Aligned with product scope

| Official (Ogłoszenie) | NAWAmeter |
| --- | --- |
| Three scholarships: Dyrektor / MKIDN / MZ | Enums keep all three; only Director live, the ministries run their own merit stage |
| Dual Polish citizenship → only Dyrektor | Moot while only Director is live |
| Path: preparatory + studies **or** direct studies | Same two `studyRoute` values |
| University choice binds which scholarship you apply for (Dyrektor / MKIDN / MZ) | Not asked at the start any more; a stored `targetUniversity` is still checked against the track's partners |
| Merit points: grades 0–90 + Polonia school 0/5/10, max 100 | Same orientation formula |
| Merit pass threshold 60 | Threshold used as orientation signal |
| Seats by citizenship country / country groups | Country cohort + allocation-oriented cards (community estimate, not official limits) |
| Deadline 9 Jul 2026; results by 30 Sep 2026 (Director) | Season calendar (`shared/season.ts`) drives the bot reminders; records are kept per intake year |

### Out of product scope (intentionally thin or absent)

| Official | NAWAmeter stance |
| --- | --- |
| Formal assessment fail / one-time supplements | Not tracked — we care about people who stay in the pipeline for grades-by-country |
| Attachments (passport, Karta Polaka, świadectwa, ORPEG, consent <18, translations) | Not collected |
| Eligibility edge cases (matura ≥2024, continuing students 4.75→100 pts, prior scholarships, Belarus exceptions, etc.) | Not fully gated in UI; orientation tool assumes eligible declarers |
| MKIDN / MZ separate merit & decision | Coming soon tracks; scoring/decision not NAWA’s formula |
| Director decision after merit list; contract; travel lump sum; reports | Not in scope |
| Regulamin appeal / System account | Not in scope |

## Mapping to Regulamin (Zał. 1)

Regulamin defines the shared shell: System registration → submit → formal → merit (if any) → Director decision → contract. Field-level Anders rules live in the Ogłoszenie, not in the Regulamin.

The app no longer tracks any stage of that shell: users enter their grades and see where they stand.

## Gaps vs Ogłoszenie (product-relevant watchlist)

Checked against live PDFs (both URLs resolve). Items below are **not** “missing paperwork” — they affect grades-by-country orientation quality or “where do I stand”.

| Gap | Official rule | Current product | Why it matters |
| --- | --- | --- | --- |
| University always asked | Applicant always picks a university → that declares Dyrektor / MKIDN / MZ | Not asked at the start ([ADR 0008](adr/0008-refocus-on-score-comparison.md)); returns in a later flow for scholarship holders | The comparison does not depend on it |
| Merit pass ≠ seat | ≥60 = eligible; seats by country / country **group** go to highest scores | No statuses are collected | **Deprioritized:** product assumes people who would clearly fail (<60) self-select out; among declarers the fight is mainly seat quotas |
| Country **groups** | Official limits may be for groups, not only single countries | Illustrative allocation, not official 2026 groups | Don’t imply real quotas |
| Belarus × Polonia bonus | Polonia school points **nie dotyczy obywateli Białorusi** | **Fixed:** bonus 0 for `BY`; UI notice cites pkt 2.7 kryterium 2 | — |
| Continuing students in PL | ≥4.75 (scale 2–5) → **100 pts** | **Fixed:** `applicant_kind = student_in_poland` is scored 100 | — |
| Dual citizens copy | Ranking by **non-Polish** citizenship | Ask “country of citizenship”; PL not pickable | Copy could be clearer for dual citizens |
| Health paths | MZ allows preparatory **or** direct | Validation forces preparatory only | Revisit before Health launch |
| Season freeze timing | Deadline 9 Jul; Director results by 30 Sep | Freeze still an ops decision | Freezing at deadline loses post-July merit/award signal |

Intentionally still out of scope (confirm OK): Karta Polaka / attachments, formal fail, appeals, contract, travel lump sums, double-degree ban, philology exclusions, matura year ≥2024 gate.

## Implementation pointers

| Area | Location |
| --- | --- |
| State machine | `src/pages/HomePage.tsx` |
| Create / wizard / settings summary | `src/features/CreateProfileFlow.tsx`, `ResponseWizardSteps.tsx`, `ConfirmSummary.tsx` |
| Dashboard | `src/features/ProfileDashboard.tsx`, `statistics/StatisticsPanel.tsx` |
| Contracts | `shared/contracts.ts` |
| Score formula | `shared/nawa-score.ts` |
| Cohort ladder | `supabase/migrations/202611210001_cohort_ladder.sql` |
| Bot, reminders and country links | `api/bot.ts`, `api/cron/reminders.ts`, `shared/reminders.ts`, `shared/bot-messages.ts`, `src/lib/bot-links.ts` |
| Languages | `src/i18n/{pl,en,ru,uk,be}.ts`, `src/i18n/locales.test.ts` |
| Season calendar | `shared/season.ts` |

## Telegram bot

The bot is how reminders and country invitations work; the app itself stays a Mini App.

- `/start` opens the app; `/start c_UA` opens it with Ukraine preselected as the country of citizenship (also `https://t.me/<bot>?startapp=c_UA` when the Main Mini App is set up). Settings → "Invite people from my country" shares exactly that link.
- `/subscribe` (or Settings → "Reminders in the bot") opts in; `/stop` opts out. Reminders are derived from the season calendar: a few days before the results, the day after, and when a new intake opens. Each subscriber gets at most one at a time and never a backlog.
- Opting in stores the Telegram id in `bot_subscriptions`, separate from the answers; it is removed on `/stop`, when the bot is blocked, and when the survey is deleted.

## Changelog

### Unreleased — Refocus on the score comparison

- Landing: a live sample ruler replaces the fake density strip.
- Landing: the real response count of the active intake replaces the hard-coded "48 … +7 this week" line (one number, no delta, hidden below ten responses and outside the sample card).
- Wizard: the university / field step is gone; two steps (countries, grades).
- Confirm: the summary screen is gone; the wizard saves from the grades step, with the cohort-change warning inline there.
- Dashboard: the saved result card (score, chip, position) opens the screen, then the what-if and the profile block; the score breakdown and the source badges are gone, replaced by one unofficial-sample caption.
- Removed from the app: status reporting, the Outcomes and Season tabs, the prep-city card, `/api/outcomes` and `/api/prep-cities`; reminder copy no longer asks for an outcome.
- Decision record: [ADR 0008](adr/0008-refocus-on-score-comparison.md).

### 2026-11-25 — Bot, languages, retro outcomes

- Bot webhook, reminders and country deep links; Ukrainian and Belarusian interface; any-later-stage status reporting so people who join after the results can add their outcome in one step.

### 2026-11-20 — Season model and cohort ladder

- Records per intake year; `grade_basis`; `applicant_kind` (students in Poland → 100); `scholarship_not_awarded`.
- Cohort ladder (country → country group → track) instead of country-or-track; outcomes by cohort in 5-point bands from three awards (replaces the per-country k ≥ 10 range).
- Health / Culture hidden; university asked on both routes; official history added; gamification and allocation estimates removed.

### 2026-11-19 — Ruler redesign

- Dashboard split into Score / Outcomes / Season tabs; per-country outcomes added with the k ≥ 10 floor (small-country dot plots from the design were intentionally not built: they would expose individual answers).

### 2026-08-09 — Initial product-flow note

- Documented product intent: grades-by-country collection, orientation (“who/where”), season freeze.
- Explicitly deprioritized formal-rejection branches.
- Mapped wizard fields and statuses to Anders Ogłoszenie 13/2026 and Regulamin Zał. 1.
- Added product-relevant gaps watchlist after re-checking both live PDF URLs.
