import { DashboardCard } from '../../components/DashboardCard';
import { useI18n } from '../../i18n/context';

export function MeritNegativeOutcomeCard() {
  const { t } = useI18n();

  return (
    <DashboardCard tone="destructive" aria-labelledby="dashboard-merit-negative-title" role="status">
      <h2 id="dashboard-merit-negative-title" className="text-lg font-semibold text-[var(--text-primary)]">
        {t.dashboard.terminal.meritNegativeTitle}
      </h2>
      <p className="text-sm leading-6 text-[var(--text-secondary)]">{t.dashboard.terminal.meritNegativeBody}</p>
      <p className="text-xs leading-5 text-[var(--text-helper)]">{t.dashboard.terminal.meritNegativeNote}</p>
    </DashboardCard>
  );
}
