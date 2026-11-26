import { describe, expect, it } from 'vitest';
import { MIN_COHORT_SIZE } from './product-rules';

describe('product-rules', () => {
  it('keeps the landing response counter behind an intake of ten', () => {
    expect(MIN_COHORT_SIZE).toBe(10);
  });
});
