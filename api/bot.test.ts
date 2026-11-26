import { describe, expect, it, vi } from 'vitest';

import { botMessages } from '../shared/bot-messages';
import type { SubscriptionStore } from './_lib/subscriptions';
import type { SendMessageInput } from './_lib/telegram-bot';
import { createBotHandler } from './bot';

const SECRET = 'webhook-secret-that-is-at-least-32-characters';
const APP_URL = 'https://tracker.example';

function memoryStore(initial: number[] = []): SubscriptionStore & { rows: Map<number, { chatId: number; locale: string }> } {
  const rows = new Map(initial.map((id) => [id, { chatId: id, locale: 'pl' }]));
  return {
    rows,
    isSubscribed: async (id) => rows.has(id),
    upsert: async ({ telegramUserId, chatId, locale }) => void rows.set(telegramUserId, { chatId, locale }),
    remove: async (id) => void rows.delete(id),
    list: async () => [],
    markReminded: async () => undefined,
  };
}

function setup(options: { store?: ReturnType<typeof memoryStore>; secret?: string | undefined } = {}) {
  const store = options.store ?? memoryStore();
  const sent: SendMessageInput[] = [];
  const handler = createBotHandler({
    store: () => store,
    send: () => async (input) => {
      sent.push(input);
      return { ok: true };
    },
    getWebhookSecret: () => ('secret' in options ? options.secret : SECRET),
    getAppUrl: () => APP_URL,
  });
  const state: { status?: number; body?: unknown } = {};
  const response = {
    status(status: number) {
      state.status = status;
      return response;
    },
    json(body: unknown) {
      state.body = body;
      return response;
    },
    setHeader: vi.fn(),
  };
  const post = (body: unknown, headers: Record<string, string> = { 'x-telegram-bot-api-secret-token': SECRET }) =>
    handler({ method: 'POST', body, headers }, response);
  return { post, store, sent, state };
}

const textUpdate = (text: string, languageCode = 'uk', userId = 700000001) => ({
  update_id: 1,
  message: {
    chat: { id: userId, type: 'private' },
    from: { id: userId, language_code: languageCode },
    text,
  },
});

