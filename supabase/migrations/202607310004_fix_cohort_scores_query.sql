-- Fix cohortScores query: group_responses CTE was out of scope for the follow-up SELECT.

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
