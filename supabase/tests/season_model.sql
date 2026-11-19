begin;

create extension if not exists pgtap with schema extensions;

create function pg_temp.h(bigint) returns text language sql immutable as $$ select lpad(to_hex($1), 64, '0') $$;


truncate table public.responses restart identity cascade;

select plan(16);

-- One record per user per intake year.
select lives_ok(
  $$select public.create_response_for_identity(
      pg_temp.h(840000001), 2026,
      false, 'UA', 'UA',
      'nawa_director', 'direct_studies', 'science-096',
      '0613', null,
      'final_certificate', 'school_leaver',
      4.5, 5, 'secondary',
      'submitted', current_date
    )$$,
  'a profile can be created for intake year 2026'
);

select lives_ok(
  $$select public.create_response_for_identity(
      pg_temp.h(840000001), 2027,
      false, 'UA', 'UA',
      'nawa_director', 'direct_studies', 'science-096',
      '0613', null,
      'half_year', 'school_leaver',
      4.0, 5, 'none',
      'submitted', current_date
    )$$,
  'the same user can create a second record for another intake year'
);

select throws_ok(
  $$select public.create_response_for_identity(
      pg_temp.h(840000001), 2026,
      false, 'UA', 'UA',
      'nawa_director', 'direct_studies', 'science-096',
      '0613', null,
      'final_certificate', 'school_leaver',
      4.5, 5, 'secondary',
      'submitted', current_date
    )$$,
  'P0001',
  'profile_exists',
  'a second record for the same intake year is rejected'
);

select is(
  public.get_current_response(pg_temp.h(840000001), 2027)->>'gradeBasis',
  'half_year',
  'get_current_response is scoped to the requested intake year and exposes grade basis'
);

select is(
  public.get_current_response(pg_temp.h(840000001), 2026)->>'intakeYear',
  '2026',
  'get_current_response exposes the intake year'
);

-- University is accepted on the preparatory route too (NAWA asks for it on both routes).
select lives_ok(
  $$select public.create_response_for_identity(
      pg_temp.h(840000002), 2026,
      false, 'LT', 'LT',
      'nawa_director', 'preparatory_course', 'science-096',
      '0613', null,
      'final_certificate', 'school_leaver',
      9, 10, 'none',
      'submitted', current_date
    )$$,
  'a preparatory-course profile may carry a target university'
);

-- Score: single SQL source of truth.
select is(public.compute_orientation_score(4.5, 5, 'UA', 'secondary', 'school_leaver'), 91.00::numeric, 'secondary Polish school adds 10 points');
select is(public.compute_orientation_score(4.5, 5, 'BY', 'secondary', 'school_leaver'), 81.00::numeric, 'Belarus citizens get no Polish-school bonus');
select is(public.compute_orientation_score(3.0, 5, 'UA', 'primary', 'school_leaver'), 59.00::numeric, 'primary Polish school adds 5 points');
select is(public.compute_orientation_score(4.75, 5, 'UA', 'none', 'student_in_poland'), 100::numeric, 'students in Poland are assigned 100 points');

-- Status ladder.
select lives_ok(
  $$select public.update_current_response(
      pg_temp.h(840000002), 2026,
      false, 'LT', 'LT',
      'nawa_director', 'preparatory_course', 'science-096',
      '0613', null,
      'final_certificate', 'school_leaver',
      9, 10, 'none',
      'scholarship_awarded', current_date
    )$$,
  'a late joiner can jump straight from submitted to the final outcome'
);

do $$
begin
  perform public.update_current_response(pg_temp.h(840000001), 2026, false, 'UA', 'UA', 'nawa_director', 'direct_studies', 'science-096', '0613', null, 'final_certificate', 'school_leaver', 4.5, 5, 'secondary', 'formal_review_positive', current_date);
  perform public.update_current_response(pg_temp.h(840000001), 2026, false, 'UA', 'UA', 'nawa_director', 'direct_studies', 'science-096', '0613', null, 'final_certificate', 'school_leaver', 4.5, 5, 'secondary', 'merit_review_positive', current_date);
end;
$$;

select lives_ok(
  $$select public.update_current_response(
      pg_temp.h(840000001), 2026,
      false, 'UA', 'UA',
      'nawa_director', 'direct_studies', 'science-096',
      '0613', null,
      'final_certificate', 'school_leaver',
      4.5, 5, 'secondary',
      'scholarship_not_awarded', current_date
    )$$,
  'merit-positive can end as not awarded'
);

select lives_ok(
  $$select public.update_current_response(
      pg_temp.h(840000001), 2026,
      false, 'UA', 'UA',
      'nawa_director', 'direct_studies', 'science-096',
      '0613', null,
      'final_certificate', 'school_leaver',
      4.5, 5, 'secondary',
      'scholarship_awarded', current_date
    )$$,
  'a final outcome can be corrected to another final outcome'
);

select throws_ok(
  $$select public.update_current_response(
      pg_temp.h(840000001), 2026,
      false, 'UA', 'UA',
      'nawa_director', 'direct_studies', 'science-096',
      '0613', null,
      'final_certificate', 'school_leaver',
      4.5, 5, 'secondary',
      'formal_review_positive', current_date
    )$$,
  'P0001',
  'invalid_status_transition',
  'a final outcome cannot be moved back to an earlier stage'
);

select is(
  (select is_suspicious from public.responses where identity_hash = pg_temp.h(840000001) and intake_year = 2026),
  false,
  'correcting a final outcome does not flag the record'
);

-- Removed tables.
select is(
  to_regclass('public.status_change_requests') is null
    and to_regclass('public.response_audit_log') is null
    and to_regclass('public.user_statistics_snapshots') is null,
  true,
  'unused review, audit, and snapshot tables are gone'
);

select * from finish();
rollback;
