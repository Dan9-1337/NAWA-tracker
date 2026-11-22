begin;

create extension if not exists pgtap with schema extensions;

create function pg_temp.h(bigint) returns text language sql immutable as $$ select lpad(to_hex($1), 64, '0') $$;

-- Each scenario starts from empty tables: one report per survey and the summary over the whole intake make leftovers
-- unreadable.
create function pg_temp.reset_data() returns void language plpgsql as $$
begin
  truncate table public.responses, public.scholarship_reports, public.score_change_log restart identity cascade;
end;
$$;

-- A real survey through the API RPC, so the score and the response key are exactly production ones.
create function pg_temp.create_survey(
  p_id bigint,
  p_country text,
  p_average numeric default 4,
  p_maximum numeric default 5
) returns void language sql as $$
  select public.create_response_for_identity(
    pg_temp.h(p_id), 2026,
    false, p_country, p_country,
    'nawa_director', 'direct_studies', 'science-096',
    '0613', null,
    'final_certificate', 'school_leaver',
    p_average, p_maximum, 'none',
    'submitted', current_date
  );
$$;

create function pg_temp.update_survey(p_id bigint, p_average numeric, p_maximum numeric) returns jsonb
language sql as $$
  select public.update_current_response(
    pg_temp.h(p_id), 2026,
    false, 'UA', 'UA',
    'nawa_director', 'direct_studies', 'science-096',
    '0613', null,
    'final_certificate', 'school_leaver',
    p_average, p_maximum, 'none',
    'submitted', current_date
  );
$$;

create function pg_temp.create_report(
  p_id bigint,
  p_route text default 'direct_studies',
  p_centre text default null,
  p_programme text default 'informatyka',
  p_isced text default '0613',
  p_custom text default null,
  p_university text default 'science-096'
) returns jsonb language sql as $$
  select public.create_scholarship_report(
    pg_temp.h(p_id), 2026, p_route, p_centre, p_programme, p_isced, p_custom, p_university
  );
$$;

create function pg_temp.update_report(
  p_id bigint,
  p_route text default 'direct_studies',
  p_centre text default null,
  p_programme text default 'informatyka',
  p_isced text default '0613',
  p_custom text default null,
  p_university text default 'science-096'
) returns jsonb language sql as $$
  select public.update_scholarship_report(
    pg_temp.h(p_id), 2026, p_route, p_centre, p_programme, p_isced, p_custom, p_university
  );
$$;

-- Direct inserts bypass the RPC on purpose: they exercise the table's structural checks and seed counts.
create function pg_temp.seed_report(
  p_id bigint,
  p_route text,
  p_centre text,
  p_programme text,
  p_isced text,
  p_custom text,
  p_university text
) returns void language sql as $$
  insert into public.scholarship_reports (
    identity_hash, intake_year, score_snapshot, study_route, prep_centre_id,
    programme_id, programme_isced, custom_programme, university_id
  )
  select
    pg_temp.h(p_id), 2026, r.nawa_orientation_score, p_route, p_centre,
    p_programme, p_isced, p_custom, p_university
  from public.responses r
  where r.identity_hash = pg_temp.h(p_id)
    and r.intake_year = 2026;
$$;

create function pg_temp.summary(p_id bigint, p_country text default null) returns jsonb language sql as $$
  select public.get_scholarship_report_summary(pg_temp.h(p_id), 2026, p_country);
$$;

select plan(71);

-- ---------------------------------------------------------------------------
-- A19: a survey below 60 gets no report and the snapshot floor holds in SQL.
-- ---------------------------------------------------------------------------
select pg_temp.reset_data();
select pg_temp.create_survey(400000001, 'UA', 3.2, 5);

select ok(
  (select nawa_orientation_score from public.responses where identity_hash = pg_temp.h(400000001)) < 60,
  'A19: the 2026 survey scores below 60'
);
select throws_ok(
  $$select pg_temp.create_report(400000001)$$,
  'P0001',
  'score_below_threshold',
  'A19: creating a report below the merit threshold is refused'
);
select is(
  (select count(*)::integer from public.scholarship_reports),
  0,
  'A19: nothing is stored below the threshold'
);
select throws_ok(
  $$insert into public.scholarship_reports (
      identity_hash, intake_year, score_snapshot, study_route,
      programme_id, programme_isced, university_id
    ) values (pg_temp.h(400000001), 2026, 58, 'direct_studies', 'informatyka', '0613', 'science-096')$$,
  '23514',
  null,
  'A19: the score_snapshot check rejects a value below 60'
);

