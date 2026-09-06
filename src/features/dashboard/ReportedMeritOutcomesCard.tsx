import type { ReportedMeritOutcomeStats } from '../../../shared/contracts';
import { DashboardCard, CardHeader } from '../../components/DashboardCard';
import { UsersIcon } from '../../components/icons';
import { useI18n } from '../../i18n/context';
import { formatScore } from '../../lib/format';

type ReportedMeritOutcomesCardProps = {
  stats: ReportedMeritOutcomeStats;
};

export function ReportedMeritOutcomesCard({ stats }: ReportedMeritOutcomesCardProps) {
  const { t, locale } = useI18n();
  const totalReported = stats.positiveCount + stats.negativeCount;

  if (totalReported === 0) return null;

  let body: string;
  if (stats.boundaryState === 'insufficient_data') {
    body = t.dashboard.meritOutcomes.insufficient(String(totalReported));
  } else if (stats.boundaryState === 'positive_only' && stats.lowestReportedPositiveScore != null) {
    body = t.dashboard.meritOutcomes.positiveOnly(
      String(stats.positiveCount),
      formatScore(stats.lowestReportedPositiveScore, locale),
    );
  } else if (
    stats.boundaryState === 'interval' &&
    stats.lowestReportedPositiveScore != null &&
    stats.highestReportedNegativeScore != null
  ) {
    body = t.dashboard.meritOutcomes.interval(
      formatScore(stats.lowestReportedPositiveScore, locale),
      formatScore(stats.highestReportedNegativeScore, locale),
    );
  } else if (stats.boundaryState === 'overlapping_results') {
    body = t.dashboard.meritOutcomes.overlapping;
  } else {
    body = t.dashboard.meritOutcomes.counts(
      String(stats.positiveCount),
      String(stats.negativeCount),
    );
  }

  return (
    <DashboardCard aria-labelledby="dashboard-merit-outcomes-title">
      <CardHeader
        titleId="dashboard-merit-outcomes-title"
        title={t.dashboard.meritOutcomes.title}
        icon={<UsersIcon size={16} />}
        titleClassName="text-xs font-medium uppercase tracking-[0.08em] text-[var(--tg-theme-subtitle-text-color)]"
      />

      <p className="text-sm leading-6 text-[var(--text-secondary)]">{body}</p>
    </DashboardCard>
  );
}
