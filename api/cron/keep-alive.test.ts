import { describe, expect, it, vi } from 'vitest';

import { createKeepAliveHandler } from './keep-alive.js';

const CRON_SECRET = 'cron-secret-that-is-at-least-32-characters';

type Request = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
};

function createResponse() {
  const json = vi.fn();
  const response = {
    status: vi.fn(function status(this: unknown) {
      return response;
    }),
    json,
    setHeader: vi.fn(),
  };
  return { response, json };
}

function createClient(error: { message: string } | null = null) {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        limit: vi.fn(async () => ({ data: [], error })),
      })),
    })),
  };
}

describe('GET /api/cron/keep-alive', () => {
  it('rejects requests without a valid cron secret', async () => {
    const { response, json } = createResponse();
    const handler = createKeepAliveHandler({
      getCronSecret: () => CRON_SECRET,
      getClient: () => createClient() as never,
    });

    await handler({ method: 'GET', headers: {} }, response);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({
      error: { code: 'UNAUTHORIZED', message: 'Sesja jest nieprawidłowa lub wygasła.' },
    });
  });

  it('pings Supabase when authorized', async () => {
    const client = createClient();
    const { response, json } = createResponse();
    const handler = createKeepAliveHandler({
      getCronSecret: () => CRON_SECRET,
      getClient: () => client as never,
    });

    await handler(
      { method: 'GET', headers: { authorization: `Bearer ${CRON_SECRET}` } },
      response,
    );

    expect(client.from).toHaveBeenCalledWith('responses');
    expect(response.status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({ ok: true });
  });

  it('returns a generic error when the database ping fails', async () => {
    const { response, json } = createResponse();
    const handler = createKeepAliveHandler({
      getCronSecret: () => CRON_SECRET,
      getClient: () => createClient({ message: 'connection failed' }) as never,
    });

    await handler(
      { method: 'GET', headers: { authorization: `Bearer ${CRON_SECRET}` } },
      response,
    );

    expect(response.status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      error: { code: 'INTERNAL_ERROR', message: 'Wystąpił nieoczekiwany błąd.' },
    });
  });
});
