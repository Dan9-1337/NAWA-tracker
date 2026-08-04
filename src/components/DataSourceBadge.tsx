import {
  type DataSourceLabel,
  normalizeDataSourceLabel,
} from '../../shared/data-source-labels';
import { useI18n } from '../i18n/context';

type DataSourceBadgeProps = {
  source: DataSourceLabel;
  className?: string;
};

const badgeTone: Record<DataSourceLabel, string> = {
  official: 'stat-badge stat-badge--accent',
  historical: 'stat-badge',
  reported: 'stat-badge',
  estimate: 'stat-badge stat-badge--reliability',
  calculated: 'stat-badge stat-badge--reliability',
  country_sample: 'stat-badge',
  global_sample: 'stat-badge',
  nawa_estimate: 'stat-badge stat-badge--reliability',
};

export function DataSourceBadge({ source, className }: DataSourceBadgeProps) {
  const { t } = useI18n();
  const normalized = normalizeDataSourceLabel(source);

  return (
    <span className={`${badgeTone[source]}${className ? ` ${className}` : ''}`}>
      {t.dataSource[normalized]}
    </span>
  );
}
