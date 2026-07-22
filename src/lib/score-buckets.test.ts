import { describe, expect, it } from 'vitest';
import { mergeSparseBuckets, scoreToAxisPercent } from './score-buckets';

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
});
