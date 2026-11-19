begin;

create extension if not exists pgtap with schema extensions;

create function pg_temp.h(bigint) returns text language sql immutable as $$ select lpad(to_hex($1), 64, '0') $$;


truncate table public.responses restart identity cascade;

select plan(31);

do $$
begin
  perform public.create_response_for_identity(
    pg_temp.h(820000001),
    2026,
    false, 'UA', 'UA',
    'nawa_director', 'direct_studies', 'science-096',
    '0613', null,
    'final_certificate', 'school_leaver',
    50, 100, 'none',
    'submitted', current_date
  );
end;
$$;

insert into public.responses (
  identity_hash, has_polish_citizenship, ranking_country, school_country,
  scholarship_track, study_route, average_grade, maximum_grade, grade_percentage,
  polish_school_level, nawa_orientation_score, current_status, status_changed_at, is_suspicious
)
select
  pg_temp.h(820000000 + value),
  false, 'UA', 'UA',
  'nawa_director', 'direct_studies',
  value, 100, value, 'none', round(value * 0.9, 2),
  case
    when value <= 20 then 'submitted'
    when value <= 40 then 'formal_review_positive'
    when value <= 60 then 'merit_review_positive'
    else 'merit_review_positive'
  end,
  current_date,
  false
from generate_series(10, 80, 10) as value;

select is(
  (public.get_current_statistics(pg_temp.h(820000001), 2026)->>'detailsAvailable')::boolean,
  false,
  'details are suppressed when every comparison group has fewer than ten responses'
);
select is(public.get_current_statistics(pg_temp.h(820000001), 2026)->>'medianScore', null, 'suppressed statistics disclose no median');
select is(public.get_current_statistics(pg_temp.h(820000001), 2026)->>'lowerScorePercentage', null, 'suppressed statistics disclose no percentile');
select is(public.get_current_statistics(pg_temp.h(820000001), 2026)->>'sameCountryCount', null, 'country count below ten is suppressed');

insert into public.responses (
  identity_hash, has_polish_citizenship, ranking_country, school_country,
  scholarship_track, study_route, average_grade, maximum_grade, grade_percentage,
  polish_school_level, nawa_orientation_score, current_status, status_changed_at, is_suspicious
) values (
  pg_temp.h(820000090), false, 'UA', 'UA',
  'nawa_director', 'direct_studies',
  90, 100, 90, 'none', 81, 'scholarship_awarded', current_date, false
);

select is(
  (public.get_current_statistics(pg_temp.h(820000001), 2026)->>'groupResponseCount')::integer,
  10,
  'the selected group count includes all valid matching responses'
);
select is(
  (public.get_current_statistics(pg_temp.h(820000001), 2026)->>'medianScore')::numeric,
  45::numeric,
  'median score uses orientation scores for nawa_director responses'
);
select is(
  (public.get_current_statistics(pg_temp.h(820000001), 2026)->>'lowerScorePercentage')::numeric,
  40::numeric,
  'percentile counts only strictly lower orientation scores'
);
select is(
  (public.get_current_statistics(pg_temp.h(820000001), 2026)->>'sameCountryCount')::integer,
  10,
  'country count is returned at the privacy threshold'
);

insert into public.responses (
  identity_hash, has_polish_citizenship, ranking_country, school_country,
  scholarship_track, study_route, average_grade, maximum_grade, grade_percentage,
  polish_school_level, nawa_orientation_score, current_status, status_changed_at, is_suspicious
) values (
  pg_temp.h(820000999), false, 'UA', 'UA',
  'nawa_director', 'direct_studies',
  0, 100, 0, 'none', 0, 'submitted', current_date, true
);
select is(
  (public.get_current_statistics(pg_temp.h(820000001), 2026)->>'totalValidResponses')::integer,
  10,
  'suspicious responses are excluded from aggregate counts'
);
select is(
  (public.get_current_statistics(pg_temp.h(820000001), 2026)->>'groupResponseCount')::integer,
  10,
  'suspicious responses are excluded from comparison groups'
);

update public.responses
set ranking_country = 'DE'
where identity_hash in (pg_temp.h(820000070), pg_temp.h(820000080), pg_temp.h(820000090));
select is(
  (public.get_current_statistics(pg_temp.h(820000001), 2026)->>'sameCountryCount')::integer,
  null,
  'country count is suppressed independently after fallback'
);

select lives_ok(
  $$select public.update_current_response(
      pg_temp.h(820000001),
      2026,
      false, 'UA', 'UA',
      'nawa_director', 'direct_studies', 'science-096',
      '0613', null,
      'final_certificate', 'school_leaver',
      50, 100, 'none',
      'formal_review_positive', current_date
    )$$,
  'formal review transition succeeds'
);

