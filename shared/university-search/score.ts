import { normalizeSearchText, normalizeSearchTokens } from './normalize';
import type { IndexedTerm, SearchField, SearchIndexEntry, SearchResult } from './types';

const TIER_EXACT_SHORT = 100;
const TIER_EXACT_ALIAS = 90;
const TIER_SHORT_PREFIX = 80;
const TIER_CANONICAL_PREFIX = 70;
const TIER_OTHER_PREFIX = 60;
const TIER_TOKEN_PREFIX = 50;
const TIER_TOKEN_SUBSTRING = 40;
const TIER_CANONICAL_SUBSTRING = 30;

function minTierForQueryLength(queryLength: number): number {
  if (queryLength <= 1) return 0;
  if (queryLength === 2) return TIER_SHORT_PREFIX;
  return TIER_CANONICAL_SUBSTRING;
}

function scoreTermMatch(
  queryNormalized: string,
  queryTokens: readonly string[],
  term: IndexedTerm,
): { score: number; matchedField: SearchField; matchedTerm: string } | null {
  const { normalized, tokens, field, raw } = term;
  const displayTerm = raw ?? normalized;

  if (field === 'shortName' && normalized === queryNormalized) {
    return { score: TIER_EXACT_SHORT, matchedField: field, matchedTerm: displayTerm };
  }

  if ((field === 'alias' || field === 'formerName') && normalized === queryNormalized) {
    return { score: TIER_EXACT_ALIAS, matchedField: field, matchedTerm: displayTerm };
  }

  if (field === 'shortName' && normalized.startsWith(queryNormalized) && queryNormalized.length >= 2) {
    return { score: TIER_SHORT_PREFIX, matchedField: field, matchedTerm: displayTerm };
  }

  if (field === 'canonicalName' && normalized.startsWith(queryNormalized) && queryNormalized.length >= 2) {
    return { score: TIER_CANONICAL_PREFIX, matchedField: field, matchedTerm: displayTerm };
  }

  const prefixFields: SearchField[] = ['alias', 'formerName', 'city', 'generated'];
  if (prefixFields.includes(field) && normalized.startsWith(queryNormalized) && queryNormalized.length >= 2) {
    return { score: TIER_OTHER_PREFIX, matchedField: field, matchedTerm: displayTerm };
  }

  if (queryTokens.length > 0) {
    const allTokenPrefix = queryTokens.every((qt) =>
      tokens.some((tt) => tt.startsWith(qt) || normalized.startsWith(qt)),
    );
    if (allTokenPrefix) {
      return { score: TIER_TOKEN_PREFIX, matchedField: field, matchedTerm: displayTerm };
    }

    const allTokenSubstring = queryTokens.every(
      (qt) => tokens.some((tt) => tt.includes(qt)) || normalized.includes(qt),
    );
    if (allTokenSubstring) {
      return { score: TIER_TOKEN_SUBSTRING, matchedField: field, matchedTerm: displayTerm };
    }
  }

  if (field === 'canonicalName' && normalized.includes(queryNormalized) && queryNormalized.length >= 3) {
    return { score: TIER_CANONICAL_SUBSTRING, matchedField: field, matchedTerm: displayTerm };
  }

  return null;
}

export function scoreUniversityEntry(
  entry: SearchIndexEntry,
  query: string,
): SearchResult | null {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const queryNormalized = normalizeSearchText(trimmed);
  const queryTokens = normalizeSearchTokens(trimmed);
  if (!queryNormalized && queryTokens.length === 0) return null;

  const minTier = minTierForQueryLength(queryNormalized.length || queryTokens.join('').length);

  let best: SearchResult | null = null;

  for (const term of entry.terms) {
    const match = scoreTermMatch(queryNormalized, queryTokens, term);
    if (!match || match.score < minTier) continue;

    if (!best || match.score > best.score) {
      best = {
        university: entry.university,
        score: match.score,
        matchedField: match.matchedField,
        matchedTerm: match.matchedTerm,
        formerNameHint:
          match.matchedField === 'formerName' ? term.displayHint ?? match.matchedTerm : undefined,
      };
    }
  }

  return best;
}

export function sortSearchResults(results: readonly SearchResult[]): SearchResult[] {
  return [...results].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.university.name.localeCompare(b.university.name, 'pl');
  });
}
