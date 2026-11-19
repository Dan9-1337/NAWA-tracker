import { describe, expect, it, vi } from 'vitest';

import { createProductEventsHandler } from './product-events';

const IDENTITY_HASH = 'b'.repeat(64);

function setup() {
  const insert = vi.fn().mockResolvedValue({ error: null });
  const handler = createProductEventsHandler({
    getClient: vi.fn(() => ({ from: vi.fn(() => ({ insert })) })) as never,
    assertSameOrigin: vi.fn(),
    hashIdentity: vi.fn(() => IDENTITY_HASH),
    requireTelegramIdentity: vi.fn(() => ({ user: { id: 424242424, username: 'tester' }, authDate: 1_700_000_000 })),
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
  const send = (body: unknown) => handler({ method: 'POST', body, headers: {} }, response);
  return { send, insert, state };
}

describe('POST /api/product-events', () => {
  it('stores a plain event under the identity hash, never the Telegram id', async () => {
    const { send, insert, state } = setup();

    await send({ eventName: 'score_viewed' });

    expect(state.status).toBe(200);
    expect(insert).toHaveBeenCalledWith({ identity_hash: IDENTITY_HASH, event_name: 'score_viewed', payload: {} });
    expect(JSON.stringify(insert.mock.calls)).not.toContain('424242424');
  });

  it('accepts the status transition payload only', async () => {
    const { send, insert } = setup();

    await send({ eventName: 'status_updated', payload: { from: 'submitted', to: 'formal_review_positive' } });

    expect(insert).toHaveBeenCalledWith({
      identity_hash: IDENTITY_HASH,
      event_name: 'status_updated',
      payload: { from: 'submitted', to: 'formal_review_positive' },
    });
  });

  it.each([
    ['free text on a plain event', { eventName: 'score_viewed', payload: { query: 'warsaw' } }],
    ['an unknown event', { eventName: 'university_search_no_results', payload: { query: 'warsaw' } }],
    ['extra payload fields', { eventName: 'status_updated', payload: { from: 'submitted', to: 'merit_review_positive', note: 'hi' } }],
    ['a free-text status', { eventName: 'status_updated', payload: { from: 'submitted', to: 'whatever' } }],
  ])('rejects %s', async (_label, body) => {
    const { send, insert, state } = setup();

    await send(body);

    expect(state.status).toBe(400);
    expect(insert).not.toHaveBeenCalled();
  });
});
