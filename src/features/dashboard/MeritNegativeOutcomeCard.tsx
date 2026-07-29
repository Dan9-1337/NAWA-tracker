import { useI18n } from '../../i18n/context';

const cardClass =
  'rounded-2xl border border-[color-mix(in_srgb,var(--tg-theme-destructive-text-color)_35%,var(--section-divider-color))] bg-[var(--tg-theme-secondary-bg-color)] px-3.5 py-3 space-y-2';

export function MeritNegativeOutcomeCard() {
  const { t } = useI18n();

  return (
    <section className={cardClass} aria-labelledby="dashboard-merit-negative-title" role="status">
      <h2 id="dashboard-merit-negative-title" className="text-lg font-semibold text-[var(--text-primary)]">
        {t.dashboard.terminal.meritNegativeTitle}
      </h2>
      <p className="text-sm leading-6 text-[var(--text-secondary)]">{t.dashboard.terminal.meritNegativeBody}</p>
      <p className="text-xs leading-5 text-[var(--text-helper)]">{t.dashboard.terminal.meritNegativeNote}</p>
    </section>
  );
}
