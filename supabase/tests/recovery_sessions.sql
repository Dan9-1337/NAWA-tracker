begin;

create extension if not exists pgtap with schema extensions;

select plan(62);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.responses'::regclass),
  'responses has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.anonymous_sessions'::regclass),
  'anonymous_sessions has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.submission_limits'::regclass),
  'submission_limits has RLS enabled'
);
select is(
  (select count(*)::integer from pg_policies where schemaname = 'public' and tablename in ('responses', 'anonymous_sessions', 'submission_limits')),
  0,
  'private tables have no policies'
);

select ok(
  not has_table_privilege('anon', 'public.responses', 'select, insert, update, delete, truncate, references, trigger')
    and not has_table_privilege('authenticated', 'public.responses', 'select, insert, update, delete, truncate, references, trigger')
    and not has_table_privilege('anon', 'public.anonymous_sessions', 'select, insert, update, delete, truncate, references, trigger')
    and not has_table_privilege('authenticated', 'public.anonymous_sessions', 'select, insert, update, delete, truncate, references, trigger')
    and not has_table_privilege('anon', 'public.submission_limits', 'select, insert, update, delete, truncate, references, trigger')
    and not has_table_privilege('authenticated', 'public.submission_limits', 'select, insert, update, delete, truncate, references, trigger'),
  'browser roles have no privileges on private tables'
);
select ok(
  not has_function_privilege('anon', 'public.resolve_anonymous_session(text)', 'execute')
    and not has_function_privilege('authenticated', 'public.resolve_anonymous_session(text)', 'execute')
    and has_function_privilege('service_role', 'public.resolve_anonymous_session(text)', 'execute'),
  'session resolver is executable only by the service role'
);
select ok(
  not has_function_privilege('anon', 'public.get_current_statistics(text)', 'execute')
    and not has_function_privilege('authenticated', 'public.get_current_statistics(text)', 'execute')
    and has_function_privilege('service_role', 'public.get_current_statistics(text)', 'execute'),
  'statistics function is executable only by the service role'
);
select ok(
  not has_function_privilege('anon', 'public.get_public_statistics(text, text, numeric, numeric, text, text)', 'execute')
    and not has_function_privilege('authenticated', 'public.get_public_statistics(text, text, numeric, numeric, text, text)', 'execute')
    and has_function_privilege('service_role', 'public.get_public_statistics(text, text, numeric, numeric, text, text)', 'execute'),
  'public statistics function is executable only by the service role'
);
select ok(
  not has_function_privilege('anon', 'public.get_response_statistics(uuid)', 'execute')
    and not has_function_privilege('authenticated', 'public.get_response_statistics(uuid)', 'execute')
    and not has_function_privilege('service_role', 'public.get_response_statistics(uuid)', 'execute')
    and not has_function_privilege('anon', 'public.assert_statistics_result(jsonb)', 'execute')
    and not has_function_privilege('authenticated', 'public.assert_statistics_result(jsonb)', 'execute')
    and not has_function_privilege('service_role', 'public.assert_statistics_result(jsonb)', 'execute'),
  'raw statistics and validation helpers are not directly executable by API roles'
);
select is(
  (
    select count(*)::integer
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'create_response_with_session', 'restore_anonymous_session', 'resolve_anonymous_session',
        'get_current_response', 'update_current_response', 'rotate_recovery_token',
        'revoke_anonymous_session', 'get_current_statistics', 'get_public_statistics'
      )
      and (
        has_function_privilege('anon', p.oid, 'execute')
        or has_function_privilege('authenticated', p.oid, 'execute')
      )
  ),
  0,
  'all private RPCs deny execution to browser roles'
);
select is(
  (
    select count(*)::integer
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'create_response_with_session', 'restore_anonymous_session', 'resolve_anonymous_session',
        'get_current_response', 'update_current_response', 'rotate_recovery_token',
        'revoke_anonymous_session', 'get_current_statistics', 'get_public_statistics'
      )
      and has_function_privilege('service_role', p.oid, 'execute')
  ),
  9,
  'service role can execute every private RPC'
);
select is(
  (
    select count(*)::integer
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
    where n.nspname = 'public'
      and p.proname in (
        'set_updated_at', 'create_response_with_session', 'restore_anonymous_session',
        'resolve_anonymous_session', 'get_current_response', 'update_current_response',
        'rotate_recovery_token', 'revoke_anonymous_session', 'get_current_statistics',
        'get_public_statistics'
      )
      and acl.grantee = 0
      and acl.privilege_type = 'EXECUTE'
  ),
  0,
  'owned functions grant no execution privilege to public'
);
select is(
  (
    select count(*)::integer
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'create_response_with_session', 'restore_anonymous_session', 'resolve_anonymous_session',
        'get_current_response', 'update_current_response', 'rotate_recovery_token',
        'revoke_anonymous_session', 'get_current_statistics', 'get_public_statistics'
      )
      and array_to_string(p.proconfig, ',') = 'search_path=pg_catalog'
  ),
  9,
  'security definer RPCs use only pg_catalog in search_path'
);

