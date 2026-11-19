import { en } from './en';
import { be } from './be';
import { pl } from './pl';
import { ru } from './ru';
import { uk } from './uk';
import { getTelegramLanguageCode } from '../lib/telegram';
import type { Locale, Messages } from './types';

export type { Locale, Messages } from './types';

export const LOCALE_STORAGE_KEY = 'nawa-locale';

export const messages: Record<Locale, Messages> = { pl, en, ru, uk, be };

export const localeOrder: readonly Locale[] = ['pl', 'en', 'ru', 'uk', 'be'];

export function isLocale(value: string): value is Locale {
  return (localeOrder as readonly string[]).includes(value);
}

/** Maps an IETF language tag ("uk-UA", "be", ...) to a supported locale. */
export function localeFromLanguageTag(tag: string | null | undefined): Locale | null {
  const prefix = tag?.toLowerCase().split(/[-_]/)[0];
  return prefix && isLocale(prefix) ? prefix : null;
}

export function resolveInitialLocale(): Locale {
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored && isLocale(stored)) return stored;
  }
  const fromTelegram = localeFromLanguageTag(getTelegramLanguageCode());
  if (fromTelegram) return fromTelegram;
  if (typeof navigator !== 'undefined') {
    const fromBrowser = localeFromLanguageTag(navigator.language);
    if (fromBrowser) return fromBrowser;
  }
  return 'pl';
}

let activeLocale: Locale = resolveInitialLocale();

export function setActiveLocale(locale: Locale): void {
  activeLocale = locale;
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale;
  }
}

export function getMessages(locale: Locale = activeLocale): Messages {
  return messages[locale];
}

setActiveLocale(activeLocale);
