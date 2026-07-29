-- Extend statistics RPCs and update_current_response for MVP model.

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
      end
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

create or replace function public.update_current_response(
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
