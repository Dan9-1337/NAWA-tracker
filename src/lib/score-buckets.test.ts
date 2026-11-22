import { describe, expect, it } from 'vitest';
import {
  aggregateBuckets,
  displayBinCount,
  displayBuckets,
  mergeSparseBuckets,
  percentileBand,
  percentileInBuckets,
  scoreAtPercentile,
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

  it('places a score inside the cohort and inverts it back', () => {
    const buckets = [10, 20, 40, 20, 10];
    expect(percentileInBuckets(50, buckets, 60, 8)).toBe(0);
    expect(percentileInBuckets(120, buckets, 60, 8)).toBe(100);
    expect(percentileInBuckets(80, buckets, 60, 8)).toBe(50);
    expect(scoreAtPercentile(50, buckets, 60, 8)).toBe(80);
    expect(scoreAtPercentile(0, buckets, 60, 8)).toBe(60);
    expect(scoreAtPercentile(100, buckets, 60, 8)).toBe(100);
  });

  it('turns a score into an approximate decile band', () => {
    const buckets = Array.from({ length: 16 }, () => 10);

    expect(percentileBand(60, buckets, 'nawa_director')).toEqual({ kind: 'band', from: 0, to: 10 });
    expect(percentileBand(80, buckets, 'nawa_director')).toEqual({ kind: 'band', from: 50, to: 60 });
    expect(percentileBand(100, buckets, 'nawa_director')).toEqual({ kind: 'band', from: 90, to: 100 });
  });

  it('reports scores below the axis origin instead of a band', () => {
    const buckets = Array.from({ length: 16 }, () => 10);

    expect(percentileBand(59.5, buckets, 'nawa_director')).toEqual({ kind: 'belowAxis' });
    expect(percentileBand(0, buckets, 'nawa_director')).toEqual({ kind: 'belowAxis' });
  });

  it('has no band without a response distribution', () => {
    expect(percentileBand(80, [], 'nawa_director')).toBeNull();
    expect(percentileBand(80, Array.from({ length: 16 }, () => 0), 'nawa_director')).toBeNull();
  });
});
