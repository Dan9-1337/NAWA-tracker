# 0002. Pseudonymous identity: a hashed key, not the Telegram id

Status: Accepted

## Context

Early copy promised "anonymity" while `responses` stored the Telegram id and username next to the score, and product
events logged free-text university searches under the same id. The promise was not true, and a database export would
have identified every applicant.

## Decision

- Records are keyed by `identity_hash = HMAC-SHA256(IDENTITY_PEPPER, telegram id)`, computed in `api/_lib/identity.ts`.
  The database never sees the id or the username.
- Product analytics carry no free text (enforced by the API schema and a payload size check).
- The only place a real Telegram id is stored is `bot_subscriptions` (see [0006](0006-opt-in-bot-reminders.md)): opt-in,
  no answers, deleted on `/stop`, when the bot is blocked, and when the survey is deleted.
- Copy says "pseudonymous, not anonymous": whoever holds the pepper can recompute hashes.

## Consequences

- A leaked database dump cannot be resolved to Telegram accounts without the pepper.
- Changing the pepper orphans every stored profile, so it has to be treated as permanent; a versioned pepper would be a
  new decision if rotation ever becomes necessary.
- Support cannot look a user up by their Telegram id; support messages carry a short reference id instead.

## Alternatives considered

Storing the raw id (simple, but contradicts the promise); a random per-user token kept in the client (loses the record
when Telegram storage is cleared and breaks one-record-per-account); full anonymity (impossible with one account, one
record).
