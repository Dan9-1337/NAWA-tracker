import { describe, expect, it, vi } from 'vitest';

import { HttpError } from './_lib/errors';
import {
  createResponsesHandler,
  type ResponsesHandlerDependencies,
} from './responses';
import { createCurrentResponseHandler } from './responses/current';
import { createStatisticsHandler } from './statistics';

const validForm = {
  scholarshipTrack: 'nawa_mnisw',
  studyRoute: 'direct_studies',
  studyType: 'first_cycle',
  country: 'Polska',
  gradeScale: 'custom',
  customGradeScale: 7,
  gradeValue: 6,
  university: 'Uniwersytet Warszawski',
  studyField: 'Informatyka',
  choicePriority: 'first_choice',
  applicationStatus: 'submitted',
} as const;

const statistics = {
  detailsAvailable: true,
  group: 'track-route-type-university-field',
  totalValidResponses: 20,
  sameTrackCount: 18,
  sameUniversityCount: 12,
  sameUniversityAndFieldCount: 10,
  groupResponseCount: 10,
  medianGradePercentage: 82.5,
  lowerGradePercentage: 40,
  waitingForDecisionCount: 4,
  positiveDecisionCount: 5,
  negativeDecisionCount: 1,
} as const;

type Request = {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
};

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

function request(method: string, body: unknown = {}): Request {
  return {
    method,
    body,
    headers: { origin: 'https://tracker.example' },
    socket: { remoteAddress: '203.0.113.9' },
  };
}

