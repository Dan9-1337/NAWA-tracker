import { getCountryDisplayName, isCountryCode } from '../../shared/countries';
import { localeOrder } from '../i18n';

export function formatCountryLabel(value: string | null | undefined, locale: string, fallback = '—'): string {
  if (!value || !isCountryCode(value)) return fallback;
  return getCountryDisplayName(value, locale) ?? fallback;
}

/** The country's ISO code and its names in every app language, without repeats. For search that ignores the app language. */
export function getCountrySearchNames(code: string): string[] {
  const names = new Set<string>([code]);
  for (const locale of localeOrder) {
    const name = getCountryDisplayName(code, locale);
    if (name) names.add(name);
  }
  return [...names];
}
