import { describe, expect, it, vi } from 'vitest';

import { fineBuckets } from '../shared/test-statistics';
import { apiErrorSchema } from '../shared/validation';
import { HttpError } from './_lib/errors';
import { signTelegramInitData } from './_lib/telegram-auth';
import {
  createDeleteProfile,
  createResponsesHandler,
  type ResponsesHandlerDependencies,
} from './responses';
import { createCurrentResponseHandler } from './responses/current';
import { createStatisticsHandler } from './statistics';

const BOT_TOKEN = 'test-bot-token-that-is-at-least-32-characters';
const IDENTITY_HASH = 'a'.repeat(64);
const OTHER_IDENTITY_HASH = 'c'.repeat(64);
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
  groupResponseCount: 12,
  medianScore: 82.5,
  lowerScorePercentage: 40,
  rankPosition: 6,
  rankTotal: 12,
  trackWideMedian: null,
  scoreBuckets: fineBuckets([1, 2, 3, 3, 3]),
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

type FakeTable = 'responses' | 'product_events' | 'bot_subscriptions' | 'score_change_log';
type FakeRow = Record<string, unknown>;

/** In-memory Supabase double for the delete chain used by `createDeleteProfile`. */
function fakeAdminClient(seed: Record<FakeTable, FakeRow[]>) {
  const tables: Record<FakeTable, FakeRow[]> = {
    responses: seed.responses.map((row) => ({ ...row })),
    product_events: seed.product_events.map((row) => ({ ...row })),
    bot_subscriptions: seed.bot_subscriptions.map((row) => ({ ...row })),
    score_change_log: seed.score_change_log.map((row) => ({ ...row })),
  };
  const failures = new Set<FakeTable>();

  function deleteFrom(table: FakeTable) {
    const filters: Array<[string, unknown]> = [];
    let consumed = false;

    const run = () => {
      if (consumed) return { data: [], error: null };
      consumed = true;
      if (failures.has(table)) return { data: null, error: { message: `${table}_delete_failed` } };
      const rows = tables[table];
      const deleted = rows.filter((row) => filters.every(([column, value]) => row[column] === value));
      tables[table] = rows.filter((row) => !deleted.includes(row));
      return { data: deleted, error: null };
    };

    const builder = {
      eq(column: string, value: unknown) {
        filters.push([column, value]);
        return builder;
      },
      select() {
        return Promise.resolve(run());
      },
      then<TResult1 = { data: FakeRow[] | null; error: { message: string } | null }, TResult2 = never>(
        onfulfilled?:
          | ((value: { data: FakeRow[] | null; error: { message: string } | null }) => TResult1 | PromiseLike<TResult1>)
          | null,
        onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
      ) {
        return Promise.resolve(run()).then(onfulfilled, onrejected);
      },
    };
    return builder;
  }

  const client = {
    from(table: string) {
      if (
        table !== 'responses' &&
        table !== 'product_events' &&
        table !== 'bot_subscriptions' &&
        table !== 'score_change_log'
      ) {
        throw new Error(`Unexpected table: ${table}`);
      }
      return { delete: () => deleteFrom(table) };
    },
  };

  return { client, tables, failDelete: (table: FakeTable) => failures.add(table) };
}

