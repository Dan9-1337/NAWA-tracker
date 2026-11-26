import { botMessages } from '../../shared/bot-messages.js';
import { pickDueReminder, remindersForSeasons } from '../../shared/reminders.js';
import { seasons } from '../../shared/season.js';
import { assertCronAuthorized } from '../_lib/cron-auth.js';
import { loadServerEnv } from '../_lib/env.js';
import { assertMethod, sendError, type HttpResponse } from '../_lib/http.js';
import { createSupabaseSubscriptionStore, type SubscriptionStore } from '../_lib/subscriptions.js';
import { createTelegramSender, type TelegramSender } from '../_lib/telegram-bot.js';

type RemindersRequest = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
};

type RemindersDependencies = {
  store: () => SubscriptionStore;
  send: () => TelegramSender;
  getCronSecret: () => string | undefined;
  getAppUrl: () => string;
  now: () => Date;
  sleep: (ms: number) => Promise<void>;
};

/** Telegram allows about 30 messages per second; stay well below it and below the function time limit. */
const MAX_SENDS_PER_RUN = 200;
const PAUSE_BETWEEN_SENDS_MS = 50;

const defaultDependencies: RemindersDependencies = {
  store: () => createSupabaseSubscriptionStore(),
  send: () => createTelegramSender(loadServerEnv().telegramBotToken),
  getCronSecret: () => process.env.CRON_SECRET,
  getAppUrl: () => loadServerEnv().appPublicUrl,
  now: () => new Date(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

export function createRemindersHandler(overrides: Partial<RemindersDependencies> = {}) {
  const dependencies = { ...defaultDependencies, ...overrides };

  return async function remindersHandler(request: RemindersRequest, response: HttpResponse): Promise<void> {
    try {
      assertMethod(request, response, 'GET');
      assertCronAuthorized(request, dependencies.getCronSecret);

      const store = dependencies.store();
      const send = dependencies.send();
      const appUrl = dependencies.getAppUrl();
      const reminders = remindersForSeasons(seasons);
      const now = dependencies.now();

      let sent = 0;
      let removed = 0;
      let failed = 0;

      for (const subscriber of await store.list()) {
        if (sent + failed >= MAX_SENDS_PER_RUN) break;

        const reminder = pickDueReminder(now, subscriber.lastReminder, reminders);
        if (!reminder) continue;

        const copy = botMessages[subscriber.locale];
        const result = await send({
          chatId: subscriber.chatId,
          text: copy.reminders[reminder.kind](String(reminder.year)),
          webApp: { text: copy.openApp, url: appUrl },
        });

        if (result.ok) {
          await store.markReminded(subscriber.telegramUserId, reminder.key);
          sent += 1;
        } else if (result.blocked) {
          await store.remove(subscriber.telegramUserId);
          removed += 1;
        } else {
          failed += 1;
        }
        await dependencies.sleep(PAUSE_BETWEEN_SENDS_MS);
      }

      response.status(200).json({ ok: true, sent, removed, failed });
    } catch (error) {
      sendError(response, error);
    }
  };
}

export default createRemindersHandler();
