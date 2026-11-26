--
-- Scholarship-holder survey: preparatory centre, wished-for kierunek and university (docs/adr/0012), with the
-- results page of docs/adr/0016 and the score snapshot / threshold of docs/adr/0017.
--
-- * One report per survey: `(identity_hash, intake_year)` is the primary key and a foreign key to
--   `responses (identity_hash, intake_year)` with `on delete cascade`, so deleting a survey deletes its report.
-- * `score_snapshot` is the survey's `nawa_orientation_score` when the report is created or edited. It is set by
--   the server only, is never below the merit threshold of 60, and an earlier survey edit does not move it.
-- * The preparatory centre is present exactly on the preparatory path; exactly one of the catalogue programme
--   and the typed kierunek is present. `programme_isced` comes from the server catalogue and has no value for a
--   typed kierunek. Typed text is trimmed, 1-80 characters and single-line; it is never part of a summary.
-- * The summary refuses callers without a report, counts only reports whose survey is not `is_suspicious`, has
--   no disclosure floor and filters by the survey's `ranking_country` (null = every country). Its `countries`
--   list is deliberately not filtered, so the results page can switch back without another request.
-- * Service-role only: the table and every function are revoked from public, anon and authenticated.
--

create table public.scholarship_reports (
  identity_hash text not null check (identity_hash ~ '^[0-9a-f]{64}$'),
  intake_year integer not null,
  score_snapshot numeric not null check (score_snapshot >= 60),
  study_route text not null check (study_route in ('preparatory_course', 'direct_studies')),
  prep_centre_id text check (prep_centre_id is null or length(prep_centre_id) between 1 and 64),
  programme_id text check (programme_id is null or length(programme_id) between 1 and 120),
  programme_isced text check (programme_isced is null or programme_isced ~ '^[0-9]{4}$'),
  custom_programme text check (
    custom_programme is null
    or (
      custom_programme = btrim(custom_programme)
      and length(custom_programme) between 1 and 80
      and custom_programme !~ '[\r\n]'
    )
  ),
  university_id text not null check (length(university_id) between 1 and 64),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint scholarship_reports_pkey primary key (identity_hash, intake_year),
  constraint scholarship_reports_response_fkey
    foreign key (identity_hash, intake_year)
    references public.responses (identity_hash, intake_year)
    on delete cascade,
  constraint scholarship_reports_centre_check check (
    (study_route = 'preparatory_course') = (prep_centre_id is not null)
  ),
  constraint scholarship_reports_programme_check check (
    (programme_id is null) <> (custom_programme is null)
  ),
  constraint scholarship_reports_programme_pair_check check (
    (programme_id is null and programme_isced is null)
    or (programme_id is not null and programme_isced is not null)
  )
);

alter table public.scholarship_reports enable row level security;
revoke all on table public.scholarship_reports from public, anon, authenticated;
grant select, insert, update, delete on table public.scholarship_reports to service_role;

create function public.get_scholarship_report(p_identity_hash text, p_intake_year integer) returns jsonb
    language sql stable security definer
    set search_path to 'pg_catalog'
    as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'studyRoute', sr.study_route,
    'prepCentreId', sr.prep_centre_id,
    'programmeId', sr.programme_id,
    'customProgramme', sr.custom_programme,
    'universityId', sr.university_id,
    'scoreSnapshot', sr.score_snapshot
  ))
  from public.scholarship_reports sr
  where sr.identity_hash = p_identity_hash
    and sr.intake_year = p_intake_year;
$$;

create function public.create_scholarship_report(
  p_identity_hash text,
  p_intake_year integer,
  p_study_route text,
  p_prep_centre_id text,
  p_programme_id text,
  p_programme_isced text,
  p_custom_programme text,
  p_university_id text
) returns jsonb
    language plpgsql security definer
    set search_path to 'pg_catalog'
    as $$
declare
  v_score numeric;
begin
  select r.nawa_orientation_score
  into v_score
  from public.responses r
  where r.identity_hash = p_identity_hash
    and r.intake_year = p_intake_year
    and r.scholarship_track = 'nawa_director'
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'profile_not_found';
  end if;

  -- Below the merit threshold of 60 no scholarship can have been awarded, so nothing is stored (ADR 0017).
  if v_score is null or v_score < 60 then
    raise exception using errcode = 'P0001', message = 'score_below_threshold';
  end if;

  if exists (
    select 1
    from public.scholarship_reports
    where identity_hash = p_identity_hash
      and intake_year = p_intake_year
  ) then
    raise exception using errcode = 'P0001', message = 'report_exists';
  end if;

  begin
    insert into public.scholarship_reports (
      identity_hash,
      intake_year,
      score_snapshot,
      study_route,
      prep_centre_id,
      programme_id,
      programme_isced,
      custom_programme,
      university_id
    ) values (
      p_identity_hash,
      p_intake_year,
      v_score,
      p_study_route,
      p_prep_centre_id,
      p_programme_id,
      p_programme_isced,
      p_custom_programme,
      p_university_id
    );
  exception
    when unique_violation then
      raise exception using errcode = 'P0001', message = 'report_exists';
  end;

  return public.get_scholarship_report(p_identity_hash, p_intake_year);
end;
$$;

create function public.update_scholarship_report(
  p_identity_hash text,
  p_intake_year integer,
  p_study_route text,
  p_prep_centre_id text,
  p_programme_id text,
  p_programme_isced text,
  p_custom_programme text,
  p_university_id text
) returns jsonb
    language plpgsql security definer
    set search_path to 'pg_catalog'
    as $$
declare
  v_score numeric;
