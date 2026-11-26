--
-- Real response counter for the landing screen.
--
-- * get_intake_summary() returns { intakeYear, responseCount } for active_intake_year(): the count of valid
--   (not is_suspicious) responses of the active intake across all tracks. It is the same population as
--   totalValidResponses in get_current_statistics.
-- * responseCount is null below min_cohort_size(), so a tiny intake never reads as a live statistic.
-- * There is no weekly delta: the 2026 intake is closed, so a "this week" figure would almost always be zero.
--
-- The landing screen calls POST /api/intake-summary once when it mounts.
--

create function public.get_intake_summary() returns jsonb
    language sql stable security definer
    set search_path to 'pg_catalog'
    as $$
  with counted as (
    select count(*)::integer as valid_count
    from public.responses r
    where not r.is_suspicious
      and r.intake_year = public.active_intake_year()
  )
  select jsonb_build_object(
    'intakeYear', public.active_intake_year(),
    'responseCount', case
      when counted.valid_count >= public.min_cohort_size() then counted.valid_count
    end
  )
  from counted;
$$;

revoke all on function public.get_intake_summary() from public, anon, authenticated;
grant execute on function public.get_intake_summary() to service_role;
