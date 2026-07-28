-- Partner university for applicants going directly to first-cycle studies (no preparatory course).

alter table public.responses
  add column if not exists target_university text
  check (target_university is null or length(target_university) between 1 and 64);

alter table public.responses
  drop constraint if exists responses_target_university_route_check;

alter table public.responses
  add constraint responses_target_university_route_check check (
    study_route <> 'preparatory_course' or target_university is null
  );

create index if not exists responses_target_university_idx
  on public.responses (target_university)
  where target_university is not null;

drop function if exists public.create_response_for_telegram_user(bigint, text, boolean, text, text, text, text, numeric, numeric, text, text, date);
drop function if exists public.update_current_response(bigint, text, boolean, text, text, text, text, numeric, numeric, text, text, date);

create function public.create_response_for_telegram_user(
  p_telegram_user_id bigint,
  p_telegram_username text,
  p_has_polish_citizenship boolean,
  p_ranking_country text,
  p_school_country text,
  p_scholarship_track text,
  p_study_route text,
  p_target_university text,
  p_average_grade numeric,
  p_maximum_grade numeric,
  p_polish_school_level text,
  p_current_status text,
  p_status_changed_at date
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_response_id uuid;
  v_statistics jsonb;
  v_nawa_score numeric;
begin
  if p_maximum_grade <= 0 or p_average_grade < 0 or p_average_grade > p_maximum_grade then
    raise exception using errcode = 'P0001', message = 'invalid_response';
  end if;

  if exists (
    select 1
    from public.responses
    where telegram_user_id = p_telegram_user_id
  ) then
    raise exception using errcode = 'P0001', message = 'profile_exists';
  end if;

  v_nawa_score := case
    when p_scholarship_track = 'nawa_director' then round(
      p_average_grade / p_maximum_grade * 90
        + case p_polish_school_level when 'primary' then 5 when 'secondary' then 10 else 0 end,
      2
    )
    else null
  end;

  begin
    insert into public.responses (
      telegram_user_id,
      telegram_username,
      has_polish_citizenship,
      ranking_country,
      school_country,
      scholarship_track,
      study_route,
      target_university,
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
      p_has_polish_citizenship,
      p_ranking_country,
      p_school_country,
      p_scholarship_track,
      p_study_route,
      p_target_university,
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

create or replace function public.get_current_response(p_telegram_user_id bigint)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'hasPolishCitizenship', r.has_polish_citizenship,
    'rankingCountry', r.ranking_country,
    'schoolCountry', r.school_country,
    'scholarshipTrack', r.scholarship_track,
    'studyRoute', r.study_route,
    'targetUniversity', r.target_university,
    'averageGrade', r.average_grade,
    'maximumGrade', r.maximum_grade,
    'polishSchoolLevel', r.polish_school_level,
    'currentStatus', r.current_status,
    'statusChangedAt', r.status_changed_at
  ))
  from public.responses r
  where r.telegram_user_id = p_telegram_user_id;
$$;

create function public.update_current_response(
  p_telegram_user_id bigint,
  p_telegram_username text,
  p_has_polish_citizenship boolean,
  p_ranking_country text,
  p_school_country text,
  p_scholarship_track text,
  p_study_route text,
  p_target_university text,
  p_average_grade numeric,
  p_maximum_grade numeric,
  p_polish_school_level text,
  p_current_status text,
  p_status_changed_at date
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_response public.responses%rowtype;
  v_response_id uuid;
  v_suspicious_transition boolean;
  v_nawa_score numeric;
  v_terminal_statuses text[] := array['merit_review_negative', 'scholarship_awarded', 'scholarship_not_awarded'];
  v_opposing_award_statuses text[] := array['scholarship_awarded', 'scholarship_not_awarded'];
  v_statistics jsonb;
begin
  if p_maximum_grade <= 0 or p_average_grade < 0 or p_average_grade > p_maximum_grade then
    raise exception using errcode = 'P0001', message = 'invalid_response';
  end if;

  select r.* into v_response
  from public.responses r
  where r.telegram_user_id = p_telegram_user_id
  for update;

  if not found then
    return null;
  end if;

  v_response_id := v_response.id;

  v_suspicious_transition := v_response.current_status <> p_current_status and (
    (v_response.current_status = any(v_terminal_statuses) and p_current_status <> any(v_terminal_statuses))
    or (v_response.current_status = any(v_opposing_award_statuses) and p_current_status = any(v_opposing_award_statuses))
    or p_status_changed_at < v_response.status_changed_at
  );

  v_nawa_score := case
    when p_scholarship_track = 'nawa_director' then round(
      p_average_grade / p_maximum_grade * 90
        + case p_polish_school_level when 'primary' then 5 when 'secondary' then 10 else 0 end,
      2
    )
    else null
  end;

  update public.responses
  set telegram_username = p_telegram_username,
      has_polish_citizenship = p_has_polish_citizenship,
      ranking_country = p_ranking_country,
      school_country = p_school_country,
      scholarship_track = p_scholarship_track,
      study_route = p_study_route,
      target_university = p_target_university,
      average_grade = p_average_grade,
      maximum_grade = p_maximum_grade,
      grade_percentage = p_average_grade / p_maximum_grade * 100,
      polish_school_level = p_polish_school_level,
      nawa_orientation_score = v_nawa_score,
      current_status = p_current_status,
      status_changed_at = p_status_changed_at,
      is_suspicious = v_response.is_suspicious or v_suspicious_transition
  where id = v_response.id;

  v_statistics := public.assert_statistics_result(public.get_response_statistics(v_response_id));

  return jsonb_build_object('updated', true, 'statistics', v_statistics);
end;
$$;

revoke all on function public.create_response_for_telegram_user(bigint, text, boolean, text, text, text, text, text, numeric, numeric, text, text, date) from public, anon, authenticated;
revoke all on function public.get_current_response(bigint) from public, anon, authenticated;
revoke all on function public.update_current_response(bigint, text, boolean, text, text, text, text, text, numeric, numeric, text, text, date) from public, anon, authenticated;

grant execute on function public.create_response_for_telegram_user(bigint, text, boolean, text, text, text, text, text, numeric, numeric, text, text, date) to service_role;
grant execute on function public.get_current_response(bigint) to service_role;
grant execute on function public.update_current_response(bigint, text, boolean, text, text, text, text, text, numeric, numeric, text, text, date) to service_role;
