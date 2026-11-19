begin;

create extension if not exists pgtap with schema extensions;

create function pg_temp.h(bigint) returns text language sql immutable as $$ select lpad(to_hex($1), 64, '0') $$;

truncate table public.responses, public.product_events restart identity cascade;

select plan(8);

select is(
  (select array_agg(distinct table_name::text order by table_name::text) from information_schema.columns
   where table_schema = 'public'
     and column_name in ('telegram_user_id', 'telegram_username')),
  array['bot_subscriptions'],
  'only the opt-in bot subscriptions store a Telegram id, and no table stores a username'
);

select is(
  (select count(*)::integer from information_schema.columns
   where table_schema = 'public' and column_name = 'telegram_username'),
  0,
  'no table stores a Telegram username'
);

select lives_ok(
  $$select public.create_response_for_identity(
      pg_temp.h(870000001), 2026,
      false, 'UA', 'UA',
      'nawa_director', 'direct_studies', 'science-096',
      '0613', null,
      'final_certificate', 'school_leaver',
      4.5, 5, 'secondary',
      'submitted', current_date
    )$$,
  'a profile can be created with an HMAC-style identity hash'
);

select throws_ok(
  $$select public.create_response_for_identity(
      '870000002', 2026,
      false, 'UA', 'UA',
      'nawa_director', 'direct_studies', 'science-096',
      '0613', null,
      'final_certificate', 'school_leaver',
      4.5, 5, 'secondary',
      'submitted', current_date
    )$$,
  '23514',
  null,
  'a raw numeric Telegram id is rejected as an identity'
);

select is(
  public.get_current_response(pg_temp.h(870000001), 2026)->>'rankingCountry',
  'UA',
  'a profile is found by its identity hash'
);

select is(
  public.get_current_response(pg_temp.h(870000009), 2026),
  null,
  'another identity hash sees nothing'
);

select lives_ok(
  $$insert into public.product_events (identity_hash, event_name, payload)
    values (pg_temp.h(870000001), 'status_updated', '{"from":"submitted","to":"formal_review_positive"}')$$,
  'a small structured event payload is accepted'
);

select throws_ok(
  $$insert into public.product_events (identity_hash, event_name, payload)
    values (pg_temp.h(870000001), 'university_search', jsonb_build_object('query', repeat('x', 300)))$$,
  '23514',
  null,
  'free-text sized event payloads are rejected'
);

select * from finish();
rollback;
