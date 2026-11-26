# 0013. At most three score-changing saves in 24 hours

Status: Accepted

## Context

The repository will be open source, and nothing limits how often a survey can be saved. Telegram `initData` is
verified on the server and there is one survey per Telegram account and intake year
([0002](0002-pseudonymous-identity.md)), so faking many answers needs many accounts. One account, however, can keep
moving its own score and watch the distribution of a small cohort move with it. Since
[0008](0008-refocus-on-score-comparison.md) the `is_suspicious` flag is no longer set by anything.

Cohorts are small by the nature of the programme ([0012](0012-scholarship-holder-survey.md)); one moving answer is
visible there, and the maintainer accepts that honest small cohorts will stay noisy.

## Decision

1. A survey can be saved with a **changed score at most three times in any rolling 24 hours**. A save that does not
   change the score (for example only the grade basis) does not count. Creating the first survey does not count.
2. A save over the limit is **rejected**. The user is told when they can save again; nothing they typed is lost.
3. The what-if ruler is not affected: it never saves.
4. **Deleting the survey does not reset the limit.** After a deletion the server keeps only the identity hash and the
   times of the score-changing saves from the last 24 hours, and erases them when they are 24 hours old. A survey
   created again within that time counts as a score-changing save. The privacy copy says so: this is the one thing a
   deletion leaves behind, for at most 24 hours.

## Consequences

- Dragging a small cohort's distribution by editing one's own score becomes slow.
- An honest user who mistypes their average several times in a day has to wait.
- "Delete removes everything" ([0011](0011-documented-product-events-deleted-with-survey.md)) gets a stated,
  time-limited exception.
- The limit is enforced on the server; the client only explains it.

## Alternatives considered

No limit (simplest, but leaves the cheapest abuse open); counting every save (punishes harmless edits); a limit that a
deletion resets (one delete-and-create bypasses it); keeping the trail longer than 24 hours (more protection than the
limit needs, and a longer exception to deletion).
