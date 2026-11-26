# 007 — Natural, consistent copy in all five locales

**Status:** In review

## Goal

The interface text in `src/i18n/{pl,en,ru,uk,be}.ts` often reads like a word-for-word translation from code identifiers or from another locale. A native speaker should read every screen as if it had been written in their language. That means natural terms for the domain (recruitment round, survey, estimated score), one term per concept within a locale, no developer jargon, and no labels that point to buttons which do not exist.

This task changes wording only. Keys, function signatures, numbers, thresholds, and the meaning of every message stay the same.

## Context

- Relevant code and docs: `src/i18n/*.ts`, `src/i18n/plural.ts`, `src/i18n/locales.test.ts`, `src/i18n/response-count.test.ts`, [Product flow](../docs/product-flow.md).
- ADRs this task follows (link the replacement if applicable; otherwise write `None`): [0005](../docs/adr/0005-only-nawa-director-track-is-live.md) (only the NAWA Director scholarship is live), [0008](../docs/adr/0008-refocus-on-score-comparison.md), [0010](../docs/adr/0010-locale-glossary-and-english-api-errors.md) (glossary, tone, English API errors — this task implements it). Replaces none.
- Dependencies and decisions already made:
  - Maintainer (2026-11-22): translations must sound natural to a native reader. The maintainer then decided that en keeps *intake* for the recruitment round (D1).
  - Task 002 introduced `start.responseCount`; task 003 introduced `scoreScreen.percentileBand`. This task rewords them but keeps their signatures.

## Findings (review of the current copy)

### Cross-locale

| # | Problem | Where |
| --- | --- | --- |
| X1 | The recruitment round in en. The maintainer decided to keep *intake* (D1), so the only change is consistency: always *intake*, never *round*, *call* or *season*, in the app and the bot. | en |
| X2 | One concept, several words: the saved questionnaire is *survey / response / profile* (en), *анкета / опрос / ответ / профиль* (ru), *опитування / профіль* (uk), *апытанне / профіль* (be), *ankieta / profil* (pl). In ru/uk/be, *опрос/опитування/апытанне* means a poll or the act of asking; it is not a filled-in form. | all |
| X3 | The score is both *estimated* and *preliminary*: ru `Ориентировочный балл` vs `Предварительный расчёт`; uk `Орієнтовний` vs `Попередній`; be `Арыентыровачны` vs `Папярэдні`. | ru, uk, be |
| X4 | The code identifier *track* leaks into copy: pl `ścieżka Dyrektora NAWA` (twice plus a title), ru `по всей программе Директора NAWA`, be `па ўсёй стыпендыі`. The real name is the NAWA Director *scholarship*. What the user needs to know is "all candidates", not the name of an internal grouping. | pl, ru, be (`dashboard.smallCountry.*`) |
| X5 | Programme name. Checked 2026-11-22: NAWA itself uses the short name *Anders NAWA* on nawa.gov.pl, for example "Anders NAWA – the calls for applications are open!". The full English name there is *the gen. Anders Programme*; in Polish it is *Program im. gen. Władysława Andersa*. NAWA has no ru, uk or be pages. Whether to change the current `Anders NAWA` is decision D4. | `about.intro`, `settings.inviteText`, all locales |
| X6 | `inviteText` puts a country name after *from the country* (`из страны Беларусь`, `з країни Україна`, `z kraju: Białoruś`), which sounds unnatural. | ru, uk, be, pl |
| X7 | Developer jargon: *Danger zone* (`deleteZoneTitle`); *one-way key* (`privacyNotice.body`, `about.privacyBody`); `Telegram id` in lower case. Fact for the rewording: the key is `HMAC-SHA256(IDENTITY_PEPPER, telegram id)` (`api/_lib/identity.ts`, [ADR 0002](../docs/adr/0002-pseudonymous-identity.md)). Telegram IDs can be enumerated, so whoever holds the pepper can match an ID to its key. The copy must not claim that the ID "cannot be recovered". | all |
| X8 | `averageAboveMaximum` accuses the user of lying (`Ай-ай-ай … Давайте по-честному`, `Давайте чесно`, `Давайце сумленна`, `Trzymajmy się faktów`). Usually the user has just mistyped. EN is already neutral. | ru, uk, be, pl |
| X9 | `whatIfNote` points to a button that does not exist: en `“Edit profile”`, ru `«Изменить анкету»`. The real label is `settings.editProfile`. | en, ru |
| X10 | The draggable ruler is a *ruler / лента / стрічка / стужка*. *Лента* reads as a feed or ribbon. pl already says *skala*. | en, ru, uk, be |

