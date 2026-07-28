import { isCountryCode } from '../../shared/countries';
import type { Messages } from '../i18n/types';

export function formatCountryLabel(value: string | null | undefined, countries: Messages['countries']): string {
  if (!value) return countries.OTHER;
  if (isCountryCode(value)) return countries[value];
  return countries.OTHER;
}
