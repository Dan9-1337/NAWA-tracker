export const countryCodes = [
  'UA',
  'BY',
  'KZ',
  'PL',
  'RU',
  'GE',
  'AM',
  'AZ',
  'MD',
  'UZ',
  'KG',
  'TJ',
  'TM',
  'LT',
  'LV',
  'EE',
  'CZ',
  'SK',
  'DE',
  'OTHER',
] as const;

export type CountryCode = (typeof countryCodes)[number];

/** Typical secondary-school max grade for the country. null = user must enter manually. */
export const countryMaximumGrades: Record<CountryCode, number | null> = {
  UA: 12,
  BY: 10,
  KZ: 5,
  PL: 6,
  RU: 5,
  GE: 10,
  AM: 10,
  AZ: 100,
  MD: 10,
  UZ: 5,
  KG: 5,
  TJ: 5,
  TM: 5,
  LT: 10,
  LV: 10,
  EE: 5,
  CZ: 5,
  SK: 5,
  DE: 15,
  OTHER: null,
};

export function isCountryCode(value: string): value is CountryCode {
  return (countryCodes as readonly string[]).includes(value);
}

export function defaultMaximumGradeForSchoolCountry(schoolCountry: string): number | null {
  if (!isCountryCode(schoolCountry)) return null;
  return countryMaximumGrades[schoolCountry];
}
