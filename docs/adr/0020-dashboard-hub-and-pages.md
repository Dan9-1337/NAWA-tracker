# 0020. The dashboard is a hub with pages, not one long scroll; the density strip is removed

Status: Accepted. Replaces point 2 of [0017](0017-orientation-mark-from-holder-scores.md) for the holder dots in the full
distribution only; the mark itself stays.

## Context

The saved dashboard is one screen that scrolls: the result card, the what-if ruler, the full-distribution disclosure,
the scholarship-holder card and the profile block (`ProfileDashboard.tsx`). On a phone the user sees the score and
the first lines of the position, then has to scroll for everything else. The UX review of 2026-11-20
(`docs/ux-review.md`, P1.5) already asked for the main answer to move up. The block people most want to see
(where holders were placed) sits at the bottom, and the only call to action (inviting friends) hid in Settings until
task 036.

The maintainer's review of 2026-11-26 found three more problems:

- Nobody can read the density strip. In a cohort of 4 it draws a histogram of four people, and the words around it
  (percentile, median, "in the sample") are statistics, not answers.
- The invite button says "Invite people from my country", but the link only preselects the country in the invitee's
  form (`shared/start-param.ts`); the invitee can change it. The label promises what the link does not enforce.
- The product reads as made by its creator for the creator. It should answer the questions an ordinary applicant
  asks: am I above 60, where am I among people from my country, where were holders placed.

The real cohort sizes decide what can be drawn. NAWA's annual reports for 2018–2024 show that Belarus receives about
60% of the Director's scholarships and Ukraine about 22%; every other country gets between 3 and about 35 awards a
year ([0021](0021-official-award-counts-as-context.md)). The app will have hundreds of surveys from Belarus, dozens from
Ukraine and a handful from the rest.

## Decision

1. **Hub and pages.** The saved dashboard is a **hub** that fits one phone screen in its usual state (about 390×700 CSS
   pixels inside Telegram, at the 14px text floor of [0019](0019-minimum-text-size-14px.md)). It holds the result, the
   holder card and two links. Detail moves to **pages**: What-if, Profile, "My holder report", and the existing holder
   results. Pages are views inside the app, not URL routes. The Telegram Back button returns to the hub, and the hub
   keeps its scroll position.
2. **Plain words on the hub.** The hub does not use the words percentile, median, distribution or sample statistics.
   It says the rank ("1 из 4 · Казахстан"), how many are above the user, and, for a large cohort, a descriptive tier
   word (top quarter, top half, lower half).
3. **Position visual by cohort size.** With **up to 15** valid surveys in the country the hub draws one dot per person,
   the user's dot ringed and larger. From **16** it draws one position bar with the rank and the tier word. Both are
   built only from the rank and the number of surveys; no other person's score is drawn. Tier words describe the
   place among surveys in the app and never imply a chance of an award ([0015](0015-compare-within-citizenship-country-without-minimum.md)).
4. **No density strip.** Both variants of `DensityStrip` and the full-distribution disclosure are removed. The holder
   dots of [0017](0017-orientation-mark-from-holder-scores.md) go with them. The `ориентир 2026` stays, with its count,
   as one line on the hub and a fixed mark on the what-if ruler.
5. **What-if in plain words.** The What-if page keeps the ruler and the threshold flag. Instead of a percentile band it
   says how far the score is from the `ориентир 2026`, and the range of places the score would take among the surveys
   of the country ("между 1-м и 2-м из 4").
6. **Invitation.** The action is called "Позвать друзей" (and its equivalents in the other locales) and does not claim
   a country. It is the Telegram main button on the hub, the What-if page and the holder results, and is hidden on the
   Profile page and in every wizard and flow. While the country has 15 surveys or fewer, the hub says why it helps
   ("Пока 4 анкеты из Казахстана. Чем больше друзей, тем точнее сравнение"). The text sent to the chat still names the
   country. Disclosure thresholds do not change.
7. **Holder card on the hub.** For a 2026 Director survey scoring at least 60, a card sits directly under the result.
   Without a report it invites the holder to answer; with one it opens the results page. Eligibility and the
   contributors-only results of [0012](0012-scholarship-holder-survey.md) and [0016](0016-scholarship-holder-results-page-without-minimum.md)
   do not change. Answers, Edit and Delete move to the "My holder report" page.

## Consequences

- The first screen answers the three questions without scrolling; everything else is one tap and one Back away.
- Holders' scores are no longer drawn one by one; only the lowest is shown, which also exposes less in a country with
  a few holders ([0017](0017-orientation-mark-from-holder-scores.md) consequences).
- The landing "sample ruler", the edit wizard, Settings and the holder flow are untouched.
- Several in-review tasks touch the same dashboard files; the hub work starts after the reviewer has closed them
  (tasks 045–052 state the order).
- The server keeps `get_orientation_mark(..., include_scores)` and `GET /api/orientation-mark?distribution=1`; the client
  stops asking. Removing them needs its own migration task later.

## Alternatives considered

A bottom tab bar (four destinations for one real action, and it competes with the Telegram main button at the bottom);
swipeable steps (hide what exists and break Back); keeping one scroll and reordering it (the review's earlier fix, which
leaves the length); a simplified histogram with annotations (still unreadable for four people); dots only (do not fit
Belarus and Ukraine); a bar only (loses the one-dot-per-person clarity in small countries); a country-only invite label
enforced by the bot (the invitee may legitimately hold another citizenship, and the share link cannot enforce it).
