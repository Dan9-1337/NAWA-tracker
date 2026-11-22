begin;

create extension if not exists pgtap with schema extensions;

create function pg_temp.h(bigint) returns text language sql immutable as $$ select lpad(to_hex($1), 64, '0') $$;


truncate table public.responses restart identity cascade;

select plan(39);

-- Test helper: n director responses for one country, scores start .. start + n - 1.
create function pg_temp.seed(
  p_base bigint,
  p_country text,
  p_n integer,
  p_start numeric,
  p_suspicious boolean default false,
  p_year integer default 2026,
  p_track text default 'nawa_director'
)
returns void language sql as $$
  insert into public.responses (
    identity_hash, intake_year, has_polish_citizenship, ranking_country, school_country,
    scholarship_track, study_route, average_grade, maximum_grade, grade_percentage,
    polish_school_level, nawa_orientation_score, current_status, status_changed_at, is_suspicious
  )
  select pg_temp.h(p_base + v), p_year, false, p_country, p_country,
    p_track,
    case when p_track = 'nawa_director' then 'direct_studies' else 'preparatory_course' end,
    80, 100, 80,
    case when p_track = 'nawa_director' then 'none' end,
    case when p_track = 'nawa_director' then p_start + v - 1 end,
    'submitted', current_date, p_suspicious
  from generate_series(1, p_n) as v;
$$;

-- ---------------------------------------------------------------------------
-- A1: BY has three valid surveys; the whole track has many more. The caller is the highest score.
-- ---------------------------------------------------------------------------

select pg_temp.seed(860000000, 'BY', 3, 70);
select pg_temp.seed(860001000, 'UA', 15, 70);

update public.responses set identity_hash = pg_temp.h(869999999) where identity_hash = pg_temp.h(860000003);

select is(
  (public.get_current_statistics(pg_temp.h(869999999), 2026)->>'detailsAvailable')::boolean,
  true,
  'three surveys in the country show the full position'
);
select is(
  (public.get_current_statistics(pg_temp.h(869999999), 2026)->>'sameCountryCount')::integer,
  3,
  'sameCountryCount is the country cohort size'
);
select is(
  (public.get_current_statistics(pg_temp.h(869999999), 2026)->>'groupResponseCount')::integer,
  3,
  'the cohort size equals the country count, not the larger track'
);
select is(
  (public.get_current_statistics(pg_temp.h(869999999), 2026)->>'rankTotal')::integer,
  3,
  'rankTotal is the country cohort size'
);
select is(
  public.get_current_statistics(pg_temp.h(869999999), 2026)->>'cohortScope',
  'country',
  'the cohort scope is the country'
);
select is(
  (public.get_current_statistics(pg_temp.h(869999999), 2026)->>'rankPosition')::integer,
  1,
  'rank counts only higher scores of the same country'
);
select is(
  (public.get_current_statistics(pg_temp.h(869999999), 2026)->>'medianScore')::numeric,
  71::numeric,
  'the median comes from the three country scores only'
);
select is(
  round((public.get_current_statistics(pg_temp.h(869999999), 2026)->>'lowerScorePercentage')::numeric, 2),
  66.67::numeric,
  'the percentile comes from the three country scores only'
);
select is(
  (select sum(value::numeric) from jsonb_array_elements_text(public.get_current_statistics(pg_temp.h(869999999), 2026)->'scoreBuckets') as t(value)),
  3::numeric,
  'the score buckets sum to the country cohort'
);
select is(
  (public.get_current_statistics(pg_temp.h(869999999), 2026)->>'sameTrackCount')::integer,
  18,
  'the track count stays visible but is not the cohort'
);
select is(
  (public.get_current_statistics(pg_temp.h(869999999), 2026)->>'totalValidResponses')::integer,
  18,
  'every valid survey of the intake is counted'
);

-- ---------------------------------------------------------------------------
-- A5: a suspicious survey in the same country is excluded from every count.
-- ---------------------------------------------------------------------------

select pg_temp.seed(860002000, 'BY', 1, 100, true);

select is(
  (public.get_current_statistics(pg_temp.h(869999999), 2026)->>'sameCountryCount')::integer,
  3,
  'a suspicious survey in the country is excluded from the cohort'
);
select is(
  (public.get_current_statistics(pg_temp.h(869999999), 2026)->>'totalValidResponses')::integer,
  18,
  'a suspicious survey is excluded from the valid intake'
);
select is(
  (public.get_current_statistics(pg_temp.h(869999999), 2026)->>'medianScore')::numeric,
  71::numeric,
  'a suspicious survey does not move the median'
);

-- ---------------------------------------------------------------------------
-- A4: nine surveys in a country whose group has many more: still a full country card, no group pooling.
-- ---------------------------------------------------------------------------

select pg_temp.seed(860003000, 'GE', 9, 70);
select pg_temp.seed(860004000, 'KZ', 20, 70);
select pg_temp.seed(860005000, 'RU', 15, 70);

update public.responses set identity_hash = pg_temp.h(869999998) where identity_hash = pg_temp.h(860003001);

