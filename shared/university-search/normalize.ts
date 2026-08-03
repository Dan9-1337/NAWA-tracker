const POLISH_DIACRITICS: Record<string, string> = {
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

const PUNCTUATION_RE = /[.,\-·()\/\\'"`;:]+/g;
const WHITESPACE_RE = /\s+/g;
const TOKEN_RE = /[a-z0-9\u0400-\u04ff]+/gi;

const LOW_INFO_TOKENS = new Set([
  'im',
  'imienia',
  'w',
  'we',
  'z',
  'siedziba',
  'siedzibą',
  'siedziby',
  'z siedziba',
]);

function replacePolishDiacritics(value: string): string {
  let result = '';
  for (const char of value) {
    const lower = char.toLowerCase();
    const mapped = POLISH_DIACRITICS[lower];
    if (mapped) {
      result += char === lower ? mapped : mapped.toUpperCase();
    } else {
      result += char;
    }
  }
  return result;
}

function baseNormalize(text: string): string {
  const nfkc = text.normalize('NFKC').trim().toLowerCase();
  const withoutDiacritics = replacePolishDiacritics(nfkc);
  const nfd = withoutDiacritics.normalize('NFD').replace(/\p{M}/gu, '');
  return nfd.replace(PUNCTUATION_RE, ' ').replace(WHITESPACE_RE, ' ').trim();
}

/** Trim, lowercase, strip Polish diacritics, normalize Unicode, collapse punctuation and whitespace. */
export function normalizeSearchText(text: string): string {
  return baseNormalize(text);
}

/** Tokenize preserving Latin and Cyrillic letter runs. */
export function normalizeSearchTokens(text: string): readonly string[] {
  const normalized = baseNormalize(text);
  if (!normalized) return [];
  const tokens = normalized.match(TOKEN_RE) ?? [];
  return tokens.map((token) => token.toLowerCase());
}

/** Remove low-information tokens for secondary matching passes. */
export function normalizeSearchTextWithoutLowInfo(text: string): string {
  const tokens = normalizeSearchTokens(text).filter((token) => !LOW_INFO_TOKENS.has(token));
  return tokens.join(' ');
}

/** Strip patron and city boilerplate for reconcile name matching. */
export function stripPatronAndCityBoilerplate(name: string): string {
  let stripped = name;
  stripped = stripped.replace(/\s+im\.\s+[^,]+/gi, '');
  stripped = stripped.replace(/\s+imienia\s+[^,]+/gi, '');
  stripped = stripped.replace(/\s+z\s+siedzib[aą]\s+w\s+[^,]+/gi, '');
  stripped = stripped.replace(/\s+(w|we)\s+[^,]+$/gi, '');
  return normalizeSearchText(stripped);
}