begin
  select r.nawa_orientation_score
  into v_score
  from public.responses r
  where r.identity_hash = p_identity_hash
    and r.intake_year = p_intake_year
    and r.scholarship_track = 'nawa_director'
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'profile_not_found';
  end if;

  if v_score is null or v_score < 60 then
    raise exception using errcode = 'P0001', message = 'score_below_threshold';
  end if;

  -- Every save refreshes the snapshot from the survey; the survey edit itself never moves an existing snapshot.
  update public.scholarship_reports
  set study_route = p_study_route,
      prep_centre_id = p_prep_centre_id,
      programme_id = p_programme_id,
      programme_isced = p_programme_isced,
      custom_programme = p_custom_programme,
      university_id = p_university_id,
      score_snapshot = v_score,
      updated_at = now()
  where identity_hash = p_identity_hash
    and intake_year = p_intake_year;

  if not found then
    raise exception using errcode = 'P0001', message = 'report_not_found';
  end if;

  return public.get_scholarship_report(p_identity_hash, p_intake_year);
end;
$$;

create function public.delete_scholarship_report(p_identity_hash text, p_intake_year integer) returns jsonb
    language plpgsql security definer
    set search_path to 'pg_catalog'
    as $$
begin
  delete from public.scholarship_reports
  where identity_hash = p_identity_hash
    and intake_year = p_intake_year;

  if not found then
    raise exception using errcode = 'P0001', message = 'report_not_found';
  end if;

  return jsonb_build_object('deleted', true);
end;
$$;

create function public.get_scholarship_report_summary(
  p_identity_hash text,
  p_intake_year integer,
  p_ranking_country text default null
) returns jsonb
    language plpgsql stable security definer
    set search_path to 'pg_catalog'
    as $$
declare
  v_summary jsonb;
begin
  -- Only a contributor sees the results (ADR 0012 and 0016); the API answers 404 REPORT_NOT_FOUND.
  if not exists (
    select 1
    from public.scholarship_reports
    where identity_hash = p_identity_hash
      and intake_year = p_intake_year
  ) then
    return null;
  end if;

  with counted as (
    select
      sr.study_route,
      sr.prep_centre_id,
      sr.programme_id,
      sr.programme_isced,
      sr.custom_programme,
      sr.university_id,
      r.ranking_country
    from public.scholarship_reports sr
    join public.responses r
      on r.identity_hash = sr.identity_hash
     and r.intake_year = sr.intake_year
    where sr.intake_year = p_intake_year
      and r.scholarship_track = 'nawa_director'
      and not r.is_suspicious
  ),
  selected as (
    select *
    from counted
    where p_ranking_country is null
      or ranking_country = p_ranking_country
  ),
  country_counts as (
    select ranking_country as country, count(*)::integer as n
    from counted
    group by 1
  ),
  path_counts as (
    select study_route as route, count(*)::integer as n
    from selected
    group by 1
  ),
  centre_counts as (
    select prep_centre_id as centre_id, count(*)::integer as n
    from selected
    where prep_centre_id is not null
    group by 1
  ),
  programme_counts as (
    select left(programme_isced, 2) as group_code, programme_id, count(*)::integer as n
    from selected
    where programme_id is not null
      and programme_isced is not null
    group by 1, 2
  ),
  field_counts as (
    select
      group_code,
      sum(n)::integer as n,
      jsonb_agg(
        jsonb_build_object('programmeId', programme_id, 'count', n)
        order by n desc, programme_id
      ) as programmes
    from programme_counts
    group by 1
  ),
  university_counts as (
    select university_id, count(*)::integer as n
    from selected
    group by 1
  )
  select jsonb_build_object(
    'total', (select count(*)::integer from selected),
    'countries', coalesce(
      (
        select jsonb_agg(jsonb_build_object('country', country, 'count', n) order by n desc, country)
        from country_counts
      ),
      '[]'::jsonb
    ),
    'paths', jsonb_build_array(
      jsonb_build_object(
        'route', 'preparatory_course',
        'count', coalesce((select n from path_counts where route = 'preparatory_course'), 0)
      ),
      jsonb_build_object(
        'route', 'direct_studies',
        'count', coalesce((select n from path_counts where route = 'direct_studies'), 0)
      )
    ),
    'centres', coalesce(
      (
        select jsonb_agg(jsonb_build_object('centreId', centre_id, 'count', n) order by n desc, centre_id)
        from centre_counts
      ),
      '[]'::jsonb
    ),
    'fields', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object('group', group_code, 'count', n, 'programmes', programmes)
          order by n desc, group_code
        )
        from field_counts
      ),
      '[]'::jsonb
    ),
    'typedProgrammeCount', (
      select count(*)::integer
      from selected
      where custom_programme is not null
    ),
    'universities', coalesce(
      (
        select jsonb_agg(jsonb_build_object('universityId', university_id, 'count', n) order by n desc, university_id)
        from university_counts
      ),
      '[]'::jsonb
    )
  )
  into v_summary;

  return v_summary;
end;
$$;

revoke all on function public.get_scholarship_report(text, integer) from public, anon, authenticated;
revoke all on function public.create_scholarship_report(text, integer, text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.update_scholarship_report(text, integer, text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.delete_scholarship_report(text, integer) from public, anon, authenticated;
revoke all on function public.get_scholarship_report_summary(text, integer, text) from public, anon, authenticated;

grant execute on function public.get_scholarship_report(text, integer) to service_role;
grant execute on function public.create_scholarship_report(text, integer, text, text, text, text, text, text) to service_role;
grant execute on function public.update_scholarship_report(text, integer, text, text, text, text, text, text) to service_role;
grant execute on function public.delete_scholarship_report(text, integer) to service_role;
grant execute on function public.get_scholarship_report_summary(text, integer, text) to service_role;
