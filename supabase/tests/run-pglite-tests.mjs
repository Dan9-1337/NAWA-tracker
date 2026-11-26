/**
 * Runs the migrations and the pgTAP SQL tests on PGlite (PostgreSQL compiled to WebAssembly), so the database
 * layer can be tested locally without Docker or a running Postgres.
 *
 *   npm run test:db:pglite
 *
 * It is a fast approximation: CI still runs the real pgTAP suite against PostgreSQL (`npm run test:db`), and the
 * concurrency test needs a real server. pgTAP is replaced by `pgtap-shim.sql`, and pgcrypto by PostgreSQL's
 * built-in `gen_random_uuid()`.
 */
import { readdir, readFile } from 'node:fs/promises';

import { PGlite } from '@electric-sql/pglite';

import { testFiles } from './test-files.mjs';

const root = new URL('../../', import.meta.url);

async function boot() {
  const db = new PGlite();
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin;
    create schema if not exists extensions;
  `);

  const migrationsDir = new URL('supabase/migrations/', root);
  const migrations = (await readdir(migrationsDir)).filter((name) => name.endsWith('.sql')).sort();
  for (const name of migrations) {
    const sql = (await readFile(new URL(name, migrationsDir), 'utf8')).replace(
      /create extension if not exists pgcrypto[^;]*;/gi,
      '',
    );
    try {
      await db.exec(sql);
    } catch (error) {
      throw new Error(`migration ${name} failed: ${error.message}`);
    }
  }
  return { db, migrations };
}

function tapLines(results) {
  return results
    .flatMap((result) => result.rows.flatMap((row) => Object.values(row)))
    .filter((value) => typeof value === 'string');
}

const { db, migrations } = await boot();
await db.exec(await readFile(new URL('supabase/tests/pgtap-shim.sql', root), 'utf8'));
await db.exec('set search_path = public, extensions');
console.log(`Applied ${migrations.length} migrations on PGlite`);

let failed = 0;

for (const testFile of testFiles) {
  const sql = (await readFile(new URL(testFile, root), 'utf8')).replace(
    /create extension if not exists pgtap[^;]*;/gi,
    '',
  );
  try {
    const lines = tapLines(await db.exec(sql));
    const plan = lines.find((line) => /^1\.\.\d+$/.test(line));
    const assertions = lines.filter((line) => /^(?:not )?ok\b/.test(line));
    const failures = lines.filter((line) => /^not ok\b/.test(line));
    const planned = plan ? Number(plan.slice(3)) : -1;
    if (!plan || assertions.length !== planned || failures.length > 0) {
      failed += 1;
      console.error(`FAIL: ${testFile} (${assertions.length} of ${planned} assertions, ${failures.length} failed)`);
      failures.forEach((line) => console.error(`  ${line.replace(/\n/g, '\n  ')}`));
    } else {
      console.log(`PASS: ${testFile} (${planned} assertions)`);
    }
  } catch (error) {
    failed += 1;
    console.error(`FAIL: ${testFile}: ${error.message}`);
    // A failed statement leaves the transaction aborted; start the next file clean.
    await db.exec('rollback').catch(() => undefined);
  }
}

// The development seed must load and exercise every branch of the cohort ladder.
const seeded = (await boot()).db;
try {
  await seeded.exec(await readFile(new URL('supabase/seed.sql', root), 'utf8'));
  const demoHash = '64e4f43ec21ae61296d18dda409a9fb380c339c7f18dce2680e4ecc7a10b8f74';
  const geHash = "lpad(to_hex(900000114), 64, '0')";
  const kzHash = "lpad(to_hex(900000111), 64, '0')";
  const [country, group, track, cities] = await Promise.all([
    seeded.query(`select public.get_current_statistics('${demoHash}', 2026)->>'cohortScope' as scope`),
    seeded.query(`select public.get_cohort_outcomes(${geHash}, 2026)->>'scope' as scope`),
    seeded.query(`select public.get_current_statistics(${geHash}, 2026)->>'cohortScope' as scope`),
    seeded.query(`select public.get_prep_city_distribution(${kzHash}, 2026) as distribution`),
  ]);
  const distribution = cities.rows[0].distribution;
  const checks = [
    ['seed: demo applicant compares with their country', country.rows[0].scope === 'country'],
    ['seed: Georgian applicant\'s outcomes fall back to the "east" group', group.rows[0].scope === 'group'],
    ['seed: Georgian applicant compares with the two surveys of their country', track.rows[0].scope === 'country'],
    [
      'seed: software-development reporters see Kraków at the detailed level, the rest merged',
      distribution.level === 'detailed' &&
        distribution.total === 5 &&
        distribution.cities.length === 1 &&
        distribution.cities[0].city === 'Kraków' &&
        distribution.cities[0].count === 3 &&
        distribution.otherCount === 2,
    ],
  ];
  for (const [label, ok] of checks) {
    if (ok) console.log(`PASS: ${label}`);
    else {
      failed += 1;
      console.error(`FAIL: ${label}`);
    }
  }
} catch (error) {
  failed += 1;
  console.error(`FAIL: seed.sql: ${error.message}`);
}

process.exit(failed > 0 ? 1 : 0);
