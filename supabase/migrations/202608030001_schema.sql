-- NAWA Tracker consolidated schema (pre-production baseline).

create extension if not exists pgcrypto with schema extensions;

CREATE TABLE public.product_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    telegram_user_id bigint NOT NULL,
    event_name text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: response_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.response_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    telegram_user_id bigint NOT NULL,
    response_id uuid,
    event_type text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: responses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.responses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    telegram_user_id bigint NOT NULL,
    telegram_username text,
    has_polish_citizenship boolean NOT NULL,
    ranking_country text NOT NULL,
    school_country text NOT NULL,
    scholarship_track text NOT NULL,
    study_route text NOT NULL,
    average_grade numeric NOT NULL,
    maximum_grade numeric NOT NULL,
    grade_percentage numeric NOT NULL,
    polish_school_level text,
    nawa_orientation_score numeric,
    current_status text NOT NULL,
    status_changed_at date NOT NULL,
    is_suspicious boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    target_university text,
    CONSTRAINT responses_average_grade_check CHECK ((average_grade >= (0)::numeric)),
    CONSTRAINT responses_check CHECK ((((grade_percentage >= (0)::numeric) AND (grade_percentage <= (100)::numeric)) AND (grade_percentage = ((average_grade / maximum_grade) * (100)::numeric)))),
    CONSTRAINT responses_check1 CHECK ((average_grade <= maximum_grade)),
    CONSTRAINT responses_check2 CHECK ((((scholarship_track = 'nawa_director'::text) AND (polish_school_level IS NOT NULL)) OR ((scholarship_track <> 'nawa_director'::text) AND (polish_school_level IS NULL)))),
    CONSTRAINT responses_check3 CHECK (((scholarship_track = 'nawa_director'::text) = (nawa_orientation_score IS NOT NULL))),
    CONSTRAINT responses_check4 CHECK (((scholarship_track <> 'health_minister'::text) OR (study_route = 'preparatory_course'::text))),
    CONSTRAINT responses_check5 CHECK (((NOT has_polish_citizenship) OR (scholarship_track = 'nawa_director'::text))),
    CONSTRAINT responses_current_status_check CHECK ((current_status = ANY (ARRAY['submitted'::text, 'formal_review_positive'::text, 'merit_review_positive'::text, 'merit_review_negative'::text, 'scholarship_awarded'::text]))),
    CONSTRAINT responses_maximum_grade_check CHECK (((maximum_grade >= (1)::numeric) AND (maximum_grade <= (1000)::numeric))),
    CONSTRAINT responses_nawa_orientation_score_check CHECK ((nawa_orientation_score >= (0)::numeric)),
    CONSTRAINT responses_polish_school_level_check CHECK ((polish_school_level = ANY (ARRAY['none'::text, 'primary'::text, 'secondary'::text]))),
    CONSTRAINT responses_ranking_country_check CHECK (((length(ranking_country) >= 1) AND (length(ranking_country) <= 100))),
    CONSTRAINT responses_scholarship_track_check CHECK ((scholarship_track = ANY (ARRAY['nawa_director'::text, 'health_minister'::text, 'culture_minister'::text]))),
    CONSTRAINT responses_school_country_check CHECK (((length(school_country) >= 1) AND (length(school_country) <= 100))),
    CONSTRAINT responses_study_route_check CHECK ((study_route = ANY (ARRAY['preparatory_course'::text, 'direct_studies'::text]))),
    CONSTRAINT responses_target_university_check CHECK (((target_university IS NULL) OR ((length(target_university) >= 1) AND (length(target_university) <= 64)))),
    CONSTRAINT responses_target_university_route_check CHECK (((study_route <> 'preparatory_course'::text) OR (target_university IS NULL))),
    CONSTRAINT responses_telegram_user_id_check CHECK ((telegram_user_id > 0)),
    CONSTRAINT responses_telegram_username_check CHECK (((telegram_username IS NULL) OR ((length(telegram_username) >= 1) AND (length(telegram_username) <= 100))))
);

