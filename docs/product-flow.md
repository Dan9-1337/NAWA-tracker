# NAWAmeter product flow

Product intent, in-app questionnaire flow, and how it relates to official Anders NAWA documents for intake **13/2026**.

Official sources:

- [Ogłoszenie 13/2026 — Anders I stopień / jednolite magisterskie](https://www.nawa.gov.pl/images/Anders-I-stopien/Ogloszenie_13_2026_z_31.03.2026_Anders_NAWA_studia_I_stopnia_i_jednolite_magisterskie.pdf) — eligibility, scoring, country seat limits
- [Zał. 1 — Regulamin programów NAWA](https://www.nawa.gov.pl/images/Anders-I-stopien/Ogloszenie_13_2026_Zal._1_Regulamin_programow_NAWA__Programy_dla_os._fizycznych_podejmujacych_ksztalcenie_odbywajacych_pobyty_na.pdf) — shared process shell (System, formal/merit, Director decision, contract)

NAWAmeter is **not** a substitute for `programs.nawa.gov.pl`. It is an unofficial community orientation tool.

## Product intent

What we optimize for:

1. **Collect declared grades (and related inputs) by citizenship country** so cohorts are comparable.
2. **Show each user who they are and where they stand** among other declarers (score, percentile, country context, community pulse) — orientation only, never an official ranking or forecast.
3. **Freeze the intake dataset after the season** and keep it read-only until the next nabór.

What we deliberately do **not** model as product priorities:

- Formal rejection / “bez rozpatrzenia” / request for supplementary documents
- Full NAWA System paperwork (attachments, translations, parental consent, etc.)
- Post-award contract, payments, reporting, appeals

Status updates that users report (formal positive → merit → award/negative) exist to improve community signal and passport UX, not to mirror every official branch of the procedure.

## Season lifecycle

```text
Open intake  →  collect + live community stats  →  freeze dataset  →  next nabór (new season)
```

During freeze: historical orientation remains available; new writes for that season stop (exact freeze mechanism is an ops/product decision for end of 2026 intake).

## In-app user flow

Channel: Telegram Mini App only (`gate` → `loading` → `create` | `authenticated`). No URL router.

### Start

- Pitch + result preview
- Track entry: **NAWA Director** available; Health / Culture marked coming soon
- Optional resume of local draft
- FAQ (what you see / how it works)

On first save, status is set automatically to `submitted` + today’s date (not asked in the wizard).

### Wizard (create / edit)

#### Step 1 — Basics (`application`)

| Question | Values / notes |
| --- | --- |
| Do you hold Polish citizenship? | Yes / No. Yes → track locked to `nawa_director` (matches Ogłoszenie: dual Polish citizens only Dyrektor NAWA) |
| Scholarship path | `preparatory_course` or `direct_studies` |
| Target university | Only if `direct_studies`; NAWA framework partners for the track |

Track selection for non–Polish-citizenship users will matter when Health/Culture open; today only Director is selectable.

#### Step 2 — Education

| Question | Role |
| --- | --- |
| Country of citizenship (`rankingCountry`) | Comparison cohort / country list (Ogłoszenie: lists by non-Polish citizenship) |
| Country of secondary school completion (`schoolCountry`) | Default grading scale for the calculator |

#### Step 3 — Grades

| Question | Role |
| --- | --- |
| Average grade | Declared certificate average |
| Maximum grade on scale | Often locked from school country |
| Polish / Polonia school level | `none` / `primary` (+5) / `secondary` (+10); Director only |
| Live orientation score preview | `(avg / max) × 90 + bonus` |

Formula and 60-point merit threshold align with Ogłoszenie §2.7 for Dyrektor NAWA (`shared/nawa-score.ts`, `nawaOrientationThreshold = 60`).

### Confirm

Summary of cohort-defining fields + grades + auto `submitted` → create (`POST`) or update (`PUT`).

### Dashboard (authenticated)

- Community statistics by track + citizenship country (k-anonymity: details need cohort ≥ 10)
- Optional sequential status updates + date
- Edit profile (same wizard), Settings, Radar, delete profile

Reported status ladder (product-simplified):

```text
submitted
  → formal_review_positive
    → merit_review_positive → scholarship_awarded
    → merit_review_negative
```

No `formal_review_negative` by design (see intent).

## Mapping to Anders Ogłoszenie 13/2026

### Aligned with product scope

| Official (Ogłoszenie) | NAWAmeter |
| --- | --- |
| Three scholarships: Dyrektor / MKIDN / MZ | Same three tracks; only Director live |
| Dual Polish citizenship → only Dyrektor | Polish citizenship locks track to Director |
| Path: preparatory + studies **or** direct studies | Same two `studyRoute` values |
| University choice binds which scholarship you apply for (Dyrektor / MKIDN / MZ) | `targetUniversity` filtered by scholarship (Director partners) |
| Merit points: grades 0–90 + Polonia school 0/5/10, max 100 | Same orientation formula |
| Merit pass threshold 60 | Threshold used as orientation signal |
| Seats by citizenship country / country groups | Country cohort + allocation-oriented cards (community estimate, not official limits) |
| Deadline 9 Jul 2026; results by 30 Sep 2026 (Director) | Season timeline; then freeze |

### Out of product scope (intentionally thin or absent)

| Official | NAWAmeter stance |
| --- | --- |
| Formal assessment fail / one-time supplements | Not tracked — we care about people who stay in the pipeline for grades-by-country |
| Attachments (passport, Karta Polaka, świadectwa, ORPEG, consent <18, translations) | Not collected |
| Eligibility edge cases (matura ≥2024, continuing students 4.75→100 pts, prior scholarships, Belarus exceptions, etc.) | Not fully gated in UI; orientation tool assumes eligible declarers |
| MKIDN / MZ separate merit & decision | Coming soon tracks; scoring/decision not NAWA’s formula |
| Director decision after merit list; contract; travel lump sum; reports | Not in scope |
| Regulamin appeal / System account | Not in scope |

## Mapping to Regulamin (Zał. 1)

Regulamin defines the shared shell: System registration → submit → formal → merit (if any) → Director decision → contract. Field-level Anders rules live in the Ogłoszenie, not in the Regulamin.

Our statuses are a **lossy projection** of that shell for community storytelling. Formal rejection branches are omitted on purpose.

## Gaps vs Ogłoszenie (product-relevant watchlist)

Checked against live PDFs (both URLs resolve). Items below are **not** “missing paperwork” — they affect grades-by-country orientation quality or “where do I stand”.

| Gap | Official rule | Current product | Why it matters |
| --- | --- | --- | --- |
| University always asked | Applicant always picks a university → that declares Dyrektor / MKIDN / MZ | Only for `direct_studies`; preparatory skips it. Uni **can be edited later** in NAWAmeter | Optional for current Director-only orientation; matters when other scholarships open (uni across ministries = scholarship change) |
| Merit pass ≠ seat | ≥60 = eligible; seats by country / country **group** go to highest scores | No status for “merit ok, no seat” | **Deprioritized:** product assumes people who would clearly fail (<60) self-select out; among declarers the fight is mainly seat quotas, and we already collect award / merit-negative outcomes |
| Country **groups** | Official limits may be for groups, not only single countries | Illustrative allocation, not official 2026 groups | Don’t imply real quotas |
| Belarus × Polonia bonus | Polonia school points **nie dotyczy obywateli Białorusi** | **Fixed:** bonus 0 for `BY`; UI notice cites pkt 2.7 kryterium 2 | — |
| Continuing students in PL | ≥4.75 (scale 2–5) → **100 pts** | Same grade formula as school leavers | Those users look weaker than officially |
| Dual citizens copy | Ranking by **non-Polish** citizenship | Ask “country of citizenship”; PL not pickable | Copy could be clearer for dual citizens |
| Health paths | MZ allows preparatory **or** direct | Validation forces preparatory only | Revisit before Health launch |
| Season freeze timing | Deadline 9 Jul; Director results by 30 Sep | Freeze still an ops decision | Freezing at deadline loses post-July merit/award signal |

Intentionally still out of scope (confirm OK): Karta Polaka / attachments, formal fail, appeals, contract, travel lump sums, double-degree ban, philology exclusions, matura year ≥2024 gate.

## Implementation pointers

| Area | Location |
| --- | --- |
| State machine | `src/pages/HomePage.tsx` |
| Create / wizard / confirm | `src/features/CreateProfileFlow.tsx`, `ResponseWizardSteps.tsx`, `ConfirmSummary.tsx` |
| Dashboard | `src/features/ProfileDashboard.tsx`, `statistics/StatisticsPanel.tsx` |
| Contracts / statuses | `shared/contracts.ts`, `shared/status-options.ts` |
| Score formula | `shared/nawa-score.ts` |
| Layout of dashboard cards | `shared/dashboard-layout.ts` |

## Changelog

### 2026-08-09 — Initial product-flow note

- Documented product intent: grades-by-country collection, orientation (“who/where”), season freeze.
- Explicitly deprioritized formal-rejection branches.
- Mapped wizard fields and statuses to Anders Ogłoszenie 13/2026 and Regulamin Zał. 1.
- Added product-relevant gaps watchlist after re-checking both live PDF URLs.
