# 0019. No text smaller than 14px, except ruler labels and badges

Status: Accepted

## Context

NAWAmeter is read on phones inside the Telegram WebView, often by people checking a number quickly. Helper text, the
score formula, the threshold disclaimer and several captions are set at 11–13px (`text-[11px]`, `text-[13px]`,
Tailwind `text-xs` = 12px), about forty places in `src/`. The UX review of 2026-11-20 (`docs/ux-review.md`, "Читаемость")
recommended a 14px floor. The secondary text colours (`--text-helper`, `--text-disabled`) make small sizes harder still
in the dark theme.

## Decision

1. **Every piece of text in the app is at least 14px.** This covers helper text, hints, captions, errors,
   disclaimers, legal notes, list rows and buttons.
2. **Two exceptions may stay at 12px:** the tick and axis labels on the score ruler and distribution charts, and
   short badges or stickers (a few words inside a pill, for example the Polish-school bonus sticker).
3. Nothing smaller than 12px is used anywhere.
4. New UI follows the same rule.

## Consequences

- Some screens get longer; layouts that relied on small text to fit one line may wrap and need spacing fixes.
- The hierarchy between primary and secondary text comes from colour and weight rather than size.

## Alternatives considered

A 13px floor (keeps more density, but the review's concern was readability on small screens); no rule (small text keeps
coming back with each feature).
