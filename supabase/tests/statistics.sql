begin;

create extension if not exists pgtap with schema extensions;

select plan(28);

do $$
begin
  perform public.create_response_for_telegram_user(
    820000001, 'stats_target',
    false, 'Ukraina', 'Ukraina',
    'nawa_director', 'direct_studies',
    50, 100, 'none',
    'submitted', current_date
  );
end;
$$;

insert into public.responses (
  telegram_user_id, telegram_username, has_polish_citizenship, ranking_country, school_country,
  scholarship_track, study_route, average_grade, maximum_grade, grade_percentage,
  polish_school_level, nawa_orientation_score, current_status, status_changed_at, is_suspicious
)
select
  820000000 + value,
  'stats_peer_' || value,
  false, 'Ukraina', 'Ukraina',
  'nawa_director', 'direct_studies',
  value, 100, value, 'none', round(value * 0.9, 2),
  case
    when value <= 20 then 'submitted'
    when value <= 40 then 'formal_review_in_progress'
    when value <= 60 then 'awaiting_decision'
    else 'merit_review_positive'
  end,
  current_date,
  false
from generate_series(10, 80, 10) as value;

select is(
  (public.get_current_statistics(820000001)->>'detailsAvailable')::boolean,
  false,
  'details are suppressed when every comparison group has fewer than ten responses'
);
select is(public.get_current_statistics(820000001)->>'medianScore', null, 'suppressed statistics disclose no median');
select is(public.get_current_statistics(820000001)->>'lowerScorePercentage', null, 'suppressed statistics disclose no percentile');
select is(public.get_current_statistics(820000001)->>'sameCountryCount', null, 'country count below ten is suppressed');

insert into public.responses (
  telegram_user_id, telegram_username, has_polish_citizenship, ranking_country, school_country,
  scholarship_track, study_route, average_grade, maximum_grade, grade_percentage,
  polish_school_level, nawa_orientation_score, current_status, status_changed_at, is_suspicious
) values (
  820000090, 'stats_peer_90', false, 'Ukraina', 'Ukraina',
  'nawa_director', 'direct_studies',
  90, 100, 90, 'none', 81, 'scholarship_awarded', current_date, false
);

select is(
  (public.get_current_statistics(820000001)->>'groupResponseCount')::integer,
  10,
  'the selected group count includes all valid matching responses'
);
select is(
  (public.get_current_statistics(820000001)->>'medianScore')::numeric,
  45::numeric,
  'median score uses orientation scores for nawa_director responses'
);
select is(
  (public.get_current_statistics(820000001)->>'lowerScorePercentage')::numeric,
  40::numeric,
  'percentile counts only strictly lower orientation scores'
);
select is(
  (public.get_current_statistics(820000001)->>'sameCountryCount')::integer,
  10,
  'country count is returned at the privacy threshold'
);

insert into public.responses (
  telegram_user_id, telegram_username, has_polish_citizenship, ranking_country, school_country,
  scholarship_track, study_route, average_grade, maximum_grade, grade_percentage,
  polish_school_level, nawa_orientation_score, current_status, status_changed_at, is_suspicious
) values (
  820000999, 'stats_suspicious', false, 'Ukraina', 'Ukraina',
  'nawa_director', 'direct_studies',
  0, 100, 0, 'none', 0, 'submitted', current_date, true
);
select is(
  (public.get_current_statistics(820000001)->>'totalValidResponses')::integer,
  10,
  'suspicious responses are excluded from aggregate counts'
);
select is(
  (public.get_current_statistics(820000001)->>'groupResponseCount')::integer,
  10,
  'suspicious responses are excluded from comparison groups'
);

update public.responses
set ranking_country = 'Polska'
where telegram_user_id in (820000070, 820000080, 820000090);
select is(
  (public.get_current_statistics(820000001)->>'sameCountryCount')::integer,
  null,
  'country count is suppressed independently after fallback'
);

with mutation as (
  select public.update_current_response(
    820000001, 'stats_target',
    false, 'Ukraina', 'Ukraina',
    'nawa_director', 'direct_studies',
    50, 100, 'none',
    'scholarship_awarded', current_date
  ) as result
)
select ok(
  (result->>'updated')::boolean and result->'statistics' is not null,
  'authenticated response update returns success with in-transaction statistics'
)
from mutation;
select is(
  (select is_suspicious from public.responses where telegram_user_id = 820000001),
  false,
  'the first scholarship award does not mark a response suspicious'
);
select ok(
  (public.update_current_response(
    820000001, 'stats_target',
    false, 'Ukraina', 'Ukraina',
    'nawa_director', 'direct_studies',
    50, 100, 'none',
    'scholarship_not_awarded', current_date
  )->>'updated')::boolean
  and (select is_suspicious from public.responses where telegram_user_id = 820000001),
  'opposing scholarship awards mark a response suspicious and keep the flag sticky'
);
select ok(
  (public.update_current_response(
    820000001, 'stats_target',
    false, 'Ukraina', 'Ukraina',
    'nawa_director', 'direct_studies',
    50, 100, 'none',
    'submitted', current_date
  )->>'updated')::boolean
  and (select is_suspicious from public.responses where telegram_user_id = 820000001),
  'suspicious status remains set after a later ordinary update'
);