function responsesDependencies(
  rpcImplementation: (
    name: string,
    parameters: Record<string, unknown>,
  ) => { data: unknown; error: { message: string } | null } = (name) => {
    if (name === 'create_response_with_session') {
      return { data: { created: true, statistics }, error: null };
    }
    if (name === 'update_current_response') {
      return { data: { updated: true, statistics }, error: null };
    }
    if (name === 'get_current_statistics') return { data: statistics, error: null };
    throw new Error(`Unexpected RPC: ${name}`);
  },
): ResponsesHandlerDependencies {
  const generatedTokens = [`${'R'.repeat(42)}Q`, `${'S'.repeat(42)}g`];
  return {
    getClient: vi.fn(() => ({
      rpc: vi.fn((name, parameters) => Promise.resolve(rpcImplementation(name, parameters))),
    })),
    assertSameOrigin: vi.fn(),
    verifyTurnstile: vi.fn().mockResolvedValue(undefined),
    getClientIp: vi.fn(() => '203.0.113.9'),
    hashIp: vi.fn(() => 'ip-hash'),
    generateOpaqueToken: vi.fn(() => generatedTokens.shift() ?? 'T'.repeat(43)),
    hashRecoveryToken: vi.fn(() => 'recovery-hash'),
    hashSessionToken: vi.fn(() => 'session-hash'),
    setSessionCookie: vi.fn(),
    requireSession: vi.fn().mockResolvedValue({
      responseId: '5b6fcd4b-bffe-4d8f-b1e8-e0f2cc1c66b0',
      sessionTokenHash: 'owned-session-hash',
    }),
    loadServerEnv: vi.fn(() => ({
      appPublicUrl: 'https://tracker.example',
      sessionMaxAgeDays: 180,
    })),
    now: () => new Date('2026-07-13T12:00:00.000Z'),
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
    expect(dependencies.assertSameOrigin).not.toHaveBeenCalled();
    expect(dependencies.getClient).not.toHaveBeenCalled();
  });

  it('rejects malformed JSON, oversized bodies, and identity selectors', async () => {
    const dependencies = responsesDependencies();
    const handler = createResponsesHandler(dependencies);

    for (const [body, expectedStatus] of [
      ['{"response":', 400],
      ['x'.repeat(16 * 1024 + 1), 413],
      [{ response: validForm, turnstileToken: 'proof', responseId: crypto.randomUUID() }, 400],
    ] as const) {
      const { response, state } = createResponseDouble();
      await handler(request('POST', body), response);
      expect(state.status).toBe(expectedStatus);
    }

    expect(dependencies.verifyTurnstile).not.toHaveBeenCalled();
    expect(dependencies.getClient).not.toHaveBeenCalled();
  });

  it('requires the configured Origin before create work', async () => {
    const dependencies = responsesDependencies();
    dependencies.assertSameOrigin = vi.fn(() => {
      throw new HttpError(403, 'INVALID_ORIGIN', 'Nieprawidłowe źródło żądania.');
    });
    const { response, state } = createResponseDouble();

    await createResponsesHandler(dependencies)(
      request('POST', { response: validForm, turnstileToken: 'proof' }),
      response,
    );

    expect(state.status).toBe(403);
    expect(dependencies.verifyTurnstile).not.toHaveBeenCalled();
  });

  it('rejects a university outside the canonical server allowlist', async () => {
    const dependencies = responsesDependencies();
    const { response, state } = createResponseDouble();

    await createResponsesHandler(dependencies)(
      request('POST', {
        response: { ...validForm, university: 'Uczelnia spoza listy' },
        turnstileToken: 'proof',
      }),
      response,
    );

    expect(state.status).toBe(400);
    expect(dependencies.verifyTurnstile).not.toHaveBeenCalled();
    expect(dependencies.getClient).not.toHaveBeenCalled();
  });

  it('creates response and first session atomically with normalized server arguments', async () => {
    const calls: Array<[string, Record<string, unknown>]> = [];
    const dependencies = responsesDependencies((name, parameters) => {
      calls.push([name, parameters]);
      return {
        data: {
          created: true,
          statistics: { ...statistics, internalId: crypto.randomUUID() },
          sessionTokenHash: 'must-not-leak',
        },
        error: null,
      };
    });
    const { response, state } = createResponseDouble();

    await createResponsesHandler(dependencies)(
      request('POST', { response: validForm, turnstileToken: 'turnstile-proof' }),
      response,
    );

    expect(dependencies.verifyTurnstile).toHaveBeenCalledWith('turnstile-proof', '203.0.113.9');
    expect(calls[0]).toEqual([
      'create_response_with_session',
      {
        p_recovery_token_hash: 'recovery-hash',
        p_session_token_hash: 'session-hash',
        p_session_expires_at: '2027-01-09T12:00:00.000Z',
        p_ip_hash: 'ip-hash',
        p_response_fingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
        p_scholarship_track: 'nawa_mnisw',
        p_study_route: 'direct_studies',
        p_study_type: 'first_cycle',
        p_country: 'Polska',
        p_grade_scale: 7,
        p_grade_value: 6,
        p_university: 'Uniwersytet Warszawski',
        p_study_field: 'Informatyka',
        p_choice_priority: 'first_choice',
        p_application_status: 'submitted',
        p_decision_date: null,
      },
    ]);
    expect(calls).toHaveLength(1);
    expect(dependencies.generateOpaqueToken).toHaveBeenCalledTimes(2);
    expect(dependencies.hashRecoveryToken).toHaveBeenCalledWith(`${'R'.repeat(42)}Q`);
    expect(dependencies.hashSessionToken).toHaveBeenCalledWith(`${'S'.repeat(42)}g`);
    expect(dependencies.setSessionCookie).toHaveBeenCalledWith(response, `${'S'.repeat(42)}g`);
    expect(state.status).toBe(201);
    expect(state.body).toEqual({
      created: true,
      recoveryToken: `${'R'.repeat(42)}Q`,
      recoveryUrl: `https://tracker.example/#restore=${`${'R'.repeat(42)}Q`}`,
      statistics,
    });
    expect(JSON.stringify(state.body)).not.toContain('session-hash');
    expect(JSON.stringify(state.body)).not.toContain('internalId');
    expect(JSON.stringify(state.body)).not.toContain('must-not-leak');
  });

  it('rejects invalid atomic mutation statistics before issuing either credential', async () => {
    const dependencies = responsesDependencies(() => ({
      data: {
        created: true,
        statistics: { ...statistics, sameUniversityCount: 2 },
        recoveryToken: 'database-secret',
      },
      error: null,
    }));
    const { response, state } = createResponseDouble();

    await createResponsesHandler(dependencies)(
      request('POST', { response: validForm, turnstileToken: 'proof' }),
      response,
    );

    expect(state.status).toBe(500);
    expect(dependencies.setSessionCookie).not.toHaveBeenCalled();
    expect(JSON.stringify(state.body)).not.toContain('database-secret');
    expect(JSON.stringify(state.body)).not.toContain('RRRR');
  });

  it('does not issue or leak credentials when the atomic create RPC fails', async () => {
    const dependencies = responsesDependencies(() => ({
      data: null,
      error: { message: 'database details containing session-hash' },
    }));
    const { response, state } = createResponseDouble();

    await createResponsesHandler(dependencies)(
      request('POST', { response: validForm, turnstileToken: 'proof' }),
      response,
    );

    expect(state.status).toBe(500);
    expect(dependencies.setSessionCookie).not.toHaveBeenCalled();
    expect(JSON.stringify(state.body)).not.toContain('session-hash');
    expect(JSON.stringify(state.body)).not.toContain('RRRR');
  });

  it('maps the atomic create limit to a stable 429 without issuing credentials', async () => {
    const dependencies = responsesDependencies(() => ({
      data: null,
      error: { message: 'create_rate_limited' },
    }));
    const { response, state } = createResponseDouble();

    await createResponsesHandler(dependencies)(
      request('POST', { response: validForm, turnstileToken: 'proof' }),
      response,
    );

    expect(state.status).toBe(429);
    expect(state.body).toEqual({
      error: {
        code: 'CREATE_RATE_LIMITED',
        message: 'Przekroczono limit nowych ankiet. Spróbuj ponownie później.',
      },
    });
    expect(dependencies.setSessionCookie).not.toHaveBeenCalled();
  });
});

