import type { ScholarshipTrack } from '../../shared/contracts';
import { useI18n } from '../i18n/context';
import {
  bucketFillOpacity,
  displayBinCount,
  displayBuckets,
  mergeSparseBuckets,
  scoreAxisForTrack,
  scoreToAxisPercent,
} from '../lib/score-buckets';

type MiniDensityStripProps = {
  buckets: number[];
  track: ScholarshipTrack;
  userScore: number;
  medianScore?: number | null;
  groupSize: number;
};

const STRIP_HEIGHT = 28;

export function MiniDensityStrip({
  buckets,
  track,
  userScore,
  medianScore,
  groupSize,
}: MiniDensityStripProps) {
  const { t } = useI18n();
  const { origin, max } = scoreAxisForTrack(track);
  const targetCount = displayBinCount(groupSize);
  const aggregated = displayBuckets(buckets, groupSize);
  const displayStep = (max - origin) / targetCount;
  const merged =
    targetCount === 8
      ? mergeSparseBuckets(aggregated, origin, displayStep)
      : { from: origin, to: max, counts: aggregated };
  const maxCount = Math.max(...merged.counts, 1);
  const userPercent = scoreToAxisPercent(userScore, merged.from, merged.to);
  const medianPercent = medianScore != null ? scoreToAxisPercent(medianScore, merged.from, merged.to) : null;

  return (
    <div aria-hidden="true">
      <p className="mb-1.5 text-[0.6875rem] text-[var(--text-helper)]">{t.dashboard.hero.densityHint}</p>
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
          <span className="density-strip__user-label">{t.stats.chartYouLabel}</span>
          <span className="density-strip__user-marker" />
        </div>
      </div>

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