### Bot messages (`shared/bot-messages.ts`)

| # | Problem | Where |
| --- | --- | --- |
| T1 | The terms D1–D3 and X7 apply here too: en `reminders.intake_open` says *intake*; every locale writes `Telegram id` in lower case; *answers / ответы* stands for the saved survey (`subscribed`). | all |
| T2 | `welcomeCountry` puts the country name after *Kraj / Страна / Краіна* (`Kraj Białoruś jest już wybrany`), which has the same problem as X6. | pl, ru, be |

### API error messages (`api/_lib/*.ts`, `api/bot.ts`)

| # | Problem | Where |
| --- | --- | --- |
| E0 | Every `HttpError` message is in Polish only. Fact checked 2026-11-22: the client stores `error.message` in `ApiClientError` (`src/lib/api-client.ts:68`), but no component renders it. The UI shows its own localized copy (`home.actionError`, `stats.error`, `telegram.missingInitData`). These texts are seen only in logs and in API tests. | `api/_lib/errors.ts`, `api/_lib/http.ts`, `api/_lib/cron-auth.ts`, `api/_lib/questionnaire.ts`, `api/bot.ts` |

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
  - Reword the bot messages in `shared/bot-messages.ts` (T1, T2) by the same glossary. The keys and the `BotMessages` type stay unchanged.
  - Rewrite every `HttpError` message in `api/` in English (D7): `api/_lib/errors.ts`, `api/_lib/http.ts`, `api/_lib/cron-auth.ts`, `api/_lib/questionnaire.ts`, `api/bot.ts`, and any other `HttpError` call the implementer finds with `grep -rn "HttpError(" api`.
  - Reword the strings in `src/i18n/{pl,en,ru,uk,be}.ts` that the findings above list, using the glossary under **Open decisions** once the maintainer has approved it.
  - Apply the glossary to every string in each locale, not only the listed ones, so that each concept has exactly one term per locale.
  - Update test expectations that quote changed copy (for example `src/i18n/response-count.test.ts`, `src/features/**/*.test.tsx`), changing only the expected strings.
  - Add a test that fails if any locale of `src/i18n` or `shared/bot-messages.ts` contains a banned term from the glossary (for example `/опрос/i` in ru, `/ścieżk/i` in pl, `/Danger zone/`, `/Telegram id/`, `/по-честному/`; in en `/\b(round|call)\b/i` where it names the recruitment round).
- Out of scope: new keys or removed keys; docs; layout or component changes; changing numbers, thresholds, plural rules in `plural.ts`, or the meaning of any message.
- Files or directories assigned to this task: `src/i18n/*.ts`, `src/i18n/*.test.ts`, `shared/bot-messages.ts`, test files under `src/`, `api/` and `shared/` whose only change is quoted copy; the API files listed under D7 and their tests (`api/**/*.test.ts`, `shared/api-contracts.test.ts`) where they quote messages.

## Acceptance scenarios

| ID | Given / when | Expected result | Planned verification |
| --- | --- | --- | --- |
| A1 | Any en string in the app or the bot that names the recruitment round | Uses *intake* (D1) | Reviewer read-through + `grep -n "intake" src/i18n/en.ts shared/bot-messages.ts` |
| A2 | Each locale | The saved questionnaire is always the approved term (D2); ru/uk/be use no *опрос/опитування/апытанне* for it | Banned-term locale test + reviewer read-through |
| A3 | Each locale | The score uses one adjective (D3) everywhere | Banned-term locale test (e.g. ru `/Предварительн/`) |
| A4 | `dashboard.smallCountry.*` in all locales | No *ścieżka / track / по всей программе*; compares with "all candidates" | Banned-term locale test |
| A5 | `whatIfNote` in every locale | The quoted button label equals `settings.editProfile` of the same locale | New locale test asserting `whatIfNote.includes(settings.editProfile)` |
| A6 | `averageAboveMaximum` in every locale | Playful, says the value is above the scale, suggests a typo and asks the user to check it; contains no accusation of dishonesty (`по-честному`, `чесно`, `сумленна`, `faktów`) | Banned-term locale test + reviewer read-through against D5 |
| A7 | Keys and arity | Unchanged; plural forms still correct (`1 / 3 / 25 / 2,5`) | `npm test -- src/i18n` |
| A9 | Any `HttpError` raised in `api/` | Message is English; `code`, status and JSON shape unchanged; no Polish text remains | `grep -rnE "HttpError\(.*[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]" api` is empty; `npm test -- api shared` passes with only message expectations updated |
| A8 | Native read-through | A native speaker reads all screens (start, wizard, summary, score, dashboard, settings, about) and the bot messages, and flags nothing as unnatural. Required for be and pl; the maintainer reads ru and en | Manual: assigned native reviewer per locale, before `Done` |

