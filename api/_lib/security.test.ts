import { Buffer } from 'node:buffer';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearSessionCookie, readCookie, setSessionCookie } from './cookies';
import { loadServerEnv } from './env';
import { HttpError, normalizeError } from './errors';
import { assertMethod, parseJsonBody, sendError } from './http';
import { getClientIp, hashIp } from './ip';
import { assertSameOrigin } from './origin';
import { requireSession } from './session';
import {
  buildRecoveryUrl,
  generateOpaqueToken,
  hashRecoveryAttemptToken,
  hashRecoveryToken,
  hashSessionToken,
} from './tokens';
import { verifyTurnstile } from './turnstile';
import { z } from 'zod';

const validEnvironment = {
  SUPABASE_URL: 'https://project.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key-that-is-at-least-32-characters',
  TURNSTILE_SECRET_KEY: 'turnstile-secret-that-is-at-least-32-characters',
  RECOVERY_HMAC_SECRET: 'recovery-secret-that-is-at-least-32-characters',
  SESSION_HMAC_SECRET: 'session-secret-that-is-at-least-32-characters',
  IP_HASH_SALT: 'ip-hash-salt-that-is-at-least-32-characters',
  SESSION_COOKIE_NAME: 'anonymous_session',
  SESSION_MAX_AGE_DAYS: '180',
  APP_PUBLIC_URL: 'https://tracker.example',
  NODE_ENV: 'test',
} as const;

function stubEnvironment() {
  for (const [key, value] of Object.entries(validEnvironment)) {
    vi.stubEnv(key, value);
  }
}

function responseHeaders() {
  const headers = new Map<string, string | string[]>();

  return {
    headers,
    response: {
      setHeader(name: string, value: string | string[]) {
        headers.set(name, value);
      },
    },
  };
}

beforeEach(stubEnvironment);
afterEach(() => vi.unstubAllEnvs());

describe('server environment', () => {
  it('parses and normalizes all security configuration', () => {
    expect(loadServerEnv(validEnvironment)).toMatchObject({
      supabaseUrl: 'https://project.supabase.co',
      sessionCookieName: 'anonymous_session',
      sessionMaxAgeDays: 180,
      appOrigin: 'https://tracker.example',
      isProduction: false,
    });
  });

  it('rejects missing or unsafe security configuration without echoing values', () => {
    const unsafe = {
      ...validEnvironment,
      SESSION_HMAC_SECRET: 'raw-secret',
      APP_PUBLIC_URL: 'not a url',
    };

    expect(() => loadServerEnv(unsafe)).toThrow('Invalid server environment');

    try {
      loadServerEnv(unsafe);
    } catch (error) {
      expect(JSON.stringify(normalizeError(error).body)).not.toContain('raw-secret');
    }
  });

  it.each([
    ['SESSION_HMAC_SECRET', 'RECOVERY_HMAC_SECRET'],
    ['SESSION_HMAC_SECRET', 'IP_HASH_SALT'],
    ['RECOVERY_HMAC_SECRET', 'IP_HASH_SALT'],
  ] as const)('rejects equal %s and %s values', (first, second) => {
    expect(() =>
      loadServerEnv({
        ...validEnvironment,
        [second]: validEnvironment[first],
      }),
    ).toThrow('Invalid server environment');
  });

  it.each(['https://bad_host.example', 'https://-bad.example', 'https://bad-.example'])(
    'rejects an invalid APP_PUBLIC_URL hostname: %s',
    (appPublicUrl) => {
      expect(() => loadServerEnv({ ...validEnvironment, APP_PUBLIC_URL: appPublicUrl })).toThrow(
        'Invalid server environment',
      );
    },
  );

  it.each([
    'https://user@tracker.example',
    'https://user:password@tracker.example',
    'https://tracker.example?source=unsafe',
    'https://tracker.example/#unsafe',
    'https://tracker.example?',
    'https://tracker.example/#',
  ])('rejects APP_PUBLIC_URL with credentials, query, or fragment: %s', (appPublicUrl) => {
    expect(() => loadServerEnv({ ...validEnvironment, APP_PUBLIC_URL: appPublicUrl })).toThrow(
      'Invalid server environment',
    );
  });

  it('accepts a valid IPv6 APP_PUBLIC_URL during local development', () => {
    expect(
      loadServerEnv({ ...validEnvironment, APP_PUBLIC_URL: 'http://[::1]:5173' }),
    ).toMatchObject({ appOrigin: 'http://[::1]:5173', isLocalDevelopment: true });
  });

  it('rejects an HTTP Supabase URL in production', () => {
    expect(() =>
      loadServerEnv({
        ...validEnvironment,
        NODE_ENV: 'production',
        SUPABASE_URL: 'http://127.0.0.1:54321',
      }),
    ).toThrow('Invalid server environment');
  });

  it.each([
    { NODE_ENV: 'production' as const },
    { NODE_ENV: 'production' as const, VERCEL: '1' as const, VERCEL_ENV: 'production' as const },
  ])('rejects an HTTP APP_PUBLIC_URL in production: %j', (deployment) => {
    expect(() =>
      loadServerEnv({
        ...validEnvironment,
        ...deployment,
        APP_PUBLIC_URL: 'http://tracker.example',
      }),
    ).toThrow('Invalid server environment');
  });

  it.each(['development', 'test'] as const)(
    'permits a local HTTP APP_PUBLIC_URL in %s',
    (nodeEnv) => {
      expect(
        loadServerEnv({
          ...validEnvironment,
          NODE_ENV: nodeEnv,
          APP_PUBLIC_URL: 'http://localhost:5173',
        }),
      ).toMatchObject({
        appOrigin: 'http://localhost:5173',
        appHostname: 'localhost',
        isLocalDevelopment: true,
      });
    },
  );

  it('uses Vercel deployment mode instead of NODE_ENV to classify previews', () => {
    expect(
      loadServerEnv({
        ...validEnvironment,
        NODE_ENV: 'production',
        VERCEL_ENV: 'preview',
      }),
    ).toMatchObject({ isVercel: true, isProduction: false, isLocalDevelopment: false });
  });

  it.each([
    { NODE_ENV: 'prod' },
    { VERCEL_ENV: 'staging' },
    { VERCEL: 'true' },
  ])('rejects malformed deployment mode configuration: %j', (deployment) => {
    expect(() => loadServerEnv({ ...validEnvironment, ...deployment })).toThrow(
      'Invalid server environment',
    );
  });
});

