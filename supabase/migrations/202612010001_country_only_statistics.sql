--
-- Country-only statistics (docs/adr/0015).
--
-- * The comparison cohort is the applicant's country of citizenship (ranking_country) on their track and the
--   active intake year. Country groups (country_groups) and the whole-track tier are no longer used here.
-- * There is no minimum number of responses: the full position (rank, percentile, median, distribution) is
--   computed from two valid (not is_suspicious) surveys in the country. With none or one, detailsAvailable is
--   false, every detail field is null and sameCountryCount still reports the count without a floor.
-- * The payload keeps its 14 keys, so old and new clients and servers keep parsing each other during a deploy:
--   cohortGroupId and trackWideMedian are always null and cohortScope is only ever 'country'.
-- * Signatures and grants are unchanged: both functions stay reachable only from the security-definer RPCs.
--

create or replace function public.assert_statistics_result(p_statistics jsonb) returns jsonb
    language plpgsql immutable
    set search_path to 'pg_catalog'
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
  v_scope text;
begin
  if p_statistics is null then
    raise exception using errcode = 'P0001', message = 'statistics_unavailable';
  end if;

  if jsonb_typeof(p_statistics) <> 'object'
    or (select count(*) from jsonb_object_keys(p_statistics)) <> 14
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
      'trackWideMedian',
      'scoreBuckets',
      'cohortScores',
      'cohortScope',
      'cohortGroupId'
    ]
  then
    raise exception using errcode = 'P0001', message = 'statistics_invalid';
  end if;

  if jsonb_typeof(p_statistics->'detailsAvailable') <> 'boolean' then
    raise exception using errcode = 'P0001', message = 'statistics_invalid';
  end if;

  -- sameCountryCount is always the country cohort size: a number, never null and never floored.
  foreach v_key in array array[
    'totalValidResponses',
    'sameTrackCount',
    'sameCountryCount',
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
    'medianScore',
    'lowerScorePercentage',
    'rankPosition',
    'rankTotal'
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

  -- The whole-track median and the pooled group id are retired by ADR 0015 and never travel any more.
  if jsonb_typeof(p_statistics->'trackWideMedian') <> 'null'
    or jsonb_typeof(p_statistics->'cohortGroupId') <> 'null'
  then
    raise exception using errcode = 'P0001', message = 'statistics_invalid';
  end if;

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

  -- Only the country tier survives: country groups and the whole track are never reported.
  if jsonb_typeof(p_statistics->'cohortScope') <> 'null' then
    v_scope := p_statistics->>'cohortScope';
    if jsonb_typeof(p_statistics->'cohortScope') <> 'string'
      or v_scope <> 'country'
    then
      raise exception using errcode = 'P0001', message = 'statistics_invalid';
    end if;
  end if;

  v_details_available := (p_statistics->>'detailsAvailable')::boolean;
  v_total_count := (p_statistics->>'totalValidResponses')::numeric;
  v_same_track_count := (p_statistics->>'sameTrackCount')::numeric;
  v_same_country_count := (p_statistics->>'sameCountryCount')::numeric;
  v_group_count := (p_statistics->>'groupResponseCount')::numeric;

  if v_same_track_count > v_total_count
    or v_group_count > v_same_track_count
    or v_same_country_count > v_same_track_count
  then
    raise exception using errcode = 'P0001', message = 'statistics_invalid';
  end if;

  if v_details_available then
    -- The country cohort is the only cohort, and the smallest one that yields a position is two surveys.
    if v_same_country_count < 2
      or v_group_count <> v_same_country_count
      or p_statistics->'rankTotal' = 'null'::jsonb
      or (p_statistics->>'rankTotal')::numeric <> v_same_country_count
      or v_scope is distinct from 'country'
      or p_statistics->'medianScore' = 'null'::jsonb
      or p_statistics->'lowerScorePercentage' = 'null'::jsonb
      or p_statistics->'scoreBuckets' = 'null'::jsonb
      or v_bucket_total <> v_same_country_count
    then
      raise exception using errcode = 'P0001', message = 'statistics_invalid';
    end if;
  elsif v_same_country_count >= 2
    or v_group_count <> 0
    or p_statistics->'medianScore' <> 'null'::jsonb
    or p_statistics->'lowerScorePercentage' <> 'null'::jsonb
    or p_statistics->'rankPosition' <> 'null'::jsonb
    or p_statistics->'rankTotal' <> 'null'::jsonb
    or p_statistics->'scoreBuckets' <> 'null'::jsonb
    or p_statistics->'cohortScope' <> 'null'::jsonb
  then
    raise exception using errcode = 'P0001', message = 'statistics_invalid';
  end if;

  return p_statistics;
end;
$$;

create or replace function public.compute_country_statistics(
  p_scholarship_track text,
  p_ranking_country text,
  p_metric_value numeric,
  p_as_of timestamp with time zone default null
) returns jsonb
    language plpgsql
    set search_path to 'pg_catalog'
    as $$
declare
  -- Two surveys are the smallest country cohort with a rank and a median. This is not a privacy floor: the
  -- number of responses is shown, and ADR 0015 accepts that a handful of answers make small countries noisy.
  c_details_from constant integer := 2;
  v_year integer := public.active_intake_year();
  v_total_count bigint;
  v_same_track_count bigint;
  v_same_country_count bigint;
  v_details_available boolean;
  v_median numeric;
  v_lower_percentage numeric;
  v_rank_position bigint;
  v_score_buckets jsonb;
  v_cohort_scores jsonb;
  v_bucket_origin numeric;
  v_bucket_step numeric;
  v_metrics numeric[];
begin
  select count(*), count(*) filter (where scholarship_track = p_scholarship_track)
  into v_total_count, v_same_track_count
  from public.responses
  where not is_suspicious
    and intake_year = v_year
    and (p_as_of is null or created_at <= p_as_of);

  select count(*)
  into v_same_country_count
  from public.responses
  where not is_suspicious
    and intake_year = v_year
    and scholarship_track = p_scholarship_track
    and ranking_country = p_ranking_country
    and (p_as_of is null or created_at <= p_as_of);

  v_details_available := v_same_country_count >= c_details_from;

  if p_scholarship_track = 'nawa_director' then
    v_bucket_origin := 60;
    v_bucket_step := 2.5;
  else
    v_bucket_origin := 0;
    v_bucket_step := 6.25;
  end if;

  if v_details_available then
    select coalesce(array_agg(
      case when p_scholarship_track = 'nawa_director' then nawa_orientation_score else grade_percentage end
    ), array[]::numeric[])
    into v_metrics
    from public.responses
    where not is_suspicious
      and intake_year = v_year
      and scholarship_track = p_scholarship_track
      and ranking_country = p_ranking_country
      and (p_as_of is null or created_at <= p_as_of);

    select
      percentile_cont(0.5) within group (order by m.metric),
      count(*) filter (where m.metric < p_metric_value)::numeric / count(*) * 100,
      count(*) filter (where m.metric > p_metric_value) + 1
    into v_median, v_lower_percentage, v_rank_position
    from unnest(v_metrics) as m(metric)
    where m.metric is not null;

    select coalesce(jsonb_agg(capped.metric order by capped.metric desc), '[]'::jsonb)
    into v_cohort_scores
    from (
      select m.metric from unnest(v_metrics) as m(metric) where m.metric is not null order by m.metric desc limit 40
    ) capped;

    -- Bucket 0 also takes everything below the origin, bucket 15 everything above the last step.
    select jsonb_agg(coalesce(c.n, 0) order by g.i)
    into v_score_buckets
    from generate_series(0, 15) as g(i)
    left join (
      select least(15, greatest(0, floor((m.metric - v_bucket_origin) / v_bucket_step)::integer)) as i, count(*) as n
      from unnest(v_metrics) as m(metric)
      where m.metric is not null
      group by 1
    ) c on c.i = g.i;
  end if;

  return jsonb_build_object(
    'detailsAvailable', v_details_available,
    'totalValidResponses', v_total_count,
    'sameTrackCount', v_same_track_count,
    'sameCountryCount', v_same_country_count,
    'groupResponseCount', case when v_details_available then v_same_country_count else 0 end,
    'medianScore', v_median,
    'lowerScorePercentage', v_lower_percentage,
    'rankPosition', case when v_details_available then v_rank_position else null end,
    'rankTotal', case when v_details_available then v_same_country_count else null end,
    'trackWideMedian', null,
    'scoreBuckets', v_score_buckets,
    'cohortScores', v_cohort_scores,
    'cohortScope', case when v_details_available then 'country' else null end,
    'cohortGroupId', null
  );
end;
$$;

revoke all on function public.compute_country_statistics(text, text, numeric, timestamp with time zone) from public, anon, authenticated, service_role;
revoke all on function public.assert_statistics_result(jsonb) from public, anon, authenticated, service_role;
