--
-- Privacy: pseudonymous identity, no usernames.
--
-- * responses and product_events are keyed by identity_hash = HMAC-SHA256(IDENTITY_PEPPER, telegram id),
--   computed by the API. The database never sees the Telegram id, so a database export alone cannot be
--   resolved to Telegram accounts. (The service operator holding the pepper can still recompute hashes;
--   the product says "pseudonymous", not "anonymous".)
-- * telegram_username is no longer stored.
-- * product_events carry only a small structured payload (no free text such as search queries).
--
-- Rows created before this migration get a placeholder hash derived from the raw id (development data only;
-- they stop matching real accounts once the API hashes with the pepper).
--

alter table public.responses add column identity_hash text;
update public.responses set identity_hash = lpad(to_hex(telegram_user_id), 64, '0');
alter table public.responses
  alter column identity_hash set not null,
  add constraint responses_identity_hash_check check (identity_hash ~ '^[0-9a-f]{64}$');

alter table public.responses drop constraint responses_telegram_user_id_intake_year_key;
alter table public.responses drop column telegram_user_id;
alter table public.responses drop column telegram_username;
alter table public.responses
  add constraint responses_identity_hash_intake_year_key unique (identity_hash, intake_year);

alter table public.product_events add column identity_hash text;
update public.product_events set identity_hash = lpad(to_hex(telegram_user_id), 64, '0');
alter table public.product_events
  alter column identity_hash set not null,
  add constraint product_events_identity_hash_check check (identity_hash ~ '^[0-9a-f]{64}$'),
  add constraint product_events_payload_check
    check (jsonb_typeof(payload) = 'object' and length(payload::text) <= 256);
drop index public.product_events_telegram_user_id_idx;
alter table public.product_events drop column telegram_user_id;
create index product_events_identity_hash_idx on public.product_events using btree (identity_hash, created_at desc);

drop function public.create_response_for_telegram_user(bigint, text, integer, boolean, text, text, text, text, text, text, text, numeric, numeric, text, text, date);
drop function public.update_current_response(bigint, text, integer, boolean, text, text, text, text, text, text, text, numeric, numeric, text, text, date);
drop function public.get_current_response(bigint, integer);
drop function public.get_current_statistics(bigint, integer);
drop function public.get_cohort_outcomes(bigint, integer);

