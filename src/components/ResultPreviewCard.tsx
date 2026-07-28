import { useI18n } from '../i18n/context';

const DEMO_BAR_OPACITIES = [0.16, 0.32, 0.5, 0.72, 1, 0.6, 0.34, 0.18];
const DEMO_MEDIAN_POSITION = '45%';
const DEMO_USER_POSITION = '76%';

export function ResultPreviewCard() {
  const { t } = useI18n();

  const ariaLabel = [
    t.start.previewBadge,
    `${t.start.previewScoreValue} ${t.start.previewScoreUnit}`,
    t.start.previewAboveMedian,
    `${t.start.previewPercentileRange} ${t.start.previewPercentileLabel}`,
    t.start.previewGroupSize,
  ].join('. ');

  return (
    <div
      className="rounded-2xl border border-[var(--section-divider-color)] bg-[var(--tg-theme-section-bg-color)] p-4"
      role="img"
      aria-label={ariaLabel}
    >
      <span className="stat-badge">{t.start.previewBadge}</span>

      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="text-3xl font-bold tabular-nums text-[var(--text-primary)]">
          {t.start.previewScoreValue}
        </span>
        <span className="text-sm text-[var(--text-secondary)]">{t.start.previewScoreUnit}</span>
      </div>
      <p className="mt-0.5 text-sm font-medium text-[var(--color-positive)]">{t.start.previewAboveMedian}</p>

      <div aria-hidden="true" className="mt-4">
        <div className="relative" style={{ height: 20 }}>
          <div className="flex h-full gap-[1px] overflow-hidden rounded-[var(--radius-sm)]">
            {DEMO_BAR_OPACITIES.map((opacity, index) => (
              <div key={index} className="min-w-0 flex-1 bg-[var(--tg-theme-section-bg-color)]">
                <div className="h-full bg-[var(--color-accent)]" style={{ opacity }} />
              </div>
            ))}
          </div>
          <span
            className="density-strip__median-marker density-strip__median-marker--on-chart absolute top-1/2 z-[1] -translate-x-1/2 -translate-y-1/2"
            style={{ left: DEMO_MEDIAN_POSITION }}
          />
          <span
            className="density-strip__user-marker absolute top-1/2 z-[2] -translate-x-1/2 -translate-y-1/2"
            style={{ left: DEMO_USER_POSITION }}
          />
        </div>
      </div>

      <p className="mt-2.5 text-xs leading-5 text-[var(--text-helper)]">
        {t.start.previewPercentileRange} {t.start.previewPercentileLabel} · {t.start.previewGroupSize}
      </p>
    </div>
  );
}
