import { DashboardCard } from '../../components/DashboardCard';
import { useI18n } from '../../i18n/context';

export function NotAwardedOutcomeCard() {
  const { t } = useI18n();

  return (
    <DashboardCard tone="neutral" aria-labelledby="dashboard-not-awarded-title" role="status">
      <h2 id="dashboard-not-awarded-title" className="text-lg font-semibold text-[var(--text-primary)]">
        {t.dashboard.terminal.notAwardedTitle}
      </h2>
      <p className="text-sm leading-6 text-[var(--text-secondary)]">{t.dashboard.terminal.notAwardedBody}</p>
      <p className="text-xs leading-5 text-[var(--text-helper)]">{t.dashboard.terminal.notAwardedNote}</p>
    </DashboardCard>
  );
}
