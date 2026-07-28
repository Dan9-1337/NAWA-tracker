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

type ScoreDensityStripProps = {
  buckets: number[];
  track: ScholarshipTrack;
  userScore: number;
  medianScore?: number | null;
  groupSize: number;
};

const STRIP_HEIGHT = 28;
const USER_MARKER = 12;
const MEDIAN_MARKER = 8;

export function ScoreDensityStrip({ buckets, track, userScore, medianScore, groupSize }: ScoreDensityStripProps) {
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
  const binLabels = [t.stats.densityBinLow, t.stats.densityBinBelowAvg, t.stats.densityBinAboveAvg, t.stats.densityBinHigh];

  const ariaLabel = [
    t.stats.densityTitle,
    t.stats.densityCaption,
    medianScore != null ? t.stats.chartMedian(medianScore.toFixed(1)) : null,
    t.stats.chartYou(userScore.toFixed(1)),
  ]
    .filter(Boolean)
    .join('. ');

  return (
    <div className="density-strip" role="img" aria-label={ariaLabel}>
      <div className="density-strip__header">
        <p className="density-strip__title">{t.stats.densityTitle}</p>
        {medianScore != null ? (
          <span className="density-strip__median-hint">
            <span aria-hidden="true" className="density-strip__median-marker density-strip__median-marker--on-chart" />
            {t.stats.chartMedianLabel}
          </span>
        ) : null}
      </div>

      <p className="density-strip__caption">{t.stats.densityCaption}</p>

      <div className="density-strip__chart" style={{ height: STRIP_HEIGHT }}>
        <div className="density-strip__bars">
          {merged.counts.map((count, index) => (
            <div
              key={`${merged.from + index * displayStep}-${count}`}
              aria-hidden="true"
              className="density-strip__bar"
            >
              {count > 0 ? (
                <div
                  className="density-strip__fill"
                  style={{
                    opacity: bucketFillOpacity(count, maxCount),
                  }}
                />
              ) : null}
            </div>
          ))}
        </div>

        {medianPercent != null ? (
          <div
            aria-hidden="true"
            className="density-strip__median"
            style={{ left: `${medianPercent}%` }}
          >
            <span className="density-strip__median-marker density-strip__median-marker--on-chart" />
          </div>
        ) : null}

        <div aria-hidden="true" className="density-strip__user" style={{ left: `${userPercent}%` }}>
          <span className="density-strip__user-label">{t.stats.chartYouLabel}</span>
          <span className="density-strip__user-marker" />
        </div>
      </div>

      <div className="density-strip__labels" aria-hidden="true">
        {binLabels.map((label) => (
          <span key={label} className="density-strip__label">
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
