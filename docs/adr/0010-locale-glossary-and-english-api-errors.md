# 0010. One glossary per locale for app and bot copy; API error messages in English

Status: Accepted

## Context

The app and the bot speak five languages (pl, en, ru, uk, be). The copy had drifted. One concept had several names in
the same locale: the saved questionnaire was *анкета*, *опрос*, *ответ* and *профиль*; the score was *ориентировочный*
or *предварительный*. Code identifiers leaked into the text (*ścieżka* for *track*), along with developer jargon
(*Danger zone*, *one-way key*), and some strings read as word-for-word translations. Server error messages were Polish
only, but the client never renders them: it shows its own localized copy (`src/lib/api-client.ts`).

## Decision

- **Natural over literal.** Copy in every locale must read as if written by a native speaker. Phrase sentences so that
  inserted names, such as a country, never need declension.
- **One term per concept per locale**, the same in the app (`src/i18n/`) and the bot (`shared/bot-messages.ts`):

  | Concept | pl | en | ru | uk | be |
  | --- | --- | --- | --- | --- | --- |
  | Recruitment round | nabór | intake | набор | набір | набор |
  | Saved questionnaire | ankieta | survey | анкета | анкета | анкета |
  | Score | wynik orientacyjny | estimated score | ориентировочный балл | орієнтовний бал | арыентыровачны бал |
  | Programme | Anders NAWA | Anders NAWA | Anders NAWA | Anders NAWA | Anders NAWA |
  | Draggable ruler | linijka | ruler | линейка | лінійка | лінейка |

  *Response* (*odpowiedź*, *ответ*…) names only a unit of statistics ("312 responses in the group"), never the user's
  survey. *Profile*, *опрос*, *опитування* and *апытанне* do not name the survey. Write `Telegram ID` in capitals.
- **Address.** pl uses the informal *Ty* and avoids `/a` forms where neutral phrasing exists. ru, uk and be use the
  formal *вы* and use `(а)` forms only where no neutral phrasing exists. en uses British spelling.
- **Tone.** Error and validation messages are neutral. The one deliberately playful message, the average above the
  scale maximum, assumes a typo and never suggests dishonesty.
- **Truthful privacy copy.** Describe the account key as a code computed from the Telegram ID. Never claim that the ID
  cannot be recovered, because whoever holds the pepper can match a known ID to its key
  ([0002](0002-pseudonymous-identity.md)).
- **API error messages are English**, one language for every user. They are diagnostics for logs and tests. User-facing
  error text stays in the client's localized copy, keyed by the error `code`. The server is not told the user's locale
  for errors.

## Consequences

- New copy, in any locale, follows the glossary, and a locale test rejects banned terms so drift is caught in CI.
- The English *intake* is British university usage. NAWA's own English pages say *call for applications*, so the
  English copy differs from NAWA's wording.
- Changing a glossary term means changing every string that uses it in that locale, app and bot together.
- Showing a server message to users would need a new decision. Until then, a new error needs a `code` and, if the
  user should see it, a localized string in the client.

## Alternatives considered

- Per-string translation with no glossary (the cause of the drift).
- *call* or *round* for the en recruitment round (*call* matches NAWA; the maintainer chose *intake*).
- The full official programme name (*Program im. gen. Władysława Andersa*): NAWA itself uses *Anders NAWA*, and there
  is no official ru, uk or be form.
- Localized API errors (needs the locale on every request and a contract change, for text no user sees) or Polish-only
  API errors (unreadable to most maintainers and contributors).
