import { describe, expect, it, vi } from 'vitest';

import { fineBuckets } from '../shared/test-statistics';
import { HttpError } from './_lib/errors';
import { signTelegramInitData } from './_lib/telegram-auth';
import {
  createResponsesHandler,
  type ResponsesHandlerDependencies,
} from './responses';
import { createCurrentResponseHandler } from './responses/current';
import { createStatisticsHandler } from './statistics';
import { createCohortOutcomesHandler } from './outcomes';

const BOT_TOKEN = 'test-bot-token-that-is-at-least-32-characters';
const IDENTITY_HASH = 'a'.repeat(64);
const USER_ID = 424242424;

const validForm = {
  intakeYear: 2026,
  hasPolishCitizenship: false,
  rankingCountry: 'UA',
  schoolCountry: 'UA',
  scholarshipTrack: 'nawa_director',
  studyRoute: 'direct_studies',
  targetUniversity: 'science-096',
  studyField: '0613',
  gradeBasis: 'final_certificate',
  applicantKind: 'school_leaver',
  averageGrade: 4.5,
  maximumGrade: 5,
  polishSchoolLevel: 'secondary',
  currentStatus: 'submitted',
  statusChangedAt: '2026-07-01',
} as const;

const statistics = {
  detailsAvailable: true,
  totalValidResponses: 20,
  sameTrackCount: 18,
  sameCountryCount: 12,
  groupResponseCount: 10,
  medianScore: 82.5,
  lowerScorePercentage: 40,
  rankPosition: 6,
  rankTotal: 10,
  trackWideMedian: 80,
  scoreBuckets: fineBuckets([1, 2, 3, 2, 2]),
  cohortScope: 'country',
  cohortGroupId: null,
} as const;

type Request = {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
};

function initDataHeader(userId = USER_ID) {
  const initData = signTelegramInitData(
    { user: JSON.stringify({ id: userId, username: 'tester' }) },
    BOT_TOKEN,
    1_700_000_000,
  );
  return { authorization: `tma ${initData}` };
}

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

function request(method: string, body: unknown = {}, userId = USER_ID): Request {
  return {
    method,
    body,
    headers: { origin: 'https://tracker.example', ...initDataHeader(userId) },
    socket: { remoteAddress: '203.0.113.9' },
  };
}

function responsesDependencies(
  rpcImplementation: (
    name: string,
    parameters: Record<string, unknown>,
  ) => { data: unknown; error: { message: string } | null } = (name) => {
    if (name === 'create_response_for_identity') {
      return { data: { created: true, statistics }, error: null };
    }
    if (name === 'update_current_response') {
      return { data: { updated: true, statistics }, error: null };
    }
    if (name === 'get_current_statistics') return { data: statistics, error: null };
    throw new Error(`Unexpected RPC: ${name}`);
  },
): ResponsesHandlerDependencies {
  return {
    getClient: vi.fn(() => ({
      rpc: vi.fn((name, parameters) => Promise.resolve(rpcImplementation(name, parameters))),
    })),
    deleteProfile: vi.fn(async () => 1),
    hashIdentity: vi.fn(() => IDENTITY_HASH),
    assertSameOrigin: vi.fn(),
    requireTelegramIdentity: vi.fn(() => ({
      user: { id: USER_ID, username: 'tester' },
      authDate: 1_700_000_000,
    })),
  };
}

