begin;

create extension if not exists pgtap with schema extensions;

create function pg_temp.h(bigint) returns text language sql immutable as $$ select lpad(to_hex($1), 64, '0') $$;


truncate table public.responses restart identity cascade;

select plan(11);

create function pg_temp.seed_scores(p_base bigint, p_country text, p_status text, p_scores numeric[], p_year integer default 2026, p_suspicious boolean default false)
returns void language sql as $$
  insert into public.responses (
    identity_hash, intake_year, has_polish_citizenship, ranking_country, school_country,
    scholarship_track, study_route, average_grade, maximum_grade, grade_percentage,
    polish_school_level, nawa_orientation_score, current_status, status_changed_at, is_suspicious
  )
  select pg_temp.h(p_base + ordinality), p_year, false, p_country, p_country,
    'nawa_director', 'direct_studies', 80, 100, 80, 'none', score,
    p_status, current_date, p_suspicious
  from unnest(p_scores) with ordinality as t(score, ordinality);
$$;

-- Caller: Ukrainian, nothing reported yet.
select pg_temp.seed_scores(860000000, 'UA', 'submitted', array[80]);
select is(
  public.get_cohort_outcomes(pg_temp.h(860000001), 2026)->>'scope', null,
  'no cohort is disclosed before three awards are reported'
);
select is(public.get_cohort_outcomes(pg_temp.h(860099999), 2026), null, 'unknown callers get nothing');

-- Two awarded UA responses are still below the floor.
select pg_temp.seed_scores(860001000, 'UA', 'scholarship_awarded', array[72.3, 80.0]);
select is(
  public.get_cohort_outcomes(pg_temp.h(860000001), 2026)->>'scope', null,
  'two awarded responses are not disclosed'
);

-- Third award: the country is disclosed, rounded outward to 5-point bands.
select pg_temp.seed_scores(860002000, 'UA', 'scholarship_awarded', array[88.8]);
select is(
  public.get_cohort_outcomes(pg_temp.h(860000001), 2026)->>'scope', 'country',
  'three awarded responses disclose the country cohort'
);
select is(
  (public.get_cohort_outcomes(pg_temp.h(860000001), 2026)->>'awardedBandLow')::numeric, 70::numeric,
  'the lowest awarded score is rounded down to a 5-point band'
);
select is(
  (public.get_cohort_outcomes(pg_temp.h(860000001), 2026)->>'awardedBandHigh')::numeric, 90::numeric,
  'the highest awarded score is rounded up to a 5-point band'
);
select ok(
  position('72.3' in public.get_cohort_outcomes(pg_temp.h(860000001), 2026)::text) = 0
    and position('88.8' in public.get_cohort_outcomes(pg_temp.h(860000001), 2026)::text) = 0,
  'no exact applicant score is exposed'
);

-- Not-awarded evidence appears only from three reports and is banded too.
select pg_temp.seed_scores(860003000, 'UA', 'scholarship_not_awarded', array[65.0, 66.5]);
select is(
  public.get_cohort_outcomes(pg_temp.h(860000001), 2026)->>'notAwardedBandHigh', null,
  'two not-awarded responses are not disclosed'
);
select pg_temp.seed_scores(860004000, 'UA', 'scholarship_not_awarded', array[69.1]);
select is(
  (public.get_cohort_outcomes(pg_temp.h(860000001), 2026)->>'awardedRate')::numeric, 0.50::numeric,
  'the awarded rate is computed among merit-positive responses'
);

-- Suspicious responses and other intake years are ignored.
select pg_temp.seed_scores(860005000, 'UA', 'scholarship_awarded', array[99, 99, 99], 2026, true);
select pg_temp.seed_scores(860006000, 'UA', 'scholarship_awarded', array[99, 99, 99], 2027, false);
select is(
  (public.get_cohort_outcomes(pg_temp.h(860000001), 2026)->>'awardedCount')::integer, 3,
  'suspicious responses and other intake years do not count'
);

-- Group fallback: a Georgian caller has no awards of their own but the east group does.
select pg_temp.seed_scores(860007000, 'GE', 'submitted', array[75]);
select pg_temp.seed_scores(860008000, 'KZ', 'scholarship_awarded', array[71, 74, 83]);
select is(
  public.get_cohort_outcomes(pg_temp.h(860007001), 2026)->>'groupId', 'east',
  'the outcomes cohort falls back to the country group'
);

select * from finish();
rollback;
