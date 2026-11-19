import { describe, expect, it } from 'vitest';

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

  it('accepts a payload signed as Telegram documents it', () => {
    // Computed outside this module with HMAC-SHA256(key = "WebAppData", message = <bot token>), then the hash over
    // the data-check-string, as in https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app.
    // The signer above shares code with the verifier, so only a fixed vector can catch a wrong key/message order.
    const initData =
      'auth_date=1700000000&user=%7B%22id%22%3A42%2C%22first_name%22%3A%22Test%22%2C%22username%22%3A%22tester%22%7D' +
      '&query_id=AAHdF6IQAAAAAN0XohDhrOrc&hash=3e3661e3c209c014033b505dcfb4736894c9d407863a4dae9269a977417f5049';

    const identity = verifyTelegramInitData(initData, '123456:TEST-bot-token-for-unit-tests', 86_400, 1_700_000_100);

    expect(identity.user.id).toBe(42);
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