-- ---------------------------------------------------------------------------
-- A3, A5: both paths, the fixed snapshot, and every structural check.
-- ---------------------------------------------------------------------------
select pg_temp.reset_data();
select pg_temp.create_survey(401000001, 'UA');
select pg_temp.create_survey(401000002, 'UA');
select pg_temp.create_survey(401000003, 'UA');

select is(
  pg_temp.create_report(401000001, 'preparatory_course', 'umcs-lublin', 'prawo', '0421', null, 'science-078'),
  '{"studyRoute": "preparatory_course", "prepCentreId": "umcs-lublin", "programmeId": "prawo", "universityId": "science-078", "scoreSnapshot": 72}'::jsonb,
  'A3: a preparatory report keeps the centre, the catalogue programme and the survey snapshot'
);
select is(
  (pg_temp.create_report(401000002, 'direct_studies', null, 'informatyka', '0613') ->> 'prepCentreId') is null,
  true,
  'A3: a direct-studies report has no preparatory centre'
);
select is(
  (select score_snapshot from public.scholarship_reports where identity_hash = pg_temp.h(401000001)),
  72::numeric,
  'A18: the create stores the survey score as the snapshot'
);
select throws_ok(
  $$select pg_temp.create_report(401000003, 'direct_studies', 'umcs-lublin')$$,
  '23514',
  null,
  'A5: a centre on the direct path is rejected'
);
select throws_ok(
  $$select pg_temp.create_report(401000003, 'preparatory_course', null)$$,
  '23514',
  null,
  'A5: a preparatory report without a centre is rejected'
);
select throws_ok(
  $$select pg_temp.create_report(401000003, 'direct_studies', null, 'informatyka', '0613', 'Typed')$$,
  '23514',
  null,
  'A5: both a catalogue programme and typed text are rejected'
);
select throws_ok(
  $$select pg_temp.create_report(401000003, 'direct_studies', null, null, null, null)$$,
  '23514',
  null,
  'A5: neither a catalogue programme nor typed text is rejected'
);
select throws_ok(
  $$insert into public.scholarship_reports (
      identity_hash, intake_year, score_snapshot, study_route,
      programme_id, university_id
    ) values (pg_temp.h(401000003), 2026, 72, 'direct_studies', 'informatyka', 'science-096')$$,
  '23514',
  null,
  'A5: a catalogue programme without its ISCED code is rejected'
);
select throws_ok(
  $$insert into public.scholarship_reports (
      identity_hash, intake_year, score_snapshot, study_route,
      programme_isced, custom_programme, university_id
    ) values (pg_temp.h(401000003), 2026, 72, 'direct_studies', '0613', 'Typed', 'science-096')$$,
  '23514',
  null,
  'A5: an ISCED code without a catalogue programme is rejected'
);
select throws_ok(
  $$insert into public.scholarship_reports (
      identity_hash, intake_year, score_snapshot, study_route,
      programme_id, programme_isced, university_id
    ) values (pg_temp.h(401000003), 2026, 72, 'direct_studies', 'informatyka', 'abc', 'science-096')$$,
  '23514',
  null,
  'A5: the ISCED code must be four digits'
);
select throws_ok(
  $$insert into public.scholarship_reports (
      identity_hash, intake_year, score_snapshot, study_route,
      custom_programme, university_id
    ) values (pg_temp.h(401000003), 2026, 72, 'direct_studies', repeat('a', 81), 'science-096')$$,
  '23514',
  null,
  'A5: typed text longer than 80 characters is rejected'
);
select throws_ok(
  $$insert into public.scholarship_reports (
      identity_hash, intake_year, score_snapshot, study_route,
      custom_programme, university_id
    ) values (pg_temp.h(401000003), 2026, 72, 'direct_studies', E'one\ntwo', 'science-096')$$,
  '23514',
  null,
  'A5: typed text with a line break is rejected'
);
select throws_ok(
  $$insert into public.scholarship_reports (
      identity_hash, intake_year, score_snapshot, study_route,
      custom_programme, university_id
    ) values (pg_temp.h(401000003), 2026, 72, 'direct_studies', '', 'science-096')$$,
  '23514',
  null,
  'A5: empty typed text is rejected'
);
select throws_ok(
  $$select pg_temp.create_report(401000001)$$,
  'P0001',
  'report_exists',
  'A15 SQL: a second report for the same survey is refused'
);
select throws_ok(
  $$insert into public.scholarship_reports (
      identity_hash, intake_year, score_snapshot, study_route,
      programme_id, programme_isced, university_id
    ) values (pg_temp.h(401000001), 2026, 72, 'direct_studies', 'informatyka', '0613', 'science-096')$$,
  '23505',
  null,
  'A15 SQL: the one-report-per-survey key rejects a duplicate row'
);
select throws_ok(
  $$select pg_temp.create_report(499999998)$$,
  'P0001',
  'profile_not_found',
  'A15 SQL: creating without a 2026 Director survey is refused'
);
select throws_ok(
  $$insert into public.scholarship_reports (
      identity_hash, intake_year, score_snapshot, study_route,
      programme_id, programme_isced, university_id
    ) values (pg_temp.h(499999999), 2026, 72, 'direct_studies', 'informatyka', '0613', 'science-096')$$,
  '23503',
  null,
  'A14 SQL: a report cannot exist without its survey'
);

