/** pgTAP test files, shared by the PostgreSQL runner (CI) and the PGlite runner (local, no Docker). */
export const testFiles = [
  'supabase/tests/telegram_profiles.sql',
  'supabase/tests/statistics.sql',
  'supabase/tests/country_only_statistics.sql',
  'supabase/tests/cohort_outcomes.sql',
  'supabase/tests/privacy_identity.sql',
  'supabase/tests/bot_subscriptions.sql',
  'supabase/tests/season_model.sql',
  'supabase/tests/prep_cities.sql',
  'supabase/tests/intake_summary.sql',
  'supabase/tests/score_change_limit.sql',
  'supabase/tests/spike_flags.sql',
  'supabase/tests/scholarship_reports.sql',
];
