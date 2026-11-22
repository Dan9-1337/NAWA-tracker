import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { MIN_COHORT_SIZE } from '../../shared/product-rules';

const migration = readFileSync(
  join(process.cwd(), 'supabase/migrations/202608030001_schema.sql'),
  'utf8',
);
const cohortMigration = readFileSync(
  join(process.cwd(), 'supabase/migrations/202611210001_cohort_ladder.sql'),
  'utf8',
);
const seasonMigration = readFileSync(
  join(process.cwd(), 'supabase/migrations/202611200001_season_model.sql'),
  'utf8',
);
const privacyMigration = readFileSync(
  join(process.cwd(), 'supabase/migrations/202611220001_privacy_identity.sql'),
  'utf8',
);
const botMigration = readFileSync(
  join(process.cwd(), 'supabase/migrations/202611230001_bot_subscriptions.sql'),
  'utf8',
);
const forwardMigration = readFileSync(
  join(process.cwd(), 'supabase/migrations/202611240001_forward_status_jumps.sql'),
  'utf8',
);
const cleanupMigration = readFileSync(
  join(process.cwd(), 'supabase/migrations/202611250001_cleanup_and_thresholds.sql'),
  'utf8',
);
const fieldMigration = readFileSync(
  join(process.cwd(), 'supabase/migrations/202611260001_study_field_and_prep_city.sql'),
  'utf8',
);
const limitMigration = readFileSync(
  join(process.cwd(), 'supabase/migrations/202611280001_score_change_limit.sql'),
  'utf8',
);
const countryOnlyMigration = readFileSync(
  join(process.cwd(), 'supabase/migrations/202612010001_country_only_statistics.sql'),
  'utf8',
);
const readme = readFileSync(join(process.cwd(), 'README.md'), 'utf8');

function functionDefinition(name: string, source = migration): string {
  const pattern = new RegExp(`create (?:or replace )?function public\\.${name}\\(`, 'i');
  const match = source.match(pattern);
  expect(match, `${name} definition`).not.toBeNull();
  const resolvedStart = match!.index!;
  const end = source.indexOf('\n$$;', resolvedStart);
  expect(end, `${name} terminator`).toBeGreaterThan(resolvedStart);
  return source.slice(resolvedStart, end + 4);
}

