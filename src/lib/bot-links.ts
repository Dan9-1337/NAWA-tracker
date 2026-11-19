import { countryStartParam } from '../../shared/start-param';
import { getTelegramWebApp } from './telegram';

const DEFAULT_BOT = 'nawa_tracker_bot';

export function getBotUsername(): string {
  return import.meta.env.VITE_TELEGRAM_BOT_USERNAME?.trim() || DEFAULT_BOT;
}

/** Opens the bot chat and starts it with "subscribe", which turns reminders on. */
export function botSubscribeLink(): string {
  return `https://t.me/${getBotUsername()}?start=subscribe`;
}

/** Direct Mini App link that opens the app with a country preselected (needs the bot's Main Mini App). */
export function botCountryLink(country: string): string {
  return `https://t.me/${getBotUsername()}?startapp=${countryStartParam(country)}`;
}

/** Telegram's share sheet for a link plus text. */
export function telegramShareLink(link: string, text: string): string {
  return `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`;
}

export function openTelegramUrl(url: string): void {
  const webApp = getTelegramWebApp();
  if (webApp?.openTelegramLink) {
    webApp.openTelegramLink(url);
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}
