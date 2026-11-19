import type { CohortScope } from '../../shared/contracts';
import type { Locale, Messages } from '../i18n/types';
import { formatCountryLabel } from './country-label';

/** Human label of the comparison cohort: the country, a pooled country group, or all countries. */
export function cohortLabel(
  t: Messages,
  locale: Locale,
  scope: CohortScope | null,
  country: string,
  groupId: string | null,
): string {
  if (scope === 'group' && groupId) {
    const groups: Record<string, string> = t.cohort.groups;
    return groups[groupId] ?? groupId;
  }
  if (scope === 'track') return t.cohort.trackWide;
  return formatCountryLabel(country, locale);
}
