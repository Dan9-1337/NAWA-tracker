--
-- Cohort ladder and slim statistics.
--
-- * Cohorts follow the way NAWA allocates seats (per country or per country *group*): the comparison
--   cohort is the applicant's country when it has at least 10 responses, otherwise their country
--   group (table country_groups, editable without a deploy), otherwise the whole track.
-- * Statistics are scoped to the active intake year (season_config).
-- * The statistics payload is reduced to what the product still shows: the score position inside the
--   cohort. Growth, history, global benchmark, country context, group progress and the old
--   reported-merit-outcomes block are dropped together with their functions.
-- * Outcomes (get_cohort_outcomes) are disclosed per cohort, only from 3 awarded responses, and
--   scores are rounded outward to 5-point bands so no single applicant's score is exposed.
--

-- ---------------------------------------------------------------------------
-- Season configuration
-- ---------------------------------------------------------------------------

create table public.season_config (
  id boolean primary key default true check (id),
  active_intake_year integer not null check (active_intake_year between 2018 and 2100)
);

insert into public.season_config (active_intake_year) values (2026);

create function public.active_intake_year() returns integer
    language sql stable security definer
    set search_path to 'pg_catalog'
    as $$
  select active_intake_year from public.season_config where id;
$$;

-- ---------------------------------------------------------------------------
-- Country groups
-- ---------------------------------------------------------------------------

create table public.country_groups (
  country_code text primary key check (length(country_code) = 2),
  group_id text not null check (length(group_id) between 2 and 32)
);

-- BY, UA and LT are large enough to stand alone; everything unlisted falls into 'world-other'.
-- The 'east' group follows the former Anders region IV (RU, KZ, KG, UZ, TJ, TM, AM, AZ, GE) plus MD.
insert into public.country_groups (country_code, group_id) values
  ('BY', 'BY'), ('UA', 'UA'), ('LT', 'LT'),
  ('RU', 'east'), ('MD', 'east'), ('KZ', 'east'), ('KG', 'east'), ('UZ', 'east'),
  ('TJ', 'east'), ('TM', 'east'), ('AM', 'east'), ('AZ', 'east'), ('GE', 'east'),
  ('AD', 'europe-other'), ('AL', 'europe-other'), ('AT', 'europe-other'), ('BA', 'europe-other'),
  ('BE', 'europe-other'), ('BG', 'europe-other'), ('CH', 'europe-other'), ('CY', 'europe-other'),
  ('CZ', 'europe-other'), ('DE', 'europe-other'), ('DK', 'europe-other'), ('EE', 'europe-other'),
  ('ES', 'europe-other'), ('FI', 'europe-other'), ('FR', 'europe-other'), ('GB', 'europe-other'),
  ('GR', 'europe-other'), ('HR', 'europe-other'), ('HU', 'europe-other'), ('IE', 'europe-other'),
  ('IS', 'europe-other'), ('IT', 'europe-other'), ('LI', 'europe-other'), ('LU', 'europe-other'),
  ('LV', 'europe-other'), ('MC', 'europe-other'), ('ME', 'europe-other'), ('MK', 'europe-other'),
  ('MT', 'europe-other'), ('NL', 'europe-other'), ('NO', 'europe-other'), ('PT', 'europe-other'),
  ('RO', 'europe-other'), ('RS', 'europe-other'), ('SE', 'europe-other'), ('SI', 'europe-other'),
  ('SK', 'europe-other'), ('SM', 'europe-other'), ('VA', 'europe-other'), ('XK', 'europe-other');

create function public.country_group_id(p_country text) returns text
    language sql stable
    set search_path to 'pg_catalog'
    as $$
  select coalesce(
    (select cg.group_id from public.country_groups cg where cg.country_code = p_country),
    'world-other'
  );
$$;

-- ---------------------------------------------------------------------------
-- Drop what the slim payload no longer needs
-- ---------------------------------------------------------------------------

