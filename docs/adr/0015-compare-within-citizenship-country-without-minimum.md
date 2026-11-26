# 0015. Compare within the country of citizenship, with no minimum number of responses

Status: Accepted. Supersedes [0003](0003-cohort-ladder.md).

## Context

[0003](0003-cohort-ladder.md) showed a position only inside a cohort of at least 10 responses: the applicant's
country, otherwise a country group (`country_groups`), otherwise the whole track. Most countries have few applicants,
so most users were compared with a pool of other countries rather than with their own.

The maintainer's view: the scholarship has one score rule, the merit threshold of 60 points (Ogłoszenie 13/2026,
§2.7), and the selection is made by the applicant's (non-Polish) country of citizenship. A comparison with other
countries does not answer the applicant's question. Surveys are pseudonymous ([0002](0002-pseudonymous-identity.md)),
and the app publishes no names, so a score seen in a small country is not tied to a person by the app.

## Decision

1. **The comparison cohort is the applicant's country of citizenship** (`ranking_country`) on their track and intake
   year. Country groups and the whole-track tier are no longer used to compare.
2. **There is no minimum number of responses.** The position (rank, percentile, median, distribution) is shown for
   the country as soon as it has responses, with the number of responses shown next to it.
3. Surveys marked `is_suspicious` stay out of the statistics, as before ([0014](0014-flag-per-country-spikes-for-manual-review.md)).

## Consequences

- Every user sees their own country, but with few responses the numbers are noisy, and the response count next to
  them is the only warning.
- In a country with a handful of applicants, people who know each other can guess whose score is whose. The
  maintainer accepts this: the app shows no names.
- A few fake answers move a small country's numbers more. The edit limit ([0013](0013-limit-on-score-changing-edits.md))
  and spike review ([0014](0014-flag-per-country-spikes-for-manual-review.md)) are the protection.
- `min_cohort_size()` / `MIN_COHORT_SIZE` and the `country_groups` table are no longer used by the score comparison.
  This decision does not cover their other uses: the disclosure floor of the scholarship-holder results
  ([0012](0012-scholarship-holder-survey.md)) and the landing-page response counter stay as they are.
- Product ideas that depend on a cohort "opening" at 10 responses (for example a bot message when it does) are dropped.

## Alternatives considered

Keeping the ladder of 0003 (users are compared with other countries, which the selection does not do); a small floor
such as 3 responses for the median and distribution (the maintainer chose no floor); dropping the floor only for the
scholarship-holder results (the maintainer chose to drop it for the score comparison).
