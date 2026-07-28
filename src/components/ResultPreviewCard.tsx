import { useI18n } from '../i18n/context';
import { bucketFillOpacity } from '../lib/score-buckets';

/** Fake fine histogram (16 bins, 0–100) for the start-screen demo. */
const DEMO_BUCKETS = [1, 2, 3, 5, 8, 12, 17, 23, 28, 32, 30, 26, 20, 12, 6, 3];
const DEMO_MAX_COUNT = Math.max(...DEMO_BUCKETS);
/** Matches previewScore 82.4 and +6.2 above median → median 76.2 on a 0–100 axis. */
const DEMO_MEDIAN_PERCENT = 76.2;
const DEMO_USER_PERCENT = 82.4;

export function ResultPreviewCard() {
  const { t } = useI18n();

  const ariaLabel = [
    t.start.previewBadge,
    `${t.start.previewScoreValue} ${t.start.previewScoreUnit}`,
    t.start.previewAboveMedianBy,
    `${t.start.previewPercentileRange} ${t.start.previewPercentileLabel}`,
    t.start.previewLive,
  ].join('. ');

  return (
    <div
      className="result-preview-card rounded-2xl border border-[color-mix(in_srgb,var(--color-accent)_28%,var(--section-divider-color))] bg-[var(--tg-theme-section-bg-color)] p-4"
      role="img"
      aria-label={ariaLabel}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="stat-badge">{t.start.previewBadge}</span>
        <span className="stat-badge stat-badge--accent">
          {t.start.previewPercentileRange} {t.start.previewPercentileLabel}
        </span>
      </div>

      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="text-3xl font-bold tabular-nums tracking-tight text-[var(--text-primary)]">
          {t.start.previewScoreValue}
        </span>
        <span className="text-sm text-[var(--text-secondary)]">{t.start.previewScoreUnit}</span>
      </div>
      <p className="mt-0.5 text-sm font-medium text-[var(--color-positive)]">{t.start.previewAboveMedianBy}</p>

      <div aria-hidden="true" className="mt-4">
        <p className="mb-1.5 text-[0.6875rem] text-[var(--text-helper)]">{t.start.previewDensityHint}</p>
        <div className="density-strip__chart" style={{ height: 28 }}>
          <div className="density-strip__bars">
            {DEMO_BUCKETS.map((count, index) => (
              <div key={index} className="density-strip__bar">
                {count > 0 ? (
                  <div
                    className="density-strip__fill"
                    style={{ opacity: bucketFillOpacity(count, DEMO_MAX_COUNT) }}
                  />
                ) : null}
              </div>
            ))}
          </div>

          <div className="density-strip__median" style={{ left: `${DEMO_MEDIAN_PERCENT}%` }}>
            <span className="density-strip__median-marker density-strip__median-marker--on-chart" />
          </div>
          <div className="density-strip__user" style={{ left: `${DEMO_USER_PERCENT}%` }}>
            <span className="density-strip__user-label">{t.start.previewYouLabel}</span>
            <span className="density-strip__user-marker result-preview__user-marker" />
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between gap-3 text-[0.6875rem] text-[var(--text-helper)]">
          <span className="inline-flex items-center gap-1.5">
            <span className="density-strip__median-marker density-strip__median-marker--on-chart" />
            {t.start.previewMedianLabel}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="density-strip__user-marker !h-2.5 !w-2.5" />
            {t.start.previewYouLabel}
          </span>
        </div>
      </div>

      <p className="mt-3 text-xs font-medium leading-5 text-[var(--text-secondary)]">
        <span className="text-[var(--color-accent)]">●</span> {t.start.previewLive}
      </p>
    </div>
  );
}