describe('opaque credentials', () => {
  it('generates canonical tokens that decode to exactly 32 bytes', () => {
    const first = generateOpaqueToken();
    const second = generateOpaqueToken();

    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(Buffer.from(first, 'base64url')).toHaveLength(32);
    expect(second).not.toBe(first);
  });

  it('separates recovery, session, and IP hash domains', () => {
    const token = generateOpaqueToken();
    const ip = '203.0.113.9';

    expect(new Set([hashRecoveryToken(token), hashSessionToken(token), hashIp(ip)])).toHaveLength(3);
  });

  it.each([
    'short',
    `${'A'.repeat(42)}=`,
    `${'A'.repeat(42)}+`,
    `${'A'.repeat(42)}B`,
  ])('rejects malformed or non-canonical token %s', (token) => {
    expect(() => hashSessionToken(token)).toThrow('Invalid credential format');
    expect(() => hashRecoveryToken(token)).toThrow('Invalid credential format');
  });

  it.each(['short', `${'A'.repeat(42)}=`, `${'A'.repeat(42)}B`, 'A'.repeat(43)])(
    'hashes a bounded restore attempt without disclosing token format: %s',
    (token) => {
      expect(hashRecoveryAttemptToken(token)).toMatch(/^[a-f0-9]{64}$/);
      expect(hashRecoveryAttemptToken(token)).toBe(hashRecoveryAttemptToken(token));
    },
  );

  it('uses the canonical recovery hash for canonical restore attempts', () => {
    const token = 'A'.repeat(43);

    expect(hashRecoveryAttemptToken(token)).toBe(hashRecoveryToken(token));
  });

  it('builds an exact fragment URL from a validated application base path', () => {
    const token = 'A'.repeat(43);

    expect(buildRecoveryUrl('https://tracker.example/app', token)).toBe(
      `https://tracker.example/app/#restore=${token}`,
    );
    expect(buildRecoveryUrl('https://tracker.example/', token)).toBe(
      `https://tracker.example/#restore=${token}`,
    );
  });
});

