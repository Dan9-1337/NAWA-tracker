# 0012. A survey for scholarship holders: preparatory centre, wished-for field and university, shown only to contributors

Status: Accepted. Implements point 5 of [0008](0008-refocus-on-score-comparison.md). Disclosure floor and results page changed by [0016](0016-scholarship-holder-results-page-without-minimum.md).

## Context

[0008](0008-refocus-on-score-comparison.md) dropped application statuses and promised a separate, later flow only for
people who received a scholarship. The 2026 intake is not fully over (only partial results have been announced), and
the people who received the scholarship are now on the preparatory course or at university and still remember their
choices. A tracker of document-review statuses is not coming back: it is too late in the season for it.

What applicants do not know and NAWA does not publish: on the "preparatory course, then studies" path, where NAWA sends
people for the course (the course lasts one academic year, targets level B2, and is held "w ośrodku wskazanym przez
NAWA", Ogłoszenie 13/2026 and 14/2026), and which fields and universities the scholarship holders wanted.

How many scholarship holders there are (NAWA news; no per-country numbers are published):

| Intake | Dyrektor NAWA, first-cycle / long-cycle | Applications for that scholarship | Countries (all levels) | Largest groups |
| --- | --- | --- | --- | --- |
| 2025 | 440 | 896 | 26 | Belarus, Ukraine, Lithuania, then Czechia, Kazakhstan |
| 2024 | 502 | not given | 20 | Belarus, Ukraine, Lithuania, then Czechia, Kazakhstan |
| 2022 | 470 | 1041 formally correct | not given | Belarus, Ukraine, Lithuania, Kazakhstan |

About 450–500 holders a year spread over 20–26 countries, most of them from three to five countries, and the survey
will reach only part of them. A cell of ten answers per country is realistic only for the largest countries; the rest
fall back to a country group or the whole track. In a country with three holders, anyone who sees the numbers can work
out the others' choices, so a disclosure floor is needed even for an audience of contributors.

The preparatory course is run only by centres that hold a NAWA accreditation for 2026/27–2028/29 and won the course
call: about ten universities. A centre is a university together with the unit that runs the course, for example UMCS
in Lublin, where the course is run by CJKP UMCS.

Sources: [NAWA, 11.09.2025](https://nawa.gov.pl/nawa/aktualnosci/oglaszamy-wyniki-tegorocznej-edycji-programu-anders-nawa),
[NAWA, 16.09.2024](https://nawa.gov.pl/nawa/aktualnosci/znamy-wyniki-naboru-do-tegorocznej-edycji-programu-anders-nawa),
[NAWA, 30.09.2022](https://nawa.gov.pl/nawa/aktualnosci/anders-nawa-mlodziez-polonijna-moze-utrzymac-lacznosc-z-krajem),
[Ogłoszenie 13/2026](https://www.nawa.gov.pl/images/Anders-I-stopien/Ogloszenie_13_2026_z_31.03.2026_Anders_NAWA_studia_I_stopnia_i_jednolite_magisterskie.pdf),
[Ogłoszenie 14/2026](https://www.nawa.gov.pl/images/Anders-I-stopien/II-stopien/Ogloszenie_14_2026_z_31.03.2026_Anders_NAWA_studia_II_stopnia.pdf),
[NAWA accreditation 2026](https://nawa.gov.pl/en/jezyk-polski/akredytacja-nawa/nabory-akredytacyjne/postepowanie-trwajace-2026),
[Kursy przygotowawcze NAWA 2026](https://nawa.gov.pl/images/Kursy-Przygotowawcze-NAWA/2026/Ogloszenie_2026.pdf).
The per-country limits in Ogłoszenie 13/2026 could not be read reliably and are not used here.

## Decision

1. **Who answers.** People who say they received the Dyrektor NAWA scholarship for first-cycle or long-cycle studies in
   the **2026 intake**. Earlier intakes are not invited. Answers are kept per intake year, like the surveys.
2. **Questions, in this order.**
   1. The path: preparatory course, then studies; or studies directly. Those who went directly skip the next question.
   2. **The preparatory centre**, from a **closed list**: one entry per centre, named as the university and the unit
      that runs the course ("UMCS — CJKP UMCS"). There is no "other" option and no free text. The list is built from
      the NAWA results whose source the maintainer supplies, and is kept per intake year.
   3. **The field (kierunek) the person wanted to study**: from a list of kierunek names that is as complete as
      possible, each mapped to its ISCED-F detailed field. The person can always type their own instead, up to 80
      characters.
   4. **The university the person wanted**: from the university catalogue already in the repository.
3. **Typed fields are private.** A typed kierunek is never shown to anyone except the maintainer, who uses it to extend
   the list. Until it is added to the list it counts as "other" in every aggregate.
4. **Only contributors see the results.** The aggregates (centres, fields, universities) are visible only to people
   who have answered this survey themselves.
5. **Disclosure floor.** A cell is shown from **10 answers**, with the same ladder as the score comparison
   ([0003](0003-cohort-ladder.md)): country, then country group, then the whole track. Fields are shown by their
   ISCED-F area; an exact kierunek name is shown only when its own cell reaches the floor.

## Consequences

- Applicants of the next intake who contributed nothing see nothing from this survey; scholarship holders get the
  aggregates of their peers in exchange for their answers.
- Most countries will see group- or track-level results; per-country cells will exist only for the largest countries.
- The kierunek list needs ongoing work: the maintainer reviews typed answers and adds them, with their ISCED-F field.
- The centre list must be ready before the survey opens, and a centre missing from it cannot be reported.
- The survey needs its own storage, contracts and tests; the unused status and prep-city columns of 0007 and 0008 are
  not reused for it unless the implementing task shows they fit.

## Alternatives considered

Showing the results to everyone (more reach, but exposes scholarship holders' choices to people who gave nothing);
centres as cities from `shared/prep-course-cities.ts` (loses which unit runs the course, and the city list was never an
official one); "other centre" with free text (the list is short and official, so a typed centre would be noise or a way
to identify someone); only ISCED-F fields without kierunek names (aggregates well, but people do not think in ISCED
codes and niche kierunki would vanish); only kierunek names without a mapping (hundreds of near-empty cells); inviting
holders from earlier intakes (more answers at once, but different centres and rules per year).