--
-- Name: status_change_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.status_change_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    telegram_user_id bigint NOT NULL,
    from_status text NOT NULL,
    to_status text NOT NULL,
    reason text,
    decision text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    reviewed_at timestamp with time zone,
    CONSTRAINT status_change_requests_decision_check CHECK ((decision = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);

--
-- Name: submission_limits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.submission_limits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ip_hash text NOT NULL,
    limit_type text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT submission_limits_ip_hash_check CHECK ((length(ip_hash) > 0)),
    CONSTRAINT submission_limits_limit_type_check CHECK ((limit_type = 'public_stats'::text))
);

--
-- Name: user_statistics_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_statistics_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    telegram_user_id bigint NOT NULL,
    snapshot_date date DEFAULT (timezone('utc'::text, now()))::date NOT NULL,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    group_response_count integer NOT NULL,
    lower_score_percentage numeric,
    median_score numeric,
    same_track_count integer NOT NULL,
    same_country_count integer
);

--
-- Name: product_events product_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_events
    ADD CONSTRAINT product_events_pkey PRIMARY KEY (id);

--
-- Name: response_audit_log response_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.response_audit_log
    ADD CONSTRAINT response_audit_log_pkey PRIMARY KEY (id);

--
-- Name: responses responses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.responses
    ADD CONSTRAINT responses_pkey PRIMARY KEY (id);

--
-- Name: responses responses_telegram_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.responses
    ADD CONSTRAINT responses_telegram_user_id_key UNIQUE (telegram_user_id);

--
-- Name: status_change_requests status_change_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.status_change_requests
    ADD CONSTRAINT status_change_requests_pkey PRIMARY KEY (id);

--
-- Name: submission_limits submission_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submission_limits
    ADD CONSTRAINT submission_limits_pkey PRIMARY KEY (id);

--
-- Name: user_statistics_snapshots user_statistics_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_statistics_snapshots
    ADD CONSTRAINT user_statistics_snapshots_pkey PRIMARY KEY (id);

--
-- Name: user_statistics_snapshots user_statistics_snapshots_telegram_user_id_snapshot_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_statistics_snapshots
    ADD CONSTRAINT user_statistics_snapshots_telegram_user_id_snapshot_date_key UNIQUE (telegram_user_id, snapshot_date);

--
-- Name: product_events_telegram_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX product_events_telegram_user_id_idx ON public.product_events USING btree (telegram_user_id, created_at DESC);

--
-- Name: response_audit_log_telegram_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX response_audit_log_telegram_user_id_idx ON public.response_audit_log USING btree (telegram_user_id, created_at DESC);

--
-- Name: responses_current_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX responses_current_status_idx ON public.responses USING btree (current_status);

--
-- Name: responses_grade_percentage_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX responses_grade_percentage_idx ON public.responses USING btree (grade_percentage);

--
-- Name: responses_nawa_orientation_score_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX responses_nawa_orientation_score_idx ON public.responses USING btree (nawa_orientation_score);

--
-- Name: responses_ranking_country_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX responses_ranking_country_idx ON public.responses USING btree (ranking_country);

--
-- Name: responses_scholarship_track_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX responses_scholarship_track_idx ON public.responses USING btree (scholarship_track);

--
-- Name: responses_target_university_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX responses_target_university_idx ON public.responses USING btree (target_university) WHERE (target_university IS NOT NULL);

--
-- Name: status_change_requests_telegram_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX status_change_requests_telegram_user_id_idx ON public.status_change_requests USING btree (telegram_user_id, created_at DESC);

--
-- Name: submission_limits_lookup_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX submission_limits_lookup_idx ON public.submission_limits USING btree (ip_hash, limit_type, created_at);

--
-- Name: user_statistics_snapshots_telegram_user_id_recorded_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_statistics_snapshots_telegram_user_id_recorded_at_idx ON public.user_statistics_snapshots USING btree (telegram_user_id, recorded_at DESC);

