import { timingSafeEqual } from 'node:crypto';

import { z } from 'zod';

import { botMessages, resolveBotLocale } from '../shared/bot-messages.js';
import { getCountryDisplayName, isCountryCode } from '../shared/countries.js';
import { HttpError } from './_lib/errors.js';
import { assertMethod, parseJsonBody, sendError, type HttpResponse } from './_lib/http.js';
import { loadServerEnv } from './_lib/env.js';
import { createSupabaseSubscriptionStore, type SubscriptionStore } from './_lib/subscriptions.js';
import { createTelegramSender, type TelegramSender } from './_lib/telegram-bot.js';

type BotRequest = {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
};

type BotDependencies = {
  store: () => SubscriptionStore;
  send: () => TelegramSender;
  getWebhookSecret: () => string | undefined;
  getAppUrl: () => string;
};

const chatSchema = z.object({ id: z.number().int(), type: z.string() }).passthrough();
const userSchema = z.object({ id: z.number().int().positive(), language_code: z.string().optional() }).passthrough();

/** Only the fields the bot reads; Telegram sends much more, which is ignored. */
const updateSchema = z
  .object({
    message: z
      .object({ chat: chatSchema, from: userSchema.optional(), text: z.string().max(512).optional() })
      .passthrough()
      .optional(),
    my_chat_member: z
      .object({
        chat: chatSchema,
        from: userSchema,
        new_chat_member: z.object({ status: z.string() }).passthrough(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

function secretMatches(provided: string | undefined, expected: string): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

function headerValue(request: BotRequest, name: string): string | undefined {
  const raw = request.headers[name];
  return Array.isArray(raw) ? raw[0] : raw;
}

const defaultDependencies: BotDependencies = {
  store: () => createSupabaseSubscriptionStore(),
  send: () => createTelegramSender(loadServerEnv().telegramBotToken),
  getWebhookSecret: () => loadServerEnv().telegramWebhookSecret,
  getAppUrl: () => loadServerEnv().appPublicUrl,
};

/** `/start c_UA` and `/start subscribe` arrive as "/start <payload>"; `/cmd@botname` is normalised. */
function parseCommand(text: string): { command: string; payload: string } {
  const [head = '', ...rest] = text.trim().split(/\s+/);
  return { command: head.toLowerCase().replace(/@\w+$/, ''), payload: rest.join(' ') };
}

export function createBotHandler(overrides: Partial<BotDependencies> = {}) {
  const dependencies = { ...defaultDependencies, ...overrides };

  return async function botHandler(request: BotRequest, response: HttpResponse): Promise<void> {
    try {
      assertMethod(request, response, 'POST');

      const secret = dependencies.getWebhookSecret();
      if (!secret) throw new HttpError(503, 'BOT_NOT_CONFIGURED', 'The bot is not configured.');
      if (!secretMatches(headerValue(request, 'x-telegram-bot-api-secret-token'), secret)) {
        throw new HttpError(401, 'UNAUTHORIZED', 'Session is invalid or has expired.');
      }

      const update = parseJsonBody(request, updateSchema);
      const store = dependencies.store();

      // The user blocked or left the bot: forget their Telegram id right away.
      const member = update.my_chat_member;
      if (member && member.chat.type === 'private' && ['kicked', 'left'].includes(member.new_chat_member.status)) {
        await store.remove(member.from.id);
        response.status(200).json({ ok: true });
        return;
      }

      const message = update.message;
      if (message?.text && message.from && message.chat.type === 'private') {
        const { command, payload } = parseCommand(message.text);
        const userId = message.from.id;
        const chatId = message.chat.id;
        const locale = resolveBotLocale(message.from.language_code);
        const copy = botMessages[locale];
        const send = dependencies.send();
        const appUrl = dependencies.getAppUrl();

        const subscribe = async () => {
          const already = await store.isSubscribed(userId);
          await store.upsert({ telegramUserId: userId, chatId, locale });
          await send({ chatId, text: already ? copy.alreadySubscribed : copy.subscribed });
        };

        if (command === '/start') {
          if (payload === 'subscribe') {
            await subscribe();
          } else {
            const country = payload.startsWith('c_') ? payload.slice(2).toUpperCase() : '';
            const known = isCountryCode(country);
            // The greeting names the country in the user's language; without a name it falls back to the plain welcome.
            const countryName = known ? getCountryDisplayName(country, locale) : null;
            await send({
              chatId,
              text: countryName ? copy.welcomeCountry(countryName) : copy.welcome,
              webApp: { text: copy.openApp, url: known ? `${appUrl}/?c=${country}` : appUrl },
            });
          }
        } else if (command === '/subscribe') {
          await subscribe();
        } else if (command === '/stop' || command === '/unsubscribe') {
          await store.remove(userId);
          await send({ chatId, text: copy.unsubscribed });
        } else if (command === '/help') {
          await send({ chatId, text: copy.help });
        }
      }

      response.status(200).json({ ok: true });
    } catch (error) {
      sendError(response, error);
    }
  };
}

export default createBotHandler();
