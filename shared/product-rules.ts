import type { StatisticsResult } from './contracts';

/** Minimum cohort size before detailed aggregates are shown (k-anonymity). */
export const MIN_K_ANONYMITY = 10;

export type StatisticsScope = 'country' | 'global';

/** Metrics that must never be shown at global scope. */
export const FORBIDDEN_GLOBAL_METRICS = [
  'rankPosition',
  'rankTotal',
  'cutoff',
  'scholarshipProbability',
] as const;

export type ForbiddenGlobalMetric = (typeof FORBIDDEN_GLOBAL_METRICS)[number];

/** Copy patterns that must not appear in global-facing UI strings. */
export const FORBIDDEN_GLOBAL_COPY_PATTERNS: RegExp[] = [
  // Absolute global rank: "143rd of 476", "143-й из 476"
  /\b\d{1,4}\s*[-‑]?(й|я|е|го|th|rd|nd|st)\s+(из|of|z)\s+\d{1,4}\b/i,
  /\b(you are|вы)\s+\d{1,4}\s*[-‑]?(й|я|е|го|th|rd|nd|st)\b/i,
  // Country superiority framing (no word boundaries — Cyrillic \b is unreliable in JS)
  /(слабее|сильнее|easier to get in|harder to get in|leads? in scores?|лидирует)/i,
  /(this country|эта страна|ta kraj).*(weaker|stronger|слабее|сильнее)/i,
];

export function isCountryScope(scope: StatisticsScope): boolean {
  return scope === 'country';
}

/** Official competitive rank/position is only meaningful inside the country cohort. */
export function canShowCompetitiveRank(scope: StatisticsScope): boolean {
  return isCountryScope(scope);
}

/** Global percentile is allowed only as a secondary benchmark with an explicit disclaimer. */
export function canShowGlobalPercentile(options: { secondary: boolean }): boolean {
  return options.secondary;
}

export function canShowGlobalMedian(sampleSize: number | null | undefined): boolean {
  return sampleSize != null && sampleSize >= MIN_K_ANONYMITY;
}

export function canShowCountryDetailedStats(countrySampleSize: number | null | undefined): boolean {
  return countrySampleSize != null && countrySampleSize >= MIN_K_ANONYMITY;
}

export function canShowCompetitionNeighbourhood(
  countrySampleSize: number | null | undefined,
  cohortScores: number[] | null | undefined,
): boolean {
  return (
    canShowCountryDetailedStats(countrySampleSize) &&
    cohortScores != null &&
    cohortScores.length > 0
  );
}

type GlobalBenchmarkLike = {
  rankPosition?: number | null;
  rankTotal?: number | null;
};

/** Runtime guard for API payloads — global benchmark must not expose rank fields. */
export function assertNoForbiddenGlobalMetrics(
  payload: GlobalBenchmarkLike,
  scope: StatisticsScope,
): void {
  if (!isCountryScope(scope)) {
    for (const key of FORBIDDEN_GLOBAL_METRICS) {
      if (key === 'rankPosition' || key === 'rankTotal') {
        const value = payload[key];
        if (value != null) {
          throw new Error(`forbidden_global_metric:${key}`);
        }
      }
    }
  }
}

/** Returns true if copy is safe for global-facing UI. */
export function isGlobalCopySafe(text: string): boolean {
  return !FORBIDDEN_GLOBAL_COPY_PATTERNS.some((pattern) => pattern.test(text));
}

/** Country cohort size used for gating — prefers sameCountryCount when available. */
export function resolveCountrySampleSize(data: StatisticsResult): number | null {
  return data.sameCountryCount;
}