select throws_ok(
  $$insert into public.responses (
      recovery_token_hash, has_polish_citizenship, ranking_country, school_country,
      scholarship_track, study_route, average_grade, maximum_grade, grade_percentage,
      polish_school_level, nawa_orientation_score, current_status, status_changed_at
    ) values (
      'constraint-grade', false, 'Polska', 'Polska',
      'nawa_director', 'direct_studies', 6, 5, 120, 'none', 54, 'submitted', current_date
    )$$,
  '23514',
  null,
  'grade values must fit their scale and percentage range'
);
select throws_ok(
  $$insert into public.responses (
      recovery_token_hash, has_polish_citizenship, ranking_country, school_country,
      scholarship_track, study_route, average_grade, maximum_grade, grade_percentage,
      polish_school_level, nawa_orientation_score, current_status, status_changed_at
    ) values (
      'constraint-old-track', false, 'Polska', 'Polska',
      'scholarship', 'direct_studies', 4, 5, 80, 'none', 72, 'submitted', current_date
    )$$,
  '23514',
  null,
  'former scholarship tracks are rejected'
);
select throws_ok(
  $$insert into public.responses (
      recovery_token_hash, has_polish_citizenship, ranking_country, school_country,
      scholarship_track, study_route, average_grade, maximum_grade, grade_percentage,
      polish_school_level, nawa_orientation_score, current_status, status_changed_at
    ) values (
      'constraint-old-route', false, 'Polska', 'Polska',
      'nawa_director', 'second_cycle', 4, 5, 80, 'none', 72, 'submitted', current_date
    )$$,
  '23514',
  null,
  'former study routes are rejected'
);
select throws_ok(
  $$insert into public.responses (
      recovery_token_hash, has_polish_citizenship, ranking_country, school_country,
      scholarship_track, study_route, average_grade, maximum_grade, grade_percentage,
      polish_school_level, nawa_orientation_score, current_status, status_changed_at
    ) values (
      'constraint-health-route', false, 'Polska', 'Polska',
      'health_minister', 'direct_studies', 4, 5, 80, null, null, 'submitted', current_date
    )$$,
  '23514',
  null,
  'health_minister currently supports only the preparatory course route'
);
select throws_ok(
  $$insert into public.responses (
      recovery_token_hash, has_polish_citizenship, ranking_country, school_country,
      scholarship_track, study_route, average_grade, maximum_grade, grade_percentage,
      polish_school_level, nawa_orientation_score, current_status, status_changed_at
    ) values (
      'constraint-polish-level', false, 'Polska', 'Polska',
      'nawa_director', 'direct_studies', 4, 5, 80, null, null, 'submitted', current_date
    )$$,
  '23514',
  null,
  'nawa_director requires a polish school level'
);
select throws_ok(
  $$insert into public.responses (
      recovery_token_hash, has_polish_citizenship, ranking_country, school_country,
      scholarship_track, study_route, average_grade, maximum_grade, grade_percentage,
      polish_school_level, nawa_orientation_score, current_status, status_changed_at
    ) values (
      'constraint-dual-citizenship', true, 'Polska', 'Polska',
      'health_minister', 'preparatory_course', 4, 5, 80, null, null, 'submitted', current_date
    )$$,
  '23514',
  null,
  'dual Polish citizenship is limited to the nawa_director track'
);

insert into public.responses (
  recovery_token_hash, has_polish_citizenship, ranking_country, school_country,
  scholarship_track, study_route, average_grade, maximum_grade, grade_percentage,
  polish_school_level, nawa_orientation_score, current_status, status_changed_at
) values (
  'unique-recovery', false, 'Polska', 'Polska',
  'nawa_director', 'direct_studies', 4, 5, 80, 'none', 72, 'submitted', current_date
);
select throws_ok(
  $$insert into public.responses (
      recovery_token_hash, has_polish_citizenship, ranking_country, school_country,
      scholarship_track, study_route, average_grade, maximum_grade, grade_percentage,
      polish_school_level, nawa_orientation_score, current_status, status_changed_at
    ) values (
      'unique-recovery', false, 'Niemcy', 'Niemcy',
      'health_minister', 'preparatory_course', 7, 10, 70, null, null, 'merit_review_in_progress', current_date
    )$$,
  '23505',
  null,
  'recovery hashes are unique'
);
select throws_ok(
  $$insert into public.submission_limits (ip_hash, limit_type) values ('ip-invalid', 'update')$$,
  '23514',
  null,
  'rate events accept only create, restore, and public_stats categories'
);

