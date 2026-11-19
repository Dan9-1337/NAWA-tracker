--
-- Name: get_country_outcomes(bigint); Type: FUNCTION; Schema: public; Owner: -
--
-- Per-country distribution of orientation scores among people who reported
-- "scholarship_awarded", for the caller's scholarship track. A country is only
-- returned when at least 10 awarded, non-suspicious responses exist for it
-- (same k-anonymity floor as the rest of the statistics). Countries below the
-- floor are never named; only how many of them exist is returned.
--

CREATE FUNCTION public.get_country_outcomes(p_telegram_user_id bigint) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
declare
  c_min_awarded constant integer := 10;
  v_track text;
  v_country text;
  v_countries jsonb;
  v_hidden integer;
begin
  select r.scholarship_track, r.ranking_country
    into v_track, v_country
  from public.responses r
  where r.telegram_user_id = p_telegram_user_id;

  if v_track is null then
    return null;
  end if;

  with awarded as (
    select r.ranking_country, r.nawa_orientation_score as score
    from public.responses r
    where not r.is_suspicious
      and r.scholarship_track = v_track
      and r.current_status = 'scholarship_awarded'
      and r.nawa_orientation_score is not null
  ),
  per_country as (
    select
      a.ranking_country,
      count(*) as awarded_count,
      percentile_cont(0.1) within group (order by a.score) as p10,
      percentile_cont(0.5) within group (order by a.score) as median,
      percentile_cont(0.9) within group (order by a.score) as p90
    from awarded a
    group by a.ranking_country
  )
  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'country', p.ranking_country,
          'awardedCount', p.awarded_count,
          'lowScore', round(p.p10::numeric, 2),
          'medianScore', round(p.median::numeric, 2),
          'highScore', round(p.p90::numeric, 2)
        )
        order by (p.ranking_country = v_country) desc, p.awarded_count desc, p.ranking_country
      ) filter (where p.awarded_count >= c_min_awarded),
      '[]'::jsonb
    ),
    (count(*) filter (where p.awarded_count < c_min_awarded))::integer
  into v_countries, v_hidden
  from per_country p;

  return jsonb_build_object(
    'ownCountry', v_country,
    'countries', v_countries,
    'hiddenCountryCount', v_hidden
  );
end;
$$;

revoke all on function public.get_country_outcomes(bigint) from public, anon, authenticated;
grant execute on function public.get_country_outcomes(bigint) to service_role;