function responsesDependencies(
  rpcImplementation: (
    name: string,
    parameters: Record<string, unknown>,
  ) => { data: unknown; error: { message: string; details?: string | null } | null } = (name) => {
    if (name === 'create_response_for_identity') {
      return { data: { created: true, statistics }, error: null };
    }
    if (name === 'update_current_response') {
      return { data: { updated: true, statistics }, error: null };
    }
    if (name === 'get_current_statistics') return { data: statistics, error: null };
    throw new Error(`Unexpected RPC: ${name}`);
  },
  /** The year `season_config` holds; the handler reads it through `get_active_intake_year` (ADR 0018). */
  activeIntakeYear = 2026,
): ResponsesHandlerDependencies {
  return {
    getClient: vi.fn(() => ({
      rpc: vi.fn((name, parameters) =>
        Promise.resolve(
          name === 'get_active_intake_year'
            ? { data: activeIntakeYear, error: null }
            : rpcImplementation(name, parameters),
        ),
      ),
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
      throw new HttpError(403, 'INVALID_ORIGIN', 'The request origin is not allowed.');
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
      error: { code: 'PROFILE_EXISTS', message: 'This Telegram account already has a survey.' },
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
      error: { code: 'PROFILE_EXISTS', message: 'This Telegram account already has a survey.' },
    });
  });

  it('returns 429 EDIT_LIMIT_REACHED with the retry time when the limit blocks a create', async () => {
    const retryAt = '2026-11-23T14:05:00Z';
    const dependencies = responsesDependencies(() => ({
      data: null,
      error: { message: 'edit_limit_reached', details: retryAt },
    }));
    const { response, state } = createResponseDouble();

    await createResponsesHandler(dependencies)(request('POST', { response: validForm }), response);

    expect(state.status).toBe(429);
    const body = {
      error: {
        code: 'EDIT_LIMIT_REACHED',
        message: 'Too many score changes in the last 24 hours. Try again later.',
        retryAt,
      },
    };
    expect(state.body).toEqual(body);
    expect(apiErrorSchema.parse(state.body)).toEqual(body);
  });

  it('accepts the year the database holds, whatever year the code was built for (ADR 0018)', async () => {
    const calls: Array<[string, Record<string, unknown>]> = [];
    const dependencies = responsesDependencies((name, parameters) => {
      calls.push([name, parameters]);
      return { data: { created: true, statistics }, error: null };
    }, 2027);
    const { response, state } = createResponseDouble();

    await createResponsesHandler(dependencies)(
      request('POST', { response: { ...validForm, intakeYear: 2027 } }),
      response,
    );

    expect(state.status).toBe(201);
    expect(calls.map(([name]) => name)).toEqual(['create_response_for_identity']);
    expect(calls[0]?.[1]).toMatchObject({ p_intake_year: 2027 });
  });

  it('rejects a create for a year other than the active one with INVALID_INTAKE_YEAR', async () => {
    const calls: string[] = [];
    const dependencies = responsesDependencies((name) => {
      calls.push(name);
      return { data: { created: true, statistics }, error: null };
    }, 2027);
    const { response, state } = createResponseDouble();

    await createResponsesHandler(dependencies)(request('POST', { response: validForm }), response);

    expect(state.status).toBe(400);
    expect(state.body).toMatchObject({ error: { code: 'INVALID_INTAKE_YEAR' } });
    expect(calls).toEqual([]);
  });

  it('fails with INTERNAL_ERROR when the active year cannot be read', async () => {
    const dependencies = responsesDependencies();
    dependencies.getClient = vi.fn(() => ({
      rpc: vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } }),
    }));
    const { response, state } = createResponseDouble();

    await createResponsesHandler(dependencies)(request('POST', { response: validForm }), response);

    expect(state.status).toBe(500);
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

  it('deletes responses, product events and the bot subscription, and leaves another user alone', async () => {
    const fake = fakeAdminClient({
      responses: [
        { id: 1, identity_hash: IDENTITY_HASH },
        { id: 2, identity_hash: OTHER_IDENTITY_HASH },
      ],
      product_events: [
        { event_name: 'landing_viewed', identity_hash: IDENTITY_HASH },
        { event_name: 'landing_viewed', identity_hash: OTHER_IDENTITY_HASH },
      ],
      bot_subscriptions: [{ telegram_user_id: USER_ID }, { telegram_user_id: USER_ID + 1 }],
      score_change_log: [
        { identity_hash: IDENTITY_HASH, counted: true },
        { identity_hash: OTHER_IDENTITY_HASH, counted: true },
      ],
    });
    const dependencies = {
      ...responsesDependencies(),
      deleteProfile: createDeleteProfile(() => fake.client as never),
    };
    const { response, state } = createResponseDouble();

    await createResponsesHandler(dependencies)(request('DELETE'), response);

    expect(state.status).toBe(200);
    expect(state.body).toEqual({ deleted: true });
    expect(fake.tables.responses).toEqual([{ id: 2, identity_hash: OTHER_IDENTITY_HASH }]);
    expect(fake.tables.product_events).toEqual([
      { event_name: 'landing_viewed', identity_hash: OTHER_IDENTITY_HASH },
    ]);
    expect(fake.tables.bot_subscriptions).toEqual([{ telegram_user_id: USER_ID + 1 }]);
    // Deleting the survey must not reset the score-change limit (ADR 0013).
    expect(fake.tables.score_change_log).toEqual([
      { identity_hash: IDENTITY_HASH, counted: true },
      { identity_hash: OTHER_IDENTITY_HASH, counted: true },
    ]);
  });

  it('deletes product events even when no survey exists, and still answers 404', async () => {
    const fake = fakeAdminClient({
      responses: [],
      product_events: [{ event_name: 'what_if_used', identity_hash: IDENTITY_HASH }],
      bot_subscriptions: [],
      score_change_log: [],
    });
    const dependencies = {
      ...responsesDependencies(),
      deleteProfile: createDeleteProfile(() => fake.client as never),
    };
    const { response, state } = createResponseDouble();

    await createResponsesHandler(dependencies)(request('DELETE'), response);

    expect(state.status).toBe(404);
    expect(fake.tables.product_events).toEqual([]);
  });

  it('fails the delete when removing the product events fails', async () => {
    const fake = fakeAdminClient({
      responses: [{ id: 1, identity_hash: IDENTITY_HASH }],
      product_events: [{ event_name: 'landing_viewed', identity_hash: IDENTITY_HASH }],
      bot_subscriptions: [{ telegram_user_id: USER_ID }],
      score_change_log: [],
    });
    fake.failDelete('product_events');
    const dependencies = {
      ...responsesDependencies(),
      deleteProfile: createDeleteProfile(() => fake.client as never),
    };
    const { response, state } = createResponseDouble();

    await createResponsesHandler(dependencies)(request('DELETE'), response);

    expect(state.status).toBe(500);
    expect(state.body).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
    });
    // The survey is still there, so the caller can retry the delete.
    expect(fake.tables.responses).toHaveLength(1);
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

  it('checks an edit against the year the database holds', async () => {
    const calls: Array<[string, Record<string, unknown>]> = [];
    const dependencies = responsesDependencies((name, parameters) => {
      calls.push([name, parameters]);
      return { data: { updated: true, statistics }, error: null };
    }, 2027);

    const accepted = createResponseDouble();
    await createResponsesHandler(dependencies)(
      request('PUT', { response: { ...validForm, intakeYear: 2027 } }),
      accepted.response,
    );
    expect(accepted.state.status).toBe(200);
    expect(calls.map(([name]) => name)).toEqual(['update_current_response']);

    const rejected = createResponseDouble();
    await createResponsesHandler(dependencies)(request('PUT', { response: validForm }), rejected.response);
    expect(rejected.state.status).toBe(400);
    expect(rejected.state.body).toMatchObject({ error: { code: 'INVALID_INTAKE_YEAR' } });
    expect(calls).toHaveLength(1);
  });

  it('returns 429 EDIT_LIMIT_REACHED with the retry time when the limit blocks an edit', async () => {
    const retryAt = '2026-11-23T14:05:00Z';
    const dependencies = responsesDependencies(() => ({
      data: null,
      error: { message: 'edit_limit_reached', details: retryAt },
    }));
    const { response, state } = createResponseDouble();

    await createResponsesHandler(dependencies)(request('PUT', { response: validForm }), response);

    expect(state.status).toBe(429);
    const body = {
      error: {
        code: 'EDIT_LIMIT_REACHED',
        message: 'Too many score changes in the last 24 hours. Try again later.',
        retryAt,
      },
    };
    expect(state.body).toEqual(body);
    expect(apiErrorSchema.parse(state.body)).toEqual(body);
  });
});