create temporary table create_mutation_result(result jsonb) on commit drop;
insert into create_mutation_result(result)
select public.create_response_with_session(
    'recovery-create-1', 'session-create-1', now() + interval '1 day',
    'ip-create', 'fingerprint-1',
    false, 'Polska', 'Polska',
    'nawa_director', 'direct_studies',
    4, 5, 'none',
    'submitted', current_date
  );
select is(
  (select result->>'created' from create_mutation_result),
  'true',
  'atomic create reports success'
);
select ok(
  (select result->'statistics' is not null from create_mutation_result),
  'atomic create returns statistics from its transaction'
);
select ok(
  (select not (result ?| array['responseId', 'sessionTokenHash', 'recoveryTokenHash', 'createdAt']) from create_mutation_result),
  'atomic create result contains no private response or credential fields'
);
select is(
  (select count(*)::integer from public.responses where recovery_token_hash = 'recovery-create-1'),
  1,
  'atomic create inserts the response'
);
select is(
  (select count(*)::integer from public.anonymous_sessions where session_token_hash = 'session-create-1'),
  1,
  'atomic create inserts the first session'
);
select is(
  (select count(*)::integer from public.submission_limits where ip_hash = 'ip-create' and limit_type = 'create'),
  1,
  'atomic create records the create event'
);

do $$
begin
  perform public.create_response_with_session(
    'recovery-create-2', 'session-create-2', now() + interval '1 day',
    'ip-create', null,
    false, 'Polska', 'Polska',
    'nawa_director', 'direct_studies',
    4, 5, 'none',
    'submitted', current_date
  );
  perform public.create_response_with_session(
    'recovery-create-3', 'session-create-3', now() + interval '1 day',
    'ip-create', null,
    false, 'Polska', 'Polska',
    'nawa_director', 'direct_studies',
    4, 5, 'none',
    'submitted', current_date
  );
end;
$$;
select throws_ok(
  $$select public.create_response_with_session(
      'recovery-create-4', 'session-create-4', now() + interval '1 day',
      'ip-create', null,
      false, 'Polska', 'Polska',
      'nawa_director', 'direct_studies',
      4, 5, 'none',
      'submitted', current_date
    )$$,
  'P0001',
  'create_rate_limited',
  'a fourth create in 24 hours is rejected'
);
select is(
  (select count(*)::integer from public.responses where recovery_token_hash = 'recovery-create-4'),
  0,
  'rate-limited create leaves no partial response'
);

select is(
  public.restore_anonymous_session(
    'unknown-recovery', 'restore-unknown-session', now() + interval '1 day', 'ip-restore-unknown'
  )->>'restored',
  'false',
  'unknown recovery hashes return a generic false result'
);
select is(
  (select count(*)::integer from public.submission_limits where ip_hash = 'ip-restore-unknown' and limit_type = 'restore'),
  1,
  'unknown recovery attempts remain recorded'
);
do $$
begin
  for attempt in 2..10 loop
    perform public.restore_anonymous_session(
      'unknown-recovery', 'unused-session-' || attempt, now() + interval '1 day', 'ip-restore-unknown'
    );
  end loop;
end;
$$;
select is(
  public.restore_anonymous_session(
    'unknown-recovery', 'unused-session-11', now() + interval '1 day', 'ip-restore-unknown'
  )->>'rateLimited',
  'true',
  'an eleventh restore attempt in 15 minutes is throttled'
);
select is(
  (select count(*)::integer from public.submission_limits where ip_hash = 'ip-restore-unknown' and limit_type = 'restore'),
  11,
  'throttled restore attempts remain recorded'
);
select is(
  public.restore_anonymous_session(
    'recovery-create-1', 'session-restored', now() + interval '1 day', 'ip-restore-valid'
  )->>'restored',
  'true',
  'a valid recovery hash creates a session'
);
select is(
  public.resolve_anonymous_session('session-restored'),
  (select id from public.responses where recovery_token_hash = 'recovery-create-1'),
  'a valid active session resolves its response'
);
select ok(
  public.get_current_response('session-restored') ? 'scholarshipTrack'
    and not (public.get_current_response('session-restored') ? 'recoveryTokenHash'),
  'current response returns editable fields without credential hashes'
);
select is(
  public.restore_anonymous_session(
    'recovery-create-1', 'session-create-1', now() + interval '1 day', 'ip-restore-duplicate-session'
  )->>'restored',
  'false',
  'a duplicate session hash returns a generic invalid result'
);
select is(
  (select count(*)::integer from public.submission_limits where ip_hash = 'ip-restore-duplicate-session' and limit_type = 'restore'),
  1,
  'duplicate session hash restore attempt remains recorded'
);
select is(
  public.restore_anonymous_session(
    'recovery-create-1', 'session-null-expiry', null, 'ip-restore-null-expiry'
  )->>'restored',
  'false',
  'a null session expiry returns a generic invalid result'
);
select is(
  (select count(*)::integer from public.submission_limits where ip_hash = 'ip-restore-null-expiry' and limit_type = 'restore'),
  1,
  'null expiry restore attempt remains recorded'
);
select is(
  public.restore_anonymous_session(
    'recovery-create-1', 'session-past-expiry', now() - interval '1 second', 'ip-restore-past-expiry'
  )->>'restored',
  'false',
  'a past session expiry returns a generic invalid result'
);
select is(
  (select count(*)::integer from public.submission_limits where ip_hash = 'ip-restore-past-expiry' and limit_type = 'restore'),
  1,
  'past expiry restore attempt remains recorded'
);

