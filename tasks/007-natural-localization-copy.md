# 007 — Natural, consistent copy in all five locales

**Status:** Draft

## Goal

The interface text in `src/i18n/{pl,en,ru,uk,be}.ts` often reads like a word-for-word translation from code identifiers or from another locale. A native speaker should read every screen as if it had been written in their language. That means natural terms for the domain (recruitment round, survey, estimated score), one term per concept within a locale, no developer jargon, and no labels that point to buttons which do not exist.

This task changes wording only. Keys, function signatures, numbers, thresholds, and the meaning of every message stay the same.

## Context

- Relevant code and docs: `src/i18n/*.ts`, `src/i18n/plural.ts`, `src/i18n/locales.test.ts`, `src/i18n/response-count.test.ts`, [Product flow](../docs/product-flow.md).
- ADRs this task follows (link the replacement if applicable; otherwise write `None`): [0005](../docs/adr/0005-only-nawa-director-track-is-live.md) (only the NAWA Director scholarship is live), [0008](../docs/adr/0008-refocus-on-score-comparison.md). Replaces none.
- Dependencies and decisions already made:
  - Maintainer (2026-11-22): translations must sound natural to a native reader. In particular, the recruitment round must not be rendered as the English word *intake*.
  - Task 002 introduced `start.responseCount`; task 003 introduced `scoreScreen.percentileBand`. This task rewords them but keeps their signatures.

## Findings (review of the current copy)

### Cross-locale

| # | Problem | Where |
| --- | --- | --- |
| X1 | The recruitment round is called *intake* in EN (`responseCount`, `seasonClosed`, `privacyNotice.points[0]`). The word belongs to UK university admissions; NAWA calls it a *call for applications* / *recruitment*. | en |
| X2 | One concept, several words: the saved questionnaire is *survey / response / profile* (en), *анкета / опрос / ответ / профиль* (ru), *опитування / профіль* (uk), *апытанне / профіль* (be), *ankieta / profil* (pl). In ru/uk/be, *опрос/опитування/апытанне* means a poll or the act of asking; it is not a filled-in form. | all |
| X3 | The score is both *estimated* and *preliminary*: ru `Ориентировочный балл` vs `Предварительный расчёт`; uk `Орієнтовний` vs `Попередній`; be `Арыентыровачны` vs `Папярэдні`. | ru, uk, be |
| X4 | The code identifier *track* leaks into copy: pl `ścieżka Dyrektora NAWA` (twice plus a title), ru `по всей программе Директора NAWA`, be `па ўсёй стыпендыі`. The real name is the NAWA Director *scholarship*. What the user needs to know is "all candidates", not the name of an internal grouping. | pl, ru, be (`dashboard.smallCountry.*`) |
| X5 | Programme name. Checked 2026-11-22: NAWA itself uses the short name *Anders NAWA* on nawa.gov.pl, for example "Anders NAWA – the calls for applications are open!". The full English name there is *the gen. Anders Programme*; in Polish it is *Program im. gen. Władysława Andersa*. NAWA has no ru, uk or be pages. Whether to change the current `Anders NAWA` is decision D4. | `about.intro`, `settings.inviteText`, all locales |
| X6 | `inviteText` puts a country name after *from the country* (`из страны Беларусь`, `з країни Україна`, `z kraju: Białoruś`), which sounds unnatural. | ru, uk, be, pl |
| X7 | Developer jargon: *Danger zone* (`deleteZoneTitle`); *one-way key* (`privacyNotice.body`, `about.privacyBody`); `Telegram id` in lower case. Fact for the rewording: the key is `HMAC-SHA256(IDENTITY_PEPPER, telegram id)` (`api/_lib/identity.ts`, [ADR 0002](../docs/adr/0002-pseudonymous-identity.md)). Telegram IDs can be enumerated, so whoever holds the pepper can match an ID to its key. The copy must not claim that the ID "cannot be recovered". | all |
| X8 | `averageAboveMaximum` accuses the user of lying (`Ай-ай-ай … Давайте по-честному`, `Давайте чесно`, `Давайце сумленна`, `Trzymajmy się faktów`). Usually the user has just mistyped. EN is already neutral. | ru, uk, be, pl |
| X9 | `whatIfNote` points to a button that does not exist: en `“Edit profile”`, ru `«Изменить анкету»`. The real label is `settings.editProfile`. | en, ru |
| X10 | The draggable ruler is a *ruler / лента / стрічка / стужка*. *Лента* reads as a feed or ribbon. pl already says *skala*. | en, ru, uk, be |

