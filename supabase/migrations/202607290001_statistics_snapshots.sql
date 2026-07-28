create table public.user_statistics_snapshots (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id bigint not null references public.responses (telegram_user_id) on delete cascade,
  snapshot_date date not null default (timezone('utc', now()))::date,
  recorded_at timestamptz not null default now(),
  group_response_count int not null,
  lower_score_percentage numeric,
  median_score numeric,
  same_track_count int not null,
  same_country_count int,
  unique (telegram_user_id, snapshot_date)
);

create index user_statistics_snapshots_telegram_user_id_recorded_at_idx
  on public.user_statistics_snapshots (telegram_user_id, recorded_at desc);

alter table public.user_statistics_snapshots enable row level security;

drop function if exists public.compute_country_statistics(text, text, numeric);

create or replace function public.compute_country_statistics(
  p_scholarship_track text,
  p_ranking_country text,
  p_metric_value numeric,
  p_as_of timestamptz default null
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
  v_bucket_index integer;
  v_bucket_counts numeric[] := array[]::numeric[];
  v_bucket_count numeric;
begin
  select count(*), count(*) filter (where scholarship_track = p_scholarship_track)
  into v_total_count, v_same_track_count
  from public.responses
  where not is_suspicious
    and (p_as_of is null or created_at <= p_as_of);

  select count(*) into v_same_country_count
  from public.responses
  where not is_suspicious
    and scholarship_track = p_scholarship_track
    and ranking_country = p_ranking_country
    and (p_as_of is null or created_at <= p_as_of);

  if v_same_country_count >= 10 then
    v_group := 'track-country';
    v_group_count := v_same_country_count;
  else
    select count(*) into v_group_count
    from public.responses
    where not is_suspicious
      and scholarship_track = p_scholarship_track
      and (p_as_of is null or created_at <= p_as_of);

    if v_group_count >= 10 then
      v_group := 'track';
    else
      v_group := null;
      v_group_count := 0;
    end if;
  end if;

  if p_scholarship_track = 'nawa_director' then
    v_bucket_origin := 60;
    v_bucket_step := 2.5;
  else
    v_bucket_origin := 0;
    v_bucket_step := 6.25;
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
        and (p_as_of is null or created_at <= p_as_of)
    )
    select
      percentile_cont(0.5) within group (order by metric),
      count(*) filter (where metric < p_metric_value)::numeric / count(*) * 100
    into v_median, v_lower_percentage
    from group_responses;

    for v_bucket_index in 0..15 loop
      select count(*) into v_bucket_count
      from public.responses
      where not is_suspicious
        and scholarship_track = p_scholarship_track
        and (v_group = 'track' or ranking_country = p_ranking_country)
        and (p_as_of is null or created_at <= p_as_of)
        and (
          case
            when p_scholarship_track = 'nawa_director' then nawa_orientation_score
            else grade_percentage
          end
        ) is not null
        and (
          (
            v_bucket_index = 0
            and (
              case
                when p_scholarship_track = 'nawa_director' then nawa_orientation_score
                else grade_percentage
              end
            ) < v_bucket_origin + v_bucket_step
          )
          or (
            v_bucket_index > 0
            and (
              case
                when p_scholarship_track = 'nawa_director' then nawa_orientation_score
                else grade_percentage
              end
            ) >= v_bucket_origin + v_bucket_step * v_bucket_index
            and (
              v_bucket_index = 15
              or (
                case
                  when p_scholarship_track = 'nawa_director' then nawa_orientation_score
                  else grade_percentage
              end
              ) < v_bucket_origin + v_bucket_step * (v_bucket_index + 1)
            )
          )
        );

      v_bucket_counts := array_append(v_bucket_counts, v_bucket_count);
    end loop;

    select jsonb_agg(value order by ordinality)
    into v_score_buckets
    from unnest(v_bucket_counts) with ordinality as bucket(value, ordinality);
  end if;

  return jsonb_build_object(
    'detailsAvailable', v_group is not null,
    'totalValidResponses', v_total_count,
    'sameTrackCount', v_same_track_count,
    'sameCountryCount', case when v_same_country_count >= 10 then v_same_country_count else null end,
    'groupResponseCount', v_group_count,
    'medianScore', v_median,
    'lowerScorePercentage', v_lower_percentage,
    'scoreBuckets', v_score_buckets
  );
end;
$$;

