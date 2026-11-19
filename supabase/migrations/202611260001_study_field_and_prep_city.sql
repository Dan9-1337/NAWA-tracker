--
-- Study field and preparatory-course city (docs/adr/0007).
--
-- * study_field: ISCED-F detailed code (four digits) or 'other', asked in the application (the API requires it;
--   the column default 'other' only covers rows inserted directly, e.g. seed data and tests).
-- * prep_course_city: the city NAWA assigned the preparatory course to; only for preparatory-course applicants whose
--   outcome is 'scholarship_awarded'. It is cleared automatically when the outcome changes.
-- * get_prep_city_distribution: where reporters in the caller's field were sent, with the fallback ladder
--   detailed -> narrow -> broad -> all and the usual disclosure floor (outcome_min_awarded()). A city below the floor is
--   merged into "otherCount"; the country of citizenship is deliberately not part of this view.
--

alter table public.responses
  add column study_field text not null default 'other',
  add column prep_course_city text;

alter table public.responses
  add constraint responses_study_field_check check (study_field ~ '^([0-9]{4}|other)$'),
  add constraint responses_prep_course_city_check check (prep_course_city is null or length(prep_course_city) between 1 and 64),
  add constraint responses_prep_course_city_outcome_check check (
    prep_course_city is null
    or (study_route = 'preparatory_course' and current_status = 'scholarship_awarded')
  );

drop function public.create_response_for_identity(text, integer, boolean, text, text, text, text, text, text, text, numeric, numeric, text, text, date);
drop function public.update_current_response(text, integer, boolean, text, text, text, text, text, text, text, numeric, numeric, text, text, date);
drop function public.get_current_response(text, integer);

create function public.create_response_for_identity(
  p_identity_hash text,
  p_intake_year integer,
  p_has_polish_citizenship boolean,
  p_ranking_country text,
  p_school_country text,
  p_scholarship_track text,
  p_study_route text,
  p_target_university text,
  p_study_field text,
  p_prep_course_city text,
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
      study_field,
      prep_course_city,
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
      p_study_field,
      case
        when p_study_route = 'preparatory_course' and p_current_status = 'scholarship_awarded' then p_prep_course_city
      end,
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
  p_study_field text,
  p_prep_course_city text,
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
      study_field = p_study_field,
      prep_course_city = case
        when p_study_route = 'preparatory_course' and p_current_status = 'scholarship_awarded' then p_prep_course_city
      end,
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
    'studyField', r.study_field,
    'prepCourseCity', r.prep_course_city,
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

create function public.get_prep_city_distribution(p_identity_hash text, p_intake_year integer) returns jsonb
    language plpgsql stable security definer
    set search_path to 'pg_catalog'
    as $$
declare
  c_min constant integer := public.outcome_min_awarded();
  v_field text;
  v_route text;
  v_track text;
  v_tier text;
  v_total integer := 0;
  v_level text;
  v_group text;
  v_cities jsonb;
  v_other integer;
begin
  select r.study_field, r.study_route, r.scholarship_track
  into v_field, v_route, v_track
  from public.responses r
  where r.identity_hash = p_identity_hash
    and r.intake_year = p_intake_year;

  if v_field is null then
    return null;
  end if;

  -- Walk detailed -> narrow -> broad -> all and stop at the first level with enough reports.
  foreach v_tier in array array['detailed', 'narrow', 'broad', 'all']
  loop
    if v_tier <> 'all' and v_field !~ '^[0-9]{4}$' then
      continue;
    end if;

    select count(*) into v_total
    from public.responses r
    where not r.is_suspicious
      and r.intake_year = p_intake_year
      and r.scholarship_track = v_track
      and r.study_route = 'preparatory_course'
      and r.current_status = 'scholarship_awarded'
      and r.prep_course_city is not null
      and (
        v_tier = 'all'
        or (v_tier = 'detailed' and r.study_field = v_field)
        or (v_tier = 'narrow' and r.study_field ~ '^[0-9]{4}$' and left(r.study_field, 3) = left(v_field, 3))
        or (v_tier = 'broad' and r.study_field ~ '^[0-9]{4}$' and left(r.study_field, 2) = left(v_field, 2))
      );

    if v_total >= c_min then
      v_level := v_tier;
      v_group := case v_tier
        when 'detailed' then v_field
        when 'narrow' then left(v_field, 3)
        when 'broad' then left(v_field, 2)
        else null
      end;
      exit;
    end if;
  end loop;

  if v_level is null then
    return jsonb_build_object(
      'studyField', v_field, 'level', null, 'groupCode', null, 'total', 0, 'cities', '[]'::jsonb, 'otherCount', 0
    );
  end if;

  with picked as (
    select r.prep_course_city as city
    from public.responses r
    where not r.is_suspicious
      and r.intake_year = p_intake_year
      and r.scholarship_track = v_track
      and r.study_route = 'preparatory_course'
      and r.current_status = 'scholarship_awarded'
      and r.prep_course_city is not null
      and (
        v_level = 'all'
        or (v_level = 'detailed' and r.study_field = v_field)
        or (v_level = 'narrow' and r.study_field ~ '^[0-9]{4}$' and left(r.study_field, 3) = left(v_field, 3))
        or (v_level = 'broad' and r.study_field ~ '^[0-9]{4}$' and left(r.study_field, 2) = left(v_field, 2))
      )
  ),
  per_city as (
    select city, count(*)::integer as n from picked group by city
  )
  select
    coalesce(
      jsonb_agg(jsonb_build_object('city', city, 'count', n) order by n desc, city) filter (where n >= c_min and city <> 'other'),
      '[]'::jsonb
    ),
    coalesce(sum(n) filter (where n < c_min or city = 'other'), 0)::integer
  into v_cities, v_other
  from per_city;

  return jsonb_build_object(
    'studyField', v_field,
    'level', v_level,
    'groupCode', v_group,
    'total', v_total,
    'cities', v_cities,
    'otherCount', v_other
  );
end;
$$;

revoke all on function public.create_response_for_identity(text, integer, boolean, text, text, text, text, text, text, text, text, text, numeric, numeric, text, text, date) from public, anon, authenticated;
revoke all on function public.update_current_response(text, integer, boolean, text, text, text, text, text, text, text, text, text, numeric, numeric, text, text, date) from public, anon, authenticated;
revoke all on function public.get_current_response(text, integer) from public, anon, authenticated;
revoke all on function public.get_prep_city_distribution(text, integer) from public, anon, authenticated;

grant execute on function public.create_response_for_identity(text, integer, boolean, text, text, text, text, text, text, text, text, text, numeric, numeric, text, text, date) to service_role;
grant execute on function public.update_current_response(text, integer, boolean, text, text, text, text, text, text, text, text, text, numeric, numeric, text, text, date) to service_role;
grant execute on function public.get_current_response(text, integer) to service_role;
grant execute on function public.get_prep_city_distribution(text, integer) to service_role;
