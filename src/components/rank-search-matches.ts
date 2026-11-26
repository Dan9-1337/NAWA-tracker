import { normalizeSearchText } from '../../shared/university-search/normalize';

/** `aliases` are other names for the same option (for example a country's names in other languages or its ISO code). */
type RankableOption = { label: string; group?: string; aliases?: readonly string[] };

/** 1 equals the query, 2 starts with it, 3 a word starts with it, 4 anything else the matcher accepted. */
function textTier(label: string, query: string): 1 | 2 | 3 | 4 {
  const text = normalizeSearchText(label);
  if (text === query) return 1;
  if (text.startsWith(query)) return 2;
  // Normalization turns spaces, `-`, `/`, `(` and `,` into single spaces, so a word start follows a space.
  if (` ${text}`.includes(` ${query}`)) return 3;
  return 4;
}

/** The best tier over the label and every alias. */
function matchTier(option: RankableOption, query: string): 1 | 2 | 3 | 4 {
  let best = textTier(option.label, query);
  for (const alias of option.aliases ?? []) {
    if (best === 1) break;
    best = Math.min(best, textTier(alias, query)) as 1 | 2 | 3 | 4;
  }
  return best;
}

/**
 * Orders options the picker already matched by how close the match is, keeping the original order inside a tier.
 * Ranking happens inside each group; groups stay in order of their first option.
 */
export function rankSearchMatches<T extends RankableOption>(matches: readonly T[], query: string): T[] {
  const normalizedQuery = normalizeSearchText(query);
  const groups = new Map<string, { option: T; tier: number }[]>();
  for (const option of matches) {
    const key = option.group ?? '';
    const bucket = groups.get(key) ?? [];
    bucket.push({ option, tier: matchTier(option, normalizedQuery) });
    groups.set(key, bucket);
  }
  return [...groups.values()].flatMap((bucket) =>
    // Array.prototype.sort is stable, so equal tiers keep their original relative order.
    bucket.sort((a, b) => a.tier - b.tier).map(({ option }) => option),
  );
}
