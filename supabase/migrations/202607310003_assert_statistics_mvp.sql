-- Extend statistics assertion for MVP fields and enforce nawa_director-only creates.

create or replace function public.get_user_statistics_history(
  p_telegram_user_id bigint,
  p_limit integer default 14
)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'recordedAt', to_char(s.recorded_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        'lowerScorePercentage', s.lower_score_percentage,
        'groupResponseCount', s.group_response_count,
        'rankPosition', null
      )
      order by s.recorded_at desc
    ),
    '[]'::jsonb
  )
  from (
    select recorded_at, lower_score_percentage, group_response_count
    from public.user_statistics_snapshots
    where telegram_user_id = p_telegram_user_id
    order by recorded_at desc
    limit greatest(p_limit, 0)
  ) s;
$$;

create or replace function public.assert_statistics_result(p_statistics jsonb)
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
  v_total_count numeric;
  v_same_track_count numeric;
  v_same_country_count numeric;
  v_group_count numeric;
  v_bucket_total numeric := 0;
  v_bucket_index integer;
  v_history_index integer;
  v_history_entry jsonb;
  v_growth_key text;
begin
  if p_statistics is null then
    raise exception using errcode = 'P0001', message = 'statistics_unavailable';
  end if;

  if jsonb_typeof(p_statistics) <> 'object'
    or (select count(*) from jsonb_object_keys(p_statistics)) <> 18
    or not p_statistics ?& array[
      'detailsAvailable',
      'totalValidResponses',
      'sameTrackCount',
      'sameCountryCount',
      'groupResponseCount',
      'medianScore',
      'lowerScorePercentage',
      'rankPosition',
      'rankTotal',
      'gradesScore',
      'polishSchoolBonus',
      'trackWideMedian',
      'scoreBuckets',
      'cohortScores',
      'growth7d',
      'history',
      'groupProgress',
      'reportedMeritOutcomes'
    ]
  then
    raise exception using errcode = 'P0001', message = 'statistics_invalid';
  end if;

  if jsonb_typeof(p_statistics->'detailsAvailable') <> 'boolean' then
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

  foreach v_key in array array[
    'medianScore',
    'lowerScorePercentage',
    'rankPosition',
    'rankTotal',
    'gradesScore',
    'polishSchoolBonus',
    'trackWideMedian'
  ]
  loop
    if jsonb_typeof(p_statistics->v_key) <> 'null' then
      if jsonb_typeof(p_statistics->v_key) <> 'number' then
        raise exception using errcode = 'P0001', message = 'statistics_invalid';
      end if;
      v_number := (p_statistics->>v_key)::numeric;
      if v_number < 0 or (v_key = 'lowerScorePercentage' and v_number > 100) then
        raise exception using errcode = 'P0001', message = 'statistics_invalid';
      end if;
      if v_key in ('rankPosition', 'rankTotal') and trunc(v_number) <> v_number then
        raise exception using errcode = 'P0001', message = 'statistics_invalid';
      end if;
    end if;
  end loop;

  if jsonb_typeof(p_statistics->'scoreBuckets') <> 'null' then
    if jsonb_typeof(p_statistics->'scoreBuckets') <> 'array'
      or jsonb_array_length(p_statistics->'scoreBuckets') <> 16
    then
      raise exception using errcode = 'P0001', message = 'statistics_invalid';
    end if;

    for v_bucket_index in 0..15 loop
      if jsonb_typeof(p_statistics->'scoreBuckets'->v_bucket_index) <> 'number' then
        raise exception using errcode = 'P0001', message = 'statistics_invalid';
      end if;
      v_number := (p_statistics->'scoreBuckets'->>v_bucket_index)::numeric;
      if v_number < 0 or trunc(v_number) <> v_number then
        raise exception using errcode = 'P0001', message = 'statistics_invalid';
      end if;
      v_bucket_total := v_bucket_total + v_number;
    end loop;
  end if;

  if jsonb_typeof(p_statistics->'cohortScores') <> 'null'
    and jsonb_typeof(p_statistics->'cohortScores') <> 'array'
  then
    raise exception using errcode = 'P0001', message = 'statistics_invalid';
  end if;

  if jsonb_typeof(p_statistics->'groupProgress') <> 'null'
    and jsonb_typeof(p_statistics->'groupProgress') <> 'object'
  then
    raise exception using errcode = 'P0001', message = 'statistics_invalid';
  end if;

  if jsonb_typeof(p_statistics->'reportedMeritOutcomes') <> 'null'
    and jsonb_typeof(p_statistics->'reportedMeritOutcomes') <> 'object'
  then
    raise exception using errcode = 'P0001', message = 'statistics_invalid';
  end if;

  if jsonb_typeof(p_statistics->'growth7d') <> 'null' then
    if jsonb_typeof(p_statistics->'growth7d') <> 'object' then
      raise exception using errcode = 'P0001', message = 'statistics_invalid';
    end if;

    foreach v_growth_key in array array[
      'newResponsesTotal',
      'newResponsesInGroup',
      'medianThen',
      'medianNow',
      'percentileThen',
      'percentileNow'
    ]
    loop
      if not p_statistics->'growth7d' ? v_growth_key then
        raise exception using errcode = 'P0001', message = 'statistics_invalid';
      end if;
    end loop;
  end if;

  if jsonb_typeof(p_statistics->'history') <> 'array' then
    raise exception using errcode = 'P0001', message = 'statistics_invalid';
  end if;

  for v_history_index in 0..greatest(jsonb_array_length(p_statistics->'history') - 1, -1) loop
    v_history_entry := p_statistics->'history'->v_history_index;
    if jsonb_typeof(v_history_entry) <> 'object'
      or not v_history_entry ?& array['recordedAt', 'lowerScorePercentage', 'groupResponseCount', 'rankPosition']
    then
      raise exception using errcode = 'P0001', message = 'statistics_invalid';
    end if;
  end loop;

  v_details_available := (p_statistics->>'detailsAvailable')::boolean;
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
    if v_group_count < 10
      or p_statistics->'medianScore' = 'null'::jsonb
      or p_statistics->'lowerScorePercentage' = 'null'::jsonb
      or p_statistics->'scoreBuckets' = 'null'::jsonb
      or v_bucket_total <> v_group_count
    then
      raise exception using errcode = 'P0001', message = 'statistics_invalid';
    end if;
  elsif v_group_count <> 0
    or p_statistics->'medianScore' <> 'null'::jsonb
    or p_statistics->'lowerScorePercentage' <> 'null'::jsonb
    or p_statistics->'scoreBuckets' <> 'null'::jsonb
  then
    raise exception using errcode = 'P0001', message = 'statistics_invalid';
  end if;

  return p_statistics;
end;
$$;

create or replace function public.create_response_for_telegram_user(
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

  if p_scholarship_track <> 'nawa_director' then
    raise exception using errcode = 'P0001', message = 'track_not_available';
  end if;

  if exists (
    select 1
    from public.responses
    where telegram_user_id = p_telegram_user_id
  ) then
    raise exception using errcode = 'P0001', message = 'profile_exists';
  end if;

  v_nawa_score := round(
    p_average_grade / p_maximum_grade * 90
      + case p_polish_school_level when 'primary' then 5 when 'secondary' then 10 else 0 end,
    2
  );

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
