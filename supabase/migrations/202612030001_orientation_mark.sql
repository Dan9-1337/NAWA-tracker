--
-- "Ориентир 2026": the lowest reported holder score per citizenship country (docs/adr/0017).
--
-- * For the caller's `ranking_country`, the mark is the lowest `score_snapshot` among the counted
--   scholarship reports of the 2026 intake on the `nawa_director` track whose survey is not `is_suspicious`,
--   and `n` is their number. There is no minimum: the mark is shown from the first counted report.
-- * Only a user with a 2026 Director survey sees it; every other intake year (and a missing survey) gets null,
--   so the API answers 404 PROFILE_NOT_FOUND.
-- * The payload carries only numbers: `mark`, `n` and — only when the caller also has the full distribution
--   (`p_include_scores`) — the ascending list of holder score snapshots for the dots over the distribution.
--   It never carries an identity, a survey id or any other report field.
-- * The survey's own score snapshot is read, never its current `nawa_orientation_score`: editing a survey does
--   not move the mark until its report is saved again ([ADR 0017]).
-- * Service-role only.
--

create function public.get_orientation_mark(
  p_identity_hash text,
  p_intake_year integer,
  p_include_scores boolean default false
) returns jsonb
    language plpgsql stable security definer
    set search_path to 'pg_catalog'
    as $$
declare
  c_mark_intake_year constant integer := 2026;
  v_ranking_country text;
  v_mark numeric;
  v_count integer;
  v_scores jsonb;
begin
  -- Only the 2026 intake has a mark; another intake year sees nothing of this feature.
  if p_intake_year <> c_mark_intake_year then
    return null;
  end if;

  -- Only a 2026 Director survey sees the mark (ADR 0017); a missing survey gets null.
  select r.ranking_country
  into v_ranking_country
  from public.responses r
  where r.identity_hash = p_identity_hash
    and r.intake_year = p_intake_year
    and r.scholarship_track = 'nawa_director';

  if not found then
    return null;
  end if;

  select
    min(sr.score_snapshot),
    count(*)::integer,
    case
      when p_include_scores then jsonb_agg(sr.score_snapshot order by sr.score_snapshot)
    end
  into v_mark, v_count, v_scores
  from public.scholarship_reports sr
  join public.responses r
    on r.identity_hash = sr.identity_hash
   and r.intake_year = sr.intake_year
  where sr.intake_year = p_intake_year
    and r.scholarship_track = 'nawa_director'
    and not r.is_suspicious
    and r.ranking_country = v_ranking_country;

  return jsonb_build_object(
    'mark', v_mark,
    'n', v_count,
    'scores', case when p_include_scores and v_count > 0 then v_scores else null end
  );
end;
$$;

revoke all on function public.get_orientation_mark(text, integer, boolean) from public, anon, authenticated;
grant execute on function public.get_orientation_mark(text, integer, boolean) to service_role;
