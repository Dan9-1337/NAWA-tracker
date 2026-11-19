# 0004. Outcomes are self-reported, per intake year, disclosed in 5-point bands

Status: Superseded by [0008](0008-refocus-on-score-comparison.md)

## Context

The scarce, valuable data is what scores actually won in which country, and NAWA does not publish cut-off scores or
per-country limits. A score is a deterministic formula any applicant can compute; the cut-off is the unknown. The
score of the lowest awarded applicant in a small cohort is one person's score.

## Decision

- Applicants report a final outcome: awarded, passed merit with no seat, or merit negative. Records are keyed by
  `(account, intake year)`, so the archive builds up across years and a person who reapplies adds a new record.
- Disclosure needs at least 3 awarded responses in a cohort ([0003](0003-cohort-ladder.md)); awarded and not-awarded
  scores are rounded outward to 5-point bands, never exact minima or maxima; counts and the awarded rate are shown.
- Any later stage can be reported directly, so people who join after the results can add an outcome in one step;
  going back is not allowed, and the two seat decisions can be corrected into each other.
- The official totals by year are shipped as static data next to the community numbers.

## Consequences

- The product's long-term value is the archive, not the live dashboard.
- Data is unverified by design: it is labelled as such and is never presented as a forecast.
- Banding trades precision for protection; 5 points is a judgement call that can be revisited with real data.
- Self-reports carry survivorship and enthusiasm bias; nothing here corrects for it.

## Alternatives considered

Exact min/max (identifies individuals); a verified-outcome flow with documents (heavy, and a data-protection burden
the project does not want); tracking status transitions over time (needs returning users and push messages).