-- ---------------------------------------------------------------------------
-- A6: the own report and the summary are available only after answering.
-- ---------------------------------------------------------------------------
select pg_temp.reset_data();
select pg_temp.create_survey(402000001, 'UA');

select is(
  public.get_scholarship_report(pg_temp.h(402000001), 2026),
  null,
  'A6: plain GET answers null without a report'
);
select is(
  pg_temp.summary(402000001),
  null,
  'A6: the summary refuses a caller without a report'
);

select pg_temp.create_report(402000001);

select ok(
  public.get_scholarship_report(pg_temp.h(402000001), 2026) is not null,
  'A6: the own report is returned after answering'
);
select ok(
  pg_temp.summary(402000001) is not null,
  'A6: the summary opens after answering'
);

-- ---------------------------------------------------------------------------
-- A7, A8, A10, A11: totals, the country filter, field groups and suspicious surveys.
-- ---------------------------------------------------------------------------
select pg_temp.reset_data();
select pg_temp.create_survey(410000001, 'BY');
select pg_temp.create_survey(410000002, 'UA');
select pg_temp.create_survey(410000003, 'UA');
select pg_temp.create_survey(410000004, 'UA');

select pg_temp.seed_report(410000001, 'preparatory_course', 'umcs-lublin', 'prawo', '0421', null, 'science-078');
select pg_temp.seed_report(410000002, 'direct_studies', null, 'informatyka', '0613', null, 'science-096');
select pg_temp.seed_report(410000003, 'direct_studies', null, 'informatyka', '0613', null, 'science-096');
select pg_temp.seed_report(410000004, 'direct_studies', null, null, null, 'Moje studia', 'science-071');

select is((pg_temp.summary(410000001) ->> 'total')::integer, 4, 'A7: the total counts every counted report');
select is(
  pg_temp.summary(410000001) -> 'countries' -> 0 ->> 'country',
  'UA',
  'A7: the filter puts the country with the most reports first'
);
select is(
  (pg_temp.summary(410000001) -> 'countries' -> 0 ->> 'count')::integer,
  3,
  'A7: UA has three reports'
);
select is(
  pg_temp.summary(410000001) -> 'countries' -> 1 ->> 'country',
  'BY',
  'A7: BY follows with one report'
);
select is(
  (pg_temp.summary(410000001) -> 'countries' -> 1 ->> 'count')::integer,
  1,
  'A7: a cell of one report is shown, not hidden'
);
select is(
  (pg_temp.summary(410000001) -> 'paths' -> 0 ->> 'count')::integer,
  1,
  'A7: one preparatory-path report'
);
select is(
  (pg_temp.summary(410000001) -> 'paths' -> 1 ->> 'count')::integer,
  3,
  'A7: three direct-studies reports'
);
select is(
  pg_temp.summary(410000001) -> 'centres' -> 0 ->> 'centreId',
  'umcs-lublin',
  'A7: the only preparatory centre is listed'
);
select is(
  (pg_temp.summary(410000001) -> 'centres' -> 0 ->> 'count')::integer,
  1,
  'A7: the centre is shown from one report'
);
select is(
  (pg_temp.summary(410000001) -> 'typedProgrammeCount')::integer,
  1,
  'A9: typed kierunki are counted in one separate row'
);
select is(
  position('Moje studia' in pg_temp.summary(410000001)::text),
  0,
  'A9: typed text never appears in the summary'
);

