--
-- Opt-in bot reminders.
--
-- This is the only table that stores a real Telegram id, and only for people who started the bot and
-- sent /subscribe. It is deliberately separate from `responses` (which holds only the hashed identity key),
-- carries no answers, and is removed on /stop, when the user blocks the bot, and when they delete their survey.
--

create table public.bot_subscriptions (
  telegram_user_id bigint primary key check (telegram_user_id > 0),
  chat_id bigint not null,
  locale text not null check (locale in ('pl', 'en', 'ru', 'uk', 'be')),
  subscribed_at timestamp with time zone not null default now(),
  -- key of the last reminder sent, e.g. "2026:results_out" (see shared/reminders.ts)
  last_reminder text check (last_reminder is null or length(last_reminder) <= 64)
);

revoke all on table public.bot_subscriptions from public, anon, authenticated;
grant select, insert, update, delete on table public.bot_subscriptions to service_role;
