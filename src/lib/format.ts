import type { Locale } from '../i18n/types';

const localeMap: Record<Locale, string> = {
  pl: 'pl-PL',
  en: 'en-GB',
  ru: 'ru-RU',
};

export function formatDate(isoDate: string, locale: Locale): string {
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat(localeMap[locale], {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(iso: string, locale: Locale): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(localeMap[locale], {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
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
