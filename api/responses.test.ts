import { describe, expect, it, vi } from 'vitest';

import { HttpError } from './_lib/errors';
import { signTelegramInitData } from './_lib/telegram-auth';
import {
  createResponsesHandler,
  type ResponsesHandlerDependencies,
} from './responses';
import { createCurrentResponseHandler } from './responses/current';
import { createPublicStatisticsHandler } from './statistics/public';
import { createStatisticsHandler } from './statistics';

const BOT_TOKEN = 'test-bot-token-that-is-at-least-32-characters';
const USER_ID = 424242424;

const validForm = {
  hasPolishCitizenship: false,
  rankingCountry: 'Ukraina',
  schoolCountry: 'Ukraina',
  scholarshipTrack: 'nawa_director',
  studyRoute: 'direct_studies',
  averageGrade: 4.5,
  maximumGrade: 5,
  polishSchoolLevel: 'secondary',
  currentStatus: 'submitted',
  statusChangedAt: '2026-07-01',
} as const;

const statusCounts = {
  submitted: 2,
  formal_review_in_progress: 1,
  correction_requested: 0,
  formal_review_completed: 1,
  merit_review_in_progress: 1,
  merit_review_positive: 1,
  merit_review_negative: 1,
  awaiting_decision: 1,
  scholarship_awarded: 1,
  scholarship_not_awarded: 1,
} as const;

const statistics = {
  detailsAvailable: true,
  group: 'track-country',
  totalValidResponses: 20,
  sameTrackCount: 18,
  sameCountryCount: 12,
  groupResponseCount: 10,
  medianScore: 82.5,
  lowerScorePercentage: 40,
  statusCounts,
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
    if (name === 'create_response_for_telegram_user') {
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
    expect(state.headers.get('Allow')).toBe('POST, PUT');
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

    expect(calls[0]?.[0]).toBe('create_response_for_telegram_user');
    expect(calls[0]?.[1]).toMatchObject({
      p_telegram_user_id: USER_ID,
      p_telegram_username: 'tester',
      p_ranking_country: 'Ukraina',
    });
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
        message: 'duplicate key value violates unique constraint "responses_telegram_user_id_key"',
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
    expect(calls[0]?.[1]).toMatchObject({ p_telegram_user_id: USER_ID });
    expect(state.status).toBe(200);
    expect(state.body).toEqual({ updated: true, statistics });
  });
});

describe('POST /api/responses/current', () => {
  it('loads the owned profile for the Telegram user', async () => {
    const handler = createCurrentResponseHandler({
      getClient: vi.fn(() => ({
        rpc: vi.fn().mockResolvedValue({
          data: validForm,
          error: null,
        }),
      })),
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
  it('returns owned statistics for the Telegram user', async () => {
    const handler = createStatisticsHandler({
      getClient: vi.fn(() => ({
        rpc: vi.fn().mockResolvedValue({ data: statistics, error: null }),
      })),
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

describe('POST /api/statistics/public', () => {
  it('requires Telegram auth and returns cohort preview statistics', async () => {
    const handler = createPublicStatisticsHandler({
      getClient: vi.fn(() => ({
        rpc: vi.fn().mockResolvedValue({ data: statistics, error: null }),
      })),
      assertSameOrigin: vi.fn(),
      requireTelegramIdentity: vi.fn(() => ({
        user: { id: USER_ID },
        authDate: 1_700_000_000,
      })),
      getClientIp: vi.fn(() => '203.0.113.9'),
      hashIp: vi.fn(() => 'ip-hash'),
    });
    const { response, state } = createResponseDouble();

    await handler(
      request('POST', {
        scholarshipTrack: 'nawa_director',
        rankingCountry: 'Ukraina',
        averageGrade: 4.5,
        maximumGrade: 5,
        polishSchoolLevel: 'secondary',
      }),
      response,
    );

    expect(state.status).toBe(200);
    expect(state.body).toEqual(statistics);
  });
});
