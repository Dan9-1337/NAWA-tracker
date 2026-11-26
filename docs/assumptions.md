# Assumptions and intentional conventions

What NAWAmeter takes for granted and which simplifications it makes on purpose. Each entry says why, where the
decision lives, and what would make it wrong. When a decision changes, update the entry and link the new ADR. Do not
silently drop it.

Status words: **current** means the app works this way today. **Decided** means an ADR is accepted and the
implementing task is not done yet.

## 1. What the product is

| # | Assumption or convention | Why | Source | Wrong if |
| --- | --- | --- | --- | --- |
| P1 | NAWAmeter is an unofficial orientation tool, not a substitute for `programs.nawa.gov.pl`. Its numbers are never an official ranking, a cut-off or a forecast of seats. The `ориентир 2026` (D12) is the one number about awards, and it is labelled as holders' answers, an upper bound, not NAWA data. | We see only people who choose to use the app. | [product-flow](product-flow.md), AGENTS.md, [0017](adr/0017-orientation-mark-from-holder-scores.md) | — (a rule, not an assumption) |
| P2 | Only the NAWA Director scholarship (first-cycle and long-cycle) is live. Health and Culture tracks are hidden. | Their scoring documents are not modelled. | [0005](adr/0005-only-nawa-director-track-is-live.md) | Their rules are modelled |
| P3 | Applicants are selected **by their (non-Polish) country of citizenship**, and the only score rule is the merit threshold of 60. So users are compared only with their own country. | Ogłoszenie 13/2026 §2.7 and the seat limits per country. | [0015](adr/0015-compare-within-citizenship-country-without-minimum.md) (decided, task 013) | NAWA announces seat limits for groups of countries |
| P4 | On the Director programme, passing the selection means receiving the scholarship. There is no "passed but no seat" case to track. | How the Director decision works. | [0008](adr/0008-refocus-on-score-comparison.md) | A later Ogłoszenie separates the two |
| P5 | People who would clearly fail (< 60) mostly do not fill in the survey, and among those who do, the competition is for country seats. | Self-selection; the threshold is public. | [product-flow](product-flow.md) | Many sub-60 surveys appear |
| P6 | Everyone who fills in the survey is assumed eligible. Eligibility (Karta Polaka or origin, certificate year, earlier scholarships, excluded kierunki) is not checked. | Keeps the flow to countries and grades. | [product-flow](product-flow.md) | — |
| P7 | All data is self-reported and unverified: grades, and the "I received the scholarship" declaration in the holder survey. | No access to NAWA data; verification would need documents. | [0012](adr/0012-scholarship-holder-survey.md) | — |

## 2. Score model

| # | Convention | Source |
| --- | --- | --- |
| S1 | Orientation score = `(average / scale maximum) × 90 + Polonia-school bonus (0 / 5 / 10)`, at most 100. | Ogłoszenie 13/2026 §2.7; [product-flow](product-flow.md) |
| S2 | The threshold 60 is shown as an orientation signal, not as a pass. | [product-flow](product-flow.md) |
| S3 | Citizens of Belarus get no Polonia-school bonus. | Ogłoszenie §2.7 kryterium 2 |
| S4 | A student already in Poland (`student_in_poland`, average ≥ 4.75 on the 2–5 scale) is scored 100. | Ogłoszenie §2.7 |
| S5 | The scale maximum is fixed by the country of the school (5 for students in Poland). | [product-flow](product-flow.md) |
| S6 | "Final certificate" or "half-year grades" is a tag only. It does not change the score or the cohort. | [product-flow](product-flow.md) |
| S7 | Dual citizens pick their non-Polish citizenship; Poland cannot be chosen. | Ogłoszenie (lists by non-Polish citizenship) |
| S8 | The model follows the 2026 Ogłoszenie. A new intake needs a fresh check against its own Ogłoszenie. | [product-flow](product-flow.md) |

## 3. Data, cohorts and what is disclosed

| # | Convention | Status | Source |
| --- | --- | --- | --- |
| D1 | One survey per Telegram account per intake year. A new intake opens new records, and past years stay as an archive. There is no freeze. | current | [product-flow](product-flow.md) |
| D2 | The working intake is 2026. The maintainer closes 2026 before 2027 starts. The active year is read from `season_config.active_intake_year` only; the client and API take it from there, not from a code constant. | current; source of the year decided (task 034) | maintainer, 2026-11-22; [0018](adr/0018-intake-year-from-the-database.md) |
| D3 | The comparison cohort is the valid surveys of the same citizenship country, track and intake. No country groups, no whole-track fallback. | decided (task 013); today the app still uses the country → group → track ladder from 10 responses | [0015](adr/0015-compare-within-citizenship-country-without-minimum.md) |
| D4 | No minimum number of responses for the comparison. The full position is shown from 2 surveys in the country. With 0–1, the card says `<Страна>: пока только ваша анкета в наборе 2026.` | decided (task 013) | [0015](adr/0015-compare-within-citizenship-country-without-minimum.md) |
| D5 | Scholarship-holder results: a separate page, only for holders who answered, all countries by default with a filter by citizenship, every count from 1. Exception: holder scores, as the ориентир (D12). | decided (task 012) | [0016](adr/0016-scholarship-holder-results-page-without-minimum.md) |
| D12 | `ориентир 2026` = the lowest score snapshot among counted 2026 Director holder reports of the user's citizenship country, with their number. Shown to every user with a 2026 survey: a mark on the what-if ruler, a line on the result card, holder dots in the full distribution. Shown from 1 holder. It is an upper bound on the real cut-off. | decided (task 014) | [0017](adr/0017-orientation-mark-from-holder-scores.md) |
| D13 | A holder report stores a snapshot of the survey score when saved; the survey stays editable. A survey below 60 cannot have a report (Ogłoszenie §2.7). | decided (task 012) | [0017](adr/0017-orientation-mark-from-holder-scores.md) |
| D14 | Planned, not decided: freeze 2026 before 2027, publish a public "Стипендия NAWA в цифрах" page with aggregates, then allow purging 2026 participants' records while keeping their accounts. | plan | maintainer, 2026-11-22 |
| D6 | The landing counter of responses appears only from 10 responses in the intake. | current | task 002 |
| D7 | Surveys flagged `is_suspicious` are left out of every statistic, and their owners are not told. | current / task 010 | [0014](adr/0014-flag-per-country-spikes-for-manual-review.md) |
| D8 | A spike is more than max(10, 5 × the 14-day hourly average) new surveys of one country in an hour. No flags in the 7 days after launch and after each intake opens. Review is manual. | task 010 | [0014](adr/0014-flag-per-country-spikes-for-manual-review.md) |
| D9 | At most 3 score-changing saves in a rolling 24 hours, and deleting the survey does not reset this. | task 009 | [0013](adr/0013-limit-on-score-changing-edits.md) |
| D10 | Fields no longer asked (university, field, route, status) are sent as neutral defaults and kept in the schema. | current | [0008](adr/0008-refocus-on-score-comparison.md) |
| D11 | The preparatory-centre list is closed and kept per intake year (10 centres in 2026). A typed kierunek counts as "other" until the maintainer adds it to the catalogue. | task 011 / 012 | [0012](adr/0012-scholarship-holder-survey.md) |

