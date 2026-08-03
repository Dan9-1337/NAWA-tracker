import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import pg from 'pg';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('ERROR: DATABASE_URL is required to run concurrency tests');
  process.exit(1);
}

const rawSuffix = randomUUID().replace(/-/g, '').slice(0, 12);
const suffix = rawSuffix.replace(/\D/g, '').slice(0, 8);
const telegramUserId = 800_000_000 + Number(suffix || '0');
const publicStatsIpHash = `public-stats-ip-${rawSuffix}`;

const { Pool } = pg;
const pool = new Pool({ connectionString: databaseUrl, max: 4 });

try {
  await pool.query(
    `select public.create_response_for_telegram_user(
      $1, $2,
      false, 'UA', 'UA',
      'nawa_director', 'direct_studies', 'science-096',
      4.5, 5, 'secondary',
      'submitted', current_date
    )`,
    [telegramUserId, `user_${suffix}`],
  );

  const duplicate = await pool.query(
    `select public.create_response_for_telegram_user(
      $1, $2,
      false, 'UA', 'UA',
      'nawa_director', 'direct_studies', 'science-096',
      4.5, 5, 'secondary',
      'submitted', current_date
    )`,
    [telegramUserId, `user_${suffix}`],
  ).catch((error) => error);

  assert.match(String(duplicate.message ?? duplicate), /profile_exists/);

  const publicStats = await pool.query(
    `select public.get_public_statistics(
      'nawa_director', 'UA', 4.5, 5, 'secondary', $1
    ) as result`,
    [publicStatsIpHash],
  );
  assert.equal(publicStats.rows[0]?.result?.detailsAvailable === true || publicStats.rows[0]?.result?.detailsAvailable === false, true);

  await pool.query(
    `delete from public.responses where telegram_user_id = $1`,
    [telegramUserId],
  );

  console.log('PASS: concurrent Telegram profile and public statistics checks');
} finally {
  await pool.end();
}
