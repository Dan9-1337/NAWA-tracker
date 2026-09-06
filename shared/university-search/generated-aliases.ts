import type { University } from '../universities';
import { normalizeSearchText, normalizeSearchTokens } from './normalize';

const AMBIGUOUS_STANDALONE = new Set(['asp', 'awf', 'am', 'up', 'ue', 'us']);

/** City aliases: Polish normalized key → search forms (Latin + Russian). */
export const CITY_ALIASES: Record<string, readonly string[]> = {
  warszawa: ['warszawa', 'warsaw', 'варшава'],
  krakow: ['krakow', 'kraków', 'краков'],
  wroclaw: ['wroclaw', 'wrocław', 'вроцлав'],
  gdansk: ['gdansk', 'gdańsk', 'гданьск'],
  poznan: ['poznan', 'poznań', 'познань'],
  lodz: ['lodz', 'łódź', 'лодзь'],
  katowice: ['katowice', 'катовице'],
  lublin: ['lublin', 'люблин'],
  bialystok: ['bialystok', 'białystok', 'белосток'],
  szczecin: ['szczecin', 'щецин'],
  torun: ['torun', 'toruń', 'торунь'],
  kielce: ['kielce', 'кельце'],
  bydgoszcz: ['bydgoszcz', 'бидгощ'],
  olsztyn: ['olsztyn', 'ольштын'],
  czestochowa: ['czestochowa', 'częstochowa', 'честохова'],
  rzeszow: ['rzeszow', 'rzeszów', 'жешув'],
  opole: ['opole', 'ополе'],
  suwalki: ['suwalki', 'сувалки'],
  slupsk: ['slupsk', 'słupsk', 'слупск'],
  zielona_gora: ['zielona gora', 'zielona góra', 'зелёна гура'],
};

const RUSSIAN_TYPE_PHRASES = [
  'университет',
  'политех',
  'медицинский',
  'экономический',
  'академия искусств',
] as const;

function cityKey(city: string): string | undefined {
  const normalized = normalizeSearchText(city);
  for (const [key, forms] of Object.entries(CITY_ALIASES)) {
    if (forms.some((form) => normalizeSearchText(form) === normalized)) return key;
  }
  return normalized.replace(/\s+/g, '_');
}

function cityFormsForUniversity(city: string | undefined): readonly string[] {
  if (!city) return [];
  const key = cityKey(city);
  if (key && CITY_ALIASES[key]) return CITY_ALIASES[key];
  return [normalizeSearchText(city)];
}

function stripPatronFromName(name: string): string {
  let stripped = name;
  stripped = stripped.replace(/\s+im\.\s+[^,]+/gi, '');
  stripped = stripped.replace(/\s+imienia\s+[^,]+/gi, '');
  return stripped.trim();
}

function isAmbiguousStandaloneAlias(normalized: string): boolean {
  const tokens = normalizeSearchTokens(normalized);
  if (tokens.length !== 1) return false;
  return AMBIGUOUS_STANDALONE.has(tokens[0]);
}

export function generateSearchAliases(university: University): readonly string[] {
  const aliases: string[] = [];
  const { name, city, shortNames } = university;

  const canonicalNormalized = normalizeSearchText(name);
  if (canonicalNormalized) aliases.push(canonicalNormalized);

  const withoutDiacritics = name
    .normalize('NFKC')
    .replace(/[ąćęłńóśźż]/gi, (c) => {
      const map: Record<string, string> = { ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z' };
      return map[c.toLowerCase()] ?? c;
    });
  const asciiName = normalizeSearchText(withoutDiacritics);
  if (asciiName && asciiName !== canonicalNormalized) aliases.push(asciiName);

  const withoutPatron = stripPatronFromName(name);
  const patronStripped = normalizeSearchText(withoutPatron);
  if (patronStripped && patronStripped !== canonicalNormalized) aliases.push(patronStripped);

  const cityForms = cityFormsForUniversity(city);
  const primaryCity = cityForms[0];

  if (shortNames) {
    for (const shortName of shortNames) {
      const sn = normalizeSearchText(shortName);
      if (sn) aliases.push(sn);
      if (primaryCity) aliases.push(`${sn} ${primaryCity}`);
    }
  }

  const nameLower = name.toLowerCase();
  if (nameLower.includes('politechnika') && primaryCity) {
    aliases.push(`polibuda ${primaryCity}`);
    aliases.push(`politechnika ${primaryCity}`);
  }

  if (primaryCity) {
    if (nameLower.includes('uniwersytet') && !nameLower.includes('medyczny')) {
      aliases.push(`uniwersytet ${primaryCity}`);
    }
    if (nameLower.includes('medyczny') || nameLower.includes('medical')) {
      aliases.push(`medical university ${primaryCity}`);
    }
    if (nameLower.includes('ekonomiczny')) {
      aliases.push(`uniwersytet ekonomiczny ${primaryCity}`);
    }
    if (nameLower.includes('wychowania fizycznego') || nameLower.includes('awf')) {
      const awfAlias = `awf ${primaryCity}`;
      if (!isAmbiguousStandaloneAlias(awfAlias)) aliases.push(awfAlias);
    }
    if (nameLower.includes('sztuk pięknych') || nameLower.includes('sztuk pięknych')) {
      const aspAlias = `asp ${primaryCity}`;
      if (!isAmbiguousStandaloneAlias(aspAlias)) aliases.push(aspAlias);
    }
    for (const russianType of RUSSIAN_TYPE_PHRASES) {
      const applicable =
        (russianType === 'политех' && nameLower.includes('politechnika')) ||
        (russianType === 'медицинский' && (nameLower.includes('medyczny') || nameLower.includes('medical'))) ||
        (russianType === 'экономический' && nameLower.includes('ekonomiczny')) ||
        (russianType === 'академия искусств' &&
          (nameLower.includes('sztuk pięknych') || nameLower.includes('artystyczny'))) ||
        (russianType === 'университет' &&
          nameLower.includes('uniwersytet') &&
          !nameLower.includes('medyczny'));
      if (!applicable) continue;
      for (const cityForm of cityForms) {
        if (cityForm.length > 2) aliases.push(`${russianType} ${cityForm}`);
      }
    }
  }

  return [...new Set(aliases.filter((a) => a.length > 0 && !isAmbiguousStandaloneAlias(a)))];
}

export function extractCityFromCanonicalName(name: string): string | undefined {
  const patterns = [
    /\bz\s+siedzib[aą]\s+w\s+(.+)$/i,
    /\b(?:w|we)\s+(.+)$/i,
    /\s([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+(?:\s+[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)*)$/,
  ];
  for (const pattern of patterns) {
    const match = name.match(pattern);
    if (match?.[1]) {
      const city = match[1].trim();
      if (city.length > 2 && !city.toLowerCase().startsWith('im.')) return city;
    }
  }
  return undefined;
}