describe('session cookies', () => {
  it('sets an HttpOnly development cookie without Secure', () => {
    const token = generateOpaqueToken();
    const { headers, response } = responseHeaders();

    setSessionCookie(response, token, {
      name: 'anonymous_session',
      maxAgeDays: 180,
      secure: false,
    });

    expect(headers.get('Set-Cookie')).toBe(
      `anonymous_session=${token}; Max-Age=15552000; Path=/; HttpOnly; SameSite=Lax`,
    );
  });

  it('sets Secure in production and clears with matching scope', () => {
    const token = generateOpaqueToken();
    const setResult = responseHeaders();
    const clearResult = responseHeaders();
    const config = { name: '__Host-anonymous_session', maxAgeDays: 30, secure: true };

    setSessionCookie(setResult.response, token, config);
    clearSessionCookie(clearResult.response, config);

    expect(setResult.headers.get('Set-Cookie')).toContain('; Secure');
    expect(clearResult.headers.get('Set-Cookie')).toBe(
      '__Host-anonymous_session=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax; Secure',
    );
  });

  it('parses only the requested cookie', () => {
    expect(readCookie('theme=dark; anonymous_session=secret-token; other=value', 'anonymous_session')).toBe(
      'secret-token',
    );
    expect(readCookie(undefined, 'anonymous_session')).toBeNull();
  });

  it.each([
    'anonymous_session=first; anonymous_session=second',
    'anonymous_session=%ZZ; anonymous_session=second',
  ])('rejects duplicate session cookies: %s', (cookieHeader) => {
    expect(readCookie(cookieHeader, 'anonymous_session')).toBeNull();
  });

  it('rejects array-valued Cookie headers', () => {
    expect(
      readCookie(['anonymous_session=first', 'anonymous_session=second'], 'anonymous_session'),
    ).toBeNull();
    expect(readCookie(['anonymous_session=only'], 'anonymous_session')).toBeNull();
  });

  it('rejects percent-encoded session cookie wire values', () => {
    const encodedCanonicalToken = `%41${'A'.repeat(42)}`;

    expect(readCookie(`anonymous_session=${encodedCanonicalToken}`, 'anonymous_session')).toBeNull();
  });

  it('does not mark Vercel preview cookies as production cookies', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VERCEL_ENV', 'preview');
    const { headers, response } = responseHeaders();

    setSessionCookie(response, generateOpaqueToken());

    expect(headers.get('Set-Cookie')).not.toContain('; Secure');
  });
});

