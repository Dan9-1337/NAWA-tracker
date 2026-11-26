begin;

create extension if not exists pgtap with schema extensions;

select plan(6);

insert into public.bot_subscriptions (telegram_user_id, chat_id, locale) values (880000001, 880000001, 'uk');

select is(
  (select locale from public.bot_subscriptions where telegram_user_id = 880000001),
  'uk',
  'a subscription stores the chat and the interface language'
);

select throws_ok(
  $$insert into public.bot_subscriptions (telegram_user_id, chat_id, locale) values (880000001, 880000001, 'uk')$$,
  '23505',
  null,
  'one subscription per Telegram user'
);

select throws_ok(
  $$insert into public.bot_subscriptions (telegram_user_id, chat_id, locale) values (880000002, 880000002, 'de')$$,
  '23514',
  null,
  'only the five supported languages are accepted'
);

select throws_ok(
  $$insert into public.bot_subscriptions (telegram_user_id, chat_id, locale) values (-5, 880000002, 'pl')$$,
  '23514',
  null,
  'a Telegram id must be positive'
);

select is(
  (select count(*)::integer from information_schema.columns
   where table_schema = 'public' and table_name = 'bot_subscriptions' and column_name like '%grade%'),
  0,
  'subscriptions carry no questionnaire data'
);

select is(
  (select count(*)::integer from information_schema.table_privileges
   where table_schema = 'public' and table_name = 'bot_subscriptions'
     and grantee in ('anon', 'authenticated', 'public')),
  0,
  'API roles have no access to subscriptions'
);

select * from finish();
rollback;