select is((pg_temp.summary(410000001, 'BY') ->> 'total')::integer, 1, 'A8: the BY filter counts only BY reports');
select is(
  (pg_temp.summary(410000001, 'BY') -> 'centres' -> 0 ->> 'count')::integer,
  1,
  'A8: the BY filter keeps its own centre'
);
select is(
  pg_temp.summary(410000001, 'BY') -> 'fields' -> 0 ->> 'group',
  '04',
  'A10: a catalogue kierunek is grouped under its ISCED-F broad group'
);
select is(
  (pg_temp.summary(410000001, 'BY') -> 'fields' -> 0 -> 'programmes' -> 0 ->> 'count')::integer,
  1,
  'A10: the catalogue kierunek is listed with its count'
);
select is(
  (pg_temp.summary(410000001, 'BY') -> 'universities' -> 0 ->> 'universityId'),
  'science-078',
  'A8: the BY filter keeps only its own university'
);
select is(
  (pg_temp.summary(410000001, 'BY') -> 'typedProgrammeCount')::integer,
  0,
  'A8: the BY filter has no typed kierunki'
);
select is(
  (pg_temp.summary(410000001, 'BY') -> 'paths' -> 1 ->> 'count')::integer,
  0,
  'A8: the direct-studies path is still present with a zero count'
);
select is(
  (pg_temp.summary(410000001, 'BY') -> 'countries' -> 0 ->> 'country'),
  'UA',
  'A8: the filter list keeps every country so it can switch back'
);

update public.responses
set is_suspicious = true
where identity_hash = pg_temp.h(410000003) and intake_year = 2026;

select is(
  (pg_temp.summary(410000001) ->> 'total')::integer,
  3,
  'A11: a suspicious survey is excluded from the total'
);
select is(
  (pg_temp.summary(410000001) -> 'countries' -> 0 ->> 'count')::integer,
  2,
  'A11: a suspicious survey is excluded from its country count'
);
select is(
  (pg_temp.summary(410000001) -> 'fields' -> 0 ->> 'count')::integer,
  1,
  'A11: the field group loses the suspicious report'
);

-- ---------------------------------------------------------------------------
-- A9: eleven identical typed kierunki stay one aggregate row and never leak.
-- ---------------------------------------------------------------------------
select pg_temp.reset_data();
select pg_temp.create_survey(420000000 + g, 'UA') from generate_series(1, 11) as g;
select pg_temp.seed_report(420000000 + g, 'direct_studies', null, null, null, 'Tajne studia', 'science-096')
from generate_series(1, 11) as g;

select is((pg_temp.summary(420000001) ->> 'total')::integer, 11, 'A9: all eleven typed reports count');
select is(
  (pg_temp.summary(420000001) -> 'typedProgrammeCount')::integer,
  11,
  'A9: all eleven typed reports are one "typed by hand" row'
);
select is(
  jsonb_array_length(pg_temp.summary(420000001) -> 'fields'),
  0,
  'A9: typed kierunki create no catalogue field group'
);
select is(
  position('Tajne studia' in pg_temp.summary(420000001)::text),
  0,
  'A9: the typed text is not part of the summary payload'
);
select is(
  public.get_scholarship_report(pg_temp.h(420000001), 2026) ->> 'customProgramme',
  'Tajne studia',
  'A9: the author still sees their own typed text'
);
select is(
  public.get_scholarship_report(pg_temp.h(429999999), 2026),
  null,
  'A9: another account without a report sees no typed text'
);