describe('POST /api/responses/current', () => {
  it('requires the configured Origin before loading the profile', async () => {
    const handler = createCurrentResponseHandler({
      getClient: vi.fn(),
      assertSameOrigin: vi.fn(() => {
        throw new HttpError(403, 'INVALID_ORIGIN', 'The request origin is not allowed.');
      }),
      requireTelegramIdentity: vi.fn(),
    });
    const { response, state } = createResponseDouble();

    await handler(request('POST'), response);

    expect(state.status).toBe(403);
  });

  /** An RPC double that answers the year lookup like the database does and records every other call. */
  function currentHandler(activeIntakeYear: number) {
    const calls: Array<[string, Record<string, unknown>]> = [];
    const rpc = vi.fn((name: string, parameters: Record<string, unknown>) => {
      if (name === 'get_active_intake_year') return Promise.resolve({ data: activeIntakeYear, error: null });
      calls.push([name, parameters]);
      return Promise.resolve({ data: { ...validForm, intakeYear: activeIntakeYear }, error: null });
    });
    const handler = createCurrentResponseHandler({
      getClient: vi.fn(() => ({ rpc })),
      assertSameOrigin: vi.fn(),
      hashIdentity: vi.fn(() => IDENTITY_HASH),
      requireTelegramIdentity: vi.fn(() => ({
        user: { id: USER_ID, username: 'tester' },
        authDate: 1_700_000_000,
      })),
    });
    return { handler, calls };
  }

  it('loads the owned profile for the Telegram user', async () => {
    const { handler, calls } = currentHandler(2026);
    const { response, state } = createResponseDouble();

    await handler(request('POST'), response);

    expect(state.status).toBe(200);
    expect(state.body).toEqual({ response: validForm });
    expect(calls).toEqual([['get_current_response', { p_identity_hash: IDENTITY_HASH, p_intake_year: 2026 }]]);
  });

  it('queries the year the database holds, not a year from the code (ADR 0018)', async () => {
    const { handler, calls } = currentHandler(2027);
    const { response, state } = createResponseDouble();

    await handler(request('POST'), response);

    expect(state.status).toBe(200);
    expect(calls[0]?.[1]).toMatchObject({ p_intake_year: 2027 });
    expect(state.body).toMatchObject({ response: { intakeYear: 2027 } });
  });
});

