export const dataSourceLabels = ['official', 'historical', 'estimate', 'reported'] as const;

export type DataSourceLabel = (typeof dataSourceLabels)[number];
