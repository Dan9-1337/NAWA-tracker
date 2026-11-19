import { isCountryCode, type CountryCode } from './countries';

const COUNTRY_PREFIX = 'c_';

/** `startapp=c_UA` (or `?c=UA`) preselects the country of citizenship for a new profile. */
export function parseStartCountry(param: string | null | undefined): CountryCode | null {
  if (!param) return null;
  const raw = param.startsWith(COUNTRY_PREFIX) ? param.slice(COUNTRY_PREFIX.length) : param;
  const code = raw.toUpperCase();
  return isCountryCode(code) ? code : null;
}

export function countryStartParam(country: string): string {
  return `${COUNTRY_PREFIX}${country.toUpperCase()}`;
}
