import { describe, expect, it, vi } from 'vitest';

import { botMessages } from '../../shared/bot-messages';
import type { Subscription, SubscriptionStore } from '../_lib/subscriptions';
import type { SendMessageInput, SendResult } from '../_lib/telegram-bot';
import { createRemindersHandler } from './reminders';

const CRON_SECRET = 'cron-secret-that-is-at-least-32-characters-long';
const APP_URL = 'https://tracker.example';

function subscriber(id: number, overrides: Partial<Subscription> = {}): Subscription {
  return { telegramUserId: id, chatId: id, locale: 'pl', lastReminder: null, ...overrides };
}

function setup(subscribers: Subscription[], results: Record<number, SendResult> = {}, now = '2026-11-19T13:00:00Z') {
  const removed: number[] = [];
  const reminded: Array<[number, string]> = [];
  const sent: SendMessageInput[] = [];
  const store: SubscriptionStore = {
    isSubscribed: async () => true,
    upsert: async () => undefined,
    remove: async (id) => void removed.push(id),
    list: async () => subscribers,
    markReminded: async (id, key) => void reminded.push([id, key]),
  };
  const handler = createRemindersHandler({
    store: () => store,
    send: () => async (input) => {
      sent.push(input);
      return results[input.chatId] ?? { ok: true };
    },
    getCronSecret: () => CRON_SECRET,
    getAppUrl: () => APP_URL,
    now: () => new Date(now),
    sleep: async () => undefined,
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
  const run = (headers: Record<string, string> = { authorization: `Bearer ${CRON_SECRET}` }) =>
    handler({ method: 'GET', headers }, response);
  return { run, state, removed, reminded, sent };
}

describe('GET /api/cron/reminders', () => {
  it('requires the cron secret', async () => {
    const { run, state, sent } = setup([subscriber(1)]);

    await run({});
    expect(state.status).toBe(401);

    await run({ authorization: 'Bearer wrong' });
    expect(state.status).toBe(401);
    expect(sent).toEqual([]);
  });

  it('sends the due reminder in the subscriber language and records it', async () => {
    const { run, state, sent, reminded } = setup([subscriber(1, { locale: 'uk' })]);

    await run();

    expect(state.status).toBe(200);
    expect(state.body).toEqual({ ok: true, sent: 1, removed: 0, failed: 0 });
    expect(sent[0]).toMatchObject({
      chatId: 1,
      text: botMessages.uk.reminders.results_out('2026'),
      webApp: { text: botMessages.uk.openApp, url: APP_URL },
    });
    expect(reminded).toEqual([[1, '2026:results_out']]);
  });

  it('does not send the same reminder twice', async () => {
    const { run, sent, state } = setup([subscriber(1, { lastReminder: '2026:results_out' })]);

    await run();

    expect(sent).toEqual([]);
    expect(state.body).toEqual({ ok: true, sent: 0, removed: 0, failed: 0 });
  });

  it('sends nothing when no reminder is due or all have expired', async () => {
    const early = setup([subscriber(1)], {}, '2026-03-01T13:00:00Z');
    await early.run();
    expect(early.sent).toEqual([]);

    const late = setup([subscriber(1)], {}, '2027-03-01T13:00:00Z');
    await late.run();
    expect(late.sent).toEqual([]);
  });

  it('removes subscribers who blocked the bot and keeps counting failures separately', async () => {
    const { run, state, removed, reminded } = setup(
      [subscriber(1), subscriber(2), subscriber(3)],
      { 1: { ok: false, blocked: true }, 2: { ok: false, blocked: false } },
    );

    await run();

    expect(state.body).toEqual({ ok: true, sent: 1, removed: 1, failed: 1 });
    expect(removed).toEqual([1]);
    expect(reminded).toEqual([[3, '2026:results_out']]);
  });

  it('caps the number of messages per run', async () => {
    const many = Array.from({ length: 250 }, (_, index) => subscriber(index + 1));
    const { run, state } = setup(many);

    await run();

    expect(state.body).toEqual({ ok: true, sent: 200, removed: 0, failed: 0 });
  });
});
