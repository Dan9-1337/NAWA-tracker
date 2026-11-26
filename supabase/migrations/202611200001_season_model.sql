--
-- Season model.
--
-- * One record per Telegram user per intake year (nabór), not one per user.
-- * grade_basis: which document the average comes from (final certificate vs half-year 2025/26).
-- * applicant_kind: students in Poland with an average >= 4.75 (scale 2-5) are assigned 100 points
--   (Ogłoszenie 13/2026, pkt 2.7).
-- * New terminal outcome scholarship_not_awarded: merit-positive but no seat within the country limit.
-- * Terminal -> terminal status corrections are allowed (no review queue nobody reads).
-- * Drops the never-read audit/review tables and the per-user statistics snapshots.
-- * University is asked on both study routes, as in the NAWA application form.
--
-- Cohort statistics functions still ignore intake_year; they are scoped by year together with the
-- cohort ladder rewrite in the next migration (only intake year 2026 exists until then).
--

-- ---------------------------------------------------------------------------
-- Columns and constraints
-- ---------------------------------------------------------------------------

alter table public.responses
  add column intake_year integer not null default 2026,
  add column grade_basis text not null default 'final_certificate',
  add column applicant_kind text not null default 'school_leaver';

alter table public.responses
  add constraint responses_intake_year_check check (intake_year between 2018 and 2100),
  add constraint responses_grade_basis_check check (grade_basis in ('final_certificate', 'half_year')),
  add constraint responses_applicant_kind_check check (applicant_kind in ('school_leaver', 'student_in_poland')),
  add constraint responses_student_in_poland_score_check
    check (applicant_kind <> 'student_in_poland' or nawa_orientation_score = 100);

-- The FKs from these tables reference responses(telegram_user_id), which stops being unique.
drop table public.status_change_requests;
drop table public.response_audit_log;
drop function public.upsert_user_statistics_snapshot(bigint, jsonb);
drop function public.get_user_statistics_history(bigint, integer);
drop table public.user_statistics_snapshots;

alter table public.responses drop constraint responses_telegram_user_id_key;
alter table public.responses
  add constraint responses_telegram_user_id_intake_year_key unique (telegram_user_id, intake_year);

alter table public.responses drop constraint responses_current_status_check;
alter table public.responses
  add constraint responses_current_status_check check (current_status in (
    'submitted',
    'formal_review_positive',
    'merit_review_positive',
    'merit_review_negative',
    'scholarship_awarded',
    'scholarship_not_awarded'
  ));

alter table public.responses drop constraint responses_target_university_route_check;

-- ---------------------------------------------------------------------------
-- Status ladder and score (single SQL source of truth)
-- ---------------------------------------------------------------------------

create or replace function public.is_allowed_status_transition(p_from text, p_to text) returns boolean
    language sql immutable
    set search_path to 'pg_catalog'
    as $$
  select case
    when p_from = p_to then true
    when p_from = 'submitted' and p_to = 'formal_review_positive' then true
    when p_from = 'formal_review_positive' and p_to in ('merit_review_positive', 'merit_review_negative') then true
    when p_from = 'merit_review_positive' and p_to in ('scholarship_awarded', 'scholarship_not_awarded') then true
    else false
  end;
$$;

create function public.compute_orientation_score(
  p_average_grade numeric,
  p_maximum_grade numeric,
  p_ranking_country text,
  p_polish_school_level text,
  p_applicant_kind text
) returns numeric
    language sql immutable
    set search_path to 'pg_catalog'
    as $$
  select case
    when p_applicant_kind = 'student_in_poland' then 100::numeric
    else round(
      p_average_grade / p_maximum_grade * 90
        + case
            when p_ranking_country <> 'BY' then
              case p_polish_school_level when 'primary' then 5 when 'secondary' then 10 else 0 end
            else 0
          end,
      2
    )
  end;
$$;

-- ---------------------------------------------------------------------------
-- Statistics enrichment without snapshots
-- ---------------------------------------------------------------------------

create or replace function public.enrich_statistics_result(
  p_telegram_user_id bigint,
  p_statistics jsonb,
  p_scholarship_track text,
  p_ranking_country text,
  p_metric_value numeric,
  p_include_growth boolean default false
) returns jsonb
    language plpgsql security definer
    set search_path to 'pg_catalog'
    as $$
begin
  return p_statistics
    || jsonb_build_object(
      'growth7d',
      case
        when p_include_growth then public.compute_statistics_growth7d(
          p_scholarship_track,
          p_ranking_country,
          p_metric_value
        )
        else null
      end,
      'history', '[]'::jsonb,
      'groupProgress',
      case
        when (p_statistics->>'sameCountryCount')::int >= 10 then public.compute_group_progress(
          p_scholarship_track,
          p_ranking_country
        )
        else null
      end,
      'reportedMeritOutcomes',
      case
        when (p_statistics->>'sameCountryCount')::int >= 10 then public.compute_reported_merit_outcomes(
          p_scholarship_track,
          p_ranking_country
        )
        else null
      end,
      'globalBenchmark',
      public.compute_track_benchmark(p_scholarship_track, p_metric_value),
      'countryContext',
      public.compute_country_context(
        p_statistics,
        p_scholarship_track,
        p_ranking_country,
        p_metric_value
      )
    );
