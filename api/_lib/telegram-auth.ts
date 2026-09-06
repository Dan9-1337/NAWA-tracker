import { createHmac, timingSafeEqual } from 'node:crypto';

import { loadServerEnv } from './env.js';
import { HttpError, unauthorized } from './errors.js';

export type TelegramWebAppUser = {
  id: number;
  username?: string;
  firstName?: string;
  lastName?: string;
};

export type VerifiedTelegramIdentity = {
  user: TelegramWebAppUser;
  authDate: number;
};

const INIT_DATA_HEADER = 'authorization';
const INIT_DATA_PREFIX = 'tma ';
const DEFAULT_MAX_AGE_SECONDS = 86_400;
const AUTH_DATE_FUTURE_SKEW_SECONDS = 60;

type TelegramAuthRequest = {
  headers: Record<string, string | string[] | undefined>;
};

function headerValue(request: TelegramAuthRequest, name: string): string | null {
  const raw = request.headers[name] ?? request.headers[name.toLowerCase()];
  if (Array.isArray(raw)) return raw[0] ?? null;
  return raw ?? null;
}

function parseTelegramUser(raw: string): TelegramWebAppUser {
  const parsed = JSON.parse(raw) as {
    id?: unknown;
    username?: unknown;
    first_name?: unknown;
    last_name?: unknown;
  };

  if (typeof parsed.id !== 'number' || !Number.isInteger(parsed.id) || parsed.id <= 0) {
    throw unauthorized();
  }

  return {
    id: parsed.id,
    ...(typeof parsed.username === 'string' && parsed.username.length > 0
      ? { username: parsed.username }
      : {}),
    ...(typeof parsed.first_name === 'string' && parsed.first_name.length > 0
      ? { firstName: parsed.first_name }
      : {}),
    ...(typeof parsed.last_name === 'string' && parsed.last_name.length > 0
      ? { lastName: parsed.last_name }
      : {}),
  };
}

export function buildTelegramDataCheckString(params: URLSearchParams): string {
  return [...params.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
}

export function signTelegramInitData(
  fields: Record<string, string>,
  botToken: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): string {
  const params = new URLSearchParams({
    ...fields,
    auth_date: String(nowSeconds),
  });
  const dataCheckString = buildTelegramDataCheckString(params);
  const secretKey = createHmac('sha256', botToken).update('WebAppData').digest();
  const hash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  params.set('hash', hash);
  return params.toString();
}

export function verifyTelegramInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds = DEFAULT_MAX_AGE_SECONDS,
  nowSeconds = Math.floor(Date.now() / 1000),
): VerifiedTelegramIdentity {
  const params = new URLSearchParams(initData);
  const receivedHash = params.get('hash');
  if (!receivedHash) throw unauthorized();

  params.delete('hash');
  const dataCheckString = buildTelegramDataCheckString(params);
  const secretKey = createHmac('sha256', botToken).update('WebAppData').digest();
  const calculatedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  const received = Buffer.from(receivedHash, 'hex');
  const calculated = Buffer.from(calculatedHash, 'hex');
  if (received.length !== calculated.length || !timingSafeEqual(received, calculated)) {
    throw unauthorized();
  }

  const authDate = Number(params.get('auth_date'));
  if (
    !Number.isFinite(authDate)
    || authDate <= 0
    || authDate > nowSeconds + AUTH_DATE_FUTURE_SKEW_SECONDS
    || nowSeconds - authDate > maxAgeSeconds
  ) {
    throw unauthorized();
  }

  const userRaw = params.get('user');
  if (!userRaw) throw unauthorized();

  try {
    return { user: parseTelegramUser(userRaw), authDate };
  } catch {
    throw unauthorized();
  }
}

export function readInitDataFromRequest(request: TelegramAuthRequest): string {
  const authorization = headerValue(request, INIT_DATA_HEADER);
  if (authorization?.startsWith(INIT_DATA_PREFIX)) {
    const initData = authorization.slice(INIT_DATA_PREFIX.length).trim();
    if (initData.length > 0) return initData;
  }

  const directHeader = headerValue(request, 'x-telegram-init-data');
  if (directHeader && directHeader.trim().length > 0) return directHeader.trim();

  throw unauthorized();
}

export function requireTelegramIdentity(
  request: TelegramAuthRequest,
  overrides: {
    botToken?: string;
    maxAgeSeconds?: number;
    nowSeconds?: number;
  } = {},
): VerifiedTelegramIdentity {
  const initData = readInitDataFromRequest(request);
  const botToken = overrides.botToken ?? loadServerEnv().telegramBotToken;
  return verifyTelegramInitData(
    initData,
    botToken,
    overrides.maxAgeSeconds,
    overrides.nowSeconds,
  );
}

export function invalidTelegramInitData(): HttpError {
  return unauthorized();
}