## Must stay unchanged

- Behavior, contracts, or user-facing copy this task must not alter:
  - API error `code` values, HTTP statuses and the error JSON shape (`shared/api-contracts`); the client's localized error copy;
  - bot command names and the `BotMessages` keys;
  - message keys, function arity, and the `Messages` type;
  - numbers, thresholds (60, 4.75, 10), the formula text `× 90 /`, and the `Ogłoszenie nr 13/2026, pkt 2.7` citation (only its surrounding wording may change);
  - language endonyms in `language.*`;
  - the disclaimers that the service is unofficial and that statistics are not a forecast (wording may change, but the meaning must remain).
- Existing checks that already cover it: `src/i18n/locales.test.ts` (keys, arity, alphabet checks for uk/be), `src/i18n/plural.test.ts`, `src/i18n/response-count.test.ts`.

## Open decisions

The maintainer settled D1–D13 on 2026-11-22. None remain open.

- **D1 — Recruitment round in en (decided 2026-11-22).** en uses *intake* (`312 responses in the 2026 intake`, `2026 intake closed`, bot `The 2026 intake is open`), the same term everywhere. The task author proposed *call*, the term on NAWA's English pages; the maintainer chose *intake*. pl *nabór*, ru *набор*, uk *набір* and be *набор* stay unchanged.
- **D2 — The saved questionnaire (decided).** One term per locale: pl *ankieta*, en *survey*, ru/uk/be *анкета*. *Profile*, *опрос*, *опитування* and *апытанне* do not name it in UI or bot copy. `settings.editProfile` becomes *Edit survey* / *Изменить анкету* / *Edytuj ankietę* / *Змінити анкету* / *Змяніць анкету*. *Response* / *ответ* / *odpowiedź* remains only as the unit of statistics ("312 responses in the group").
- **D3 — The score (decided).** en *estimated score*, pl *wynik orientacyjny*, ru *ориентировочный балл*, uk *орієнтовний бал*, be *арыентыровачны бал*. *Preliminary*, *предварительный*, *попередній* and *папярэдні* are dropped.
- **D4 — Programme name (decided).** Keep *Anders NAWA* in every locale, as NAWA itself does (X5). Only the sentence around it changes where it reads unnaturally (D9).
- **D5 — Tone (decided).** `averageAboveMaximum` stays playful but assumes a typo and does not accuse the user of lying, for example ru `Ого, выше максимума шкалы! Похоже на опечатку — проверьте значение.` Every locale follows the same idea, including en. Other error messages stay neutral.
- **D6 — Form of address and gender (decided).** pl keeps the informal *Ty* and replaces `/a` forms with neutral phrasing where possible. ru/uk/be keep the formal *вы* and use `(а)` forms only where no neutral phrasing exists.
- **D7 — API error messages (decided 2026-11-22).** Every `HttpError` message in `api/` is written in plain English, one language for all users, for example `Session is invalid or has expired.` The error `code`, the HTTP status and the error JSON shape do not change, and the server is not told the user's locale. Fact (E0): the UI does not render these messages; it shows its own localized copy.
- **D8 — English variant (decided).** British spelling (*programme*, *-ise*).
- **D9 — Country in sentences (decided).** In `settings.inviteText` and the bot's `welcomeCountry`, the country name goes at the start or after a colon, so it never needs declension.
- **D10 — The draggable ruler (decided).** *ruler* / *линейка* / *лінійка* / *лінейка* / *linijka* in every locale and in the aria labels.
- **D11 — Delete block title (decided).** `deleteZoneTitle` becomes *Delete survey* / *Удаление анкеты* / *Usuwanie ankiety* / *Видалення анкети* / *Выдаленне анкеты*.
- **D12 — Account storage wording (decided).** Copy says that we store a code computed from the Telegram ID, not the ID itself, and never claims the ID cannot be recovered (X7). `Telegram ID` is always written in capitals.
- **D13 — *Tracker* (decided).** The word stays.

