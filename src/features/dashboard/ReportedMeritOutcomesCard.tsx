import type { ReportedMeritOutcomeStats } from '../../../shared/contracts';
import { DataSourceBadge } from '../../components/DataSourceBadge';
import { useI18n } from '../../i18n/context';
import { formatScore } from '../../lib/format';

type ReportedMeritOutcomesCardProps = {
  stats: ReportedMeritOutcomeStats;
};

const cardClass =
  'rounded-2xl bg-[var(--tg-theme-secondary-bg-color)] px-3.5 py-3 space-y-2';

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
    <section className={cardClass} aria-labelledby="dashboard-merit-outcomes-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          id="dashboard-merit-outcomes-title"
          className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--tg-theme-subtitle-text-color)]"
        >
          {t.dashboard.meritOutcomes.title}
        </h2>
        <DataSourceBadge source="reported" />
      </div>

      <p className="text-sm leading-6 text-[var(--text-secondary)]">{body}</p>
      <p className="text-xs leading-5 text-[var(--text-helper)]">{t.dashboard.meritOutcomes.disclaimer}</p>
    </section>
  );
}
