create or replace function public.compute_country_statistics(
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
  v_score_buckets jsonb;
  v_bucket_origin numeric;
  v_bucket_step numeric;
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

  if p_scholarship_track = 'nawa_director' then
    v_bucket_origin := 60;
    v_bucket_step := 8;
  else
    v_bucket_origin := 0;
    v_bucket_step := 20;
  end if;

  if v_group is not null then
    with group_responses as (
      select case
        when p_scholarship_track = 'nawa_director' then nawa_orientation_score
        else grade_percentage
      end as metric
      from public.responses
      where not is_suspicious
        and scholarship_track = p_scholarship_track
        and (v_group = 'track' or ranking_country = p_ranking_country)
    )
    select
      percentile_cont(0.5) within group (order by metric),
      count(*) filter (where metric < p_metric_value)::numeric / count(*) * 100,
      jsonb_build_array(
        count(*) filter (where metric >= v_bucket_origin and metric < v_bucket_origin + v_bucket_step),
        count(*) filter (where metric >= v_bucket_origin + v_bucket_step and metric < v_bucket_origin + v_bucket_step * 2),
        count(*) filter (where metric >= v_bucket_origin + v_bucket_step * 2 and metric < v_bucket_origin + v_bucket_step * 3),
        count(*) filter (where metric >= v_bucket_origin + v_bucket_step * 3 and metric < v_bucket_origin + v_bucket_step * 4),
        count(*) filter (where metric >= v_bucket_origin + v_bucket_step * 4)
      )
    into v_median, v_lower_percentage, v_score_buckets
    from group_responses;

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
    'scoreBuckets', v_score_buckets,
    'statusCounts', v_status_counts
  );
end;
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
  v_bucket_total numeric := 0;
  v_bucket_index integer;
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
    or (select count(*) from jsonb_object_keys(p_statistics)) <> 10
    or not p_statistics ?& array[
      'detailsAvailable',
      'group',
      'totalValidResponses',
      'sameTrackCount',
      'sameCountryCount',
      'groupResponseCount',
      'medianScore',
      'lowerScorePercentage',
      'scoreBuckets',
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

  if jsonb_typeof(p_statistics->'scoreBuckets') <> 'null' then
    if jsonb_typeof(p_statistics->'scoreBuckets') <> 'array'
      or jsonb_array_length(p_statistics->'scoreBuckets') <> 5
    then
      raise exception using errcode = 'P0001', message = 'statistics_invalid';
    end if;

    for v_bucket_index in 0..4 loop
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
      or p_statistics->'scoreBuckets' = 'null'::jsonb
      or p_statistics->'statusCounts' = 'null'::jsonb
      or v_status_total <> v_group_count
      or v_bucket_total <> v_group_count
    then
      raise exception using errcode = 'P0001', message = 'statistics_invalid';
    end if;
  elsif v_group is not null
    or v_group_count <> 0
    or p_statistics->'medianScore' <> 'null'::jsonb
    or p_statistics->'lowerScorePercentage' <> 'null'::jsonb
    or p_statistics->'scoreBuckets' <> 'null'::jsonb
    or p_statistics->'statusCounts' <> 'null'::jsonb
  then
    raise exception using errcode = 'P0001', message = 'statistics_invalid';
  end if;

  return p_statistics;
end;
$$;
