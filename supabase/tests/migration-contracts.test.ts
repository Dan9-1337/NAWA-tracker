import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  join(process.cwd(), 'supabase/migrations/202607130001_initial_schema.sql'),
  'utf8',
);
const readme = readFileSync(join(process.cwd(), 'README.md'), 'utf8');

function functionDefinition(name: string): string {
  const start = migration.indexOf(`create function public.${name}(`);
  const end = migration.indexOf('\n$$;', start);
  expect(start, `${name} definition`).toBeGreaterThanOrEqual(0);
  expect(end, `${name} terminator`).toBeGreaterThan(start);
  return migration.slice(start, end + 4);
}

describe('mutation statistics migration contract', () => {
  it('documents database suites without a stale hardcoded pgTAP count', () => {
    expect(readme).toContain('transactional pgTAP suites');
    expect(readme).not.toMatch(/\d+ transactional pgTAP assertions/);
  });
  it('defines only the active questionnaire enum constraints', () => {
    expect(migration).toContain(
      "scholarship_track in ('nawa_mnisw', 'minister_health', 'minister_culture')",
    );
    expect(migration).toContain("study_route in ('preparatory_course', 'direct_studies')");
    expect(migration).toContain("study_type in ('first_cycle', 'uniform_masters')");
    expect(migration).not.toContain("scholarship_track in ('scholarship', 'exchange')");
    expect(migration).not.toContain("study_route in ('first_cycle', 'second_cycle', 'uniform')");
    expect(migration).not.toContain("study_type in ('full_time', 'part_time')");
  });

  it('defines session resolution and statistics before mutation functions', () => {
    const resolve = migration.indexOf('create function public.resolve_anonymous_session(');
    const responseStatistics = migration.indexOf('create function public.get_response_statistics(');
    const assertion = migration.indexOf('create function public.assert_statistics_result(');
    const statistics = migration.indexOf('create function public.get_current_statistics(');
    const create = migration.indexOf('create function public.create_response_with_session(');
    const update = migration.indexOf('create function public.update_current_response(');

    expect(resolve).toBeLessThan(responseStatistics);
    expect(responseStatistics).toBeLessThan(statistics);
    expect(assertion).toBeLessThan(create);
    expect(assertion).toBeLessThan(update);
    expect(statistics).toBeLessThan(create);
    expect(statistics).toBeLessThan(update);
  });

  it('lets in-transaction statistics observe preceding mutation writes', () => {
    expect(functionDefinition('get_response_statistics')).not.toMatch(/\nlanguage plpgsql\nstable\n/);
  });

  it('validates the complete statistics result contract inside PostgreSQL', () => {
    const definition = functionDefinition('assert_statistics_result');

    expect(definition).toContain('jsonb_object_keys');
    expect(definition).toContain('detailsAvailable');
    expect(definition).toContain('sameUniversityAndFieldCount');
    expect(definition).toContain('track-route-type-university-field');
    expect(definition).toContain('trunc(');
    expect(definition).toContain('between 0 and 100');
    expect(definition).toContain("message = 'statistics_invalid'");
  });

  it.each([
    ['create_response_with_session', 'created'],
    ['update_current_response', 'updated'],
  ])('%s returns in-transaction privacy-safe statistics', (name, successField) => {
    const definition = functionDefinition(name);

    expect(definition).toContain(`'${successField}', true`);
    expect(definition).toContain("'statistics', v_statistics");
    expect(definition).toContain(
      'v_statistics := public.assert_statistics_result(public.get_response_statistics(v_response_id));',
    );
  });

  it('keeps raw aggregation and validation helpers inaccessible to API roles', () => {
    expect(migration).toContain(
      'revoke all on function public.get_response_statistics(uuid) from public, anon, authenticated, service_role;',
    );
    expect(migration).toContain(
      'revoke all on function public.assert_statistics_result(jsonb) from public, anon, authenticated, service_role;',
    );
  });
});