--
-- Name: status_change_requests status_change_requests_telegram_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.status_change_requests
    ADD CONSTRAINT status_change_requests_telegram_user_id_fkey FOREIGN KEY (telegram_user_id) REFERENCES public.responses(telegram_user_id) ON DELETE CASCADE;

--
-- Name: user_statistics_snapshots user_statistics_snapshots_telegram_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_statistics_snapshots
    ADD CONSTRAINT user_statistics_snapshots_telegram_user_id_fkey FOREIGN KEY (telegram_user_id) REFERENCES public.responses(telegram_user_id) ON DELETE CASCADE;

--
-- Name: product_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_events ENABLE ROW LEVEL SECURITY;

--
-- Name: response_audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.response_audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: responses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;

--
-- Name: status_change_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.status_change_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: submission_limits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.submission_limits ENABLE ROW LEVEL SECURITY;

--
-- Name: user_statistics_snapshots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_statistics_snapshots ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

CREATE FUNCTION public.assert_statistics_result(p_statistics jsonb) RETURNS jsonb
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO 'pg_catalog'
    AS $$
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
    or (select count(*) from jsonb_object_keys(p_statistics)) <> 20
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
      'reportedMeritOutcomes',
      'globalBenchmark',
      'countryContext'
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

  if jsonb_typeof(p_statistics->'globalBenchmark') <> 'object'
    or not p_statistics->'globalBenchmark' ?& array[
      'sampleSize',
      'representedCountryCount',
      'median',
      'scoreDelta',
      'lowerScorePercentage',
      'scoreBuckets',
      'detailedCountriesCount'
    ]
  then
    raise exception using errcode = 'P0001', message = 'statistics_invalid';
  end if;

  if jsonb_typeof(p_statistics->'countryContext') <> 'object'
    or not p_statistics->'countryContext' ?& array[
      'countryMedian',
      'countrySampleSize',
      'countryShareOfTrack',
      'medianDeltaVsGlobal',
      'distributionStable',
      'nearbyScoreCount'
    ]
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
      'percentileNow',
      'trackNewResponses',
      'trackMedianThen',
      'trackMedianNow',
      'statusUpdatesInGroup'
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

