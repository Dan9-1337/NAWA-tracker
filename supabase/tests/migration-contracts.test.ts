import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  join(process.cwd(), 'supabase/migrations/202608030001_schema.sql'),
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
    expect(definition).not.toContain('scholarship_not_awarded');
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
