begin;

create extension if not exists pgtap with schema extensions;

select plan(40);

do $$
begin
  perform public.create_response_with_session(
    'stats-target-recovery', 'stats-target-session', now() + interval '1 day',
    'stats-ip-target', null, 'nawa_mnisw', 'direct_studies', 'first_cycle',
    'PL', 100, 50, 'Target University', 'Target Field', 'first_choice', 'submitted', null
  );
end;
$$;

insert into public.responses (
  recovery_token_hash, scholarship_track, study_route, study_type, country,
  grade_scale, grade_value, grade_percentage, university, study_field,
  choice_priority, application_status, is_suspicious
)
select
  'stats-peer-' || value,
  'nawa_mnisw', 'direct_studies', 'first_cycle', 'PL',
  100, value, value, 'Target University', 'Target Field',
  'first_choice',
  case
    when value <= 30 then 'positive_decision'
    when value <= 60 then 'negative_decision'
    else 'under_review'
  end,
  false
from generate_series(10, 80, 10) as value;

select is(
  (public.get_current_statistics('stats-target-session')->>'detailsAvailable')::boolean,
  false,
  'details are suppressed when every comparison group has fewer than ten responses'
);
select is(public.get_current_statistics('stats-target-session')->>'group', null, 'suppressed statistics disclose no fallback group');
select is(public.get_current_statistics('stats-target-session')->>'medianGradePercentage', null, 'suppressed statistics disclose no median');
select is(public.get_current_statistics('stats-target-session')->>'lowerGradePercentage', null, 'suppressed statistics disclose no percentile');
select is(public.get_current_statistics('stats-target-session')->>'sameUniversityCount', null, 'university count below ten is suppressed');
select is(public.get_current_statistics('stats-target-session')->>'sameUniversityAndFieldCount', null, 'university and field count below ten is suppressed');

insert into public.responses (
  recovery_token_hash, scholarship_track, study_route, study_type, country,
  grade_scale, grade_value, grade_percentage, university, study_field,
  choice_priority, application_status, is_suspicious
) values (
  'stats-peer-90', 'nawa_mnisw', 'direct_studies', 'first_cycle', 'PL',
  100, 90, 90, 'Target University', 'Target Field', 'first_choice', 'waiting_for_decision', false
);

select is(
  public.get_current_statistics('stats-target-session')->>'group',
  'track-route-type-university-field',
  'statistics choose the most specific group with at least ten responses'
);
select is(
  (public.get_current_statistics('stats-target-session')->>'groupResponseCount')::integer,
  10,
  'the selected group count includes all valid matching responses'
);
select is(
  (public.get_current_statistics('stats-target-session')->>'medianGradePercentage')::numeric,
  50::numeric,
  'median grade percentage uses the selected group'
);
select is(
  (public.get_current_statistics('stats-target-session')->>'lowerGradePercentage')::numeric,
  40::numeric,
  'percentile counts only strictly lower grades'
);
select is(
  (public.get_current_statistics('stats-target-session')->>'waitingForDecisionCount')::integer,
  4,
  'waiting count includes all non-final waiting statuses'
);
select is(
  (public.get_current_statistics('stats-target-session')->>'sameUniversityCount')::integer,
  10,
  'university count is returned at the privacy threshold'
);
select is(
  (public.get_current_statistics('stats-target-session')->>'sameUniversityAndFieldCount')::integer,
  10,
  'university and field count is returned at the privacy threshold'
);

insert into public.responses (
  recovery_token_hash, scholarship_track, study_route, study_type, country,
  grade_scale, grade_value, grade_percentage, university, study_field,
  choice_priority, application_status, is_suspicious
) values (
  'stats-suspicious', 'nawa_mnisw', 'direct_studies', 'first_cycle', 'PL',
  100, 0, 0, 'Target University', 'Target Field', 'first_choice', 'submitted', true
);
select is(
  (public.get_current_statistics('stats-target-session')->>'totalValidResponses')::integer,
  10,
  'suspicious responses are excluded from aggregate counts'
);
select is(
  (public.get_current_statistics('stats-target-session')->>'groupResponseCount')::integer,
  10,
  'suspicious responses are excluded from comparison groups'
);

update public.responses
set study_field = 'Other Field'
where recovery_token_hash in ('stats-peer-70', 'stats-peer-80', 'stats-peer-90');
select is(
  public.get_current_statistics('stats-target-session')->>'group',
  'track-route-type-university',
  'statistics fall back from field to university when needed'
);
select is(
  (public.get_current_statistics('stats-target-session')->>'sameUniversityCount')::integer,
  10,
  'university count remains available when it meets the threshold'
);
select is(
  public.get_current_statistics('stats-target-session')->>'sameUniversityAndFieldCount',
  null,
  'university and field count is suppressed independently'
);

update public.responses
set university = 'Other University'
where recovery_token_hash in ('stats-peer-50', 'stats-peer-60', 'stats-peer-70', 'stats-peer-80', 'stats-peer-90');
select is(
  public.get_current_statistics('stats-target-session')->>'group',
  'track-route-type',
  'statistics fall back from university to track, route, and type when needed'
);
select is(public.get_current_statistics('stats-target-session')->>'sameUniversityCount', null, 'low university count is suppressed after fallback');
select is(public.get_current_statistics('stats-target-session')->>'sameUniversityAndFieldCount', null, 'low university and field count remains suppressed after fallback');