## Verification

- `npm test -- src/i18n` → A2–A5, A7.
- `npm test -- api shared` → A9, plus bot copy (T1, T2).
- The greps in A1 and A9.
- `npm test` for any `src/features/**` test whose expected copy changed → A7.
- `make check`.
- Manual: open the app in each of the five locales as a first-time user and as a returning user, and read every screen → A6, A8.

## Handoff

| Scenario | Evidence (command, test assertion, or manual check) | Result |
| --- | --- | --- |
| A1 | `grep -n "intake" src/i18n/en.ts shared/bot-messages.ts` finds every round reference; `npm test -- src/i18n` → `uses the agreed term for the recruitment round in English` | pass |
| A2 | `npm test -- src/i18n` → `%s app copy has no rejected term` and `%s bot copy has no rejected term` (ru `/опрос/`, uk `/опитуванн/`, be `/апытанн/`, pl/en `/profil/`) | pass |
| A3 | Same glossary test rejects ru `/предварительн… бал…расчёт/`, uk `/попередн… бал…розрахун/`, be `/папярэдн… бал…разлік/` | pass |
| A4 | `npm test -- src/i18n` → `%s compares the small country with all candidates`; `grep -in "ścieżk" src/i18n/pl.ts` empty | pass |
| A5 | `npm test -- src/i18n` → `%s points at the real edit label in whatIfNote` | pass |
| A6 | `npm test -- src/i18n` → `%s treats an average above the maximum as a typo`; self read-through of all five messages | pass (native read-through part of A8) |
| A7 | `npm test -- src/i18n` → 70 passed (keys, arity, plurals, alphabet checks); `make check` → 419 passed, typecheck clean | pass |
| A8 | Not run: needs a native be and pl reviewer and the maintainer for ru/en | not run |
| A9 | `grep -rnE "HttpError\(.*[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]" api` → empty; `npm test -- api shared` → 168 passed | pass |

- Changed files:
  - `src/i18n/{pl,en,ru,uk,be}.ts` — copy rewrite and glossary terms.
  - `src/i18n/glossary.test.ts` — new banned-term, whatIfNote/edit-label, small-country, typo-tone and bot-country tests.
  - `src/i18n/response-count.test.ts` — ru/uk/be expected strings follow the new wording.
  - `shared/bot-messages.ts` — `Telegram ID` capitals, survey term instead of answers, country before a colon.
  - `shared/bot-messages.test.ts` — expects `Telegram ID` in every locale.
  - `api/_lib/errors.ts`, `api/_lib/http.ts`, `api/_lib/cron-auth.ts`, `api/_lib/questionnaire.ts`, `api/bot.ts` — `HttpError` messages in English.
  - `api/_lib/api-stack.test.ts`, `api/cron/keep-alive.test.ts`, `api/intake-summary.test.ts`, `api/responses.test.ts`, `shared/api-contracts.test.ts` — expected API messages updated.
  - `src/features/score/score-screen.test.tsx`, `src/pages/home-page.test.tsx` — expected Polish copy updated.
- Checks not run, blockers, or open questions:
  - A8 needs native speakers; the implementation agent cannot sign it off.
  - `scripts/local-api-server.ts` still returns Polish fallback strings in its local mock; it is outside this task's assigned files and is not an `HttpError` path.
- LLM contributions: Claude Opus 5.5: specification (review of the app, bot and API copy, findings, glossary proposals, fact checks against nawa.gov.pl and `api/_lib/identity.ts`). Wrote [ADR 0010](../docs/adr/0010-locale-glossary-and-english-api-errors.md) recording the maintainer's decisions D1–D13. DeepSeek V4.1 Flash: implementation (copy rewrite in five locales and the bot, English API errors, glossary test, test expectation updates, verification).
