import { normalizeSearchTokens } from './normalize';
import type { SearchIndexEntry, SearchResult } from './types';
import { scoreUniversityEntry, sortSearchResults } from './score';

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = b.charAt(i - 1) === a.charAt(j - 1) ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  return matrix[b.length][a.length];
}

function maxEditsForToken(token: string): number {
  if (token.length >= 8) return 2;
  if (token.length >= 4) return 1;
  return 0;
}

function tokensFuzzyMatch(queryToken: string, entryTokens: readonly string[]): boolean {
  const maxEdits = maxEditsForToken(queryToken);
  if (maxEdits === 0) return entryTokens.some((t) => t.startsWith(queryToken) || t.includes(queryToken));
  return entryTokens.some((t) => levenshtein(queryToken, t) <= maxEdits);
}

function looksLikeAbbreviation(query: string): boolean {
  const trimmed = query.trim();
  if (trimmed.length <= 5 && /^[A-ZĄĆĘŁŃÓŚŹŻ0-9]+$/.test(trimmed)) return true;
  return false;
}

export function fuzzySearchUniversities(
  entries: readonly SearchIndexEntry[],
  query: string,
  maxResults = 5,
): SearchResult[] {
  const trimmed = query.trim();
  if (trimmed.length < 4 || looksLikeAbbreviation(trimmed)) return [];

  const queryTokens = normalizeSearchTokens(trimmed);
  if (queryTokens.length === 0) return [];

  const results: SearchResult[] = [];

  for (const entry of entries) {
    const entryTokens = entry.terms.flatMap((term) => term.tokens);
    const allMatch = queryTokens.every((qt) => tokensFuzzyMatch(qt, entryTokens));
    if (!allMatch) continue;

    results.push({
      university: entry.university,
      score: 10,
      matchedField: 'fuzzy',
      matchedTerm: trimmed,
      isFuzzy: true,
    });
  }

  return sortSearchResults(results).slice(0, maxResults);
}

export function searchUniversities(
  entries: readonly SearchIndexEntry[],
  query: string,
  options?: { enableFuzzy?: boolean; selectionCounts?: Readonly<Record<string, number>> },
): SearchResult[] {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length <= 1) {
    return entries.map((entry) => ({
      university: entry.university,
      score: 0,
      matchedField: 'canonicalName' as const,
      matchedTerm: entry.university.name,
    }));
  }

  const scored: SearchResult[] = [];
  for (const entry of entries) {
    const result = scoreUniversityEntry(entry, trimmed);
    if (result) scored.push(result);
  }

  let results = sortSearchResults(scored);

  if (results.length === 0 && options?.enableFuzzy) {
    results = fuzzySearchUniversities(entries, trimmed);
  }

  if (options?.selectionCounts && results.length > 1) {
    const topScore = results[0].score;
    const tied = results.filter((r) => r.score === topScore);
    if (tied.length > 1) {
      const counts = options.selectionCounts;
      results = [...results].sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const countA = counts[a.university.id] ?? 0;
        const countB = counts[b.university.id] ?? 0;
        if (countB !== countA) return countB - countA;
        return a.university.name.localeCompare(b.university.name, 'pl');
      });
    }
  }

  return results;
}