with mutation as (
  select public.update_current_response(
    'stats-target-session', 'nawa_mnisw', 'direct_studies', 'first_cycle', 'PL',
    100, 50, 'Target University', 'Target Field', 'first_choice', 'positive_decision', current_date
  ) as result
)
select ok(
  (result->>'updated')::boolean and result->'statistics' is not null,
  'authenticated response update returns success with in-transaction statistics'
)
from mutation;
select is(
  (select is_suspicious from public.responses where recovery_token_hash = 'stats-target-recovery'),
  false,
  'the first final decision does not mark a response suspicious'
);
select ok(
  (public.update_current_response(
    'stats-target-session', 'nawa_mnisw', 'direct_studies', 'first_cycle', 'PL',
    100, 50, 'Target University', 'Target Field', 'first_choice', 'negative_decision', current_date
  )->>'updated')::boolean
  and (select is_suspicious from public.responses where recovery_token_hash = 'stats-target-recovery'),
  'opposing final decisions mark a response suspicious and keep the flag sticky'
);
select ok(
  (public.update_current_response(
    'stats-target-session', 'nawa_mnisw', 'direct_studies', 'first_cycle', 'PL',
    100, 50, 'Target University', 'Target Field', 'first_choice', 'submitted', null
  )->>'updated')::boolean
  and (select is_suspicious from public.responses where recovery_token_hash = 'stats-target-recovery'),
  'suspicious status remains set after a later ordinary update'
);

create temporary table valid_statistics(result jsonb) on commit drop;
insert into valid_statistics values (
  '{
    "detailsAvailable": true,
    "group": "track-route-type",
    "totalValidResponses": 20,
    "sameTrackCount": 15,
    "sameUniversityCount": null,
    "sameUniversityAndFieldCount": null,
    "groupResponseCount": 10,
    "medianGradePercentage": 50,
    "lowerGradePercentage": 40,
    "waitingForDecisionCount": 4,
    "positiveDecisionCount": 3,
    "negativeDecisionCount": 3
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
    "group": null,
    "totalValidResponses": 2,
    "sameTrackCount": 2,
    "sameUniversityCount": null,
    "sameUniversityAndFieldCount": null,
    "groupResponseCount": 0,
    "medianGradePercentage": null,
    "lowerGradePercentage": null,
    "waitingForDecisionCount": null,
    "positiveDecisionCount": null,
    "negativeDecisionCount": null
  }'::jsonb),
  '{
    "detailsAvailable": false,
    "group": null,
    "totalValidResponses": 2,
    "sameTrackCount": 2,
    "sameUniversityCount": null,
    "sameUniversityAndFieldCount": null,
    "groupResponseCount": 0,
    "medianGradePercentage": null,
    "lowerGradePercentage": null,
    "waitingForDecisionCount": null,
    "positiveDecisionCount": null,
    "negativeDecisionCount": null
  }'::jsonb,
  'statistics assertion accepts suppressed nullable fields'
);
select throws_ok($$select public.assert_statistics_result(null)$$, 'P0001', 'statistics_unavailable', 'null statistics are unavailable');
select throws_ok($$select public.assert_statistics_result('[]'::jsonb)$$, 'P0001', 'statistics_invalid', 'statistics must be an object');
select throws_ok($$select public.assert_statistics_result((select result - 'group' from valid_statistics))$$, 'P0001', 'statistics_invalid', 'statistics reject missing keys');
select throws_ok($$select public.assert_statistics_result((select result || '{"extra":1}'::jsonb from valid_statistics))$$, 'P0001', 'statistics_invalid', 'statistics reject extra keys');
select throws_ok($$select public.assert_statistics_result((select jsonb_set(result, '{group}', '"invalid"') from valid_statistics))$$, 'P0001', 'statistics_invalid', 'statistics reject unknown groups');
select throws_ok($$select public.assert_statistics_result((select jsonb_set(result, '{totalValidResponses}', '1.5') from valid_statistics))$$, 'P0001', 'statistics_invalid', 'statistics counts must be integers');
select throws_ok($$select public.assert_statistics_result((select jsonb_set(result, '{sameTrackCount}', '-1') from valid_statistics))$$, 'P0001', 'statistics_invalid', 'statistics counts must be nonnegative');
select throws_ok($$select public.assert_statistics_result((select jsonb_set(result, '{sameUniversityCount}', '9') from valid_statistics))$$, 'P0001', 'statistics_invalid', 'disclosed university counts must meet the privacy threshold');
select throws_ok($$select public.assert_statistics_result((select jsonb_set(result, '{medianGradePercentage}', '101') from valid_statistics))$$, 'P0001', 'statistics_invalid', 'statistics percentages must stay within bounds');
select throws_ok($$select public.assert_statistics_result((select jsonb_set(result, '{detailsAvailable}', 'false') from valid_statistics))$$, 'P0001', 'statistics_invalid', 'suppressed statistics cannot retain detailed values');
select throws_ok($$select public.assert_statistics_result((select jsonb_set(result, '{group}', 'null') from valid_statistics))$$, 'P0001', 'statistics_invalid', 'available details require a comparison group');

create temporary table response_before_failed_statistics(result jsonb) on commit drop;
insert into response_before_failed_statistics
select to_jsonb(r) from public.responses r where recovery_token_hash = 'stats-target-recovery';

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
      'stats-target-session', 'minister_culture', 'preparatory_course', 'uniform_masters', 'DE',
      10, 9, 'Changed University', 'Changed Field', 'other', 'positive_decision', current_date
    )$$,
  'P0001',
  'statistics_invalid',
  'malformed non-null update statistics fail inside the transaction'
);
select is(
  (select to_jsonb(r) from public.responses r where recovery_token_hash = 'stats-target-recovery'),
  (select result from response_before_failed_statistics),
  'malformed statistics roll back every update change'
);

select * from finish();
rollback;
