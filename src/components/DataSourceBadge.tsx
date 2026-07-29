import type { DataSourceLabel } from '../../shared/data-source-labels';
import { useI18n } from '../i18n/context';

type DataSourceBadgeProps = {
  source: DataSourceLabel;
  className?: string;
};

const badgeTone: Record<DataSourceLabel, string> = {
  official: 'stat-badge stat-badge--accent',
  historical: 'stat-badge',
  estimate: 'stat-badge stat-badge--reliability',
  reported: 'stat-badge',
};

export function DataSourceBadge({ source, className }: DataSourceBadgeProps) {
  const { t } = useI18n();

  return (
    <span className={`${badgeTone[source]}${className ? ` ${className}` : ''}`}>
      {t.dataSource[source]}
    </span>
  );
}