describe('request boundaries', () => {
  it('enforces methods and strict JSON request bodies', () => {
    const schema = z.object({ value: z.string() }).strict();

    const methodResponse = responseHeaders().response;
    expect(() => assertMethod({ method: 'GET' }, methodResponse, 'POST')).toThrow(HttpError);
    expect(parseJsonBody({ body: '{"value":"ok"}' }, schema)).toEqual({ value: 'ok' });
    expect(() => parseJsonBody({ body: { value: 'ok', identity: 'secret' } }, schema)).toThrow(
      HttpError,
    );
  });

  it('sends normalized errors without internal details', () => {
    const status = vi.fn();
    const json = vi.fn();
    const response = {
      status: vi.fn(() => ({ status, json, setHeader: vi.fn() })),
      json,
      setHeader: vi.fn(),
    };

    sendError(response, new Error('database credentials leaked'));

    expect(response.status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      error: { code: 'INTERNAL_ERROR', message: 'Wystąpił nieoczekiwany błąd.' },
    });
  });

  it('accepts only the exact configured origin', () => {
    expect(() =>
      assertSameOrigin({ headers: { origin: 'https://tracker.example' } }, 'https://tracker.example'),
    ).not.toThrow();
    expect(() =>
      assertSameOrigin({ headers: { origin: 'https://tracker.example.evil.test' } }, 'https://tracker.example'),
    ).toThrow(HttpError);
    expect(() => assertSameOrigin({ headers: {} }, 'https://tracker.example')).toThrow(HttpError);
  });

  it.each([
    { origin: ['https://tracker.example'] },
    { origin: ['https://tracker.example', 'https://evil.example'] },
  ])('rejects array-valued Origin headers: $origin', ({ origin }) => {
    expect(() => assertSameOrigin({ headers: { origin } }, 'https://tracker.example')).toThrow(
      HttpError,
    );
  });

  it('extracts a transient client IP from Vercel forwarding headers', () => {
    vi.stubEnv('VERCEL', '1');
    vi.stubEnv('VERCEL_ENV', 'preview');

    expect(
      getClientIp({
        headers: {
          'x-vercel-forwarded-for': '203.0.113.9',
          'x-forwarded-for': '198.51.100.4',
        },
        socket: { remoteAddress: '127.0.0.1' },
      }),
    ).toBe('203.0.113.9');
  });

  it('uses only the socket address during local development', () => {
    expect(
      getClientIp({
        headers: {
          'x-vercel-forwarded-for': '203.0.113.9',
          'x-forwarded-for': '198.51.100.4',
        },
        socket: { remoteAddress: '127.0.0.1' },
      }),
    ).toBe('127.0.0.1');
  });

  it('does not fall back to spoofable headers or sockets on Vercel', () => {
    vi.stubEnv('VERCEL', '1');
    vi.stubEnv('VERCEL_ENV', 'production');

    expect(() =>
      getClientIp({
        headers: { 'x-forwarded-for': '198.51.100.4', 'x-real-ip': '203.0.113.9' },
        socket: { remoteAddress: '127.0.0.1' },
      }),
    ).toThrow(HttpError);
  });

  it.each([
    { forwardedFor: ['203.0.113.9', '198.51.100.4'] },
    { forwardedFor: '203.0.113.9, 198.51.100.4' },
  ])('rejects ambiguous Vercel client IP values: $forwardedFor', ({ forwardedFor }) => {
    vi.stubEnv('VERCEL', '1');
    vi.stubEnv('VERCEL_ENV', 'preview');

    expect(() =>
      getClientIp({ headers: { 'x-vercel-forwarded-for': forwardedFor } }),
    ).toThrow(HttpError);
  });

  it.each(['not-an-ip', '203.0.113.009', ' 203.0.113.9 '])(
    'rejects a malformed or non-canonical client IP: %s',
    (remoteAddress) => {
      expect(() => getClientIp({ headers: {}, socket: { remoteAddress } })).toThrow(HttpError);
      expect(() => hashIp(remoteAddress)).toThrow('Invalid client IP');
    },
  );

  it('canonicalizes equivalent IPv6 forms before hashing', () => {
    expect(
      getClientIp({ headers: {}, socket: { remoteAddress: '2001:0db8:0:0:0:0:0:1' } }),
    ).toBe('2001:db8::1');
    expect(hashIp('2001:0db8:0:0:0:0:0:1')).toBe(hashIp('2001:db8::1'));
    expect(hashIp('::ffff:192.0.2.1')).toBe(hashIp('::ffff:c000:201'));
  });

  it('verifies Turnstile without exposing the submitted token', async () => {
    const fetchStub = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ success: true, hostname: 'tracker.example' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    await expect(
      verifyTurnstile('submitted-turnstile-token', '203.0.113.9', {
        secret: validEnvironment.TURNSTILE_SECRET_KEY,
        fetch: fetchStub,
      }),
    ).resolves.toBeUndefined();

    const body = fetchStub.mock.calls[0]?.[1]?.body;
    expect(body).toBeInstanceOf(URLSearchParams);
    expect(String(body)).toContain('secret=');
    expect(String(body)).toContain('response=submitted-turnstile-token');
  });

  it.each([
    { label: 'missing', payload: { success: true } },
    { label: 'empty', payload: { success: true, hostname: '' } },
    { label: 'wrong', payload: { success: true, hostname: 'evil.example' } },
  ])('rejects a successful Turnstile response with a $label hostname', async ({ payload }) => {
    const fetchStub = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    await expect(
      verifyTurnstile('submitted-turnstile-token', undefined, {
        secret: validEnvironment.TURNSTILE_SECRET_KEY,
        fetch: fetchStub,
      }),
    ).rejects.toMatchObject({
      status: 400,
      code: 'TURNSTILE_FAILED',
      message: 'Nie udało się potwierdzić weryfikacji.',
    });
  });

  it('times out Turnstile provider requests with a generic availability error', async () => {
    const fetchStub = vi.fn<typeof fetch>().mockImplementation((_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('timed out', 'AbortError')));
      }),
    );

    await expect(
      verifyTurnstile('submitted-turnstile-token', undefined, {
        secret: validEnvironment.TURNSTILE_SECRET_KEY,
        fetch: fetchStub,
        timeoutMs: 5,
      }),
    ).rejects.toMatchObject({
      status: 503,
      code: 'TURNSTILE_UNAVAILABLE',
      message: 'Weryfikacja jest chwilowo niedostępna.',
    });
  });

  it.each([null, [], {}, { success: 'true' }])(
    'rejects malformed Turnstile JSON as a provider failure: %j',
    async (payload) => {
      const fetchStub = vi.fn<typeof fetch>().mockResolvedValue(
        new Response(JSON.stringify(payload), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );

      await expect(
        verifyTurnstile('submitted-turnstile-token', undefined, {
          secret: validEnvironment.TURNSTILE_SECRET_KEY,
          fetch: fetchStub,
        }),
      ).rejects.toMatchObject({ status: 503, code: 'TURNSTILE_UNAVAILABLE' });
    },
  );

  it('distinguishes provider HTTP failures from valid rejected challenges', async () => {
    const providerDetails = 'internal-provider-detail';
    const unavailableFetch = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ success: false, 'error-codes': [providerDetails] }), { status: 500 }),
    );
    const invalidFetch = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ success: false, 'error-codes': ['invalid-input-response'] }), {
        status: 200,
      }),
    );

    await expect(
      verifyTurnstile('submitted-turnstile-token', undefined, {
        secret: validEnvironment.TURNSTILE_SECRET_KEY,
        fetch: unavailableFetch,
      }),
    ).rejects.toMatchObject({
      status: 503,
      code: 'TURNSTILE_UNAVAILABLE',
      message: 'Weryfikacja jest chwilowo niedostępna.',
    });
    await expect(
      verifyTurnstile('submitted-turnstile-token', undefined, {
        secret: validEnvironment.TURNSTILE_SECRET_KEY,
        fetch: invalidFetch,
      }),
    ).rejects.toMatchObject({
      status: 400,
      code: 'TURNSTILE_FAILED',
      message: 'Nie udało się potwierdzić weryfikacji.',
    });

    await verifyTurnstile('submitted-turnstile-token', undefined, {
      secret: validEnvironment.TURNSTILE_SECRET_KEY,
      fetch: unavailableFetch,
    }).catch((error: unknown) => {
      expect(JSON.stringify(normalizeError(error).body)).not.toContain(providerDetails);
    });
  });

  it('returns only generic client errors for unexpected failures', () => {
    const secret = generateOpaqueToken();
    const normalized = normalizeError(new Error(`database failed for ${secret}`));

    expect(normalized.status).toBe(500);
    expect(normalized.body).toEqual({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Wystąpił nieoczekiwany błąd.',
      },
    });
    expect(JSON.stringify(normalized.body)).not.toContain(secret);
  });
});

