export type SendMessageInput = {
  chatId: number;
  text: string;
  /** Adds an inline button that opens the Mini App. */
  webApp?: { text: string; url: string };
};

/** `blocked` means the user blocked the bot or the chat is gone: the subscription should be removed. */
export type SendResult = { ok: true } | { ok: false; blocked: boolean };

export type TelegramSender = (input: SendMessageInput) => Promise<SendResult>;

type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body: string }) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

export function createTelegramSender(token: string, fetchImpl: FetchLike = fetch as FetchLike): TelegramSender {
  return async ({ chatId, text, webApp }) => {
    const body = {
      chat_id: chatId,
      text,
      ...(webApp
        ? { reply_markup: { inline_keyboard: [[{ text: webApp.text, web_app: { url: webApp.url } }]] } }
        : {}),
    };

    try {
      const response = await fetchImpl(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (response.ok) return { ok: true };

      let description = '';
      try {
        const payload = (await response.json()) as { description?: unknown };
        description = typeof payload.description === 'string' ? payload.description : '';
      } catch {
        // No readable body: treat like any other failure.
      }
      const blocked = response.status === 403 || (response.status === 400 && /chat not found/i.test(description));
      return { ok: false, blocked };
    } catch {
      // Never let a network error carry the bot token into logs or responses.
      return { ok: false, blocked: false };
    }
  };
}
