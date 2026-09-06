import { en } from './en';
import { pl } from './pl';
import { ru } from './ru';
import type { Locale, Messages } from './types';

export type { Locale, Messages } from './types';

export const LOCALE_STORAGE_KEY = 'nawa-locale';

export const messages: Record<Locale, Messages> = { pl, en, ru };

export function isLocale(value: string): value is Locale {
  return value === 'pl' || value === 'en' || value === 'ru';
}

export function resolveInitialLocale(): Locale {
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored && isLocale(stored)) return stored;
  }
  if (typeof navigator !== 'undefined') {
    const lang = navigator.language.toLowerCase();
    if (lang.startsWith('pl')) return 'pl';
    if (lang.startsWith('ru')) return 'ru';
    if (lang.startsWith('en')) return 'en';
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
