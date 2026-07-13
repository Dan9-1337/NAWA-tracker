create extension if not exists pgcrypto with schema extensions;

create table public.responses (
  id uuid primary key default gen_random_uuid(),
  recovery_token_hash text not null unique check (length(recovery_token_hash) > 0),
  recovery_token_created_at timestamptz not null default now(),
  recovery_token_rotated_at timestamptz,
  scholarship_track text not null check (scholarship_track in ('nawa_mnisw', 'minister_health', 'minister_culture')),
  study_route text not null check (study_route in ('preparatory_course', 'direct_studies')),
  study_type text not null check (study_type in ('first_cycle', 'uniform_masters')),
  country text not null check (length(country) between 1 and 100),
  grade_scale numeric not null check (grade_scale between 1 and 1000),
  grade_value numeric not null check (grade_value between 0 and grade_scale),
  grade_percentage numeric not null check (
    grade_percentage between 0 and 100
    and grade_percentage = grade_value / grade_scale * 100
  ),
  university text not null check (length(university) between 1 and 200),
  study_field text not null check (length(study_field) between 1 and 200),
  choice_priority text not null check (choice_priority in ('first_choice', 'second_choice', 'other')),
  application_status text not null check (
    application_status in (
      'submitted',
      'under_review',
      'documents_requested',
      'waiting_for_decision',
      'positive_decision',
      'negative_decision'
    )
  ),
  decision_date date,
  is_suspicious boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (application_status in ('positive_decision', 'negative_decision'))
    or decision_date is null
  )
);