describe('POST /api/responses', () => {
  it('rejects unsupported methods before doing work', async () => {
    const dependencies = responsesDependencies();
    const handler = createResponsesHandler(dependencies);
    const { response, state } = createResponseDouble();

    await handler(request('PATCH'), response);

    expect(state.status).toBe(405);
    expect(state.headers.get('Allow')).toBe('POST, PUT, DELETE');
    expect(dependencies.getClient).not.toHaveBeenCalled();
  });

  it('requires the configured Origin before create work', async () => {
    const dependencies = responsesDependencies();
    dependencies.assertSameOrigin = vi.fn(() => {
      throw new HttpError(403, 'INVALID_ORIGIN', 'Nieprawidłowe źródło żądania.');
    });
    const { response, state } = createResponseDouble();

    await createResponsesHandler(dependencies)(request('POST', { response: validForm }), response);

    expect(state.status).toBe(403);
  });

  it('creates a profile for the authenticated Telegram user', async () => {
    const calls: Array<[string, Record<string, unknown>]> = [];
    const dependencies = responsesDependencies((name, parameters) => {
      calls.push([name, parameters]);
      return { data: { created: true, statistics }, error: null };
    });
    const { response, state } = createResponseDouble();

    await createResponsesHandler(dependencies)(request('POST', { response: validForm }), response);

    expect(calls[0]?.[0]).toBe('create_response_for_identity');
    expect(calls[0]?.[1]).toMatchObject({
      p_identity_hash: IDENTITY_HASH,
      p_ranking_country: 'UA',
    });
    expect(JSON.stringify(calls[0]?.[1])).not.toContain(String(USER_ID));
    expect(JSON.stringify(calls[0]?.[1])).not.toContain('tester');
    expect(calls[0]?.[1]).not.toHaveProperty('p_telegram_username');
    expect(state.status).toBe(201);
    expect(state.body).toEqual({ created: true, statistics });
  });

  it('returns PROFILE_EXISTS when the Telegram user already has a profile', async () => {
    const dependencies = responsesDependencies(() => ({
      data: null,
      error: { message: 'profile_exists' },
    }));
    const { response, state } = createResponseDouble();

    await createResponsesHandler(dependencies)(request('POST', { response: validForm }), response);

    expect(state.status).toBe(409);
    expect(state.body).toEqual({
      error: { code: 'PROFILE_EXISTS', message: 'Ten profil Telegram ma już ankietę.' },
    });
  });

  it('returns PROFILE_EXISTS when a concurrent create hits the unique constraint', async () => {
    const dependencies = responsesDependencies(() => ({
      data: null,
      error: {
        code: '23505',
        message: 'duplicate key value violates unique constraint "responses_identity_hash_intake_year_key"',
      },
    }));
    const { response, state } = createResponseDouble();

    await createResponsesHandler(dependencies)(request('POST', { response: validForm }), response);

    expect(state.status).toBe(409);
    expect(state.body).toEqual({
      error: { code: 'PROFILE_EXISTS', message: 'Ten profil Telegram ma już ankietę.' },
    });
  });
});

describe('DELETE /api/responses', () => {
  it('deletes by identity hash and also drops the bot subscription of the same Telegram user', async () => {
    const dependencies = responsesDependencies();
    const { response, state } = createResponseDouble();

    await createResponsesHandler(dependencies)(request('DELETE'), response);

    expect(dependencies.deleteProfile).toHaveBeenCalledWith(IDENTITY_HASH, USER_ID);
    expect(state.status).toBe(200);
    expect(state.body).toEqual({ deleted: true });
  });

  it('answers 404 when nothing was deleted', async () => {
    const dependencies = { ...responsesDependencies(), deleteProfile: vi.fn(async () => 0) };
    const { response, state } = createResponseDouble();

    await createResponsesHandler(dependencies)(request('DELETE'), response);

    expect(state.status).toBe(404);
  });
});

describe('PUT /api/responses', () => {
  it('updates only through the authenticated Telegram user id', async () => {
    const calls: Array<[string, Record<string, unknown>]> = [];
    const dependencies = responsesDependencies((name, parameters) => {
      calls.push([name, parameters]);
      return { data: { updated: true, statistics }, error: null };
    });
    const { response, state } = createResponseDouble();

    await createResponsesHandler(dependencies)(request('PUT', { response: validForm }), response);

    expect(calls[0]?.[0]).toBe('update_current_response');
    expect(calls[0]?.[1]).toMatchObject({ p_identity_hash: IDENTITY_HASH });
    expect(state.status).toBe(200);
    expect(state.body).toEqual({ updated: true, statistics });
  });
});

describe('POST /api/responses/current', () => {
  it('requires the configured Origin before loading the profile', async () => {
    const handler = createCurrentResponseHandler({
      getClient: vi.fn(),
      assertSameOrigin: vi.fn(() => {
        throw new HttpError(403, 'INVALID_ORIGIN', 'Nieprawidłowe źródło żądania.');
      }),
      requireTelegramIdentity: vi.fn(),
    });
    const { response, state } = createResponseDouble();

    await handler(request('POST'), response);

    expect(state.status).toBe(403);
  });

  it('loads the owned profile for the Telegram user', async () => {
    const handler = createCurrentResponseHandler({
      getClient: vi.fn(() => ({
        rpc: vi.fn().mockResolvedValue({
          data: validForm,
          error: null,
        }),
      })),
      assertSameOrigin: vi.fn(),
      hashIdentity: vi.fn(() => IDENTITY_HASH),
      requireTelegramIdentity: vi.fn(() => ({
        user: { id: USER_ID, username: 'tester' },
        authDate: 1_700_000_000,
      })),
    });
    const { response, state } = createResponseDouble();

    await handler(request('POST'), response);

    expect(state.status).toBe(200);
    expect(state.body).toEqual({ response: validForm });
  });
});