create or replace function public.compute_statistics_growth7d(
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
  v_as_of timestamptz := now() - interval '7 days';
  v_current jsonb;
  v_then jsonb;
  v_new_total bigint;
  v_new_in_group bigint;
begin
  v_current := public.compute_country_statistics(p_scholarship_track, p_ranking_country, p_metric_value);
  v_then := public.compute_country_statistics(p_scholarship_track, p_ranking_country, p_metric_value, v_as_of);

  if (v_current->>'sameCountryCount') is not null then
    v_group := 'track-country';
  elsif (v_current->>'detailsAvailable')::boolean then
    v_group := 'track';
  else
    v_group := null;
  end if;

  select count(*) into v_new_total
  from public.responses
  where not is_suspicious
    and created_at > v_as_of;

  if v_group is null then
    v_new_in_group := 0;
  else
    select count(*) into v_new_in_group
    from public.responses
    where not is_suspicious
      and created_at > v_as_of
      and scholarship_track = p_scholarship_track
      and (v_group = 'track' or ranking_country = p_ranking_country);
  end if;

  return jsonb_build_object(
    'newResponsesTotal', v_new_total,
    'newResponsesInGroup', v_new_in_group,
    'medianThen', v_then->'medianScore',
    'medianNow', v_current->'medianScore',
    'percentileThen', v_then->'lowerScorePercentage',
    'percentileNow', v_current->'lowerScorePercentage'
  );
end;
$$;

create or replace function public.upsert_user_statistics_snapshot(
  p_telegram_user_id bigint,
  p_statistics jsonb
)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  insert into public.user_statistics_snapshots (
    telegram_user_id,
    snapshot_date,
    recorded_at,
    group_response_count,
    lower_score_percentage,
    median_score,
    same_track_count,
    same_country_count
  )
  values (
    p_telegram_user_id,
    (timezone('utc', now()))::date,
    now(),
    (p_statistics->>'groupResponseCount')::int,
    case
      when p_statistics->'lowerScorePercentage' = 'null'::jsonb then null
      else (p_statistics->>'lowerScorePercentage')::numeric
    end,
    case
      when p_statistics->'medianScore' = 'null'::jsonb then null
      else (p_statistics->>'medianScore')::numeric
    end,
    (p_statistics->>'sameTrackCount')::int,
    case
      when p_statistics->'sameCountryCount' = 'null'::jsonb then null
      else (p_statistics->>'sameCountryCount')::int
    end
  )
  on conflict (telegram_user_id, snapshot_date) do update
  set
    recorded_at = excluded.recorded_at,
    group_response_count = excluded.group_response_count,
    lower_score_percentage = excluded.lower_score_percentage,
    median_score = excluded.median_score,
    same_track_count = excluded.same_track_count,
    same_country_count = excluded.same_country_count;
end;
$$;

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
        'groupResponseCount', s.group_response_count
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
    or (select count(*) from jsonb_object_keys(p_statistics)) <> 10
    or not p_statistics ?& array[
      'detailsAvailable',
      'totalValidResponses',
      'sameTrackCount',
      'sameCountryCount',
      'groupResponseCount',
      'medianScore',
      'lowerScorePercentage',
      'scoreBuckets',
      'growth7d',
      'history'
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

    foreach v_key in array array['newResponsesTotal', 'newResponsesInGroup']
    loop
      if jsonb_typeof(p_statistics->'growth7d'->v_key) <> 'number' then
        raise exception using errcode = 'P0001', message = 'statistics_invalid';
      end if;
      v_number := (p_statistics->'growth7d'->>v_key)::numeric;
      if v_number < 0 or trunc(v_number) <> v_number then
        raise exception using errcode = 'P0001', message = 'statistics_invalid';
      end if;
    end loop;

    foreach v_key in array array['medianThen', 'medianNow', 'percentileThen', 'percentileNow']
    loop
      if jsonb_typeof(p_statistics->'growth7d'->v_key) <> 'null'
        and jsonb_typeof(p_statistics->'growth7d'->v_key) <> 'number'
      then
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
      or not v_history_entry ?& array['recordedAt', 'lowerScorePercentage', 'groupResponseCount']
    then
      raise exception using errcode = 'P0001', message = 'statistics_invalid';
    end if;

    if jsonb_typeof(v_history_entry->'recordedAt') <> 'string'
      or jsonb_typeof(v_history_entry->'groupResponseCount') <> 'number'
    then
      raise exception using errcode = 'P0001', message = 'statistics_invalid';
    end if;

    if jsonb_typeof(v_history_entry->'lowerScorePercentage') <> 'null'
      and jsonb_typeof(v_history_entry->'lowerScorePercentage') <> 'number'
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

create or replace function public.enrich_statistics_result(
  p_telegram_user_id bigint,
  p_statistics jsonb,
  p_scholarship_track text,
  p_ranking_country text,
  p_metric_value numeric,
  p_include_growth boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_result jsonb;
begin
  v_result := p_statistics
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
      'history', '[]'::jsonb
    );

  if p_include_growth and p_telegram_user_id is not null then
    perform public.upsert_user_statistics_snapshot(p_telegram_user_id, p_statistics);
    v_result := jsonb_set(
      v_result,
      '{history}',
      public.get_user_statistics_history(p_telegram_user_id, 14)
    );
  end if;

  return v_result;
end;
$$;

create or replace function public.get_response_statistics(p_response_id uuid)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = pg_catalog
as $$
declare
  v_target public.responses%rowtype;
  v_metric numeric;
  v_statistics jsonb;
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

  v_statistics := public.compute_country_statistics(
    v_target.scholarship_track,
    v_target.ranking_country,
    v_metric
  );

  return public.assert_statistics_result(
    public.enrich_statistics_result(
      v_target.telegram_user_id,
      v_statistics,
      v_target.scholarship_track,
      v_target.ranking_country,
      v_metric,
      false
    )
  );
end;
$$;

create or replace function public.get_current_statistics(p_telegram_user_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_response_id uuid;
  v_target public.responses%rowtype;
  v_metric numeric;
  v_statistics jsonb;
begin
  select id into v_response_id
  from public.responses
  where telegram_user_id = p_telegram_user_id;

  if v_response_id is null then
    return null;
  end if;

  select r.* into v_target
  from public.responses r
  where r.id = v_response_id;

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

revoke all on function public.compute_statistics_growth7d(text, text, numeric) from public, anon, authenticated, service_role;
revoke all on function public.upsert_user_statistics_snapshot(bigint, jsonb) from public, anon, authenticated, service_role;
revoke all on function public.get_user_statistics_history(bigint, integer) from public, anon, authenticated, service_role;
revoke all on function public.enrich_statistics_result(bigint, jsonb, text, text, numeric, boolean) from public, anon, authenticated, service_role;
revoke all on function public.compute_country_statistics(text, text, numeric, timestamptz) from public, anon, authenticated, service_role;

create or replace function public.get_public_statistics(
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
    public.enrich_statistics_result(
      null,
      public.compute_country_statistics(p_scholarship_track, p_ranking_country, v_metric),
      p_scholarship_track,
      p_ranking_country,
      v_metric,
      false
    )
  );
end;
$$;