insert into public.anonymous_sessions (response_id, session_token_hash, expires_at)
select id, 'session-expired', now() - interval '1 second'
from public.responses where recovery_token_hash = 'recovery-create-1';
insert into public.anonymous_sessions (response_id, session_token_hash, expires_at, revoked_at)
select id, 'session-revoked', now() + interval '1 day', now()
from public.responses where recovery_token_hash = 'recovery-create-1';
select is(public.resolve_anonymous_session('session-expired'), null::uuid, 'expired sessions do not resolve');
select is(public.resolve_anonymous_session('session-revoked'), null::uuid, 'revoked sessions do not resolve');
select is(public.revoke_anonymous_session('session-expired'), false, 'logout does not update an expired session');
select is(
  (select revoked_at from public.anonymous_sessions where session_token_hash = 'session-expired'),
  null::timestamptz,
  'expired session remains unmodified'
);
select is(public.revoke_anonymous_session('session-revoked'), false, 'logout is idempotent for an already revoked session');

select ok(
  public.rotate_recovery_token('session-restored', 'recovery-rotated'),
  'an active session can rotate its recovery hash'
);
select is(
  public.restore_anonymous_session(
    'recovery-create-1', 'session-old-recovery', now() + interval '1 day', 'ip-old-recovery'
  )->>'restored',
  'false',
  'the previous recovery hash stops restoring immediately'
);
select is(
  public.resolve_anonymous_session('session-create-1'),
  (select id from public.responses where recovery_token_hash = 'recovery-rotated'),
  'rotation leaves other sessions valid'
);
select is(
  public.restore_anonymous_session(
    'recovery-rotated', 'session-sequential-restore', now() + interval '1 day', 'ip-sequential-restore'
  )->>'restored',
  'true',
  'a restore can succeed after a completed rotation'
);
select ok(
  public.rotate_recovery_token('session-sequential-restore', 'recovery-sequential-rotation'),
  'a rotation can succeed after a completed restore'
);
select is(
  public.restore_anonymous_session(
    'recovery-rotated', 'session-stale-sequential', now() + interval '1 day', 'ip-stale-sequential'
  )->>'restored',
  'false',
  'the superseded recovery hash fails after sequential rotation'
);
select is(
  public.restore_anonymous_session(
    'recovery-sequential-rotation', 'session-current-sequential', now() + interval '1 day', 'ip-current-sequential'
  )->>'restored',
  'true',
  'the current recovery hash succeeds after sequential rotation'
);
select ok(public.revoke_anonymous_session('session-restored'), 'logout revokes the presented session');
select is(public.resolve_anonymous_session('session-restored'), null::uuid, 'a logged-out session no longer resolves');
select is(public.revoke_anonymous_session('session-restored'), false, 'repeated logout does not update the revoked session');
select is(
  public.resolve_anonymous_session('session-create-1'),
  (select id from public.responses where recovery_token_hash = 'recovery-sequential-rotation'),
  'logout leaves other sessions valid'
);

create or replace function public.get_response_statistics(p_response_id uuid)
returns jsonb
language sql
volatile
security invoker
set search_path = pg_catalog
as $$
  select '{"detailsAvailable":true,"group":"invalid-group"}'::jsonb;
$$;

select throws_ok(
  $$select public.create_response_with_session(
      'recovery-stats-failure', 'session-stats-failure', now() + interval '1 day',
      'ip-stats-failure', null,
      false, 'Polska', 'Polska',
      'nawa_director', 'direct_studies',
      4, 5, 'none',
      'submitted', current_date
    )$$,
  'P0001',
  'statistics_invalid',
  'malformed non-null create statistics fail inside the transaction'
);
select is(
  (select count(*)::integer from public.responses where recovery_token_hash = 'recovery-stats-failure'),
  0,
  'malformed statistics roll back the response'
);
select is(
  (select count(*)::integer from public.anonymous_sessions where session_token_hash = 'session-stats-failure'),
  0,
  'malformed statistics roll back the session'
);
select is(
  (select count(*)::integer from public.submission_limits where ip_hash = 'ip-stats-failure'),
  0,
  'malformed statistics roll back the rate event'
);

select * from finish();
rollback;
