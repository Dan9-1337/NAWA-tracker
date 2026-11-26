import type { University } from '../universities';
import { generateSearchAliases } from './generated-aliases';
import { normalizeSearchText, normalizeSearchTokens } from './normalize';
import type { IndexedTerm, SearchIndexEntry, SearchField } from './types';

const FIELD_PRIORITY: Record<SearchField, number> = {
  shortName: 6,
  alias: 5,
  formerName: 5,
  canonicalName: 4,
  city: 3,
  generated: 2,
  fuzzy: 1,
};

function termFromRaw(raw: string, field: SearchField, displayHint?: string): IndexedTerm | null {
  const normalized = normalizeSearchText(raw);
  if (!normalized) return null;
  const tokens = normalizeSearchTokens(raw);
  if (tokens.length === 0) return null;
  return { normalized, tokens, field, displayHint, raw };
}

function addTerm(map: Map<string, IndexedTerm>, term: IndexedTerm): void {
  const existing = map.get(term.normalized);
  if (!existing || FIELD_PRIORITY[term.field] > FIELD_PRIORITY[existing.field]) {
    map.set(term.normalized, term);
  }
}

export function buildUniversitySearchIndex(universities: readonly University[]): readonly SearchIndexEntry[] {
  return universities.map((university) => {
    const termMap = new Map<string, IndexedTerm>();

    const canonical = termFromRaw(university.name, 'canonicalName');
    if (canonical) addTerm(termMap, canonical);

    if (university.city) {
      const cityTerm = termFromRaw(university.city, 'city');
      if (cityTerm) addTerm(termMap, cityTerm);
    }

    if (university.shortNames) {
      for (const shortName of university.shortNames) {
        const term = termFromRaw(shortName, 'shortName');
        if (term) addTerm(termMap, term);
      }
    }

    if (university.aliases) {
      for (const alias of university.aliases) {
        const term = termFromRaw(alias, 'alias');
        if (term) addTerm(termMap, term);
      }
    }

    if (university.formerNames) {
      for (const formerName of university.formerNames) {
        const term = termFromRaw(formerName, 'formerName', formerName);
        if (term) addTerm(termMap, term);
      }
    }

    for (const generated of generateSearchAliases(university)) {
      const term = termFromRaw(generated, 'generated');
      if (term) addTerm(termMap, term);
    }

    return {
      university,
      terms: [...termMap.values()],
    };
  });
}

const indexCache = new Map<string, readonly SearchIndexEntry[]>();

export function getUniversitySearchIndex(universities: readonly University[]): readonly SearchIndexEntry[] {
  const key = universities.map((u) => u.id).join('|');
  const cached = indexCache.get(key);
  if (cached) return cached;
  const index = buildUniversitySearchIndex(universities);
  indexCache.set(key, index);
  return index;
}