describe('POST /api/statistics', () => {
  it('requires the configured Origin before returning statistics', async () => {
    const handler = createStatisticsHandler({
      getClient: vi.fn(),
      assertSameOrigin: vi.fn(() => {
        throw new HttpError(403, 'INVALID_ORIGIN', 'Nieprawidłowe źródło żądania.');
      }),
      requireTelegramIdentity: vi.fn(),
    });
    const { response, state } = createResponseDouble();

    await handler(request('POST'), response);

    expect(state.status).toBe(403);
  });

  it('returns owned statistics for the Telegram user', async () => {
    const handler = createStatisticsHandler({
      getClient: vi.fn(() => ({
        rpc: vi.fn().mockResolvedValue({ data: statistics, error: null }),
      })),
      assertSameOrigin: vi.fn(),
      hashIdentity: vi.fn(() => IDENTITY_HASH),
      requireTelegramIdentity: vi.fn(() => ({
        user: { id: USER_ID },
        authDate: 1_700_000_000,
      })),
    });
    const { response, state } = createResponseDouble();

    await handler(request('POST'), response);

    expect(state.status).toBe(200);
    expect(state.body).toEqual(statistics);
  });
});

describe('POST /api/outcomes', () => {
  const outcomes = {
    ownCountry: 'UA',
    scope: 'country',
    groupId: null,
    awardedCount: 12,
    notAwardedCount: 4,
    awardedRate: 0.75,
    awardedBandLow: 70,
    awardedBandHigh: 80,
    notAwardedBandHigh: 70,
  };

  function handlerWith(data: unknown) {
    const rpc = vi.fn().mockResolvedValue({ data, error: null });
    const handler = createCohortOutcomesHandler({
      getClient: vi.fn(() => ({ rpc })),
      assertSameOrigin: vi.fn(),
      hashIdentity: vi.fn(() => IDENTITY_HASH),
      requireTelegramIdentity: vi.fn(() => ({ user: { id: USER_ID }, authDate: 1_700_000_000 })),
    });
    return { handler, rpc };
  }

  it('requires the configured Origin', async () => {
    const handler = createCohortOutcomesHandler({
      getClient: vi.fn(),
      assertSameOrigin: vi.fn(() => {
        throw new HttpError(403, 'INVALID_ORIGIN', 'Nieprawidłowe źródło żądania.');
      }),
      requireTelegramIdentity: vi.fn(),
    });
    const { response, state } = createResponseDouble();

    await handler(request('POST'), response);

    expect(state.status).toBe(403);
  });

  it('returns outcomes scoped to the authenticated Telegram user', async () => {
    const { handler, rpc } = handlerWith(outcomes);
    const { response, state } = createResponseDouble();

    await handler(request('POST'), response);

    expect(rpc).toHaveBeenCalledWith('get_cohort_outcomes', { p_identity_hash: IDENTITY_HASH, p_intake_year: 2026 });
    expect(state.status).toBe(200);
    expect(state.body).toEqual(outcomes);
  });

  it('answers 401 when the user has no profile', async () => {
    const { handler } = handlerWith(null);
    const { response, state } = createResponseDouble();

    await handler(request('POST'), response);

    expect(state.status).toBe(401);
  });

  it.each([
    ['details without a disclosed cohort', { scope: null, groupId: null }],
    ['a cohort below the awarded floor', { awardedCount: 2 }],
    ['an exact score instead of a 5-point band', { awardedBandLow: 72.3 }],
  ])('refuses to forward %s', async (_label, patch) => {
    const { handler } = handlerWith({ ...outcomes, ...patch });
    const { response, state } = createResponseDouble();

    await handler(request('POST'), response);

    expect(state.status).toBe(500);
    expect(JSON.stringify(state.body)).not.toContain('72.3');
  });

  it('drops unknown fields from the RPC payload instead of exposing them', async () => {
    const { handler } = handlerWith({ ...outcomes, debug: 'secret', minScore: 70.4 });
    const { response, state } = createResponseDouble();

    await handler(request('POST'), response);

    expect(state.status).toBe(200);
    expect(state.body).toEqual(outcomes);
  });
});
