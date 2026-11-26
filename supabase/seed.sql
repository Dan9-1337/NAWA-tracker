-- Local development mock data for UI and statistics testing.
-- Loaded automatically by `npx supabase db reset` (see config.toml [db.seed]).
--
-- Demo identity: Telegram user 900000001 hashed with the local-dev pepper (see api/_lib/identity.test.ts),
-- matching VITE_TELEGRAM_DEV_INIT_DATA from local:env. Other rows use placeholder hashes.
-- Covers every branch of the cohort ladder (country -> group -> track) and of the outcomes cohort.

truncate table public.responses restart identity cascade;

-- UA: 12 peers, enough for a country cohort. Three awarded, one merit-positive without a seat.
insert into public.responses (
  identity_hash, intake_year, has_polish_citizenship, ranking_country, school_country,
  scholarship_track, study_route, target_university, grade_basis, applicant_kind,
  average_grade, maximum_grade, grade_percentage, polish_school_level, nawa_orientation_score,
  current_status, status_changed_at, is_suspicious
)
select
  lpad(to_hex(910000000 + g), 64, '0'),
  2026,
  false,
  'UA',
  case (g % 3) when 0 then 'UA' when 1 then 'BY' else 'KZ' end,
  'nawa_director',
  'direct_studies',
  'science-096',
  'final_certificate',
  'school_leaver',
  grade,
  5,
  grade / 5 * 100,
  case (g % 3) when 0 then 'none' when 1 then 'primary' else 'secondary' end,
  round(grade / 5 * 90 + case (g % 3) when 1 then 5 when 2 then 10 else 0 end, 2),
  case
    when g <= 3 then 'scholarship_awarded'
    when g = 7 then 'scholarship_not_awarded'
    when g <= 6 then 'merit_review_positive'
    when g <= 9 then 'formal_review_positive'
    else 'submitted'
  end,
  case
    when g <= 3 then date '2026-09-20'
    when g <= 7 then date '2026-09-05'
    else date '2026-06-01'
  end,
  false
from (
  values
    (1, 4.6), (2, 4.4), (3, 4.25), (4, 3.9), (5, 3.6), (6, 4.05),
    (7, 3.8), (8, 3.45), (9, 4.2), (10, 4.5), (11, 3.7), (12, 3.35)
) as peers(g, grade);

-- Demo applicant (UA), returning user persona.
insert into public.responses (
  id, identity_hash, intake_year, has_polish_citizenship, ranking_country, school_country,
  scholarship_track, study_route, target_university, grade_basis, applicant_kind,
  average_grade, maximum_grade, grade_percentage, polish_school_level, nawa_orientation_score,
  current_status, status_changed_at, is_suspicious
) values (
  '11111111-1111-4111-8111-111111111111', '64e4f43ec21ae61296d18dda409a9fb380c339c7f18dce2680e4ecc7a10b8f74', 2026, false, 'UA', 'UA',
  'nawa_director', 'direct_studies', 'science-096', 'final_certificate', 'school_leaver',
  4.1, 5, 82, 'secondary', 83.8, 'formal_review_positive', date '2026-06-10', false
);