create function public.create_response_for_identity(
  p_identity_hash text,
  p_intake_year integer,
  p_has_polish_citizenship boolean,
  p_ranking_country text,
  p_school_country text,
  p_scholarship_track text,
  p_study_route text,
  p_target_university text,
  p_grade_basis text,
  p_applicant_kind text,
  p_average_grade numeric,
  p_maximum_grade numeric,
  p_polish_school_level text,
  p_current_status text,
  p_status_changed_at date
) returns jsonb
    language plpgsql security definer
    set search_path to 'pg_catalog'
    as $$
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
    where identity_hash = p_identity_hash
      and intake_year = p_intake_year
  ) then
    raise exception using errcode = 'P0001', message = 'profile_exists';
  end if;

  v_nawa_score := public.compute_orientation_score(
    p_average_grade, p_maximum_grade, p_ranking_country, p_polish_school_level, p_applicant_kind
  );

  begin
    insert into public.responses (
      identity_hash,
      intake_year,
      has_polish_citizenship,
      ranking_country,
      school_country,
      scholarship_track,
      study_route,
      target_university,
      grade_basis,
      applicant_kind,
      average_grade,
      maximum_grade,
      grade_percentage,
      polish_school_level,
      nawa_orientation_score,
      current_status,
      status_changed_at
    ) values (
      p_identity_hash,
      p_intake_year,
      p_has_polish_citizenship,
      p_ranking_country,
      p_school_country,
      p_scholarship_track,
      p_study_route,
      p_target_university,
      p_grade_basis,
      p_applicant_kind,
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

create function public.update_current_response(
  p_identity_hash text,
  p_intake_year integer,
  p_has_polish_citizenship boolean,
  p_ranking_country text,
  p_school_country text,
  p_scholarship_track text,
  p_study_route text,
  p_target_university text,
  p_grade_basis text,
  p_applicant_kind text,
  p_average_grade numeric,
  p_maximum_grade numeric,
  p_polish_school_level text,
  p_current_status text,
  p_status_changed_at date
) returns jsonb
    language plpgsql security definer
    set search_path to 'pg_catalog'
    as $$
declare
  v_response public.responses%rowtype;
  v_suspicious_transition boolean;
  v_nawa_score numeric;
  v_terminal_statuses text[] := array['merit_review_negative', 'scholarship_awarded', 'scholarship_not_awarded'];
  v_statistics jsonb;
begin
  if p_maximum_grade <= 0 or p_average_grade < 0 or p_average_grade > p_maximum_grade then
    raise exception using errcode = 'P0001', message = 'invalid_response';
  end if;

  if p_scholarship_track <> 'nawa_director' then
    raise exception using errcode = 'P0001', message = 'track_not_available';
  end if;

  select r.*
  into v_response
  from public.responses r
  where r.identity_hash = p_identity_hash
    and r.intake_year = p_intake_year
  for update;

  if not found then
    return null;
  end if;

  if v_response.current_status <> p_current_status
     and not public.is_allowed_status_transition(v_response.current_status, p_current_status)
     -- correcting one final outcome to another (a mis-tap) is allowed
     and not (
       v_response.current_status = any(v_terminal_statuses)
       and p_current_status = any(v_terminal_statuses)
     ) then
    raise exception using errcode = 'P0001', message = 'invalid_status_transition';
  end if;

  v_suspicious_transition := v_response.current_status <> p_current_status
    and p_status_changed_at < v_response.status_changed_at;

  v_nawa_score := public.compute_orientation_score(
    p_average_grade, p_maximum_grade, p_ranking_country, p_polish_school_level, p_applicant_kind
  );

  update public.responses
  set has_polish_citizenship = p_has_polish_citizenship,
      ranking_country = p_ranking_country,
      school_country = p_school_country,
      scholarship_track = p_scholarship_track,
      study_route = p_study_route,
      target_university = p_target_university,
      grade_basis = p_grade_basis,
      applicant_kind = p_applicant_kind,
      average_grade = p_average_grade,
      maximum_grade = p_maximum_grade,
      grade_percentage = p_average_grade / p_maximum_grade * 100,
      polish_school_level = p_polish_school_level,
      nawa_orientation_score = v_nawa_score,
      current_status = p_current_status,
      status_changed_at = p_status_changed_at,
      is_suspicious = v_response.is_suspicious or v_suspicious_transition
  where id = v_response.id;

  v_statistics := public.assert_statistics_result(public.get_response_statistics(v_response.id));

  return jsonb_build_object('updated', true, 'statistics', v_statistics);
end;
$$;

create function public.get_current_response(p_identity_hash text, p_intake_year integer) returns jsonb
    language sql stable security definer
    set search_path to 'pg_catalog'
    as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'intakeYear', r.intake_year,
    'hasPolishCitizenship', r.has_polish_citizenship,
    'rankingCountry', r.ranking_country,
    'schoolCountry', r.school_country,
    'scholarshipTrack', r.scholarship_track,
    'studyRoute', r.study_route,
    'targetUniversity', r.target_university,
    'gradeBasis', r.grade_basis,
    'applicantKind', r.applicant_kind,
    'averageGrade', r.average_grade,
    'maximumGrade', r.maximum_grade,
    'polishSchoolLevel', r.polish_school_level,
    'currentStatus', r.current_status,
    'statusChangedAt', r.status_changed_at
  ))
  from public.responses r
  where r.identity_hash = p_identity_hash
    and r.intake_year = p_intake_year;
$$;

create function public.get_current_statistics(p_identity_hash text, p_intake_year integer) returns jsonb
    language plpgsql security definer
    set search_path to 'pg_catalog'
    as $$
declare
  v_response_id uuid;
begin
  select r.id into v_response_id
  from public.responses r
  where r.identity_hash = p_identity_hash
    and r.intake_year = p_intake_year;

  if v_response_id is null then
    return null;
  end if;

  return public.get_response_statistics(v_response_id);
end;
$$;

create function public.get_cohort_outcomes(p_identity_hash text, p_intake_year integer) returns jsonb
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

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

revoke all on function public.create_response_for_identity(text, integer, boolean, text, text, text, text, text, text, text, numeric, numeric, text, text, date) from public, anon, authenticated;
revoke all on function public.update_current_response(text, integer, boolean, text, text, text, text, text, text, text, numeric, numeric, text, text, date) from public, anon, authenticated;
revoke all on function public.get_current_response(text, integer) from public, anon, authenticated;
revoke all on function public.get_current_statistics(text, integer) from public, anon, authenticated;
revoke all on function public.get_cohort_outcomes(text, integer) from public, anon, authenticated;

grant execute on function public.create_response_for_identity(text, integer, boolean, text, text, text, text, text, text, text, numeric, numeric, text, text, date) to service_role;
grant execute on function public.update_current_response(text, integer, boolean, text, text, text, text, text, text, text, numeric, numeric, text, text, date) to service_role;
grant execute on function public.get_current_response(text, integer) to service_role;
grant execute on function public.get_current_statistics(text, integer) to service_role;
grant execute on function public.get_cohort_outcomes(text, integer) to service_role;
