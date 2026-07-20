create extension if not exists pgcrypto with schema extensions;

create table public.responses (
  id uuid primary key default gen_random_uuid(),
  recovery_token_hash text not null unique check (length(recovery_token_hash) > 0),
  recovery_token_created_at timestamptz not null default now(),
  recovery_token_rotated_at timestamptz,
  has_polish_citizenship boolean not null,
  ranking_country text not null check (length(ranking_country) between 1 and 100),
  school_country text not null check (length(school_country) between 1 and 100),
  scholarship_track text not null check (scholarship_track in ('nawa_director', 'health_minister', 'culture_minister')),
  study_route text not null check (study_route in ('preparatory_course', 'direct_studies')),
  average_grade numeric not null check (average_grade >= 0),
  maximum_grade numeric not null check (maximum_grade between 1 and 1000),
  grade_percentage numeric not null check (
    grade_percentage between 0 and 100
    and grade_percentage = average_grade / maximum_grade * 100
  ),
  polish_school_level text check (polish_school_level in ('none', 'primary', 'secondary')),
  nawa_orientation_score numeric check (nawa_orientation_score >= 0),
  current_status text not null check (
    current_status in (
      'submitted',
      'formal_review_in_progress',
      'correction_requested',
      'formal_review_completed',
      'merit_review_in_progress',
      'merit_review_positive',
      'merit_review_negative',
      'awaiting_decision',
      'scholarship_awarded',
      'scholarship_not_awarded'
    )
  ),
  status_changed_at date not null,
  is_suspicious boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (average_grade <= maximum_grade),
  check (
    (scholarship_track = 'nawa_director' and polish_school_level is not null)
    or (scholarship_track <> 'nawa_director' and polish_school_level is null)
  ),
  check (
    (scholarship_track = 'nawa_director') = (nawa_orientation_score is not null)
  ),
  check (
    scholarship_track <> 'health_minister' or study_route = 'preparatory_course'
  ),
  check (
    not has_polish_citizenship or scholarship_track = 'nawa_director'
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
  limit_type text not null check (limit_type in ('create', 'restore', 'public_stats')),
  response_fingerprint text,
  created_at timestamptz not null default now()
);

create index responses_scholarship_track_idx on public.responses (scholarship_track);
create index responses_study_route_idx on public.responses (study_route);
create index responses_ranking_country_idx on public.responses (ranking_country);
create index responses_current_status_idx on public.responses (current_status);
create index responses_grade_percentage_idx on public.responses (grade_percentage);
create index responses_nawa_orientation_score_idx on public.responses (nawa_orientation_score);
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

-- Pure aggregate helper shared by the authenticated and public statistics
-- entry points. `p_metric_value` is the orientation score for nawa_director
-- or the grade percentage for the other two tracks. This never reproduces an
-- official NAWA seat-limit ranking: the comparison group is only the public,
-- user-declared passport-country cohort (see docs/superpowers/specs).
create function public.compute_country_statistics(
  p_scholarship_track text,
  p_ranking_country text,
  p_metric_value numeric
)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = pg_catalog
as $$
declare
  v_group text;
  v_group_count bigint := 0;
  v_total_count bigint;
  v_same_track_count bigint;
  v_same_country_count bigint;
  v_median numeric;
  v_lower_percentage numeric;
  v_status_counts jsonb;
  v_status text;
  v_all_statuses text[] := array[
    'submitted', 'formal_review_in_progress', 'correction_requested', 'formal_review_completed',
    'merit_review_in_progress', 'merit_review_positive', 'merit_review_negative',
    'awaiting_decision', 'scholarship_awarded', 'scholarship_not_awarded'
  ];
begin
  select count(*), count(*) filter (where scholarship_track = p_scholarship_track)
  into v_total_count, v_same_track_count
  from public.responses
  where not is_suspicious;

  select count(*) into v_same_country_count
  from public.responses
  where not is_suspicious
    and scholarship_track = p_scholarship_track
    and ranking_country = p_ranking_country;

  if v_same_country_count >= 10 then
    v_group := 'track-country';
    v_group_count := v_same_country_count;
  else
    select count(*) into v_group_count
    from public.responses
    where not is_suspicious and scholarship_track = p_scholarship_track;

    if v_group_count >= 10 then
      v_group := 'track';
    else
      v_group := null;
      v_group_count := 0;
    end if;
  end if;

  if v_group is not null then
    select
      percentile_cont(0.5) within group (
        order by (case when p_scholarship_track = 'nawa_director' then nawa_orientation_score else grade_percentage end)
      ),
      count(*) filter (
        where (case when p_scholarship_track = 'nawa_director' then nawa_orientation_score else grade_percentage end) < p_metric_value
      )::numeric / count(*) * 100
    into v_median, v_lower_percentage
    from public.responses
    where not is_suspicious
      and scholarship_track = p_scholarship_track
      and (v_group = 'track' or ranking_country = p_ranking_country);

    v_status_counts := '{}'::jsonb;
    foreach v_status in array v_all_statuses loop
      v_status_counts := v_status_counts || jsonb_build_object(
        v_status,
        (
          select count(*)
          from public.responses
          where not is_suspicious
            and scholarship_track = p_scholarship_track
            and (v_group = 'track' or ranking_country = p_ranking_country)
            and current_status = v_status
        )
      );
    end loop;
  end if;

  return jsonb_build_object(
    'detailsAvailable', v_group is not null,
    'group', v_group,
    'totalValidResponses', v_total_count,
    'sameTrackCount', v_same_track_count,
    'sameCountryCount', case when v_same_country_count >= 10 then v_same_country_count else null end,
    'groupResponseCount', v_group_count,
    'medianScore', v_median,
    'lowerScorePercentage', v_lower_percentage,
    'statusCounts', v_status_counts
  );
end;
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
  v_metric numeric;
begin
  select r.* into v_target
  from public.responses r
  where r.id = p_response_id;

  if not found then
    return null;
  end if;

  v_metric := case
    when v_target.scholarship_track = 'nawa_director' then v_target.nawa_orientation_score
    else v_target.grade_percentage
  end;

  return public.compute_country_statistics(v_target.scholarship_track, v_target.ranking_country, v_metric);
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
  v_status text;
  v_number numeric;
  v_details_available boolean;
  v_group text;
  v_total_count numeric;
  v_same_track_count numeric;
  v_same_country_count numeric;
  v_group_count numeric;
  v_status_counts jsonb;
  v_status_total numeric := 0;
  v_all_statuses text[] := array[
    'submitted', 'formal_review_in_progress', 'correction_requested', 'formal_review_completed',
    'merit_review_in_progress', 'merit_review_positive', 'merit_review_negative',
    'awaiting_decision', 'scholarship_awarded', 'scholarship_not_awarded'
  ];
begin
  if p_statistics is null then
    raise exception using errcode = 'P0001', message = 'statistics_unavailable';
  end if;

  if jsonb_typeof(p_statistics) <> 'object'
    or (select count(*) from jsonb_object_keys(p_statistics)) <> 9
    or not p_statistics ?& array[
      'detailsAvailable',
      'group',
      'totalValidResponses',
      'sameTrackCount',
      'sameCountryCount',
      'groupResponseCount',
      'medianScore',
      'lowerScorePercentage',
      'statusCounts'
    ]
  then
    raise exception using errcode = 'P0001', message = 'statistics_invalid';
  end if;

  if jsonb_typeof(p_statistics->'detailsAvailable') <> 'boolean'
    or not (
      jsonb_typeof(p_statistics->'group') = 'null'
      or (
        jsonb_typeof(p_statistics->'group') = 'string'
        and p_statistics->>'group' in ('track-country', 'track')
      )
    )
  then
    raise exception using errcode = 'P0001', message = 'statistics_invalid';
  end if;

  foreach v_key in array array['totalValidResponses', 'sameTrackCount', 'groupResponseCount']
  loop
    if jsonb_typeof(p_statistics->v_key) <> 'number' then
      raise exception using errcode = 'P0001', message = 'statistics_invalid';
    end if;
    v_number := (p_statistics->>v_key)::numeric;
    if v_number < 0 or trunc(v_number) <> v_number then
      raise exception using errcode = 'P0001', message = 'statistics_invalid';
    end if;
  end loop;

  if jsonb_typeof(p_statistics->'sameCountryCount') <> 'null' then
    if jsonb_typeof(p_statistics->'sameCountryCount') <> 'number' then
      raise exception using errcode = 'P0001', message = 'statistics_invalid';
    end if;
    v_number := (p_statistics->>'sameCountryCount')::numeric;
    if v_number < 10 or trunc(v_number) <> v_number then
      raise exception using errcode = 'P0001', message = 'statistics_invalid';
    end if;
  end if;

  foreach v_key in array array['medianScore', 'lowerScorePercentage']
  loop
    if jsonb_typeof(p_statistics->v_key) <> 'null' then
      if jsonb_typeof(p_statistics->v_key) <> 'number' then
        raise exception using errcode = 'P0001', message = 'statistics_invalid';
      end if;
      v_number := (p_statistics->>v_key)::numeric;
      if v_number < 0 or (v_key = 'lowerScorePercentage' and v_number > 100) then
        raise exception using errcode = 'P0001', message = 'statistics_invalid';
      end if;
    end if;
  end loop;

  if jsonb_typeof(p_statistics->'statusCounts') <> 'null' then
    if jsonb_typeof(p_statistics->'statusCounts') <> 'object'
      or (select count(*) from jsonb_object_keys(p_statistics->'statusCounts')) <> 10
      or not (p_statistics->'statusCounts') ?& v_all_statuses
    then
      raise exception using errcode = 'P0001', message = 'statistics_invalid';
    end if;

    v_status_counts := p_statistics->'statusCounts';
    foreach v_status in array v_all_statuses loop
      if jsonb_typeof(v_status_counts->v_status) <> 'number' then
        raise exception using errcode = 'P0001', message = 'statistics_invalid';
      end if;
      v_number := (v_status_counts->>v_status)::numeric;
      if v_number < 0 or trunc(v_number) <> v_number then
        raise exception using errcode = 'P0001', message = 'statistics_invalid';
      end if;
      v_status_total := v_status_total + v_number;
    end loop;
  end if;

  v_details_available := (p_statistics->>'detailsAvailable')::boolean;
  v_group := p_statistics->>'group';
  v_total_count := (p_statistics->>'totalValidResponses')::numeric;
  v_same_track_count := (p_statistics->>'sameTrackCount')::numeric;
  v_same_country_count := (p_statistics->>'sameCountryCount')::numeric;
  v_group_count := (p_statistics->>'groupResponseCount')::numeric;

  if v_same_track_count > v_total_count
    or v_group_count > v_same_track_count
    or (v_same_country_count is not null and v_same_country_count > v_same_track_count)
  then
    raise exception using errcode = 'P0001', message = 'statistics_invalid';
  end if;

  if v_details_available then
    if v_group is null
      or v_group_count < 10
      or p_statistics->'medianScore' = 'null'::jsonb
      or p_statistics->'lowerScorePercentage' = 'null'::jsonb
      or p_statistics->'statusCounts' = 'null'::jsonb
      or v_status_total <> v_group_count
    then
      raise exception using errcode = 'P0001', message = 'statistics_invalid';
    end if;
  elsif v_group is not null
    or v_group_count <> 0
    or p_statistics->'medianScore' <> 'null'::jsonb
    or p_statistics->'lowerScorePercentage' <> 'null'::jsonb
    or p_statistics->'statusCounts' <> 'null'::jsonb
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

-- Public, session-free passport-country cohort comparison. Callers supply the
-- questionnaire values they intend to declare (or already declared); no raw
-- rows or identifiers are ever returned. Rate limited per IP like create/restore.
create function public.get_public_statistics(
  p_scholarship_track text,
  p_ranking_country text,
  p_average_grade numeric,
  p_maximum_grade numeric,
  p_polish_school_level text,
  p_ip_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_metric numeric;
  v_bonus numeric;
begin
  if p_maximum_grade <= 0 or p_average_grade < 0 or p_average_grade > p_maximum_grade then
    raise exception using errcode = 'P0001', message = 'invalid_response';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_ip_hash, 2));

  delete from public.submission_limits
  where created_at < now() - interval '24 hours';

  if (
    select count(*)
    from public.submission_limits
    where ip_hash = p_ip_hash
      and limit_type = 'public_stats'
      and created_at >= now() - interval '15 minutes'
  ) >= 30 then
    raise exception using errcode = 'P0001', message = 'public_stats_rate_limited';
  end if;

  insert into public.submission_limits (ip_hash, limit_type) values (p_ip_hash, 'public_stats');

  if p_scholarship_track = 'nawa_director' then
    v_bonus := case p_polish_school_level when 'primary' then 5 when 'secondary' then 10 else 0 end;
    v_metric := round(p_average_grade / p_maximum_grade * 90 + v_bonus, 2);
  else
    v_metric := round(p_average_grade / p_maximum_grade * 100, 2);
  end if;

  return public.assert_statistics_result(
    public.compute_country_statistics(p_scholarship_track, p_ranking_country, v_metric)
  );
