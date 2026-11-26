# 0006. The bot is opt-in and sends calendar-driven reminders

Status: Accepted

## Context

A Mini App can only pull. Outcomes arrive months after the application, and small countries need invitations from
inside their own Telegram communities, so a push channel and shareable country links are needed. Telegram bots may
message only people who started them, and a stored chat id is personal data.

## Decision

- `POST /api/bot` handles `/start` (with `c_<ISO>` country payloads), `/subscribe`, `/stop` and `/help`, verified by a
  webhook secret in constant time. Settings offers reminders and a country invitation link.
- Subscribing stores the Telegram id and chat in `bot_subscriptions`, separate from answers; the bot tells the user so.
- A daily cron derives reminders from `shared/season.ts` (a few days before the results, the day after, when a new
  intake opens). A subscriber gets at most one at a time, never a backlog, and a reminder expires after a window.
  Sending is capped per run, and subscribers who blocked the bot are removed.

## Consequences

- Reminders can lift the share of outcomes that get reported; nothing else in the product can reach a user later.
- It adds the one table with a real Telegram id (see [0002](0002-pseudonymous-identity.md)).
- Reminders depend on the season calendar being kept current when NAWA publishes a call.
- Vercel Hobby cron runs at most once a day, which is enough.

## Alternatives considered

No bot (no way to bring users back); messaging everyone who opened the app (not allowed by Telegram without consent,
and not respectful); a third-party notification service (another processor of personal data).
