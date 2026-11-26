# 0016. Scholarship-holder results on a separate page, with all countries and no minimum number of answers

Status: Accepted. Changes points 5 (disclosure floor) and where the results are shown in
[0012](0012-scholarship-holder-survey.md); the rest of 0012 stands. Holder scores shown to everyone by [0017](0017-orientation-mark-from-holder-scores.md).

## Context

[0012](0012-scholarship-holder-survey.md) showed the scholarship-holder results inside a dashboard card. Each cell
needed 10 answers and went through the country → group → track ladder. With about 450–500 Director holders a year
spread over 20–26 countries, almost every cell would stay hidden. [0015](0015-compare-within-citizenship-country-without-minimum.md)
already dropped the floor and the ladder for the score comparison, on the grounds that the app publishes no names.

The maintainer wants to see in one place who wanted which field and university, and where NAWA sent people for the
preparatory course.

## Decision

1. **No minimum number of answers.** Every count in the results is shown from the first answer: preparatory
   centres, ISCED-F field groups, exact kierunki from the catalogue, wished-for universities, and the split between the
   two paths. No country group or whole-track tier is used, and there is no "Other" row for small cells.
2. **A separate page.** The results are a page of their own, opened from the scholarship-holder card on the
   dashboard. The card keeps the person's own answers with Edit and Delete.
3. **All countries, with a filter.** The page opens on all countries together. A filter narrows it to one country of
   citizenship (the survey's `ranking_country`).
4. **Only contributors see it**, as in 0012: a person who has not answered the survey has no way to the page, and the
   server refuses the results to them.
5. Kept from 0012: a typed kierunek is seen only by its author and the maintainer, and in every count it is "other"
   until the maintainer adds it to the catalogue. Reports whose survey is `is_suspicious` are excluded.

## Consequences

- Holders see real numbers from the start instead of a "too few answers" message.
- In a country with a few holders, people who know each other can guess who chose what. The maintainer accepts this:
  the page shows no names.
- A few fake reports move small countries' numbers. The protection is the same as for the score:
  [0013](0013-limit-on-score-changing-edits.md) does not apply to reports, so only the spike review of surveys
  ([0014](0014-flag-per-country-spikes-for-manual-review.md)) and the one-report-per-survey rule limit them.
- The privacy copy that promised a floor of 10 answers has to change.

## Alternatives considered

Keeping the floor for wished-for fields and universities and dropping it only for centres (the maintainer chose to
drop it everywhere); showing the page to everyone (more reach, but holders lose the reason to answer); only the
viewer's own country (hides where people from other countries were sent); keeping the results inside the dashboard card
(too much for one card once all lists and the filter are shown).
