import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  readInitDataFromRequest,
  requireTelegramIdentity,
  signTelegramInitData,
  verifyTelegramInitData,
} from './telegram-auth';

const BOT_TOKEN = 'test-bot-token-that-is-at-least-32-characters';
const USER_ID = 123456789;

function buildInitData(nowSeconds = 1_700_000_000) {
  return signTelegramInitData(
    { user: JSON.stringify({ id: USER_ID, username: 'tester' }) },
    BOT_TOKEN,
    nowSeconds,
  );
}

describe('telegram initData verification', () => {
  it('accepts a valid signed payload', () => {
    const initData = buildInitData();
    const identity = verifyTelegramInitData(initData, BOT_TOKEN, 86_400, 1_700_000_100);

    expect(identity.user).toEqual({ id: USER_ID, username: 'tester' });
    expect(identity.authDate).toBe(1_700_000_000);
  });

  it('rejects tampered payloads and expired auth_date values', () => {
    const initData = buildInitData();
    const tampered = initData.replace(String(USER_ID), String(USER_ID + 1));

    expect(() => verifyTelegramInitData(tampered, BOT_TOKEN, 86_400, 1_700_000_100)).toThrow();
    expect(() => verifyTelegramInitData(initData, BOT_TOKEN, 60, 1_700_010_000)).toThrow();
    expect(() => verifyTelegramInitData(initData, BOT_TOKEN, 86_400, 1_699_999_000)).toThrow();
  });

  it('reads Authorization: tma headers from requests', () => {
    const initData = buildInitData();
    const identity = requireTelegramIdentity(
      { headers: { authorization: `tma ${initData}` } },
      { botToken: BOT_TOKEN, nowSeconds: 1_700_000_100 },
    );

    expect(identity.user.id).toBe(USER_ID);
    expect(readInitDataFromRequest({ headers: { authorization: `tma ${initData}` } })).toBe(initData);
  });

  it('rejects missing auth headers', () => {
    expect(() => readInitDataFromRequest({ headers: {} })).toThrow();
  });
});
