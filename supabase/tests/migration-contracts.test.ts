import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  join(process.cwd(), 'supabase/migrations/202607130001_initial_schema.sql'),
  'utf8',
);
const cleanupMigration = readFileSync(
  join(process.cwd(), 'supabase/migrations/202607280001_schema_cleanup.sql'),
  'utf8',
);
const snapshotsMigration = readFileSync(
  join(process.cwd(), 'supabase/migrations/202607290001_statistics_snapshots.sql'),
  'utf8',
);
const universityMigration = readFileSync(
  join(process.cwd(), 'supabase/migrations/202607300001_target_university.sql'),
  'utf8',
);
const readme = readFileSync(join(process.cwd(), 'README.md'), 'utf8');

function functionDefinition(name: string, source = migration): string {
  const start = source.indexOf(`create function public.${name}(`);
  const replaceStart = source.indexOf(`create or replace function public.${name}(`);
  const resolvedStart = replaceStart >= 0 ? replaceStart : start;
  const end = source.indexOf('\n$$;', resolvedStart);
  expect(resolvedStart, `${name} definition`).toBeGreaterThanOrEqual(0);
  expect(end, `${name} terminator`).toBeGreaterThan(resolvedStart);
  return source.slice(resolvedStart, end + 4);
}

describe('mutation statistics migration contract', () => {
  it('documents database suites in README', () => {
    expect(readme).toContain('npm run test:db');
    expect(readme).not.toMatch(/\d+ transactional pgTAP assertions/);
  });

  it('defines only the active questionnaire enum constraints', () => {
    expect(migration).toContain(
      "scholarship_track in ('nawa_director', 'health_minister', 'culture_minister')",
    );
    expect(migration).toContain("study_route in ('preparatory_course', 'direct_studies')");
    expect(migration).toContain("polish_school_level in ('none', 'primary', 'secondary')");
    expect(migration).not.toContain('study_type');
    expect(migration).not.toContain("scholarship_track in ('scholarship', 'exchange')");
    expect(migration).not.toContain("study_route in ('first_cycle', 'second_cycle', 'uniform')");
  });

  it('defines telegram identity and statistics before mutation functions', () => {
    const countryStatistics = migration.indexOf('create function public.compute_country_statistics(');
    const responseStatistics = migration.indexOf('create function public.get_response_statistics(');
    const assertion = migration.indexOf('create function public.assert_statistics_result(');
    const statistics = migration.indexOf('create function public.get_current_statistics(');
    const publicStatistics = migration.indexOf('create function public.get_public_statistics(');
    const create = migration.indexOf('create function public.create_response_for_telegram_user(');
    const update = migration.indexOf('create function public.update_current_response(');

    expect(countryStatistics).toBeLessThan(responseStatistics);
    expect(responseStatistics).toBeLessThan(assertion);
    expect(assertion).toBeLessThan(statistics);
    expect(assertion).toBeLessThan(publicStatistics);
    expect(statistics).toBeLessThan(create);
    expect(publicStatistics).toBeLessThan(create);
    expect(statistics).toBeLessThan(update);
    expect(publicStatistics).toBeLessThan(update);
    expect(migration).toContain('telegram_user_id bigint not null unique');
    expect(migration).not.toContain('anonymous_sessions');
  });

  it('lets in-transaction statistics observe preceding mutation writes', () => {
    expect(functionDefinition('get_response_statistics')).not.toMatch(/\nlanguage plpgsql\nstable\n/);
  });

  it('validates the complete statistics result contract inside PostgreSQL', () => {
    const definition = functionDefinition('assert_statistics_result', snapshotsMigration);

    expect(definition).toContain('jsonb_object_keys');
    expect(definition).toContain('detailsAvailable');
    expect(definition).toContain('sameCountryCount');
    expect(definition).toContain('scoreBuckets');
    expect(definition).toContain('growth7d');
    expect(definition).toContain('history');
    expect(definition).not.toContain('statusCounts');
    expect(definition).toContain('trunc(');
    expect(definition).toContain("v_number > 100");
    expect(definition).toContain("message = 'statistics_invalid'");
  });

  it('computes country-cohort statistics with orientation score or grade percentage', () => {
    const definition = functionDefinition('compute_country_statistics', snapshotsMigration);

    expect(definition).toContain('ranking_country');
    expect(definition).toContain('nawa_orientation_score');
    expect(definition).toContain('grade_percentage');
    expect(definition).not.toContain('statusCounts');
  });

  it.each([
    ['create_response_for_telegram_user', 'created'],
    ['update_current_response', 'updated'],
  ])('%s returns in-transaction privacy-safe statistics', (name, successField) => {
    const definition = functionDefinition(name, universityMigration);

    expect(definition).toContain(`'${successField}', true`);
    expect(definition).toContain("'statistics', v_statistics");
    expect(definition).toContain(
      'v_statistics := public.assert_statistics_result(public.get_response_statistics(v_response_id));',
    );
    expect(definition).toContain('p_target_university');
  });

  it('flags transition-based suspicious updates', () => {
    const definition = functionDefinition('update_current_response', universityMigration);

    expect(definition).toContain('v_terminal_statuses');
    expect(definition).toContain('v_opposing_award_statuses');
    expect(definition).toContain('p_status_changed_at < v_response.status_changed_at');
    expect(definition).not.toContain('positive_decision');
    expect(definition).not.toContain('negative_decision');
  });

  it('stores partner university for direct studies', () => {
    expect(universityMigration).toContain('target_university');
    expect(universityMigration).toContain("'targetUniversity', r.target_university");
    expect(universityMigration).toContain('responses_target_university_route_check');
  });

  it('keeps raw aggregation and validation helpers inaccessible to API roles', () => {
    expect(migration).toContain(
      'revoke all on function public.get_response_statistics(uuid) from public, anon, authenticated, service_role;',
    );
    expect(migration).toContain(
      'revoke all on function public.compute_country_statistics(text, text, numeric) from public, anon, authenticated, service_role;',
    );
    expect(migration).toContain(
      'revoke all on function public.assert_statistics_result(jsonb) from public, anon, authenticated, service_role;',
    );
  });
});
