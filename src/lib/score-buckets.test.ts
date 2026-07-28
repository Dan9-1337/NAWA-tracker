import { describe, expect, it } from 'vitest';
import {
  aggregateBuckets,
  displayBinCount,
  displayBuckets,
  mergeSparseBuckets,
  scoreToAxisPercent,
} from './score-buckets';

describe('score-buckets', () => {
  it('maps scores onto the axis between origin and max', () => {
    expect(scoreToAxisPercent(60, 60, 100)).toBe(0);
    expect(scoreToAxisPercent(80, 60, 100)).toBe(50);
    expect(scoreToAxisPercent(100, 60, 100)).toBe(100);
  });

  it('merges sparse buckets into neighbors', () => {
    expect(mergeSparseBuckets([1, 4, 8, 1, 5], 60, 8).counts).toEqual([5, 8, 6]);
    expect(mergeSparseBuckets([1, 1, 10, 1, 1], 60, 8).counts).toEqual([2, 10, 2]);
  });

  it('picks display bin counts by group size', () => {
    expect(displayBinCount(24)).toBe(4);
    expect(displayBinCount(80)).toBe(8);
    expect(displayBinCount(240)).toBe(16);
  });

  it('aggregates sixteen fine buckets for display', () => {
    const fine = Array.from({ length: 16 }, (_, index) => index + 1);
    expect(aggregateBuckets(fine, 4)).toEqual([10, 26, 42, 58]);
    expect(displayBuckets(fine, 80)).toHaveLength(8);
  });
});
