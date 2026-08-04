import type { GlobalBenchmark, ScholarshipTrack } from '../../../shared/contracts';
import { canShowGlobalMedian, canShowGlobalPercentile } from '../../../shared/product-rules';
import { DataSourceBadge } from '../../components/DataSourceBadge';
import { DensityStrip } from '../../components/DensityStrip';
import { useI18n } from '../../i18n/context';
import { formatScore } from '../../lib/format';
import { canShowScoreDistribution } from '../../lib/score-buckets';

type GlobalBenchmarkCardProps = {
  userScore: number;
  benchmark: GlobalBenchmark;
  track: ScholarshipTrack;
};

const cardClass =
  'rounded-2xl border border-[color-mix(in_srgb,var(--color-accent)_18%,var(--section-divider-color))] bg-[var(--tg-theme-section-bg-color)] px-3.5 py-3 space-y-2.5';

export function GlobalBenchmarkCard({ userScore, benchmark, track }: GlobalBenchmarkCardProps) {
  const { t, locale } = useI18n();
  const showMedian = canShowGlobalMedian(benchmark.sampleSize);
  const median = benchmark.median;
  const scoreDelta =
    benchmark.scoreDelta ??
    (median != null ? Math.round((userScore - median) * 10) / 10 : null);
  const showDistribution =
    showMedian &&
    benchmark.scoreBuckets != null &&
    benchmark.sampleSize != null &&
    canShowScoreDistribution(benchmark.sampleSize, benchmark.scoreBuckets);
  const showSecondaryPercentile =
    canShowGlobalPercentile({ secondary: true }) && benchmark.lowerScorePercentage != null;

  return (
    <section className={cardClass} aria-label={t.dashboard.globalBenchmark.title}>
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          {t.dashboard.globalBenchmark.title}
        </h2>
        <DataSourceBadge source="global_sample" />
      </div>

      <p className="text-sm text-[var(--text-secondary)]">
        {t.dashboard.globalBenchmark.yourScore(formatScore(userScore, locale))}
      </p>

      {showMedian && median != null ? (
        <>
          <p className="text-sm text-[var(--text-primary)]">
            {t.dashboard.globalBenchmark.trackMedian(formatScore(median, locale))}
          </p>
          {scoreDelta != null ? (
            <p className="text-sm text-[var(--text-primary)]">
              {t.dashboard.globalBenchmark.delta(
                scoreDelta > 0 ? `+${formatScore(scoreDelta, locale)}` : formatScore(scoreDelta, locale),
              )}
            </p>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-[var(--text-secondary)]">{t.dashboard.globalBenchmark.insufficient}</p>
      )}

      {benchmark.sampleSize != null && benchmark.representedCountryCount != null ? (
        <p className="text-sm text-[var(--text-secondary)]">
          {t.dashboard.globalBenchmark.sampleMeta(
            String(benchmark.sampleSize),
            String(benchmark.representedCountryCount),
          )}
        </p>
      ) : null}

      {showSecondaryPercentile ? (
        <p className="text-xs text-[var(--text-helper)]">
          {t.dashboard.globalBenchmark.secondaryPercentile(
            String(Math.round(benchmark.lowerScorePercentage!)),
          )}
        </p>
      ) : null}

      {showDistribution && benchmark.scoreBuckets ? (
        <DensityStrip
          variant="mini"
          buckets={benchmark.scoreBuckets}
          track={track}
          userScore={userScore}
          medianScore={median}
          groupSize={benchmark.sampleSize ?? 0}
        />
      ) : null}

      <p className="text-xs leading-5 text-[var(--text-helper)]">
        {t.dashboard.globalBenchmark.disclaimer}
      </p>
    </section>
  );
}
