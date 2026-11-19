# 0001. Telegram Mini App on Vercel and Supabase free tiers

Status: Accepted

## Context

NAWAmeter is an unofficial, non-commercial community tool for Anders NAWA applicants, run by one person with no
revenue. Its users already live in Telegram, and one-account-one-record identity is wanted. Hosting must cost nothing.

## Decision

- The only client is a Telegram Mini App; opening the URL in a browser shows a gate screen. Every API call carries
  signed `initData`, verified with the bot token.
- The browser talks only to same-origin Vercel Functions; Supabase is reached server-side with the service-role key
  (no RLS policies, no anon access). Vite + React on the front.
- Free tiers of Vercel Hobby and Supabase. A daily cron keeps the Supabase project from pausing.

## Consequences

- No accounts, passwords, email, or sessions to build or secure: Telegram is the identity provider.
- Reach is limited to Telegram users, which matches the audience.
- Hobby limits apply (daily cron granularity, function time), and a free Supabase project has no point-in-time backups
  (a backup plan lives outside this repository).
- The service-role key is the crown jewel; it must stay server-only (`VITE_*` variables are public by design).

## Alternatives considered

A public web app with email login (more surface and moderation, no identity guarantee); a Telegram bot with no UI
(no room for the charts and wizard); self-hosting (cost and ops).