drop function public.get_country_outcomes(bigint);
drop function public.enrich_statistics_result(bigint, jsonb, text, text, numeric, boolean);
drop function public.compute_statistics_growth7d(text, text, numeric);
drop function public.compute_track_benchmark(text, numeric, timestamp with time zone);
drop function public.compute_country_context(jsonb, text, text, numeric);
drop function public.compute_group_progress(text, text);
drop function public.compute_reported_merit_outcomes(text, text);

-- ---------------------------------------------------------------------------
-- Statistics payload
-- ---------------------------------------------------------------------------

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
    or (select count(*) from jsonb_object_keys(p_statistics)) <> 16
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
    if v_group_count < 10
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

  if v_same_country_count >= 10 then
    v_scope := 'country';
    v_scope_count := v_same_country_count;
  elsif v_same_group_count >= 10 then
    v_scope := 'group';
    v_scope_count := v_same_group_count;
  elsif v_same_track_count >= 10 then
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

  if v_same_track_count >= 10 then
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
    'sameCountryCount', case when v_same_country_count >= 10 then v_same_country_count else null end,
    'groupResponseCount', v_scope_count,
    'medianScore', v_median,
    'lowerScorePercentage', v_lower_percentage,
    'rankPosition', case when v_scope is not null then v_rank_position else null end,
    'rankTotal', case when v_scope is not null then v_scope_count else null end,
    'gradesScore', null,
    'polishSchoolBonus', null,
    'trackWideMedian', v_track_wide_median,
    'scoreBuckets', v_score_buckets,
    'cohortScores', v_cohort_scores,
    'cohortScope', v_scope,
    'cohortGroupId', case when v_scope = 'group' then v_group_id else null end
  );
end;
$$;

create or replace function public.get_response_statistics(p_response_id uuid) returns jsonb
    language plpgsql
    set search_path to 'pg_catalog'
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

  return public.assert_statistics_result(
    public.compute_country_statistics(v_target.scholarship_track, v_target.ranking_country, v_metric)
  );
end;
$$;

create or replace function public.get_current_statistics(p_telegram_user_id bigint, p_intake_year integer) returns jsonb
    language plpgsql security definer
    set search_path to 'pg_catalog'
    as $$
declare
  v_response_id uuid;
begin
  select r.id into v_response_id
  from public.responses r
  where r.telegram_user_id = p_telegram_user_id
    and r.intake_year = p_intake_year;

  if v_response_id is null then
    return null;
  end if;

  return public.get_response_statistics(v_response_id);
end;
$$;

create or replace function public.get_public_statistics(
  p_scholarship_track text,
  p_ranking_country text,
  p_average_grade numeric,
  p_maximum_grade numeric,
  p_polish_school_level text,
  p_ip_hash text
) returns jsonb
    language plpgsql security definer
    set search_path to 'pg_catalog'
    as $$
declare
  v_metric numeric;
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
    v_metric := public.compute_orientation_score(
      p_average_grade, p_maximum_grade, p_ranking_country, p_polish_school_level, 'school_leaver'
    );
  else
    v_metric := round(p_average_grade / p_maximum_grade * 100, 2);
  end if;

  return public.assert_statistics_result(
    public.compute_country_statistics(p_scholarship_track, p_ranking_country, v_metric)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Outcomes per cohort
-- ---------------------------------------------------------------------------

create function public.get_cohort_outcomes(p_telegram_user_id bigint, p_intake_year integer) returns jsonb
    language plpgsql stable security definer
    set search_path to 'pg_catalog'
    as $$
declare
  c_min_awarded constant integer := 3;
  c_band constant numeric := 5;
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
  where r.telegram_user_id = p_telegram_user_id
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

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

revoke all on table public.season_config, public.country_groups from public, anon, authenticated;
revoke all on function public.active_intake_year() from public, anon, authenticated, service_role;
revoke all on function public.country_group_id(text) from public, anon, authenticated, service_role;

revoke all on function public.get_cohort_outcomes(bigint, integer) from public, anon, authenticated;
grant execute on function public.get_cohort_outcomes(bigint, integer) to service_role;
