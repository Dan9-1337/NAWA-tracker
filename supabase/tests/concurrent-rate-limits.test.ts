import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const scriptPath = resolve(process.cwd(), 'supabase/tests/concurrent-rate-limits.mjs');

describe('concurrent rate-limit database test', () => {
  it('fails clearly when DATABASE_URL is absent', () => {
    const env = { ...process.env };
    delete env.DATABASE_URL;

    const result = spawnSync(process.execPath, [scriptPath], {
      encoding: 'utf8',
      env,
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('ERROR: DATABASE_URL is required');
    expect(result.stdout).not.toContain('PASS:');
  });
});
