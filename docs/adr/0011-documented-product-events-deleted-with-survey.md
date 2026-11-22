# 0011. Product analytics: a documented catalogue of named events, deleted with the survey

Status: Accepted

## Context

`product_events` records four events: `wizard_started`, `wizard_completed`, `score_viewed` and
`position_or_fallback_viewed`. An event is only its name, keyed by `identity_hash` ([0002](0002-pseudonymous-identity.md));
the API schema rejects any payload and the table limits it to 256 bytes. With four events the product cannot answer
basic questions: how many people who open the start screen begin the survey, at which step they leave, whether the
what-if ruler, the invite link or the bot reminders are used, and whether the changes of
[0008](0008-refocus-on-score-comparison.md) helped.

Deleting the survey removes the responses and the bot subscription, but the user's events stay. The settings promise
that the user can delete everything, and more events make the leftover trail longer.

## Decision

1. **An event is still only its name.** A distinct moment gets a distinct name, for example one per survey step;
   events carry no payload, no free text and no answer values.
2. **Every event is documented in one catalogue** in `docs/architecture.md`: its name, the exact moment it is
   recorded, and how often it can fire. An event is added, renamed or removed only together with its catalogue entry.
   Names already recorded are not renamed, so older rows stay comparable.
3. **Deleting the survey deletes the user's events.** The same request that removes the responses and the bot
   subscription removes every `product_events` row with the user's `identity_hash`.

## Consequences

- The funnel from the start screen to the saved result, and the use of the dashboard and settings features, can be
  counted with plain SQL over `product_events`.
- Funnels lose the people who deleted their survey; counts over time can drop after a deletion.
- Questions that need a value inside an event (for example the cohort tier the user saw) cannot be answered without a
  new decision.
- Reading the catalogue is enough to know what the product records about behaviour.

## Alternatives considered

One event with the step number in the payload (fewer names, but it loosens the no-payload rule and the meaning of the
number changes whenever the steps change); keeping events after the survey is deleted (complete funnels, but
contradicts "delete everything" in the settings); a third-party analytics SDK (sends behaviour to another service,
needs consent copy and adds a client dependency).
