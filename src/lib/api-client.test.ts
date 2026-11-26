import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./telegram', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./telegram')>()),
  getTelegramInitData: vi.fn(() => 'signed-init-data'),
}));

import { updateResponse, getScholarshipReportSummary } from './api-client';

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

describe('orientation mark client', () => {
  it('asks for the holder score list only with the full distribution', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ mark: 72, n: 2, scores: [72, 88] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { getOrientationMark } = await import('./api-client');

    await expect(getOrientationMark(true)).resolves.toEqual({ mark: 72, n: 2, scores: [72, 88] });
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/orientation-mark?distribution=1',
      expect.objectContaining({ method: 'GET', body: undefined }),
    );

    await getOrientationMark();
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/orientation-mark',
      expect.objectContaining({ method: 'GET', body: undefined }),
    );
  });
});

describe('scholarship report client', () => {
  const summary = {
    total: 1,
    countries: [{ country: 'BY', count: 1 }],
    paths: [
      { route: 'preparatory_course', count: 1 },
      { route: 'direct_studies', count: 0 },
    ],
    centres: [{ centreId: 'umcs-lublin', count: 1 }],
    fields: [
      {
        group: '04',
        count: 1,
        programmes: [{ programmeId: 'prawo', programmeName: 'Prawo', count: 1 }],
      },
    ],
    typedProgrammeCount: 0,
    universities: [{ universityId: 'science-078', count: 1 }],
  };

  it('reads the filtered summary with GET and without a request body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => summary,
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(getScholarshipReportSummary('BY')).resolves.toEqual(summary);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/scholarship-report?summary=1&country=BY',
      expect.objectContaining({ method: 'GET', body: undefined }),
    );
  });
});
