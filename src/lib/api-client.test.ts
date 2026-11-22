import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./telegram', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./telegram')>()),
  getTelegramInitData: vi.fn(() => 'signed-init-data'),
}));

import { updateResponse } from './api-client';

afterEach(() => vi.unstubAllGlobals());

describe('ApiClientError', () => {
  it('keeps the retry time of a score-change limit response', async () => {
    const retryAt = '2026-11-23T14:05:00Z';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({
          error: {
            code: 'EDIT_LIMIT_REACHED',
            message: 'Too many score changes in the last 24 hours. Try again later.',
            retryAt,
          },
        }),
      }),
    );

    await expect(updateResponse({ response: {} as never })).rejects.toMatchObject({
      status: 429,
      code: 'EDIT_LIMIT_REACHED',
      retryAt,
    });
  });
});
