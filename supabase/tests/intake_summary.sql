begin;

create extension if not exists pgtap with schema extensions;

create function pg_temp.h(bigint) returns text language sql immutable as $$ select lpad(to_hex($1), 64, '0') $$;


truncate table public.responses restart identity cascade;

select plan(9);

-- Test helper: n valid director responses for the given year (optionally flagged suspicious).
create function pg_temp.seed(p_base bigint, p_n integer, p_year integer default 2026, p_suspicious boolean default false)
returns void language sql as $$
  insert into public.responses (
    identity_hash, intake_year, has_polish_citizenship, ranking_country, school_country,
    scholarship_track, study_route, average_grade, maximum_grade, grade_percentage,
    polish_school_level, nawa_orientation_score, current_status, status_changed_at, is_suspicious
  )
  select pg_temp.h(p_base + v), p_year, false, 'UA', 'UA',
    'nawa_director', 'direct_studies', 80, 100, 80, 'none', 70 + v,
    'submitted', current_date, p_suspicious
  from generate_series(1, p_n) as v;
$$;

-- Nine valid responses: one below the floor of ten.
select pg_temp.seed(930000000, 9);

select is(
  (public.get_intake_summary()->>'intakeYear')::integer,
  public.active_intake_year(),
  'the summary names the active intake year'
);
select is(
  public.get_intake_summary()->>'responseCount',
  null,
  'a count below the cohort floor is suppressed instead of disclosed'
);

-- The tenth valid response reaches the floor.
select pg_temp.seed(930001000, 1);
select is(
  (public.get_intake_summary()->>'responseCount')::integer,
  10,
  'the count is disclosed at the cohort floor'
);

-- Suspicious rows and other intake years are not part of the population.
select pg_temp.seed(930002000, 3, 2026, true);
select pg_temp.seed(930003000, 4, 2025);
select is(
  (public.get_intake_summary()->>'responseCount')::integer,
  10,
  'suspicious responses and other intake years are excluded'
);

-- Same population as totalValidResponses in get_current_statistics: the first seeded row is the caller.
select is(
  (public.get_intake_summary()->>'responseCount')::integer,
  (public.get_current_statistics(pg_temp.h(930000001), 2026)->>'totalValidResponses')::integer,
  'the landing count equals totalValidResponses for the same data'
);

select ok(
  not has_function_privilege('anon', 'public.get_intake_summary()', 'execute')
    and not has_function_privilege('authenticated', 'public.get_intake_summary()', 'execute')
    and has_function_privilege('service_role', 'public.get_intake_summary()', 'execute'),
  'only the service role may read the intake summary'
);

-- ADR 0018: the API reads the active year through get_active_intake_year().
select is(
  public.get_active_intake_year(),
  public.active_intake_year(),
  'get_active_intake_year returns the active intake year'
);

update public.season_config set active_intake_year = 2027;
select is(
  public.get_active_intake_year(),
  2027,
  'a rollover is one update of season_config: the RPC follows it'
);

select ok(
  not has_function_privilege('anon', 'public.get_active_intake_year()', 'execute')
    and not has_function_privilege('authenticated', 'public.get_active_intake_year()', 'execute')
    and has_function_privilege('service_role', 'public.get_active_intake_year()', 'execute'),
  'only the service role may read the active intake year'
);

select * from finish();
rollback;
