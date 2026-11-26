# 067 — Share my result: a card for stories and for saving

**Status:** Draft

## Goal

Let a user share their result as an image: to a Telegram story or saved to the phone for Instagram and other apps. The maintainer
wants this (2026-11-26) because the audience shares pictures, not links. This is a draft: it is blocked on the spike
([task 066](066-spike-share-card-image.md)) and on the open decisions below.

Intended behavior, as decided so far:

- A small `Поделиться` button in the header of the hub's result card opens a bottom sheet with the card preview (the signed image from
  task 066), the button `В историю` and the button `Сохранить картинку`. The Telegram main button stays `Позвать друзей`
  ([task 048](048-invite-friends-main-button.md)).
- The card shows the score, the country with its flag, `Порог 60 пройден`, `NAWAmeter · неофициально` and the bot's `@username` as
  text. No name, id, rank, percentile or holder data. It is for a survey at or above 60 only; below 60 the button is not shown.
- `В историю` calls `Telegram.WebApp.shareToStory(url, { text })` with a caption of at most 200 characters and no link widget (links in stories
  are Premium only), when `isVersionAtLeast('7.8')`; otherwise the button is hidden.
- `Сохранить картинку` calls `Telegram.WebApp.downloadFile({ url, file_name })` when `isVersionAtLeast('8.0')`; otherwise it opens the image
  URL so the user can long-press and save.
- Sending the card as an image into a chat (`savePreparedInlineMessage` plus `shareMessage`, which needs a JPEG up to 5 MB) is **not** in
  this version. Chats are served by `Позвать друзей`.
- The image URL is issued by an existing handler and signed; it carries no identity.

## Context

- Relevant code and docs: the result card in `src/features/dashboard/ResultHeroCard.tsx` and `src/features/statistics/StatisticsPanel.tsx`
  (after [task 047](047-hub-result-card-position-visual.md)), `src/lib/telegram.ts` (`isVersionAtLeast`, the WebApp wrapper), `api/share-card.ts` and
  `api/_lib/share-card-signature.ts` (task 066), `shared/contracts.ts`, `docs/architecture.md`, `docs/research/share-card-spike.md`
  (task 066's report).
- ADRs this task follows: [0002](../docs/adr/0002-pseudonymous-identity.md), [0011](../docs/adr/0011-documented-product-events-deleted-with-survey.md), [0020](../docs/adr/0020-dashboard-hub-and-pages.md).
  Replaces none. A new ADR is needed only if the spike changes a lasting rule (for example storing share tokens).
- Dependencies and decisions already made: Telegram APIs per the research of 2026-11-26 (`shareToStory` since Bot API 7.8, `downloadFile` since 8.0).
  Tasks 047, 048, 054 and 066 are `Done`, and the spike's report says go.

## Scope

- In scope (when `Ready`): the button and the sheet; the signed URL issued by an existing handler (field added to its response and
  contract); the feature-gated Telegram calls; the product events; the privacy copy; tests.
- Out of scope: sending the card into chats as an image, a holder card ("Получил(а) стипендию"; it would repeat an unverified
  self-declaration as a fact), rank or percentile on the card, a public gallery of cards.
- Files or directories assigned to this task: to be fixed when the decisions below are made.

## Acceptance scenarios

| ID | Given / when | Expected result | Planned verification |
| --- | --- | --- | --- |
| A1 | _To be written when the open decisions are resolved._ | | |

## Must stay unchanged

- Behavior, contracts, or user-facing copy this task must not alter: the invite action and its events, the position and score on the
  card, the survey data and its privacy rules.
- Existing checks that already cover it: to be listed when `Ready`.

## Open decisions

1. **Which handler issues the signed URL** without taking the last function slot: `POST /api/responses/current`, `POST /api/statistics`, or a
   new field on both. Depends on the spike.
2. **Product events** (ADR 0011): `share_sheet_opened`, `share_story_tapped`, `share_saved_tapped`? Names and catalogue rows.
3. **Privacy copy:** the card is public by URL (anyone with the link can fetch it); the privacy notice and the sheet need one line that
   says so. Wording for five locales.
4. **Caption text** (up to 200 characters, five locales), for example `Мой балл в NAWAmeter: 83,25. Посчитай свой: @<bot>`.
5. **What the sheet shows when the Telegram client is too old** for both calls (hide the button, or show only a plain `скопировать ссылку`).
6. **Premium:** whether to add the link widget when the viewer is Premium (the docs allow it only for Premium).
7. **Spike outcome:** go, no-go, or JPEG needed.

## Verification

- To be written when `Ready`.

## Handoff

| Scenario | Evidence (command, test assertion, or manual check) | Result |
| --- | --- | --- |
| A1 | | |

- Changed files:
- Checks not run, blockers, or open questions:
- LLM contributions: Claude Sonnet 5.5 (Claude Code): specification and the Telegram and Vercel research (via Claude research subagents). Implementation and review: not yet done.
