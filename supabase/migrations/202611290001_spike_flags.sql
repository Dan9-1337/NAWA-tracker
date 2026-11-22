--
-- Flag per-country spikes of new surveys for manual review (docs/adr/0014).
--
-- * A burst of new surveys for one country is held out of every statistic until the maintainer reviews it. A
--   flag is only a heuristic: honest traffic also arrives in waves (a post in a country chat), so a held-out
--   group is reviewed by hand instead of being silently dropped for good.
-- * season_config.public_launch_date: the day the app went public. While it is null nothing is flagged, so an
--   unset date can never hold honest traffic out. The maintainer sets it on launch day.
-- * season_config.intake_opens_on: the opening day of the active intake (documentsFrom in shared/season.ts).
--   The first seven days after it are quiet too.
-- * responses.spike_flagged_at: set together with is_suspicious by this rule. Flags written by the old
--   status-transition rule (and anything else) keep it null, so the review statements never touch them.
-- * responses.spike_reviewed_at: set by the maintainer's review; a reviewed survey is never flagged again.
-- * create_response_for_identity: after the insert, counts the surveys of the new survey's country in the
--   active intake year from the last hour and compares them with that country's average hourly rate over the
--   preceding 14 days. A burst over max(10, 5 x average) flags every unreviewed survey of that hour.
--   Task 009's advisory lock, trail check and edit_limit_reached raise are unchanged.
--
-- The index supports both counting queries by (intake_year, ranking_country, created_at).
--

alter table public.season_config
  add column public_launch_date date,
  add column intake_opens_on date;

update public.season_config
set intake_opens_on = date '2026-03-31'
where active_intake_year = 2026;

alter table public.responses
  add column spike_flagged_at timestamp with time zone,
  add column spike_reviewed_at timestamp with time zone;

create index responses_spike_window_idx
  on public.responses (intake_year, ranking_country, created_at);

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
  v_spike_year integer;
  v_public_launch_date date;
  v_intake_opens_on date;
  v_recent_count bigint;
  v_baseline numeric;
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

  -- Spike rule: a burst of new surveys for one country is held out of the statistics until reviewed. Nothing is
  -- flagged before the launch date is set, in the first seven days after it, or in the first seven days after
  -- the active intake opens. Everything here is scoped to the new survey's country and the active intake year.
  v_spike_year := public.active_intake_year();

  select sc.public_launch_date, sc.intake_opens_on
  into v_public_launch_date, v_intake_opens_on
  from public.season_config sc
  where sc.id;

  if v_public_launch_date is not null
    and now() >= v_public_launch_date::timestamptz + interval '7 days'
    and (
      v_intake_opens_on is null
      or now() < v_intake_opens_on::timestamptz
      or now() >= v_intake_opens_on::timestamptz + interval '7 days'
    )
  then
    select count(*)
    into v_recent_count
    from public.responses
    where intake_year = v_spike_year
      and ranking_country = p_ranking_country
      and created_at > now() - interval '1 hour';

    select count(*) / 336.0
    into v_baseline
    from public.responses
    where intake_year = v_spike_year
      and ranking_country = p_ranking_country
      and not is_suspicious
      and created_at > now() - interval '14 days' - interval '1 hour'
      and created_at <= now() - interval '1 hour';

    if v_recent_count > greatest(10, 5 * v_baseline) then
      -- A row flagged by another rule (is_suspicious without spike_flagged_at) is left alone. A row already
      -- flagged by an earlier spike keeps its timestamp, and a reviewed row is never flagged again.
      update public.responses
      set is_suspicious = true,
          spike_flagged_at = coalesce(spike_flagged_at, now())
      where intake_year = v_spike_year
        and ranking_country = p_ranking_country
        and created_at > now() - interval '1 hour'
        and (not is_suspicious or spike_flagged_at is not null)
        and spike_reviewed_at is null;
    end if;
  end if;

  v_statistics := public.assert_statistics_result(public.get_response_statistics(v_response_id));

  return jsonb_build_object('created', true, 'statistics', v_statistics);
end;
$$;
