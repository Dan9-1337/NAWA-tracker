import type { Locale } from '../i18n/types';

/**
 * Intl locales per interface language, in order of preference. Some Chromium builds (desktop Chrome, and likely
 * Telegram Desktop) ship no Belarusian data and silently answer in en-US ("78.75", "November 19"). Russian shares its
 * decimal comma, digit grouping and 24-hour clock, so it stands in for numbers and time.
 */
const localeMap: Record<Locale, string[]> = {
  pl: ['pl-PL'],
  en: ['en-GB'],
  ru: ['ru-RU'],
  uk: ['uk-UA'],
  be: ['be-BY', 'ru-RU'],
};

const belarusianMonths = [
  'студзеня',
  'лютага',
  'сакавіка',
  'красавіка',
  'мая',
  'чэрвеня',
  'ліпеня',
  'жніўня',
  'верасня',
  'кастрычніка',
  'лістапада',
  'снежня',
] as const;

const belarusianShortMonths = ['сту', 'лют', 'сак', 'кра', 'мая', 'чэр', 'ліп', 'жні', 'вер', 'кас', 'ліс', 'сне'] as const;

/** True when the browser has no Belarusian locale data, so month names cannot come from Intl. */
function lacksBelarusianData(): boolean {
  return Intl.DateTimeFormat.supportedLocalesOf('be-BY').length === 0;
}

export function formatBelarusianDate(date: Date): string {
  return `${date.getDate()} ${belarusianMonths[date.getMonth()]} ${date.getFullYear()} г.`;
}

export function formatDate(isoDate: string, locale: Locale): string {
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  if (locale === 'be' && lacksBelarusianData()) return formatBelarusianDate(date);
  return new Intl.DateTimeFormat(localeMap[locale], {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatClockTime(iso: string, locale: Locale): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(localeMap[locale], {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatShortDayTime(iso: string, locale: Locale): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  if (locale === 'be' && lacksBelarusianData()) {
    return `${date.getDate()} ${belarusianShortMonths[date.getMonth()]}, ${formatClockTime(iso, locale)}`;
  }
  return new Intl.DateTimeFormat(localeMap[locale], {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function updatedStampKind(iso: string): 'today' | 'yesterday' | 'other' {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'other';
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfThatDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDiff = Math.round((startOfToday.getTime() - startOfThatDay.getTime()) / 86_400_000);
  if (dayDiff === 0) return 'today';
  if (dayDiff === 1) return 'yesterday';
  return 'other';
}

export function formatGrade(value: number, locale: Locale): string {
  return new Intl.NumberFormat(localeMap[locale], {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatScore(value: number, locale: Locale): string {
  return new Intl.NumberFormat(localeMap[locale], {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

export function parseLocalizedNumber(raw: string): number | null {
  const normalized = raw.trim().replace(/\s/g, '').replace(',', '.');
  if (normalized === '') return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Two decimals, as the published formula rounds: 82,80. */
export function formatPrecise(value: number, locale: Locale): string {
  return new Intl.NumberFormat(localeMap[locale], {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
