-- Local development mock data for UI and statistics testing.
-- Loaded automatically by `npx supabase db reset` (see config.toml [db.seed]).
--
-- Demo applicant (matches the dense nawa_director / Ukraina peer group below):
--   Recovery code: AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE
--   Restore URL:   http://localhost:3000/#restore=AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE
--   Session cookie value (optional manual inject):
--                  AgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI
--
-- Those credentials only work when .env.local uses the fixed local HMAC secrets
-- from .env.example (RECOVERY_HMAC_SECRET / SESSION_HMAC_SECRET).

truncate table public.submission_limits, public.anonymous_sessions, public.responses restart identity cascade;

-- ---------------------------------------------------------------------------
-- Dense peer group: unlocks detailed statistics (>= 10 matching rows)
-- track=nawa_director, ranking_country=Ukraina
-- ---------------------------------------------------------------------------
insert into public.responses (
  recovery_token_hash,
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
  'seed-ua-nawa-' || lpad(g::text, 2, '0'),
  false,
  'Ukraina',
  case (g % 3)
    when 0 then 'Ukraina'
    when 1 then 'Białoruś'
    else 'Kazachstan'
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

-- ---------------------------------------------------------------------------
-- Demo response the UI can restore / edit (fixed recovery + session hashes)
-- ---------------------------------------------------------------------------
insert into public.responses (
  id,
  recovery_token_hash,
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
  '728221017f4eda2e342c23afd3857c0049783761150c0a9be29a14897f2a97c9',
  false,
  'Ukraina',
  'Ukraina',
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

insert into public.anonymous_sessions (
  id,
  response_id,
  session_token_hash,
  expires_at
) values (
  '22222222-2222-4222-8222-222222222222',
  '11111111-1111-4111-8111-111111111111',
  '6945efd342d0656df1ffe7d4248c104f7615a1892971e2322f07807e7c480764',
  now() + interval '180 days'
);

-- ---------------------------------------------------------------------------
-- Extra variety across other tracks / countries (browse-feel data)
-- ---------------------------------------------------------------------------
insert into public.responses (
  recovery_token_hash,
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
    'seed-ua-nawa-13', false, 'Ukraina', 'Ukraina', 'nawa_director', 'direct_studies',
    4.5, 5, 90, 'primary', 86, 'formal_review_completed', date '2026-06-02', false
  ),
  (
    'seed-by-nawa-01', false, 'Białoruś', 'Białoruś', 'nawa_director', 'direct_studies',
    4.0, 5, 80, 'none', 72, 'submitted', date '2026-06-03', false
  ),
  (
    'seed-lt-nawa-01', false, 'Litwa', 'Litwa', 'nawa_director', 'direct_studies',
    4.2, 5, 84, 'secondary', 85.6, 'awaiting_decision', date '2026-06-04', false
  ),
  (
    'seed-kz-nawa-01', false, 'Kazachstan', 'Kazachstan', 'nawa_director', 'preparatory_course',
    3.8, 5, 76, 'none', 68.4, 'formal_review_in_progress', date '2026-06-05', false
  ),
  (
    'seed-ge-nawa-01', false, 'Gruzja', 'Gruzja', 'nawa_director', 'direct_studies',
    3.55, 5, 71, 'primary', 36.95, 'correction_requested', date '2026-06-06', false
  ),
  (
    'seed-ua-health-01', false, 'Ukraina', 'Ukraina', 'health_minister', 'preparatory_course',
    4.55, 5, 91, null, null, 'awaiting_decision', date '2026-06-07', false
  ),
  (
    'seed-by-health-02', false, 'Białoruś', 'Białoruś', 'health_minister', 'preparatory_course',
    4.4, 5, 88, null, null, 'scholarship_awarded', date '2026-05-28', false
  ),
  (
    'seed-kz-health-03', false, 'Kazachstan', 'Kazachstan', 'health_minister', 'preparatory_course',
    4.2, 5, 84, null, null, 'merit_review_in_progress', date '2026-06-08', false
  ),
  (
    'seed-ge-health-04', false, 'Gruzja', 'Gruzja', 'health_minister', 'preparatory_course',
    3.75, 5, 75, null, null, 'scholarship_not_awarded', date '2026-05-10', false
  ),
  (
    'seed-ua-culture-01', false, 'Ukraina', 'Ukraina', 'culture_minister', 'direct_studies',
    4.8, 5, 96, null, null, 'submitted', date '2026-06-09', false
  ),
  (
    'seed-by-culture-02', false, 'Białoruś', 'Białoruś', 'culture_minister', 'direct_studies',
    4.4, 5, 88, null, null, 'awaiting_decision', date '2026-06-10', false
  ),
  (
    'seed-lt-culture-03', false, 'Litwa', 'Litwa', 'culture_minister', 'preparatory_course',
    4.1, 5, 82, null, null, 'correction_requested', date '2026-06-11', false
  ),
  -- Suspicious row: present in totals exclusion checks, ignored by aggregate stats
  (
    'seed-suspicious-01', false, 'Ukraina', 'Ukraina', 'nawa_director', 'direct_studies',
    4.95, 5, 99, 'secondary', 99.1, 'scholarship_awarded', date '2026-03-01', true
  );
