import { nawaOrientationThreshold } from '../../shared/nawa-score';
import { useI18n } from '../i18n/context';
import { scoreToAxisPercent } from '../lib/score-buckets';

const CHART_ORIGIN = nawaOrientationThreshold;
const CHART_MAX = 100;
const AXIS_INSET = 6;
const NEUTRAL_MARKER = 'var(--tg-theme-button-color)';
const MEDIAN_MARKER = 'var(--tg-theme-link-color)';

type ScorePositionChartProps = {
  userScore: number;
  medianScore?: number | null;
  variant?: 'default' | 'compact';
};

function axisLeft(percent: number): string {
  return `calc(${AXIS_INSET}px + (100% - ${AXIS_INSET * 2}px) * ${percent / 100})`;
}

function Marker({
  percent,
  color,
  value,
  shape = 'circle',
  zIndex = 1,
  compact = false,
}: {
  percent: number;
  color: string;
  value: string;
  shape?: 'circle' | 'diamond';
  zIndex?: number;
  compact?: boolean;
}) {
  return (
    <div
      className={`absolute flex -translate-x-1/2 items-center ${compact ? 'bottom-3' : 'bottom-4 flex-col'}`}
      style={{ left: axisLeft(percent), zIndex }}
    >
      {!compact ? (
        <span className="mb-1 whitespace-nowrap text-xs font-semibold" style={{ color }}>
          {value}
        </span>
      ) : null}
      {shape === 'circle' ? (
        <span
          className="block h-3 w-3 rounded-full border-2 border-[var(--tg-theme-bg-color)]"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
      ) : (
        <span
          className="block h-2.5 w-2.5 rotate-45 border border-[var(--tg-theme-bg-color)]"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

export function ScorePositionChart({ userScore, medianScore, variant = 'default' }: ScorePositionChartProps) {
  const { t } = useI18n();
  const compact = variant === 'compact';
  const userPercent = scoreToAxisPercent(userScore, CHART_ORIGIN, CHART_MAX);
  const medianPercent = medianScore != null ? scoreToAxisPercent(medianScore, CHART_ORIGIN, CHART_MAX) : null;
  const userLabel = userScore.toFixed(1);
  const medianLabel = medianScore != null ? medianScore.toFixed(1) : null;

  const description = [
    t.stats.chartYou(userLabel),
    medianLabel != null ? t.stats.chartMedian(medianLabel) : null,
    t.stats.chartThresholdNote,
  ]
    .filter(Boolean)
    .join('. ');

  if (compact) {
    return (
      <figure className="space-y-2" role="img" aria-label={description}>
        <figcaption className="text-sm font-semibold text-[var(--text-primary)]">{t.stats.scoresTitle}</figcaption>

        <div className="flex items-center gap-2 text-[11px] text-[var(--tg-theme-subtitle-text-color)]">
          {medianLabel != null ? (
            <span className="shrink-0 font-medium text-[var(--text-primary)]">
              {t.stats.chartMedianLabel} {medianLabel}
            </span>
          ) : null}
        </div>

        <div className="relative h-10">
          <div
            className="absolute bottom-4 left-2 right-2 h-0.5 rounded-full bg-[var(--tg-theme-hint-color)]"
            aria-hidden="true"
          />
          <div className="absolute bottom-1 left-2 text-xs text-[var(--tg-theme-subtitle-text-color)]">
            {CHART_ORIGIN}
          </div>
          <div className="absolute bottom-1 right-2 text-xs text-[var(--tg-theme-subtitle-text-color)]">
            {CHART_MAX}
          </div>

          {medianPercent != null ? (
            <Marker percent={medianPercent} color={MEDIAN_MARKER} value={medianLabel!} shape="diamond" compact />
          ) : null}
          <Marker percent={userPercent} color={NEUTRAL_MARKER} value={userLabel} zIndex={2} compact />
        </div>

        <div className="flex items-center justify-between text-[11px]">
          {medianLabel != null ? (
            <span className="text-[var(--tg-theme-subtitle-text-color)]">
              ◇ {t.stats.chartMedianLabel} {medianLabel}
            </span>
          ) : (
            <span />
          )}
          <span className="font-medium text-[var(--text-primary)]">
            {userLabel} {t.stats.chartYouLabel}
          </span>
        </div>

        <p className="text-[11px] leading-4 text-[var(--tg-theme-subtitle-text-color)]">{t.stats.chartThresholdNote}</p>
        <p className="sr-only">{description}</p>
      </figure>
    );
  }

  return (
    <figure className="mt-4 rounded-2xl bg-[var(--tg-theme-secondary-bg-color)] px-3 pb-3 pt-4">
      <figcaption className="mb-3 text-sm font-semibold">{t.stats.chartTitle}</figcaption>

      <div className="relative h-24" role="img" aria-label={description}>
        <div className="absolute bottom-7 left-2 top-2 w-0.5 bg-[var(--tg-theme-hint-color)]" aria-hidden="true" />
        <div
          className="absolute bottom-5 left-2 right-2 h-0.5 rounded-full bg-[var(--tg-theme-hint-color)]"
          aria-hidden="true"
        />

        <div className="absolute bottom-1 left-2 text-xs font-medium text-[var(--tg-theme-subtitle-text-color)]">
          {CHART_ORIGIN}
        </div>
        <div className="absolute bottom-1 right-2 text-xs text-[var(--tg-theme-subtitle-text-color)]">
          {CHART_MAX}
        </div>

        {medianPercent != null ? (
          <Marker
            percent={medianPercent}
            color={MEDIAN_MARKER}
            value={medianLabel!}
            shape="diamond"
            zIndex={1}
          />
        ) : null}
        <Marker percent={userPercent} color={NEUTRAL_MARKER} value={userLabel} zIndex={2} />
      </div>

      <p className="mt-2 text-[11px] leading-4 text-[var(--tg-theme-subtitle-text-color)]">{t.stats.chartThresholdNote}</p>
      <p className="sr-only">{description}</p>
    </figure>
  );
}
