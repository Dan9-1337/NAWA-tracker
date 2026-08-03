const POLISH_DIACRITICS = {
  ą: 'a',
  ć: 'c',
  ę: 'e',
  ł: 'l',
  ń: 'n',
  ó: 'o',
  ś: 's',
  ź: 'z',
  ż: 'z',
};

function replacePolishDiacritics(value) {
  let result = '';
  for (const char of value) {
    const lower = char.toLowerCase();
    const mapped = POLISH_DIACRITICS[lower];
    result += mapped ? (char === lower ? mapped : mapped.toUpperCase()) : char;
  }
  return result;
}

export function normalizeSearchText(text) {
  const nfkc = text.normalize('NFKC').trim().toLowerCase();
  const withoutDiacritics = replacePolishDiacritics(nfkc);
  const nfd = withoutDiacritics.normalize('NFD').replace(/\p{M}/gu, '');
  return nfd
    .replace(/[.,\-·()\/\\'"`;:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function stripPatronAndCityBoilerplate(name) {
  let stripped = name;
  stripped = stripped.replace(/\s+im\.\s+[^,]+/gi, '');
  stripped = stripped.replace(/\s+imienia\s+[^,]+/gi, '');
  stripped = stripped.replace(/\s+z\s+siedzib[aą]\s+w\s+[^,]+/gi, '');
  stripped = stripped.replace(/\s+(w|we)\s+[^,]+$/gi, '');
  return normalizeSearchText(stripped);
}

export function extractCityFromName(name) {
  const zSiedziba = name.match(/\bz\s+siedzib[aą]\s+w\s+(.+)$/i);
  if (zSiedziba?.[1]) return zSiedziba[1].trim();
  const wCity = name.match(/\b(?:w|we)\s+(.+)$/i);
  if (wCity?.[1] && !wCity[1].toLowerCase().startsWith('im.')) return wCity[1].trim();
  return undefined;
}