end;
$$;

-- ---------------------------------------------------------------------------
-- RPCs keyed by (telegram user, intake year)
-- ---------------------------------------------------------------------------

drop function public.create_response_for_telegram_user(bigint, text, boolean, text, text, text, text, text, numeric, numeric, text, text, date);
drop function public.update_current_response(bigint, text, boolean, text, text, text, text, text, numeric, numeric, text, text, date);
drop function public.get_current_response(bigint);
drop function public.get_current_statistics(bigint);

create function public.create_response_for_telegram_user(
  p_telegram_user_id bigint,
  p_telegram_username text,
  p_intake_year integer,
  p_has_polish_citizenship boolean,
  p_ranking_country text,
  p_school_country text,
  p_scholarship_track text,
  p_study_route text,
  p_target_university text,
  p_grade_basis text,
  p_applicant_kind text,
  p_average_grade numeric,
  p_maximum_grade numeric,
  p_polish_school_level text,
  p_current_status text,
  p_status_changed_at date
) returns jsonb
    language plpgsql security definer
    set search_path to 'pg_catalog'
    as $$
declare
  v_response_id uuid;
  v_statistics jsonb;
  v_nawa_score numeric;
begin
  if p_maximum_grade <= 0 or p_average_grade < 0 or p_average_grade > p_maximum_grade then
    raise exception using errcode = 'P0001', message = 'invalid_response';
  end if;

  if p_scholarship_track <> 'nawa_director' then
    raise exception using errcode = 'P0001', message = 'track_not_available';
  end if;

  if exists (
    select 1
    from public.responses
    where telegram_user_id = p_telegram_user_id
      and intake_year = p_intake_year
  ) then
    raise exception using errcode = 'P0001', message = 'profile_exists';
  end if;

  v_nawa_score := public.compute_orientation_score(
    p_average_grade, p_maximum_grade, p_ranking_country, p_polish_school_level, p_applicant_kind
  );

  begin
    insert into public.responses (
      telegram_user_id,
      telegram_username,
      intake_year,
      has_polish_citizenship,
      ranking_country,
      school_country,
      scholarship_track,
      study_route,
      target_university,
      grade_basis,
      applicant_kind,
      average_grade,
      maximum_grade,
      grade_percentage,
      polish_school_level,
      nawa_orientation_score,
      current_status,
      status_changed_at
    ) values (
      p_telegram_user_id,
      p_telegram_username,
      p_intake_year,
      p_has_polish_citizenship,
      p_ranking_country,
      p_school_country,
      p_scholarship_track,
      p_study_route,
      p_target_university,
      p_grade_basis,
      p_applicant_kind,
      p_average_grade,
      p_maximum_grade,
      p_average_grade / p_maximum_grade * 100,
      p_polish_school_level,
      v_nawa_score,
      p_current_status,
      p_status_changed_at
    )
    returning id into v_response_id;
  exception
    when unique_violation then
      raise exception using errcode = 'P0001', message = 'profile_exists';
  end;

  v_statistics := public.assert_statistics_result(public.get_response_statistics(v_response_id));

  return jsonb_build_object('created', true, 'statistics', v_statistics);
end;
$$;

create function public.update_current_response(
  p_telegram_user_id bigint,
  p_telegram_username text,
  p_intake_year integer,
  p_has_polish_citizenship boolean,
  p_ranking_country text,
  p_school_country text,
  p_scholarship_track text,
  p_study_route text,
  p_target_university text,
  p_grade_basis text,
  p_applicant_kind text,
  p_average_grade numeric,
  p_maximum_grade numeric,
  p_polish_school_level text,
  p_current_status text,
  p_status_changed_at date
) returns jsonb
    language plpgsql security definer
    set search_path to 'pg_catalog'
    as $$
declare
  v_response public.responses%rowtype;
  v_suspicious_transition boolean;
  v_nawa_score numeric;
  v_terminal_statuses text[] := array['merit_review_negative', 'scholarship_awarded', 'scholarship_not_awarded'];
  v_statistics jsonb;
