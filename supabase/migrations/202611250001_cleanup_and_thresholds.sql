--
-- Cleanup and single-source thresholds.
--
-- * Drops the unused public (what-if) statistics endpoint: get_public_statistics and its rate-limit table
--   submission_limits (the Mini App never called it).
-- * Drops the always-null gradesScore and polishSchoolBonus keys from the statistics payload (the client
--   computes the score breakdown itself); the payload now has 14 keys.
-- * Names the privacy thresholds once (min_cohort_size, outcome_min_awarded, outcome_band_width). The same numbers
--   live in shared/product-rules.ts, and migration-contracts.test.ts fails if the two sides drift apart.
--

drop function public.get_public_statistics(text, text, numeric, numeric, text, text);
drop table public.submission_limits;

create function public.min_cohort_size() returns integer
    language sql immutable
    set search_path to 'pg_catalog'
    as $$ select 10 $$;

create function public.outcome_min_awarded() returns integer
    language sql immutable
    set search_path to 'pg_catalog'
    as $$ select 3 $$;

create function public.outcome_band_width() returns numeric
    language sql immutable
    set search_path to 'pg_catalog'
    as $$ select 5::numeric $$;

revoke all on function public.min_cohort_size() from public, anon, authenticated, service_role;
revoke all on function public.outcome_min_awarded() from public, anon, authenticated, service_role;
revoke all on function public.outcome_band_width() from public, anon, authenticated, service_role;

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
    if v_number < public.min_cohort_size() or trunc(v_number) <> v_number then
      raise exception using errcode = 'P0001', message = 'statistics_invalid';
    end if;
  end if;

  foreach v_key in array array[
    'medianScore',
    'lowerScorePercentage',
    'rankPosition',
    'rankTotal',
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

  if jsonb_typeof(p_statistics->'cohortScope') <> 'null' then
    v_scope := p_statistics->>'cohortScope';
    if jsonb_typeof(p_statistics->'cohortScope') <> 'string'
      or v_scope not in ('country', 'group', 'track')
    then
      raise exception using errcode = 'P0001', message = 'statistics_invalid';
    end if;
  end if;

  if jsonb_typeof(p_statistics->'cohortGroupId') <> 'null'
    and jsonb_typeof(p_statistics->'cohortGroupId') <> 'string'
  then
    raise exception using errcode = 'P0001', message = 'statistics_invalid';
  end if;

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
    if v_group_count < public.min_cohort_size()
      or p_statistics->'medianScore' = 'null'::jsonb
      or p_statistics->'lowerScorePercentage' = 'null'::jsonb
      or p_statistics->'scoreBuckets' = 'null'::jsonb
      or p_statistics->'cohortScope' = 'null'::jsonb
      or v_bucket_total <> v_group_count
    then
      raise exception using errcode = 'P0001', message = 'statistics_invalid';
    end if;
  elsif v_group_count <> 0
    or p_statistics->'medianScore' <> 'null'::jsonb
    or p_statistics->'lowerScorePercentage' <> 'null'::jsonb
    or p_statistics->'scoreBuckets' <> 'null'::jsonb
    or p_statistics->'cohortScope' <> 'null'::jsonb
    or p_statistics->'cohortGroupId' <> 'null'::jsonb
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
  v_year integer := public.active_intake_year();
  v_group_id text := public.country_group_id(p_ranking_country);
  v_scope text;
  v_scope_count bigint := 0;
  v_total_count bigint;
  v_same_track_count bigint;
  v_same_country_count bigint;
  v_same_group_count bigint;
  v_median numeric;
  v_lower_percentage numeric;
  v_rank_position bigint;
  v_track_wide_median numeric;
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

  select
    count(*) filter (where ranking_country = p_ranking_country),
    count(*) filter (where public.country_group_id(ranking_country) = v_group_id)
  into v_same_country_count, v_same_group_count
  from public.responses
  where not is_suspicious
    and intake_year = v_year
    and scholarship_track = p_scholarship_track
    and (p_as_of is null or created_at <= p_as_of);

  if v_same_country_count >= public.min_cohort_size() then
    v_scope := 'country';
    v_scope_count := v_same_country_count;
  elsif v_same_group_count >= public.min_cohort_size() then
    v_scope := 'group';
    v_scope_count := v_same_group_count;
  elsif v_same_track_count >= public.min_cohort_size() then
    v_scope := 'track';
    v_scope_count := v_same_track_count;
  end if;

  if p_scholarship_track = 'nawa_director' then
    v_bucket_origin := 60;
    v_bucket_step := 2.5;
  else
    v_bucket_origin := 0;
    v_bucket_step := 6.25;
  end if;

  if v_same_track_count >= public.min_cohort_size() then
    select percentile_cont(0.5) within group (
      order by case
        when p_scholarship_track = 'nawa_director' then nawa_orientation_score
        else grade_percentage
      end
    )
    into v_track_wide_median
    from public.responses
    where not is_suspicious
      and intake_year = v_year
      and scholarship_track = p_scholarship_track
      and (p_as_of is null or created_at <= p_as_of);
  end if;

  if v_scope is not null then
    select coalesce(array_agg(
      case when p_scholarship_track = 'nawa_director' then nawa_orientation_score else grade_percentage end
    ), array[]::numeric[])
    into v_metrics
    from public.responses
    where not is_suspicious
      and intake_year = v_year
      and scholarship_track = p_scholarship_track
      and (p_as_of is null or created_at <= p_as_of)
      and (
        v_scope = 'track'
        or (v_scope = 'country' and ranking_country = p_ranking_country)
        or (v_scope = 'group' and public.country_group_id(ranking_country) = v_group_id)
      );

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
    'detailsAvailable', v_scope is not null,
    'totalValidResponses', v_total_count,
    'sameTrackCount', v_same_track_count,
    'sameCountryCount', case when v_same_country_count >= public.min_cohort_size() then v_same_country_count else null end,
    'groupResponseCount', v_scope_count,
    'medianScore', v_median,
    'lowerScorePercentage', v_lower_percentage,
    'rankPosition', case when v_scope is not null then v_rank_position else null end,
    'rankTotal', case when v_scope is not null then v_scope_count else null end,
    'trackWideMedian', v_track_wide_median,
    'scoreBuckets', v_score_buckets,
    'cohortScores', v_cohort_scores,
    'cohortScope', v_scope,
    'cohortGroupId', case when v_scope = 'group' then v_group_id else null end
  );
