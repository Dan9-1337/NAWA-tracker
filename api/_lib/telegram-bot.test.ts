import { describe, expect, it, vi } from 'vitest';

import { createTelegramSender } from './telegram-bot';

const TOKEN = '123456:bot-token-that-must-never-leak';

function fakeFetch(status: number, body: unknown = {}) {
  return vi.fn().mockResolvedValue({ ok: status >= 200 && status < 300, status, json: async () => body });
}

describe('createTelegramSender', () => {
  it('posts to the Bot API with an optional Mini App button', async () => {
    const fetchImpl = fakeFetch(200);

    const result = await createTelegramSender(TOKEN, fetchImpl)({
      chatId: 7,
      text: 'hi',
      webApp: { text: 'Open', url: 'https://tracker.example' },
    });

    expect(result).toEqual({ ok: true });
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe(`https://api.telegram.org/bot${TOKEN}/sendMessage`);
    expect(JSON.parse(init.body)).toEqual({
      chat_id: 7,
      text: 'hi',
      reply_markup: { inline_keyboard: [[{ text: 'Open', web_app: { url: 'https://tracker.example' } }]] },
    });
  });

  it('flags a blocked bot and a vanished chat so the subscription can be removed', async () => {
    expect(await createTelegramSender(TOKEN, fakeFetch(403))({ chatId: 1, text: 'x' })).toEqual({ ok: false, blocked: true });
    expect(
      await createTelegramSender(TOKEN, fakeFetch(400, { description: 'Bad Request: chat not found' }))({ chatId: 1, text: 'x' }),
    ).toEqual({ ok: false, blocked: true });
  });

  it('treats other failures as transient', async () => {
    expect(await createTelegramSender(TOKEN, fakeFetch(500))({ chatId: 1, text: 'x' })).toEqual({ ok: false, blocked: false });
    expect(
      await createTelegramSender(TOKEN, fakeFetch(400, { description: 'Bad Request: message is too long' }))({ chatId: 1, text: 'x' }),
    ).toEqual({ ok: false, blocked: false });
  });

  it('swallows network errors without exposing the token', async () => {
    const failing = vi.fn().mockRejectedValue(new Error(`connect ECONNREFUSED https://api.telegram.org/bot${TOKEN}/sendMessage`));

    const result = await createTelegramSender(TOKEN, failing)({ chatId: 1, text: 'x' });

    expect(result).toEqual({ ok: false, blocked: false });
    expect(JSON.stringify(result)).not.toContain(TOKEN);
  });
});
