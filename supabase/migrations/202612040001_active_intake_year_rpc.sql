--
-- The active intake year for the API (ADR 0018).
--
-- * get_active_intake_year() returns season_config.active_intake_year. The API calls it for every request that
--   needs the year (create and update checks, the current response, statistics), so a rollover is one
--   `update public.season_config set active_intake_year = <year>` and needs no code release.
-- * public.active_intake_year() stays internal: its execute privilege was revoked from every role in
--   202611210001. This wrapper is the only entry point and is granted to the service role alone.
--

create function public.get_active_intake_year() returns integer
    language sql stable security definer
    set search_path to 'pg_catalog'
    as $$
  select public.active_intake_year();
$$;

revoke all on function public.get_active_intake_year() from public, anon, authenticated;
grant execute on function public.get_active_intake_year() to service_role;
