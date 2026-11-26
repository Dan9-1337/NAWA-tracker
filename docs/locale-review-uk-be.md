# Ukrainian and Belarusian copy: items for a native-speaker review

`uk` and `be` are the main audiences of the app, and their copy is still a draft awaiting a native-speaker review
(assumption C3). A model proofreading pass (task 043) read every string in `src/i18n/uk.ts`, `src/i18n/be.ts` and the
`uk` and `be` bot texts in `shared/bot-messages.ts`. It looked for spelling and agreement errors, Russian forms left in
the text (russisms; Russian letters in Belarusian), untranslated English or Russian fragments, and terms that contradict
the locale glossary ([ADR 0010](adr/0010-locale-glossary-and-english-api-errors.md)). It found no clear error of those
kinds, so it changed no copy.

This file lists what the pass was **not sure enough to change** or considers a matter of style. Nothing here is a
confirmed mistake. For each row, a native speaker decides: accept the proposal, keep the current text, or suggest
something else. Accepted rows are applied by editing the key in `uk.ts` or `be.ts`. Keys, placeholders, plural helpers
and meaning stay as they are. The pass is not a native-speaker review and does not replace one.

How to read the tables: "Confidence" is the model's own estimate that the proposal is better (high, medium or low). Keys
use the dotted path inside the locale object.

Resolved by task 044: the `scholarshipReport.flow.centreTitle` items ("Де проходив" / "Дзе праходзіў") were removed. The verb agrees with "курс" (masculine), not with the person, so the question does not assume the user's gender.

## Ukrainian (`uk`)

| Key | Current | Proposed | Why | Confidence |
| --- | --- | --- | --- | --- |
| `privacyNotice.body` | ...лише числа **по** вашій країні. | ...лише числа **за** вашою країною. | "по" with this meaning is a calque of Russian "по стране"; Ukrainian style guides prefer "за" or "для". Wording is understandable and common in speech. | medium |
| `privacyNotice.points[1]` | ...використовуються для статистики **по групах**. | ...використовуються для **групової** статистики. | Same calque ("по группам"). | medium |
| `start.subtitle`, `start.whatYouSeeBody` | ...становище **відносно** медіани... | ...становище **щодо** медіани... | "відносно" for "in comparison with" is often marked as a russism ("относительно"); "щодо" is the usual choice. "відносно" is not wrong in every sense. | medium |
| `scholarshipReport.title`, `scholarshipReport.invitationBody`, `scholarshipReport.errors.profileNotFound` | ...**Dyrektora** NAWA... | ...**Директора** NAWA... | **Resolved by task 044** (maintainer decision 2026-11-26): translated everywhere, as in `choices.scholarshipTrack.nawa_director`. Applied in `ru`, `uk` and `be`. | resolved |
| `start.resumeTitle` | У вас є збережений **прогрес** | У вас є збережені **відповіді** | "збережений прогрес" reads like game wording. `be` says "захаваныя адказы". | low |
| `telegram.gateBody` | ...щоб **на один акаунт припадала** лише одна анкета. | ...і щоб **кожен акаунт мав** лише одну анкету. | Grammatical but heavy. | low |
| `scoreScreen.belowAxis` | **Нижче порогу** 60 — поза розподілом групи | **Нижче за поріг** 60 — поза розподілом групи | Both constructions are valid. `wizard.averageBelowThreshold` and `scoreScreen.belowThreshold` use "нижче за поріг". Consistency only. | low |
| `start.previewTapeHint` | **Потягніть** лінійку... | **Перетягніть** лінійку... | `scoreScreen.tapeHint` uses "Перетягніть". Consistency only. | low |
| `scoreScreen.averageInputLabel` | Середній бал для **симуляції** | Середній бал для **розрахунку** | "симуляція" is a borrowing; `whatIfLabel` ("А що, якщо") has a plainer tone. | low |

## Belarusian (`be`)

