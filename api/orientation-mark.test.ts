import { describe, expect, it, vi } from 'vitest';

import { apiErrorSchema, orientationMarkResultSchema } from '../shared/validation';
import {
  createOrientationMarkHandler,
  type OrientationMarkHandlerDependencies,
} from './orientation-mark';

const IDENTITY_HASH = 'a'.repeat(64);

type Request = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[] | undefined>;
};

type RpcResult = { data: unknown; error: { message: string; code?: string; details?: string | null } | null };

function createResponseDouble() {
  const state: { status?: number; body?: unknown; headers: Map<string, string | string[]> } = {
    headers: new Map(),
  };
  const response = {
    status(status: number) {
      state.status = status;
      return response;
    },
    json(body: unknown) {
      state.body = body;
      return response;
    },
    setHeader(name: string, value: string | string[]) {
      state.headers.set(name, value);
      return response;
    },
  };
  return { response, state };
}

function request(extra: Partial<Request> = {}): Request {
  return { method: 'GET', headers: {}, ...extra };
}

function dependencies(
  implementation: (name: string, parameters: Record<string, unknown>) => RpcResult = () => ({
    data: { mark: 72, n: 3, scores: null },
    error: null,
  }),
  overrides: Partial<OrientationMarkHandlerDependencies> = {},
): OrientationMarkHandlerDependencies {
  return {
    getClient: vi.fn(() => ({
      rpc: vi.fn((name, parameters) => Promise.resolve(implementation(name, parameters))),
    })),
    hashIdentity: vi.fn(() => IDENTITY_HASH),
    assertSameOriginWhenPresent: vi.fn(),
    requireTelegramIdentity: vi.fn(() => ({
      user: { id: 515151515, username: 'tester' },
      authDate: 1_700_000_000,
    })),
    ...overrides,
  };
}

function rpcCalls(deps: OrientationMarkHandlerDependencies) {
  const getClient = deps.getClient as unknown as {
    mock: {
      results: Array<{
        value: { rpc: { mock: { calls: Array<[string, Record<string, unknown>]> } } };
      }>;
    };
  };
  return getClient.mock.results.flatMap((result) => result.value.rpc.mock.calls);
}

describe('GET /api/orientation-mark', () => {
  it('rejects unsupported methods before doing work', async () => {
    const deps = dependencies();
    const handler = createOrientationMarkHandler(deps);
    const { response, state } = createResponseDouble();

    await handler(request({ method: 'POST' }), response);

    expect(state.status).toBe(405);
    expect(apiErrorSchema.parse(state.body)).toMatchObject({ error: { code: 'METHOD_NOT_ALLOWED' } });
    expect(deps.getClient).not.toHaveBeenCalled();
  });

  it('reads the caller’s mark and n without the holder score list', async () => {
    const deps = dependencies();
    const handler = createOrientationMarkHandler(deps);
    const { response, state } = createResponseDouble();

    await handler(request(), response);

    expect(state.status).toBe(200);
    expect(state.body).toEqual({ mark: 72, n: 3 });
    expect(orientationMarkResultSchema.parse(state.body)).toEqual({ mark: 72, n: 3 });
    expect(rpcCalls(deps)).toEqual([
      [
        'get_orientation_mark',
        { p_identity_hash: IDENTITY_HASH, p_intake_year: 2026, p_include_scores: false },
      ],
    ]);
    expect(deps.assertSameOriginWhenPresent).toHaveBeenCalledTimes(1);
  });

  it('returns the ascending holder scores only with the full distribution request', async () => {
    const deps = dependencies(() => ({ data: { mark: 72, n: 3, scores: [72, 80, 95] }, error: null }));
    const handler = createOrientationMarkHandler(deps);
    const { response, state } = createResponseDouble();

    await handler(request({ query: { distribution: '1' } }), response);

    expect(state.body).toEqual({ mark: 72, n: 3, scores: [72, 80, 95] });
    expect(rpcCalls(deps)[0]![1]).toMatchObject({ p_include_scores: true });
  });

  it('answers 404 for a caller without a 2026 Director survey', async () => {
    const deps = dependencies(() => ({ data: null, error: null }));
    const handler = createOrientationMarkHandler(deps);
    const { response, state } = createResponseDouble();

    await handler(request(), response);

    expect(state.status).toBe(404);
    expect(apiErrorSchema.parse(state.body)).toMatchObject({ error: { code: 'PROFILE_NOT_FOUND' } });
  });

  it('never forwards a score list without the full distribution request', async () => {
    const deps = dependencies(() => ({ data: { mark: 72, n: 2, scores: [72, 88] }, error: null }));
    const handler = createOrientationMarkHandler(deps);
    const { response, state } = createResponseDouble();

    await handler(request(), response);

    expect(state.status).toBe(200);
    expect(state.body).toEqual({ mark: 72, n: 2 });
  });

  it('refuses an RPC payload with an extra field or a mismatched score list', async () => {
    for (const data of [
      { mark: 72, n: 3, scores: null, identityHash: IDENTITY_HASH },
      { mark: 80, n: 3, scores: [72, 80, 95] },
    ]) {
      const deps = dependencies(() => ({ data, error: null }));
      const handler = createOrientationMarkHandler(deps);
      const { response, state } = createResponseDouble();

      await handler(request({ query: { distribution: '1' } }), response);

      expect(state.status).toBe(500);
      expect(apiErrorSchema.parse(state.body)).toMatchObject({ error: { code: 'INTERNAL_ERROR' } });
    }
  });

  it('maps an RPC failure onto an English server error', async () => {
    const deps = dependencies(() => ({ data: null, error: { message: 'boom' } }));
    const handler = createOrientationMarkHandler(deps);
    const { response, state } = createResponseDouble();

    await handler(request(), response);

    expect(state.status).toBe(500);
    expect(apiErrorSchema.parse(state.body)).toMatchObject({ error: { code: 'INTERNAL_ERROR' } });
  });
});