describe('PUT /api/responses', () => {
  it('requires Origin and a session, but never invokes Turnstile', async () => {
    const dependencies = responsesDependencies();
    dependencies.requireSession = vi.fn().mockRejectedValue(
      new HttpError(401, 'UNAUTHORIZED', 'Sesja jest nieprawidłowa lub wygasła.'),
    );
    const { response, state } = createResponseDouble();

    await createResponsesHandler(dependencies)(request('PUT', { response: validForm }), response);

    expect(dependencies.assertSameOrigin).toHaveBeenCalled();
    expect(dependencies.verifyTurnstile).not.toHaveBeenCalled();
    expect(state.status).toBe(401);
  });

  it('updates only through the owned session hash and returns fresh projected statistics', async () => {
    const calls: Array<[string, Record<string, unknown>]> = [];
    const dependencies = responsesDependencies((name, parameters) => {
      calls.push([name, parameters]);
      return {
        data: {
          updated: true,
          statistics: { ...statistics, recovery_token_hash: 'must-not-leak' },
          responseId: crypto.randomUUID(),
        },
        error: null,
      };
    });
    const { response, state } = createResponseDouble();

    await createResponsesHandler(dependencies)(request('PUT', { response: validForm }), response);

    expect(calls[0]).toEqual([
      'update_current_response',
      {
        p_session_token_hash: 'owned-session-hash',
        p_scholarship_track: 'nawa_mnisw',
        p_study_route: 'direct_studies',
        p_study_type: 'first_cycle',
        p_country: 'Polska',
        p_grade_scale: 7,
        p_grade_value: 6,
        p_university: 'Uniwersytet Warszawski',
        p_study_field: 'Informatyka',
        p_choice_priority: 'first_choice',
        p_application_status: 'submitted',
        p_decision_date: null,
      },
    ]);
    expect(calls).toHaveLength(1);
    expect(state.body).toEqual({ updated: true, statistics });
    expect(JSON.stringify(state.body)).not.toContain('must-not-leak');
  });

  it('maps a session-owned update that no longer resolves to 401', async () => {
    const dependencies = responsesDependencies(() => ({ data: null, error: null }));
    const { response, state } = createResponseDouble();

    await createResponsesHandler(dependencies)(request('PUT', { response: validForm }), response);

    expect(state.status).toBe(401);
  });

  it('does not report update success when atomic mutation statistics are invalid', async () => {
    const dependencies = responsesDependencies(() => ({
      data: { updated: true, statistics: { ...statistics, groupResponseCount: -1 } },
      error: null,
    }));
    const { response, state } = createResponseDouble();

    await createResponsesHandler(dependencies)(request('PUT', { response: validForm }), response);

    expect(state.status).toBe(500);
    expect(state.body).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Wystąpił nieoczekiwany błąd.' },
    });
  });
});

