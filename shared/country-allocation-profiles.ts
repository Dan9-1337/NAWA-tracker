import {
  getHistoricalGroupsForCountry,
  getLatestHistoricalGroupForCountry,
  hasHistoricalCountryQuota,
} from './historical-seat-records';

export type CountryAllocationDisplayPreference =
  | 'auto'
  | 'country_estimate'
  | 'country_and_group_estimate';

export type CountryAllocationProfile = {
  country: string;
  hasHistoricalCountryQuota: boolean;
  historicalGroupIds: string[];
  preferredDisplayMode: CountryAllocationDisplayPreference;
};

const SMALL_COUNTRY_APPLICATION_THRESHOLD = 25;
const SMALL_COUNTRY_SHARE_THRESHOLD = 0.03;

const knownProfiles: Partial<Record<string, Omit<CountryAllocationProfile, 'country'>>> = {
  KZ: {
    hasHistoricalCountryQuota: true,
    historicalGroupIds: ['region-iv-2019'],
    preferredDisplayMode: 'auto',
  },
};

export function getCountryAllocationProfile(country: string): CountryAllocationProfile {
  const known = knownProfiles[country];
  const historicalGroupIds =
    known?.historicalGroupIds ??
    getHistoricalGroupsForCountry(country)
      .map((record) => record.groupId)
      .filter((id): id is string => Boolean(id));

  return {
    country,
    hasHistoricalCountryQuota: known?.hasHistoricalCountryQuota ?? hasHistoricalCountryQuota(country),
    historicalGroupIds,
    preferredDisplayMode: known?.preferredDisplayMode ?? 'auto',
  };
}

export function getIllustrativeGroupIdForCountry(country: string): string | null {
  const profile = getCountryAllocationProfile(country);
  if (profile.historicalGroupIds.length > 0) {
    return profile.historicalGroupIds[profile.historicalGroupIds.length - 1];
  }
  return getLatestHistoricalGroupForCountry(country)?.groupId ?? null;
}

export function shouldUseCountryAndGroupEstimate(input: {
  country: string;
  applicationCountInScope: number;
  applicationShare: number;
  totalApplicationCount: number;
}): boolean {
  const profile = getCountryAllocationProfile(input.country);

  if (profile.preferredDisplayMode === 'country_and_group_estimate') return true;
  if (profile.preferredDisplayMode === 'country_estimate') return false;

  const isSmallByCount = input.applicationCountInScope < SMALL_COUNTRY_APPLICATION_THRESHOLD;
  const isSmallByShare =
    input.totalApplicationCount > 0 &&
    input.applicationShare < SMALL_COUNTRY_SHARE_THRESHOLD;

  return (isSmallByCount || isSmallByShare) && profile.historicalGroupIds.length > 0;
}
