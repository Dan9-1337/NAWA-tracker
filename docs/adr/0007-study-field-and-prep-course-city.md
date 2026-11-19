# 0007. Collect the study field and the prep-course city, aggregate them as field by city

Status: Accepted (built in migration `202611260001`)

## Context

For applicants on the "preparatory course, then studies" path, NAWA decides where the course is held: the call says the
course takes place "in the centre indicated by NAWA", and the assignment depends on the planned field of study and on
the seats available at each centre (Ogłoszenie 13/2026, pkt 2.3). NAWA does not publish who was sent where, and it does
not mediate university admission at all. "Which city will they send me to, given my field?" is a question every
applicant asks and nothing answers.

The application already records the declared university. It does not record the field of study (kierunek), and nothing
records what NAWA decided afterwards.

## Decision

- **Study field**, asked in the application step: one value from the ISCED-F 2013 classification that POL-on (the
  source of the studia.gov.pl catalogue) assigns to every kierunek. It has three levels: 11 broad groups, about 25
  narrow groups and about 70 detailed fields (about 60 after the removals below) (the Polish names come from the POL-on edition of the classification).
  The applicant picks a **detailed field** with search, like the university picker, plus "other" without free text.
  Specific kierunek names are not used: there are thousands, they repeat and change, and cells would stay empty.
  Free text is rejected: it aggregates badly and can carry personal detail.
- **Fields NAWA's Director scholarship cannot fund are left out of the list.** The call has no kierunek whitelist; the
  rules are structural: full-time first-cycle or long-cycle studies, taught in Polish, at a partner university
  supervised by the science ministry, no double-degree programmes, and no applied linguistics or philology other than
  Polish. Removed accordingly: the general-programme group (00: literacy, personal development), vocational skills
  (secretarial, retail, job skills: 0415-0417), crafts (0214), and, because the Health and Culture tracks are out of
  scope ([0005](0005-only-nawa-director-track-is-live.md)), medicine (0912), dentistry (0911) and traditional medicine
  (0917). That leaves about 60 detailed fields. The arts fields (0211, 0212, 0213, 0215) are kept: art universities
  mostly belong to the Culture track, but a few art and design schools do appear on the science-ministry partner list.
- **The programme's philology exclusion cannot be enforced by the field**: Polish philology and other philologies share
  ISCED 0232 (literature and linguistics). Choosing 0231 or 0232 shows a note quoting the exclusion (applied linguistics
  and philologies other than Polish are not funded) instead of blocking the choice.
- **Prep-course city**, asked only after the outcome is "scholarship awarded" on the preparatory-course path: one value
  from a curated list of about 36 Polish academic cities (`shared/prep-course-cities.ts`) plus "other city". The
  catalogue's `city` metadata was not used because it covers only 10 cities. No official list of NAWA course centres
  was found, so the list is not claimed to be one; it can be narrowed once real answers exist.
- **Placement university** (later, optional): the university the person is admitted to, from the same catalogue,
  asked after the next academic year starts. It is a different, later event and is never mixed into the city question.
- **Aggregation** follows the ladder of [0003](0003-cohort-ladder.md): for a detailed field, show its cities when it has
  at least 3 reports, otherwise fall back to its narrow group, then its broad group, then all reports, and say which
  level is shown.
  Within a level a cell "field x city" is shown only from 3 reports; smaller cells are merged into "other cities".
  The country of citizenship is deliberately not part of this view, because field + city + country can single a person
  out in a small cohort (the same reasoning as [0004](0004-outcomes-as-banded-self-reports.md)).
- The declared university stays as is; the view can compare "declared X, sent to Y".

## Consequences

- It answers a concrete applicant question with a dataset that exists nowhere else, and it grows the reason to report
  an outcome.
- It is self-reported and unverified, like every outcome here, and the copy says so. It is also not a promise about
  how NAWA assigns centres: it shows what reporters were told.
- Counts per cell will be small for a long time; many cells will show as "other cities" in the first intake.
- The field list (about 60 names) and the city list are product copy that needs review each intake and five languages;
  the Ukrainian and Belarusian drafts need a native reader.
- Adds fields to a record (`study_field`, `prep_course_city`, later `placement_*`) and one outcome-reporting step.

## Alternatives considered

Free-text field or city (simple to type, impossible to aggregate, and a privacy risk); the 11 broad groups only
(too coarse to be useful); the full catalogue of kierunki (too sparse); a list claimed to be NAWA's official centres
(unknown, would go stale); aggregating by university instead of city (identifies people in small universities and says
less about the real NAWA decision); breaking the view down by country as well (re-identification).
