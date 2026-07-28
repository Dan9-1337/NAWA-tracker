import { useI18n } from '../i18n/context';

const LEGEND_OPACITIES = [0.14, 0.26, 0.38, 0.5, 0.62, 0.74, 0.86, 1];

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

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{t.start.howDensityTitle}</h3>
        <p>{t.start.howDensityBody}</p>

        <div aria-hidden="true" className="space-y-2 rounded-xl bg-[var(--tg-theme-secondary-bg-color)] px-3 py-2.5">
          <div className="flex items-center justify-between text-[0.6875rem] text-[var(--text-helper)]">
            <span>{t.start.howDensityLess}</span>
            <span>{t.start.howDensityMore}</span>
          </div>
          <div className="flex h-4 gap-[1px] overflow-hidden rounded-[var(--radius-sm)]">
            {LEGEND_OPACITIES.map((opacity, index) => (
              <div key={index} className="min-w-0 flex-1 bg-[var(--tg-theme-section-bg-color)]">
                <div className="h-full bg-[var(--color-accent)]" style={{ opacity }} />
              </div>
            ))}
          </div>
          <ul className="space-y-1.5 text-[0.6875rem] leading-4 text-[var(--text-helper)]">
            <li className="flex items-start gap-2">
              <span className="density-strip__median-marker density-strip__median-marker--on-chart mt-0.5 shrink-0" />
              <span>{t.start.howDensityMedian}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="density-strip__user-marker mt-0.5 !h-2.5 !w-2.5 shrink-0" />
              <span>{t.start.howDensityYou}</span>
            </li>
          </ul>
          <p className="text-[0.6875rem] text-[var(--text-helper)]">{t.start.howDensityHint}</p>
        </div>

        <p className="text-xs leading-5 text-[var(--text-helper)]">{t.start.howDensityNotQuality}</p>
      </section>
    </div>
  );
}