with mutation as (
  select public.update_current_response(
    pg_temp.h(820000001),
    2026,
    false, 'UA', 'UA',
    'nawa_director', 'direct_studies', 'science-096',
    '0613', null,
    'final_certificate', 'school_leaver',
    50, 100, 'none',
    'merit_review_positive', current_date - 1
  ) as result
)
select ok(
  (result->>'updated')::boolean and result->'statistics' is not null,
  'authenticated response update returns success with in-transaction statistics'
)
from mutation;
select is(
  (select is_suspicious from public.responses where identity_hash = pg_temp.h(820000001)),
  true,
  'backdated status changes mark a response suspicious'
);
select lives_ok(
  $$select public.update_current_response(
      pg_temp.h(820000001),
      2026,
      false, 'UA', 'UA',
      'nawa_director', 'direct_studies', 'science-096',
      '0613', null,
      'final_certificate', 'school_leaver',
      51, 100, 'none',
      'merit_review_positive', current_date
    )$$,
  'ordinary update after suspicious flag still succeeds'
);
select is(
  (select is_suspicious from public.responses where identity_hash = pg_temp.h(820000001)),
  true,
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
    "rankPosition": 5,
    "rankTotal": 10,
    "trackWideMedian": null,
    "scoreBuckets": [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
    "cohortScores": null,
    "cohortScope": "track",
    "cohortGroupId": null
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
    "rankPosition": null,
    "rankTotal": null,
    "trackWideMedian": null,
    "scoreBuckets": null,
    "cohortScores": null,
    "cohortScope": null,
    "cohortGroupId": null
  }'::jsonb),
  '{
    "detailsAvailable": false,
    "totalValidResponses": 2,
    "sameTrackCount": 2,
    "sameCountryCount": null,
    "groupResponseCount": 0,
    "medianScore": null,
    "lowerScorePercentage": null,
    "rankPosition": null,
    "rankTotal": null,
    "trackWideMedian": null,
    "scoreBuckets": null,
    "cohortScores": null,
    "cohortScope": null,
    "cohortGroupId": null
  }'::jsonb,
  'statistics assertion accepts suppressed nullable fields'
);
select throws_ok($$select public.assert_statistics_result(null)$$, 'P0001', 'statistics_unavailable', 'null statistics are unavailable');
select throws_ok($$select public.assert_statistics_result('[]'::jsonb)$$, 'P0001', 'statistics_invalid', 'statistics must be an object');
select throws_ok($$select public.assert_statistics_result((select result - 'scoreBuckets' from valid_statistics))$$, 'P0001', 'statistics_invalid', 'statistics reject missing keys');
select throws_ok($$select public.assert_statistics_result((select result || '{"extra":1}'::jsonb from valid_statistics))$$, 'P0001', 'statistics_invalid', 'statistics reject extra keys');

select throws_ok($$select public.assert_statistics_result((select jsonb_set(result, '{cohortScope}', '"planet"') from valid_statistics))$$, 'P0001', 'statistics_invalid', 'statistics reject unknown cohort scopes');
select throws_ok($$select public.assert_statistics_result((select jsonb_set(result, '{cohortScope}', 'null') from valid_statistics))$$, 'P0001', 'statistics_invalid', 'detailed statistics must name their cohort scope');
select throws_ok($$select public.assert_statistics_result((select jsonb_set(result, '{totalValidResponses}', '1.5') from valid_statistics))$$, 'P0001', 'statistics_invalid', 'statistics counts must be integers');
select throws_ok($$select public.assert_statistics_result((select jsonb_set(result, '{sameTrackCount}', '-1') from valid_statistics))$$, 'P0001', 'statistics_invalid', 'statistics counts must be nonnegative');
select throws_ok($$select public.assert_statistics_result((select jsonb_set(result, '{sameCountryCount}', '9') from valid_statistics))$$, 'P0001', 'statistics_invalid', 'disclosed country counts must meet the privacy threshold');
select throws_ok($$select public.assert_statistics_result((select jsonb_set(result, '{lowerScorePercentage}', '101') from valid_statistics))$$, 'P0001', 'statistics_invalid', 'statistics percentages must stay within bounds');
select throws_ok($$select public.assert_statistics_result((select jsonb_set(result, '{detailsAvailable}', 'false') from valid_statistics))$$, 'P0001', 'statistics_invalid', 'suppressed statistics cannot retain detailed values');

create temporary table response_before_failed_statistics(result jsonb) on commit drop;
insert into response_before_failed_statistics
select to_jsonb(r) from public.responses r where identity_hash = pg_temp.h(820000001);

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
      pg_temp.h(820000001),
      2026,
      false, 'DE', 'DE',
      'nawa_director', 'direct_studies', 'science-096',
      '0613', null,
      'final_certificate', 'school_leaver',
      9, 10, 'none',
      'merit_review_positive', current_date
    )$$,
  'P0001',
  'statistics_invalid',
  'malformed non-null update statistics fail inside the transaction'
);
select is(
  (select to_jsonb(r) from public.responses r where identity_hash = pg_temp.h(820000001)),
  (select result from response_before_failed_statistics),
  'malformed statistics roll back every update change'
);

select * from finish();
rollback;
