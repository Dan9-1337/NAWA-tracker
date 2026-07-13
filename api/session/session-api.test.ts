import { describe, expect, it, vi } from 'vitest';

import { HttpError } from '../_lib/errors';
import { createRotateRecoveryHandler, type RotateRecoveryDependencies } from '../recovery/rotate';
import { createLogoutHandler, type LogoutDependencies } from './logout';
import { createRestoreHandler, type RestoreDependencies } from './restore';

const recoveryToken = `${'R'.repeat(42)}Q`;
const replacementRecoveryToken = `${'N'.repeat(42)}g`;
const sessionToken = `${'S'.repeat(42)}w`;

const questionnaire = {
  scholarshipTrack: 'nawa_mnisw',
  studyRoute: 'direct_studies',
  studyType: 'first_cycle',
  country: 'Polska',
  gradeScale: 5,
  gradeValue: 4.5,
  university: 'Uniwersytet Warszawski',
  studyField: 'Informatyka',
  choicePriority: 'first_choice',
  applicationStatus: 'submitted',
} as const;

type Request = {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
};

function request(method: string, body: unknown = {}, headers: Request['headers'] = {}): Request {
  return {
    method,
    body,
    headers: { origin: 'https://tracker.example', ...headers },
    socket: { remoteAddress: '203.0.113.9' },
  };
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

function restoreDependencies(
  rpcImplementation: (
    name: string,
    parameters: Record<string, unknown>,
  ) => { data: unknown; error: { message: string } | null } = (name) => {
    if (name === 'restore_anonymous_session') {
      return { data: { restored: true, rateLimited: false }, error: null };
    }
    if (name === 'get_current_response') return { data: questionnaire, error: null };
    throw new Error(`Unexpected RPC: ${name}`);
  },
): RestoreDependencies {
  return {
    getClient: vi.fn(() => ({
      rpc: vi.fn((name, parameters) => Promise.resolve(rpcImplementation(name, parameters))),
    })),
    assertSameOrigin: vi.fn(),
    verifyTurnstile: vi.fn().mockResolvedValue(undefined),
    getClientIp: vi.fn(() => '203.0.113.9'),
    hashIp: vi.fn(() => 'ip-hash'),
    generateOpaqueToken: vi.fn(() => sessionToken),
    hashRecoveryAttemptToken: vi.fn(() => 'recovery-hash'),
    hashSessionToken: vi.fn(() => 'session-hash'),
    setSessionCookie: vi.fn(),
    loadServerEnv: vi.fn(() => ({ sessionMaxAgeDays: 180 })),
    now: () => new Date('2026-07-13T12:00:00.000Z'),
  };
}

function rotationDependencies(
  rpcResult: { data: unknown; error: { message: string } | null } = { data: true, error: null },
): RotateRecoveryDependencies {
  return {
    getClient: vi.fn(() => ({ rpc: vi.fn().mockResolvedValue(rpcResult) })),
    assertSameOrigin: vi.fn(),
    requireSession: vi.fn().mockResolvedValue({
      responseId: '5b6fcd4b-bffe-4d8f-b1e8-e0f2cc1c66b0',
      sessionTokenHash: 'owned-session-hash',
    }),
    generateOpaqueToken: vi.fn(() => replacementRecoveryToken),
    hashRecoveryToken: vi.fn(() => 'new-recovery-hash'),
    loadServerEnv: vi.fn(() => ({ appPublicUrl: 'https://tracker.example' })),
  };
}

function logoutDependencies(
  rpcResult: { data: unknown; error: { message: string } | null } = { data: true, error: null },
): LogoutDependencies {
  return {
    getClient: vi.fn(() => ({ rpc: vi.fn().mockResolvedValue(rpcResult) })),
    assertSameOrigin: vi.fn(),
    clearSessionCookie: vi.fn(),
    readCookie: vi.fn(() => sessionToken),
    hashSessionToken: vi.fn(() => 'presented-session-hash'),
    loadServerEnv: vi.fn(() => ({ sessionCookieName: 'anonymous_session' })),
  };
}

describe('POST /api/session/restore', () => {
  it('returns Allow and performs no recovery work for unsupported methods', async () => {
    const dependencies = restoreDependencies();
    const { response, state } = createResponseDouble();

    await createRestoreHandler(dependencies)(request('GET'), response);

    expect(state.status).toBe(405);
    expect(state.headers.get('Allow')).toBe('POST');
    expect(dependencies.assertSameOrigin).not.toHaveBeenCalled();
    expect(dependencies.getClient).not.toHaveBeenCalled();
  });

  it('rejects malformed JSON and oversized bodies before Turnstile or database work', async () => {
    const dependencies = restoreDependencies();
    const handler = createRestoreHandler(dependencies);

    for (const [body, status] of [
      ['{"recoveryToken":', 400],
      ['x'.repeat(16 * 1024 + 1), 413],
    ] as const) {
      const result = createResponseDouble();
      await handler(request('POST', body), result.response);
      expect(result.state.status).toBe(status);
    }

    expect(dependencies.verifyTurnstile).not.toHaveBeenCalled();
    expect(dependencies.getClient).not.toHaveBeenCalled();
  });

  it('requires exact same-origin validation before parsing credentials', async () => {
    const dependencies = restoreDependencies();
    dependencies.assertSameOrigin = vi.fn(() => {
      throw new HttpError(403, 'INVALID_ORIGIN', 'Nieprawidłowe źródło żądania.');
    });
    const { response, state } = createResponseDouble();

    await createRestoreHandler(dependencies)(request('POST', '{'), response);

    expect(state.status).toBe(403);
    expect(dependencies.hashRecoveryAttemptToken).not.toHaveBeenCalled();
  });

  it('restores through hashed credentials, issues only the session cookie, and projects questionnaire fields', async () => {
    const calls: Array<[string, Record<string, unknown>]> = [];
    const dependencies = restoreDependencies((name, parameters) => {
      calls.push([name, parameters]);
      if (name === 'restore_anonymous_session') {
        return {
          data: { restored: true, rateLimited: false, recoveryToken: 'database-secret' },
          error: null,
        };
      }
      return {
        data: { ...questionnaire, responseId: crypto.randomUUID(), sessionTokenHash: 'private-hash' },
        error: null,
      };
    });
    const { response, state } = createResponseDouble();

    await createRestoreHandler(dependencies)(
      request('POST', { recoveryToken, turnstileToken: 'turnstile-proof' }),
      response,
    );

    expect(dependencies.verifyTurnstile).toHaveBeenCalledWith('turnstile-proof', '203.0.113.9');
    expect(calls).toEqual([
      [
        'restore_anonymous_session',
        {
          p_recovery_token_hash: 'recovery-hash',
          p_session_token_hash: 'session-hash',
          p_session_expires_at: '2027-01-09T12:00:00.000Z',
          p_ip_hash: 'ip-hash',
        },
      ],
      ['get_current_response', { p_session_token_hash: 'session-hash' }],
    ]);
    expect(dependencies.setSessionCookie).toHaveBeenCalledWith(response, sessionToken);
    expect(state.status).toBe(200);
    expect(state.body).toEqual({ response: questionnaire });
    expect(JSON.stringify(state.body)).not.toContain(recoveryToken);
    expect(JSON.stringify(state.body)).not.toContain(sessionToken);
    expect(JSON.stringify(state.body)).not.toContain('database-secret');
    expect(JSON.stringify(state.body)).not.toContain('private-hash');
  });

  it('returns one generic recovery error for canonical unknown credentials without leaking tokens', async () => {
    const dependencies = restoreDependencies((name) => {
      if (name === 'restore_anonymous_session') {
        return { data: { restored: false, rateLimited: false }, error: null };
      }
      throw new Error('current response must not be queried');
    });
    const { response, state } = createResponseDouble();

    await createRestoreHandler(dependencies)(
      request('POST', { recoveryToken, turnstileToken: 'proof' }),
      response,
    );

    expect(state.status).toBe(400);
    expect(state.body).toEqual({
      error: {
        code: 'RECOVERY_FAILED',
        message: 'Nie udało się odzyskać ankiety. Sprawdź kod i spróbuj ponownie.',
      },
    });
    expect(dependencies.setSessionCookie).not.toHaveBeenCalled();
    expect(JSON.stringify(state.body)).not.toContain(recoveryToken);
    expect(JSON.stringify(state.body)).not.toContain('recovery-hash');
  });

  it.each([
    ['short', 'short'],
    ['padded', `${'A'.repeat(42)}=`],
    ['noncanonical 43-character', `${'A'.repeat(42)}B`],
    ['unknown canonical', 'A'.repeat(43)],
  ])(
    'persists a restore attempt and returns the generic error for a %s recovery token',
    async (_label, invalidRecoveryToken) => {
      const rpcCalls: Array<[string, Record<string, unknown>]> = [];
      const dependencies = restoreDependencies((name, parameters) => {
        rpcCalls.push([name, parameters]);
        return { data: { restored: false, rateLimited: false }, error: null };
      });
      dependencies.hashRecoveryAttemptToken = vi.fn(() => `attempt-hash-${invalidRecoveryToken.length}`);
      const { response, state } = createResponseDouble();

      await createRestoreHandler(dependencies)(
        request('POST', { recoveryToken: invalidRecoveryToken, turnstileToken: 'proof' }),
        response,
      );

      expect(dependencies.verifyTurnstile).toHaveBeenCalledWith('proof', '203.0.113.9');
      expect(dependencies.hashRecoveryAttemptToken).toHaveBeenCalledWith(invalidRecoveryToken);
      expect(rpcCalls).toEqual([
        [
          'restore_anonymous_session',
          {
            p_recovery_token_hash: `attempt-hash-${invalidRecoveryToken.length}`,
            p_session_token_hash: 'session-hash',
            p_session_expires_at: '2027-01-09T12:00:00.000Z',
            p_ip_hash: 'ip-hash',
          },
        ],
      ]);
      expect(state.status).toBe(400);
      expect(state.body).toEqual({
        error: {
          code: 'RECOVERY_FAILED',
          message: 'Nie udało się odzyskać ankiety. Sprawdź kod i spróbuj ponownie.',
        },
      });
    },
  );

  it.each([
    ['missing', { turnstileToken: 'proof' }],
    ['non-string', { recoveryToken: 42, turnstileToken: 'proof' }],
  ])('rejects a %s recovery token before Turnstile and attempt persistence', async (_label, body) => {
    const dependencies = restoreDependencies();
    const { response, state } = createResponseDouble();

    await createRestoreHandler(dependencies)(request('POST', body), response);

    expect(state.status).toBe(400);
    expect(state.body).toMatchObject({ error: { code: 'INVALID_REQUEST' } });
    expect(dependencies.verifyTurnstile).not.toHaveBeenCalled();
    expect(dependencies.getClient).not.toHaveBeenCalled();
  });

  it('propagates the independent restore rate limit without issuing a cookie', async () => {
    const dependencies = restoreDependencies(() => ({
      data: { restored: false, rateLimited: true },
      error: null,
    }));
    const { response, state } = createResponseDouble();

    await createRestoreHandler(dependencies)(
      request('POST', { recoveryToken, turnstileToken: 'proof' }),
      response,
    );

    expect(state.status).toBe(429);
    expect(state.body).toEqual({
      error: {
        code: 'RECOVERY_RATE_LIMITED',
        message: 'Przekroczono limit prób odzyskiwania. Spróbuj ponownie później.',
      },
    });
    expect(dependencies.setSessionCookie).not.toHaveBeenCalled();
  });

  it('fails closed on malformed restore or questionnaire RPC results and leaks no generated credential', async () => {
    for (const rpcImplementation of [
      () => ({ data: { restored: true }, error: null }),
      (name: string) => name === 'restore_anonymous_session'
        ? { data: { restored: true, rateLimited: false }, error: null }
        : { data: { ...questionnaire, gradeValue: 9 }, error: null },
    ]) {
      const dependencies = restoreDependencies(rpcImplementation);
      const result = createResponseDouble();
      await createRestoreHandler(dependencies)(
        request('POST', { recoveryToken, turnstileToken: 'proof' }),
        result.response,
      );
      expect(result.state.status).toBe(500);
      expect(dependencies.setSessionCookie).not.toHaveBeenCalled();
      expect(JSON.stringify(result.state.body)).not.toContain(sessionToken);
      expect(JSON.stringify(result.state.body)).not.toContain(recoveryToken);
    }
  });
});

describe('POST /api/recovery/rotate', () => {
  it('enforces POST with Allow and strict bounded JSON bodies', async () => {
    const dependencies = rotationDependencies();
    const handler = createRotateRecoveryHandler(dependencies);

    for (const [method, body, status] of [
      ['GET', {}, 405],
      ['POST', '{', 400],
      ['POST', 'x'.repeat(16 * 1024 + 1), 413],
    ] as const) {
      const result = createResponseDouble();
      await handler(request(method, body), result.response);
      expect(result.state.status).toBe(status);
      if (status === 405) expect(result.state.headers.get('Allow')).toBe('POST');
    }

    expect(dependencies.requireSession).not.toHaveBeenCalled();
  });

  it('requires Origin and session ownership, replaces only the recovery hash, and returns the token once', async () => {
    const dependencies = rotationDependencies();
    const client = dependencies.getClient();
    const { response, state } = createResponseDouble();

    await createRotateRecoveryHandler({ ...dependencies, getClient: () => client })(request('POST'), response);

    expect(dependencies.assertSameOrigin).toHaveBeenCalled();
    expect(client.rpc).toHaveBeenCalledWith('rotate_recovery_token', {
      p_session_token_hash: 'owned-session-hash',
      p_new_recovery_token_hash: 'new-recovery-hash',
    });
    expect(state.status).toBe(200);
    expect(state.body).toEqual({
      recoveryToken: replacementRecoveryToken,
      recoveryUrl: `https://tracker.example/#restore=${replacementRecoveryToken}`,
    });
    expect(JSON.stringify(state.body)).not.toContain('owned-session-hash');
    expect(JSON.stringify(state.body)).not.toContain('new-recovery-hash');
  });

  it('invalidates the old recovery token while retaining all existing sessions', async () => {
    let activeRecoveryHash = 'old-recovery-hash';
    const sessions = new Set(['device-one-session', 'device-two-session']);
    const dependencies = rotationDependencies();
    dependencies.hashRecoveryToken = vi.fn((token) => token === replacementRecoveryToken
      ? 'new-recovery-hash'
      : 'old-recovery-hash');
    dependencies.getClient = vi.fn(() => ({
      rpc: vi.fn(async (name, parameters) => {
        if (name === 'rotate_recovery_token') {
          activeRecoveryHash = String(parameters.p_new_recovery_token_hash);
          return { data: true, error: null };
        }
        throw new Error(`Unexpected RPC: ${name}`);
      }),
    }));

    await createRotateRecoveryHandler(dependencies)(request('POST'), createResponseDouble().response);

    expect(activeRecoveryHash).toBe('new-recovery-hash');
    expect(activeRecoveryHash).not.toBe('old-recovery-hash');
    expect(sessions).toEqual(new Set(['device-one-session', 'device-two-session']));
  });

  it('fails closed when the rotation RPC result is not exactly true and does not leak the new token', async () => {
    for (const rpcResult of [
      { data: false, error: null },
      { data: { rotated: true }, error: null },
      { data: true, error: { message: `database error ${replacementRecoveryToken}` } },
    ]) {
      const dependencies = rotationDependencies(rpcResult);
      const result = createResponseDouble();
      await createRotateRecoveryHandler(dependencies)(request('POST'), result.response);
      expect([401, 500]).toContain(result.state.status);
      expect(JSON.stringify(result.state.body)).not.toContain(replacementRecoveryToken);
      expect(JSON.stringify(result.state.body)).not.toContain('new-recovery-hash');
    }
  });
});

describe('POST /api/session/logout', () => {
  it('enforces POST with Allow without clearing a cookie on unsupported methods', async () => {
    const dependencies = logoutDependencies();
    const { response, state } = createResponseDouble();

    await createLogoutHandler(dependencies)(request('GET'), response);

    expect(state.status).toBe(405);
    expect(state.headers.get('Allow')).toBe('POST');
    expect(dependencies.clearSessionCookie).not.toHaveBeenCalled();
  });

  it('rejects malformed and oversized bodies but always clears the cookie for valid-origin POST requests', async () => {
    const dependencies = logoutDependencies();
    const handler = createLogoutHandler(dependencies);

    for (const [body, status] of [
      ['{', 400],
      ['x'.repeat(16 * 1024 + 1), 413],
    ] as const) {
      const result = createResponseDouble();
      await handler(request('POST', body), result.response);
      expect(result.state.status).toBe(status);
      expect(dependencies.clearSessionCookie).toHaveBeenCalledWith(result.response);
    }

    expect(dependencies.getClient).not.toHaveBeenCalled();
  });

  it('validates Origin before clearing or revoking the session', async () => {
    const dependencies = logoutDependencies();
    dependencies.assertSameOrigin = vi.fn(() => {
      throw new HttpError(403, 'INVALID_ORIGIN', 'Nieprawidłowe źródło żądania.');
    });
    const { response, state } = createResponseDouble();

    await createLogoutHandler(dependencies)(request('POST'), response);

    expect(state.status).toBe(403);
    expect(dependencies.clearSessionCookie).not.toHaveBeenCalled();
    expect(dependencies.getClient).not.toHaveBeenCalled();
  });

  it('revokes only the hash of the presented session and clears its cookie', async () => {
    const dependencies = logoutDependencies();
    const client = dependencies.getClient();
    const { response, state } = createResponseDouble();

    await createLogoutHandler({ ...dependencies, getClient: () => client })(
      request('POST', {}, { cookie: `other=x; anonymous_session=${sessionToken}` }),
      response,
    );

    expect(dependencies.readCookie).toHaveBeenCalledWith(
      `other=x; anonymous_session=${sessionToken}`,
      'anonymous_session',
    );
    expect(client.rpc).toHaveBeenCalledWith('revoke_anonymous_session', {
      p_session_token_hash: 'presented-session-hash',
    });
    expect(dependencies.clearSessionCookie).toHaveBeenCalledWith(response);
    expect(state.status).toBe(200);
    expect(state.body).toEqual({ loggedOut: true });
    expect(JSON.stringify(state.body)).not.toContain(sessionToken);
  });

  it('is idempotent for absent, malformed, expired, revoked, and repeated sessions', async () => {
    for (const scenario of ['absent', 'malformed', 'expired', 'revoked', 'repeated'] as const) {
      const dependencies = logoutDependencies({ data: false, error: null });
      if (scenario === 'absent') dependencies.readCookie = vi.fn(() => null);
      if (scenario === 'malformed') {
        dependencies.hashSessionToken = vi.fn(() => {
          throw new Error('Invalid credential format');
        });
      }
      const result = createResponseDouble();

      await createLogoutHandler(dependencies)(request('POST'), result.response);

      expect(result.state.status).toBe(200);
      expect(result.state.body).toEqual({ loggedOut: true });
      expect(dependencies.clearSessionCookie).toHaveBeenCalledWith(result.response);
      if (scenario === 'absent' || scenario === 'malformed') {
        expect(dependencies.getClient).not.toHaveBeenCalled();
      }
    }
  });

  it('clears the cookie and fails closed without leaking token material on malformed or failed RPC results', async () => {
    for (const rpcResult of [
      { data: 'true', error: null },
      { data: null, error: { message: `database failure ${sessionToken}` } },
    ]) {
      const dependencies = logoutDependencies(rpcResult);
      const result = createResponseDouble();
      await createLogoutHandler(dependencies)(request('POST'), result.response);
      expect(result.state.status).toBe(500);
      expect(dependencies.clearSessionCookie).toHaveBeenCalledWith(result.response);
      expect(JSON.stringify(result.state.body)).not.toContain(sessionToken);
      expect(JSON.stringify(result.state.body)).not.toContain('presented-session-hash');
    }
  });
});
