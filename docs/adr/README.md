# Architecture decision records

Short records of decisions that shape the product and are expensive to reverse. One file per decision; a record is
never rewritten, it is superseded by a new one. Format: context, decision, consequences, alternatives.

Use [implementation tasks](../../tasks/README.md) for work that implements a decision. Link the ADR from the task rather than copying the decision into it. An ADR being accepted does not mean that implementation is complete.

| # | Decision | Status |
| --- | --- | --- |
| [0001](0001-telegram-mini-app-on-vercel-and-supabase.md) | Telegram Mini App on Vercel and Supabase free tiers | Accepted |
| [0002](0002-pseudonymous-identity.md) | Pseudonymous identity: a hashed key, not the Telegram id | Accepted |
| [0003](0003-cohort-ladder.md) | Compare inside a cohort ladder (country, group, track) instead of a fixed k = 10 per country | Superseded by 0015 |
| [0004](0004-outcomes-as-banded-self-reports.md) | Outcomes are self-reported, per intake year, disclosed in 5-point bands | Superseded by 0008 |
| [0005](0005-only-nawa-director-track-is-live.md) | Only the NAWA Director track is live | Accepted |
| [0006](0006-opt-in-bot-reminders.md) | The bot is opt-in and sends calendar-driven reminders | Accepted (reminder texts changed by 0008) |
| [0007](0007-study-field-and-prep-course-city.md) | Collect the study field and the prep-course city, aggregate them as field by city | Superseded by 0008 |
| [0008](0008-refocus-on-score-comparison.md) | Refocus on the score comparison: drop application statuses and the university question | Accepted |
| [0009](0009-staging-environment-on-free-tiers.md) | A staging environment on free tiers, checked by smoke tests | Accepted |
| [0010](0010-locale-glossary-and-english-api-errors.md) | One glossary per locale for app and bot copy; API error messages in English | Accepted |
| [0011](0011-documented-product-events-deleted-with-survey.md) | Product analytics: a documented catalogue of named events, deleted with the survey | Accepted |
| [0012](0012-scholarship-holder-survey.md) | A survey for scholarship holders: preparatory centre, wished-for field and university, shown only to contributors | Accepted (floor and results page changed by 0016) |
| [0013](0013-limit-on-score-changing-edits.md) | At most three score-changing saves in 24 hours | Accepted |
| [0014](0014-flag-per-country-spikes-for-manual-review.md) | Flag per-country spikes of new surveys and hold them for manual review | Accepted |
| [0015](0015-compare-within-citizenship-country-without-minimum.md) | Compare within the country of citizenship, with no minimum number of responses | Accepted |
| [0016](0016-scholarship-holder-results-page-without-minimum.md) | Scholarship-holder results on a separate page, with all countries and no minimum number of answers | Accepted (holder scores shown to everyone by 0017) |
| [0017](0017-orientation-mark-from-holder-scores.md) | "Ориентир 2026": the lowest reported holder score per country, shown to everyone | Accepted (holder dots removed by 0020) |
| [0018](0018-intake-year-from-the-database.md) | The active intake year comes from the database, not from a code constant | Accepted |
| [0019](0019-minimum-text-size-14px.md) | No text smaller than 14px, except ruler labels and badges | Accepted |
| [0020](0020-dashboard-hub-and-pages.md) | The dashboard is a hub with pages, not one long scroll; the density strip is removed | Accepted |
| [0021](0021-official-award-counts-as-context.md) | Official award counts per country as context, never as a forecast | Accepted |

To add one, copy the newest file, bump the number, and add a row above.
