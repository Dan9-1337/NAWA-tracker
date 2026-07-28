-- Local development mock data for UI and statistics testing.
-- Loaded automatically by `npx supabase db reset` (see config.toml [db.seed]).
--
-- Demo Telegram user id: 900000001 (matches VITE_TELEGRAM_DEV_INIT_DATA from local:env)

truncate table public.submission_limits, public.responses restart identity cascade;

insert into public.responses (
  telegram_user_id,
  telegram_username,
  has_polish_citizenship,
  ranking_country,
  school_country,
  scholarship_track,
  study_route,
  average_grade,
  maximum_grade,
  grade_percentage,
  polish_school_level,
  nawa_orientation_score,
  current_status,
  status_changed_at,
  is_suspicious
)
select
  910000000 + g,
  'seed_peer_' || lpad(g::text, 2, '0'),
  false,
  'UA',
  case (g % 3)
    when 0 then 'UA'
    when 1 then 'BY'
    else 'KZ'
  end,
  'nawa_director',
  'direct_studies',
  grade,
  5,
  grade / 5 * 100,
  case (g % 3)
    when 0 then 'none'
    when 1 then 'primary'
    else 'secondary'
  end,
  round(grade / 5 * 90 + case (g % 3) when 1 then 5 when 2 then 10 else 0 end, 2),
  case
    when g <= 3 then 'scholarship_awarded'
    when g <= 5 then 'scholarship_not_awarded'
    when g <= 7 then 'awaiting_decision'
    when g <= 9 then 'merit_review_in_progress'
    when g <= 11 then 'correction_requested'
    else 'submitted'
  end,
  case
    when g <= 3 then date '2026-05-15'
    when g <= 5 then date '2026-05-20'
    else date '2026-06-01'
  end,
  false
from (
  values
    (1, 4.6), (2, 4.4), (3, 4.25), (4, 3.9), (5, 3.6), (6, 4.05),
    (7, 3.8), (8, 3.45), (9, 4.2), (10, 4.5), (11, 3.7), (12, 3.35)
) as peers(g, grade);

insert into public.responses (
  id,
  telegram_user_id,
  telegram_username,
  has_polish_citizenship,
  ranking_country,
  school_country,
  scholarship_track,
  study_route,
  average_grade,
  maximum_grade,
  grade_percentage,
  polish_school_level,
  nawa_orientation_score,
  current_status,
  status_changed_at,
  is_suspicious
) values (
  '11111111-1111-4111-8111-111111111111',
  900000001,
  'demo_applicant',
  false,
  'UA',
  'UA',
  'nawa_director',
  'direct_studies',
  4.1,
  5,
  82,
  'secondary',
  83.8,
  'merit_review_in_progress',
  date '2026-06-10',
  false
);

insert into public.responses (
  telegram_user_id,
  telegram_username,
  has_polish_citizenship,
  ranking_country,
  school_country,
  scholarship_track,
  study_route,
  average_grade,
  maximum_grade,
  grade_percentage,
  polish_school_level,
  nawa_orientation_score,
  current_status,
  status_changed_at,
  is_suspicious
) values
  (
    900000013, 'seed_ua_nawa_13', false, 'UA', 'UA', 'nawa_director', 'direct_studies',
    4.5, 5, 90, 'primary', 86, 'formal_review_completed', date '2026-06-02', false
  ),
  (
    900000101, 'seed_by_nawa_01', false, 'BY', 'BY', 'nawa_director', 'direct_studies',
    4.0, 5, 80, 'none', 72, 'submitted', date '2026-06-03', false
  ),
  (
    900000102, 'seed_lt_nawa_01', false, 'Litwa', 'Litwa', 'nawa_director', 'direct_studies',
    4.2, 5, 84, 'secondary', 85.6, 'awaiting_decision', date '2026-06-04', false
  ),
  (
    900000103, 'seed_kz_nawa_01', false, 'KZ', 'KZ', 'nawa_director', 'preparatory_course',
    3.8, 5, 76, 'none', 68.4, 'formal_review_in_progress', date '2026-06-05', false
  ),
  (
    900000104, 'seed_ge_nawa_01', false, 'Gruzja', 'Gruzja', 'nawa_director', 'direct_studies',
    3.55, 5, 71, 'primary', 36.95, 'correction_requested', date '2026-06-06', false
  ),
  (
    900000201, 'seed_ua_health_01', false, 'UA', 'UA', 'health_minister', 'preparatory_course',
    4.55, 5, 91, null, null, 'awaiting_decision', date '2026-06-07', false
  ),
  (
    900000202, 'seed_by_health_02', false, 'BY', 'BY', 'health_minister', 'preparatory_course',
    4.4, 5, 88, null, null, 'scholarship_awarded', date '2026-05-28', false
  ),
  (
    900000203, 'seed_kz_health_03', false, 'KZ', 'KZ', 'health_minister', 'preparatory_course',
    4.2, 5, 84, null, null, 'merit_review_in_progress', date '2026-06-08', false
  ),
  (
    900000204, 'seed_ge_health_04', false, 'Gruzja', 'Gruzja', 'health_minister', 'preparatory_course',
    3.75, 5, 75, null, null, 'scholarship_not_awarded', date '2026-05-10', false
  ),
  (
    900000301, 'seed_ua_culture_01', false, 'UA', 'UA', 'culture_minister', 'direct_studies',
    4.8, 5, 96, null, null, 'submitted', date '2026-06-09', false
  ),
  (
    900000302, 'seed_by_culture_02', false, 'BY', 'BY', 'culture_minister', 'direct_studies',
    4.4, 5, 88, null, null, 'awaiting_decision', date '2026-06-10', false
  ),
  (
    900000303, 'seed_lt_culture_03', false, 'Litwa', 'Litwa', 'culture_minister', 'preparatory_course',
    4.1, 5, 82, null, null, 'correction_requested', date '2026-06-11', false
  ),
  (
    900000999, 'seed_suspicious_01', false, 'UA', 'UA', 'nawa_director', 'direct_studies',
    4.95, 5, 99, 'secondary', 99.1, 'scholarship_awarded', date '2026-03-01', true
  );
