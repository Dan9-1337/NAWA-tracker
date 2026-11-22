import type { Locale } from '../i18n/types';
import { formatCountryLabel } from './country-label';

/**
 * Human label of the comparison cohort. It is always the applicant's country of citizenship: country groups
 * and the whole-track tier are no longer used for the score comparison (ADR 0015).
 */
export function cohortLabel(locale: Locale, country: string): string {
  return formatCountryLabel(country, locale);
}