describe('POST /api/responses/current', () => {
  it('accepts only POST with an empty strict body and requires a session', async () => {
    const getClient = vi.fn(() => ({ rpc: vi.fn() }));
    const requireSession = vi.fn().mockRejectedValue(
      new HttpError(401, 'UNAUTHORIZED', 'Sesja jest nieprawidłowa lub wygasła.'),
    );
    const handler = createCurrentResponseHandler({ getClient, requireSession });

    for (const [method, body, status] of [
      ['GET', {}, 405],
      ['POST', { responseId: crypto.randomUUID() }, 400],
      ['POST', {}, 401],
    ] as const) {
      const result = createResponseDouble();
      await handler(request(method, body), result.response);
      expect(result.state.status).toBe(status);
      if (status === 405) expect(result.state.headers.get('Allow')).toBe('POST');
    }
  });

  it('returns only schema-approved questionnaire fields from the owned RPC', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        ...validForm,
        id: crypto.randomUUID(),
        recovery_token_hash: 'private-hash',
        created_at: '2026-07-13T12:00:00Z',
      },
      error: null,
    });
    const handler = createCurrentResponseHandler({
      getClient: () => ({ rpc }),
      requireSession: vi.fn().mockResolvedValue({
        responseId: crypto.randomUUID(),
        sessionTokenHash: 'owned-session-hash',
      }),
    });
    const { response, state } = createResponseDouble();

    await handler(request('POST'), response);

    expect(rpc).toHaveBeenCalledWith('get_current_response', {
      p_session_token_hash: 'owned-session-hash',
    });
    expect(state.body).toEqual({ response: validForm });
    expect(JSON.stringify(state.body)).not.toContain('private-hash');
  });
});

describe('POST /api/statistics', () => {
  it('returns an Allow header for unsupported methods', async () => {
    const handler = createStatisticsHandler();
    const { response, state } = createResponseDouble();

    await handler(request('GET'), response);

    expect(state.status).toBe(405);
    expect(state.headers.get('Allow')).toBe('POST');
  });

  it('requires an empty body and an authenticated owned session', async () => {
    const handler = createStatisticsHandler({
      getClient: () => ({ rpc: vi.fn() }),
      requireSession: vi.fn().mockRejectedValue(
        new HttpError(401, 'UNAUTHORIZED', 'Sesja jest nieprawidłowa lub wygasła.'),
      ),
    });
    const invalidBodyResult = createResponseDouble();
    const unauthorizedResult = createResponseDouble();

    await handler(request('POST', { sessionToken: 'S'.repeat(43) }), invalidBodyResult.response);
    await handler(request('POST'), unauthorizedResult.response);

    expect(invalidBodyResult.state.status).toBe(400);
    expect(unauthorizedResult.state.status).toBe(401);
  });

  it('derives statistics from the cookie session and strips unapproved RPC fields', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { ...statistics, responseId: crypto.randomUUID(), sessionTokenHash: 'private-hash' },
      error: null,
    });
    const handler = createStatisticsHandler({
      getClient: () => ({ rpc }),
      requireSession: vi.fn().mockResolvedValue({
        responseId: crypto.randomUUID(),
        sessionTokenHash: 'owned-session-hash',
      }),
    });
    const { response, state } = createResponseDouble();

    await handler(request('POST'), response);

    expect(rpc).toHaveBeenCalledWith('get_current_statistics', {
      p_session_token_hash: 'owned-session-hash',
    });
    expect(state.body).toEqual(statistics);
    expect(JSON.stringify(state.body)).not.toContain('private-hash');
  });

  it('fails closed when outgoing RPC statistics violate the shared schema', async () => {
    const handler = createStatisticsHandler({
      getClient: () => ({
        rpc: vi.fn().mockResolvedValue({ data: { ...statistics, sameUniversityCount: 2 }, error: null }),
      }),
      requireSession: vi.fn().mockResolvedValue({
        responseId: crypto.randomUUID(),
        sessionTokenHash: 'owned-session-hash',
      }),
    });
    const { response, state } = createResponseDouble();

    await handler(request('POST'), response);

    expect(state.status).toBe(500);
    expect(state.body).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Wystąpił nieoczekiwany błąd.' },
    });
  });
});