end;
$$;

create or replace function public.get_cohort_outcomes(p_identity_hash text, p_intake_year integer) returns jsonb
    language plpgsql stable security definer
    set search_path to 'pg_catalog'
    as $$
declare
  c_min_awarded constant integer := public.outcome_min_awarded();
  c_band constant numeric := public.outcome_band_width();
  v_track text;
  v_country text;
  v_group_id text;
  v_scope text;
  v_awarded integer := 0;
  v_not_awarded integer := 0;
  v_low numeric;
  v_high numeric;
  v_not_awarded_high numeric;
  v_tier text;
begin
  select r.scholarship_track, r.ranking_country
  into v_track, v_country
  from public.responses r
  where r.identity_hash = p_identity_hash
    and r.intake_year = p_intake_year;

  if v_track is null then
    return null;
  end if;

  v_group_id := public.country_group_id(v_country);

  -- First tier of country -> group -> track that has enough awarded responses to disclose.
  foreach v_tier in array array['country', 'group', 'track']
  loop
    select
      count(*) filter (where r.current_status = 'scholarship_awarded'),
      count(*) filter (where r.current_status = 'scholarship_not_awarded'),
      min(r.nawa_orientation_score) filter (where r.current_status = 'scholarship_awarded'),
      max(r.nawa_orientation_score) filter (where r.current_status = 'scholarship_awarded'),
      max(r.nawa_orientation_score) filter (where r.current_status = 'scholarship_not_awarded')
    into v_awarded, v_not_awarded, v_low, v_high, v_not_awarded_high
    from public.responses r
    where not r.is_suspicious
      and r.intake_year = p_intake_year
      and r.scholarship_track = v_track
      and r.nawa_orientation_score is not null
      and (
        v_tier = 'track'
        or (v_tier = 'country' and r.ranking_country = v_country)
        or (v_tier = 'group' and public.country_group_id(r.ranking_country) = v_group_id)
      );

    if v_awarded >= c_min_awarded then
      v_scope := v_tier;
      exit;
    end if;
  end loop;

  if v_scope is null then
    return jsonb_build_object(
      'ownCountry', v_country,
      'scope', null,
      'groupId', null,
      'awardedCount', 0,
      'notAwardedCount', 0,
      'awardedRate', null,
      'awardedBandLow', null,
      'awardedBandHigh', null,
      'notAwardedBandHigh', null
    );
  end if;

  return jsonb_build_object(
    'ownCountry', v_country,
    'scope', v_scope,
    'groupId', case when v_scope = 'group' then v_group_id else null end,
    'awardedCount', v_awarded,
    'notAwardedCount', v_not_awarded,
    'awardedRate', case
      when v_awarded + v_not_awarded > 0 then round(v_awarded::numeric / (v_awarded + v_not_awarded), 2)
      else null
    end,
    'awardedBandLow', greatest(0, floor(v_low / c_band) * c_band),
    'awardedBandHigh', least(100, ceil(v_high / c_band) * c_band),
    'notAwardedBandHigh', case
      when v_not_awarded >= c_min_awarded then least(100, ceil(v_not_awarded_high / c_band) * c_band)
      else null
    end
  );
end;
$$;
