import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { loadServerEnv } from './env';
import { HttpError, normalizeError } from './errors';
import { assertMethod, parseJsonBody, sendError } from './http';
import { assertSameOrigin } from './origin';
import { z } from 'zod';

const validEnvironment = {
  SUPABASE_URL: 'https://project.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key-that-is-at-least-32-characters',
  TELEGRAM_BOT_TOKEN: 'telegram-bot-token-that-is-at-least-32-characters',
  IDENTITY_PEPPER: 'identity-pepper-that-is-at-least-32-characters',
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
      identityPepper: validEnvironment.IDENTITY_PEPPER,
    });
  });

  it('requires an identity pepper and rejects the known local-dev pepper in production', () => {
    const { IDENTITY_PEPPER: _omitted, ...withoutPepper } = validEnvironment;
    expect(() => loadServerEnv(withoutPepper)).toThrow('Invalid server environment');
    expect(() =>
      loadServerEnv({
        ...validEnvironment,
        IDENTITY_PEPPER: 'local-dev-identity-pepper-0000000001',
        VERCEL_ENV: 'production',
      }),
    ).toThrow('Invalid server environment');
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

  it('returns only generic client errors for unexpected failures', () => {
    const normalized = normalizeError(new Error('database failed for secret-token'));
    expect(normalized.status).toBe(500);
    expect(JSON.stringify(normalized.body)).not.toContain('secret-token');
  });
});
