# 0021. Official award counts per country as context, never as a forecast

Status: Accepted

## Context

A user from Kazakhstan sees "1 из 4" and cannot tell what that means: four surveys in the app are a small part of a
competition for a handful of places. NAWA publishes how many Director's scholarships went to each country, in its
annual activity reports (`Sprawozdanie z działalności NAWA`, 2018–2024), in the tables of the Anders NAWA programme.
Applications are evaluated within quotas per country or group of countries (the call notices say so), and in the
first-cycle table for 2020 the share of awards among applications is about a third for Belarus, Ukraine and
Kazakhstan alike. So the count of awards in a country is the honest size of the competition the user is in.

The sources are limited. News items of 2020–2025 name the leading countries without numbers; the 2025 per-country
table is not published yet; the 2018 report is a scan; 2021 has an extra one-year pool for Belarus. The reports give no
score cut-offs.

## Decision

1. For the user's country of citizenship the hub may show one line with the number of Director's scholarships NAWA
   awarded to citizens of that country, the year, and the source: "В 2024 NAWA выдало гражданам Казахстана 16 стипендий
   (отчёт NAWA за 2024)".
2. The figure is for **first-cycle and long-cycle studies**, the track the app models ([0005](0005-only-nawa-director-track-is-live.md)),
   as awarded ("przyznane finansowanie", before resignations), from the latest annual report that lists the country.
   Only 2022–2024 are kept; they are the years with a per-country table in the form the app needs.
3. The data is a static table in `shared/`, transcribed by the maintainer's implementation task from the report and
   updated once a year. A country without a row in the report gets no line.
4. The line is past, official data. It is never combined with the user's position into a chance, a forecast or a
   cut-off, and it never replaces the `ориентир 2026`, which stays labelled as holders' answers ([0017](0017-orientation-mark-from-holder-scores.md)).
5. The app reads nothing from NAWA at runtime.

## Consequences

- When a country has few surveys the screen still carries a real, sourced number about the competition.
- Someone has to update the table every year after NAWA publishes its report, and a wrong transcription is a wrong
  public number: the implementation task requires a spot-check against the report pages.
- If NAWA stops publishing per-country tables, the line disappears for new years and the last year stays labelled with
  its year.

## Alternatives considered

No external data (leaves four surveys with no scale); scraping NAWA pages at runtime (fragile, and pages carry no
numbers); showing 2018–2021 history (different programme rules and a scan with OCR errors); a trend chart of awards
(more to read, which is the opposite of the hub's rule in [0020](0020-dashboard-hub-and-pages.md)); using awards to say
"you are inside the quota" (a forecast, which AGENTS.md forbids).