## 4. Privacy

| # | Convention | Source |
| --- | --- | --- |
| R1 | Identity is pseudonymous, not anonymous: records are keyed by an HMAC of the Telegram ID. Whoever holds the pepper can match a known ID. | [0002](adr/0002-pseudonymous-identity.md) |
| R2 | The app publishes no names, usernames or Telegram IDs. Only numbers are shown. | [0002](adr/0002-pseudonymous-identity.md), [0015](adr/0015-compare-within-citizenship-country-without-minimum.md) |
| R3 | **Accepted risk:** in a country with few surveys or few holders, acquaintances can guess whose score or choice is whose. The copy says so honestly. | [0015](adr/0015-compare-within-citizenship-country-without-minimum.md), [0016](adr/0016-scholarship-holder-results-page-without-minimum.md) |
| R4 | A real Telegram ID is stored only after `/subscribe` (`bot_subscriptions`), and removed on `/stop`, a blocked bot, or survey deletion. | [0006](adr/0006-opt-in-bot-reminders.md) |
| R5 | Product events are names only, with no payload, and they are deleted with the survey. | [0011](adr/0011-documented-product-events-deleted-with-survey.md) |
| R6 | A typed kierunek is seen only by its author and the maintainer. | [0012](adr/0012-scholarship-holder-survey.md) |
| R7 | After a survey is deleted, the only thing kept is the trail of score-changing saves for at most 24 hours. | [0013](adr/0013-limit-on-score-changing-edits.md) |
| R8 | Holder scores are visible to every user, as the ориентир of their country. With few holders this is one person's score. Accepted risk; no names. | [0017](adr/0017-orientation-mark-from-holder-scores.md) |

## 5. Intentionally out of scope

Formal review and "bez rozpatrzenia"; attachments and translations; the NAWA System account; contract, payments, reports
and appeals; Health and Culture scoring; second-cycle studies (Ogłoszenie 14/2026);
the double-degree ban and the Polish-philology exclusion as gates; the certificate year ≥ 2024 gate; application
statuses (retired by [0008](adr/0008-refocus-on-score-comparison.md)). Source: [product-flow](product-flow.md).

## 6. Product and platform conventions

| # | Convention | Source |
| --- | --- | --- |
| C1 | Telegram Mini App only. Outside Telegram the URL shows a gate screen, and every API call carries verified `initData`. | [0001](adr/0001-telegram-mini-app-on-vercel-and-supabase.md) |
| C2 | Free tiers only (Vercel Hobby, Supabase Free). The cron runs at most daily. | [0001](adr/0001-telegram-mini-app-on-vercel-and-supabase.md) |
| C3 | Five locales (pl, en, ru, uk, be). uk and be are drafts awaiting a native-speaker review. | README |
| C4 | One term per concept per locale. Country names are never declined (sentences are built as `<Страна>: …`). Neutral forms are used instead of gendered ones where possible. | [0010](adr/0010-locale-glossary-and-english-api-errors.md) |
| C5 | API error messages are in English. User-facing errors are localized on the client by error code. | [0010](adr/0010-locale-glossary-and-english-api-errors.md) |
| C6 | Requirements change as the product learns. A changed decision gets a new ADR, and an old ADR is context, not a constraint. | maintainer, 2026-11-22 |
| C7 | No text is smaller than 14px, except ruler and chart labels and short badges (12px). Decided, task 040. | [0019](adr/0019-minimum-text-size-14px.md) |

## 7. Known places where docs or copy may not match these assumptions

To be confirmed by the audit in task [025](../tasks/025-audit-user-visible-claims.md), not assumed fixed:

- Privacy and FAQ copy that says small countries are pooled and that a single survey cannot be singled out. Task 013 rewrites it.
- A privacy point about outcome scores shown in 5-point bands. That feature was retired by 0008; task 013 replaces the point.
- `README.md` and `docs/product-flow.md` describe the cohort ladder. Task 013 updates them.
- `docs/product-flow.md` mentions "allocation-oriented cards" and "freeze still an ops decision", while D1 says there is no freeze.
