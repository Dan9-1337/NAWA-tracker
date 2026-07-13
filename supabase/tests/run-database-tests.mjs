import { readFile } from 'node:fs/promises';

import pg from 'pg';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('ERROR: DATABASE_URL is required to run PostgreSQL tests');
  process.exit(1);
}

const testFiles = [
  'supabase/tests/recovery_sessions.sql',
  'supabase/tests/statistics.sql',
];
const { Pool } = pg;
const pool = new Pool({ connectionString: databaseUrl, max: 1 });

try {
  for (const testFile of testFiles) {
    const sql = await readFile(new URL(`../../${testFile}`, import.meta.url), 'utf8');
    const results = await pool.query(sql);
    const values = (Array.isArray(results) ? results : [results]).flatMap((result) =>
      result.rows.flatMap((row) => Object.values(row)),
    );
    const tapLines = values.filter((value) => typeof value === 'string');
    const plan = tapLines.find((line) => /^1\.\.\d+$/.test(line));
    const failures = tapLines.filter((line) => /^not ok\b/.test(line));
    const assertions = tapLines.filter((line) => /^(?:not )?ok\b/.test(line));

    if (!plan) throw new Error(`${testFile} did not return a pgTAP plan`);
    const plannedAssertions = Number(plan.slice(3));
    if (assertions.length !== plannedAssertions) {
      throw new Error(
        `${testFile} returned ${assertions.length} of ${plannedAssertions} planned assertions`,
      );
    }
    if (failures.length > 0) {
      throw new Error(`${testFile} failed:\n${failures.join('\n')}`);
    }

    console.log(`PASS: ${testFile} (${plannedAssertions} pgTAP assertions)`);
  }
} finally {
  await pool.end();
}
