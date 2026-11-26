# 0014. Flag per-country spikes of new surveys and hold them for manual review

Status: Accepted

## Context

Each Telegram account has one survey per intake year ([0002](0002-pseudonymous-identity.md)), and score edits are
limited ([0013](0013-limit-on-score-changing-edits.md)). Someone with many accounts can still flood one country's
cohort with invented answers; in a cohort of ten or twenty, a dozen fakes decide the median. Nothing sets
`is_suspicious` since [0008](0008-refocus-on-score-comparison.md).

Honest traffic also comes in waves: at the public launch, when an intake opens, and when a post in a country's chat
brings many people at once. Excluding answers automatically at those moments would hit honest users.

## Decision

1. **A spike** is when the number of new surveys with the same country of citizenship created in the last hour is
   greater than **max(10, 5 × that country's average hourly number of new surveys over the preceding 14 days)**. The
   floor of 10 keeps small countries from tripping on a handful of people.
2. The surveys created in that hour for that country are marked `is_suspicious` and **left out of every statistic**
   until the maintainer reviews them. Their owners see their own score and the dashboard as usual and are not told.
3. **Quiet periods.** No survey is flagged during the first **7 days** after the public launch of the app and after the
   opening of each intake (`documentsFrom` of the season calendar).
4. **Review is manual.** The maintainer checks flagged surveys in the database and clears or keeps the flag. There is
   no notification and no admin screen.

## Consequences

- A burst of fake answers for one country stops reaching the statistics until someone looks at it.
- An honest wave outside the quiet periods (for example a post in a large chat) is held out of the statistics until
  the maintainer reviews it; if nobody looks, those answers stay excluded.
- The maintainer has to check the flag regularly; this is an operational duty, not a product feature.
- The thresholds are a first guess; changing them is a new decision.

## Alternatives considered

Excluding nothing and only marking spikes for review (no protection until someone looks); a fixed number per hour
(trips on large countries and misses small ones); no quiet periods (flags the launch and every intake opening); a
Telegram notification to the maintainer (rejected by the maintainer: manual checks are enough); waiting for real
traffic data before deciding (leaves cohorts unprotected at launch).
