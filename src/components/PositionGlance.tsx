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
      band: MedianBand;
    };

const BAND_LEFT_PCT: Record<MedianBand, number> = {
  below: 16,
  around: 50,
  above: 84,
};

const AXIS_Y = 22;
const MARKER = 12;
const CHART_HEIGHT = 46;

export function PositionGlance(props: PositionGlanceProps) {
  const { t } = useI18n();
  const markerPct =
    props.mode === 'percentile'
      ? Math.min(100, Math.max(0, props.percentage))
      : BAND_LEFT_PCT[props.band];

  return (
    <div className="mb-2 mt-3" role="img" aria-label={t.stats.scaleAriaLabel}>
      <div className="relative" style={{ height: CHART_HEIGHT }}>
        {/* Horizontal axis */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 rounded-full"
          style={{
            top: AXIS_Y,
            height: 2,
            backgroundColor: 'var(--tg-theme-hint-color)',
            opacity: 0.85,
          }}
        />

        {/* Median tick */}
        <div
          aria-hidden="true"
          className="absolute -translate-x-1/2"
          style={{
            left: '50%',
            top: AXIS_Y - 7,
            width: 2,
            height: 16,
            backgroundColor: 'var(--tg-theme-subtitle-text-color)',
            opacity: 0.9,
          }}
        />

        {/* User marker on the axis + "You" under the point */}
        <div
          className="absolute flex -translate-x-1/2 flex-col items-center"
          style={{ left: `${markerPct}%`, top: AXIS_Y - MARKER / 2 }}
        >
          <span
            aria-hidden="true"
            className="block shrink-0 rounded-full"
            style={{
              width: MARKER,
              height: MARKER,
              backgroundColor: 'var(--tg-theme-button-color)',
              boxShadow: '0 0 0 2px var(--tg-theme-bg-color)',
            }}
          />
          <span className="mt-1.5 whitespace-nowrap text-center text-[10px] font-semibold leading-none text-[var(--text-primary)]">
            {t.stats.chartYouLabel}
          </span>
        </div>
      </div>

      <div className="mt-2 flex justify-between text-[11px] font-medium text-[var(--tg-theme-subtitle-text-color)]">
        <span>{t.stats.scaleBelowMedian}</span>
        <span>{t.stats.scaleMedian}</span>
        <span>{t.stats.scaleAboveMedian}</span>
      </div>
    </div>
  );
}
