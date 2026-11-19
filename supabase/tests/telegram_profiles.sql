begin;

create extension if not exists pgtap with schema extensions;

create function pg_temp.h(bigint) returns text language sql immutable as $$ select lpad(to_hex($1), 64, '0') $$;


select plan(7);

select lives_ok(
  $$select public.create_response_for_identity(
      pg_temp.h(810001),
      2026,
      false, 'UA', 'UA',
      'nawa_director', 'direct_studies', 'science-096',
      '0613', null,
      'final_certificate', 'school_leaver',
      4.5, 5, 'secondary',
      'submitted', current_date
    )$$,
  'first Telegram profile can be created'
);

select throws_ok(
  $$select public.create_response_for_identity(
      pg_temp.h(810001),
      2026,
      false, 'UA', 'UA',
      'nawa_director', 'direct_studies', 'science-096',
      '0613', null,
      'final_certificate', 'school_leaver',
      4.5, 5, 'secondary',
      'submitted', current_date
    )$$,
  'P0001',
  'profile_exists',
  'duplicate Telegram user id is rejected'
);

select is(
  public.get_current_response(pg_temp.h(810001), 2026)->>'rankingCountry',
  'UA',
  'get_current_response returns the owned profile'
);

with mutation as (
  select public.update_current_response(
    pg_temp.h(810001),
    2026,
    false, 'DE', 'DE',
    'nawa_director', 'direct_studies', 'science-096',
    '0613', null,
    'final_certificate', 'school_leaver',
    4.0, 5, 'secondary',
    'formal_review_positive', current_date
  ) as result
)
select ok(
  (result->>'updated')::boolean and result->'statistics' is not null,
  'update_current_response returns success with in-transaction statistics'
)
from mutation;

select is(
  (select current_status from public.responses where identity_hash = pg_temp.h(810001)),
  'formal_review_positive',
  'profile updates persist questionnaire changes'
);

select is(
  public.get_current_statistics(pg_temp.h(810001), 2026) is not null,
  true,
  'owned statistics are available for an existing profile'
);

select is(
  public.get_current_response(pg_temp.h(810002), 2026),
  null,
  'unknown Telegram users have no profile'
);

select * from finish();
rollback;