--
-- Name: compute_country_statistics(text, text, numeric, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.compute_country_statistics(p_scholarship_track text, p_ranking_country text, p_metric_value numeric, p_as_of timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog'
    AS $$
declare
  v_group text;
  v_group_count bigint := 0;
  v_total_count bigint;
  v_same_track_count bigint;
  v_same_country_count bigint;
  v_median numeric;
  v_lower_percentage numeric;
  v_rank_position bigint;
  v_track_wide_median numeric;
  v_score_buckets jsonb;
  v_cohort_scores jsonb;
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
      and scholarship_track = p_scholarship_track
      and (p_as_of is null or created_at <= p_as_of);
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
      count(*) filter (where metric < p_metric_value)::numeric / count(*) * 100,
      count(*) filter (where metric > p_metric_value) + 1
    into v_median, v_lower_percentage, v_rank_position
    from group_responses;

    select coalesce(jsonb_agg(metric order by metric desc), '[]'::jsonb)
    into v_cohort_scores
    from (
      select case
        when p_scholarship_track = 'nawa_director' then nawa_orientation_score
        else grade_percentage
      end as metric
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
      order by metric desc
      limit 40
    ) capped;

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
    'rankPosition', case when v_group is not null then v_rank_position else null end,
    'rankTotal', case when v_group is not null then v_group_count else null end,
    'gradesScore', null,
    'polishSchoolBonus', null,
    'trackWideMedian', v_track_wide_median,
    'scoreBuckets', v_score_buckets,
    'cohortScores', v_cohort_scores
  );
end;
$$;

--
-- Name: compute_group_progress(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.compute_group_progress(p_scholarship_track text, p_ranking_country text) RETURNS jsonb
    LANGUAGE sql STABLE
    SET search_path TO 'pg_catalog'
    AS $$
  select jsonb_build_object(
    'submitted', count(*) filter (where current_status = 'submitted'),
    'formalPositive', count(*) filter (where current_status = 'formal_review_positive'),
    'meritPositive', count(*) filter (where current_status = 'merit_review_positive'),
    'scholarshipAwarded', count(*) filter (where current_status = 'scholarship_awarded')
  )
  from public.responses
  where not is_suspicious
    and scholarship_track = p_scholarship_track
    and ranking_country = p_ranking_country;
$$;

--
-- Name: compute_reported_merit_outcomes(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.compute_reported_merit_outcomes(p_scholarship_track text, p_ranking_country text) RETURNS jsonb
    LANGUAGE plpgsql STABLE
    SET search_path TO 'pg_catalog'
    AS $$
declare
  v_positive_count bigint;
  v_negative_count bigint;
  v_lowest_positive numeric;
  v_highest_negative numeric;
  v_boundary_state text;
begin
  select
    count(*) filter (where current_status = 'merit_review_positive'),
    count(*) filter (where current_status = 'merit_review_negative'),
    min(case when current_status = 'merit_review_positive' then nawa_orientation_score end),
    max(case when current_status = 'merit_review_negative' then nawa_orientation_score end)
  into v_positive_count, v_negative_count, v_lowest_positive, v_highest_negative
  from public.responses
  where not is_suspicious
    and scholarship_track = p_scholarship_track
    and ranking_country = p_ranking_country
    and nawa_orientation_score is not null;

  if coalesce(v_positive_count, 0) + coalesce(v_negative_count, 0) < 1 then
    v_boundary_state := 'insufficient_data';
  elsif coalesce(v_positive_count, 0) < 3 then
    v_boundary_state := 'positive_only';
  elsif coalesce(v_negative_count, 0) < 3 then
    v_boundary_state := 'positive_only';
  elsif v_highest_negative >= v_lowest_positive then
    v_boundary_state := 'overlapping_results';
  else
    v_boundary_state := 'interval';
  end if;

  return jsonb_build_object(
    'positiveCount', coalesce(v_positive_count, 0),
    'negativeCount', coalesce(v_negative_count, 0),
    'lowestReportedPositiveScore', v_lowest_positive,
    'highestReportedNegativeScore', v_highest_negative,
    'boundaryState', v_boundary_state
  );
end;
$$;

--
-- Name: compute_track_benchmark(text, numeric, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.compute_track_benchmark(p_scholarship_track text, p_metric_value numeric, p_as_of timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog'
    AS $$
declare
  v_same_track_count bigint;
  v_median numeric;
  v_lower_percentage numeric;
  v_score_buckets jsonb;
  v_represented_count bigint;
  v_detailed_countries bigint;
  v_bucket_origin numeric;
  v_bucket_step numeric;
  v_bucket_index integer;
  v_bucket_counts numeric[] := array[]::numeric[];
  v_bucket_count numeric;
begin
  select count(*) into v_same_track_count
  from public.responses
  where not is_suspicious
    and scholarship_track = p_scholarship_track
    and (p_as_of is null or created_at <= p_as_of);

  if v_same_track_count < 10 then
    return jsonb_build_object(
      'sampleSize', null,
      'representedCountryCount', null,
      'median', null,
      'scoreDelta', null,
      'lowerScorePercentage', null,
      'scoreBuckets', null,
      'detailedCountriesCount', null
    );
  end if;

  if p_scholarship_track = 'nawa_director' then
    v_bucket_origin := 60;
    v_bucket_step := 2.5;
  else
    v_bucket_origin := 0;
    v_bucket_step := 6.25;
  end if;

  select
    percentile_cont(0.5) within group (
      order by case
        when p_scholarship_track = 'nawa_director' then nawa_orientation_score
        else grade_percentage
      end
    ),
    count(*) filter (
      where (
        case
          when p_scholarship_track = 'nawa_director' then nawa_orientation_score
          else grade_percentage
        end
      ) < p_metric_value
    )::numeric / count(*) * 100
  into v_median, v_lower_percentage
  from public.responses
  where not is_suspicious
    and scholarship_track = p_scholarship_track
    and (p_as_of is null or created_at <= p_as_of)
    and (
      case
        when p_scholarship_track = 'nawa_director' then nawa_orientation_score
        else grade_percentage
      end
    ) is not null;

  select count(distinct ranking_country) into v_represented_count
  from public.responses
  where not is_suspicious
    and scholarship_track = p_scholarship_track
    and (p_as_of is null or created_at <= p_as_of);

  select count(*) into v_detailed_countries
  from (
    select ranking_country
    from public.responses
    where not is_suspicious
      and scholarship_track = p_scholarship_track
      and (p_as_of is null or created_at <= p_as_of)
    group by ranking_country
    having count(*) >= 10
  ) detailed;

  for v_bucket_index in 0..15 loop
    select count(*) into v_bucket_count
    from public.responses
    where not is_suspicious
      and scholarship_track = p_scholarship_track
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

  return jsonb_build_object(
    'sampleSize', v_same_track_count,
    'representedCountryCount', v_represented_count,
    'median', v_median,
    'scoreDelta', round(p_metric_value - v_median, 2),
    'lowerScorePercentage', v_lower_percentage,
    'scoreBuckets', v_score_buckets,
    'detailedCountriesCount', v_detailed_countries
  );
end;
$$;

--
-- Name: compute_country_context(jsonb, text, text, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.compute_country_context(p_statistics jsonb, p_scholarship_track text, p_ranking_country text, p_metric_value numeric) RETURNS jsonb
    LANGUAGE plpgsql STABLE
    SET search_path TO 'pg_catalog'
    AS $$
declare
  v_country_count bigint;
  v_same_track bigint;
  v_country_median numeric;
  v_global_median numeric;
  v_share numeric;
  v_delta numeric;
  v_stable boolean;
  v_nearby integer;
begin
  select count(*) into v_country_count
  from public.responses
  where not is_suspicious
    and scholarship_track = p_scholarship_track
    and ranking_country = p_ranking_country;

  v_same_track := (p_statistics->>'sameTrackCount')::bigint;
  v_global_median := (p_statistics->>'trackWideMedian')::numeric;

  if (p_statistics->>'sameCountryCount') is not null then
    v_country_median := (p_statistics->>'medianScore')::numeric;
  else
    v_country_median := null;
  end if;

  if v_same_track >= 10 and v_country_count > 0 then
    v_share := round(v_country_count::numeric / v_same_track, 4);
  else
    v_share := null;
  end if;

  if v_country_median is not null and v_global_median is not null then
    v_delta := round(v_country_median - v_global_median, 2);
  else
    v_delta := null;
  end if;

  if v_country_count >= 10 then
    v_stable := v_country_count >= 20;
    if jsonb_typeof(p_statistics->'cohortScores') = 'array' then
      select count(*)::int into v_nearby
      from jsonb_array_elements(p_statistics->'cohortScores') elem
      where abs((elem #>> '{}')::numeric - p_metric_value) <= 1;
    else
      v_nearby := null;
    end if;
  else
    v_stable := null;
    v_nearby := null;
  end if;

  return jsonb_build_object(
    'countryMedian', v_country_median,
    'countrySampleSize', v_country_count,
    'countryShareOfTrack', v_share,
    'medianDeltaVsGlobal', v_delta,
    'distributionStable', v_stable,
    'nearbyScoreCount', v_nearby
  );
end;
$$;

--
-- Name: compute_statistics_growth7d(text, text, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.compute_statistics_growth7d(p_scholarship_track text, p_ranking_country text, p_metric_value numeric) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog'
    AS $$
declare
  v_group text;
  v_as_of timestamptz := now() - interval '7 days';
  v_current jsonb;
  v_then jsonb;
  v_track_now jsonb;
  v_track_then jsonb;
  v_new_total bigint;
  v_new_in_group bigint;
  v_new_in_track bigint;
  v_status_updates bigint;
begin
  v_current := public.compute_country_statistics(p_scholarship_track, p_ranking_country, p_metric_value);
  v_then := public.compute_country_statistics(p_scholarship_track, p_ranking_country, p_metric_value, v_as_of);
  v_track_now := public.compute_track_benchmark(p_scholarship_track, p_metric_value);
  v_track_then := public.compute_track_benchmark(p_scholarship_track, p_metric_value, v_as_of);

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

  select count(*) into v_new_in_track
  from public.responses
  where not is_suspicious
    and created_at > v_as_of
    and scholarship_track = p_scholarship_track;

  if v_group is null then
    v_new_in_group := 0;
    v_status_updates := 0;
  else
    select count(*) into v_new_in_group
    from public.responses
    where not is_suspicious
      and created_at > v_as_of
      and scholarship_track = p_scholarship_track
      and (v_group = 'track' or ranking_country = p_ranking_country);

    select count(*) into v_status_updates
    from public.responses
    where not is_suspicious
      and scholarship_track = p_scholarship_track
      and ranking_country = p_ranking_country
      and status_changed_at >= (timezone('utc', now()) - interval '7 days')::date;
  end if;

  return jsonb_build_object(
    'newResponsesTotal', v_new_total,
    'newResponsesInGroup', v_new_in_group,
    'medianThen', v_then->'medianScore',
    'medianNow', v_current->'medianScore',
    'percentileThen', v_then->'lowerScorePercentage',
    'percentileNow', v_current->'lowerScorePercentage',
    'trackNewResponses', v_new_in_track,
    'trackMedianThen', v_track_then->'median',
    'trackMedianNow', v_track_now->'median',
    'statusUpdatesInGroup', v_status_updates
  );
end;
$$;

--
-- Name: create_response_for_telegram_user(bigint, text, boolean, text, text, text, text, text, numeric, numeric, text, text, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_response_for_telegram_user(p_telegram_user_id bigint, p_telegram_username text, p_has_polish_citizenship boolean, p_ranking_country text, p_school_country text, p_scholarship_track text, p_study_route text, p_target_university text, p_average_grade numeric, p_maximum_grade numeric, p_polish_school_level text, p_current_status text, p_status_changed_at date) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
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

--
-- Name: enrich_statistics_result(bigint, jsonb, text, text, numeric, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enrich_statistics_result(p_telegram_user_id bigint, p_statistics jsonb, p_scholarship_track text, p_ranking_country text, p_metric_value numeric, p_include_growth boolean DEFAULT false) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
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
      'history', '[]'::jsonb,
      'groupProgress',
      case
        when (p_statistics->>'sameCountryCount')::int >= 10 then public.compute_group_progress(
          p_scholarship_track,
          p_ranking_country
        )
        else null
      end,
      'reportedMeritOutcomes',
      case
        when (p_statistics->>'sameCountryCount')::int >= 10 then public.compute_reported_merit_outcomes(
          p_scholarship_track,
          p_ranking_country
        )
        else null
      end,
      'globalBenchmark',
      public.compute_track_benchmark(p_scholarship_track, p_metric_value),
      'countryContext',
      public.compute_country_context(
        p_statistics,
        p_scholarship_track,
        p_ranking_country,
        p_metric_value
      )
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

--
-- Name: get_current_response(bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_current_response(p_telegram_user_id bigint) RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
  select jsonb_strip_nulls(jsonb_build_object(
    'hasPolishCitizenship', r.has_polish_citizenship,
    'rankingCountry', r.ranking_country,
    'schoolCountry', r.school_country,
    'scholarshipTrack', r.scholarship_track,
    'studyRoute', r.study_route,
    'targetUniversity', r.target_university,
    'averageGrade', r.average_grade,
    'maximumGrade', r.maximum_grade,
    'polishSchoolLevel', r.polish_school_level,
    'currentStatus', r.current_status,
    'statusChangedAt', r.status_changed_at
  ))
  from public.responses r
  where r.telegram_user_id = p_telegram_user_id;
$$;

--
-- Name: get_current_statistics(bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_current_statistics(p_telegram_user_id bigint) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
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

--
-- Name: get_public_statistics(text, text, numeric, numeric, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_public_statistics(p_scholarship_track text, p_ranking_country text, p_average_grade numeric, p_maximum_grade numeric, p_polish_school_level text, p_ip_hash text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
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

--
-- Name: get_response_statistics(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_response_statistics(p_response_id uuid) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog'
    AS $$
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

--
-- Name: get_user_statistics_history(bigint, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_statistics_history(p_telegram_user_id bigint, p_limit integer DEFAULT 14) RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
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

--
-- Name: is_allowed_status_transition(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_allowed_status_transition(p_from text, p_to text) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    SET search_path TO 'pg_catalog'
    AS $$
  select case
    when p_from = p_to then true
    when p_from = 'submitted' and p_to = 'formal_review_positive' then true
    when p_from = 'formal_review_positive' and p_to in ('merit_review_positive', 'merit_review_negative') then true
    when p_from = 'merit_review_positive' and p_to = 'scholarship_awarded' then true
    else false
  end;
$$;

--
-- Name: update_current_response(bigint, text, boolean, text, text, text, text, text, numeric, numeric, text, text, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_current_response(p_telegram_user_id bigint, p_telegram_username text, p_has_polish_citizenship boolean, p_ranking_country text, p_school_country text, p_scholarship_track text, p_study_route text, p_target_university text, p_average_grade numeric, p_maximum_grade numeric, p_polish_school_level text, p_current_status text, p_status_changed_at date) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
declare
  v_response public.responses%rowtype;
  v_response_id uuid;
  v_suspicious_transition boolean;
  v_nawa_score numeric;
  v_terminal_statuses text[] := array['merit_review_negative', 'scholarship_awarded'];
  v_statistics jsonb;
begin
  if p_maximum_grade <= 0 or p_average_grade < 0 or p_average_grade > p_maximum_grade then
    raise exception using errcode = 'P0001', message = 'invalid_response';
  end if;

  if p_scholarship_track <> 'nawa_director' then
    raise exception using errcode = 'P0001', message = 'track_not_available';
  end if;

  select r.* into v_response
  from public.responses r
  where r.telegram_user_id = p_telegram_user_id
  for update;

  if not found then
    return null;
  end if;

  v_response_id := v_response.id;

  if v_response.current_status <> p_current_status then
    if v_response.current_status = any(v_terminal_statuses) then
      insert into public.status_change_requests (
        telegram_user_id, from_status, to_status, reason
      ) values (
        p_telegram_user_id, v_response.current_status, p_current_status, 'terminal_status_edit'
      );
      raise exception using errcode = 'P0001', message = 'status_change_pending_review';
    elsif not public.is_allowed_status_transition(v_response.current_status, p_current_status) then
      raise exception using errcode = 'P0001', message = 'invalid_status_transition';
    end if;
  end if;

  v_suspicious_transition := v_response.current_status <> p_current_status and (
    (v_response.current_status = any(v_terminal_statuses) and p_current_status <> any(v_terminal_statuses))
    or not public.is_allowed_status_transition(v_response.current_status, p_current_status)
    or p_status_changed_at < v_response.status_changed_at
  );

  v_nawa_score := round(
    p_average_grade / p_maximum_grade * 90
      + case p_polish_school_level when 'primary' then 5 when 'secondary' then 10 else 0 end,
    2
  );

  update public.responses
  set telegram_username = p_telegram_username,
      has_polish_citizenship = p_has_polish_citizenship,
      ranking_country = p_ranking_country,
      school_country = p_school_country,
      scholarship_track = p_scholarship_track,
      study_route = p_study_route,
      target_university = p_target_university,
      average_grade = p_average_grade,
      maximum_grade = p_maximum_grade,
      grade_percentage = p_average_grade / p_maximum_grade * 100,
      polish_school_level = p_polish_school_level,
      nawa_orientation_score = v_nawa_score,
      current_status = p_current_status,
      status_changed_at = p_status_changed_at,
      is_suspicious = v_response.is_suspicious or v_suspicious_transition
  where id = v_response.id;

  if v_response.current_status <> p_current_status then
    insert into public.response_audit_log (telegram_user_id, response_id, event_type, payload)
    values (
      p_telegram_user_id,
      v_response.id,
      'status_changed',
      jsonb_build_object('from', v_response.current_status, 'to', p_current_status)
    );
  end if;

  v_statistics := public.assert_statistics_result(public.get_response_statistics(v_response_id));

  return jsonb_build_object('updated', true, 'statistics', v_statistics);
end;
$$;

--
-- Name: upsert_user_statistics_snapshot(bigint, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.upsert_user_statistics_snapshot(p_telegram_user_id bigint, p_statistics jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
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

--
-- Name: product_events; Type: TABLE; Schema: public; Owner: -
--

revoke all on table public.responses, public.submission_limits, public.user_statistics_snapshots, public.status_change_requests, public.response_audit_log, public.product_events from public, anon, authenticated;
revoke all on all sequences in schema public from public, anon, authenticated;

revoke all on function public.compute_statistics_growth7d(text, text, numeric) from public, anon, authenticated, service_role;
revoke all on function public.compute_track_benchmark(text, numeric, timestamptz) from public, anon, authenticated, service_role;
revoke all on function public.compute_country_context(jsonb, text, text, numeric) from public, anon, authenticated, service_role;
revoke all on function public.upsert_user_statistics_snapshot(bigint, jsonb) from public, anon, authenticated, service_role;
revoke all on function public.get_user_statistics_history(bigint, integer) from public, anon, authenticated, service_role;
revoke all on function public.enrich_statistics_result(bigint, jsonb, text, text, numeric, boolean) from public, anon, authenticated, service_role;
revoke all on function public.compute_country_statistics(text, text, numeric, timestamptz) from public, anon, authenticated, service_role;
revoke all on function public.get_response_statistics(uuid) from public, anon, authenticated, service_role;
revoke all on function public.assert_statistics_result(jsonb) from public, anon, authenticated, service_role;
revoke all on function public.compute_group_progress(text, text) from public, anon, authenticated, service_role;
revoke all on function public.compute_reported_merit_outcomes(text, text) from public, anon, authenticated, service_role;
revoke all on function public.is_allowed_status_transition(text, text) from public, anon, authenticated, service_role;

revoke all on function public.create_response_for_telegram_user(bigint, text, boolean, text, text, text, text, text, numeric, numeric, text, text, date) from public, anon, authenticated;
revoke all on function public.get_current_response(bigint) from public, anon, authenticated;
revoke all on function public.update_current_response(bigint, text, boolean, text, text, text, text, text, numeric, numeric, text, text, date) from public, anon, authenticated;
revoke all on function public.get_current_statistics(bigint) from public, anon, authenticated;
revoke all on function public.get_public_statistics(text, text, numeric, numeric, text, text) from public, anon, authenticated;

grant select, insert, update, delete on table public.responses, public.submission_limits to service_role;
grant select, insert on table public.product_events, public.status_change_requests, public.response_audit_log to service_role;

grant execute on function public.create_response_for_telegram_user(bigint, text, boolean, text, text, text, text, text, numeric, numeric, text, text, date) to service_role;
grant execute on function public.get_current_response(bigint) to service_role;
grant execute on function public.update_current_response(bigint, text, boolean, text, text, text, text, text, numeric, numeric, text, text, date) to service_role;
grant execute on function public.get_current_statistics(bigint) to service_role;
grant execute on function public.get_public_statistics(text, text, numeric, numeric, text, text) to service_role;