create table public.anonymous_sessions (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.responses(id) on delete cascade,
  session_token_hash text not null unique check (length(session_token_hash) > 0),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table public.submission_limits (
  id uuid primary key default gen_random_uuid(),
  ip_hash text not null check (length(ip_hash) > 0),
  limit_type text not null check (limit_type in ('create', 'restore')),
  response_fingerprint text,
  created_at timestamptz not null default now()
);

create index responses_scholarship_track_idx on public.responses (scholarship_track);
create index responses_study_route_idx on public.responses (study_route);
create index responses_study_type_idx on public.responses (study_type);
create index responses_country_idx on public.responses (country);
create index responses_university_idx on public.responses (university);
create index responses_study_field_idx on public.responses (study_field);
create index responses_application_status_idx on public.responses (application_status);
create index responses_grade_percentage_idx on public.responses (grade_percentage);
create index anonymous_sessions_response_id_idx on public.anonymous_sessions (response_id);
create index anonymous_sessions_expires_at_idx on public.anonymous_sessions (expires_at);
create index submission_limits_lookup_idx on public.submission_limits (ip_hash, limit_type, created_at);

create function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger responses_set_updated_at
before update on public.responses
for each row execute function public.set_updated_at();

create function public.resolve_anonymous_session(p_session_token_hash text)
returns uuid
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select response_id
  from public.anonymous_sessions
  where session_token_hash = p_session_token_hash
    and revoked_at is null
    and expires_at > now()
  limit 1;
$$;

create function public.get_response_statistics(p_response_id uuid)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = pg_catalog
as $$
declare
  v_target public.responses%rowtype;
  v_group text;
  v_group_count bigint := 0;
  v_total_count bigint;
  v_same_track_count bigint;
  v_same_university_count bigint;
  v_same_university_field_count bigint;
  v_median numeric;
  v_lower_percentage numeric;
  v_waiting_count bigint;
  v_positive_count bigint;
  v_negative_count bigint;
begin
  select r.* into v_target
  from public.responses r
  where r.id = p_response_id;

  if not found then
    return null;
  end if;

  select
    count(*),
    count(*) filter (where scholarship_track = v_target.scholarship_track),
    count(*) filter (where university = v_target.university),
    count(*) filter (where university = v_target.university and study_field = v_target.study_field)
  into v_total_count, v_same_track_count, v_same_university_count, v_same_university_field_count
  from public.responses
  where not is_suspicious;

  select count(*) into v_group_count
  from public.responses
  where not is_suspicious
    and scholarship_track = v_target.scholarship_track
    and study_route = v_target.study_route
    and study_type = v_target.study_type
    and university = v_target.university
    and study_field = v_target.study_field;

  if v_group_count >= 10 then
    v_group := 'track-route-type-university-field';
  else
    select count(*) into v_group_count
    from public.responses
    where not is_suspicious
      and scholarship_track = v_target.scholarship_track
      and study_route = v_target.study_route
      and study_type = v_target.study_type
      and university = v_target.university;

    if v_group_count >= 10 then
      v_group := 'track-route-type-university';
    else
      select count(*) into v_group_count
      from public.responses
      where not is_suspicious
        and scholarship_track = v_target.scholarship_track
        and study_route = v_target.study_route
        and study_type = v_target.study_type;

      if v_group_count >= 10 then
        v_group := 'track-route-type';
      else
        v_group := null;
        v_group_count := 0;
      end if;
    end if;
  end if;

  if v_group is not null then
    select
      percentile_cont(0.5) within group (order by grade_percentage),
      count(*) filter (where grade_percentage < v_target.grade_percentage)::numeric / count(*) * 100,
      count(*) filter (
        where application_status in ('submitted', 'under_review', 'documents_requested', 'waiting_for_decision')
      ),
      count(*) filter (where application_status = 'positive_decision'),
      count(*) filter (where application_status = 'negative_decision')
    into v_median, v_lower_percentage, v_waiting_count, v_positive_count, v_negative_count
    from public.responses
    where not is_suspicious
      and scholarship_track = v_target.scholarship_track
      and study_route = v_target.study_route
      and study_type = v_target.study_type
      and (v_group = 'track-route-type' or university = v_target.university)
      and (v_group <> 'track-route-type-university-field' or study_field = v_target.study_field);
  end if;

  return jsonb_build_object(
    'detailsAvailable', v_group is not null,
    'group', v_group,
    'totalValidResponses', v_total_count,
    'sameTrackCount', v_same_track_count,
    'sameUniversityCount', case
      when v_same_university_count >= 10 then v_same_university_count
      else null
    end,
    'sameUniversityAndFieldCount', case
      when v_same_university_field_count >= 10 then v_same_university_field_count
      else null
    end,
    'groupResponseCount', v_group_count,
    'medianGradePercentage', v_median,
    'lowerGradePercentage', v_lower_percentage,
    'waitingForDecisionCount', v_waiting_count,
    'positiveDecisionCount', v_positive_count,
    'negativeDecisionCount', v_negative_count
  );
end;
$$;

create function public.assert_statistics_result(p_statistics jsonb)
returns jsonb
language plpgsql
immutable
security invoker
set search_path = pg_catalog
as $$
declare
  v_key text;
  v_number numeric;
  v_details_available boolean;
  v_group text;
  v_total_count numeric;
  v_same_track_count numeric;
  v_same_university_count numeric;
  v_same_university_field_count numeric;
  v_group_count numeric;
  v_waiting_count numeric;
  v_positive_count numeric;
  v_negative_count numeric;
begin
  if p_statistics is null then
    raise exception using errcode = 'P0001', message = 'statistics_unavailable';
  end if;

  if jsonb_typeof(p_statistics) <> 'object'
    or (select count(*) from jsonb_object_keys(p_statistics)) <> 12
    or not p_statistics ?& array[
      'detailsAvailable',
      'group',
      'totalValidResponses',
      'sameTrackCount',
      'sameUniversityCount',
      'sameUniversityAndFieldCount',
      'groupResponseCount',
      'medianGradePercentage',
      'lowerGradePercentage',
      'waitingForDecisionCount',
      'positiveDecisionCount',
      'negativeDecisionCount'
    ]
  then
    raise exception using errcode = 'P0001', message = 'statistics_invalid';
  end if;

  if jsonb_typeof(p_statistics->'detailsAvailable') <> 'boolean'
    or not (
      jsonb_typeof(p_statistics->'group') = 'null'
      or (
        jsonb_typeof(p_statistics->'group') = 'string'
        and p_statistics->>'group' in (
          'track-route-type-university-field',
          'track-route-type-university',
          'track-route-type'
        )
      )
    )
  then
    raise exception using errcode = 'P0001', message = 'statistics_invalid';
  end if;

  foreach v_key in array array[
    'totalValidResponses',
    'sameTrackCount',
    'groupResponseCount'
  ]
  loop
    if jsonb_typeof(p_statistics->v_key) <> 'number' then
      raise exception using errcode = 'P0001', message = 'statistics_invalid';
    end if;
    v_number := (p_statistics->>v_key)::numeric;
    if v_number < 0 or trunc(v_number) <> v_number then
      raise exception using errcode = 'P0001', message = 'statistics_invalid';
    end if;
  end loop;

  foreach v_key in array array[
    'sameUniversityCount',
    'sameUniversityAndFieldCount'
  ]
  loop
    if jsonb_typeof(p_statistics->v_key) <> 'null' then
      if jsonb_typeof(p_statistics->v_key) <> 'number' then
        raise exception using errcode = 'P0001', message = 'statistics_invalid';
      end if;
      v_number := (p_statistics->>v_key)::numeric;
      if v_number < 10 or trunc(v_number) <> v_number then
        raise exception using errcode = 'P0001', message = 'statistics_invalid';
      end if;
    end if;
  end loop;

  foreach v_key in array array[
    'waitingForDecisionCount',
    'positiveDecisionCount',
    'negativeDecisionCount'
  ]
  loop
    if jsonb_typeof(p_statistics->v_key) <> 'null' then
      if jsonb_typeof(p_statistics->v_key) <> 'number' then
        raise exception using errcode = 'P0001', message = 'statistics_invalid';
      end if;
      v_number := (p_statistics->>v_key)::numeric;
      if v_number < 0 or trunc(v_number) <> v_number then
        raise exception using errcode = 'P0001', message = 'statistics_invalid';
      end if;
    end if;
  end loop;

  foreach v_key in array array[
    'medianGradePercentage',
    'lowerGradePercentage'
  ]
  loop
    if jsonb_typeof(p_statistics->v_key) <> 'null' then
      if jsonb_typeof(p_statistics->v_key) <> 'number' then
        raise exception using errcode = 'P0001', message = 'statistics_invalid';
      end if;
      v_number := (p_statistics->>v_key)::numeric;
      if v_number not between 0 and 100 then
        raise exception using errcode = 'P0001', message = 'statistics_invalid';
      end if;
    end if;
  end loop;

  v_details_available := (p_statistics->>'detailsAvailable')::boolean;
  v_group := p_statistics->>'group';
  v_total_count := (p_statistics->>'totalValidResponses')::numeric;
  v_same_track_count := (p_statistics->>'sameTrackCount')::numeric;
  v_same_university_count := (p_statistics->>'sameUniversityCount')::numeric;
  v_same_university_field_count := (p_statistics->>'sameUniversityAndFieldCount')::numeric;
  v_group_count := (p_statistics->>'groupResponseCount')::numeric;
  v_waiting_count := (p_statistics->>'waitingForDecisionCount')::numeric;
  v_positive_count := (p_statistics->>'positiveDecisionCount')::numeric;
  v_negative_count := (p_statistics->>'negativeDecisionCount')::numeric;

  if v_same_track_count > v_total_count
    or v_group_count > v_same_track_count
    or (v_same_university_count is not null and v_same_university_count > v_total_count)
    or (v_same_university_field_count is not null and v_same_university_count is null)
    or (
      v_same_university_field_count is not null
      and v_same_university_field_count > v_same_university_count
    )
  then
    raise exception using errcode = 'P0001', message = 'statistics_invalid';
  end if;

  if v_details_available then
    if v_group is null
      or v_group_count < 10
      or p_statistics->'medianGradePercentage' = 'null'::jsonb
      or p_statistics->'lowerGradePercentage' = 'null'::jsonb
      or v_waiting_count is null
      or v_positive_count is null
      or v_negative_count is null
      or v_waiting_count + v_positive_count + v_negative_count <> v_group_count
    then
      raise exception using errcode = 'P0001', message = 'statistics_invalid';
    end if;
  elsif v_group is not null
    or v_group_count <> 0
    or p_statistics->'medianGradePercentage' <> 'null'::jsonb
    or p_statistics->'lowerGradePercentage' <> 'null'::jsonb
    or v_waiting_count is not null
    or v_positive_count is not null
    or v_negative_count is not null
  then
    raise exception using errcode = 'P0001', message = 'statistics_invalid';
  end if;

  return p_statistics;
end;
$$;

create function public.get_current_statistics(p_session_token_hash text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_response_id uuid;
begin
  v_response_id := public.resolve_anonymous_session(p_session_token_hash);
  if v_response_id is null then
    return null;
  end if;

  return public.assert_statistics_result(public.get_response_statistics(v_response_id));
end;
$$;

create function public.create_response_with_session(
  p_recovery_token_hash text,
  p_session_token_hash text,
  p_session_expires_at timestamptz,
  p_ip_hash text,
  p_response_fingerprint text,
  p_scholarship_track text,
  p_study_route text,
  p_study_type text,
  p_country text,
  p_grade_scale numeric,
  p_grade_value numeric,
  p_university text,
  p_study_field text,
  p_choice_priority text,
  p_application_status text,
  p_decision_date date
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_response_id uuid;
  v_statistics jsonb;
begin
  if p_grade_scale <= 0 or p_grade_value < 0 or p_grade_value > p_grade_scale then
    raise exception using errcode = 'P0001', message = 'invalid_response';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_ip_hash, 0));

  delete from public.submission_limits
  where created_at < now() - interval '24 hours';

  if (
    select count(*)
    from public.submission_limits
    where ip_hash = p_ip_hash
      and limit_type = 'create'
      and created_at >= now() - interval '24 hours'
  ) >= 3 then
    raise exception using errcode = 'P0001', message = 'create_rate_limited';
  end if;

  insert into public.responses (
    recovery_token_hash,
    scholarship_track,
    study_route,
    study_type,
    country,
    grade_scale,
    grade_value,
    grade_percentage,
    university,
    study_field,
    choice_priority,
    application_status,
    decision_date
  ) values (
    p_recovery_token_hash,
    p_scholarship_track,
    p_study_route,
    p_study_type,
    p_country,
    p_grade_scale,
    p_grade_value,
    p_grade_value / p_grade_scale * 100,
    p_university,
    p_study_field,
    p_choice_priority,
    p_application_status,
    case
      when p_application_status in ('positive_decision', 'negative_decision') then p_decision_date
      else null
    end
  )
  returning id into v_response_id;

  insert into public.anonymous_sessions (response_id, session_token_hash, expires_at)
  values (v_response_id, p_session_token_hash, p_session_expires_at);

  insert into public.submission_limits (ip_hash, limit_type, response_fingerprint)
  values (p_ip_hash, 'create', p_response_fingerprint);

  v_statistics := public.assert_statistics_result(public.get_response_statistics(v_response_id));

  return jsonb_build_object('created', true, 'statistics', v_statistics);
end;
$$;

create function public.restore_anonymous_session(
  p_recovery_token_hash text,
  p_session_token_hash text,
  p_session_expires_at timestamptz,
  p_ip_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_response_id uuid;
  v_attempt_count bigint;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_ip_hash, 0));

  delete from public.submission_limits
  where created_at < now() - interval '24 hours';

  insert into public.submission_limits (ip_hash, limit_type)
  values (p_ip_hash, 'restore');

  select count(*) into v_attempt_count
  from public.submission_limits
  where ip_hash = p_ip_hash
    and limit_type = 'restore'
    and created_at >= now() - interval '15 minutes';

  if v_attempt_count > 10 then
    return jsonb_build_object('restored', false, 'rateLimited', true);
  end if;

  if p_session_expires_at is null
    or not isfinite(p_session_expires_at)
    or p_session_expires_at <= now() then
    return jsonb_build_object('restored', false, 'rateLimited', false);
  end if;

  select id into v_response_id
  from public.responses
  where recovery_token_hash = p_recovery_token_hash;

  if v_response_id is null then
    return jsonb_build_object('restored', false, 'rateLimited', false);
  end if;

  if not pg_try_advisory_xact_lock(hashtextextended(v_response_id::text, 1)) then
    return jsonb_build_object('restored', false, 'rateLimited', false);
  end if;

  select id into v_response_id
  from public.responses
  where id = v_response_id
    and recovery_token_hash = p_recovery_token_hash
  for update;

  if v_response_id is null then
    return jsonb_build_object('restored', false, 'rateLimited', false);
  end if;

  begin
    insert into public.anonymous_sessions (response_id, session_token_hash, expires_at)
    values (v_response_id, p_session_token_hash, p_session_expires_at);
  exception
    when unique_violation or not_null_violation or check_violation then
      return jsonb_build_object('restored', false, 'rateLimited', false);
  end;

  return jsonb_build_object('restored', true, 'rateLimited', false);