begin
  if p_maximum_grade <= 0 or p_average_grade < 0 or p_average_grade > p_maximum_grade then
    raise exception using errcode = 'P0001', message = 'invalid_response';
  end if;

  if p_scholarship_track <> 'nawa_director' then
    raise exception using errcode = 'P0001', message = 'track_not_available';
  end if;

  select r.*
  into v_response
  from public.responses r
  where r.telegram_user_id = p_telegram_user_id
    and r.intake_year = p_intake_year
  for update;

  if not found then
    return null;
  end if;

  if v_response.current_status <> p_current_status
     and not public.is_allowed_status_transition(v_response.current_status, p_current_status)
     -- correcting one final outcome to another (a mis-tap) is allowed
     and not (
       v_response.current_status = any(v_terminal_statuses)
       and p_current_status = any(v_terminal_statuses)
     ) then
    raise exception using errcode = 'P0001', message = 'invalid_status_transition';
  end if;

  v_suspicious_transition := v_response.current_status <> p_current_status
    and p_status_changed_at < v_response.status_changed_at;

  v_nawa_score := public.compute_orientation_score(
    p_average_grade, p_maximum_grade, p_ranking_country, p_polish_school_level, p_applicant_kind
  );

  update public.responses
  set telegram_username = p_telegram_username,
      has_polish_citizenship = p_has_polish_citizenship,
      ranking_country = p_ranking_country,
      school_country = p_school_country,
      scholarship_track = p_scholarship_track,
      study_route = p_study_route,
      target_university = p_target_university,
      grade_basis = p_grade_basis,
      applicant_kind = p_applicant_kind,
      average_grade = p_average_grade,
      maximum_grade = p_maximum_grade,
      grade_percentage = p_average_grade / p_maximum_grade * 100,
      polish_school_level = p_polish_school_level,
      nawa_orientation_score = v_nawa_score,
      current_status = p_current_status,
      status_changed_at = p_status_changed_at,
      is_suspicious = v_response.is_suspicious or v_suspicious_transition
  where id = v_response.id;

  v_statistics := public.assert_statistics_result(public.get_response_statistics(v_response.id));

  return jsonb_build_object('updated', true, 'statistics', v_statistics);
end;
$$;

create function public.get_current_response(p_telegram_user_id bigint, p_intake_year integer) returns jsonb
    language sql stable security definer
    set search_path to 'pg_catalog'
    as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'intakeYear', r.intake_year,
    'hasPolishCitizenship', r.has_polish_citizenship,
    'rankingCountry', r.ranking_country,
    'schoolCountry', r.school_country,
    'scholarshipTrack', r.scholarship_track,
    'studyRoute', r.study_route,
    'targetUniversity', r.target_university,
    'gradeBasis', r.grade_basis,
    'applicantKind', r.applicant_kind,
    'averageGrade', r.average_grade,
    'maximumGrade', r.maximum_grade,
    'polishSchoolLevel', r.polish_school_level,
    'currentStatus', r.current_status,
    'statusChangedAt', r.status_changed_at
  ))
  from public.responses r
  where r.telegram_user_id = p_telegram_user_id
    and r.intake_year = p_intake_year;
$$;

create function public.get_current_statistics(p_telegram_user_id bigint, p_intake_year integer) returns jsonb
    language plpgsql security definer
    set search_path to 'pg_catalog'
    as $$
declare
  v_target public.responses%rowtype;
  v_metric numeric;
  v_statistics jsonb;
begin
  select r.* into v_target
  from public.responses r
  where r.telegram_user_id = p_telegram_user_id
    and r.intake_year = p_intake_year;

  if not found then
    return null;
  end if;

  v_metric := case
    when v_target.scholarship_track = 'nawa_director' then v_target.nawa_orientation_score
    else v_target.grade_percentage
  end;

  v_statistics := public.compute_country_statistics(
    v_target.scholarship_track,
    v_target.ranking_country,
    v_metric
  );

  return public.assert_statistics_result(
    public.enrich_statistics_result(
      p_telegram_user_id,
      v_statistics,
      v_target.scholarship_track,
      v_target.ranking_country,
      v_metric,
      true
    )
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

revoke all on function public.compute_orientation_score(numeric, numeric, text, text, text) from public, anon, authenticated, service_role;

revoke all on function public.create_response_for_telegram_user(bigint, text, integer, boolean, text, text, text, text, text, text, text, numeric, numeric, text, text, date) from public, anon, authenticated;
revoke all on function public.update_current_response(bigint, text, integer, boolean, text, text, text, text, text, text, text, numeric, numeric, text, text, date) from public, anon, authenticated;
revoke all on function public.get_current_response(bigint, integer) from public, anon, authenticated;
revoke all on function public.get_current_statistics(bigint, integer) from public, anon, authenticated;

grant execute on function public.create_response_for_telegram_user(bigint, text, integer, boolean, text, text, text, text, text, text, text, numeric, numeric, text, text, date) to service_role;
grant execute on function public.update_current_response(bigint, text, integer, boolean, text, text, text, text, text, text, text, numeric, numeric, text, text, date) to service_role;
grant execute on function public.get_current_response(bigint, integer) to service_role;
grant execute on function public.get_current_statistics(bigint, integer) to service_role;
