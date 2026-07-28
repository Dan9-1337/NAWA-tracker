import { nawaOrientationThreshold } from '../../shared/nawa-score';
import { useI18n } from '../i18n/context';
import { formatScore } from '../lib/format';
import { scoreToAxisPercent } from '../lib/score-buckets';

const CHART_ORIGIN = nawaOrientationThreshold;
const CHART_MAX = 100;
const AXIS_INSET = 6;

function axisLeft(percent: number, inset = AXIS_INSET): string {
  if (inset === 0) return `${percent}%`;
  return `calc(${inset}px + (100% - ${inset * 2}px) * ${percent / 100})`;
}

const USER_MARKER = 'var(--color-accent)';
const MEDIAN_MARKER = 'var(--color-median)';

type ScorePositionChartProps = {
  userScore: number;
  medianScore?: number | null;
  variant?: 'default' | 'compact';
};

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
  if (compact) {
    return (
      <div className="score-chart__marker" style={{ left: axisLeft(percent, 0), zIndex }} aria-hidden="true">
        {shape === 'circle' ? (
          <span className="score-chart__marker-dot score-chart__marker-dot--user" style={{ backgroundColor: color }} />
        ) : (
          <span className="score-chart__marker-dot score-chart__marker-dot--median" style={{ backgroundColor: color }} />
        )}
      </div>
    );
  }

  return (
    <div
      className="absolute flex -translate-x-1/2 items-center bottom-4 flex-col"
      style={{ left: axisLeft(percent), zIndex }}
    >
      <span className="mb-1 whitespace-nowrap text-xs font-semibold" style={{ color }}>
        {value}
      </span>
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

function scoreDiffCopy(
  t: ReturnType<typeof useI18n>['t'],
  userScore: number,
  medianScore: number,
  locale: ReturnType<typeof useI18n>['locale'],
): string {
  const diff = userScore - medianScore;
  const formatted = formatScore(Math.abs(diff), locale);
  if (Math.abs(diff) < 0.05) return t.stats.chartScoreDiffAround;
  if (diff > 0) return t.stats.chartScoreDiffAbove(formatted);
  return t.stats.chartScoreDiffBelow(formatted);
}

export function ScorePositionChart({ userScore, medianScore, variant = 'default' }: ScorePositionChartProps) {
  const { t, locale } = useI18n();
  const compact = variant === 'compact';
  const userPercent = scoreToAxisPercent(userScore, CHART_ORIGIN, CHART_MAX);
  const medianPercent = medianScore != null ? scoreToAxisPercent(medianScore, CHART_ORIGIN, CHART_MAX) : null;
  const userLabel = formatScore(userScore, locale);
  const medianLabel = medianScore != null ? formatScore(medianScore, locale) : null;

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

        <div>
          <div className="score-chart__track">
            <div className="score-chart__line" aria-hidden="true" />
            {medianPercent != null ? (
              <Marker
                percent={medianPercent}
                color={MEDIAN_MARKER}
                value={medianLabel!}
                shape="diamond"
                compact
              />
            ) : null}
            <Marker percent={userPercent} color={USER_MARKER} value={userLabel} zIndex={2} compact />
          </div>

          <div className="score-chart__axis" aria-hidden="true">
            <span>{CHART_ORIGIN}</span>
            <span>{CHART_MAX}</span>
          </div>
        </div>

        <div className="score-chart__legend">
          {medianLabel != null ? (
            <span className="inline-flex items-center gap-1 text-[var(--tg-theme-subtitle-text-color)]">
              <span
                aria-hidden="true"
                className="inline-block h-2 w-2 rotate-45 border border-[var(--tg-theme-bg-color)]"
                style={{ backgroundColor: MEDIAN_MARKER }}
              />
              {t.stats.chartMedianLabel} {medianLabel}
            </span>
          ) : (
            <span />
          )}
          <span className="inline-flex items-center gap-1 font-semibold text-[var(--text-primary)]">
            <span
              aria-hidden="true"
              className="inline-block h-2 w-2 rounded-full border border-[var(--tg-theme-bg-color)]"
              style={{ backgroundColor: USER_MARKER }}
            />
            {userLabel} · {t.stats.chartYouLabel}
          </span>
        </div>

        {medianScore != null ? (
          <p className="text-sm text-[var(--text-primary)]">{scoreDiffCopy(t, userScore, medianScore, locale)}</p>
        ) : null}

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

        <div className="absolute bottom-0 left-0 text-xs font-semibold tabular-nums text-[var(--text-helper)]">
          {CHART_ORIGIN}
        </div>
        <div className="absolute bottom-0 right-0 text-xs font-semibold tabular-nums text-[var(--text-helper)]">
          {CHART_MAX}
        </div>

        {medianPercent != null ? (
          <Marker percent={medianPercent} color={MEDIAN_MARKER} value={medianLabel!} shape="diamond" zIndex={1} />
        ) : null}
        <Marker percent={userPercent} color={USER_MARKER} value={userLabel} zIndex={2} />
      </div>

      <p className="mt-2 text-[11px] leading-4 text-[var(--tg-theme-subtitle-text-color)]">{t.stats.chartThresholdNote}</p>
      <p className="sr-only">{description}</p>
    </figure>
  );
}
