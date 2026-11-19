begin;

create extension if not exists pgtap with schema extensions;

create function pg_temp.h(bigint) returns text language sql immutable as $$ select lpad(to_hex($1), 64, '0') $$;

truncate table public.responses restart identity cascade;

select plan(15);

-- Helper: n awarded preparatory-course reports in a field and city.
create function pg_temp.seed_reports(p_base bigint, p_field text, p_city text, p_n integer, p_route text default 'preparatory_course', p_status text default 'scholarship_awarded', p_suspicious boolean default false)
returns void language sql as $$
  insert into public.responses (
    identity_hash, intake_year, has_polish_citizenship, ranking_country, school_country,
    scholarship_track, study_route, study_field, prep_course_city, average_grade, maximum_grade, grade_percentage,
    polish_school_level, nawa_orientation_score, current_status, status_changed_at, is_suspicious
  )
  select pg_temp.h(p_base + v), 2026, false, 'UA', 'UA', 'nawa_director', p_route, p_field, p_city,
    80, 100, 80, 'none', 72, p_status, current_date, p_suspicious
  from generate_series(1, p_n) as v;
$$;

-- Storage and constraints.
select lives_ok(
  $$select public.create_response_for_identity(
      pg_temp.h(890000001), 2026, false, 'UA', 'UA', 'nawa_director', 'preparatory_course', 'science-096',
      '0613', null, 'final_certificate', 'school_leaver', 4.5, 5, 'secondary', 'submitted', current_date
    )$$,
  'a profile stores its study field'
);
select is(public.get_current_response(pg_temp.h(890000001), 2026)->>'studyField', '0613', 'the study field is returned');

select throws_ok(
  $$select public.create_response_for_identity(
      pg_temp.h(890000002), 2026, false, 'UA', 'UA', 'nawa_director', 'direct_studies', 'science-096',
      'computers', null, 'final_certificate', 'school_leaver', 4.5, 5, 'secondary', 'submitted', current_date
    )$$,
  '23514', null, 'a study field must be a four-digit code or "other"'
);

-- A city is kept only for awarded preparatory-course applicants and cleared when the outcome changes.
do $$
begin
  perform public.update_current_response(pg_temp.h(890000001), 2026, false, 'UA', 'UA', 'nawa_director', 'preparatory_course', 'science-096', '0613', 'Łódź', 'final_certificate', 'school_leaver', 4.5, 5, 'secondary', 'scholarship_awarded', current_date);
end;
$$;
select is(public.get_current_response(pg_temp.h(890000001), 2026)->>'prepCourseCity', 'Łódź', 'an awarded preparatory-course applicant keeps the assigned city');

do $$
begin
  perform public.update_current_response(pg_temp.h(890000001), 2026, false, 'UA', 'UA', 'nawa_director', 'preparatory_course', 'science-096', '0613', 'Łódź', 'final_certificate', 'school_leaver', 4.5, 5, 'secondary', 'scholarship_not_awarded', current_date);
end;
$$;
select is(public.get_current_response(pg_temp.h(890000001), 2026)->>'prepCourseCity', null, 'correcting the outcome clears the city');

select is(
  (select prep_course_city from public.responses where identity_hash = pg_temp.h(890000001) and intake_year = 2026), null,
  'the stored city is cleared too'
);

select throws_ok(
  $$insert into public.responses (identity_hash, intake_year, has_polish_citizenship, ranking_country, school_country,
      scholarship_track, study_route, prep_course_city, average_grade, maximum_grade, grade_percentage,
      polish_school_level, nawa_orientation_score, current_status, status_changed_at)
    values (pg_temp.h(890000003), 2026, false, 'UA', 'UA', 'nawa_director', 'direct_studies', 'Łódź',
      80, 100, 80, 'none', 72, 'scholarship_awarded', current_date)$$,
  '23514', null, 'a direct-studies applicant cannot have a prep-course city'
);

-- Distribution: caller is in field 0613 (own record, still waiting).
update public.responses set current_status = 'submitted', study_field = '0613' where identity_hash = pg_temp.h(890000001);

select is(
  public.get_prep_city_distribution(pg_temp.h(890000001), 2026)->>'level', null,
  'nothing is shown while fewer than three reports exist anywhere'
);

select pg_temp.seed_reports(891000000, '0613', 'Łódź', 4);
select pg_temp.seed_reports(891100000, '0613', 'Kraków', 2);
select is(
  public.get_prep_city_distribution(pg_temp.h(890000001), 2026)->>'level', 'detailed',
  'a field with three or more reports is shown at the detailed level'
);
select is(
  public.get_prep_city_distribution(pg_temp.h(890000001), 2026)->'cities', '[{"city": "Łódź", "count": 4}]'::jsonb,
  'only cities with at least three reports are named'
);
select is(
  (public.get_prep_city_distribution(pg_temp.h(890000001), 2026)->>'otherCount')::integer, 2,
  'smaller cities are merged into the other count'
);

-- Fallback: a caller in 0612 has no detailed reports, but the narrow group 061 has seven.
update public.responses set study_field = '0612' where identity_hash = pg_temp.h(890000001);
select pg_temp.seed_reports(892100000, '0611', 'Warszawa', 3);
select is(
  public.get_prep_city_distribution(pg_temp.h(890000001), 2026)->>'level', 'narrow',
  'a field without enough reports falls back to its narrow group'
);

-- Suspicious records, other routes and other years never count.
select pg_temp.seed_reports(893000000, '0541', 'Gdańsk', 5, 'preparatory_course', 'scholarship_awarded', true);
select pg_temp.seed_reports(893100000, '0541', null, 5, 'direct_studies', 'scholarship_awarded', false);
update public.responses set study_field = '0541' where identity_hash = pg_temp.h(890000001);
select is(
  public.get_prep_city_distribution(pg_temp.h(890000001), 2026)->>'level', 'all',
  'a field with no related reports falls back to all awarded preparatory-course reports'
);
select is(
  (public.get_prep_city_distribution(pg_temp.h(890000001), 2026)->>'total')::integer, 9,
  'suspicious records and direct-studies records are not counted (4 + 2 + 3 honest reports)'
);

select is(public.get_prep_city_distribution(pg_temp.h(899999999), 2026), null, 'unknown callers get nothing');

select * from finish();
rollback;
