import { nawaOrientationThreshold } from '../../shared/nawa-score';
import type { ScholarshipTrack } from '../../shared/contracts';

export const FINE_BUCKET_COUNT = 16;

export type ScoreBucketRange = {
  from: number;
  to: number;
  counts: number[];
};

export function scoreAxisForTrack(track: ScholarshipTrack): { origin: number; max: number; step: number } {
  if (track === 'nawa_director') {
    return { origin: nawaOrientationThreshold, max: 100, step: 2.5 };
  }
  return { origin: 0, max: 100, step: 6.25 };
}

export function displayBinCount(groupSize: number): 4 | 8 | 16 {
  if (groupSize >= 200) return 16;
  if (groupSize >= 40) return 8;
  return 4;
}

export function aggregateBuckets(buckets: number[], targetCount: 4 | 8 | 16): number[] {
  if (buckets.length === targetCount) return [...buckets];
  if (buckets.length % targetCount !== 0) {
    throw new Error(`Cannot aggregate ${buckets.length} buckets into ${targetCount}`);
  }

  const groupSize = buckets.length / targetCount;
  const aggregated: number[] = [];

  for (let group = 0; group < targetCount; group += 1) {
    const start = group * groupSize;
    aggregated.push(buckets.slice(start, start + groupSize).reduce((sum, count) => sum + count, 0));
  }

  return aggregated;
}

export function scoreToAxisPercent(score: number, origin: number, max: number): number {
  const span = max - origin;
  if (span <= 0) return 0;
  return Math.min(100, Math.max(0, ((score - origin) / span) * 100));
}

/** Merge adjacent buckets with very few responses to avoid misleading single-response bars. */
export function mergeSparseBuckets(
  buckets: number[],
  origin: number,
  step: number,
  minCount = 2,
): ScoreBucketRange {
  let counts = [...buckets];
  let from = origin;
  let to = origin + step * counts.length;

  while (counts.length > 2) {
    const sparseIndex = counts.findIndex((count) => count > 0 && count < minCount);
    if (sparseIndex === -1) break;

    if (sparseIndex === counts.length - 1) {
      counts[sparseIndex - 1] += counts[sparseIndex];
      counts.pop();
      to -= step;
      continue;
    }

    counts[sparseIndex + 1] += counts[sparseIndex];
    counts.splice(sparseIndex, 1);
    from += step;
  }

  return { from, to, counts };
}

export function bucketFillOpacity(count: number, maxCount: number): number {
  if (count <= 0 || maxCount <= 0) return 0;
  const ratio = count / maxCount;
  return 0.28 + ratio * 0.72;
}

export function canShowScoreDistribution(buckets: number[] | null | undefined): buckets is number[] {
  return Array.isArray(buckets) && buckets.length === FINE_BUCKET_COUNT;
}

export function displayBuckets(buckets: number[], groupSize: number): number[] {
  const targetCount = displayBinCount(groupSize);
  return aggregateBuckets(buckets, targetCount);
}

/** Share (0–100) of responses below `score`, interpolating inside the bucket that holds it. */
export function percentileInBuckets(score: number, buckets: number[], origin: number, step: number): number {
  const total = buckets.reduce((sum, count) => sum + count, 0);
  if (total <= 0 || step <= 0) return 0;

  const position = (score - origin) / step;
  if (position <= 0) return 0;
  if (position >= buckets.length) return 100;

  const whole = Math.floor(position);
  const below = buckets.slice(0, whole).reduce((sum, count) => sum + count, 0) + buckets[whole] * (position - whole);
  return (below / total) * 100;
}

export type PercentileBand =
  | { kind: 'band'; from: number; to: number }
  | { kind: 'belowAxis' };

/**
 * Approximate decile band for `score`, using the same 10-point rule as the landing preview.
 * Returns `belowAxis` for scores under the track's axis origin, and `null` when there is no distribution.
 */
export function percentileBand(
  score: number,
  buckets: number[],
  track: ScholarshipTrack,
): PercentileBand | null {
  const total = buckets.reduce((sum, count) => sum + count, 0);
  if (buckets.length === 0 || total <= 0) return null;

  const { origin, step } = scoreAxisForTrack(track);
  if (score < origin) return { kind: 'belowAxis' };

  const percentile = percentileInBuckets(score, buckets, origin, step);
  const from = Math.min(Math.floor(percentile / 10) * 10, 90);

  return { kind: 'band', from, to: from + 10 };
}

/** Inverse of `percentileInBuckets`: the score that has `percentile` percent of responses below it. */
export function scoreAtPercentile(percentile: number, buckets: number[], origin: number, step: number): number {
  const total = buckets.reduce((sum, count) => sum + count, 0);
  if (total <= 0) return origin;

  const target = (total * Math.min(Math.max(percentile, 0), 100)) / 100;
  let cumulative = 0;
  for (let index = 0; index < buckets.length; index += 1) {
    const next = cumulative + buckets[index];
    if (target <= next && buckets[index] > 0) {
      return origin + (index + (target - cumulative) / buckets[index]) * step;
    }
    cumulative = next;
  }
  return origin + buckets.length * step;
}
