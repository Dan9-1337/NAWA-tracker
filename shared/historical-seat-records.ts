export type HistoricalSeatScope = 'country' | 'country_group' | 'programme_total';

export type HistoricalSeatRecord = {
  year: number;
  scope: HistoricalSeatScope;
  seats: number;
  country?: string;
  groupId?: string;
  groupMembers?: string[];
  sourceLabel: string;
  sourceNote: string;
};

export const historicalSeatRecords: HistoricalSeatRecord[] = [
  {
    year: 2019,
    scope: 'country_group',
    seats: 35,
    groupId: 'region-iv-2019',
    groupMembers: ['AL', 'AM', 'AZ', 'GE', 'KZ', 'KG', 'RU', 'UZ', 'TJ', 'TM'],
    sourceLabel: 'Anders NAWA 2019',
    sourceNote:
      'Historical quota for the entire country group. It must not be presented as a Kazakhstan-specific quota.',
  },
  {
    year: 2020,
    scope: 'country',
    country: 'KZ',
    seats: 14,
    sourceLabel: 'Anders NAWA 2020',
    sourceNote: 'Published country-specific quota.',
  },
  {
    year: 2021,
    scope: 'country',
    country: 'KZ',
    seats: 25,
    sourceLabel: 'Anders NAWA 2021',
    sourceNote: 'Published country-specific quota.',
  },
];

export function getHistoricalSeatRecordsByScope(scope: HistoricalSeatScope): HistoricalSeatRecord[] {
  return historicalSeatRecords.filter((record) => record.scope === scope);
}

export function getCountryHistoricalSeatRecords(country: string): HistoricalSeatRecord[] {
  return historicalSeatRecords.filter(
    (record) => record.scope === 'country' && record.country === country,
  );
}

export function getHistoricalGroupsForCountry(country: string): HistoricalSeatRecord[] {
  return historicalSeatRecords.filter(
    (record) =>
      record.scope === 'country_group' &&
      record.groupMembers?.includes(country) === true,
  );
}

export function getHistoricalSeatRecordByGroupId(groupId: string): HistoricalSeatRecord | null {
  return (
    historicalSeatRecords.find(
      (record) => record.scope === 'country_group' && record.groupId === groupId,
    ) ?? null
  );
}

/** Latest country-specific quota only — never returns a group quota for a country. */
export function getLatestCountryHistoricalQuota(country: string): HistoricalSeatRecord | null {
  const countryRecords = getCountryHistoricalSeatRecords(country);
  if (countryRecords.length === 0) return null;
  return countryRecords.reduce((latest, record) =>
    record.year > latest.year ? record : latest,
  );
}

/** Most recent historical group that includes the country, for illustrative group scenarios. */
export function getLatestHistoricalGroupForCountry(country: string): HistoricalSeatRecord | null {
  const groups = getHistoricalGroupsForCountry(country);
  if (groups.length === 0) return null;
  return groups.reduce((latest, record) => (record.year > latest.year ? record : latest));
}

export function hasHistoricalCountryQuota(country: string): boolean {
  return getCountryHistoricalSeatRecords(country).length > 0;
}
