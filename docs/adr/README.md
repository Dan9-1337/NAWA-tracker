# Architecture decision records

Short records of decisions that shape the product and are expensive to reverse. One file per decision; a record is
never rewritten, it is superseded by a new one. Format: context, decision, consequences, alternatives.

Use [implementation tasks](../../tasks/README.md) for work that implements a decision. Link the ADR from the task rather than copying the decision into it. An ADR being accepted does not mean that implementation is complete.

| # | Decision | Status |
| --- | --- | --- |
| [0001](0001-telegram-mini-app-on-vercel-and-supabase.md) | Telegram Mini App on Vercel and Supabase free tiers | Accepted |
| [0002](0002-pseudonymous-identity.md) | Pseudonymous identity: a hashed key, not the Telegram id | Accepted |
| [0003](0003-cohort-ladder.md) | Compare inside a cohort ladder (country, group, track) instead of a fixed k = 10 per country | Accepted |
| [0004](0004-outcomes-as-banded-self-reports.md) | Outcomes are self-reported, per intake year, disclosed in 5-point bands | Superseded by 0008 |
| [0005](0005-only-nawa-director-track-is-live.md) | Only the NAWA Director track is live | Accepted |
| [0006](0006-opt-in-bot-reminders.md) | The bot is opt-in and sends calendar-driven reminders | Accepted (reminder texts changed by 0008) |
| [0007](0007-study-field-and-prep-course-city.md) | Collect the study field and the prep-course city, aggregate them as field by city | Superseded by 0008 |
| [0008](0008-refocus-on-score-comparison.md) | Refocus on the score comparison: drop application statuses and the university question | Accepted |

To add one, copy the newest file, bump the number, and add a row above.
