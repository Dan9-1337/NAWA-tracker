import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { loadServerEnv } from './env';
import { HttpError, normalizeError } from './errors';
import { assertMethod, parseJsonBody, sendError } from './http';
import { getClientIp, hashIp } from './ip';
import { assertSameOrigin } from './origin';
import { z } from 'zod';

const validEnvironment = {
  SUPABASE_URL: 'https://project.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key-that-is-at-least-32-characters',
  TELEGRAM_BOT_TOKEN: 'telegram-bot-token-that-is-at-least-32-characters',
  IP_HASH_SALT: 'ip-hash-salt-that-is-at-least-32-characters',
  APP_PUBLIC_URL: 'https://tracker.example',
  NODE_ENV: 'test',
} as const;

function stubEnvironment() {
  for (const [key, value] of Object.entries(validEnvironment)) {
    vi.stubEnv(key, value);
  }
}

beforeEach(stubEnvironment);
afterEach(() => vi.unstubAllEnvs());

describe('server environment', () => {
  it('parses Telegram Mini App security configuration', () => {
    expect(loadServerEnv(validEnvironment)).toMatchObject({
      supabaseUrl: 'https://project.supabase.co',
      telegramBotToken: validEnvironment.TELEGRAM_BOT_TOKEN,
      appOrigin: 'https://tracker.example',
      isProduction: false,
    });
  });

  it('rejects missing or unsafe security configuration without echoing values', () => {
    const unsafe = {
      ...validEnvironment,
      TELEGRAM_BOT_TOKEN: 'short',
      APP_PUBLIC_URL: 'not a url',
    };

    expect(() => loadServerEnv(unsafe)).toThrow('Invalid server environment');
  });

  it('rejects the known local-dev bot token in production', () => {
    expect(() =>
      loadServerEnv({
        ...validEnvironment,
        TELEGRAM_BOT_TOKEN: 'local-dev-telegram-bot-token-0000000001',
        VERCEL_ENV: 'production',
      }),
    ).toThrow('Invalid server environment');
  });
});

describe('request boundaries', () => {
  it('enforces methods and strict JSON request bodies', () => {
    const schema = z.object({ value: z.string() }).strict();
    const methodResponse = { status: vi.fn(), json: vi.fn(), setHeader: vi.fn() };

    expect(() => assertMethod({ method: 'GET' }, methodResponse, 'POST')).toThrow(HttpError);
    expect(parseJsonBody({ body: '{"value":"ok"}' }, schema)).toEqual({ value: 'ok' });
    expect(() => parseJsonBody({ body: { value: 'ok', identity: 'secret' } }, schema)).toThrow(HttpError);
  });

  it('sends normalized errors without internal details', () => {
    const json = vi.fn();
    const response = {
      status: vi.fn(function status(this: unknown) {
        return response;
      }),
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

  it('canonicalizes equivalent IPv6 forms before hashing', () => {
    expect(hashIp('2001:0db8:0:0:0:0:0:1')).toBe(hashIp('2001:db8::1'));
  });

  it('returns only generic client errors for unexpected failures', () => {
    const normalized = normalizeError(new Error('database failed for secret-token'));
    expect(normalized.status).toBe(500);
    expect(JSON.stringify(normalized.body)).not.toContain('secret-token');
  });
});
