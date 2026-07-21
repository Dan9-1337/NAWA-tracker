import { nawaOrientationThreshold } from '../../shared/nawa-score';
import { useI18n } from '../i18n/context';

const CHART_ORIGIN = nawaOrientationThreshold;
const CHART_MAX = 100;
const CHART_SPAN = CHART_MAX - CHART_ORIGIN;
const AXIS_INSET = 8;

type ScorePositionChartProps = {
  userScore: number;
  medianScore?: number | null;
};

function toAxisPercent(score: number): number {
  const relative = ((score - CHART_ORIGIN) / CHART_SPAN) * 100;
  return Math.min(100, Math.max(0, relative));
}

function axisLeft(percent: number): string {
  return `calc(${AXIS_INSET}px + (100% - ${AXIS_INSET * 2}px) * ${percent / 100})`;
}

type MarkerProps = {
  percent: number;
  color: string;
  value: string;
  shape?: 'circle' | 'diamond';
  zIndex?: number;
};

function Marker({ percent, color, value, shape = 'circle', zIndex = 1 }: MarkerProps) {
  return (
    <div
      className="absolute bottom-4 flex -translate-x-1/2 flex-col items-center"
      style={{ left: axisLeft(percent), zIndex }}
    >
      <span className="mb-1 whitespace-nowrap text-[10px] font-semibold" style={{ color }}>
        {value}
      </span>
      {shape === 'circle' ? (
        <span
          className="block h-3.5 w-3.5 rounded-full border-2 border-[var(--tg-theme-section-bg-color)] shadow-sm"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
      ) : (
        <span
          className="block h-3.5 w-3.5 rotate-45 border-2 border-[var(--tg-theme-section-bg-color)] shadow-sm"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

function LegendItem({
  color,
  label,
  shape,
}: {
  color: string;
  label: string;
  shape: 'circle' | 'diamond' | 'line';
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--tg-theme-subtitle-text-color)]">
      {shape === 'line' ? (
        <span className="inline-block h-3 w-0 border-l border-dashed" style={{ borderColor: color }} aria-hidden="true" />
      ) : shape === 'circle' ? (
        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
      ) : (
        <span
          className="inline-block h-2.5 w-2.5 rotate-45"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
      )}
      {label}
    </span>
  );
}

export function ScorePositionChart({ userScore, medianScore }: ScorePositionChartProps) {
  const { t } = useI18n();
  const userPercent = toAxisPercent(userScore);
  const userAbove = userScore >= CHART_ORIGIN;
  const medianPercent = medianScore != null ? toAxisPercent(medianScore) : null;

  const description = [
    t.stats.chartYou(userScore.toFixed(1)),
    medianScore != null ? t.stats.chartMedian(medianScore.toFixed(1)) : null,
    t.stats.chartThresholdLegend,
  ]
    .filter(Boolean)
    .join('. ');

  return (
    <figure className="mt-4 rounded-2xl bg-[var(--tg-theme-secondary-bg-color)] px-3 pb-3 pt-4">
      <figcaption className="mb-3 text-sm font-semibold">{t.stats.chartTitle}</figcaption>

      <div className="relative h-24" role="img" aria-label={description}>
        <div
          className="absolute bottom-7 left-2 top-2 w-0.5 bg-[var(--tg-theme-hint-color)]"
          aria-hidden="true"
        />

        <div
          className="absolute bottom-5 left-2 right-2 h-0.5 rounded-full bg-[var(--tg-theme-hint-color)]"
          aria-hidden="true"
        />

        <div className="absolute bottom-1 left-2 text-[10px] font-medium text-[var(--tg-theme-subtitle-text-color)]">
          {CHART_ORIGIN}
        </div>
        <div className="absolute bottom-1 right-2 text-[10px] text-[var(--tg-theme-subtitle-text-color)]">
          {CHART_MAX}
        </div>

        {medianPercent != null ? (
          <Marker
            percent={medianPercent}
            color="var(--tg-theme-link-color)"
            value={medianScore!.toFixed(1)}
            shape="diamond"
            zIndex={1}
          />
        ) : null}

        <Marker
          percent={userPercent}
          color={userAbove ? 'var(--tg-theme-success-text-color)' : 'var(--tg-theme-destructive-text-color)'}
          value={userScore.toFixed(1)}
          zIndex={2}
        />
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 border-t border-[var(--tg-theme-hint-color)] pt-2">
        <LegendItem
          color={userAbove ? 'var(--tg-theme-success-text-color)' : 'var(--tg-theme-destructive-text-color)'}
          label={t.stats.chartYouLabel}
          shape="circle"
        />
        {medianScore != null ? (
          <LegendItem color="var(--tg-theme-link-color)" label={t.stats.chartMedianLabel} shape="diamond" />
        ) : null}
        <LegendItem
          color="var(--tg-theme-hint-color)"
          label={t.stats.chartThresholdLegend}
          shape="line"
        />
      </div>

      <p className="sr-only">{description}</p>
    </figure>
  );
}