describe('mutation statistics migration contract', () => {
  it('documents database suites in README', () => {
    expect(readme).toContain('npm run test:db');
    expect(readme).not.toMatch(/\d+ transactional pgTAP assertions/);
  });

  it('defines only the active questionnaire enum constraints', () => {
    expect(migration).toContain("'nawa_director'");
    expect(migration).toContain("'health_minister'");
    expect(migration).toContain("'culture_minister'");
    expect(migration).toContain("'preparatory_course'");
    expect(migration).toContain("'direct_studies'");
    expect(migration).toContain("'none'");
    expect(migration).toContain("'primary'");
    expect(migration).toContain("'secondary'");
    expect(migration).not.toContain('study_type');
    expect(migration).not.toContain("'scholarship'");
    expect(migration).not.toContain("'exchange'");
    expect(migration).not.toContain("'first_cycle'");
    expect(migration).not.toContain("'second_cycle'");
    expect(migration).not.toContain("'uniform'");
  });

  it('defines telegram identity and core statistics RPCs', () => {
    expect(migration).toMatch(/create function public\.compute_country_statistics\(/i);
    expect(migration).toMatch(/create function public\.get_response_statistics\(/i);
    expect(migration).toMatch(/create function public\.assert_statistics_result\(/i);
    expect(migration).toMatch(/create function public\.get_current_statistics\(/i);
    expect(migration).toMatch(/create function public\.get_public_statistics\(/i);
    expect(migration).toMatch(/create function public\.create_response_for_telegram_user\(/i);
    expect(migration).toMatch(/create function public\.update_current_response\(/i);
    expect(migration).toMatch(/telegram_user_id bigint not null/i);
    expect(migration).toContain('responses_telegram_user_id_key');
    expect(migration).not.toContain('anonymous_sessions');
  });

  it('lets in-transaction statistics observe preceding mutation writes', () => {
    expect(functionDefinition('get_response_statistics')).not.toMatch(/\nlanguage plpgsql\nstable\n/i);
  });

  it('validates the complete statistics result contract inside PostgreSQL', () => {
    const definition = functionDefinition('assert_statistics_result');

    expect(definition).toContain('jsonb_object_keys');
    expect(definition).toContain('detailsAvailable');
    expect(definition).toContain('sameCountryCount');
    expect(definition).toContain('scoreBuckets');
    expect(definition).toContain('growth7d');
    expect(definition).toContain('history');
    expect(definition).toContain('groupProgress');
    expect(definition).toContain('reportedMeritOutcomes');
    expect(definition).toContain('globalBenchmark');
    expect(definition).toContain('countryContext');
    expect(definition).not.toContain('statusCounts');
    expect(definition).toContain('trunc(');
    expect(definition).toContain("v_number > 100");
    expect(definition).toContain("message = 'statistics_invalid'");
  });

  it('computes country-cohort statistics with orientation score or grade percentage', () => {
    const definition = functionDefinition('compute_country_statistics');

    expect(definition).toContain('ranking_country');
    expect(definition).toContain('nawa_orientation_score');
    expect(definition).toContain('grade_percentage');
    expect(definition).not.toContain('statusCounts');
  });

  it.each([
    ['create_response_for_telegram_user', 'created'],
    ['update_current_response', 'updated'],
  ])('%s returns in-transaction privacy-safe statistics', (name, successField) => {
    const definition = functionDefinition(name);

    expect(definition).toContain(`'${successField}', true`);
    expect(definition).toContain("'statistics', v_statistics");
    expect(definition).toContain(
      'v_statistics := public.assert_statistics_result(public.get_response_statistics(v_response_id));',
    );
    expect(definition).toContain('p_target_university');
  });

  it('enforces MVP status transitions on profile updates', () => {
    const definition = functionDefinition('update_current_response');

    expect(definition).toContain('v_terminal_statuses');
    expect(definition).toContain('is_allowed_status_transition');
    expect(definition).toContain('p_status_changed_at < v_response.status_changed_at');
    expect(definition).not.toContain('positive_decision');
    expect(definition).not.toContain('negative_decision');
  });

  it('stores partner university for direct studies', () => {
    expect(migration).toContain('target_university');
    expect(migration).toContain("'targetUniversity', r.target_university");
    expect(migration).toContain('responses_target_university_route_check');
  });

  it('keeps raw aggregation and validation helpers inaccessible to API roles', () => {
    expect(migration).toContain(
      'revoke all on function public.get_response_statistics(uuid) from public, anon, authenticated, service_role;',
    );
    expect(migration).toContain(
      'revoke all on function public.compute_country_statistics(text, text, numeric, timestamptz) from public, anon, authenticated, service_role;',
    );
    expect(migration).toContain(
      'revoke all on function public.assert_statistics_result(jsonb) from public, anon, authenticated, service_role;',
    );
  });
});

describe('cohort ladder migration contract', () => {
  it('discloses outcomes only from three awarded responses, rounded to 5-point bands', () => {
    const definition = functionDefinition('get_cohort_outcomes', cohortMigration);

    expect(definition).toContain('c_min_awarded constant integer := 3');
    expect(definition).toContain('c_band constant numeric := 5');
    expect(definition).toContain('v_awarded >= c_min_awarded');
    expect(definition).toContain('not r.is_suspicious');
    expect(definition).toContain('r.intake_year = p_intake_year');
    expect(definition).toContain("r.current_status = 'scholarship_awarded'");
    expect(definition).toContain("r.current_status = 'scholarship_not_awarded'");
    // min/max are only ever returned after rounding to a band
    expect(definition).toContain('floor(v_low / c_band) * c_band');
    expect(definition).toContain('ceil(v_high / c_band) * c_band');
    expect(definition).not.toMatch(/'awardedMin'|'awardedMax'|'lowestScore'/);
  });

  it('walks country -> group -> track and is scoped to the caller', () => {
    const definition = functionDefinition('get_cohort_outcomes', cohortMigration);

    expect(definition).toContain("array['country', 'group', 'track']");
    expect(definition).toMatch(/security definer/i);
    expect(definition).toContain('r.telegram_user_id = p_telegram_user_id');
    expect(cohortMigration).toContain(
      'revoke all on function public.get_cohort_outcomes(bigint, integer) from public, anon, authenticated;',
    );
    expect(cohortMigration).toContain(
      'grant execute on function public.get_cohort_outcomes(bigint, integer) to service_role;',
    );
  });

  it('scopes cohort statistics to the active intake year and the country ladder', () => {
    const definition = functionDefinition('compute_country_statistics', cohortMigration);

    expect(definition).toContain('public.active_intake_year()');
    expect(definition).toContain("v_scope := 'country'");
    expect(definition).toContain("v_scope := 'group'");
    expect(definition).toContain("v_scope := 'track'");
    expect(definition).toContain('intake_year = v_year');
  });

  it('drops the statistics blocks nobody renders any more', () => {
    for (const name of [
      'get_country_outcomes(bigint)',
      'enrich_statistics_result(bigint, jsonb, text, text, numeric, boolean)',
      'compute_statistics_growth7d(text, text, numeric)',
      'compute_track_benchmark(text, numeric, timestamp with time zone)',
      'compute_country_context(jsonb, text, text, numeric)',
      'compute_group_progress(text, text)',
      'compute_reported_merit_outcomes(text, text)',
    ]) {
      expect(cohortMigration).toContain(`drop function public.${name};`);
    }
  });

  it('keeps config and group tables away from API roles', () => {
    expect(cohortMigration).toContain(
      'revoke all on table public.season_config, public.country_groups from public, anon, authenticated;',
    );
  });
});

describe('season model migration contract', () => {
  it('keys records by (telegram user, intake year) and records grade basis and applicant kind', () => {
    expect(seasonMigration).toContain('add column intake_year integer not null');
    expect(seasonMigration).toContain('add column grade_basis text not null');
    expect(seasonMigration).toContain('add column applicant_kind text not null');
    expect(seasonMigration).toContain('unique (telegram_user_id, intake_year)');
    expect(seasonMigration).toContain('drop constraint responses_telegram_user_id_key');
  });

  it('adds the not-awarded outcome to the status check and transition function', () => {
    expect(functionDefinition('is_allowed_status_transition', seasonMigration)).toContain(
      "'scholarship_awarded', 'scholarship_not_awarded'",
    );
    expect(seasonMigration).toMatch(/responses_current_status_check check \(current_status in \([^)]*'scholarship_not_awarded'/);
  });

  it('allows correcting a final outcome instead of queueing a review nobody reads', () => {
    const definition = functionDefinition('update_current_response', seasonMigration);

    expect(definition).toContain("'scholarship_not_awarded'");
    expect(definition).toContain('invalid_status_transition');
    expect(definition).not.toContain('status_change_pending_review');
    expect(definition).toContain('p_status_changed_at < v_response.status_changed_at');
  });

  it.each([
    ['create_response_for_telegram_user', 'created'],
    ['update_current_response', 'updated'],
  ])('%s still returns in-transaction statistics', (name, successField) => {
    const definition = functionDefinition(name, seasonMigration);

    expect(definition).toContain(`'${successField}', true`);
    expect(definition).toContain('public.assert_statistics_result(public.get_response_statistics(');
  });

  it('drops the unused review, audit, and snapshot tables', () => {
    expect(seasonMigration).toContain('drop table public.status_change_requests;');
    expect(seasonMigration).toContain('drop table public.response_audit_log;');
    expect(seasonMigration).toContain('drop table public.user_statistics_snapshots;');
  });

  it('asks for the university on both study routes', () => {
    expect(seasonMigration).toContain('drop constraint responses_target_university_route_check');
  });

  it('computes the orientation score in one SQL function with the student-in-Poland override', () => {
    const definition = functionDefinition('compute_orientation_score', seasonMigration);

    expect(definition).toContain("p_applicant_kind = 'student_in_poland' then 100");
    expect(definition).toContain("p_ranking_country <> 'BY'");
  });
});

describe('privacy identity migration contract', () => {
  it('replaces the Telegram id and username with a hashed identity key', () => {
    expect(privacyMigration).toContain('alter table public.responses drop column telegram_user_id;');
    expect(privacyMigration).toContain('alter table public.responses drop column telegram_username;');
    expect(privacyMigration).toContain('alter table public.product_events drop column telegram_user_id;');
    expect(privacyMigration).toContain("check (identity_hash ~ '^[0-9a-f]{64}$')");
    expect(privacyMigration).toContain('unique (identity_hash, intake_year)');
  });

  it('keeps free text out of product events', () => {
    expect(privacyMigration).toContain("jsonb_typeof(payload) = 'object' and length(payload::text) <= 256");
  });

  it.each([
    'create_response_for_identity',
    'update_current_response',
    'get_current_response',
    'get_current_statistics',
    'get_cohort_outcomes',
  ])('%s is keyed by identity hash and takes no Telegram parameters', (name) => {
    const definition = functionDefinition(name, privacyMigration);

    expect(definition).toContain('p_identity_hash text');
    expect(definition).not.toMatch(/telegram/i);
  });
});

describe('bot subscriptions migration contract', () => {
  it('is an opt-in table with only the Telegram id, chat, language and last reminder', () => {
    expect(botMigration).toContain('create table public.bot_subscriptions');
    expect(botMigration).toContain('telegram_user_id bigint primary key');
    expect(botMigration).toContain("check (locale in ('pl', 'en', 'ru', 'uk', 'be'))");
    expect(botMigration).not.toMatch(/grade|score|country|identity_hash/i);
  });

  it('is reachable only by the service role', () => {
    expect(botMigration).toContain(
      'revoke all on table public.bot_subscriptions from public, anon, authenticated;',
    );
    expect(botMigration).toContain(
      'grant select, insert, update, delete on table public.bot_subscriptions to service_role;',
    );
  });
});

describe('forward status jumps migration contract', () => {
  it('allows any later stage from a non-final status and nothing backwards', () => {
    const definition = functionDefinition('is_allowed_status_transition', forwardMigration);

    expect(definition).toContain("p_from in ('submitted', 'formal_review_positive', 'merit_review_positive')");
    expect(definition).toContain('public.status_rank(p_to) > public.status_rank(p_from)');
    expect(definition).not.toContain('p_from = p_to then false');
  });

  it('ranks the ladder with both merit outcomes and both seat decisions on the same step', () => {
    const definition = functionDefinition('status_rank', forwardMigration);

    expect(definition).toContain("when 'merit_review_positive' then 2");
    expect(definition).toContain("when 'merit_review_negative' then 2");
    expect(definition).toContain("when 'scholarship_awarded' then 3");
    expect(definition).toContain("when 'scholarship_not_awarded' then 3");
  });
});

describe('cleanup and thresholds migration contract', () => {
  function constantReturnedBy(name: string): number {
    const definition = functionDefinition(name, cleanupMigration);
    const match = definition.match(/as \$\$ select (\d+)(?:::numeric)? \$\$/);
    expect(match, `${name} returns a literal`).not.toBeNull();
    return Number(match![1]);
  }

  it('keeps the privacy thresholds identical in SQL and TypeScript', () => {
    expect(constantReturnedBy('min_cohort_size')).toBe(MIN_COHORT_SIZE);
    // The outcome thresholds have no TypeScript twin any more: the app stopped reading outcomes (ADR 0008), but the
    // SQL stays for the post-award flow, so its values are pinned here.
    expect(constantReturnedBy('outcome_min_awarded')).toBe(3);
    expect(constantReturnedBy('outcome_band_width')).toBe(5);
  });

  it('uses the named thresholds instead of literals in the statistics and outcomes functions', () => {
    for (const name of ['assert_statistics_result', 'compute_country_statistics']) {
      const definition = functionDefinition(name, cleanupMigration);
      expect(definition).toContain('public.min_cohort_size()');
      expect(definition).not.toMatch(/(?:>=|<) 10\b/);
    }
    const outcomes = functionDefinition('get_cohort_outcomes', cleanupMigration);
    expect(outcomes).toContain('public.outcome_min_awarded()');
    expect(outcomes).toContain('public.outcome_band_width()');
    expect(outcomes).not.toMatch(/c_\w+ constant \w+ := \d/);
  });

  it('drops the unused public statistics endpoint and its rate-limit table', () => {
    expect(cleanupMigration).toContain('drop function public.get_public_statistics(text, text, numeric, numeric, text, text);');
    expect(cleanupMigration).toContain('drop table public.submission_limits;');
  });

  it('serves a 14-key statistics payload', () => {
    const assertion = functionDefinition('assert_statistics_result', cleanupMigration);
    expect(assertion).toContain('jsonb_object_keys(p_statistics)) <> 14');
    expect(assertion).not.toContain('gradesScore');
    expect(assertion).not.toContain('polishSchoolBonus');
    expect(functionDefinition('compute_country_statistics', cleanupMigration)).not.toContain('gradesScore');
  });

  it('keeps the threshold helpers away from API roles', () => {
    for (const name of ['min_cohort_size()', 'outcome_min_awarded()', 'outcome_band_width()']) {
      expect(cleanupMigration).toContain(`revoke all on function public.${name} from public, anon, authenticated, service_role;`);
    }
  });

  it('takes the disclosure floor of the city view from the shared helper, not a literal', () => {
    const distribution = functionDefinition('get_prep_city_distribution', fieldMigration);
    expect(distribution).toContain('public.outcome_min_awarded()');
    expect(distribution).not.toMatch(/c_min constant integer := \d/);
  });

  it('allows a prep-course city only for an awarded preparatory-route record', () => {
    expect(fieldMigration).toMatch(/prep_course_city is null\s+or \(study_route = 'preparatory_course' and current_status = 'scholarship_awarded'\)/);
  });

  it('keeps the city view away from API roles other than service_role', () => {
    expect(fieldMigration).toContain(
      'revoke all on function public.get_prep_city_distribution(text, integer) from public, anon, authenticated;',
    );
    expect(fieldMigration).toContain(
      'grant execute on function public.get_prep_city_distribution(text, integer) to service_role;',
    );
  });
});

describe('country-only statistics migration contract', () => {
  it('compares only within the country of citizenship on the same track and intake', () => {
    const definition = functionDefinition('compute_country_statistics', countryOnlyMigration);

    expect(definition).toContain('public.active_intake_year()');
    expect(definition).toContain('scholarship_track = p_scholarship_track');
    expect(definition).toContain('ranking_country = p_ranking_country');
    expect(definition).toMatch(/c_details_from constant integer := 2;/);
    expect(definition).not.toContain('country_group_id');
    expect(definition).not.toContain("'group'");
    expect(definition).not.toContain("'track'");
    expect(definition).not.toContain('public.min_cohort_size()');
  });

  it('reports the country count without a floor and retires the group and track fields', () => {
    const definition = functionDefinition('compute_country_statistics', countryOnlyMigration);

    expect(definition).toContain("'sameCountryCount', v_same_country_count");
    expect(definition).toContain("'groupResponseCount', case when v_details_available then v_same_country_count else 0 end");
    expect(definition).toContain("'rankTotal', case when v_details_available then v_same_country_count else null end");
    expect(definition).toContain("'trackWideMedian', null");
    expect(definition).toContain("'cohortScope', case when v_details_available then 'country' else null end");
    expect(definition).toContain("'cohortGroupId', null");
  });

  it('keeps the fourteen-key assertion with the country-only rules', () => {
    const assertion = functionDefinition('assert_statistics_result', countryOnlyMigration);

    expect(assertion).toContain('jsonb_object_keys(p_statistics)) <> 14');
    expect(assertion).toContain("v_scope <> 'country'");
    expect(assertion).toContain('v_same_country_count < 2');
    expect(assertion).toContain('v_group_count <> v_same_country_count');
    expect(assertion).toContain("jsonb_typeof(p_statistics->'trackWideMedian') <> 'null'");
    expect(assertion).toContain("jsonb_typeof(p_statistics->'cohortGroupId') <> 'null'");
    expect(assertion).not.toContain('country_group_id');
    expect(assertion).not.toContain("in ('country', 'group', 'track')");
  });

  it('keeps the signatures and grants of the functions it replaces', () => {
    expect(countryOnlyMigration).toMatch(
      /create or replace function public\.compute_country_statistics\(\s*p_scholarship_track text,\s*p_ranking_country text,\s*p_metric_value numeric,\s*p_as_of timestamp with time zone default null\s*\) returns jsonb/,
    );
    expect(countryOnlyMigration).toMatch(
      /create or replace function public\.assert_statistics_result\(p_statistics jsonb\) returns jsonb/,
    );
    expect(countryOnlyMigration).toContain(
      'revoke all on function public.compute_country_statistics(text, text, numeric, timestamp with time zone) from public, anon, authenticated, service_role;',
    );
    expect(countryOnlyMigration).toContain(
      'revoke all on function public.assert_statistics_result(jsonb) from public, anon, authenticated, service_role;',
    );
  });
});

describe('score change limit migration contract', () => {
  it('stores only the identity hash, save time and counted flag, service-role only', () => {
    const tableStart = limitMigration.indexOf('create table public.score_change_log');
    const tableEnd = limitMigration.indexOf('alter table public.score_change_log');
    const table = limitMigration.slice(tableStart, tableEnd);
    const columns = table.slice(table.indexOf('('), table.indexOf(');'));

    expect(tableStart).toBeGreaterThan(-1);
    expect(columns).toMatch(/identity_hash text not null/);
    expect(columns).toMatch(/saved_at timestamp with time zone not null/);
    expect(columns).toMatch(/counted boolean not null/);
    expect(columns.match(/^\s+\w+/gm)).toHaveLength(3);
    expect(columns).not.toMatch(/score|country|intake/i);
    expect(limitMigration).toContain(
      'create index score_change_log_identity_saved_at_idx\n  on public.score_change_log (identity_hash, saved_at);',
    );
    expect(limitMigration).toContain(
      'revoke all on table public.score_change_log from public, anon, authenticated;',
    );
  });

  it('redefines both write RPCs with the same signatures and the shared limit rule', () => {
    expect(limitMigration).toMatch(/create or replace function public\.create_response_for_identity\(/);
    expect(limitMigration).toMatch(/create or replace function public\.update_current_response\(/);

    for (const name of ['create_response_for_identity', 'update_current_response']) {
      const definition = functionDefinition(name, limitMigration);
      expect(definition).toContain('score_change_retry_at');
      expect(definition).toContain("message = 'edit_limit_reached'");
      expect(definition).toContain("detail = to_char(v_retry_at at time zone 'UTC'");
    }

    const create = functionDefinition('create_response_for_identity', limitMigration);
    expect(create).toContain('pg_advisory_xact_lock(hashtextextended(p_identity_hash, 3))');
    expect(create).toContain('v_has_recent_trail');

    const update = functionDefinition('update_current_response', limitMigration);
    expect(update).toContain('for update');
    expect(update).toContain('is distinct from v_response.nawa_orientation_score');
  });

  it('purges rows once they leave the rolling window', () => {
    const purge = functionDefinition('purge_score_change_log', limitMigration);
    expect(purge).toContain("saved_at <= now() - interval '24 hours'");
    expect(limitMigration).toContain("'0 * * * *'");
    expect(limitMigration).toContain('purge-score-change-log');
  });
});
