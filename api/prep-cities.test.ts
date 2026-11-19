import { describe, expect, it, vi } from 'vitest';

import { HttpError } from './_lib/errors';
import { createPrepCitiesHandler } from './prep-cities';

const IDENTITY_HASH = 'c'.repeat(64);

const distribution = {
  studyField: '0613',
  level: 'detailed',
  groupCode: '0613',
  total: 6,
  cities: [{ city: 'Łódź', count: 4 }],
  otherCount: 2,
};

function setup(data: unknown) {
  const rpc = vi.fn().mockResolvedValue({ data, error: null });
  const handler = createPrepCitiesHandler({
    getClient: vi.fn(() => ({ rpc })),
    assertSameOrigin: vi.fn(),
    hashIdentity: vi.fn(() => IDENTITY_HASH),
    requireTelegramIdentity: vi.fn(() => ({ user: { id: 424242424 }, authDate: 1_700_000_000 })),
  });
  const state: { status?: number; body?: unknown } = {};
  const response = {
    status(status: number) {
      state.status = status;
      return response;
    },
    json(body: unknown) {
      state.body = body;
      return response;
    },
    setHeader: vi.fn(),
  };
  const post = () => handler({ method: 'POST', body: {}, headers: {} }, response);
  return { post, rpc, state };
}

describe('POST /api/prep-cities', () => {
  it('returns the distribution scoped to the authenticated account and the active intake year', async () => {
    const { post, rpc, state } = setup(distribution);

    await post();

    expect(rpc).toHaveBeenCalledWith('get_prep_city_distribution', { p_identity_hash: IDENTITY_HASH, p_intake_year: 2026 });
    expect(state.status).toBe(200);
    expect(state.body).toEqual(distribution);
  });

  it('passes an undisclosed result through', async () => {
    const empty = { studyField: 'other', level: null, groupCode: null, total: 0, cities: [], otherCount: 0 };
    const { post, state } = setup(empty);

    await post();

    expect(state.body).toEqual(empty);
  });

  it('answers 401 when the account has no record', async () => {
    const { post, state } = setup(null);

    await post();

    expect(state.status).toBe(401);
  });

  it('requires the configured Origin', async () => {
    const handler = createPrepCitiesHandler({
      getClient: vi.fn(),
      assertSameOrigin: vi.fn(() => {
        throw new HttpError(403, 'INVALID_ORIGIN', 'Nieprawidłowe źródło żądania.');
      }),
      requireTelegramIdentity: vi.fn(),
    });
    const state: { status?: number } = {};
    const response = { status: (s: number) => ((state.status = s), response), json: vi.fn(), setHeader: vi.fn() };

    await handler({ method: 'POST', body: {}, headers: {} }, response);

    expect(state.status).toBe(403);
  });

  it.each([
    ['a city below the disclosure floor', { cities: [{ city: 'Łódź', count: 2 }], total: 4, otherCount: 2 }],
    ['counts that do not add up', { total: 9 }],
    ['an unknown city', { cities: [{ city: 'Atlantis', count: 4 }] }],
    ['details without a disclosed level', { level: null }],
  ])('refuses to forward %s', async (_label, patch) => {
    const { post, state } = setup({ ...distribution, ...patch });

    await post();

    expect(state.status).toBe(500);
  });

  it('drops unknown fields, also inside city entries, instead of exposing them', async () => {
    const { post, state } = setup({
      ...distribution,
      debug: 'secret',
      cities: [{ city: 'Łódź', count: 4, userIds: [1] }],
    });

    await post();

    expect(state.status).toBe(200);
    expect(state.body).toEqual(distribution);
  });
});