select is(
  (public.get_current_statistics(pg_temp.h(869999998), 2026)->>'detailsAvailable')::boolean,
  true,
  'nine surveys in the country show the full position'
);
select is(
  (public.get_current_statistics(pg_temp.h(869999998), 2026)->>'sameCountryCount')::integer,
  9,
  'nine surveys are reported as the country count'
);
select is(
  (public.get_current_statistics(pg_temp.h(869999998), 2026)->>'groupResponseCount')::integer,
  9,
  'the east group of KZ and RU is not pooled into the Georgian cohort'
);
select is(
  public.get_current_statistics(pg_temp.h(869999998), 2026)->>'cohortScope',
  'country',
  'the Georgian cohort stays the country'
);
select is(
  (public.get_current_statistics(pg_temp.h(869999998), 2026)->>'medianScore')::numeric,
  74::numeric,
  'the Georgian median comes from its own nine surveys'
);

-- ---------------------------------------------------------------------------
-- A2: the only valid survey of the country: no position, no percentile, no median, no distribution.
-- ---------------------------------------------------------------------------

select pg_temp.seed(860006000, 'DE', 1, 70);

update public.responses set identity_hash = pg_temp.h(869999997) where identity_hash = pg_temp.h(860006001);

select is(
  (public.get_current_statistics(pg_temp.h(869999997), 2026)->>'detailsAvailable')::boolean,
  false,
  'a single survey in the country shows no position'
);
select is(
  (public.get_current_statistics(pg_temp.h(869999997), 2026)->>'sameCountryCount')::integer,
  1,
  'the country count is reported without a floor'
);
select is(
  (public.get_current_statistics(pg_temp.h(869999997), 2026)->>'groupResponseCount')::integer,
  0,
  'a payload without details has an empty cohort size'
);
select is(
  public.get_current_statistics(pg_temp.h(869999997), 2026)->>'rankTotal',
  null,
  'a payload without details has no rank total'
);
select is(
  public.get_current_statistics(pg_temp.h(869999997), 2026)->>'medianScore',
  null,
  'a payload without details has no median'
);
select is(
  public.get_current_statistics(pg_temp.h(869999997), 2026)->>'lowerScorePercentage',
  null,
  'a payload without details has no percentile'
);
select is(
  public.get_current_statistics(pg_temp.h(869999997), 2026)->>'scoreBuckets',
  null,
  'a payload without details has no distribution'
);
select is(
  public.get_current_statistics(pg_temp.h(869999997), 2026)->>'cohortScope',
  null,
  'a payload without details names no cohort scope'
);
select is(
  public.get_current_statistics(pg_temp.h(869999997), 2026)->>'trackWideMedian',
  null,
  'the retired track-wide median is always null'
);
select is(
  public.get_current_statistics(pg_temp.h(869999997), 2026)->>'cohortGroupId',
  null,
  'the retired group id is always null'
);

-- ---------------------------------------------------------------------------
-- A3: exactly two surveys in the country: rank, percentile, median and distribution.
-- ---------------------------------------------------------------------------

select pg_temp.seed(860007000, 'LT', 1, 70);
select pg_temp.seed(860007500, 'LT', 1, 80);

update public.responses set identity_hash = pg_temp.h(869999996) where identity_hash = pg_temp.h(860007001);

select is(
  (public.get_current_statistics(pg_temp.h(869999996), 2026)->>'detailsAvailable')::boolean,
  true,
  'two surveys in the country show the full position'
);
select is(
  (public.get_current_statistics(pg_temp.h(869999996), 2026)->>'sameCountryCount')::integer,
  2,
  'sameCountryCount reports the two surveys'
);
select is(
  (public.get_current_statistics(pg_temp.h(869999996), 2026)->>'groupResponseCount')::integer,
  2,
  'the cohort size is two'
);
select is(
  (public.get_current_statistics(pg_temp.h(869999996), 2026)->>'rankTotal')::integer,
  2,
  'rankTotal is two'
);
select is(
  (public.get_current_statistics(pg_temp.h(869999996), 2026)->>'medianScore')::numeric,
  75::numeric,
  'the median is the middle of the two country scores'
);
select is(
  (select sum(value::numeric) from jsonb_array_elements_text(public.get_current_statistics(pg_temp.h(869999996), 2026)->'scoreBuckets') as t(value)),
  2::numeric,
  'the score buckets sum to two'
);

-- ---------------------------------------------------------------------------
-- Other intake years and other tracks never leak into the cohort.
-- ---------------------------------------------------------------------------

select pg_temp.seed(860008000, 'BY', 20, 70, false, 2027);
select is(
  (public.get_current_statistics(pg_temp.h(869999999), 2026)->>'sameCountryCount')::integer,
  3,
  'responses from another intake year are not counted'
);

select pg_temp.seed(860009000, 'BY', 5, 70, false, 2026, 'health_minister');
select is(
  (public.get_current_statistics(pg_temp.h(869999999), 2026)->>'sameTrackCount')::integer,
  65,
  'responses from another track are not counted'
);
select is(
  (public.get_current_statistics(pg_temp.h(869999999), 2026)->>'totalValidResponses')::integer,
  70,
  'responses from another track stay in the valid intake total'
);
select is(
  (select count(*) from jsonb_object_keys(public.get_current_statistics(pg_temp.h(869999999), 2026)))::integer,
  14,
  'the payload keeps its fourteen keys'
);

select * from finish();
rollback;
