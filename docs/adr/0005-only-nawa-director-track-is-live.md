# 0005. Only the NAWA Director track is live

Status: Accepted

## Context

The call offers three scholarships. For the Minister of Health and Minister of Culture, NAWA only receives
applications; the ministries decide. The Health rules rank preparatory-course candidates by the average of their
certificate and send direct-study candidates to a separate ministry recruitment; the Culture rules rank by grades and
then require art-university exams, and no formula or threshold was found for either. The Director track has a
published formula (grades 0-90 plus a 0/5/10 Polish-school bonus, minimum 60) and country lists.

## Decision

Only `nawa_director` can be created. The Health and Culture values stay in the enums, constraints and a few branches
so they can return, but they are hidden from the UI and rejected by the API. They come back when their scoring
documents are modelled (the Health appendix 1 and the Culture scoring rules).

## Consequences

- One scoring model, one cohort definition, one set of copy.
- Dormant code paths (about 17 branches on the track) are untested and will need work when the tracks return.
- Applicants to the ministry tracks are not served yet.

## Alternatives considered

Shipping all three with a score for every track (would present numbers with no basis); deleting the other tracks from
the schema (cheap now, a migration later).
