/** All attribution labels used across dashboard statistics. */
export const dataSourceLabels = [
  'official',
  'historical',
  'reported',
  /** @deprecated Prefer `nawa_estimate` — kept for existing call sites. */
  'estimate',
  'calculated',
  'country_sample',
  'global_sample',
  'nawa_estimate',
] as const;

export type DataSourceLabel = (typeof dataSourceLabels)[number];

/** Normalizes legacy `estimate` to the spec-aligned label. */
export function normalizeDataSourceLabel(source: DataSourceLabel): DataSourceLabel {
  return source === 'estimate' ? 'nawa_estimate' : source;
}
