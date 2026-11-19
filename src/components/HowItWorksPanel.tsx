import { useI18n } from '../i18n/context';

export function HowItWorksPanel() {
  const { t } = useI18n();

  return (
    <div className="space-y-4 border-t border-[var(--section-divider-color)] px-4 py-3 text-sm leading-6 text-[var(--text-secondary)]">
      <section className="space-y-1.5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{t.start.howScoreTitle}</h3>
        <p>{t.start.howScoreBody}</p>
        <pre className="overflow-x-auto rounded-xl bg-[var(--tg-theme-secondary-bg-color)] px-3 py-2 font-mono text-[0.75rem] leading-5 text-[var(--text-primary)]">
          {t.start.howScoreFormula}
        </pre>
        <p className="text-xs leading-5 text-[var(--text-helper)]">{t.start.howScoreDisclaimer}</p>
      </section>

      <section className="space-y-1.5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{t.start.howPercentileTitle}</h3>
        <p>{t.start.howPercentileBody}</p>
        <p className="text-xs leading-5 text-[var(--text-helper)]">{t.start.howPercentileExample}</p>
      </section>
    </div>
  );
}