| Key | Current | Proposed | Why | Confidence |
| --- | --- | --- | --- | --- |
| `wizard.belarusPoloniaBonusNotice`, `nawaScore.previewNote` | ...Ogłoszenie nr 13/2026, **pkt** 2.7 (**kryterium** 2)... | ...Ogłoszenie nr 13/2026, **пункт** 2.7 (**крытэрый** 2)... | **Resolved by task 044** (maintainer decision 2026-11-26): translated in `ru` ("пункт 2.7 (критерий 2)") and `be` as `uk` does. The document title stays in Polish in every locale. | resolved |
| `scholarshipReport.title`, `scholarshipReport.invitationBody`, `scholarshipReport.errors.profileNotFound` | ...**Dyrektora** NAWA... | ...**Дырэктара** NAWA... | **Resolved by task 044** (maintainer decision 2026-11-26): translated everywhere, as in `choices.scholarshipTrack.nawa_director`. Applied in `ru`, `uk` and `be`. | resolved |
| `about.dataBody`, `about.metricsTitle`, `about.metricsBody`, `start.howScoreBody`, `wizard.gradeBasisHint` | Статыстыка **лічыцца** па анкетах...; Як **лічацца** паказчыкі; ...**лічыцца** па правілах...; NAWA **лічыць** сярэдні бал... | "вылічваецца", "разлічваецца" or "падлічваецца" (for example "Як разлічваюцца паказчыкі") | "лічыць" does mean "to count, to calculate" in Belarusian, but next to `about.officialTitle` ("Што **лічыцца** афіцыйным", meaning "is considered") it can be read as "considered". It also matches the Russian "считается". `start.howItWorks` already uses "вылічваецца". | medium |
| `about.officialBody` | ...**Ацэнкі** NAWAmeter і месцы ў выбарцы — не афіцыйны вынік конкурсу. | ...**Арыентыровачныя разлікі** NAWAmeter і месцы ў выбарцы — не афіцыйны вынік конкурсу. | "ацэнка" can also mean a grade or mark, which clashes with "адзнака" in the rest of the app. `uk` says "розрахунки". | low |
| `start.whatYouSeeBody` | ...пазіцыю адносна медыяны... | ...становішча адносна медыяны... | `start.subtitle` says "становішча" for the same idea. One term would be better; "пазіцыя" is also used in `dashboard.position.title` and `about.metricsBody`, so the choice is the reviewer's. | low |
| `scoreScreen.averageInputLabel` | Сярэдні бал для **спробы** | Сярэдні бал для **разліку** | "для спробы" is unclear in Belarusian; `uk` says "для симуляції". | low |
| `choices.applicantKind.school_leaver`, `scholarshipReport.start`, `scholarshipReport.flow.manualToggle`, `choices.applicantKind.student_in_poland` | Выпускнік**(-ца)**; скончыў**(-ла)**; атрымаў**(ла)**; сам**(а)**; Студэнт**(ка)** | One notation for gendered endings, for example always "(-ла)" or always "(ла)" | Three different notations are mixed. ADR 0010 allows the `(а)` forms only where no neutral phrasing exists; a reviewer may know neutral phrasings for some of them. | low |
| `home.loadError`, `form.saveError` and others | "Не **атрымалася** ..." and "Не **ўдалося** ..." | Choose one | Both are correct and both are used (`stats.error`, `home.*`, `scholarshipReport.loadError`). Consistency only. | low |
| `stats.loading`, `home.loading`, `scholarshipReport.results.loading` and related | **Загрузка** ... / **загрузіць** | **Запампоўка** ... / **запампаваць** (or "Чытанне...") | "загрузка" and "загрузіць" are in Belarusian dictionaries but are felt as Russian borrowings by some speakers; the alternative may sound heavy for a loading label. | low |

## Bot texts (`shared/bot-messages.ts`)

No proposals for `uk` or `be`. The texts follow the glossary (the country comes before a colon, the term for the
recruitment round is "набір" or "набор", the term for the saved questionnaire is "анкета"), and the wording is
consistent with each locale's app copy.

## Out of scope for this list

- Country names (`shared/country-names-be.ts`, task 030).
- Style that is correct but could be more natural. Where the model noticed such a place, it is in a table above with
  confidence "low".
