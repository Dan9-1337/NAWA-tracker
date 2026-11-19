begin;

create extension if not exists pgtap with schema extensions;

create function pg_temp.h(bigint) returns text language sql immutable as $$ select lpad(to_hex($1), 64, '0') $$;


truncate table public.responses restart identity cascade;

select plan(11);

-- Test helper: n director responses for a country with scores start .. start + n - 1.
create function pg_temp.seed(p_base bigint, p_country text, p_n integer, p_start numeric, p_status text default 'submitted', p_year integer default 2026, p_suspicious boolean default false)
returns void language sql as $$
  insert into public.responses (
    identity_hash, intake_year, has_polish_citizenship, ranking_country, school_country,
    scholarship_track, study_route, average_grade, maximum_grade, grade_percentage,
    polish_school_level, nawa_orientation_score, current_status, status_changed_at, is_suspicious
  )
  select pg_temp.h(p_base + v), p_year, false, p_country, p_country,
    'nawa_director', 'direct_studies', 80, 100, 80, 'none', p_start + v - 1,
    p_status, current_date, p_suspicious
  from generate_series(1, p_n) as v;
$$;

select is(public.country_group_id('JP'), 'world-other', 'unlisted countries fall into world-other');
select is(public.country_group_id('KZ'), 'east', 'listed countries resolve to their group');

-- Caller: Georgian, with 3 + 4 + 4 responses across the "east" group (no country reaches 10).
select pg_temp.seed(850000000, 'GE', 3, 70);
select pg_temp.seed(850001000, 'KZ', 4, 70);
select pg_temp.seed(850002000, 'AM', 4, 70);

select is(
  public.get_current_statistics(pg_temp.h(859999999), 2026), null,
  'unknown caller has no statistics'
);

-- Make the first GE row the caller.
update public.responses set identity_hash = pg_temp.h(850009999) where identity_hash = pg_temp.h(850000001);

select is(
  public.get_current_statistics(pg_temp.h(850009999), 2026)->>'cohortScope', 'group',
  'a country below ten responses compares inside its country group'
);
select is(
  public.get_current_statistics(pg_temp.h(850009999), 2026)->>'cohortGroupId', 'east',
  'the group id of the pooled cohort is reported'
);
select is(
  (public.get_current_statistics(pg_temp.h(850009999), 2026)->>'groupResponseCount')::integer, 11,
  'the group cohort counts every response in the group'
);
select is(
  public.get_current_statistics(pg_temp.h(850009999), 2026)->>'sameCountryCount', null,
  'the single-country count stays hidden below ten'
);

-- Other intake years never leak into this season's cohort.
select pg_temp.seed(850003000, 'GE', 20, 70, 'submitted', 2027);
select is(
  (public.get_current_statistics(pg_temp.h(850009999), 2026)->>'totalValidResponses')::integer, 11,
  'responses from another intake year are not counted'
);

-- Country tier once the country itself has ten responses.
select pg_temp.seed(850004000, 'GE', 8, 70);
select is(
  public.get_current_statistics(pg_temp.h(850009999), 2026)->>'cohortScope', 'country',
  'a country with ten responses compares with itself'
);

-- Track tier: nobody in the caller's group, but the whole track has enough.
select pg_temp.seed(850005000, 'JP', 5, 70);
select pg_temp.seed(850006000, 'BR', 5, 70);
delete from public.responses where ranking_country in ('GE', 'KZ', 'AM') and intake_year = 2026 and identity_hash <> pg_temp.h(850009999);
select is(
  public.get_current_statistics(pg_temp.h(850009999), 2026)->>'detailsAvailable', 'true',
  'the track-wide fallback still yields a cohort when pooling the group is not enough'
);
select is(
  public.get_current_statistics(pg_temp.h(850009999), 2026)->>'cohortScope', 'track',
  'the fallback tier is named'
);

select * from finish();
rollback;
