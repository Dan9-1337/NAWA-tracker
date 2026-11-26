--
-- At most three score-changing saves in a rolling 24 hours (docs/adr/0013).
--
-- * score_change_log keeps the trail: identity_hash, saved_at and counted only. It is deliberately not linked to
--   responses, so deleting a survey does not reset the limit. Rows older than 24 hours never count and are erased
--   hourly by purge_score_change_log().
-- * create_response_for_identity: the first create inside a quiet window is recorded uncounted and never blocked;
--   a create while a recent row exists counts like a score-changing edit and is blocked at three counted rows.
-- * update_current_response: a save that leaves nawa_orientation_score unchanged never counts and is never blocked;
--   a score-changing save is blocked at three counted rows in the window. Both functions raise edit_limit_reached
--   with the retry time (the oldest counted row + 24 hours) in the exception detail as an ISO 8601 UTC string.
-- * Locks: creates take an advisory transaction lock on the identity hash; edits rely on the row lock they already
--   held on the response while blocking, so two parallel saves cannot both pass the limit.
--
-- Task 010 redefines create_response_for_identity again: keep the advisory lock, the recent-trail check and the
-- edit_limit_reached raise below intact when adding the spike step.
--

create table public.score_change_log (
  identity_hash text not null check (identity_hash ~ '^[0-9a-f]{64}$'),
  saved_at timestamp with time zone not null default clock_timestamp(),
  counted boolean not null
);

create index score_change_log_identity_saved_at_idx
  on public.score_change_log (identity_hash, saved_at);

alter table public.score_change_log enable row level security;
revoke all on table public.score_change_log from public, anon, authenticated;
grant select, insert, delete on table public.score_change_log to service_role;

-- The retry time is only returned when three counted rows are still inside the window; otherwise null.
create function public.score_change_retry_at(p_identity_hash text) returns timestamp with time zone
    language sql stable security definer
    set search_path to 'pg_catalog'
    as $$
  select min(saved_at) + interval '24 hours'
  from public.score_change_log
  where identity_hash = p_identity_hash
    and counted
    and saved_at > now() - interval '24 hours'
  having count(*) >= 3;
$$;

create function public.purge_score_change_log() returns integer
    language sql security definer
    set search_path to 'pg_catalog'
    as $$
  with expired as (
    delete from public.score_change_log
    where saved_at <= now() - interval '24 hours'
    returning 1
  )
  select count(*)::integer from expired;
$$;

