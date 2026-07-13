import { loadServerEnv } from './env.js';
import { assertCanonicalToken } from './tokens.js';

export type CookieConfig = {
  name: string;
  maxAgeDays: number;
  secure: boolean;
};

export type HeaderResponse = {
  setHeader(name: string, value: string | string[]): unknown;
};

function defaultCookieConfig(): CookieConfig {
  const env = loadServerEnv();
  return {
    name: env.sessionCookieName,
    maxAgeDays: env.sessionMaxAgeDays,
    secure: env.isProduction,
  };
}

function serializeCookie(name: string, value: string, maxAge: number, secure: boolean): string {
  const attributes = [
    `${name}=${value}`,
    `Max-Age=${maxAge}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
  ];

  if (secure) attributes.push('Secure');
  return attributes.join('; ');
}

export function setSessionCookie(
  response: HeaderResponse,
  token: string,
  config: CookieConfig = defaultCookieConfig(),
): void {
  assertCanonicalToken(token);
  response.setHeader(
    'Set-Cookie',
    serializeCookie(config.name, token, config.maxAgeDays * 86400, config.secure),
  );
}

export function clearSessionCookie(
  response: HeaderResponse,
  config: CookieConfig = defaultCookieConfig(),
): void {
  response.setHeader('Set-Cookie', serializeCookie(config.name, '', 0, config.secure));
}

export function readCookie(cookieHeader: string | string[] | undefined, name: string): string | null {
  if (typeof cookieHeader !== 'string' || !cookieHeader) return null;

  let encodedValue: string | undefined;

  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0 || part.slice(0, separator).trim() !== name) continue;
    if (encodedValue !== undefined) return null;
    encodedValue = part.slice(separator + 1).trim();
  }

  if (encodedValue === undefined) return null;
  if (encodedValue.includes('%')) return null;
  return encodedValue;
}