-- Other countries. KZ/GE/AM share the "east" group (3 + 2 + 2 answers, 3 awarded in KZ), BY and LT are small.
insert into public.responses (
  identity_hash, intake_year, has_polish_citizenship, ranking_country, school_country,
  scholarship_track, study_route, target_university, grade_basis, applicant_kind,
  average_grade, maximum_grade, grade_percentage, polish_school_level, nawa_orientation_score,
  current_status, status_changed_at, is_suspicious
) values
  (lpad(to_hex(900000101), 64, '0'), 2026, false, 'BY', 'BY', 'nawa_director', 'direct_studies', 'science-048', 'final_certificate', 'school_leaver', 4.0, 5, 80, 'none', 72, 'submitted', date '2026-06-03', false),
  (lpad(to_hex(900000102), 64, '0'), 2026, false, 'BY', 'BY', 'nawa_director', 'preparatory_course', 'science-048', 'half_year', 'school_leaver', 4.4, 5, 88, 'none', 79.2, 'formal_review_positive', date '2026-06-04', false),
  (lpad(to_hex(900000103), 64, '0'), 2026, false, 'BY', 'BY', 'nawa_director', 'direct_studies', 'science-097', 'final_certificate', 'school_leaver', 3.9, 5, 78, 'none', 70.2, 'submitted', date '2026-06-05', false),
  (lpad(to_hex(900000104), 64, '0'), 2026, false, 'LT', 'LT', 'nawa_director', 'direct_studies', 'science-097', 'final_certificate', 'school_leaver', 4.2, 5, 84, 'secondary', 85.6, 'merit_review_positive', date '2026-06-04', false),
  (lpad(to_hex(900000105), 64, '0'), 2026, false, 'LT', 'LT', 'nawa_director', 'direct_studies', 'science-096', 'final_certificate', 'school_leaver', 4.6, 5, 92, 'none', 82.8, 'submitted', date '2026-06-04', false),
  (lpad(to_hex(900000106), 64, '0'), 2026, false, 'LT', 'LT', 'nawa_director', 'direct_studies', 'science-096', 'final_certificate', 'school_leaver', 4.1, 5, 82, 'primary', 78.8, 'submitted', date '2026-06-04', false),
  (lpad(to_hex(900000111), 64, '0'), 2026, false, 'KZ', 'KZ', 'nawa_director', 'preparatory_course', 'science-096', 'final_certificate', 'school_leaver', 4.5, 5, 90, 'none', 81, 'scholarship_awarded', date '2026-09-22', false),
  (lpad(to_hex(900000112), 64, '0'), 2026, false, 'KZ', 'KZ', 'nawa_director', 'preparatory_course', 'science-096', 'final_certificate', 'school_leaver', 4.2, 5, 84, 'none', 75.6, 'scholarship_awarded', date '2026-09-22', false),
  (lpad(to_hex(900000113), 64, '0'), 2026, false, 'KZ', 'KZ', 'nawa_director', 'direct_studies', 'science-049', 'final_certificate', 'school_leaver', 3.8, 5, 76, 'none', 68.4, 'scholarship_awarded', date '2026-09-23', false),
  (lpad(to_hex(900000114), 64, '0'), 2026, false, 'GE', 'GE', 'nawa_director', 'direct_studies', 'science-049', 'half_year', 'school_leaver', 4.3, 5, 86, 'primary', 82.4, 'submitted', date '2026-06-06', false),
  (lpad(to_hex(900000115), 64, '0'), 2026, false, 'GE', 'GE', 'nawa_director', 'direct_studies', 'science-049', 'final_certificate', 'school_leaver', 3.9, 5, 78, 'none', 70.2, 'submitted', date '2026-06-06', false),
  (lpad(to_hex(900000116), 64, '0'), 2026, false, 'AM', 'AM', 'nawa_director', 'direct_studies', 'science-049', 'final_certificate', 'school_leaver', 4.1, 5, 82, 'none', 73.8, 'merit_review_positive', date '2026-06-06', false),
  (lpad(to_hex(900000117), 64, '0'), 2026, false, 'AM', 'AM', 'nawa_director', 'direct_studies', 'science-049', 'final_certificate', 'school_leaver', 4.4, 5, 88, 'secondary', 89.2, 'submitted', date '2026-06-06', false),
  -- A student in Poland (assigned 100 points).
  (lpad(to_hex(900000121), 64, '0'), 2026, false, 'UA', 'UA', 'nawa_director', 'direct_studies', 'science-096', 'final_certificate', 'student_in_poland', 4.85, 5, 97, 'none', 100, 'scholarship_awarded', date '2026-09-21', false),
  -- A suspicious record that every aggregate must ignore.
  (lpad(to_hex(900000999), 64, '0'), 2026, false, 'UA', 'UA', 'nawa_director', 'direct_studies', 'science-096', 'final_certificate', 'school_leaver', 4.95, 5, 99, 'secondary', 99.1, 'scholarship_awarded', date '2026-03-01', true);

-- Study field and preparatory-course city (docs/adr/0007). Five awarded preparatory-route reports in software
-- development (0613): enough for the detailed level; Kraków has three, Łódź and Warszawa one each -> "other cities".
update public.responses
set study_field = '0613', prep_course_city = 'Kraków'
where identity_hash = lpad(to_hex(900000111), 64, '0');

update public.responses
set study_field = '0613', prep_course_city = 'Warszawa'
where identity_hash = lpad(to_hex(900000112), 64, '0');

insert into public.responses (
  identity_hash, intake_year, has_polish_citizenship, ranking_country, school_country,
  scholarship_track, study_route, target_university, study_field, prep_course_city,
  grade_basis, applicant_kind, average_grade, maximum_grade, grade_percentage, polish_school_level,
  nawa_orientation_score, current_status, status_changed_at, is_suspicious
) values
  (lpad(to_hex(900000131), 64, '0'), 2026, false, 'UA', 'UA', 'nawa_director', 'preparatory_course', 'science-096', '0613', 'Kraków', 'final_certificate', 'school_leaver', 4.3, 5, 86, 'none', 77.4, 'scholarship_awarded', date '2026-09-24', false),
  (lpad(to_hex(900000132), 64, '0'), 2026, false, 'UA', 'UA', 'nawa_director', 'preparatory_course', 'science-096', '0613', 'Kraków', 'final_certificate', 'school_leaver', 4.0, 5, 80, 'primary', 77, 'scholarship_awarded', date '2026-09-24', false),
  (lpad(to_hex(900000133), 64, '0'), 2026, false, 'UA', 'UA', 'nawa_director', 'preparatory_course', 'science-096', '0613', 'Łódź', 'final_certificate', 'school_leaver', 4.1, 5, 82, 'none', 73.8, 'scholarship_awarded', date '2026-09-25', false);