-- ---------------------------------------------------------------------------
-- A12: an edit replaces the answers and the counts follow.
-- ---------------------------------------------------------------------------
select pg_temp.reset_data();
select pg_temp.create_survey(430000001, 'UA');
select pg_temp.create_report(430000001, 'direct_studies', null, 'informatyka', '0613');

select is(
  (pg_temp.summary(430000001) -> 'fields' -> 0 ->> 'group'),
  '06',
  'A12: the first answer is grouped under its field'
);

select is(
  pg_temp.update_report(430000001, 'preparatory_course', 'umcs-lublin', 'prawo', '0421', null, 'science-078')
    ->> 'programmeId',
  'prawo',
  'A12: PUT replaces the programme'
);
select is(
  (pg_temp.summary(430000001) -> 'paths' -> 0 ->> 'count')::integer,
  1,
  'A12: the path count follows the edit'
);
select is(
  (pg_temp.summary(430000001) -> 'paths' -> 1 ->> 'count')::integer,
  0,
  'A12: the old path count disappears'
);
select is(
  (pg_temp.summary(430000001) -> 'centres' -> 0 ->> 'centreId'),
  'umcs-lublin',
  'A12: the edited report adds its centre'
);
select is(
  (pg_temp.summary(430000001) -> 'fields' -> 0 ->> 'group'),
  '04',
  'A12: the field group follows the edited programme'
);

-- ---------------------------------------------------------------------------
-- A13: deleting the report keeps the survey and closes the results.
-- ---------------------------------------------------------------------------
select pg_temp.reset_data();
select pg_temp.create_survey(440000001, 'UA');
select pg_temp.create_report(440000001);

select is(
  public.delete_scholarship_report(pg_temp.h(440000001), 2026),
  '{"deleted": true}'::jsonb,
  'A13: deleting the report succeeds'
);
select is(
  (select count(*)::integer from public.scholarship_reports),
  0,
  'A13: the report is gone'
);
select is(
  (select count(*)::integer from public.responses where identity_hash = pg_temp.h(440000001)),
  1,
  'A13: the survey stays'
);
select is(
  pg_temp.summary(440000001),
  null,
  'A13: the summary is refused after deleting the report'
);
select throws_ok(
  $$select public.delete_scholarship_report(pg_temp.h(440000001), 2026)$$,
  'P0001',
  'report_not_found',
  'A15 SQL: deleting a missing report says so'
);

-- ---------------------------------------------------------------------------
-- A14: deleting the survey cascades to the report.
-- ---------------------------------------------------------------------------
select pg_temp.reset_data();
select pg_temp.create_survey(450000001, 'UA');
select pg_temp.create_report(450000001);

delete from public.responses
where identity_hash = pg_temp.h(450000001) and intake_year = 2026;

select is(
  (select count(*)::integer from public.scholarship_reports where identity_hash = pg_temp.h(450000001)),
  0,
  'A14: deleting the survey cascades to its report'
);

-- ---------------------------------------------------------------------------
-- A18: the snapshot is taken on report saves, not on survey edits.
-- ---------------------------------------------------------------------------
select pg_temp.reset_data();
select pg_temp.create_survey(460000001, 'UA');
select pg_temp.create_report(460000001);

select is(
  (select score_snapshot from public.scholarship_reports where identity_hash = pg_temp.h(460000001)),
  72::numeric,
  'A18: the report starts with the 72 snapshot'
);

select is(
  pg_temp.update_survey(460000001, 25, 30) is not null,
  true,
  'A18: the survey stays editable after the report exists'
);
select is(
  (select nawa_orientation_score from public.responses where identity_hash = pg_temp.h(460000001)),
  75::numeric,
  'A18: the survey now scores 75'
);
select is(
  (select score_snapshot from public.scholarship_reports where identity_hash = pg_temp.h(460000001)),
  72::numeric,
  'A18: editing the survey leaves the existing snapshot alone'
);

select is(
  pg_temp.update_report(460000001) -> 'scoreSnapshot',
  '75'::jsonb,
  'A18: saving the report again refreshes its snapshot'
);
select is(
  (select score_snapshot from public.scholarship_reports where identity_hash = pg_temp.h(460000001)),
  75::numeric,
  'A18: the stored snapshot follows the report save'
);

select * from finish();
rollback;