end;
$$;

create function public.get_current_response(p_session_token_hash text)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'scholarshipTrack', r.scholarship_track,
    'studyRoute', r.study_route,
    'studyType', r.study_type,
    'country', r.country,
    'gradeScale', case
      when r.grade_scale in (5, 10, 12, 20, 100) then to_jsonb(r.grade_scale)
      else to_jsonb('custom'::text)
    end,
    'customGradeScale', case
      when r.grade_scale in (5, 10, 12, 20, 100) then null
      else to_jsonb(r.grade_scale)
    end,
    'gradeValue', r.grade_value,
    'university', r.university,
    'studyField', r.study_field,
    'choicePriority', r.choice_priority,
    'applicationStatus', r.application_status,
    'decisionDate', r.decision_date
  ))
  from public.responses r
  where r.id = public.resolve_anonymous_session(p_session_token_hash);
$$;

create function public.update_current_response(
  p_session_token_hash text,
  p_scholarship_track text,
  p_study_route text,
  p_study_type text,
  p_country text,
  p_grade_scale numeric,
  p_grade_value numeric,
  p_university text,
  p_study_field text,
  p_choice_priority text,
  p_application_status text,
  p_decision_date date
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_response public.responses%rowtype;
  v_response_id uuid;
  v_opposing_final_decision boolean;
  v_statistics jsonb;
begin
  if p_grade_scale <= 0 or p_grade_value < 0 or p_grade_value > p_grade_scale then
    raise exception using errcode = 'P0001', message = 'invalid_response';
  end if;

  select r.* into v_response
  from public.responses r
  where r.id = public.resolve_anonymous_session(p_session_token_hash)
  for update;

  if not found then
    return null;
  end if;

  v_response_id := v_response.id;

  v_opposing_final_decision :=
    (v_response.application_status = 'positive_decision' and p_application_status = 'negative_decision')
    or (v_response.application_status = 'negative_decision' and p_application_status = 'positive_decision');

  update public.responses
  set scholarship_track = p_scholarship_track,
      study_route = p_study_route,
      study_type = p_study_type,
      country = p_country,
      grade_scale = p_grade_scale,
      grade_value = p_grade_value,
      grade_percentage = p_grade_value / p_grade_scale * 100,
      university = p_university,
      study_field = p_study_field,
      choice_priority = p_choice_priority,
      application_status = p_application_status,
      decision_date = case
        when p_application_status in ('positive_decision', 'negative_decision') then p_decision_date
        else null
      end,
      is_suspicious = v_response.is_suspicious or v_opposing_final_decision
  where id = v_response.id;

  v_statistics := public.assert_statistics_result(public.get_response_statistics(v_response_id));

  return jsonb_build_object('updated', true, 'statistics', v_statistics);
end;
$$;

create function public.rotate_recovery_token(
  p_session_token_hash text,
  p_new_recovery_token_hash text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_response_id uuid;
begin
  v_response_id := public.resolve_anonymous_session(p_session_token_hash);

  if v_response_id is null then
    return false;
  end if;

  if not pg_try_advisory_xact_lock(hashtextextended(v_response_id::text, 1)) then
    return false;
  end if;

  select id into v_response_id
  from public.responses
  where id = v_response_id
  for update;

  if v_response_id is null then
    return false;
  end if;

  update public.responses
  set recovery_token_hash = p_new_recovery_token_hash,
      recovery_token_created_at = now(),
      recovery_token_rotated_at = now()
  where id = v_response_id;

  return true;
end;
$$;

create function public.revoke_anonymous_session(p_session_token_hash text)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  update public.anonymous_sessions
  set revoked_at = now()
  where session_token_hash = p_session_token_hash
    and revoked_at is null
    and expires_at > now();

  return found;
end;
$$;

alter table public.responses enable row level security;
alter table public.anonymous_sessions enable row level security;
alter table public.submission_limits enable row level security;

revoke all on table public.responses, public.anonymous_sessions, public.submission_limits from public, anon, authenticated;
revoke all on all sequences in schema public from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.create_response_with_session(text, text, timestamptz, text, text, text, text, text, text, numeric, numeric, text, text, text, text, date) from public, anon, authenticated;
revoke all on function public.restore_anonymous_session(text, text, timestamptz, text) from public, anon, authenticated;
revoke all on function public.resolve_anonymous_session(text) from public, anon, authenticated;
revoke all on function public.get_current_response(text) from public, anon, authenticated;
revoke all on function public.update_current_response(text, text, text, text, text, numeric, numeric, text, text, text, text, date) from public, anon, authenticated;
revoke all on function public.rotate_recovery_token(text, text) from public, anon, authenticated;
revoke all on function public.revoke_anonymous_session(text) from public, anon, authenticated;
revoke all on function public.get_current_statistics(text) from public, anon, authenticated;
revoke all on function public.get_response_statistics(uuid) from public, anon, authenticated, service_role;
revoke all on function public.assert_statistics_result(jsonb) from public, anon, authenticated, service_role;

grant select, insert, update, delete on table public.responses, public.anonymous_sessions, public.submission_limits to service_role;
grant execute on function public.create_response_with_session(text, text, timestamptz, text, text, text, text, text, text, numeric, numeric, text, text, text, text, date) to service_role;
grant execute on function public.restore_anonymous_session(text, text, timestamptz, text) to service_role;
grant execute on function public.resolve_anonymous_session(text) to service_role;
grant execute on function public.get_current_response(text) to service_role;
grant execute on function public.update_current_response(text, text, text, text, text, numeric, numeric, text, text, text, text, date) to service_role;
grant execute on function public.rotate_recovery_token(text, text) to service_role;
grant execute on function public.revoke_anonymous_session(text) to service_role;
grant execute on function public.get_current_statistics(text) to service_role;
