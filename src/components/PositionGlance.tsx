import { useI18n } from '../i18n/context';
import type { MedianBand } from '../lib/stats-verdict';

type PositionGlanceProps =
  | {
      mode: 'percentile';
      /** 0–100 lower-score percentage; median sits at 50. */
      percentage: number;
    }
  | {
      mode: 'band';
      band: Exclude<MedianBand, never>;
    };

const BAND_LEFT: Record<Exclude<MedianBand, never>, string> = {
  below: '16%',
  around: '50%',
  above: '84%',
};

export function PositionGlance(props: PositionGlanceProps) {
  const { t } = useI18n();
  const markerLeft =
    props.mode === 'percentile'
      ? `${Math.min(100, Math.max(0, props.percentage))}%`
      : BAND_LEFT[props.band];

  return (
    <div className="space-y-1.5" role="img" aria-label={t.stats.scaleAriaLabel}>
      <div className="flex justify-between text-[11px] font-medium text-[var(--tg-theme-subtitle-text-color)]">
        <span>{t.stats.scaleBelowMedian}</span>
        <span>{t.stats.scaleMedian}</span>
        <span>{t.stats.scaleAboveMedian}</span>
      </div>

      <div className="relative h-8">
        <div
          className="absolute inset-x-0 top-[11px] h-px bg-[var(--section-divider-color)]"
          aria-hidden="true"
        />
        {/* Median tick */}
        <div
          className="absolute top-[5px] h-3.5 w-px -translate-x-1/2 bg-[var(--tg-theme-subtitle-text-color)]"
          style={{ left: '50%' }}
          aria-hidden="true"
        />
        <div
          className="absolute top-[5px] flex -translate-x-1/2 flex-col items-center"
          style={{ left: markerLeft }}
        >
          <span
            className="block h-3.5 w-3.5 rounded-full border-2 border-[var(--tg-theme-bg-color)] bg-[var(--tg-theme-button-color)]"
            aria-hidden="true"
          />
          <span className="mt-1 text-[11px] font-semibold text-[var(--text-primary)]">
            {t.stats.chartYouLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