describe('session resolution', () => {
  it('returns only the response ID and hashed session credential from the Task 2 RPC', async () => {
    const token = generateOpaqueToken();
    const responseId = '5b6fcd4b-bffe-4d8f-b1e8-e0f2cc1c66b0';
    const rpc = vi.fn().mockResolvedValue({ data: responseId, error: null });

    const session = await requireSession(
      { headers: { cookie: `anonymous_session=${token}` } },
      { rpc },
    );

    expect(session).toEqual({ responseId, sessionTokenHash: hashSessionToken(token) });
    expect(session).not.toHaveProperty('sessionToken');
    expect(rpc).toHaveBeenCalledWith('resolve_anonymous_session', {
      p_session_token_hash: hashSessionToken(token),
    });
  });

  it.each(['expired', 'revoked'])('rejects a session the RPC reports as %s', async () => {
    const token = generateOpaqueToken();
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });

    await expect(
      requireSession({ headers: { cookie: `anonymous_session=${token}` } }, { rpc }),
    ).rejects.toMatchObject({ status: 401, code: 'UNAUTHORIZED' });
  });

  it('does not include malformed cookie values in authentication errors', async () => {
    const rawCredential = 'not-a-valid-session-secret';

    await expect(
      requireSession({ headers: { cookie: `anonymous_session=${rawCredential}` } }, { rpc: vi.fn() }),
    ).rejects.toSatisfy((error: unknown) => {
      const normalized = normalizeError(error);
      return normalized.status === 401 && !JSON.stringify(normalized.body).includes(rawCredential);
    });
  });

  it.each([
    { label: 'array-valued', cookie: [`anonymous_session=${'A'.repeat(43)}`] },
    { label: 'percent-encoded', cookie: `anonymous_session=%41${'A'.repeat(42)}` },
  ])('rejects a $label Cookie header before session lookup', async ({ cookie }) => {
    const rpc = vi.fn().mockResolvedValue({
      data: '5b6fcd4b-bffe-4d8f-b1e8-e0f2cc1c66b0',
      error: null,
    });

    await expect(requireSession({ headers: { cookie } }, { rpc })).rejects.toMatchObject({
      status: 401,
      code: 'UNAUTHORIZED',
    });
    expect(rpc).not.toHaveBeenCalled();
  });
});
