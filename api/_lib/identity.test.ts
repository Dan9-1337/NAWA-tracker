import { describe, expect, it } from 'vitest';

import { hashTelegramId } from './identity';

const PEPPER = 'identity-pepper-that-is-at-least-32-characters';

describe('hashTelegramId', () => {
  it('is a stable 64-character hex digest', () => {
    const hash = hashTelegramId(900000001, PEPPER);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashTelegramId(900000001, PEPPER)).toBe(hash);
  });

  it('differs per account and per pepper, and never contains the raw id', () => {
    const hash = hashTelegramId(900000001, PEPPER);
    expect(hashTelegramId(900000002, PEPPER)).not.toBe(hash);
    expect(hashTelegramId(900000001, `${PEPPER}-other`)).not.toBe(hash);
    expect(hash).not.toContain('900000001');
  });

  it('matches the demo identity seeded by supabase/seed.sql for the local pepper', () => {
    expect(hashTelegramId(900000001, 'local-dev-identity-pepper-0000000001')).toBe(
      '64e4f43ec21ae61296d18dda409a9fb380c339c7f18dce2680e4ecc7a10b8f74',
    );
  });
});
