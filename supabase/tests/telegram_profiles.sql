begin;

create extension if not exists pgtap with schema extensions;

select plan(8);

select lives_ok(
  $$select public.create_response_for_telegram_user(
      810001, 'first_user',
      false, 'UA', 'UA',
      'nawa_director', 'direct_studies', 'science-096',
      4.5, 5, 'secondary',
      'submitted', current_date
    )$$,
  'first Telegram profile can be created'
);

select throws_ok(
  $$select public.create_response_for_telegram_user(
      810001, 'first_user',
      false, 'UA', 'UA',
      'nawa_director', 'direct_studies', 'science-096',
      4.5, 5, 'secondary',
      'submitted', current_date
    )$$,
  'P0001',
  'profile_exists',
  'duplicate Telegram user id is rejected'
);

select is(
  public.get_current_response(810001)->>'rankingCountry',
  'UA',
  'get_current_response returns the owned profile'
);

with mutation as (
  select public.update_current_response(
    810001, 'first_user',
    false, 'PL', 'PL',
    'culture_minister', 'preparatory_course', null,
    4.0, 5, null,
    'awaiting_decision', current_date
  ) as result
)
select ok(
  (result->>'updated')::boolean and result->'statistics' is not null,
  'update_current_response returns success with in-transaction statistics'
)
from mutation;

select is(
  (select current_status from public.responses where telegram_user_id = 810001),
  'awaiting_decision',
  'profile updates persist questionnaire changes'
);

select is(
  (select telegram_username from public.responses where telegram_user_id = 810001),
  'first_user',
  'telegram username is stored on update'
);

select is(
  public.get_current_statistics(810001) is not null,
  true,
  'owned statistics are available for an existing profile'
);

select is(
  public.get_current_response(810002),
  null,
  'unknown Telegram users have no profile'
);

select * from finish();
rollback;