describe('POST /api/statistics', () => {
  it('requires the configured Origin before returning statistics', async () => {
    const handler = createStatisticsHandler({
      getClient: vi.fn(),
      assertSameOrigin: vi.fn(() => {
        throw new HttpError(403, 'INVALID_ORIGIN', 'The request origin is not allowed.');
      }),
      requireTelegramIdentity: vi.fn(),
    });
    const { response, state } = createResponseDouble();

    await handler(request('POST'), response);

    expect(state.status).toBe(403);
  });

  function statisticsHandler(activeIntakeYear: number) {
    const calls: Array<[string, Record<string, unknown>]> = [];
    const rpc = vi.fn((name: string, parameters: Record<string, unknown>) => {
      if (name === 'get_active_intake_year') return Promise.resolve({ data: activeIntakeYear, error: null });
      calls.push([name, parameters]);
      return Promise.resolve({ data: statistics, error: null });
    });
    const handler = createStatisticsHandler({
      getClient: vi.fn(() => ({ rpc })),
      assertSameOrigin: vi.fn(),
      hashIdentity: vi.fn(() => IDENTITY_HASH),
      requireTelegramIdentity: vi.fn(() => ({
        user: { id: USER_ID },
        authDate: 1_700_000_000,
      })),
    });
    return { handler, calls };
  }

  it('returns owned statistics for the Telegram user', async () => {
    const { handler, calls } = statisticsHandler(2026);
    const { response, state } = createResponseDouble();

    await handler(request('POST'), response);

    expect(state.status).toBe(200);
    expect(state.body).toEqual(statistics);
    expect(calls).toEqual([['get_current_statistics', { p_identity_hash: IDENTITY_HASH, p_intake_year: 2026 }]]);
  });

  it('scopes statistics to the year the database holds, not a year from the code (ADR 0018)', async () => {
    const { handler, calls } = statisticsHandler(2027);
    const { response, state } = createResponseDouble();

    await handler(request('POST'), response);

    expect(state.status).toBe(200);
    expect(calls[0]?.[1]).toMatchObject({ p_intake_year: 2027 });
  });
});
