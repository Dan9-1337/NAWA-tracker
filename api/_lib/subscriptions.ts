import type { BotLocale } from '../../shared/bot-messages.js';
import { getSupabaseAdmin } from './supabase-admin.js';

export type Subscription = {
  telegramUserId: number;
  chatId: number;
  locale: BotLocale;
  lastReminder: string | null;
};

export type SubscriptionStore = {
  isSubscribed(telegramUserId: number): Promise<boolean>;
  upsert(input: { telegramUserId: number; chatId: number; locale: BotLocale }): Promise<void>;
  remove(telegramUserId: number): Promise<void>;
  list(): Promise<Subscription[]>;
  markReminded(telegramUserId: number, reminderKey: string): Promise<void>;
};

const LIST_LIMIT = 5000;

function fail(error: { message: string } | null): void {
  if (error) throw new Error('bot_subscriptions_failed');
}

export function createSupabaseSubscriptionStore(
  getClient: () => ReturnType<typeof getSupabaseAdmin> = getSupabaseAdmin,
): SubscriptionStore {
  return {
    async isSubscribed(telegramUserId) {
      const result = await getClient()
        .from('bot_subscriptions')
        .select('telegram_user_id')
        .eq('telegram_user_id', telegramUserId)
        .limit(1);
      fail(result.error);
      return (result.data?.length ?? 0) > 0;
    },
    async upsert({ telegramUserId, chatId, locale }) {
      const result = await getClient()
        .from('bot_subscriptions')
        .upsert(
          { telegram_user_id: telegramUserId, chat_id: chatId, locale },
          { onConflict: 'telegram_user_id' },
        );
      fail(result.error);
    },
    async remove(telegramUserId) {
      const result = await getClient().from('bot_subscriptions').delete().eq('telegram_user_id', telegramUserId);
      fail(result.error);
    },
    async list() {
      const result = await getClient()
        .from('bot_subscriptions')
        .select('telegram_user_id, chat_id, locale, last_reminder')
        .order('subscribed_at', { ascending: true })
        .limit(LIST_LIMIT);
      fail(result.error);
      return (result.data ?? []).map((row) => ({
        telegramUserId: Number(row.telegram_user_id),
        chatId: Number(row.chat_id),
        locale: row.locale as BotLocale,
        lastReminder: (row.last_reminder as string | null) ?? null,
      }));
    },
    async markReminded(telegramUserId, reminderKey) {
      const result = await getClient()
        .from('bot_subscriptions')
        .update({ last_reminder: reminderKey })
        .eq('telegram_user_id', telegramUserId);
      fail(result.error);
    },
  };
}