### Per locale

| # | Key | Current | Problem |
| --- | --- | --- | --- |
| R1 | ru `scoreScreen.whatIfLabel` | `Примерка: балл при другом среднем балле` | *Примерка* is a word for trying on clothes, and "балл … балле" repeats. |
| R2 | ru `responseCount` | `312 ответов за набор 2026` | *за набор* is colloquial; with X2, count questionnaires. |
| R3 | ru `rankingCountryHint` | `вас будут ранжировать` | Bureaucratic. |
| R4 | ru/uk/be `polishSchoolLevel.*` | `Уровень начальной школы` | Answers to a yes/no question should start with *Да/Так*. |
| R5 | ru `formulaDisclaimer` | `Порог не гарантирует стипендию` | Means "the threshold does not guarantee…"; the intended meaning is "passing the threshold…". |
| U1 | uk `scoreScreen.whatIfLabel` | `А що, якщо: бал за іншого середнього бала` | Ungrammatical. |
| U2 | uk `labels.applicantKind` | `У якій якості ви подаєтеся?` | Calque from Russian. |
| B1 | be `start.previewAboveMedianBy` and the hero lines | `на … бала вышэй` | Lower-case start, unlike the other locales. |
| B2 | be `belarusPoloniaBonusNotice` vs `nawaScore.previewNote` | `pkt … kryterium` vs `п. … крытэрый` | The same citation is formatted two ways. |
| P1 | pl `scoreScreen.percentileBand` | `≈ więcej niż u 70–80% grupy` | Ungrammatical, and differs from `percentileLine` (`Wyżej niż …`). |
| P2 | pl many keys | `porównywany/a`, `ukończyłeś/aś` | Slash forms. Neutral phrasing is possible (`Porównamy Cię…`, `Czy masz za sobą…`). |
| E1 | en `polishSchoolLevel`, `howScoreBody` | `Polonia school` | Not English. Use *Polish community (Polonia) school*. |
| E2 | en `whatIfLabel` | `Simulation: score with a different average` | Stiff. Use *What if your average were different?*. |

## Scope

- In scope:
  - Reword the strings in `src/i18n/{pl,en,ru,uk,be}.ts` that the findings above list, using the glossary under **Open decisions** once the maintainer has approved it.
  - Apply the glossary to every string in each locale, not only the listed ones, so that each concept has exactly one term per locale.
  - Update test expectations that quote changed copy (for example `src/i18n/response-count.test.ts`, `src/features/**/*.test.tsx`), changing only the expected strings.
  - Add a locale test that fails if any locale contains a banned term from the glossary (for example `/intake/i` in en, `/опрос/i` in ru, `/ścieżk/i` in pl, `/Danger zone/`).
- Out of scope: new keys or removed keys; copy outside `src/i18n` (API error messages in `api/`, bot messages, docs); layout or component changes; changing numbers, thresholds, plural rules in `plural.ts`, or the meaning of any message.
- Files or directories assigned to this task: `src/i18n/*.ts`, `src/i18n/*.test.ts`, test files under `src/` whose only change is quoted copy.

## Acceptance scenarios

| ID | Given / when | Expected result | Planned verification |
| --- | --- | --- | --- |
| A1 | Any en string | Contains no *intake*; the round is called by the approved term (D1) | Banned-term locale test |
| A2 | Each locale | The saved questionnaire is always the approved term (D2); ru/uk/be use no *опрос/опитування/апытанне* for it | Banned-term locale test + reviewer read-through |
| A3 | Each locale | The score uses one adjective (D3) everywhere | Banned-term locale test (e.g. ru `/Предварительн/`) |
| A4 | `dashboard.smallCountry.*` in all locales | No *ścieżka / track / по всей программе*; compares with "all candidates" | Banned-term locale test |
| A5 | `whatIfNote` in every locale | The quoted button label equals `settings.editProfile` of the same locale | New locale test asserting `whatIfNote.includes(settings.editProfile)` |
| A6 | `averageAboveMaximum` in every locale | Playful, says the value is above the scale, suggests a typo and asks the user to check it; contains no accusation of dishonesty (`по-честному`, `чесно`, `сумленна`, `faktów`) | Banned-term locale test + reviewer read-through against D5 |
| A7 | Keys and arity | Unchanged; plural forms still correct (`1 / 3 / 25 / 2,5`) | `npm test -- src/i18n` |
| A8 | Native read-through | A native or fluent speaker of each locale reads all screens (start, wizard, summary, score, dashboard, settings, about) and flags nothing as unnatural | Manual: maintainer or assigned reviewer per locale |

