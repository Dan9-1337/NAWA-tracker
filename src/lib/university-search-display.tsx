import type { ReactNode } from 'react';
import type { SearchResult } from '../../shared/university-search/types';
import type { Messages } from '../i18n/types';

export function highlightSearchMatch(text: string, query: string): ReactNode {
  const trimmed = query.trim();
  if (!trimmed) return text;

  const lowerText = text.toLowerCase();
  const lowerQuery = trimmed.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);
  if (index < 0) return text;

  const before = text.slice(0, index);
  const match = text.slice(index, index + trimmed.length);
  const after = text.slice(index + trimmed.length);
  return (
    <>
      {before}
      <mark className="rounded bg-[color-mix(in_srgb,var(--color-accent)_25%,transparent)] px-0.5">
        {match}
      </mark>
      {after}
    </>
  );
}

export function formatUniversitySearchResult(
  result: SearchResult,
  t: Messages,
  options?: { isFuzzy?: boolean },
): { label: string; subtitle?: string } {
  const university = result.university;
  const shortName = university.shortNames?.[0];
  const showAbbreviation =
    shortName &&
    (result.matchedField === 'shortName' ||
      result.matchedField === 'alias' ||
      result.score >= 80);

  const label =
    showAbbreviation && shortName ? `${shortName} · ${university.name}` : university.name;

  const parts: string[] = [];
  if (university.city) {
    parts.push(university.city);
  }

  if (result.matchedField === 'formerName' && result.formerNameHint) {
    parts.push(t.universities.formerNameHint(result.formerNameHint));
  }

  if (options?.isFuzzy && result.isFuzzy) {
    parts.push(t.universities.fuzzySuggestions);
  }

  const subtitle = parts.length > 0 ? parts.join(' · ') : undefined;
  return { label, subtitle };
}

export function shouldForceCityOnResults(results: readonly SearchResult[]): boolean {
  if (results.length < 2) return false;
  const shortNames = results.map((r) => r.university.shortNames?.[0]?.toLowerCase()).filter(Boolean);
  if (shortNames.length < 2) return true;
  const uniqueShort = new Set(shortNames);
  return uniqueShort.size < shortNames.length;
}
