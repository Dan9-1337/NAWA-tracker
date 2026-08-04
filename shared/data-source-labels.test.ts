import { describe, expect, it } from 'vitest';
import { dataSourceLabels, normalizeDataSourceLabel } from './data-source-labels';

describe('data-source-labels', () => {
  it('includes all spec-aligned source labels', () => {
    expect(dataSourceLabels).toContain('calculated');
    expect(dataSourceLabels).toContain('country_sample');
    expect(dataSourceLabels).toContain('global_sample');
    expect(dataSourceLabels).toContain('nawa_estimate');
    expect(dataSourceLabels).toContain('official');
    expect(dataSourceLabels).toContain('historical');
    expect(dataSourceLabels).toContain('reported');
  });

  it('normalizes legacy estimate to nawa_estimate', () => {
    expect(normalizeDataSourceLabel('estimate')).toBe('nawa_estimate');
    expect(normalizeDataSourceLabel('country_sample')).toBe('country_sample');
  });
});
