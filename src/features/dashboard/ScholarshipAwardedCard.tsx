import { StatusTimeline } from '../../components/StatusTimeline';
import { DashboardCard } from '../../components/DashboardCard';
import { useI18n } from '../../i18n/context';
import { formatDate } from '../../lib/format';
import { getSequentialStatusOptions } from '../../../shared/status-options';

type ScholarshipAwardedCardProps = {
  statusChangedAt: string;
};

export function ScholarshipAwardedCard({ statusChangedAt }: ScholarshipAwardedCardProps) {
  const { t, locale } = useI18n();

  return (
    <DashboardCard
      tone="positive"
      aria-labelledby="dashboard-scholarship-awarded-title"
      role="status"
    >
      <h2 id="dashboard-scholarship-awarded-title" className="text-lg font-semibold text-[var(--color-positive)]">
        {t.dashboard.terminal.scholarshipAwardedTitle}
      </h2>

      <dl className="space-y-1.5 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-[var(--text-secondary)]">{t.dashboard.terminal.awardedDate}</dt>
          <dd className="font-medium text-[var(--text-primary)]">{formatDate(statusChangedAt, locale)}</dd>
        </div>
      </dl>

      <p className="text-xs leading-5 text-[var(--text-helper)]">{t.dashboard.terminal.scholarshipAwardedNote}</p>

      <StatusTimeline
        savedStatus="scholarship_awarded"
        selectedStatus="scholarship_awarded"
        options={getSequentialStatusOptions('scholarship_awarded')}
        onChange={() => undefined}
        showHints={false}
      />
    </DashboardCard>
  );
}
