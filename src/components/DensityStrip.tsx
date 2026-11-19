import type { ScholarshipTrack } from '../../shared/contracts';
import { useI18n } from '../i18n/context';
import { formatScore } from '../lib/format';
import {
  bucketFillOpacity,
  displayBinCount,
  displayBuckets,
  mergeSparseBuckets,
  scoreAxisForTrack,
  scoreToAxisPercent,
} from '../lib/score-buckets';

type DensityStripProps = {
  buckets: number[];
  track: ScholarshipTrack;
  userScore: number;
  medianScore?: number | null;
  groupSize: number;
  variant: 'mini' | 'detailed';
};

const STRIP_HEIGHT = 28;

function getDensityStripLayout({
  buckets,
  track,
  userScore,
  medianScore,
  groupSize,
}: Omit<DensityStripProps, 'variant'>) {
  const { origin, max } = scoreAxisForTrack(track);
  const targetCount = displayBinCount(groupSize);
  const aggregated = displayBuckets(buckets, groupSize);
  const displayStep = (max - origin) / targetCount;
  const merged =
    targetCount === 8
      ? mergeSparseBuckets(aggregated, origin, displayStep)
      : { from: origin, to: max, counts: aggregated };
  const maxCount = Math.max(...merged.counts, 1);

  return {
    displayStep,
    merged,
    maxCount,
    userPercent: scoreToAxisPercent(userScore, merged.from, merged.to),
    medianPercent: medianScore != null ? scoreToAxisPercent(medianScore, merged.from, merged.to) : null,
  };
}

function DensityStripChart({
  displayStep,
  merged,
  maxCount,
  userPercent,
  medianPercent,
  youLabel,
}: ReturnType<typeof getDensityStripLayout> & { youLabel: string }) {
  return (
    <div className="density-strip__chart" style={{ height: STRIP_HEIGHT }}>
      <div className="density-strip__bars">
        {merged.counts.map((count, index) => (
          <div key={`${merged.from + index * displayStep}-${count}`} className="density-strip__bar">
            {count > 0 ? (
              <div
                className="density-strip__fill"
                style={{ opacity: bucketFillOpacity(count, maxCount) }}
              />
            ) : null}
          </div>
        ))}
      </div>

      {medianPercent != null ? (
        <div className="density-strip__median" style={{ left: `${medianPercent}%` }}>
          <span className="density-strip__median-marker density-strip__median-marker--on-chart" />
        </div>
      ) : null}

      <div className="density-strip__user" style={{ left: `${userPercent}%` }}>
        <span className="density-strip__user-label">{youLabel}</span>
        <span className="density-strip__user-marker" />
      </div>
    </div>
  );
}

/** Score numbers under the strip, every 10 points inside the shown range, so a bar can be read as a score range. */
function DensityStripAxis({ from, to }: { from: number; to: number }) {
  const ticks: number[] = [];
  for (let tick = Math.ceil(from / 10) * 10; tick <= to; tick += 10) ticks.push(tick);

  return (
    <div
      className="relative mt-1 h-4 text-[0.6875rem] tabular-nums text-[var(--text-helper)]"
      aria-hidden="true"
    >
      {ticks.map((tick) => {
        const percent = scoreToAxisPercent(tick, from, to);
        return (
          <span
            key={tick}
            className={`absolute ${percent >= 100 ? '-translate-x-full' : percent <= 0 ? '' : '-translate-x-1/2'}`}
            style={{ left: `${percent}%` }}
          >
            {tick}
          </span>
        );
      })}
    </div>
  );
}

export function DensityStrip({ variant, ...props }: DensityStripProps) {
  const { t, locale } = useI18n();
  const layout = getDensityStripLayout(props);

  if (variant === 'mini') {
    return (
      <div aria-hidden="true">
        <p className="mb-1.5 text-[0.6875rem] text-[var(--text-helper)]">{t.dashboard.hero.densityHint}</p>
        <DensityStripChart {...layout} youLabel={t.stats.chartYouLabel} />
        <DensityStripAxis from={layout.merged.from} to={layout.merged.to} />

        <div className="mt-2 flex items-center justify-between gap-3 text-[0.6875rem] text-[var(--text-helper)]">
          <span className="inline-flex items-center gap-1.5">
            <span className="density-strip__median-marker density-strip__median-marker--on-chart" />
            {t.stats.chartMedianLabel}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="density-strip__user-marker !h-2.5 !w-2.5" />
            {t.stats.chartYouLabel}
          </span>
        </div>
      </div>
    );
  }

  const ariaLabel = [
    t.stats.densityTitle,
    t.stats.densityCaption,
    props.medianScore != null ? t.stats.chartMedian(formatScore(props.medianScore, locale)) : null,
    t.stats.chartYou(formatScore(props.userScore, locale)),
  ]
    .filter(Boolean)
    .join('. ');

  return (
    <div className="density-strip" role="img" aria-label={ariaLabel}>
      <div className="density-strip__header">
        <p className="density-strip__title">{t.stats.densityTitle}</p>
        {props.medianScore != null ? (
          <span className="density-strip__median-hint">
            <span aria-hidden="true" className="density-strip__median-marker density-strip__median-marker--on-chart" />
            {t.stats.chartMedianLabel}
          </span>
        ) : null}
      </div>

      <p className="density-strip__caption">{t.stats.densityCaption}</p>

      <div aria-hidden="true">
        <DensityStripChart {...layout} youLabel={t.stats.chartYouLabel} />
      </div>

      <DensityStripAxis from={layout.merged.from} to={layout.merged.to} />
    </div>
  );
}
