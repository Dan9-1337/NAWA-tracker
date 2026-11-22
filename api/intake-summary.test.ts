import { afterEach, describe, expect, it, vi } from 'vitest';

import { createIntakeSummaryHandler } from './intake-summary';

const validEnvironment = {
  SUPABASE_URL: 'https://project.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key-that-is-at-least-32-characters',
  TELEGRAM_BOT_TOKEN: 'telegram-bot-token-that-is-at-least-32-characters',
  IDENTITY_PEPPER: 'identity-pepper-that-is-at-least-32-characters',
  APP_PUBLIC_URL: 'https://tracker.example',
  NODE_ENV: 'test',
} as const;

const ORIGIN = validEnvironment.APP_PUBLIC_URL;

function createResponse() {
  const state: { status?: number; body?: unknown; headers: Record<string, string | string[]> } = {
    headers: {},
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
      state.headers[name] = value;
    },
  };
  return { state, response };
}

/**
 * `realBoundaries` keeps the real same-origin check and Telegram identity verification, so the 401/403 tests
 * exercise the production helpers instead of a stub.
 */
type RpcResult = { data: unknown; error: { message: string } | null };

function setup({
  rpcResult = { data: { intakeYear: 2026, responseCount: 312 }, error: null },
  realBoundaries = false,
}: { rpcResult?: RpcResult; realBoundaries?: boolean } = {}) {
  const rpc = vi.fn().mockResolvedValue(rpcResult);
  const handler = createIntakeSummaryHandler(
    realBoundaries
      ? { getClient: vi.fn(() => ({ rpc })) as never }
      : {
          getClient: vi.fn(() => ({ rpc })) as never,
          assertSameOrigin: vi.fn(),
          requireTelegramIdentity: vi.fn(() => ({ user: { id: 424242424 }, authDate: 1_700_000_000 })),
        },
  );
  const send = (
    request: { body?: unknown; method?: string; headers?: Record<string, string> } = {},
    response = createResponse().response,
  ) =>
    handler(
      { body: {}, method: 'POST', ...request, headers: { origin: ORIGIN, ...request.headers } },
      response,
    );
  return { send, rpc };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('POST /api/intake-summary', () => {
  it('returns the active intake year and the valid response count', async () => {
    const { send, rpc } = setup();
    const { state, response } = createResponse();

    await send({}, response);

    expect(state.status).toBe(200);
    expect(state.body).toEqual({ intakeYear: 2026, responseCount: 312 });
    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith('get_intake_summary', {});
  });

  it('passes a count suppressed by the cohort floor through as null', async () => {
    const { send } = setup({ rpcResult: { data: { intakeYear: 2026, responseCount: null }, error: null } });
    const { state, response } = createResponse();

    await send({}, response);

    expect(state.status).toBe(200);
    expect(state.body).toEqual({ intakeYear: 2026, responseCount: null });
  });

  it('never forwards a count below the cohort floor', async () => {
    const { send } = setup({ rpcResult: { data: { intakeYear: 2026, responseCount: 9 }, error: null } });
    const { state, response } = createResponse();

    await send({}, response);

    expect(state.status).toBe(500);
    expect(JSON.stringify(state.body)).not.toContain('"responseCount"');
  });

  it('turns an RPC failure into a generic 500', async () => {
    const { send } = setup({ rpcResult: { data: null, error: { message: 'database exploded' } } });
    const { state, response } = createResponse();

    await send({}, response);

    expect(state.status).toBe(500);
    expect(state.body).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Wystąpił nieoczekiwany błąd.' },
    });
  });

  it('rejects a method other than POST with 405 and never calls the RPC', async () => {
    const { send, rpc } = setup();
    const { state, response } = createResponse();

    await send({ method: 'GET' }, response);

    expect(state.status).toBe(405);
    expect(state.headers.Allow).toBe('POST');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rejects a request body that is not an empty object', async () => {
    const { send, rpc } = setup();
    const { state, response } = createResponse();

    await send({ body: { intakeYear: 2025 } }, response);

    expect(state.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rejects a cross-origin request with 403 and never calls the RPC', async () => {
    for (const [key, value] of Object.entries(validEnvironment)) vi.stubEnv(key, value);
    const { send, rpc } = setup({ realBoundaries: true });
    const { state, response } = createResponse();

    await send({ headers: { origin: 'https://tracker.example.evil.test', authorization: 'tma x' } }, response);

    expect(state.status).toBe(403);
    expect(state.body).toMatchObject({ error: { code: 'INVALID_ORIGIN' } });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rejects a missing Telegram identity with 401 and never calls the RPC', async () => {
    for (const [key, value] of Object.entries(validEnvironment)) vi.stubEnv(key, value);
    const { send, rpc } = setup({ realBoundaries: true });
    const { state, response } = createResponse();

    await send({}, response);

    expect(state.status).toBe(401);
    expect(state.body).toMatchObject({ error: { code: 'UNAUTHORIZED' } });
    expect(rpc).not.toHaveBeenCalled();
  });
});