end;
$$;

create function public.create_response_with_session(
  p_recovery_token_hash text,
  p_session_token_hash text,
  p_session_expires_at timestamptz,
  p_ip_hash text,
  p_response_fingerprint text,
  p_has_polish_citizenship boolean,
  p_ranking_country text,
  p_school_country text,
  p_scholarship_track text,
  p_study_route text,
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

  v_nawa_score := case
    when p_scholarship_track = 'nawa_director' then round(
      p_average_grade / p_maximum_grade * 90
        + case p_polish_school_level when 'primary' then 5 when 'secondary' then 10 else 0 end,
      2
    )
    else null
  end;

  insert into public.responses (
    recovery_token_hash,
    has_polish_citizenship,
    ranking_country,
    school_country,
    scholarship_track,
    study_route,
    average_grade,
    maximum_grade,
    grade_percentage,
    polish_school_level,
    nawa_orientation_score,
    current_status,
    status_changed_at
  ) values (
    p_recovery_token_hash,
    p_has_polish_citizenship,
    p_ranking_country,
    p_school_country,
    p_scholarship_track,
    p_study_route,
    p_average_grade,
    p_maximum_grade,
    p_average_grade / p_maximum_grade * 100,
    p_polish_school_level,
    v_nawa_score,
    p_current_status,
    p_status_changed_at
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
    'hasPolishCitizenship', r.has_polish_citizenship,
    'rankingCountry', r.ranking_country,
    'schoolCountry', r.school_country,
    'scholarshipTrack', r.scholarship_track,
    'studyRoute', r.study_route,
    'averageGrade', r.average_grade,
    'maximumGrade', r.maximum_grade,
    'polishSchoolLevel', r.polish_school_level,
    'currentStatus', r.current_status,
    'statusChangedAt', r.status_changed_at
  ))
  from public.responses r
  where r.id = public.resolve_anonymous_session(p_session_token_hash);
