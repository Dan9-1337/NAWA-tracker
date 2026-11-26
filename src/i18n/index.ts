import { en } from './en';
import { be } from './be';
import { pl } from './pl';
import { ru } from './ru';
import { uk } from './uk';
import { resolveLocaleFromTags, supportedLocaleFromTag } from '../../shared/locale-fallback';
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
  return supportedLocaleFromTag(tag);
}

export function resolveInitialLocale(): Locale {
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored && isLocale(stored)) return stored;
  }
  // A supported Telegram or browser language wins; otherwise Russian for the region's languages, else English.
  return resolveLocaleFromTags([getTelegramLanguageCode(), typeof navigator !== 'undefined' ? navigator.language : null]);
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
