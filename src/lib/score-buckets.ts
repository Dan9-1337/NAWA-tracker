import { nawaOrientationThreshold } from '../../shared/nawa-score';
import type { ScholarshipTrack } from '../../shared/contracts';

export const SCORE_BUCKET_COUNT = 5;

export type ScoreBucketRange = {
  from: number;
  to: number;
  counts: number[];
};

export function scoreAxisForTrack(track: ScholarshipTrack): { origin: number; max: number; step: number } {
  if (track === 'nawa_director') {
    return { origin: nawaOrientationThreshold, max: 100, step: 8 };
  }
  return { origin: 0, max: 100, step: 20 };
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

export function canShowScoreDistribution(groupSize: number, buckets: number[] | null | undefined): buckets is number[] {
  return groupSize >= 10 && Array.isArray(buckets) && buckets.length === SCORE_BUCKET_COUNT;
}