## Must stay unchanged

- Behavior, contracts, or user-facing copy this task must not alter:
  - message keys, function arity, and the `Messages` type;
  - numbers, thresholds (60, 4.75, 10), the formula text `× 90 /`, and the `Ogłoszenie nr 13/2026, pkt 2.7` citation (only its surrounding wording may change);
  - language endonyms in `language.*`;
  - the disclaimers that the service is unofficial and that statistics are not a forecast (wording may change, but the meaning must remain).
- Existing checks that already cover it: `src/i18n/locales.test.ts` (keys, arity, alphabet checks for uk/be), `src/i18n/plural.test.ts`, `src/i18n/response-count.test.ts`.

## Open decisions

The maintainer answered D4 and D5 on 2026-11-22. For D1 and D2, the maintainer set the rule and asked the task author to propose terms that follow it. D1, D2, D3 and D6 below are those proposals. The task becomes `Ready` once the maintainer confirms them.

- **D1 — Recruitment round (proposal, awaiting confirmation).** The maintainer's rule: use the dictionary meaning, and when no word fits fully, use an alternative. *Intake* means the number of people admitted at one time (Cambridge, Oxford). The word suits university admissions but not a scholarship competition, so it fails the rule. Checked 2026-11-22: on its English pages NAWA calls a *nabór* a *call for applications* ("Calls for proposals 2026", "Call for applications under the gen. Anders Programme is now open"). NAWA does not use *round*. Proposal: en *call*, as in NAWA (`312 responses for the 2026 call`, `The 2026 call is closed`, `one survey per call`); the alternative is *round*. pl *nabór*, ru *набор*, uk *набір* and be *набор* are the natural native terms and stay.
- **D2 — The saved questionnaire (proposal, awaiting confirmation).** One term per locale: pl *ankieta*, en *survey*, ru/uk/be *анкета*. *Profile*, *response*, *опрос*, *опитування* and *апытанне* do not name it in UI copy. `settings.editProfile` becomes *Edit survey* / *Изменить анкету* / *Edytuj ankietę* / *Змінити анкету* / *Змяніць анкету*. *Response* / *ответ* / *odpowiedź* remains only as the unit of statistics, as in "312 responses in the group".
- **D3 — The score (proposal, awaiting confirmation).** en *estimated score*, pl *wynik orientacyjny*, ru *ориентировочный балл*, uk *орієнтовний бал*, be *арыентыровачны бал*. *Preliminary*, *предварительный*, *попередній* and *папярэдні* are dropped.
- **D4 — Programme name (reopened 2026-11-22).** The maintainer chose "the official name" based on the task author's claim that *Anders NAWA* is unofficial. The check showed that claim was wrong: NAWA uses *Anders NAWA* itself (see X5). This needs a new answer from the maintainer.
- **D5 — Tone (decided 2026-11-22).** `averageAboveMaximum` stays playful but does not accuse the user of lying. It assumes a typo, for example ru `Ого, выше максимума шкалы! Похоже на опечатку — проверьте значение.` Every locale follows the same idea, including en, which is currently neutral. Other error messages stay neutral.
- **D6 — Form of address and gender (proposal, awaiting confirmation).** pl keeps the informal *Ty* and replaces `/a` forms with neutral phrasing where possible. ru/uk/be keep the formal *вы* and use `(а)` forms only where no neutral phrasing exists.

## Verification

- `npm test -- src/i18n` → A1–A5, A7.
- `npm test` for any `src/features/**` test whose expected copy changed → A7.
- `make check`.
- Manual: open the app in each of the five locales as a first-time user and as a returning user, and read every screen → A6, A8.

## Handoff

| Scenario | Evidence (command, test assertion, or manual check) | Result |
| --- | --- | --- |
| A1 | | |
| A2 | | |
| A3 | | |
| A4 | | |
| A5 | | |
| A6 | | |
| A7 | | |
| A8 | | |

- Changed files:
- Checks not run, blockers, or open questions:
- LLM contributions: Claude Opus 5.5: specification (review of the current copy, findings, proposed glossary).