describe('POST /api/bot', () => {
  it('rejects requests without the webhook secret before doing anything', async () => {
    const { post, sent, state } = setup();

    await post(textUpdate('/start'), {});
    expect(state.status).toBe(401);

    await post(textUpdate('/start'), { 'x-telegram-bot-api-secret-token': 'wrong-wrong-wrong-wrong-wrong-wrong-xx' });
    expect(state.status).toBe(401);
    expect(sent).toEqual([]);
  });

  it('answers 503 while the webhook secret is not configured', async () => {
    const { post, state } = setup({ secret: undefined });

    await post(textUpdate('/start'));

    expect(state.status).toBe(503);
  });

  it('rejects other methods', async () => {
    const { state } = setup();
    const handler = createBotHandler({ getWebhookSecret: () => SECRET });
    const response = { status: (s: number) => ((state.status = s), response), json: vi.fn(), setHeader: vi.fn() };

    await handler({ method: 'GET', headers: {} }, response);

    expect(state.status).toBe(405);
  });

  it('greets in the user language and opens the app', async () => {
    const { post, sent, state } = setup();

    await post(textUpdate('/start', 'uk'));

    expect(state.status).toBe(200);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      chatId: 700000001,
      text: botMessages.uk.welcome,
      webApp: { text: botMessages.uk.openApp, url: APP_URL },
    });
  });

  it('turns a country deep link into an app URL that preselects the country', async () => {
    const { post, sent } = setup();

    await post(textUpdate('/start c_UA', 'ru'));

    expect(sent[0]?.webApp?.url).toBe(`${APP_URL}/?c=UA`);
    expect(sent[0]?.text).toBe(botMessages.ru.welcomeCountry('Украина'));
    expect(sent[0]?.text).toContain('Украина');
    expect(sent[0]?.text).not.toContain('UA:');
  });

  it.each([
    ['uk', 'Україна'],
    ['be', 'Украіна'],
    ['pl', 'Ukraina'],
    ['en', 'Ukraine'],
  ] as const)('names the invited country in %s', async (locale, name) => {
    const { post, sent } = setup();

    await post(textUpdate('/start c_UA', locale));

    expect(sent[0]?.text).toBe(botMessages[locale].welcomeCountry(name));
    expect(sent[0]?.text).not.toContain('UA:');
    expect(sent[0]?.webApp?.url).toBe(`${APP_URL}/?c=UA`);
  });

  it('sends the plain welcome for an unknown country code or no payload', async () => {
    const { post, sent } = setup();

    await post(textUpdate('/start c_XX', 'ru'));
    await post(textUpdate('/start', 'ru'));

    expect(sent.map((message) => message.text)).toEqual([botMessages.ru.welcome, botMessages.ru.welcome]);
    expect(sent.map((message) => message.webApp?.url)).toEqual([APP_URL, APP_URL]);
  });

  it('ignores unknown start payloads instead of echoing them', async () => {
    const { post, sent } = setup();

    await post(textUpdate('/start c_<script>', 'en'));

    expect(sent[0]?.webApp?.url).toBe(APP_URL);
    expect(sent[0]?.text).toBe(botMessages.en.welcome);
  });

  it('subscribes on /subscribe and on the "subscribe" start payload, storing the chat and language', async () => {
    const { post, store, sent } = setup();

    await post(textUpdate('/subscribe', 'be'));
    expect(store.rows.get(700000001)).toEqual({ chatId: 700000001, locale: 'be' });
    expect(sent[0]?.text).toBe(botMessages.be.subscribed);

    await post(textUpdate('/start subscribe', 'be'));
    expect(sent[1]?.text).toBe(botMessages.be.alreadySubscribed);
  });

  it.each([
    ['pl', 'Przypomnę, kiedy ruszy nabór wniosków. Wyłączysz to poleceniem /stop.', /wynik/i],
    ['en', 'I will remind you when applications open. Turn it off with /stop.', /result/i],
    ['ru', 'Напомню, когда начнётся приём заявок. Выключить — /stop.', /результат/i],
    ['uk', 'Нагадаю, коли розпочнеться прийом заяв. Вимкнути — /stop.', /результат/i],
    ['be', 'Нагадаю, калі пачнецца прыём заяў. Выключыць — /stop.', /вынік/i],
  ] as const)('the %s /subscribe reply promises only the application-start reminder and the /stop way out', async (locale, promise, resultsWord) => {
    const { post, sent } = setup();

    await post(textUpdate('/subscribe', locale));

    expect(sent[0]?.text).toContain(promise);
    expect(sent[0]?.text).toContain('Telegram ID');
    expect(sent[0]?.text).not.toMatch(resultsWord);
  });

  it.each([
    ['kk', 'ru'],
    ['ka', 'ru'],
    ['az', 'ru'],
    ['hy', 'ru'],
    ['uz', 'ru'],
    ['ro', 'ru'],
    ['de', 'en'],
    ['fr', 'en'],
    ['ja', 'en'],
    ['tr', 'en'],
    ['', 'en'],
    ['ru', 'ru'],
    ['uk-UA', 'uk'],
    ['be', 'be'],
    ['pl-PL', 'pl'],
    ['en-GB', 'en'],
  ] as const)('answers a user with language_code "%s" in %s', async (languageCode, locale) => {
    const { post, sent, store } = setup();

    await post(textUpdate('/subscribe', languageCode));

    expect(sent[0]?.text).toBe(botMessages[locale].subscribed);
    expect(store.rows.get(700000001)?.locale).toBe(locale);
  });

  it('answers in English when Telegram sends no language_code', async () => {
    const { post, sent } = setup();
    const update = textUpdate('/start', 'x');
    delete (update.message.from as { language_code?: string }).language_code;

    await post(update);

    expect(sent[0]?.text).toBe(botMessages.en.welcome);
  });

  it('unsubscribes on /stop and confirms removal', async () => {
    const store = memoryStore([700000001]);
    const { post, sent } = setup({ store });

    await post(textUpdate('/stop', 'en@'));

    expect(store.rows.has(700000001)).toBe(false);
    expect(sent[0]?.text).toBe(botMessages.en.unsubscribed);
  });

  it('accepts commands addressed to the bot by name', async () => {
    const { post, store } = setup();

    await post(textUpdate('/subscribe@nawa_tracker_bot', 'en'));

    expect(store.rows.has(700000001)).toBe(true);
  });

  it('forgets the Telegram id when the user blocks the bot', async () => {
    const store = memoryStore([700000001]);
    const { post, sent, state } = setup({ store });

    await post({
      update_id: 2,
      my_chat_member: {
        chat: { id: 700000001, type: 'private' },
        from: { id: 700000001 },
        new_chat_member: { status: 'kicked' },
      },
    });

    expect(state.status).toBe(200);
    expect(store.rows.has(700000001)).toBe(false);
    expect(sent).toEqual([]);
  });

  it('ignores group chats and non-command text', async () => {
    const { post, store, sent, state } = setup();

    await post({ update_id: 3, message: { chat: { id: -100, type: 'group' }, from: { id: 5 }, text: '/subscribe' } });
    await post(textUpdate('hello there'));

    expect(state.status).toBe(200);
    expect(store.rows.size).toBe(0);
    expect(sent).toEqual([]);
  });

  it('shows help', async () => {
    const { post, sent } = setup();

    await post(textUpdate('/help', 'en'));

    expect(sent[0]?.text).toBe(botMessages.en.help);
  });
});
