import { getCountryDisplayName, isCountryCode } from '../../shared/countries';

export function formatCountryLabel(value: string | null | undefined, locale: string, fallback = '—'): string {
  if (!value || !isCountryCode(value)) return fallback;
  return getCountryDisplayName(value, locale) ?? fallback;
}