$$;

create function public.update_current_response(
  p_session_token_hash text,
  p_has_polish_citizenship boolean,
  p_ranking_country text,
  p_school_country text,
  p_scholarship_track text,
  p_study_route text,
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
  where r.id = public.resolve_anonymous_session(p_session_token_hash)
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
  set has_polish_citizenship = p_has_polish_citizenship,
      ranking_country = p_ranking_country,
      school_country = p_school_country,
      scholarship_track = p_scholarship_track,
      study_route = p_study_route,
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
revoke all on function public.create_response_with_session(text, text, timestamptz, text, text, boolean, text, text, text, text, numeric, numeric, text, text, date) from public, anon, authenticated;
revoke all on function public.restore_anonymous_session(text, text, timestamptz, text) from public, anon, authenticated;
revoke all on function public.resolve_anonymous_session(text) from public, anon, authenticated;
revoke all on function public.get_current_response(text) from public, anon, authenticated;
revoke all on function public.update_current_response(text, boolean, text, text, text, text, numeric, numeric, text, text, date) from public, anon, authenticated;
revoke all on function public.rotate_recovery_token(text, text) from public, anon, authenticated;
revoke all on function public.revoke_anonymous_session(text) from public, anon, authenticated;
revoke all on function public.get_current_statistics(text) from public, anon, authenticated;
revoke all on function public.get_public_statistics(text, text, numeric, numeric, text, text) from public, anon, authenticated;
revoke all on function public.get_response_statistics(uuid) from public, anon, authenticated, service_role;
revoke all on function public.compute_country_statistics(text, text, numeric) from public, anon, authenticated, service_role;
revoke all on function public.assert_statistics_result(jsonb) from public, anon, authenticated, service_role;

grant select, insert, update, delete on table public.responses, public.anonymous_sessions, public.submission_limits to service_role;
grant execute on function public.create_response_with_session(text, text, timestamptz, text, text, boolean, text, text, text, text, numeric, numeric, text, text, date) to service_role;
grant execute on function public.restore_anonymous_session(text, text, timestamptz, text) to service_role;
grant execute on function public.resolve_anonymous_session(text) to service_role;
grant execute on function public.get_current_response(text) to service_role;
grant execute on function public.update_current_response(text, boolean, text, text, text, text, numeric, numeric, text, text, date) to service_role;
grant execute on function public.rotate_recovery_token(text, text) to service_role;
grant execute on function public.revoke_anonymous_session(text) to service_role;
grant execute on function public.get_current_statistics(text) to service_role;
grant execute on function public.get_public_statistics(text, text, numeric, numeric, text, text) to service_role;
