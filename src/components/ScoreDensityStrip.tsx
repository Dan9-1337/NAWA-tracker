import type { ScholarshipTrack } from '../../shared/contracts';
import { useI18n } from '../i18n/context';
import {
  bucketFillOpacity,
  mergeSparseBuckets,
  scoreAxisForTrack,
  scoreToAxisPercent,
} from '../lib/score-buckets';

type ScoreDensityStripProps = {
  buckets: number[];
  track: ScholarshipTrack;
  userScore: number;
  medianScore?: number | null;
};

const STRIP_HEIGHT = 32;
const USER_MARKER = 11;
const MEDIAN_MARKER = 9;

export function ScoreDensityStrip({ buckets, track, userScore, medianScore }: ScoreDensityStripProps) {
  const { t } = useI18n();
  const { origin, max, step } = scoreAxisForTrack(track);
  const merged = mergeSparseBuckets(buckets, origin, step);
  const maxCount = Math.max(...merged.counts, 1);
  const userPercent = scoreToAxisPercent(userScore, merged.from, merged.to);
  const medianPercent = medianScore != null ? scoreToAxisPercent(medianScore, merged.from, merged.to) : null;

  const ariaLabel = [
    t.stats.densityTitle,
    medianScore != null ? t.stats.chartMedian(medianScore.toFixed(1)) : null,
    t.stats.chartYou(userScore.toFixed(1)),
  ]
    .filter(Boolean)
    .join('. ');

  return (
    <div className="mb-2 mt-4" role="img" aria-label={ariaLabel}>
      <p className="mb-2.5 text-xs font-medium uppercase tracking-[0.08em] text-[var(--tg-theme-subtitle-text-color)]">
        {t.stats.densityTitle}
      </p>

      <div className="relative" style={{ height: STRIP_HEIGHT }}>
        <div className="flex h-full gap-px overflow-hidden rounded-lg">
          {merged.counts.map((count, index) => (
            <div
              key={`${merged.from + index * step}-${count}`}
              aria-hidden="true"
              className="relative min-w-0 flex-1 bg-[var(--tg-theme-secondary-bg-color)]"
            >
              {count > 0 ? (
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundColor: 'var(--tg-theme-button-color)',
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
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${medianPercent}%`, top: '50%', zIndex: 1 }}
          >
            <span
              className="block border border-[var(--tg-theme-bg-color)]"
              style={{
                width: MEDIAN_MARKER,
                height: MEDIAN_MARKER,
                backgroundColor: 'var(--tg-theme-link-color)',
                transform: 'rotate(45deg)',
              }}
            />
          </div>
        ) : null}

        <div
          aria-hidden="true"
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${userPercent}%`, top: '50%', zIndex: 2 }}
        >
          <span
            className="block rounded-full border-2 border-[var(--tg-theme-bg-color)]"
            style={{
              width: USER_MARKER,
              height: USER_MARKER,
              backgroundColor: 'var(--tg-theme-button-color)',
            }}
          />
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-3 text-xs text-[var(--tg-theme-subtitle-text-color)]">
        {medianScore != null ? (
          <span className="inline-flex items-center gap-1">
            <span
              aria-hidden="true"
              className="inline-block rotate-45 border border-[var(--tg-theme-bg-color)]"
              style={{
                width: 7,
                height: 7,
                backgroundColor: 'var(--tg-theme-link-color)',
              }}
            />
            {t.stats.chartMedianLabel}
          </span>
        ) : (
          <span />
        )}
        <span className="inline-flex items-center gap-1 font-medium text-[var(--text-primary)]">
          <span
            aria-hidden="true"
            className="inline-block h-2 w-2 rounded-full border border-[var(--tg-theme-bg-color)]"
            style={{ backgroundColor: 'var(--tg-theme-button-color)' }}
          />
          {t.stats.chartYouLabel}
        </span>
      </div>
    </div>
  );
}