create temporary table valid_statistics(result jsonb) on commit drop;
insert into valid_statistics values (
  '{
    "detailsAvailable": true,
    "totalValidResponses": 20,
    "sameTrackCount": 15,
    "sameCountryCount": null,
    "groupResponseCount": 10,
    "medianScore": 50,
    "lowerScorePercentage": 40,
    "scoreBuckets": [1, 2, 3, 2, 2]
  }'::jsonb
);
select is(
  public.assert_statistics_result((select result from valid_statistics)),
  (select result from valid_statistics),
  'statistics assertion accepts a valid detailed result'
);
select is(
  public.assert_statistics_result('{
    "detailsAvailable": false,
    "totalValidResponses": 2,
    "sameTrackCount": 2,
    "sameCountryCount": null,
    "groupResponseCount": 0,
    "medianScore": null,
    "lowerScorePercentage": null,
    "scoreBuckets": null
  }'::jsonb),
  '{
    "detailsAvailable": false,
    "totalValidResponses": 2,
    "sameTrackCount": 2,
    "sameCountryCount": null,
    "groupResponseCount": 0,
    "medianScore": null,
    "lowerScorePercentage": null,
    "scoreBuckets": null
  }'::jsonb,
  'statistics assertion accepts suppressed nullable fields'
);
select throws_ok($$select public.assert_statistics_result(null)$$, 'P0001', 'statistics_unavailable', 'null statistics are unavailable');
select throws_ok($$select public.assert_statistics_result('[]'::jsonb)$$, 'P0001', 'statistics_invalid', 'statistics must be an object');
select throws_ok($$select public.assert_statistics_result((select result - 'scoreBuckets' from valid_statistics))$$, 'P0001', 'statistics_invalid', 'statistics reject missing keys');
select throws_ok($$select public.assert_statistics_result((select result || '{"extra":1}'::jsonb from valid_statistics))$$, 'P0001', 'statistics_invalid', 'statistics reject extra keys');
select throws_ok($$select public.assert_statistics_result((select jsonb_set(result, '{totalValidResponses}', '1.5') from valid_statistics))$$, 'P0001', 'statistics_invalid', 'statistics counts must be integers');
select throws_ok($$select public.assert_statistics_result((select jsonb_set(result, '{sameTrackCount}', '-1') from valid_statistics))$$, 'P0001', 'statistics_invalid', 'statistics counts must be nonnegative');
select throws_ok($$select public.assert_statistics_result((select jsonb_set(result, '{sameCountryCount}', '9') from valid_statistics))$$, 'P0001', 'statistics_invalid', 'disclosed country counts must meet the privacy threshold');
select throws_ok($$select public.assert_statistics_result((select jsonb_set(result, '{lowerScorePercentage}', '101') from valid_statistics))$$, 'P0001', 'statistics_invalid', 'statistics percentages must stay within bounds');
select throws_ok($$select public.assert_statistics_result((select jsonb_set(result, '{detailsAvailable}', 'false') from valid_statistics))$$, 'P0001', 'statistics_invalid', 'suppressed statistics cannot retain detailed values');

create temporary table response_before_failed_statistics(result jsonb) on commit drop;
insert into response_before_failed_statistics
select to_jsonb(r) from public.responses r where telegram_user_id = 820000001;

create or replace function public.get_response_statistics(p_response_id uuid)
returns jsonb
language sql
volatile
security invoker
set search_path = pg_catalog
as $$
  select '{"detailsAvailable":false,"extra":"private"}'::jsonb;
$$;

select throws_ok(
  $$select public.update_current_response(
      820000001, 'stats_target',
      false, 'Niemcy', 'Niemcy',
      'culture_minister', 'preparatory_course',
      9, 10, null,
      'merit_review_positive', current_date
    )$$,
  'P0001',
  'statistics_invalid',
  'malformed non-null update statistics fail inside the transaction'
);
select is(
  (select to_jsonb(r) from public.responses r where telegram_user_id = 820000001),
  (select result from response_before_failed_statistics),
  'malformed statistics roll back every update change'
);

select * from finish();
rollback;
