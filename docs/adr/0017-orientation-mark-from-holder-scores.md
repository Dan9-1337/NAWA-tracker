# 0017. "Ориентир 2026": the lowest reported holder score per country, shown to everyone

Status: Accepted. Changes point 4 of [0016](0016-scholarship-holder-results-page-without-minimum.md) (only contributors
see the results) for holder scores only.

## Context

Applicants ask whether their score would have been enough. A scholarship-holder report (task 012) belongs to a 2026
survey that has a score and a country of citizenship. The lowest score among a country's reporting holders is an
honest upper bound on that country's real cut-off: someone with that score was awarded. The data cannot show the
lower bound, because people who were not awarded are not asked.

Future applicants are the main audience, but they will mostly see this through a public "NAWA in numbers" page after
the 2026 data is frozen. That freeze is planned and not decided here. In the 2026 release the mark also gives holders a
reason to answer the survey.

## Decision

1. **The mark.** For each country of citizenship, the **ориентир 2026** is the lowest score snapshot among counted
   Director reports of the 2026 intake, together with their number. It is called `ориентир 2026`, never a cut-off or
   "проходной", and it is labelled as NAWAmeter holders' answers, not NAWA data.
2. **Everyone sees it.** Every user with a 2026 survey sees the mark for their own country of citizenship on the result
   card, the what-if ruler and the full distribution. The holder dots appear only in the full distribution. The other
   holder results (centres, fields, universities) stay visible only to contributors, as in 0016.
3. **No minimum.** The mark is shown from the first holder, and the count is always shown next to it
   ([0015](0015-compare-within-citizenship-country-without-minimum.md)).
4. **Score snapshot.** A report stores the survey's score at the moment it is created or edited, and the mark is built
   from snapshots. The survey stays editable; later edits do not move the mark until the report is saved again.
5. **No holder below 60.** A survey scoring below the merit threshold of 60 cannot be awarded (Ogłoszenie 13/2026
   §2.7). The invitation to the holder survey is hidden for it, and the server refuses such a report.
6. Reports of `is_suspicious` surveys are not counted. Deleting a report or a survey removes its share of the mark at
   once. Keeping anonymised aggregates after deletion belongs to the planned 2026 freeze, not to this decision.
7. Only the 2026 intake. What the mark means for 2027 applicants is decided with the freeze.

## Consequences

- An applicant sees at a glance whether their score reached a level that was awarded in their country.
- With one or two holders in a country, the mark is a single person's score, and acquaintances may recognise it. The
  maintainer accepts this, as in 0015 and 0016, and the privacy copy says so.
- One fake or mistaken report can lower the mark. The count shown next to it, the threshold of 60, and the spike review
  ([0014](0014-flag-per-country-spikes-for-manual-review.md)) are the protection.
- The mark is an upper bound only: a score below it may still have been enough.

## Alternatives considered

The full holder results for everyone (holders would lose the reason to answer); min, median and max, or 5-point bands
(the maintainer chose the lowest score with dots on the distribution and a mark on the ruler); locking the survey after
a report instead of a snapshot (no way to fix a typo); also asking applicants who were not awarded (would bring back
part of the status tracking that 0008 retired; kept as a later idea); "потенциальный проходной" as the name (reads as a
forecast).