create or replace function public.create_response_for_identity(
  p_identity_hash text,
  p_intake_year integer,
  p_has_polish_citizenship boolean,
  p_ranking_country text,
  p_school_country text,
  p_scholarship_track text,
  p_study_route text,
  p_target_university text,
  p_study_field text,
  p_prep_course_city text,
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
  v_has_recent_trail boolean;
  v_retry_at timestamp with time zone;
begin
  if p_maximum_grade <= 0 or p_average_grade < 0 or p_average_grade > p_maximum_grade then
    raise exception using errcode = 'P0001', message = 'invalid_response';
  end if;

  if p_scholarship_track <> 'nawa_director' then
    raise exception using errcode = 'P0001', message = 'track_not_available';
  end if;

  -- Serialise creates of the same account: two parallel creates cannot both inspect the same trail.
  perform pg_advisory_xact_lock(hashtextextended(p_identity_hash, 3));

  if exists (
    select 1
    from public.responses
    where identity_hash = p_identity_hash
      and intake_year = p_intake_year
  ) then
    raise exception using errcode = 'P0001', message = 'profile_exists';
  end if;

  v_nawa_score := public.compute_orientation_score(
    p_average_grade, p_maximum_grade, p_ranking_country, p_polish_school_level, p_applicant_kind
  );

  -- A create with no row from the last 24 hours is the first one: it is recorded uncounted and never blocked.
  -- A create with a recent row means the survey was deleted and is being created again: it counts like an edit.
  select exists (
    select 1
    from public.score_change_log
    where identity_hash = p_identity_hash
      and saved_at > now() - interval '24 hours'
  ) into v_has_recent_trail;

  if v_has_recent_trail then
    v_retry_at := public.score_change_retry_at(p_identity_hash);
    if v_retry_at is not null then
      raise exception using errcode = 'P0001', message = 'edit_limit_reached',
        detail = to_char(v_retry_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
    end if;
  end if;

  begin
    insert into public.responses (
      identity_hash,
      intake_year,
      has_polish_citizenship,
      ranking_country,
      school_country,
      scholarship_track,
      study_route,
      target_university,
      study_field,
      prep_course_city,
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
      p_identity_hash,
      p_intake_year,
      p_has_polish_citizenship,
      p_ranking_country,
      p_school_country,
      p_scholarship_track,
      p_study_route,
      p_target_university,
      p_study_field,
      case
        when p_study_route = 'preparatory_course' and p_current_status = 'scholarship_awarded' then p_prep_course_city
      end,
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

  insert into public.score_change_log (identity_hash, counted)
  values (p_identity_hash, v_has_recent_trail);

  v_statistics := public.assert_statistics_result(public.get_response_statistics(v_response_id));

  return jsonb_build_object('created', true, 'statistics', v_statistics);
end;
$$;

create or replace function public.update_current_response(
  p_identity_hash text,
  p_intake_year integer,
  p_has_polish_citizenship boolean,
  p_ranking_country text,
  p_school_country text,
  p_scholarship_track text,
  p_study_route text,
  p_target_university text,
  p_study_field text,
  p_prep_course_city text,
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
  v_score_changed boolean := false;
  v_retry_at timestamp with time zone;
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
  where r.identity_hash = p_identity_hash
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

  -- Only a save that moves nawa_orientation_score counts; it is blocked when three counted rows are still
  -- inside the rolling window. The row lock taken above serialises parallel edits of the same survey.
  if v_nawa_score is distinct from v_response.nawa_orientation_score then
    v_retry_at := public.score_change_retry_at(p_identity_hash);
    if v_retry_at is not null then
      raise exception using errcode = 'P0001', message = 'edit_limit_reached',
        detail = to_char(v_retry_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
    end if;
    v_score_changed := true;
  end if;

  update public.responses
  set has_polish_citizenship = p_has_polish_citizenship,
      ranking_country = p_ranking_country,
      school_country = p_school_country,
      scholarship_track = p_scholarship_track,
      study_route = p_study_route,
      target_university = p_target_university,
      study_field = p_study_field,
      prep_course_city = case
        when p_study_route = 'preparatory_course' and p_current_status = 'scholarship_awarded' then p_prep_course_city
      end,
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

  if v_score_changed then
    insert into public.score_change_log (identity_hash, counted)
    values (p_identity_hash, true);
  end if;

  v_statistics := public.assert_statistics_result(public.get_response_statistics(v_response.id));

  return jsonb_build_object('updated', true, 'statistics', v_statistics);
end;
$$;

revoke all on function public.score_change_retry_at(text) from public, anon, authenticated;
revoke all on function public.purge_score_change_log() from public, anon, authenticated;
grant execute on function public.score_change_retry_at(text) to service_role;
grant execute on function public.purge_score_change_log() to service_role;

-- pg_cron is optional: PGlite has no pg_cron, and a PostgreSQL image can list it without loading it. The purge
-- function is tested directly; the hourly job matters in Supabase, where pg_cron is preloaded.
do $$
begin
  if exists (select 1 from pg_catalog.pg_available_extensions where name = 'pg_cron') then
    begin
      execute 'create extension if not exists pg_cron';
    exception when others then
      raise warning 'pg_cron is available but could not be enabled: %', sqlerrm;
    end;

    if exists (select 1 from pg_catalog.pg_namespace where nspname = 'cron') then
      begin
        execute $schedule$select cron.schedule(
          'purge-score-change-log',
          '0 * * * *',
          'select public.purge_score_change_log()'
        )$schedule$;
      exception when others then
        raise warning 'the hourly score-change purge could not be scheduled: %', sqlerrm;
      end;
    end if;
  end if;
end
$$;
