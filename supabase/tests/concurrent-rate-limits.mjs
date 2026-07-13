import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('ERROR: DATABASE_URL is required to run concurrent PostgreSQL rate-limit tests');
  process.exit(1);
}

const { Pool } = pg;
const pool = new Pool({ connectionString: databaseUrl, max: 16 });
const suffix = randomUUID();
const createIpHash = `concurrent-create-ip-${suffix}`;
const restoreIpHash = `concurrent-restore-ip-${suffix}`;
const recoveryPrefix = `concurrent-recovery-${suffix}`;
const sessionPrefix = `concurrent-session-${suffix}`;
const rotationRecoveryHash = `rotation-recovery-${suffix}`;
const rotationSessionHash = `rotation-session-${suffix}`;

async function createResponse(index) {
  try {
    const result = await pool.query(
      `select public.create_response_with_session(
        $1, $2, now() + interval '1 day', $3, null,
        'nawa_mnisw', 'direct_studies', 'first_cycle', 'PL', 5, 4,
        'Concurrent University', 'Concurrent Field', 'first_choice', 'submitted', null
      ) as result`,
      [`${recoveryPrefix}-${index}`, `${sessionPrefix}-${index}`, createIpHash],
    );
    return result.rows[0].result;
  } catch (error) {
    return error;
  }
}

async function restoreUnknown(index) {
  const result = await pool.query(
    `select public.restore_anonymous_session(
      $1, $2, now() + interval '1 day', $3
    ) as result`,
    [`unknown-${recoveryPrefix}`, `restore-${sessionPrefix}-${index}`, restoreIpHash],
  );
  return result.rows[0].result;
}

async function createRotationFixture() {
  const result = await pool.query(
    `select public.create_response_with_session(
      $1, $2, now() + interval '1 day', $3, null,
      'nawa_mnisw', 'direct_studies', 'first_cycle', 'PL', 5, 4,
      'Rotation University', 'Rotation Field', 'first_choice', 'submitted', null
    ) as result`,
    [rotationRecoveryHash, rotationSessionHash, `rotation-ip-${suffix}`],
  );
  assert.equal(result.rows[0].result.created, true, 'rotation fixture must be created');
}

async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query("set local statement_timeout = '2s'");
    await callback(client);
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

async function queryWithTimeout(text, values) {
  let result;
  await withTransaction(async (client) => {
    result = await client.query(text, values);
  });
  return result;
}

async function assertRestoreExcludesRotation() {
  await withTransaction(async (restoreClient) => {
    const restore = await restoreClient.query(
      `select public.restore_anonymous_session(
        $1, $2, now() + interval '1 day', $3
      ) as result`,
      [rotationRecoveryHash, `rotation-restored-session-${suffix}`, `rotation-restore-ip-${suffix}`],
    );
    assert.equal(restore.rows[0].result.restored, true, 'lock-owning restore must succeed');

    const competing = await queryWithTimeout(
      'select public.rotate_recovery_token($1, $2) as result',
      [rotationSessionHash, `rotation-blocked-hash-${suffix}`],
    );
    assert.equal(competing.rows[0].result, false, 'rotation competing with restore must fail fast');
  });

  const sequential = await pool.query(
    'select public.rotate_recovery_token($1, $2) as result',
    [rotationSessionHash, `rotation-after-restore-${suffix}`],
  );
  assert.equal(sequential.rows[0].result, true, 'rotation after committed restore must succeed');
}

async function assertRotationExcludesRotation() {
  await withTransaction(async (firstClient) => {
    const first = await firstClient.query(
      'select public.rotate_recovery_token($1, $2) as result',
      [rotationSessionHash, `rotation-first-${suffix}`],
    );
    assert.equal(first.rows[0].result, true, 'lock-owning rotation must succeed');

    const competing = await queryWithTimeout(
      'select public.rotate_recovery_token($1, $2) as result',
      [rotationSessionHash, `rotation-second-${suffix}`],
    );
    assert.equal(competing.rows[0].result, false, 'competing rotation must fail fast');
  });

  const sequential = await pool.query(
    'select public.rotate_recovery_token($1, $2) as result',
    [rotationSessionHash, `rotation-final-${suffix}`],
  );
  assert.equal(sequential.rows[0].result, true, 'sequential rotation must succeed');
}

async function assertRotationExcludesRestore() {
  await withTransaction(async (rotationClient) => {
    const rotation = await rotationClient.query(
      'select public.rotate_recovery_token($1, $2) as result',
      [rotationSessionHash, `rotation-lock-owner-${suffix}`],
    );
    assert.equal(rotation.rows[0].result, true, 'lock-owning rotation must succeed');

    const competing = await queryWithTimeout(
      `select public.restore_anonymous_session(
        $1, $2, now() + interval '1 day', $3
      ) as result`,
      [`rotation-after-restore-${suffix}`, `restore-blocked-${suffix}`, `rotation-blocked-ip-${suffix}`],
    );
    assert.equal(competing.rows[0].result.restored, false, 'restore competing with rotation must fail fast');
  });

  const sequential = await pool.query(
    `select public.restore_anonymous_session(
      $1, $2, now() + interval '1 day', $3
    ) as result`,
    [`rotation-lock-owner-${suffix}`, `restore-after-rotation-${suffix}`, `rotation-sequential-ip-${suffix}`],
  );
  assert.equal(sequential.rows[0].result.restored, true, 'restore after committed rotation must succeed');
}

try {
  const createResults = await Promise.all(Array.from({ length: 4 }, (_, index) => createResponse(index)));
  const created = createResults.filter((result) => result?.created === true);
  const limited = createResults.filter(
    (result) => result instanceof Error && result.code === 'P0001' && result.message === 'create_rate_limited',
  );

  assert.equal(created.length, 3, 'exactly three concurrent creates must succeed');
  assert.equal(limited.length, 1, 'exactly one concurrent create must be rate limited');

  const createEvents = await pool.query(
    `select count(*)::integer as count
     from public.submission_limits
     where ip_hash = $1 and limit_type = 'create'`,
    [createIpHash],
  );
  assert.equal(createEvents.rows[0].count, 3, 'three successful concurrent creates must be recorded');

  const restoreResults = await Promise.all(Array.from({ length: 11 }, (_, index) => restoreUnknown(index)));
  assert.equal(
    restoreResults.filter((result) => result.restored === false && result.rateLimited === false).length,
    10,
    'the first ten concurrent restore attempts must return generic invalid results',
  );
  assert.equal(
    restoreResults.filter((result) => result.restored === false && result.rateLimited === true).length,
    1,
    'the eleventh concurrent restore attempt must be rate limited',
  );

  const restoreEvents = await pool.query(
    `select count(*)::integer as count
     from public.submission_limits
     where ip_hash = $1 and limit_type = 'restore'`,
    [restoreIpHash],
  );
  assert.equal(restoreEvents.rows[0].count, 11, 'all concurrent restore attempts must be recorded');

  await createRotationFixture();
  await assertRestoreExcludesRotation();
  await assertRotationExcludesRestore();
  await assertRotationExcludesRotation();

  console.log('PASS: concurrent rate limits and credential rotations serialize correctly');
} finally {
  await pool.query(
    `delete from public.submission_limits
     where ip_hash in ($1, $2) or ip_hash like $3`,
    [createIpHash, restoreIpHash, `rotation-%-${suffix}`],
  );
  await pool.query(
    `delete from public.responses
     where recovery_token_hash like $1 or recovery_token_hash like $2`,
    [`${recoveryPrefix}-%`, `rotation-%-${suffix}`],
  );
  await pool.end();
}
